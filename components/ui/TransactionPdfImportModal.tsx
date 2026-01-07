import React, { useState, useCallback } from 'react';
import Modal from './Modal';
import { useAppData } from '../../hooks/useAppData';
import { TransactionNature, CategoryType } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { supabase } from '../../supabase/client';
import { UploadCloud, FileText, BadgeCheck, BadgeX, Trash2, Loader2, Banknote, Sparkles, AlertCircle } from 'lucide-react';

interface ParsedTransaction {
    date: string;
    description: string;
    value: number;
    nature: TransactionNature;
    categoryName: string;
}

const TransactionPdfImportModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    transactionType: 'checking_account' | 'credit_card';
}> = ({ isOpen, onClose, transactionType }) => {
    const { accounts, categories, addTransactionsBatch } = useAppData();
    const [file, setFile] = useState<File | null>(null);
    const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stepStatus, setStepStatus] = useState<string>('');

    const resetState = useCallback(() => {
        setFile(null);
        setParsedTransactions([]);
        setIsLoading(false);
        setError(null);
        setStepStatus('');
    }, []);

    const handleClose = useCallback(() => {
        resetState();
        setSelectedAccountId('');
        onClose();
    }, [resetState, onClose]);

    const handleFileSelect = useCallback((selectedFile: File) => {
        if (!selectedFile) return;
        
        console.log(`[PDF Import] Arquivo selecionado: ${selectedFile.name}, Tamanho: ${selectedFile.size} bytes`);

        // Limite rígido de 10MB para o arquivo
        const maxSizeInBytes = 10 * 1024 * 1024; 
        if (selectedFile.size > maxSizeInBytes) {
            console.warn(`[PDF Import] Arquivo muito grande: ${selectedFile.size}`);
            setError("O arquivo é muito grande (máx 10MB).");
            return;
        }

        setFile(selectedFile);
        setError(null);
    }, []);

    const convertFileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });
    };

    // Função auxiliar com retry para chamadas de rede instáveis
    const invokeEdgeFunctionWithRetry = async (functionName: string, body: any, retries = 3) => {
        for (let i = 0; i < retries; i++) {
            try {
                const { data, error } = await supabase.functions.invoke(functionName, { body });
                if (error) throw error;
                return data;
            } catch (err) {
                console.warn(`[Edge Retry] Tentativa ${i + 1}/${retries} falhou para ${body.action || 'unknown'}:`, err);
                if (i === retries - 1) throw err;
                // Backoff exponencial: 1s, 2s, 4s...
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
            }
        }
    };

    const processPdf = async () => {
        if (!file || !selectedAccountId) return;
        setIsLoading(true);
        setError(null);
        setStepStatus('Preparando arquivo...');
        
        console.group('Processamento de PDF');
        console.log('[Step 0] Conta:', selectedAccountId);

        try {
            const categoryNames = categories.map(c => c.name);
            const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            
            // ESTRATÉGIA DE ROBUSTEZ:
            // 1. Tentar envio direto para arquivos pequenos (< 500KB) para velocidade.
            // 2. Se falhar (erro de rede/tamanho), ou se o arquivo for grande, usar Fallback (URL Assinada).
            const isSmallFile = file.size < 500 * 1024; // 500KB

            let resultData;
            let directSuccess = false;

            if (isSmallFile) {
                try {
                    console.log('[Strategy] Tentando envio direto (Payload Base64)...');
                    setStepStatus('Enviando (Rápido)...');
                    
                    const base64Data = await convertFileToBase64(file);
                    
                    const { data, error: funcError } = await supabase.functions.invoke('process-pdf-statement', {
                        body: { 
                            action: 'process_payload',
                            fileData: base64Data,
                            fileName: sanitizedName,
                            mimeType: file.type,
                            categoryNames
                        }
                    });

                    if (funcError) {
                        console.warn("[Strategy] Envio direto falhou (funcError):", funcError);
                        throw funcError; 
                    }
                    
                    resultData = data;
                    directSuccess = true;
                    console.log('[Strategy] Envio direto obteve sucesso.');

                } catch (directErr) {
                    console.warn("[Strategy] Envio direto falhou (catch). Iniciando fallback...", directErr);
                    // Não lança erro aqui, deixa cair para o bloco de fallback
                }
            }

            // Fallback: Se não teve sucesso direto (ou arquivo grande), usa o método de Upload Seguro
            if (!directSuccess) {
                console.log('[Strategy] Iniciando fluxo de Signed URL (Fallback/Large File).');
                
                // 1. Obter URL Assinada COM RETRY
                setStepStatus('Conectando ao servidor seguro...');
                
                let uploadConfig;
                try {
                    uploadConfig = await invokeEdgeFunctionWithRetry('process-pdf-statement', {
                         action: 'get_upload_url', 
                         fileName: sanitizedName 
                    });
                } catch (retryErr) {
                    console.error("Failed to get upload token after retries:", retryErr);
                    throw new Error("Não foi possível conectar ao servidor de processamento. Tente novamente em instantes.");
                }

                if (!uploadConfig?.token) {
                    throw new Error("Falha na autenticação do upload.");
                }

                // 2. Upload
                setStepStatus('Enviando arquivo para a nuvem...');
                const { error: uploadError } = await supabase.storage
                    .from('attachments')
                    .uploadToSignedUrl(uploadConfig.path, uploadConfig.token, file);

                if (uploadError) {
                    console.error("Upload to signed URL error:", uploadError);
                    throw new Error("Falha no upload do arquivo. Verifique sua conexão.");
                }

                // 3. Processar (pode ser demorado, então aumentamos timeout implícito ao esperar)
                setStepStatus('IA analisando extrato...');
                const data = await invokeEdgeFunctionWithRetry('process-pdf-statement', {
                    action: 'process',
                    filePath: uploadConfig.path, 
                    mimeType: file.type,
                    categoryNames
                }, 2); // Menos retries aqui pois a operação é pesada
                
                resultData = data;
            }

            // Validação da Resposta
            if (resultData?.error) throw new Error(`Erro retornado pela IA: ${resultData.error}`);
            if (!resultData || !resultData.transactions) throw new Error("A IA não retornou transações válidas. O PDF pode estar em um formato não suportado.");

            setParsedTransactions(resultData.transactions);
            setIsLoading(false);
            setStepStatus('');
            console.log('[Final] Sucesso:', resultData.transactions.length, 'transações.');

        } catch (err: any) {
            console.error("[PDF Import Error]", err);
            setError(err.message || "Erro desconhecido ao processar.");
            setIsLoading(false);
            setStepStatus('');
        } finally {
            console.groupEnd();
        }
    };

    const handleImport = async () => {
        const transactionsToImport = parsedTransactions.map(t => {
            const matchedCategory = categories.find(c => c.name.toLowerCase() === t.categoryName?.toLowerCase());
            let finalCategoryId = matchedCategory?.id;
            
            if (!finalCategoryId) {
                const fallbackCat = categories.find(c => c.type === (t.nature as unknown as CategoryType));
                finalCategoryId = fallbackCat?.id || categories[0]?.id; 
            }

            return {
                accountId: selectedAccountId,
                description: t.description,
                date: t.date,
                value: t.value,
                nature: t.nature,
                categoryId: finalCategoryId,
                type: transactionType
            };
        });

        if (transactionsToImport.length === 0) {
            setError('Nenhum lançamento para importar.');
            return;
        }

        setIsLoading(true);
        try {
            await addTransactionsBatch(transactionsToImport);
            alert(`${transactionsToImport.length} lançamentos importados com sucesso!`);
            handleClose();
        } catch (err) {
            console.error("Erro ao salvar no banco:", err);
            setError('Falha ao salvar lançamentos no banco de dados.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Importar Extrato PDF com IA">
            <div className="space-y-4">
                <div>
                    <label htmlFor="pdf-account" className="block text-sm font-medium text-gray-700">1. Selecione a Conta / Cartão</label>
                    <div className="relative mt-1">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Banknote className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                            id="pdf-account"
                            value={selectedAccountId}
                            onChange={(e) => setSelectedAccountId(e.target.value)}
                            disabled={isLoading && parsedTransactions.length > 0} 
                            className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border bg-white disabled:bg-gray-100"
                        >
                            <option value="">Selecione uma conta...</option>
                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </select>
                    </div>
                </div>

                {!file ? (
                    <div className="space-y-4 text-center">
                        <div
                            onDrop={(e) => { e.preventDefault(); if(selectedAccountId) handleFileSelect(e.dataTransfer.files[0]) }}
                            onDragOver={(e) => e.preventDefault()}
                            onClick={() => { if (selectedAccountId) document.getElementById('pdf-upload')?.click() }}
                            className={`border-2 border-dashed border-gray-300 rounded-lg p-8 text-center transition-colors ${!selectedAccountId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-500 hover:bg-blue-50/50'}`}
                        >
                            <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                            <p className="mt-2 text-sm text-gray-600">
                                {selectedAccountId ? '2. Arraste ou clique para selecionar o PDF' : 'Selecione uma conta para continuar'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Máximo 10MB</p>
                            <input id="pdf-upload" type="file" accept="application/pdf" className="hidden" disabled={!selectedAccountId} onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])} />
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg">
                           <FileText className="w-6 h-6 text-blue-600 flex-shrink-0" />
                           <div className="flex-grow">
                               <p className="font-medium text-gray-800">{file.name}</p>
                               <p className="text-xs text-gray-500">
                                   {parsedTransactions.length > 0 
                                       ? `${parsedTransactions.length} lançamentos encontrados.` 
                                       : isLoading ? 'Processando...' : 'Arquivo pronto para análise.'}
                               </p>
                           </div>
                           {!isLoading && <button onClick={resetState} className="text-sm font-semibold text-blue-600 hover:underline">Trocar</button>}
                        </div>
                        
                         {!isLoading && parsedTransactions.length === 0 && (
                             <div className="mt-4 text-center">
                                <button 
                                    onClick={processPdf}
                                    className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold shadow transition-colors"
                                >
                                    <Sparkles size={18} />
                                    Processar PDF com IA
                                </button>
                             </div>
                         )}
                    </>
                )}
                
                {isLoading && (
                    <div className="space-y-4 text-center p-8 bg-gray-50 rounded-lg">
                        <Loader2 className="mx-auto h-12 w-12 text-blue-600 animate-spin" />
                        <p className="font-semibold text-gray-700">
                           {stepStatus || 'Processando...'}
                        </p>
                        <p className="text-sm text-gray-500">Aguarde um momento.</p>
                    </div>
                )}

                {parsedTransactions.length > 0 && !isLoading && (
                    <div className="max-h-64 overflow-y-auto border rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="p-2 text-left font-medium text-gray-500">Data</th>
                                    <th className="p-2 text-left font-medium text-gray-500">Descrição</th>
                                    <th className="p-2 text-left font-medium text-gray-500">Categoria (IA)</th>
                                    <th className="p-2 text-right font-medium text-gray-500">Valor</th>
                                    <th className="p-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {parsedTransactions.map((t, index) => (
                                    <tr key={index} className="border-t">
                                        <td className="p-2 whitespace-nowrap">{t.date ? formatDate(t.date) : '-'}</td>
                                        <td className="p-2 font-medium">{t.description}</td>
                                        <td className="p-2 text-gray-600 italic">{t.categoryName || 'Outros'}</td>
                                        <td className={`p-2 font-semibold text-right ${t.nature === 'RECEITA' ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(t.value || 0)}</td>
                                        <td className="p-2 text-right">
                                            <button onClick={() => setParsedTransactions(prev => prev.filter((_, i) => i !== index))} className="p-1 text-gray-400 hover:text-red-600 rounded-full">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                 
                {error && (
                    <div className="flex items-center gap-2 text-sm text-red-600 p-3 bg-red-50 rounded-md border border-red-200">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                    <button type="button" onClick={handleClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Cancelar</button>
                    <button 
                        type="button"
                        onClick={handleImport}
                        disabled={isLoading || parsedTransactions.length === 0}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold shadow disabled:bg-blue-300 disabled:cursor-not-allowed"
                    >
                        Confirmar Importação
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default TransactionPdfImportModal;