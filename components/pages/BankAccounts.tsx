import React, { useState } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { BankAccount, AccountType, TransactionNature, CategoryType } from '../../types';
import Modal from '../ui/Modal';
import CurrencyInput from '../ui/CurrencyInput';
import { formatCurrency } from '../../utils/formatters';
import { Plus, Edit, Trash2, Landmark, X, ChevronRight } from 'lucide-react';

const BankAccountForm: React.FC<{
  onSubmit: (account: Omit<BankAccount, 'id'>) => Promise<void>;
  onClose: () => void;
  accountToEdit?: BankAccount | null;
}> = ({ onSubmit, onClose, accountToEdit }) => {
  const [name, setName] = useState(accountToEdit?.name || '');
  const [type, setType] = useState<AccountType>(accountToEdit?.type || AccountType.CONTA_CORRENTE);
  const [initialBalance, setInitialBalance] = useState(accountToEdit?.initialBalance || 0);
  const [dataAbertura, setDataAbertura] = useState(accountToEdit?.dataAbertura || new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dataAbertura) return;
    setIsSubmitting(true);
    await onSubmit({ name, type, initialBalance, dataAbertura });
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Identificação da Conta</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-[#c5a059] outline-none" placeholder="Ex: Principal" />
        </div>
        <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Natureza do Ativo</label>
            <select value={type} onChange={(e) => setType(e.target.value as AccountType)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none">
              <option value={AccountType.CONTA_CORRENTE}>Conta Corrente</option>
              <option value={AccountType.CONTA_POUPANCA}>Conta Poupança</option>
            </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Data de Início</label>
            <input type="date" value={dataAbertura} onChange={(e) => setDataAbertura(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Saldo Inicial</label>
            <CurrencyInput value={initialBalance} onChange={setInitialBalance} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold uppercase text-[10px] transition-all active:scale-95">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="btn-premium-gold px-8 py-3 text-white rounded-xl font-extrabold uppercase text-[10px] shadow-lg disabled:opacity-50 transition-all active:scale-95">Confirmar</button>
        </div>
    </form>
  );
};

const BankAccounts: React.FC = () => {
  const { accounts, addAccount, updateAccount, deleteAccount, calculateCurrentBalance, addTransaction, categories } = useAppData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<BankAccount | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  const handleOpenModal = (account?: BankAccount) => {
    setAccountToEdit(account || null);
    setIsModalOpen(true);
    setActiveActionId(null);
  };
  
  const handleSubmit = async (data: Omit<BankAccount, 'id'>) => {
    if (accountToEdit) {
      await updateAccount({ ...accountToEdit, ...data });
    } else {
      const newAccount = await addAccount(data);
      if (newAccount && data.initialBalance > 0) {
          const cat = categories.find(c => c.type === CategoryType.RECEITA);
          if (cat) await addTransaction({ description: 'Saldo Inicial', nature: TransactionNature.RECEITA, accountId: newAccount.id, categoryId: cat.id, date: data.dataAbertura, value: data.initialBalance, type: 'checking_account' });
      }
    }
    setIsModalOpen(false);
  };
  
  const handleDelete = async (id: string) => {
    if(window.confirm('Excluir esta conta permanentemente?')) {
      await deleteAccount(id);
      setActiveActionId(null);
    }
  }

  return (
    <div className="space-y-6 sm:space-y-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-[800] text-slate-900 tracking-tight">Custódia Bancária</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1 sm:mt-2 font-medium tracking-wide">Gestão segura de ativos e disponibilidades familiares.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-premium-navy flex items-center justify-center gap-2 px-6 py-3.5 text-white rounded-xl font-bold uppercase tracking-widest text-[9px] sm:text-[10px] shadow-2xl w-full sm:w-auto active:scale-95 transition-transform">
          <Plus size={18} className="text-[#c5a059]" /> ADICIONAR CONTA
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
        {accounts.map(acc => (
          <div 
            key={acc.id} 
            className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-[2.5rem] premium-shadow border border-slate-50 card-hover group active:bg-slate-50 transition-colors relative"
            onClick={() => setActiveActionId(activeActionId === acc.id ? null : acc.id)}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3 sm:gap-5">
                <div className="bg-slate-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg">
                   <Landmark className="w-5 h-5 sm:w-7 sm:h-7 text-[#c5a059]" />
                </div>
                <div>
                  <h3 className="font-[800] text-lg sm:text-xl text-slate-900 tracking-tight">{acc.name}</h3>
                  <p className="text-[9px] font-extrabold text-[#c5a059] uppercase mt-0.5 tracking-widest">{acc.type}</p>
                </div>
              </div>
              <ChevronRight size={16} className={`sm:hidden transition-transform ${activeActionId === acc.id ? 'rotate-90 text-[#c5a059]' : 'text-slate-300'}`} />
            </div>
            
            <div className="mt-6 sm:mt-8">
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-[0.2em]">Disponibilidade Atual</p>
              <p className="text-2xl sm:text-4xl font-[800] text-slate-900 mt-1 sm:mt-2 tracking-tighter tabular-nums">{formatCurrency(calculateCurrentBalance(acc.id))}</p>
            </div>
            
            {/* Ações Mobile - Reveladas por Toque */}
            <div className={`mt-6 pt-6 border-t border-slate-50 flex gap-2 transition-all ${activeActionId === acc.id ? 'opacity-100 flex' : 'hidden sm:flex'}`}>
                <button 
                    onClick={(e) => { e.stopPropagation(); handleOpenModal(acc); }} 
                    className="flex-1 sm:flex-none p-3 text-slate-400 hover:text-[#c5a059] bg-slate-50 sm:bg-transparent rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                    <Edit size={18} />
                    <span className="sm:hidden text-[10px] font-bold uppercase tracking-widest">Editar</span>
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(acc.id); }} 
                    className="flex-1 sm:flex-none p-3 text-slate-400 hover:text-rose-600 bg-rose-50 sm:bg-transparent rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                    <Trash2 size={18} />
                    <span className="sm:hidden text-[10px] font-bold uppercase tracking-widest">Excluir</span>
                </button>
                {activeActionId === acc.id && (
                    <button onClick={(e) => { e.stopPropagation(); setActiveActionId(null); }} className="sm:hidden p-3 bg-slate-100 text-slate-400 rounded-xl active:scale-95 transition-all">
                        <X size={18} />
                    </button>
                )}
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={accountToEdit ? 'Editar Conta' : 'Nova Conta Bancária'}>
        <BankAccountForm onSubmit={handleSubmit} onClose={() => setIsModalOpen(false)} accountToEdit={accountToEdit} />
      </Modal>
    </div>
  );
};

export default BankAccounts;