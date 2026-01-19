import React, { useState, useMemo } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { Transaction, TransactionNature, CategoryType } from '../../types';
import Modal from '../ui/Modal';
import PdfOptionsModal from '../ui/PdfOptionsModal';
import CurrencyInput from '../ui/CurrencyInput';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { generateTransactionsPDF } from '../../utils/pdfGenerator';
import { 
  Plus, Trash2, Download, Filter, Wallet, 
  Edit, MessageSquare, ChevronRight, X
} from 'lucide-react';

const TransactionForm: React.FC<{
  onSubmit: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
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
    const [comments, setComments] = useState(transactionToEdit?.comments || '');
    const [numeroNota, setNumeroNota] = useState(transactionToEdit?.numeroNota || '');
    const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'Cartão de Débito' | 'BOLETO' | undefined>(transactionToEdit?.paymentMethod);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const filteredCategories = useMemo(() => {
        return categories.filter(c => c.type === (nature as unknown as CategoryType));
    }, [categories, nature]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const transactionData = { 
            description, nature, accountId, categoryId, date, value, 
            type: transactionType, comments, numeroNota, paymentMethod 
        };
        await onSubmit(transactionData);
        setIsSubmitting(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setNature(TransactionNature.RECEITA)} className={`p-3 sm:p-4 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all active:scale-95 ${nature === TransactionNature.RECEITA ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-100 text-slate-500'}`}>Receita</button>
                <button type="button" onClick={() => setNature(TransactionNature.DESPESA)} className={`p-3 sm:p-4 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all active:scale-95 ${nature === TransactionNature.DESPESA ? 'bg-rose-500 text-white shadow-lg' : 'bg-slate-100 text-slate-500'}`}>Despesa</button>
            </div>
            
            <div className="space-y-4">
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none" />
                <CurrencyInput value={value} onChange={setValue} />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none">
                        <option value="">Conta Bancária</option>
                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>

                    <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none">
                        <option value="">Categoria</option>
                        {filteredCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                </div>

                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none" />
            </div>

            <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={onClose} className="px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold uppercase text-[10px] transition-all active:scale-95">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="btn-premium-gold px-8 py-3 text-white rounded-xl font-extrabold uppercase text-[10px] shadow-lg disabled:opacity-50 transition-all active:scale-95">Confirmar</button>
            </div>
        </form>
    );
};

const Transactions: React.FC<{
  transactionType: 'checking_account' | 'credit_card';
  title: string;
}> = ({ transactionType, title }) => {
    const { transactions, accounts, categories, deleteTransaction, addTransaction, updateTransaction } = useAppData();
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isPdfOptionsModalOpen, setIsPdfOptionsModalOpen] = useState(false);
    const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
    const [selectedAccountFilter, setSelectedAccountFilter] = useState('');
    const [activeActionId, setActiveActionId] = useState<string | null>(null);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const matchesType = t.type === transactionType;
            const matchesAccount = selectedAccountFilter ? t.accountId === selectedAccountFilter : true;
            return matchesType && matchesAccount;
        });
    }, [transactions, transactionType, selectedAccountFilter]);

    const handleOpenForm = (transaction?: Transaction) => {
        setTransactionToEdit(transaction || null);
        setIsFormModalOpen(true);
        setActiveActionId(null);
    };

    const handleFormSubmit = async (data: Omit<Transaction, 'id'>) => {
        if (transactionToEdit) {
            await updateTransaction({ ...transactionToEdit, ...data });
        } else {
            await addTransaction(data);
        }
        setIsFormModalOpen(false);
        setTransactionToEdit(null);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Excluir este lançamento?')) {
            await deleteTransaction(id);
            setActiveActionId(null);
        }
    };

    const handleGeneratePdf = (options: { accountId: string; startDate: string; endDate: string }) => {
        const account = accounts.find(a => a.id === options.accountId);
        if (!account) return;
        const start = new Date(options.startDate);
        const end = new Date(options.endDate);
        const transactionsInPeriod = transactions.filter(t => {
            const tDate = new Date(t.date);
            return t.accountId === options.accountId && t.type === transactionType && tDate >= start && tDate <= end;
        });
        generateTransactionsPDF({ account, period: { start: options.startDate, end: options.endDate }, transactionsInPeriod, allTransactions: transactions, transactionType, title });
        setIsPdfOptionsModalOpen(false);
    };

    return (
        <div className="space-y-6 sm:space-y-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
                <div>
                    <h1 className="text-2xl sm:text-4xl font-[800] text-slate-900 tracking-tight">{title}</h1>
                    <p className="text-sm sm:text-base text-slate-500 mt-1 sm:mt-2 font-medium tracking-wide">Gestão detalhada de lançamentos financeiros.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => setIsPdfOptionsModalOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 font-bold uppercase tracking-widest text-[9px] sm:text-[10px] shadow-sm active:scale-95 transition-transform">
                        <Download size={16} className="text-[#c5a059]" /> Exportar
                    </button>
                    <button onClick={() => handleOpenForm()} className="btn-premium-navy flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 text-white rounded-xl font-extrabold uppercase tracking-widest text-[9px] sm:text-[10px] shadow-lg active:scale-95 transition-transform">
                        <Plus size={18} className="text-[#c5a059]" /> Novo
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl sm:rounded-[2.5rem] premium-shadow border border-slate-50 overflow-hidden">
                <div className="p-4 sm:p-8 border-b border-slate-50 bg-slate-50/20 flex items-center gap-3 sm:gap-4">
                    <Filter size={14} className="text-[#c5a059]" />
                    <select value={selectedAccountFilter} onChange={(e) => setSelectedAccountFilter(e.target.value)} className="bg-transparent border-none focus:ring-0 text-[10px] sm:text-xs font-extrabold text-slate-400 uppercase tracking-widest cursor-pointer w-full">
                        <option value="">Filtrar: Todas as Contas</option>
                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                </div>

                {/* Tabela para Desktop */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/10">
                                <th className="p-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.25em]">Data</th>
                                <th className="p-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.25em]">Descrição / Categoria</th>
                                <th className="p-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.25em] text-right">Valor</th>
                                <th className="p-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.25em] text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.map(t => (
                                <tr key={t.id} className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50/30 transition-colors">
                                    <td className="p-6 text-sm font-semibold text-slate-500 tabular-nums">{formatDate(t.date)}</td>
                                    <td className="p-6">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900 tracking-tight">{t.description || '-'}</span>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                                {categories.find(c => c.id === t.categoryId)?.name || 'S/ CATEGORIA'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className={`p-6 text-right font-black text-base tabular-nums ${t.nature === 'RECEITA' ? 'text-emerald-600' : 'text-slate-900'}`}>
                                        {t.nature === 'RECEITA' ? '+' : '-'} {formatCurrency(t.value)}
                                    </td>
                                    <td className="p-6 text-right">
                                        <div className="flex justify-end gap-1">
                                            <button onClick={() => handleOpenForm(t)} className="p-2 text-slate-300 hover:text-[#c5a059] transition-all"><Edit size={16} /></button>
                                            <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-all"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Cards para Mobile com Ações sob Demanda */}
                <div className="md:hidden divide-y divide-slate-50">
                    {filteredTransactions.length === 0 ? (
                         <div className="p-12 text-center">
                            <Wallet className="mx-auto h-10 w-10 text-slate-200" />
                            <p className="text-slate-400 mt-4 font-extrabold uppercase tracking-widest text-[10px]">Sem lançamentos registrados.</p>
                        </div>
                    ) : filteredTransactions.map(t => (
                        <div 
                            key={t.id} 
                            className={`p-4 relative transition-colors active:bg-slate-50 ${activeActionId === t.id ? 'bg-slate-50/50' : ''}`}
                            onClick={() => setActiveActionId(activeActionId === t.id ? null : t.id)}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1 pr-4">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tabular-nums tracking-widest">{formatDate(t.date)}</p>
                                    <h3 className="font-bold text-slate-900 leading-tight mt-1 truncate max-w-[200px]">{t.description || '-'}</h3>
                                    <p className="text-[9px] font-black text-[#c5a059] uppercase mt-0.5 tracking-wider">
                                        {categories.find(c => c.id === t.categoryId)?.name || 'S/ CATEGORIA'}
                                    </p>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <p className={`font-black text-sm tabular-nums ${t.nature === 'RECEITA' ? 'text-emerald-600' : 'text-slate-900'}`}>
                                        {t.nature === 'RECEITA' ? '+' : '-'} {formatCurrency(t.value)}
                                    </p>
                                    <ChevronRight size={14} className={`mt-2 transition-transform ${activeActionId === t.id ? 'rotate-90 text-[#c5a059]' : 'text-slate-200'}`} />
                                </div>
                            </div>
                            
                            {/* Menu de Ações Mobile - Revelado por Toque */}
                            {activeActionId === t.id && (
                                <div className="mt-4 flex gap-2 animate-scale-in">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleOpenForm(t); }} 
                                        className="flex-1 bg-slate-900 text-white p-3 rounded-xl font-bold uppercase text-[9px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
                                    >
                                        <Edit size={14} className="text-[#c5a059]" /> Editar
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }} 
                                        className="flex-1 bg-rose-50 text-rose-600 p-3 rounded-xl font-bold uppercase text-[9px] flex items-center justify-center gap-2 active:scale-95 transition-all"
                                    >
                                        <Trash2 size={14} /> Excluir
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setActiveActionId(null); }} 
                                        className="p-3 bg-slate-100 text-slate-400 rounded-xl active:scale-95 transition-all"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title={transactionToEdit ? 'Alterar Lançamento' : 'Novo Lançamento'}>
                <TransactionForm onSubmit={handleFormSubmit} onClose={() => setIsFormModalOpen(false)} transactionToEdit={transactionToEdit} transactionType={transactionType} />
            </Modal>
            <PdfOptionsModal isOpen={isPdfOptionsModalOpen} onClose={() => setIsPdfOptionsModalOpen(false)} onSubmit={handleGeneratePdf} />
        </div>
    );
};

export default Transactions;