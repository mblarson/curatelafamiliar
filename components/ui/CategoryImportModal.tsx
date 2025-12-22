import React, { useState, useCallback, useMemo } from 'react';
import Modal from './Modal';
import { useAppData } from '../../hooks/useAppData';
import { Category, CategoryType } from '../../types';
import { UploadCloud, FileText, AlertTriangle, BadgeCheck, BadgeX, Trash2, Loader2, Info } from 'lucide-react';

declare global {
    interface Window {
        XLSX: any;
    }
}

type ParsedCategoryStatus = 'new' | 'duplicate' | 'invalid';

interface ParsedCategory {
    name: string;
    type: CategoryType;
    status: ParsedCategoryStatus;
    originalRow: number;
    message?: string;
}

const CategoryImportModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
}> = ({ isOpen, onClose }) => {
    const { categories, addCategoriesBatch } = useAppData();
    const [file, setFile] = useState<File | null>(null);
    const [parsedCategories, setParsedCategories] = useState<ParsedCategory[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const resetState = useCallback(() => {
        setFile(null);
        setParsedCategories([]);
        setIsLoading(false);
        setError(null);
    }, []);

    const handleClose = useCallback(() => {
        resetState();
        onClose();
    }, [resetState, onClose]);

    const handleFileSelect = useCallback(async (selectedFile: File) => {
        if (!selectedFile) return;
        
        setIsLoading(true);
        setError(null);
        setFile(selectedFile);

        try {
            const data = await selectedFile.arrayBuffer();
            const workbook = window.XLSX.read(data, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json: (string | number)[][] = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (json.length < 2) {
                throw new Error('A planilha está vazia ou não contém dados de categoria.');
            }
            
            const rows = json.slice(1); // Ignora o cabeçalho
            const existingCategoryNames = new Set(categories.map(c => c.name.toLowerCase()));
            const namesInFile = new Set<string>();
            const processed: ParsedCategory[] = [];

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const name = (row[0] || '').toString().trim();
                const typeStr = (row[1] || '').toString().trim().toUpperCase();

                if (!name && !typeStr) continue; // Pula linhas vazias

                const result: ParsedCategory = { name, type: CategoryType.DESPESA, status: 'new', originalRow: i + 2 };

                if (!name) {
                    result.status = 'invalid';
                    result.message = 'O nome da categoria está em branco.';
                } else if (typeStr !== 'RECEITA' && typeStr !== 'DESPESA') {
                    result.status = 'invalid';
                    result.message = `Natureza "${row[1]}" inválida. Use "Receita" ou "Despesa".`;
                } else {
                    result.type = typeStr as CategoryType;
                    const lowerCaseName = name.toLowerCase();
                    if (existingCategoryNames.has(lowerCaseName)) {
                        result.status = 'duplicate';
                        result.message = 'Esta categoria já existe no sistema.';
                    } else if (namesInFile.has(lowerCaseName)) {
                        result.status = 'duplicate';
                        result.message = 'Nome duplicado dentro do arquivo de importação.';
                    } else {
                        namesInFile.add(lowerCaseName);
                    }
                }
                processed.push(result);
            }
            setParsedCategories(processed);

        } catch (err) {
            console.error("Erro ao processar o arquivo:", err);
            setError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido.");
            setFile(null);
        } finally {
            setIsLoading(false);
        }
    }, [categories]);

    const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        const droppedFile = event.dataTransfer.files?.[0];
        if (droppedFile && (droppedFile.name.endsWith('.xls') || droppedFile.name.endsWith('.xlsx'))) {
            handleFileSelect(droppedFile);
        } else {
            setError('Por favor, envie um arquivo XLS ou XLSX.');
        }
    }, [handleFileSelect]);

    const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
    };
    
    const handleRemoveCategory = (index: number) => {
        setParsedCategories(prev => prev.filter((_, i) => i !== index));
    };

    const handleImport = async () => {
        const categoriesToImport = parsedCategories.filter(c => c.status === 'new');
        if(categoriesToImport.length === 0) {
            setError('Nenhuma nova categoria para importar.');
            return;
        }
        
        setIsLoading(true);
        setError(null);
        try {
            await addCategoriesBatch(categoriesToImport.map(c => ({ name: c.name, type: c.type })));
            alert(`${categoriesToImport.length} categorias importadas com sucesso!`);
            handleClose();
        } catch (err) {
            setError('Falha ao importar categorias.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const categoriesToImportCount = useMemo(() => {
        return parsedCategories.filter(c => c.status === 'new').length;
    }, [parsedCategories]);

    const StatusBadge: React.FC<{status: ParsedCategoryStatus}> = ({ status }) => {
        const config = {
            new: { Icon: BadgeCheck, text: 'Nova', color: 'text-green-600 bg-green-100' },
            duplicate: { Icon: AlertTriangle, text: 'Duplicada', color: 'text-yellow-600 bg-yellow-100' },
            invalid: { Icon: BadgeX, text: 'Inválida', color: 'text-red-600 bg-red-100' },
        }[status];
        return (
            <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${config.color}`}>
                <config.Icon size={14} />
                {config.text}
            </span>
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Importar Categorias de Planilha XLS">
            <div className="space-y-4">
                {!file ? (
                     <>
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                            <div className="flex">
                                <div className="flex-shrink-0"><Info className="h-5 w-5 text-blue-500" /></div>
                                <div className="ml-3">
                                    <p className="text-sm text-blue-700">
                                        Sua planilha deve ter a Coluna A para nomes e a Coluna B para a natureza ('Receita' ou 'Despesa'), começando da linha 2.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div
                            onDrop={onDrop}
                            onDragOver={onDragOver}
                            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                            onClick={() => document.getElementById('xls-upload')?.click()}
                        >
                            <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                            <p className="mt-2 text-sm text-gray-600">Arraste e solte o arquivo XLS aqui, ou clique para selecionar</p>
                            <input id="xls-upload" type="file" accept=".xls,.xlsx" className="hidden" onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])} />
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg">
                           <FileText className="w-6 h-6 text-blue-600 flex-shrink-0" />
                           <div className="flex-grow">
                                <p className="font-medium text-gray-800">{file.name}</p>
                                <p className="text-xs text-gray-500">{parsedCategories.length} linhas encontradas.</p>
                           </div>
                           <button onClick={resetState} className="text-sm font-semibold text-blue-600 hover:underline">Trocar Arquivo</button>
                        </div>
                        
                        <div className="max-h-64 overflow-y-auto border rounded-lg">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="p-2 text-left font-medium text-gray-500">Nome</th>
                                        <th className="p-2 text-left font-medium text-gray-500">Natureza</th>
                                        <th className="p-2 text-left font-medium text-gray-500">Status</th>
                                        <th className="p-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedCategories.map((cat, index) => (
                                        <tr key={index} className="border-t">
                                            <td className="p-2 font-medium">{cat.name}</td>
                                            <td className="p-2">{cat.type}</td>
                                            <td className="p-2">
                                                <StatusBadge status={cat.status} />
                                                {cat.message && <p className="text-xs text-gray-500 mt-1">{cat.message}</p>}
                                            </td>
                                            <td className="p-2 text-right">
                                                <button onClick={() => handleRemoveCategory(index)} className="p-1 text-gray-400 hover:text-red-600 rounded-full">
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
                 
                {error && <p className="text-sm text-red-600 text-center">{error}</p>}

                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t mt-4">
                    <p className="text-sm font-semibold text-gray-700">
                        {categoriesToImportCount} novas categorias para importar.
                    </p>
                    <div className="flex gap-3">
                        <button type="button" onClick={handleClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Cancelar</button>
                        <button 
                            type="button"
                            onClick={handleImport}
                            disabled={isLoading || categoriesToImportCount === 0}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold shadow disabled:bg-blue-300 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Importar'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default CategoryImportModal;
