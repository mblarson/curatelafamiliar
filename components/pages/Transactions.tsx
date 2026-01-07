
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { Transaction, TransactionNature, CategoryType, Attachment, NewAttachment } from '../../types';
import Modal from '../ui/Modal';
import PdfOptionsModal from '../ui/PdfOptionsModal';
import ReceiptScannerModal from '../ai/ReceiptScannerModal';
import TransactionImportModal from '../ui/TransactionImportModal';
import TransactionPdfImportModal from '../ui/TransactionPdfImportModal';
import ViewAttachmentModal from '../ui/ViewAttachmentModal';
import CurrencyInput from '../ui/CurrencyInput';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { generateTransactionsPDF } from '../../utils/pdfGenerator';
import { fileToBase64 } from '../../utils/imageUtils';
import { 
  Plus, Trash2, Download, Filter, Wallet, ScanLine, Paperclip, 
  Upload, ArrowRight, Edit, FileText, Camera, X, MessageSquare, 
  Check, Save, Loader2, Eye, Image as ImageIcon 
} from 'lucide-react';

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
    const [comments, setComments] = useState(transactionToEdit?.comments || '');
    const [newAttachment, setNewAttachment] = useState<NewAttachment | null>(null);
    const [existingAttachments, setExistingAttachments] = useState<Attachment[]>(transactionToEdit?.attachments || []);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState(1);
    const [isDateInputFocused, setIsDateInputFocused] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isScannedFlow = useMemo(() => {
      return !!(transactionToEdit?.attachments?.[0] as unknown as NewAttachment)?.data;
    }, [transactionToEdit]);

    useEffect(() => {
        setStep(1);
        if (transactionToEdit) {
            setNature(transactionToEdit.nature || TransactionNature.DESPESA);
            setDescription(transactionToEdit.description || '');
            setAccountId(transactionToEdit.accountId || '');
            setCategoryId(transactionToEdit.categoryId || '');
            setDate(transactionToEdit.date ? transactionToEdit.date.split('T')[0] : new Date().toISOString().split('T')[0]);
            setValue(transactionToEdit.value || 0);
            setComments(transactionToEdit.comments || '');
            setExistingAttachments(transactionToEdit.attachments || []);
            
            const potentialNewAttachment = transactionToEdit.attachments?.[0] as unknown as NewAttachment | undefined;
            setNewAttachment(potentialNewAttachment?.data ? potentialNewAttachment : null);
        } else {
            setNature(TransactionNature.DESPESA);
            setDescription('');
            setAccountId('');
            setCategoryId('');
            setDate(new Date().toISOString().split('T')[0]);
            setValue(0);
            setComments('');
            setNewAttachment(null);
            setExistingAttachments([]);
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
        if (validate()) setStep(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setIsSubmitting(true);
        const transactionData = { 
            description, 
            nature, 
            accountId, 
            categoryId, 
            date, 
            value, 
            type: transactionType,
            comments,
            attachments: existingAttachments
        };
        await onSubmit(transactionData, newAttachment ? [newAttachment] : []);
        setIsSubmitting(false);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const { data } = await fileToBase64(file);
            setNewAttachment({
                id: crypto.randomUUID(),
                name: file.name,
                type: 'image_base64_jpeg',
                data: data
            });
        } catch (err) {
            console.error("Erro ao processar imagem:", err);
            alert("Não foi possível carregar a imagem.");
        }
    };

    const formFields = (
      <div className="space-y-4">
        <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Natureza do Lançamento</label>
            <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => { setNature(TransactionNature.RECEITA); setCategoryId(''); }} className={`p-2 rounded-lg font-semibold transition ${nature === TransactionNature.RECEITA ? 'bg-green-500 text-white ring-2 ring-green-600 ring-offset-2' : 'bg-gray-100 hover:bg-green-100'}`}>Receita</button>
                <button type="button" onClick={() => { setNature(TransactionNature.DESPESA); setCategoryId(''); }} className={`p-2 rounded-lg font-semibold transition ${nature === TransactionNature.DESPESA ? 'bg-red-500 text-white ring-2 ring-red-600 ring-offset-2' : 'bg-gray-100 hover:bg-red-100'}`}>Despesa</button>
            </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-600">Descrição</label>
                <input
                    type="text"
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Uber, Supermercado..."
                />
            </div>
            <div>
                <label htmlFor="value" className="block text-sm font-medium text-gray-600">Valor</label>
                <CurrencyInput id="value" value={value} onChange={setValue} />
                {errors.value && <p className="text-sm text-red-500 mt-1">{errors.value}</p>}
            </div>
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

        <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-600">Data</label>
            <input
                type={isDateInputFocused ? 'date' : 'text'}
                id="date"
                value={isDateInputFocused ? date : (date ? formatDate(date) : '')}
                onFocus={() => setIsDateInputFocused(true)}
                onBlur={() => setIsDateInputFocused(false)}
                onChange={(e) => setDate(e.target.value)}
                className={`mt-1 w-full px-3 py-2 border ${errors.date ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
        </div>

        <div>
            <label htmlFor="comments" className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
                <MessageSquare size={16} /> Comentários / Observações
            </label>
            <textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Algo importante a lembrar sobre este lançamento?"
            />
        </div>

        <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
                <Camera size={16} /> Comprovante
            </label>
            
            <div className="space-y-3">
                {(newAttachment || existingAttachments.length > 0) ? (
                    <div className="flex flex-wrap gap-2">
                        {existingAttachments.map(att => (
                            <div key={att.id} className="relative w-20 h-20 border rounded-lg overflow-hidden bg-gray-50 group">
                                <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                                <button 
                                    type="button" 
                                    onClick={() => setExistingAttachments(prev => prev.filter(a => a.id !== att.id))}
                                    className="absolute top-0 right-0 p-1 bg-red-600 text-white rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                        {newAttachment && (
                             <div className="relative w-20 h-20 border rounded-lg overflow-hidden bg-blue-50 ring-2 ring-blue-500 group">
                                <img src={`data:image/jpeg;base64,${newAttachment.data}`} alt="Novo" className="w-full h-full object-cover" />
                                <button 
                                    type="button" 
                                    onClick={() => setNewAttachment(null)}
                                    className="absolute top-0 right-0 p-1 bg-red-600 text-white rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={14} />
                                </button>
                                <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-blue-700 bg-white/90 px-1 rounded">NOVO</span>
                                </div>
                            </div>
                        )}
                        {!newAttachment && (
                            <button 
                                type="button" 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
                            >
                                <Plus size={20} />
                                <span className="text-[10px]">Add</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                    >
                        <Camera className="group-hover:text-blue-600 transition-colors" />
                        <span className="font-medium group-hover:text-blue-600 transition-colors">Anexar ou Tirar Foto</span>
                    </button>
                )}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    capture="environment" 
                    className="hidden" 
                />
            </div>
        </div>
      </div>
    );

    return (
        <form onSubmit={handleSubmit}>
            {isScannedFlow ? (
                <div className="space-y-4">
                    {step === 1 && formFields}
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
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isPdfImportModalOpen, setIsPdfImportModalOpen] = useState(false);
    const [transactionToEdit, setTransactionToEdit] = useState<Partial<Transaction> | null>(null);
    const [viewingAttachment, setViewingAttachment] = useState<Attachment | null>(null);

    // Estados para edição rápida no modal de ação
    const [showCommentInput, setShowCommentInput] = useState(false);
    const [quickComments, setQuickComments] = useState('');
    const [quickAttachment, setQuickAttachment] = useState<NewAttachment | null>(null);
    const [isSavingQuick, setIsSavingQuick] = useState(false);
    const quickFileInputRef = useRef<HTMLInputElement>(null);

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
    
    const handleRowClick = (transaction: Transaction) => {
        setTransactionToEdit(transaction);
        setQuickComments(transaction.comments || '');
        setQuickAttachment(null);
        setShowCommentInput(!!transaction.comments); // Mostra se já existir
        setIsActionModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setTransactionToEdit(null);
    };

    const handleCloseActionModal = () => {
        setIsActionModalOpen(false);
        setTransactionToEdit(null);
        setQuickComments('');
        setQuickAttachment(null);
        setShowCommentInput(false);
    };

    const handleSubmit = async (data: Omit<Transaction, 'id'>, newAttachments: NewAttachment[]) => {
        if (transactionToEdit && 'id' in transactionToEdit) {
            await updateTransaction({ ...transactionToEdit, ...data } as Transaction, newAttachments);
        } else {
            await addTransaction(data, newAttachments);
        }
        handleCloseModal();
    };

    const handleQuickSave = async () => {
      if (!transactionToEdit || !('id' in transactionToEdit)) return;
      setIsSavingQuick(true);
      try {
        const updated = { 
          ...transactionToEdit, 
          comments: quickComments 
        } as Transaction;
        
        await updateTransaction(updated, quickAttachment ? [quickAttachment] : []);
        handleCloseActionModal();
      } catch (err) {
        console.error("Falha ao salvar rapidamente:", err);
      } finally {
        setIsSavingQuick(false);
      }
    };

    const handleQuickFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
          const { data } = await fileToBase64(file);
          setQuickAttachment({
              id: crypto.randomUUID(),
              name: file.name,
              type: 'image_base64_jpeg',
              data: data
          });
      } catch (err) {
          console.error("Erro ao processar imagem:", err);
      }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteTransaction(id);
        } catch (error) {
            console.error("Falha ao excluir a transação:", error);
            alert("Não foi possível excluir a transação.");
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
        attachments: [newAttachment] as any,
      });
      setIsScannerOpen(false);
      setIsModalOpen(true);
    };

    const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'N/A';
    const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || 'N/A';

    return (
         <div className="space-y-8">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
                    <p className="text-gray-500 mt-1">Registre e gerencie suas movimentações financeiras.</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                    {transactionType === 'credit_card' && (
                        <button onClick={() => setIsImportModalOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold shadow-sm">
                            <Upload size={18} />
                            <span className="hidden sm:inline">Importar XLS</span>
                        </button>
                    )}
                    <button onClick={() => setIsPdfImportModalOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold shadow-sm">
                        <FileText size={18} />
                        <span className="hidden sm:inline">Importar PDF</span>
                    </button>
                    <button onClick={() => setIsPdfModalOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold shadow-sm">
                        <Download size={18} />
                        <span className="hidden sm:inline">Gerar PDF</span>
                    </button>
                    <button onClick={() => setIsScannerOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold shadow">
                        <ScanLine size={20} />
                        <span className="hidden sm:inline">Digitalizar</span>
                    </button>
                    <button onClick={() => handleOpenModal()} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow">
                        <Plus size={20} />
                        <span className="hidden sm:inline">Lançamento</span>
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
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map(t => (
                                    <tr key={t.id} onClick={() => handleRowClick(t)} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors cursor-pointer">
                                        <td className="p-4">
                                            <div className="font-medium text-gray-800 flex items-center gap-2">
                                              {(t.attachments && t.attachments.length > 0) && 
                                                <button onClick={(e) => { e.stopPropagation(); setViewingAttachment(t.attachments![0]); }} title="Ver anexo">
                                                  <Paperclip className="w-4 h-4 text-blue-500 hover:text-blue-700" />
                                                </button>
                                              }
                                              <span className="truncate max-w-[150px] sm:max-w-[300px]">{t.description || getCategoryName(t.categoryId)}</span>
                                              {t.comments && <MessageSquare className="w-3 h-3 text-gray-300" title="Possui comentários" />}
                                            </div>
                                            <div className="text-xs text-gray-500 ml-6">{formatDate(t.date)} - {getCategoryName(t.categoryId)}</div>
                                        </td>
                                        <td className="p-4 text-gray-600 hidden md:table-cell">{getAccountName(t.accountId)}</td>
                                        <td className={`p-4 font-semibold text-right ${t.nature === 'RECEITA' ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(t.value)}</td>
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
            
            {isActionModalOpen && transactionToEdit && (
              <Modal
                isOpen={isActionModalOpen}
                onClose={handleCloseActionModal}
                title="O que deseja fazer?"
              >
                <div className="space-y-4">
                  <div className="text-center space-y-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Lançamento selecionado</p>
                    <p className="text-lg font-bold text-gray-800 leading-tight">
                        {transactionToEdit.description}
                    </p>
                    <p className="text-xl font-black text-gray-700">{formatCurrency(transactionToEdit.value || 0)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Botão de Comentários */}
                    <button
                      onClick={() => setShowCommentInput(!showCommentInput)}
                      className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border transition-all ${showCommentInput ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}
                    >
                      <MessageSquare size={20} />
                      <span className="text-xs font-bold">Comentários</span>
                    </button>

                    {/* Botão de Comprovante */}
                    <button
                      onClick={() => quickFileInputRef.current?.click()}
                      className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border transition-all ${quickAttachment || (transactionToEdit.attachments?.length || 0) > 0 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'}`}
                    >
                      <Camera size={20} />
                      <span className="text-xs font-bold">Comprovante</span>
                    </button>
                    <input type="file" ref={quickFileInputRef} onChange={handleQuickFileChange} accept="image/*" capture="environment" className="hidden" />
                  </div>

                  {/* Seção Expansível de Comentários */}
                  {showCommentInput && (
                    <div className="animate-scale-in">
                       <textarea
                        value={quickComments}
                        onChange={(e) => setQuickComments(e.target.value)}
                        placeholder="Digite sua observação aqui..."
                        className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-inner"
                        rows={3}
                        autoFocus
                      />
                    </div>
                  )}

                  {/* Visualização de Comprovantes */}
                  {(quickAttachment || (transactionToEdit.attachments?.length || 0) > 0) && (
                    <div className="flex gap-2 overflow-x-auto pb-1 animate-scale-in">
                       {transactionToEdit.attachments?.map(att => (
                          <div key={att.id} className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border shadow-sm group">
                             <img src={att.url} className="w-full h-full object-cover" />
                             <button onClick={() => setViewingAttachment(att)} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Eye size={16} className="text-white" />
                             </button>
                          </div>
                        ))}
                        {quickAttachment && (
                          <div className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 border-green-500 bg-green-50 shadow-sm">
                             <img src={`data:image/jpeg;base64,${quickAttachment.data}`} className="w-full h-full object-cover" />
                             <button onClick={() => setQuickAttachment(null)} className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full shadow">
                               <X size={10} />
                             </button>
                             <div className="absolute bottom-0 inset-x-0 bg-green-600 text-[8px] text-white text-center font-bold py-0.5">NOVO</div>
                          </div>
                        )}
                    </div>
                  )}

                  {/* Botão de Ação Primária (Salvar alterações rápidas) */}
                  {(showCommentInput || quickAttachment) && (
                    <button
                        onClick={handleQuickSave}
                        disabled={isSavingQuick}
                        className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold shadow-lg transition-all disabled:bg-gray-300"
                    >
                        {isSavingQuick ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        Salvar Alterações
                    </button>
                  )}

                  <hr className="border-gray-100" />

                  {/* Ações de Edição Completa e Exclusão */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        handleCloseActionModal();
                        handleOpenModal(transactionToEdit as Transaction);
                      }}
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 font-bold transition-colors"
                    >
                      <Edit size={18} />
                      Editar Completo
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm("Deseja realmente excluir este lançamento?")) {
                            handleCloseActionModal();
                            if (transactionToEdit.id) handleDelete(transactionToEdit.id);
                        }
                      }}
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 font-bold transition-colors"
                    >
                      <Trash2 size={18} />
                      Excluir Lançamento
                    </button>
                  </div>
                </div>
              </Modal>
            )}

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
            
            <TransactionPdfImportModal
                isOpen={isPdfImportModalOpen}
                onClose={() => setIsPdfImportModalOpen(false)}
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
