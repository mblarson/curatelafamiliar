import React, { useState, useMemo } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { generateCommentsPDF } from '../../utils/pdfGenerator';
import { MessageSquare, Download, Calendar, Banknote, ChevronDown, ChevronUp, AlertCircle, X } from 'lucide-react';
import { formatDate, formatCurrency } from '../../utils/formatters';
import Modal from '../ui/Modal';

const CommentsReport: React.FC = () => {
    const { transactions, accounts, getAccountById } = useAppData();
    
    // Estado para controle de expansão no Mobile
    const [expandedId, setExpandedId] = useState<string | null>(null);
    
    // Estados para o Modal de Filtros do PDF
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [pdfAccountId, setPdfAccountId] = useState('');
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [pdfError, setPdfError] = useState('');

    // Busca imediata de TODAS as transações de Conta Corrente com comentários
    const commentsTransactions = useMemo(() => {
        return transactions
            .filter(t => t.type === 'checking_account' && t.comments && t.comments.trim() !== '')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions]);

    const handleOpenPdfModal = () => {
        setPdfError('');
        setIsPdfModalOpen(true);
    };

    const handleGeneratePdf = () => {
        if (!pdfAccountId) {
            setPdfError('Selecione uma conta bancária.');
            return;
        }
        
        const account = getAccountById(pdfAccountId);
        if (!account) return;

        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setUTCHours(0, 0, 0, 0);
        end.setUTCHours(23, 59, 59, 999);

        // Filtra transações para o PDF baseado no contexto do auditor
        const pdfFiltered = transactions.filter(t => {
            const tDate = new Date(t.date);
            return t.accountId === pdfAccountId && 
                   t.type === 'checking_account' && 
                   tDate >= start && 
                   tDate <= end && 
                   t.comments && t.comments.trim() !== '';
        });

        if (pdfFiltered.length === 0) {
            setPdfError('Nenhum comentário encontrado para esta conta no período informado.');
            return;
        }

        generateCommentsPDF({
            account,
            period: { start: startDate, end: endDate },
            transactions: pdfFiltered
        });
        
        setIsPdfModalOpen(false);
    };

    return (
        <>
            <div className="space-y-8 animate-scale-in">
                {/* Header da Página */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Comentários</h1>
                        <p className="text-gray-500 mt-1">Todas as observações registradas nas movimentações de conta corrente.</p>
                    </div>
                    <button 
                        onClick={handleOpenPdfModal}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <Download size={20} />
                        Gerar PDF
                    </button>
                </div>

                {/* Lista de Comentários (Exibição Imediata) */}
                {commentsTransactions.length === 0 ? (
                    <div className="bg-white p-12 rounded-2xl shadow-sm text-center border border-dashed border-gray-200">
                        <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500 font-medium">Nenhum comentário registrado no sistema.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {commentsTransactions.map((t) => (
                            <div key={t.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 transition-all hover:shadow-md">
                                {/* Layout DESKTOP: Tabela estruturada */}
                                <div className="hidden md:block">
                                    <div className="grid grid-cols-12 bg-gray-600 text-white p-3 font-bold text-xs uppercase tracking-wider">
                                        <div className="col-span-6 flex items-center gap-2"><Banknote size={14} /> Nome da Transação</div>
                                        <div className="col-span-3 flex items-center gap-2 justify-center"><Calendar size={14} /> Data</div>
                                        <div className="col-span-3 flex items-center gap-2 justify-end">Valor</div>
                                    </div>
                                    <div className="grid grid-cols-12 p-4 border-b border-gray-50 text-gray-800 font-semibold">
                                        <div className="col-span-6 truncate">{t.description || 'Sem descrição'}</div>
                                        <div className="col-span-3 text-center">{formatDate(t.date)}</div>
                                        <div className="col-span-3 text-right text-blue-600">{formatCurrency(t.value)}</div>
                                    </div>
                                    <div className="p-4 bg-gray-50/50">
                                        <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">Comentário / Observação:</span>
                                        <p className="text-gray-600 italic text-sm leading-relaxed">{t.comments}</p>
                                    </div>
                                </div>

                                {/* Layout MOBILE: Resumo com expansão */}
                                <div className="md:hidden">
                                    <div 
                                        className={`p-4 cursor-pointer transition-colors ${expandedId === t.id ? 'bg-blue-50' : 'bg-white'}`}
                                        onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-bold text-gray-800 truncate pr-6">{t.description || 'Sem descrição'}</div>
                                            {expandedId === t.id ? <ChevronUp size={18} className="text-blue-600" /> : <ChevronDown size={18} className="text-gray-400" />}
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-500 font-medium">{formatDate(t.date)}</span>
                                            <span className="text-blue-600 font-bold">{formatCurrency(t.value)}</span>
                                        </div>
                                    </div>
                                    {expandedId === t.id && (
                                        <div className="p-4 bg-gray-50 border-t border-gray-100 animate-scale-in">
                                            <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">Comentário:</span>
                                            <p className="text-sm text-gray-700 italic leading-relaxed">{t.comments}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de Filtros para Geração de PDF */}
            <Modal 
                isOpen={isPdfModalOpen} 
                onClose={() => setIsPdfModalOpen(false)} 
                title="Opções do Relatório de Comentários"
            >
                <div className="space-y-5">
                    {pdfError && (
                        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded flex items-start gap-3">
                            <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                            <p className="text-sm text-red-700 font-medium">{pdfError}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Selecione a Conta</label>
                        <select 
                            value={pdfAccountId}
                            onChange={(e) => setPdfAccountId(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-700"
                        >
                            <option value="">Escolha uma conta...</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Data Início</label>
                            <input 
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Data Fim</label>
                            <input 
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex flex-col gap-3">
                        <button 
                            onClick={handleGeneratePdf}
                            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg"
                        >
                            Gerar Relatório em Paisagem
                        </button>
                        <button 
                            onClick={() => setIsPdfModalOpen(false)}
                            className="w-full py-3 text-gray-500 font-bold hover:text-gray-700 transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default CommentsReport;