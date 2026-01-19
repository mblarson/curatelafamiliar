import React, { useState } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { BankAccount, AccountType, TransactionNature, CategoryType } from '../../types';
import Modal from '../ui/Modal';
import CurrencyInput from '../ui/CurrencyInput';
import { formatCurrency } from '../../utils/formatters';
import { Plus, Edit, Trash2, Landmark, ShieldCheck } from 'lucide-react';

const BankAccountForm: React.FC<{
  onSubmit: (account: Omit<BankAccount, 'id'>) => Promise<void>;
  onClose: () => void;
  accountToEdit?: BankAccount | null;
}> = ({ onSubmit, onClose, accountToEdit }) => {
  const [name, setName] = useState(accountToEdit?.name || '');
  const [type, setType] = useState<AccountType>(accountToEdit?.type || AccountType.CONTA_CORRENTE);
  const [initialBalance, setInitialBalance] = useState(accountToEdit?.initialBalance || 0);
  const [dataAbertura, setDataAbertura] = useState(accountToEdit?.dataAbertura || new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('O nome da conta é obrigatório.');
      return;
    }
    if (!dataAbertura) {
      setError('A data de abertura é obrigatória.');
      return;
    }
    setIsSubmitting(true);
    await onSubmit({ name, type, initialBalance, dataAbertura });
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="accountName" className="block text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Identificação da Conta</label>
        <input
          id="accountName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#c5a059] focus:border-transparent transition-all gold-focus font-medium"
          placeholder="Ex: Conta Prime"
        />
        {error && !name.trim() && <p className="text-[10px] font-extrabold text-rose-500 mt-1 uppercase tracking-wider">{error}</p>}
      </div>
       <div>
        <label htmlFor="accountType" className="block text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Tipo de Ativo</label>
        <select
          id="accountType"
          value={type}
          onChange={(e) => setType(e.target.value as AccountType)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#c5a059] transition-all gold-focus font-semibold"
        >
          <option value={AccountType.CONTA_CORRENTE}>Conta Corrente de Movimentação</option>
          <option value={AccountType.CONTA_POUPANCA}>Conta de Reserva Poupada</option>
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="dataAbertura" className="block text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Início do Controle</label>
          <input
            type="date"
            id="dataAbertura"
            value={dataAbertura}
            onChange={(e) => setDataAbertura(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#c5a059] gold-focus font-medium"
          />
        </div>
        <div>
          <label htmlFor="initialBalance" className="block text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Saldo de Abertura</label>
          <CurrencyInput value={initialBalance} onChange={setInitialBalance} id="initialBalance"/>
        </div>
      </div>
      
      <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
        <p className="text-[10px] text-amber-700 font-extrabold uppercase tracking-widest text-center leading-relaxed">Nota: O saldo inicial gerará um lançamento de ajuste automático.</p>
      </div>

      <div className="flex justify-end gap-3 pt-6">
        <button type="button" onClick={onClose} className="px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-2xl hover:bg-slate-50 font-bold uppercase tracking-wider transition-all text-xs">Cancelar</button>
        <button type="submit" disabled={isSubmitting} className="btn-premium-gold px-8 py-3 text-white rounded-2xl font-extrabold uppercase tracking-widest text-xs shadow-lg disabled:opacity-50">
          {isSubmitting ? 'SALVANDO...' : 'CONFIRMAR'}
        </button>
      </div>
    </form>
  );
};

const BankAccounts: React.FC = () => {
  const { accounts, addAccount, updateAccount, deleteAccount, calculateCurrentBalance, addTransaction, categories } = useAppData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<BankAccount | null>(null);

  const handleOpenModal = (account?: BankAccount) => {
    setAccountToEdit(account || null);
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setAccountToEdit(null);
  };

  const handleSubmit = async (data: Omit<BankAccount, 'id'>) => {
    if (accountToEdit) {
      await updateAccount({ ...accountToEdit, ...data });
    } else {
      const newAccount = await addAccount(data);

      if (newAccount && data.initialBalance > 0) {
          const receitaCategory = categories.find(c => c.type === CategoryType.RECEITA);
          if (!receitaCategory) {
              alert('Lançamento inicial falhou: Crie uma categoria de Receita primeiro.');
              handleCloseModal();
              return;
          }
          await addTransaction({
              description: 'Saldo Inicial (Ajuste)',
              nature: TransactionNature.RECEITA,
              accountId: newAccount.id,
              categoryId: receitaCategory.id,
              date: data.dataAbertura,
              value: data.initialBalance,
              type: 'checking_account'
          });
      }
    }
    handleCloseModal();
  };
  
  const handleDelete = async (id: string) => {
    if(window.confirm('Excluir esta conta removerá permanentemente todo o histórico associado. Deseja prosseguir?')) {
      await deleteAccount(id);
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-[800] text-slate-900 tracking-tight">Custódia Bancária</h1>
          <p className="text-slate-500 mt-2 font-medium tracking-wide">Gerenciamento de ativos financeiros sob curatela.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="btn-premium-navy flex items-center justify-center gap-2 px-8 py-4 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-2xl w-full sm:w-auto"
        >
          <Plus size={20} className="text-[#c5a059]" />
          ADICIONAR CONTA
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {accounts.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-3 text-center py-24 bg-white rounded-[2.5rem] premium-shadow border border-slate-100 border-dashed">
            <Landmark className="mx-auto h-16 w-16 text-slate-200" />
            <p className="text-slate-400 mt-6 font-extrabold uppercase tracking-widest text-[11px]">Nenhum registro de conta disponível.</p>
          </div>
        ) : (
          accounts.map(acc => (
            <div key={acc.id} className="bg-white p-8 rounded-[2.5rem] premium-shadow border border-slate-50 flex flex-col justify-between card-hover group">
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-5">
                    <div className="bg-slate-900 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                       <Landmark className="w-7 h-7 text-[#c5a059]" />
                    </div>
                    <div>
                      <h3 className="font-[800] text-xl text-slate-900 tracking-tight">{acc.name}</h3>
                      <p className="text-[10px] font-extrabold text-[#c5a059] uppercase tracking-[0.15em] mt-0.5">{acc.type}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-8">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em]">Disponibilidade Atual</p>
                  <p className="text-4xl font-[800] text-slate-900 mt-2 tracking-tighter tabular-nums">{formatCurrency(calculateCurrentBalance(acc.id))}</p>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-50">
                <button onClick={() => handleOpenModal(acc)} className="p-3 text-slate-400 hover:text-[#c5a059] hover:bg-slate-50 rounded-xl transition-all"><Edit size={20} /></button>
                <button onClick={() => handleDelete(acc.id)} className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={20} /></button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={accountToEdit ? 'Alterar Ativo' : 'Nova Conta Bancária'}>
        <BankAccountForm onSubmit={handleSubmit} onClose={handleCloseModal} accountToEdit={accountToEdit} />
      </Modal>
    </div>
  );
};

export default BankAccounts;