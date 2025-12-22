
import React, { useState } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { BankAccount, AccountType } from '../../types';
import Modal from '../ui/Modal';
import CurrencyInput from '../ui/CurrencyInput';
import { formatCurrency } from '../../utils/formatters';
import { Plus, Edit, Trash2, Landmark } from 'lucide-react';

const BankAccountForm: React.FC<{
  onSubmit: (account: Omit<BankAccount, 'id'>) => void;
  onClose: () => void;
  accountToEdit?: BankAccount | null;
}> = ({ onSubmit, onClose, accountToEdit }) => {
  const [name, setName] = useState(accountToEdit?.name || '');
  const [type, setType] = useState<AccountType>(accountToEdit?.type || AccountType.CONTA_CORRENTE);
  const [initialBalance, setInitialBalance] = useState(accountToEdit?.initialBalance || 0);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('O nome da conta é obrigatório.');
      return;
    }
    onSubmit({ name, type, initialBalance });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="accountName" className="block text-sm font-medium text-gray-600">Nome da Conta</label>
        <input
          id="accountName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          placeholder="Ex: Conta Principal"
        />
        {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
      </div>
       <div>
        <label htmlFor="accountType" className="block text-sm font-medium text-gray-600">Tipo de Conta</label>
        <select
          id="accountType"
          value={type}
          onChange={(e) => setType(e.target.value as AccountType)}
          className="mt-1 w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        >
          <option value={AccountType.CONTA_CORRENTE}>Conta Corrente</option>
          <option value={AccountType.CONTA_POUPANCA}>Conta Poupança</option>
        </select>
      </div>
      <div>
        <label htmlFor="initialBalance" className="block text-sm font-medium text-gray-600">Saldo Atual</label>
        <CurrencyInput value={initialBalance} onChange={setInitialBalance} id="initialBalance"/>
        <p className="text-xs text-gray-500 mt-1">Este será o saldo base para todos os cálculos.</p>
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors">Cancelar</button>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold shadow">Confirmar</button>
      </div>
    </form>
  );
};

const BankAccounts: React.FC = () => {
  const { accounts, addAccount, updateAccount, deleteAccount, calculateCurrentBalance } = useAppData();
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

  const handleSubmit = (data: Omit<BankAccount, 'id'>) => {
    if (accountToEdit) {
      updateAccount({ ...accountToEdit, ...data });
    } else {
      addAccount(data);
    }
    handleCloseModal();
  };
  
  const handleDelete = (id: string) => {
    if(window.confirm('Tem certeza que deseja remover esta conta? Todos os lançamentos associados também serão removidos.')) {
      deleteAccount(id);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Contas Bancárias</h1>
          <p className="text-gray-500 mt-1">Gerencie as contas que serão a base do sistema.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow w-full sm:w-auto"
        >
          <Plus size={20} />
          Criar Conta Bancária
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-3 text-center py-16 bg-white rounded-2xl shadow-sm">
            <Landmark className="mx-auto h-12 w-12 text-gray-300" />
            <p className="text-gray-500 mt-4">Nenhuma conta bancária cadastrada.</p>
            <p className="text-gray-400 text-sm mt-1">Clique em "Criar Conta Bancária" para adicionar a primeira.</p>
          </div>
        ) : (
          accounts.map(acc => (
            <div key={acc.id} className="bg-white p-6 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-100 p-3 rounded-full">
                       <Landmark className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">{acc.name}</h3>
                      <p className="text-sm text-gray-500">{acc.type}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 text-left">
                  <p className="text-sm text-gray-500">Saldo Atual Calculado</p>
                  <p className="text-3xl font-bold text-gray-800">{formatCurrency(calculateCurrentBalance(acc.id))}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                <button onClick={() => handleOpenModal(acc)} className="p-2 text-gray-400 hover:text-blue-600 rounded-full transition-colors"><Edit size={18} /></button>
                <button onClick={() => handleDelete(acc.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-full transition-colors"><Trash2 size={18} /></button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={accountToEdit ? 'Editar Conta Bancária' : 'Criar Nova Conta'}>
        <BankAccountForm onSubmit={handleSubmit} onClose={handleCloseModal} accountToEdit={accountToEdit} />
      </Modal>
    </div>
  );
};

export default BankAccounts;
