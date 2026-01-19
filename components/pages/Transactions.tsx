
// DO NOT use or import GoogleGenerativeAI from @google/genai.
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { Transaction, TransactionNature, CategoryType, Attachment, NewAttachment } from '../../types';
import Modal from '../ui/Modal';
import PdfOptionsModal from '../ui/PdfOptionsModal';
import ViewAttachmentModal from '../ui/ViewAttachmentModal';
import TransactionImportModal from '../ui/TransactionImportModal';
import TransactionPdfImportModal from '../ui/TransactionPdfImportModal';
import CurrencyInput from '../ui/CurrencyInput';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { generateTransactionsPDF } from '../../utils/pdfGenerator';
import { fileToBase64 } from '../../utils/imageUtils';
import { 
  Plus, Trash2, Download, Filter, Wallet, Paperclip, 
  Upload, ArrowRight, Edit, Camera, X, MessageSquare, 
  Image as ImageIcon, Hash, Sparkles
} from 'lucide-react';

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
    const [numeroNota, setNumeroNota] = useState(transactionToEdit?.numeroNota || '');
    const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'Cartão de Débito' | 'BOLETO' | undefined>(transactionToEdit?.paymentMethod);
    const [newAttachment, setNewAttachment] = useState<NewAttachment | null>(null);
    const [existingAttachments, setExistingAttachments] = useState<Attachment[]>(transactionToEdit?.attachments || []);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDateInputFocused, setIsDateInputFocused] = useState(false);
    
    const fileInputCameraRef = useRef<HTMLInputElement>(null);
    const fileInputGalleryRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (transactionToEdit) {
            setNature(transactionToEdit.nature || TransactionNature.DESPESA);
            setDescription(transactionToEdit.description || '');
            setAccountId(transactionToEdit.accountId || '');
            setCategoryId(transactionToEdit.categoryId || '');
            setDate(transactionToEdit.date ? transactionToEdit.date.split('T')[0] : new Date().toISOString().split('T')[0]);
            setValue(transactionToEdit.value || 0);
            setComments(transactionToEdit.comments || '');
            setNumeroNota(transactionToEdit.numeroNota || '');
            setPaymentMethod(transactionToEdit.paymentMethod);
            setExistingAttachments(transactionToEdit.attachments || []);
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
        
        // Regra específica: Meio de pagamento obrigatório para DESPESA em CONTA CORRENTE
        if (nature === TransactionNature.DESPESA && transactionType === 'checking_account' && !paymentMethod) {
            newErrors.paymentMethod = 'Selecione o meio de pagamento (PIX, Débito ou Boleto).';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
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
            numeroNota,
            paymentMethod: (nature === TransactionNature.DESPESA && transactionType === 'checking_account') ? paymentMethod : undefined,
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

    return (
        <form onSubmit={handleSubmit}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Natureza do Lançamento</label>
                    <div className="grid grid-cols-2 gap-4">
                        <button type="button" onClick={() => { setNature(TransactionNature.RECEITA); setCategoryId(''); setPaymentMethod(undefined); }} className={`p-2 rounded-lg font-semibold transition ${nature === TransactionNature.RECEITA ? 'bg-green-500 text-white ring-2 ring-green-600 ring-offset-2' : 'bg-gray-100 hover:bg-green-100'}`}>Receita</button>
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

                {/* Meio de Pagamento - Apenas para DESPESA em CONTA CORRENTE */}
                {nature === TransactionNature.DESPESA && transactionType === 'checking_account' && (
                    <div>
                        <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-600">Meio de Pagamento</label>
                        <select 
                            id="paymentMethod" 
                            value={paymentMethod || ''} 
                            onChange={(e) => setPaymentMethod(e.target.value as 'PIX' | 'Cartão de Débito' | 'BOLETO')} 
                            className={`mt-1 w-full px-3 py-2 border ${errors.paymentMethod ? 'border-red-500' : 'border-gray-300'} bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        >
                            <option value="">Selecione...</option>
                            <option value="PIX">PIX</option>
                            <option value="Cartão de Débito">Cartão de Débito</option>
                            <option value="BOLETO">BOLETO</option>
                        </select>
                        {errors.paymentMethod && <p className="text-sm text-red-500 mt-1">{errors.paymentMethod}</p>}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <label htmlFor="numeroNota" className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
                            <Hash size={14} /> Número da Nota
                        </label>
                        <input
                            type="text"
                            id="numeroNota"
                            value={numeroNota}
                            onChange={(e) => setNumeroNota(e.target.value)}
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nº da Nota Fiscal"
                        />
                    </div>
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
                        <Camera size={16} /> Comprovante (Imagem)
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
                                    </div>
                                )}
                                {!newAttachment && (
                                    <div className="flex gap-2">
                                        <button 
                                            type="button" 
                                            onClick={() => fileInputCameraRef.current?.click()}
                                            className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
                                        >
                                            <Camera size={20} />
                                            <span className="text-[10px]">Câmera</span>
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => fileInputGalleryRef.current?.click()}
                                            className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
                                        >
                                            <ImageIcon size={20} />
                                            <span className="text-[10px]">Galeria</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => fileInputCameraRef.current?.click()}
                                    className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                                >
                                    <Camera className="group-hover:text-blue-600 transition-colors" />
                                    <span className="text-sm font-medium group-hover:text-blue-600 transition-colors text-center">Tirar Foto</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => fileInputGalleryRef.current?.click()}
                                    className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                                >
                                    <ImageIcon className="group-hover:text-blue-600 transition-colors" />
                                    <span className="text-sm font-medium group-hover:text-blue-600 transition-colors text-center">Galeria de Fotos</span>
                                </button>
                            </div>
                        )}
                        <input 
                            type="file" 
                            ref={fileInputCameraRef} 
                            onChange={handleFileChange} 
                            accept="image/*" 
                            capture="environment" 
                            className="hidden" 
                        />
                        <input 
                            type="file" 
                            ref={fileInputGalleryRef} 
                            onChange={handleFileChange} 
                            accept="image/*" 
                            className="hidden" 
                        />
                    </div>
                </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-100">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold shadow disabled:bg-blue-300">
                    {isSubmitting ? 'Salvando...' : 'Confirmar'}
                </button>
            </div>
        </form>
    );
};

// FIX: Added the Transactions component and the default export.
const Transactions: React.FC<{
  transactionType: 'checking_account' | 'credit_card';
  title: string;
}> = ({ transactionType, title }) => {
    const { transactions, accounts, deleteTransaction, addTransaction, updateTransaction } = useAppData();
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isPdfImportModalOpen, setIsPdfImportModalOpen] = useState(false);
    const [isPdfOptionsModalOpen, setIsPdfOptionsModalOpen] = useState(false);
    const [viewingAttachment, setViewingAttachment] = useState<Attachment | null>(null);
    const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
    const [selectedAccountFilter, setSelectedAccountFilter] = useState('');

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
    };

    const handleCloseForm = () => {
        setIsFormModalOpen(false);
        setTransactionToEdit(null);
    };

    const handleFormSubmit = async (data: Omit<Transaction, 'id'>, newAttachments: NewAttachment[]) => {
        if (transactionToEdit) {
            await updateTransaction({ ...transactionToEdit, ...data }, newAttachments);
        } else {
            await addTransaction(data, newAttachments);
        }
        handleCloseForm();
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Deseja realmente excluir este lançamento?')) {
            await deleteTransaction(id).catch(err => {
                alert(`Erro ao excluir lançamento: ${err.message || err}`);
            });
        }
    };

    const handleGeneratePdf = (options: { accountId: string; startDate: string; endDate: string }) => {
        const account = accounts.find(a => a.id === options.accountId);
        if (!account) return;

        const start = new Date(options.startDate);
        const end = new Date(options.endDate);
        start.setUTCHours(0,0,0,0);
        end.setUTCHours(23,59,59,999);

        const transactionsInPeriod = transactions.filter(t => {
            const tDate = new Date(t.date);
            return t.accountId === options.accountId && t.type === transactionType && tDate >= start && tDate <= end;
        });

        generateTransactionsPDF({
            account,
            period: { start: options.startDate, end: options.endDate },
            transactionsInPeriod,
            allTransactions: transactions,
            transactionType,
            title
        });
        setIsPdfOptionsModalOpen(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
                    <p className="text-gray-500 mt-1">Gerencie seus lançamentos de {title.toLowerCase()}.</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <button onClick={() => setIsPdfOptionsModalOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold shadow-sm text-sm">
                        <Download size={18} />
                        Gerar PDF
                    </button>
                    {transactionType === 'credit_card' && (
                        <>
                            <button onClick={() => setIsPdfImportModalOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors font-semibold shadow-sm text-sm">
                                <Sparkles size={18} />
                                Importar PDF (IA)
                            </button>
                            <button onClick={() => setIsImportModalOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold shadow-sm text-sm">
                                <Upload size={18} />
                                Importar XLS
                            </button>
                        </>
                    )}
                    <button onClick={() => handleOpenForm()} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow text-sm">
                        <Plus size={20} />
                        Novo Lançamento
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <Filter size={18} className="text-gray-400" />
                    <select 
                        value={selectedAccountFilter} 
                        onChange={(e) => setSelectedAccountFilter(e.target.value)}
                        className="p-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="">Todas as Contas</option>
                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b-2 border-gray-100">
                            <tr>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Descrição</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Conta</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Valor</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-400">Nenhum lançamento encontrado.</td>
                                </tr>
                            ) : (
                                filteredTransactions.map(t => (
                                    <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4 text-sm text-gray-600">{formatDate(t.date)}</td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-800">{t.description || '-'}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {t.attachments && t.attachments.length > 0 && (
                                                        <button onClick={() => setViewingAttachment(t.attachments![0])} className="text-blue-500 hover:text-blue-700">
                                                            <Paperclip size={14} />
                                                        </button>
                                                    )}
                                                    {t.comments && (
                                                        <span title={t.comments} className="text-gray-400 cursor-help">
                                                            <MessageSquare size={14} />
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500">
                                            {accounts.find(a => a.id === t.accountId)?.name || 'N/A'}
                                        </td>
                                        <td className={`p-4 text-right font-bold ${t.nature === TransactionNature.RECEITA ? 'text-green-600' : 'text-red-600'}`}>
                                            {t.nature === TransactionNature.RECEITA ? '+' : '-'} {formatCurrency(t.value)}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleOpenForm(t)} className="p-2 text-gray-400 hover:text-blue-600 rounded-full transition-colors"><Edit size={18} /></button>
                                                <button onClick={() => handleDelete(t.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-full transition-colors"><Trash2 size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isFormModalOpen} onClose={handleCloseForm} title={transactionToEdit ? 'Editar Lançamento' : 'Novo Lançamento'}>
                <TransactionForm 
                    onSubmit={handleFormSubmit} 
                    onClose={handleCloseForm} 
                    transactionToEdit={transactionToEdit}
                    transactionType={transactionType}
                />
            </Modal>

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

            <PdfOptionsModal 
                isOpen={isPdfOptionsModalOpen} 
                onClose={() => setIsPdfOptionsModalOpen(false)} 
                onSubmit={handleGeneratePdf} 
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
