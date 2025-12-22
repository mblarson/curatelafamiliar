
import React, { useState, useMemo } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { Transaction, TransactionNature, CategoryType, BankAccount, Category } from '../../types';
import Modal from '../ui/Modal';
import CurrencyInput from '../ui/CurrencyInput';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { generateTransactionsPDF } from '../../utils/pdfGenerator';
import ReceiptScannerModal from '../ai/ReceiptScannerModal';
import { Plus, Edit, Trash2, Download, Filter, Camera, FileText } from 'lucide-react';


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

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Natureza do Lançamento</label>
                <div className="grid grid-cols-2 gap-4">
                    <button type="button" onClick={() => { setNature(TransactionNature.RECEITA); setCategoryId(''); }} className={`p-3 rounded-lg font-semibold transition ${nature === TransactionNature.RECEITA ? 'bg-emerald-500 text-white ring-2 ring-emerald-600 ring-offset-2' : 'bg-slate-100 hover:bg-emerald-100'}`}>Receita</button>
                    <button type="button" onClick={() => { setNature(TransactionNature.DESPESA); setCategoryId(''); }} className={`p-3 rounded-lg font-semibold transition ${nature === TransactionNature.DESPESA ? 'bg-rose-500 text-white ring-2 ring-rose-600 ring-offset-2' : 'bg-slate-100 hover:bg-rose-100'}`}>Despesa</button>
                </div>
            </div>
            
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-600">Descrição</label>
                <input
                    type="text"
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="Ex: Compras do mês"
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="accountId" className="block text-sm font-medium text-slate-600">Conta Bancária</label>
                    <select id="accountId" value={accountId} onChange={(e) => setAccountId(e.target.value)} className={`mt-1 w-full px-3 py-2 border ${errors.accountId ? 'border-red-500' : 'border-slate-300'} bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500`}>
                        <option value="">Selecione...</option>
                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="categoryId" className="block text-sm font-medium text-slate-600">Categoria</label>
                    <select id="categoryId" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={`mt-1 w-full px-3 py-2 border ${errors.categoryId ? 'border-red-500' : 'border-slate-300'} bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500`}>
                        <option value="">Selecione...</option>
                        {filteredCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="date" className="block text-sm font-medium text-slate-600">Data</label>
                    <input type="date" id="date" value={date} onChange={(e) => setDate(e.target.value)} className={`mt-1 w-full px-3 py-2 border ${errors.date ? 'border-red-500' : 'border-slate-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500`} />
                </div>
                <div>
                    <label htmlFor="value" className="block text-sm font-medium text-slate-600">Valor</label>
                    <CurrencyInput id="value" value={value} onChange={setValue} />
                     {errors.value && <p className="text-sm text-red-500 mt-1">{errors.value}</p>}
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition-colors">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors font-semibold shadow">Confirmar</button>
            </div>
        </form>
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
         <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">{title}</h1>
                    <p className="text-slate-500 mt-1">Registre e gerencie suas movimentações financeiras.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button onClick={() => generateTransactionsPDF(filteredTransactions, categories, accounts, title)} className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-semibold shadow-sm">
                        <Download size={20} />
                        Gerar PDF
                    </button>
                    <button onClick={() => setIsScannerOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-sky-600 border border-sky-600 rounded-lg hover:bg-sky-50 transition-colors font-semibold shadow-sm">
                        <Camera size={20} />
                        Digitalizar Recibo
                    </button>
                    <button onClick={() => handleOpenModal()} className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors font-semibold shadow-md">
                        <Plus size={20} />
                        Criar Lançamento
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Filter size={18} className="text-slate-500" />
                    <h3 className="font-semibold text-slate-600">Filtros</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-300" />
                    <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-300">
                        <option value="">Todas as categorias</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select value={filterNature} onChange={e => setFilterNature(e.target.value)} className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-300">
                        <option value="">Toda natureza</option>
                        <option value="RECEITA">Receita</option>
                        <option value="DESPESA">Despesa</option>
                    </select>
                </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
                {filteredTransactions.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-slate-500">Nenhum lançamento encontrado.</p>
                        <p className="text-slate-400 text-sm mt-1">{transactions.length > 0 ? "Ajuste os filtros ou adicione um novo lançamento." : 'Clique em "Criar Lançamento" para começar.'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b-2 border-slate-100">
                                <tr>
                                    <th className="p-3 text-sm font-semibold text-slate-500 w-1/12"></th>
                                    <th className="p-3 text-sm font-semibold text-slate-500">Data</th>
                                    <th className="p-3 text-sm font-semibold text-slate-500">Descrição</th>
                                    <th className="p-3 text-sm font-semibold text-slate-500 hidden md:table-cell">Conta</th>
                                    <th className="p-3 text-sm font-semibold text-slate-500 text-right">Valor</th>
                                    <th className="p-3 text-sm font-semibold text-slate-500 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map(t => (
                                    <tr key={t.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                                        <td className="p-4 text-center">
                                            {t.scannedReceiptImage && (
                                                <button onClick={() => setViewingReceipt(t.scannedReceiptImage || null)} className="text-slate-400 hover:text-sky-600 transition-colors">
                                                    <FileText size={18} />
                                                </button>
                                            )}
                                        </td>
                                        <td className="p-4 text-slate-600">{formatDate(t.date)}</td>
                                        <td className="p-4">
                                            <div className="font-medium text-slate-800">{t.description || getCategoryName(t.categoryId)}</div>
                                            {t.description && <div className="text-xs text-slate-500">{getCategoryName(t.categoryId)}</div>}
                                        </td>
                                        <td className="p-4 text-slate-600 hidden md:table-cell">{getAccountName(t.accountId)}</td>
                                        <td className={`p-4 font-semibold text-right ${t.nature === 'RECEITA' ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(t.value)}</td>
                                        <td className="p-4">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleOpenModal(t)} className="p-2 text-slate-500 hover:text-sky-600 transition-colors"><Edit size={18} /></button>
                                                <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-500 hover:text-rose-600 transition-colors"><Trash2 size={18} /></button>
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
                    <div className="p-4 bg-slate-100 rounded-md">
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
