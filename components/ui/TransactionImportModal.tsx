import React, { useState, useCallback, useMemo } from 'react';
import Modal from './Modal';
import { useAppData } from '../../hooks/useAppData';
import { Transaction, TransactionNature, CategoryType } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { UploadCloud, FileText, AlertTriangle, BadgeCheck, BadgeX, Trash2, Loader2, Info, Banknote } from 'lucide-react';

declare global {
    interface Window {
        XLSX: any;
    }
}

type ParsedStatus = 'new' | 'invalid';
interface ParsedTransaction {
    date: string;
    description: string;
    value: number;
    nature: TransactionNature;
    categoryId: string;
    categoryName: string;
    status: ParsedStatus;
    message?: string;
}

const normalizeHeader = (str: string): string => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const StatusBadge: React.FC<{ status: ParsedStatus }> = ({ status }) => {
    const config = {
        new: { Icon: BadgeCheck, text: 'Novo', color: 'text-green-600 bg-green-100' },
        invalid: { Icon: BadgeX, text: 'Inválido', color: 'text-red-600 bg-red-100' },
    }[status];
    return (
        <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${config.color}`}>
            <config.Icon size={14} />
            {config.text}
        </span>
    );
};

// Helper function to convert Excel's serial date number to a JS Date object.
const convertExcelSerialDate = (serial: number): Date => {
    // Excel's epoch starts on 1899-12-30 due to a leap year bug with 1900.
    // JavaScript's epoch is 1970-01-01.
    // The difference is 25569 days.
    const utc_days = serial - 25569;
    const date = new Date(utc_days * 86400 * 1000);
    // Adjust for timezone offset to get the correct calendar day.
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() + tzOffset);
};


const TransactionImportModal: React.FC<{
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
    const [progress, setProgress] = useState(0);

    const resetState = useCallback(() => {
        setFile(null);
        setParsedTransactions([]);
        // Don't reset selectedAccountId
        setIsLoading(false);
        setError(null);
        setProgress(0);
    }, []);

    const handleClose = useCallback(() => {
        resetState();
        setSelectedAccountId('');
        onClose();
    }, [resetState, onClose]);

    const handleFileSelect = useCallback(async (selectedFile: File) => {
        if (!selectedFile) return;
        setIsLoading(true);
        setError(null);
        setParsedTransactions([]);
        setFile(selectedFile);
        setProgress(0);

        try {
            const data = await selectedFile.arrayBuffer();
            const workbook = window.XLSX.read(data, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json: any[][] = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });

            if (json.length < 2) throw new Error('A planilha está vazia.');
            
            const headerRow = json[0].map(h => normalizeHeader(String(h)));
            const requiredHeaders = ['data', 'descricao', 'categoria', 'valor'];
            const headerIndices: { [key: string]: number } = {};
            
            requiredHeaders.forEach(reqHeader => {
                const index = headerRow.findIndex(h => h === reqHeader);
                if(index === -1) throw new Error(`Coluna obrigatória "${reqHeader}" não encontrada no cabeçalho da planilha.`);
                headerIndices[reqHeader] = index;
            });
            
            const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c]));
            const processed: ParsedTransaction[] = [];
            const rows = json.slice(1);
            const totalRows = rows.length;

            for (let i = 0; i < totalRows; i++) {
                const row = rows[i];
                if(row.every(cell => cell === null || cell === undefined || cell === '')) continue; // Skip empty rows

                const dateVal = row[headerIndices.data];
                const valueVal = row[headerIndices.valor];
                const categoryVal = String(row[headerIndices.categoria] || '').trim();
                const descriptionVal = String(row[headerIndices.descricao] || '').trim();

                const result: Partial<ParsedTransaction> & { categoryName: string } = {
                    status: 'new',
                    description: descriptionVal,
                    categoryName: categoryVal,
                };

                // --- Date Parsing (Handles DD/MM/AAAA strings and Excel serial numbers) ---
                let parsedDate: Date | null = null;
                if (typeof dateVal === 'number') {
                    // Handle Excel's numeric date format.
                    parsedDate = convertExcelSerialDate(dateVal);
                } else {
                    // Handle string date format.
                    const dateStr = String(dateVal || '').trim();
                    if (dateStr) {
                        const parts = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                        if (parts) {
                            const day = parseInt(parts[1], 10);
                            const month = parseInt(parts[2], 10) - 1; // Month is 0-indexed
                            const year = parseInt(parts[3], 10);
                            const date = new Date(Date.UTC(year, month, day));
                            if (date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day) {
                                parsedDate = date;
                            }
                        }
                    }
                }

                if (parsedDate) {
                    result.date = parsedDate.toISOString().split('T')[0];
                } else {
                    result.status = 'invalid';
                    result.message = 'Data inválida. Use DD/MM/AAAA.';
                }
                
                // --- Value Parsing (Handles numbers and PT-BR currency strings) ---
                let numValue: number;
                if (typeof valueVal === 'number') {
                    // Value is already a number (e.g., from a cell formatted as Currency/Number).
                    numValue = valueVal;
                } else {
                    // Value is a string, needs PT-BR parsing.
                    const valueStr = String(valueVal || '').trim();
                    if (valueStr === '') {
                        numValue = NaN;
                    } else {
                        // Handles "R$ 1.234,56" format
                        const s = valueStr.replace(/R\$\s*/, '').trim();
                        const standardized = s.replace(/\./g, '').replace(',', '.');
                        numValue = parseFloat(standardized);
                    }
                }

                if (typeof numValue === 'number' && !isNaN(numValue) && numValue !== 0) {
                    result.value = Math.abs(numValue);
                    result.nature = TransactionNature.DESPESA;
                } else {
                    result.status = 'invalid';
                    result.message = (result.message || '') + ' Valor inválido ou zero.';
                }
                
                // Validate Category
                const category = categoryMap.get(categoryVal.toLowerCase());
                if (category) {
                    if (category.type === CategoryType.DESPESA) {
                        result.categoryId = category.id;
                    } else {
                        result.status = 'invalid';
                        result.message = (result.message || '') + ` Categoria '${categoryVal}' é do tipo Receita.`;
                    }
                } else {
                    result.status = 'invalid';
                    result.message = (result.message || '') + ` Categoria '${categoryVal}' não encontrada.`;
                }
                processed.push(result as ParsedTransaction);

                const currentProgress = Math.round(((i + 1) / totalRows) * 100);
                setProgress(currentProgress);
                if (i % 20 === 0 || i === totalRows - 1) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
            setParsedTransactions(processed);
        } catch (err) {
            console.error("Erro ao processar o arquivo:", err);
            setError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido.");
            setFile(null);
        } finally {
            setIsLoading(false);
        }
    }, [categories]);

    const handleImport = async () => {
        const transactionsToImport = parsedTransactions
            .filter(t => t.status === 'new')
            .map(({ status, message, categoryName, ...rest }) => ({
                ...rest,
                accountId: selectedAccountId,
                type: transactionType
            }));

        if (transactionsToImport.length === 0) {
            setError('Nenhum lançamento novo para importar.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            await addTransactionsBatch(transactionsToImport);
            alert(`${transactionsToImport.length} lançamentos importados com sucesso!`);
            handleClose();
        } catch (err) {
            setError('Falha ao importar lançamentos.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const transactionsToImportCount = useMemo(() => {
        return parsedTransactions.filter(t => t.status === 'new').length;
    }, [parsedTransactions]);

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Importar Lançamentos de Planilha XLS">
            <div className="space-y-4">
                <div>
                    <label htmlFor="import-account" className="block text-sm font-medium text-gray-700">1. Selecione o Cartão de Crédito</label>
                    <div className="relative mt-1">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Banknote className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                            id="import-account"
                            value={selectedAccountId}
                            onChange={(e) => setSelectedAccountId(e.target.value)}
                            disabled={!!file || isLoading}
                            className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border bg-white disabled:bg-gray-100"
                        >
                            <option value="">Selecione uma conta...</option>
                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </select>
                    </div>
                </div>

                {isLoading ? (
                    <div className="space-y-4 text-center p-8 bg-gray-50 rounded-lg">
                        <Loader2 className="mx-auto h-12 w-12 text-blue-600 animate-spin" />
                        <p className="font-semibold text-gray-700">Analisando sua planilha...</p>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-150 ease-linear" 
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <p className="text-sm text-gray-500">{progress}% concluído</p>
                    </div>
                ) : !file ? (
                     <div className={!selectedAccountId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-colors'}>
                        <div
                            onDrop={(e) => { e.preventDefault(); if(selectedAccountId) handleFileSelect(e.dataTransfer.files[0]) }}
                            onDragOver={(e) => e.preventDefault()}
                            onClick={() => { if (selectedAccountId) document.getElementById('xls-trans-upload')?.click() }}
                            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
                        >
                            <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                            <p className="mt-2 text-sm text-gray-600">
                                {selectedAccountId ? '2. Arraste ou clique para selecionar o arquivo XLS' : 'Selecione uma conta para continuar'}
                            </p>
                            <input id="xls-trans-upload" type="file" accept=".xls,.xlsx" className="hidden" disabled={!selectedAccountId} onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])} />
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg">
                           <FileText className="w-6 h-6 text-blue-600 flex-shrink-0" />
                           <div className="flex-grow">
                               <p className="font-medium text-gray-800">{file.name}</p>
                               <p className="text-xs text-gray-500">{parsedTransactions.length} linhas para análise.</p>
                           </div>
                           <button onClick={resetState} className="text-sm font-semibold text-blue-600 hover:underline">Trocar Arquivo</button>
                        </div>
                        
                        <div className="max-h-64 overflow-y-auto border rounded-lg">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="p-2 text-left font-medium text-gray-500">Data</th>
                                        <th className="p-2 text-left font-medium text-gray-500">Descrição</th>
                                        <th className="p-2 text-right font-medium text-gray-500">Valor</th>
                                        <th className="p-2 text-left font-medium text-gray-500">Status</th>
                                        <th className="p-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedTransactions.map((t, index) => (
                                        <tr key={index} className="border-t">
                                            <td className="p-2">{t.date ? formatDate(t.date) : '-'}</td>
                                            <td className="p-2 font-medium">{t.description || t.categoryName}</td>
                                            <td className={`p-2 font-semibold text-right ${t.nature === 'RECEITA' ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(t.value || 0)}</td>
                                            <td className="p-2">
                                                <StatusBadge status={t.status} />
                                                {t.message && <p className="text-xs text-red-500 mt-1">{t.message}</p>}
                                            </td>
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
                    </>
                )}
                 
                {error && <p className="text-sm text-red-600 text-center p-2 bg-red-50 rounded-md">{error}</p>}

                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t mt-4">
                    <p className="text-sm font-semibold text-gray-700">{transactionsToImportCount} novos lançamentos para importar.</p>
                    <div className="flex gap-3">
                        <button type="button" onClick={handleClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Cancelar</button>
                        <button 
                            type="button"
                            onClick={handleImport}
                            disabled={isLoading || transactionsToImportCount === 0}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold shadow disabled:bg-blue-300 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar Importação'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default TransactionImportModal;