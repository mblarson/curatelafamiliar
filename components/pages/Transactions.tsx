import React, { useState, useMemo, useEffect } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { Transaction, TransactionNature, CategoryType, Attachment, NewAttachment } from '../../types';
import Modal from '../ui/Modal';
import PdfOptionsModal from '../ui/PdfOptionsModal';
import ReceiptScannerModal from '../ai/ReceiptScannerModal';
import TransactionImportModal from '../ui/TransactionImportModal';
import ViewAttachmentModal from '../ui/ViewAttachmentModal';
import CurrencyInput from '../ui/CurrencyInput';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { generateTransactionsPDF } from '../../utils/pdfGenerator';
import { Plus, Edit, Trash2, Download, Filter, Wallet, ScanLine, Paperclip, XCircle, Upload, ArrowRight, Info } from 'lucide-react';

interface ScannedData {
  value: number;
  date: string;
  description: string;
  scannedImage: string;
}

const TransactionForm: React.FC<{
  onSubmit: (transaction: Omit<Transaction, 'id'>, newAttachments: NewAttachment[]) => Promise<void>;
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
    const [newAttachment, setNewAttachment] = useState<NewAttachment | null>(null);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState(1);

    const isScannedFlow = useMemo(() => {
      // FIX: Cast to 'unknown' first to resolve unsafe type conversion error.
      return !!(transactionToEdit?.attachments?.[0] as unknown as NewAttachment)?.data;
    }, [transactionToEdit]);

    useEffect(() => {
        setStep(1); // Reset step on modal open/change
        if (transactionToEdit) {
            setNature(transactionToEdit.nature || TransactionNature.DESPESA);
            setDescription(transactionToEdit.description || '');
            setAccountId(transactionToEdit.accountId || '');
            setCategoryId(transactionToEdit.categoryId || '');
            setDate(transactionToEdit.date ? transactionToEdit.date.split('T')[0] : new Date().toISOString().split('T')[0]);
            setValue(transactionToEdit.value || 0);
            
            // FIX: Cast to 'unknown' first to resolve unsafe type conversion error.
            const potentialNewAttachment = transactionToEdit.attachments?.[0] as unknown as NewAttachment | undefined;
            setNewAttachment(potentialNewAttachment?.data ? potentialNewAttachment : null);

        } else { // Reset for new manual transaction
            setNature(TransactionNature.DESPESA);
            setDescription('');
            setAccountId('');
            setCategoryId('');
            setDate(new Date().toISOString().split('T')[0]);
            setValue(0);
            setNewAttachment(null);
        }
    }, [transactionToEdit]);

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

    const handleNext = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (validate()) {
            setStep(2);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setIsSubmitting(true);
        const transactionData = { description, nature, accountId, categoryId, date, value, type: transactionType };
        await onSubmit(transactionData, newAttachment ? [newAttachment] : []);
        setIsSubmitting(false);
    };

    const formFields = (
      <div className="space-y-3">
        <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Natureza do Lançamento</label>
            <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => { setNature(TransactionNature.RECEITA); setCategoryId(''); }} className={`p-2 rounded-lg font-semibold transition ${nature === TransactionNature.RECEITA ? 'bg-green-500 text-white ring-2 ring-green-600 ring-offset-2' : 'bg-gray-100 hover:bg-green-100'}`}>Receita</button>
                <button type="button" onClick={() => { setNature(TransactionNature.DESPESA); setCategoryId(''); }} className={`p-2 rounded-lg font-semibold transition ${nature === TransactionNature.DESPESA ? 'bg-red-500 text-white ring-2 ring-red-600 ring-offset-2' : 'bg-gray-100 hover:bg-red-100'}`}>Despesa</button>
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
      </div>
    );

    return (
        <form onSubmit={handleSubmit}>
            {isScannedFlow ? (
                // Multi-step flow for scanned receipts
                <div className="space-y-4">
                    {step === 1 && (
                        <>
                            <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg">
                                <div className="flex">
                                    <div className="flex-shrink-0"><Info className="h-5 w-5 text-blue-500 mt-0.5" /></div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-blue-800">Recibo Digitalizado</p>
                                        <p className="text-sm text-blue-700">Confira os dados extraídos pela IA e ajuste se necessário.</p>
                                    </div>
                                </div>
                            </div>
                            {formFields}
                        </>
                    )}
                    {step === 2 && (
                         <div className="space-y-4">
                            <p className="text-center text-gray-600">Por favor, confirme o anexo para salvar.</p>
                            {newAttachment && (
                                <div className="relative group">
                                    <p className="text-sm font-medium text-gray-600 mb-1">Recibo Digitalizado</p>
                                    <img
                                        src={`data:image/jpeg;base64,${newAttachment.data}`}
                                        alt="Recibo digitalizado"
                                        className="rounded-lg border p-1 max-h-60 w-auto mx-auto"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                // Single-step for manual entry/edit
                formFields
            )}
            
            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-100">
                {isScannedFlow && step === 2 && (
                    <button type="button" onClick={() => setStep(1)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors">Voltar</button>
                )}
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors">Cancelar</button>
                {isScannedFlow && step === 1 ? (
                    <button type="button" onClick={handleNext} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold shadow">
                        Próximo <ArrowRight size={16} />
                    </button>
                ) : (
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold shadow disabled:bg-blue-300">
                        {isSubmitting ? 'Salvando...' : 'Confirmar'}
                    </button>
                )}
            </div>
        </form>
    );
};


const Transactions: React.FC<{ transactionType: 'checking_account' | 'credit_card', title: string }> = ({ transactionType, title }) => {
    const { transactions, categories, accounts, addTransaction, updateTransaction, deleteTransaction, getAccountById } = useAppData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [transactionToEdit, setTransactionToEdit] = useState<Partial<Transaction> | null>(null);
    const [viewingAttachment, setViewingAttachment] = useState<Attachment | null>(null);

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

    const handleSubmit = async (data: Omit<Transaction, 'id'>, newAttachments: NewAttachment[]) => {
        if (transactionToEdit && 'id' in transactionToEdit) {
            await updateTransaction({ ...transactionToEdit, ...data } as Transaction, newAttachments);
        } else {
            await addTransaction(data, newAttachments);
        }
        handleCloseModal();
    };

    const handleDelete = async (id: string) => {
        if(window.confirm('Tem certeza que deseja remover este lançamento? O anexo também será removido permanentemente.')) {
            await deleteTransaction(id);
        }
    };
    
    const handleGeneratePdf = ({ accountId, startDate, endDate }: { accountId: string, startDate: string, endDate: string }) => {
        const account = getAccountById(accountId);
        if (!account) return;

        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setUTCHours(0,0,0,0);
        end.setUTCHours(23,59,59,999);

        const transactionsInPeriod = transactions.filter(t => {
            const tDate = new Date(t.date);
            return t.accountId === accountId && tDate >= start && tDate <= end && t.type === transactionType;
        });

        generateTransactionsPDF({
            account,
            period: { start: startDate, end: endDate },
            transactionsInPeriod,
            allTransactions: transactions,
            transactionType,
            title
        });
        setIsPdfModalOpen(false);
    };

    const handleScanComplete = (data: ScannedData) => {
      const newAttachment: NewAttachment = {
        id: crypto.randomUUID(),
        name: `Recibo_${data.date}.jpg`,
        type: 'image_base64_jpeg',
        data: data.scannedImage,
      };

      const despesaCategory = categories.find(c => c.type === CategoryType.DESPESA);
      
      setTransactionToEdit({
        description: data.description,
        value: data.value,
        date: data.date,
        nature: TransactionNature.DESPESA,
        categoryId: despesaCategory?.id || '',
        attachments: [newAttachment] as any, // Transient state
      });
      setIsScannerOpen(false);
      setIsModalOpen(true);
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
                    {transactionType === 'credit_card' && (
                        <button onClick={() => setIsImportModalOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold shadow-sm">
                            <Upload size={18} />
                            Importar XLS
                        </button>
                    )}
                    <button onClick={() => setIsPdfModalOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold shadow-sm">
                        <Download size={18} />
                        Gerar PDF
                    </button>
                    <button onClick={() => setIsScannerOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold shadow">
                        <ScanLine size={20} />
                        Digitalizar com IA
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
                                    <th className="p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Descrição</th>
                                    <th className="p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Conta</th>
                                    <th className="p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider text-right">Valor</th>
                                    <th className="p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map(t => (
                                    <tr key={t.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-medium text-gray-800 flex items-center gap-2">
                                              {t.attachments && t.attachments.length > 0 && 
                                                <button onClick={() => setViewingAttachment(t.attachments![0])} title="Ver anexo">
                                                  <Paperclip className="w-4 h-4 text-blue-500 hover:text-blue-700" />
                                                </button>
                                              }
                                              <span>{t.description || getCategoryName(t.categoryId)}</span>
                                            </div>
                                            <div className="text-xs text-gray-500 ml-6">{formatDate(t.date)} - {getCategoryName(t.categoryId)}</div>
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
            
            <PdfOptionsModal
                isOpen={isPdfModalOpen}
                onClose={() => setIsPdfModalOpen(false)}
                onSubmit={handleGeneratePdf}
            />
            
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={transactionToEdit && 'id' in transactionToEdit ? 'Editar Lançamento' : 'Novo Lançamento'}>
                <TransactionForm onSubmit={handleSubmit} onClose={handleCloseModal} transactionToEdit={transactionToEdit} transactionType={transactionType} />
            </Modal>

            <ReceiptScannerModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScanComplete={handleScanComplete}
            />
            
            <TransactionImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                transactionType={transactionType}
            />

            {viewingAttachment && (
              <ViewAttachmentModal
                  isOpen={!!viewingAttachment}
                  onClose={() => setViewingAttachment(null)}
                  attachment={viewingAttachment}
              />
            )}
        </div>
    );
};

export default Transactions;