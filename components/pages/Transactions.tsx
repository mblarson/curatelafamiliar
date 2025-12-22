import React, { useState, useMemo } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { Transaction, TransactionNature, CategoryType } from '../../types';
import Modal from '../ui/Modal';
import CurrencyInput from '../ui/CurrencyInput';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { generateTransactionsPDF } from '../../utils/pdfGenerator';
import ReceiptScannerModal from '../ai/ReceiptScannerModal';
import DocumentScannerModal from '../ai/DocumentScannerModal';
import { Plus, Edit, Trash2, Download, Filter, Camera, FileText, Wallet, Paperclip, XCircle } from 'lucide-react';


const TransactionForm: React.FC<{
  onSubmit: (transaction: Omit<Transaction, 'id'>) => void;
  onClose: () => void;
  transactionToEdit?: Partial<Transaction> | null;
  transactionType: 'checking_account' | 'credit_card';
}> = ({ onSubmit, onClose, transactionToEdit, transactionType }) => {
    const { accounts, categories } = useAppData();
    const [nature, setNature] = useState<TransactionNature>(transactionToEdit?.nature || TransactionNature.DESPESA);
    const [description, setDescription] = useState(transactionToEdit?.description || '');
    const [accountId, setAccountId] = useState(transactionToEdit?.accountId || '');
    const [categoryId, setCategoryId] = useState(transactionToEdit?.categoryId || '');
    const [date, setDate] = useState(transactionToEdit?.date ? transactionToEdit.date.split('T')[0] : new Date().toISOString().split('T')[0]);
    const [value, setValue] = useState(transactionToEdit?.value || 0);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [scannedReceiptImage, setScannedReceiptImage] = useState(transactionToEdit?.scannedReceiptImage || '');
    const [isDocScannerOpen, setIsDocScannerOpen] = useState(false);


    const filteredCategories = useMemo(() => {
        return categories.filter(c => c.type === (nature as unknown as CategoryType));
    }, [categories, nature]);

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!accountId) newErrors.accountId = 'Selecione uma conta.';
        if (!categoryId) newErrors.categoryId = 'Selecione uma categoria.';
        if (value <= 0) newErrors.value = 'O valor deve ser maior que zero.';
        if (!date) newErrors.date = 'A data é obrigatória.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        onSubmit({ description, nature, accountId, categoryId, date, value, type: transactionType, scannedReceiptImage });
    };

    const handleDocScanComplete = (imageBase64: string) => {
        setScannedReceiptImage(imageBase64);
        setIsDocScannerOpen(false);
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Natureza do Lançamento</label>
                    <div className="grid grid-cols-2 gap-4">
                        <button type="button" onClick={() => { setNature(TransactionNature.RECEITA); setCategoryId(''); }} className={`p-3 rounded-lg font-semibold transition ${nature === TransactionNature.RECEITA ? 'bg-green-500 text-white ring-2 ring-green-600 ring-offset-2' : 'bg-gray-100 hover:bg-green-100'}`}>Receita</button>
                        <button type="button" onClick={() => { setNature(TransactionNature.DESPESA); setCategoryId(''); }} className={`p-3 rounded-lg font-semibold transition ${nature === TransactionNature.DESPESA ? 'bg-red-500 text-white ring-2 ring-red-600 ring-offset-2' : 'bg-gray-100 hover:bg-red-100'}`}>Despesa</button>
                    </div>
                </div>
                
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-600">Descrição</label>
                    <input
                        type="text"
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: Compras do mês"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="accountId" className="block text-sm font-medium text-gray-600">Conta Bancária</label>
                        <select id="accountId" value={accountId} onChange={(e) => setAccountId(e.target.value)} className={`mt-1 w-full px-3 py-2 border ${errors.accountId ? 'border-red-500' : 'border-gray-300'} bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}>
                            <option value="">Selecione...</option>
                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="categoryId" className="block text-sm font-medium text-gray-600">Categoria</label>
                        <select id="categoryId" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={`mt-1 w-full px-3 py-2 border ${errors.categoryId ? 'border-red-500' : 'border-gray-300'} bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}>
                            <option value="">Selecione...</option>
                            {filteredCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-gray-600">Data</label>
                        <input type="date" id="date" value={date} onChange={(e) => setDate(e.target.value)} className={`mt-1 w-full px-3 py-2 border ${errors.date ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`} />
                    </div>
                    <div>
                        <label htmlFor="value" className="block text-sm font-medium text-gray-600">Valor</label>
                        <CurrencyInput id="value" value={value} onChange={setValue} />
                        {errors.value && <p className="text-sm text-red-500 mt-1">{errors.value}</p>}
                    </div>
                </div>
                
                <div className="pt-4">
                    <label className="block text-sm font-medium text-gray-600">Anexo do Recibo</label>
                    {scannedReceiptImage ? (
                        <div className="mt-2 group relative">
                            <img 
                                src={`data:image/png;base64,${scannedReceiptImage}`} 
                                alt="Anexo digitalizado"
                                className="w-full h-auto max-h-48 object-contain rounded-lg border bg-gray-50 p-1"
                            />
                             <button
                                type="button"
                                onClick={() => setIsDocScannerOpen(true)}
                                className="absolute bottom-2 right-2 bg-white/80 backdrop-blur-sm text-blue-600 rounded-full p-1.5 shadow-md hover:scale-110 transition-transform"
                                aria-label="Substituir anexo"
                            >
                                <Edit size={18} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setScannedReceiptImage('')}
                                className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm text-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                                aria-label="Remover anexo"
                            >
                                <XCircle size={24} />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setIsDocScannerOpen(true)}
                            className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-blue-600 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors font-semibold"
                        >
                            <Paperclip size={18} />
                            Digitalizar e Anexar Recibo
                        </button>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold shadow">Confirmar</button>
                </div>
            </form>

            <DocumentScannerModal 
                isOpen={isDocScannerOpen}
                onClose={() => setIsDocScannerOpen(false)}
                onScanComplete={handleDocScanComplete}
            />
        </>
    );
};


const Transactions: React.FC<{ transactionType: 'checking_account' | 'credit_card', title: string }> = ({ transactionType, title }) => {
    const { transactions, categories, accounts, addTransaction, updateTransaction, deleteTransaction } = useAppData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [transactionToEdit, setTransactionToEdit] = useState<Partial<Transaction> | null>(null);
    const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

    const [filterDate, setFilterDate] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterNature, setFilterNature] = useState('');

    const filteredTransactions = useMemo(() => {
        return transactions
            .filter(t => t.type === transactionType)
            .filter(t => !filterDate || t.date.startsWith(filterDate))
            .filter(t => !filterCategory || t.categoryId === filterCategory)
            .filter(t => !filterNature || t.nature === filterNature);
    }, [transactions, transactionType, filterDate, filterCategory, filterNature]);
    
    const handleOpenModal = (transaction?: Transaction) => {
        setTransactionToEdit(transaction || null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setTransactionToEdit(null);
    };

    const handleScanComplete = (scannedData: { value: number, date: string, description: string, scannedImage: string }) => {
        setTransactionToEdit({
            ...scannedData,
            scannedReceiptImage: scannedData.scannedImage,
            nature: TransactionNature.DESPESA // Default to expense after scanning
        });
        setIsScannerOpen(false);
        setIsModalOpen(true);
    };

    const handleSubmit = (data: Omit<Transaction, 'id'>) => {
        if (transactionToEdit && 'id' in transactionToEdit) {
            updateTransaction({ ...transactionToEdit, ...data } as Transaction);
        } else {
            addTransaction(data);
        }
        handleCloseModal();
    };

    const handleDelete = (id: string) => {
        if(window.confirm('Tem certeza que deseja remover este lançamento?')) {
            deleteTransaction(id);
        }
    };
    
    const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'N/A';
    const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || 'N/A';

    return (
         <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
                    <p className="text-gray-500 mt-1">Registre e gerencie suas movimentações financeiras.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button onClick={() => generateTransactionsPDF(filteredTransactions, categories, accounts, title)} className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold shadow-sm">
                        <Download size={18} />
                        Gerar PDF
                    </button>
                    <button onClick={() => setIsScannerOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-sm">
                        <Camera size={18} />
                        Digitalizar e Preencher
                    </button>
                    <button onClick={() => handleOpenModal()} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow">
                        <Plus size={20} />
                        Lançamento
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Filter size={18} className="text-gray-500" />
                    <h3 className="font-semibold text-gray-600">Filtros</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300">
                        <option value="">Todas as categorias</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select value={filterNature} onChange={e => setFilterNature(e.target.value)} className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300">
                        <option value="">Toda natureza</option>
                        <option value="RECEITA">Receita</option>
                        <option value="DESPESA">Despesa</option>
                    </select>
                </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm">
                {filteredTransactions.length === 0 ? (
                    <div className="text-center py-16">
                        <Wallet className="mx-auto h-12 w-12 text-gray-300" />
                        <p className="text-gray-500 mt-4">Nenhum lançamento encontrado.</p>
                        <p className="text-gray-400 text-sm mt-1">{transactions.length > 0 ? "Ajuste os filtros ou adicione um novo lançamento." : 'Clique em "Criar Lançamento" para começar.'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b-2 border-gray-100">
                                <tr>
                                    <th className="p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider w-1/12"></th>
                                    <th className="p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                                    <th className="p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Descrição</th>
                                    <th className="p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Conta</th>
                                    <th className="p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider text-right">Valor</th>
                                    <th className="p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map(t => (
                                    <tr key={t.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4 text-center">
                                            {t.scannedReceiptImage && (
                                                <button onClick={() => setViewingReceipt(t.scannedReceiptImage || null)} className="text-gray-400 hover:text-blue-600 transition-colors">
                                                    <FileText size={18} />
                                                </button>
                                            )}
                                        </td>
                                        <td className="p-4 text-gray-600">{formatDate(t.date)}</td>
                                        <td className="p-4">
                                            <div className="font-medium text-gray-800">{t.description || getCategoryName(t.categoryId)}</div>
                                            {t.description && <div className="text-xs text-gray-500">{getCategoryName(t.categoryId)}</div>}
                                        </td>
                                        <td className="p-4 text-gray-600 hidden md:table-cell">{getAccountName(t.accountId)}</td>
                                        <td className={`p-4 font-semibold text-right ${t.nature === 'RECEITA' ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(t.value)}</td>
                                        <td className="p-4">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleOpenModal(t)} className="p-2 text-gray-400 hover:text-blue-600 rounded-full transition-colors"><Edit size={18} /></button>
                                                <button onClick={() => handleDelete(t.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-full transition-colors"><Trash2 size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            <ReceiptScannerModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScanComplete={handleScanComplete}
            />

            {viewingReceipt && (
                <Modal isOpen={!!viewingReceipt} onClose={() => setViewingReceipt(null)} title="Recibo Digitalizado">
                    <div className="p-4 bg-gray-100 rounded-md">
                        <img src={`data:image/png;base64,${viewingReceipt}`} alt="Recibo digitalizado" className="w-full h-auto rounded-md" />
                    </div>
                </Modal>
            )}

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={transactionToEdit && 'id' in transactionToEdit ? 'Editar Lançamento' : 'Novo Lançamento'}>
                <TransactionForm onSubmit={handleSubmit} onClose={handleCloseModal} transactionToEdit={transactionToEdit} transactionType={transactionType} />
            </Modal>
        </div>
    );
};

export default Transactions;