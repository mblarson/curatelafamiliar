import React, { useState } from 'react';
import { useAppData } from '../../hooks/useAppData';
import Modal from './Modal';
import { Calendar, Banknote, AlertCircle } from 'lucide-react';

interface PdfOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (options: { accountId: string; startDate: string; endDate: string }) => void;
}

const PdfOptionsModal: React.FC<PdfOptionsModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const { accounts } = useAppData();
  const [accountId, setAccountId] = useState('');
  
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const todayISO = today.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(todayISO);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!accountId) {
      setError('Por favor, selecione uma conta.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Por favor, preencha as datas de início e fim.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
        setError('A data de início não pode ser posterior à data de fim.');
        return;
    }
    setError('');
    onSubmit({ accountId, startDate, endDate });
  };
  
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Opções do Relatório PDF">
      <div className="space-y-4">
        {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4" role="alert">
                <div className="flex">
                    <div className="py-1"><AlertCircle className="h-5 w-5 text-red-500" /></div>
                    <div className="ml-3">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                </div>
            </div>
        )}

        <div>
            <label htmlFor="pdf-account" className="block text-sm font-medium text-gray-700">Conta Bancária</label>
            <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Banknote className="h-5 w-5 text-gray-400" />
                </div>
                <select 
                    id="pdf-account"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border bg-white"
                >
                    <option value="">Selecione uma conta...</option>
                    {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                </select>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Data de Início</label>
                <div className="relative mt-1">
                     <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full pl-10 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
            </div>
            <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">Data de Fim</label>
                 <div className="relative mt-1">
                     <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input type="date" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full pl-10 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
            </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors">Cancelar</button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold shadow">Gerar PDF</button>
        </div>
      </div>
    </Modal>
  );
};

export default PdfOptionsModal;