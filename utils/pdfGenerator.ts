import { Transaction, BankAccount } from '../types';
import { formatCurrency, formatDate } from './formatters';

declare global {
    interface Window {
        jspdf: any;
    }
}

interface PdfOptions {
    account: BankAccount;
    period: { start: string; end: string };
    transactionsInPeriod: Transaction[];
    allTransactions: Transaction[];
    transactionType: 'checking_account' | 'credit_card';
    title: string;
}

const calculateBalanceUpToDate = (accountId: string, upToDate: Date, allTransactions: Transaction[]): number => {
    const previousTransactions = allTransactions.filter(t => {
        const tDate = new Date(t.date);
        return t.accountId === accountId && t.type === 'checking_account' && tDate < upToDate;
    });

    const balance = previousTransactions.reduce((acc, curr) => {
        if (curr.nature === 'RECEITA') {
            return acc + curr.value;
        }
        return acc - curr.value;
    }, 0);

    return balance;
};


export const generateTransactionsPDF = (options: PdfOptions) => {
    const { account, period, transactionsInPeriod, allTransactions, transactionType, title } = options;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait' });

    const isCheckingAccount = transactionType === 'checking_account';

    // Header
    doc.setFontSize(18);
    doc.text(isCheckingAccount ? 'Extrato de Conta Corrente' : title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Conta: ${account.name}`, 14, 29);
    doc.text(`Período: ${formatDate(period.start)} a ${formatDate(period.end)}`, 14, 36);

    let startY = 50;
    let previousBalance = 0;

    if (isCheckingAccount) {
        const startOfDay = new Date(period.start);
        startOfDay.setUTCHours(0, 0, 0, 0);
        previousBalance = calculateBalanceUpToDate(account.id, startOfDay, allTransactions);

        const yesterday = new Date(period.start);
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text(`Saldo em ${formatDate(yesterday.toISOString())}: ${formatCurrency(previousBalance)}`, 14, 46);
        doc.setFont(undefined, 'normal');
    } else {
        startY = 42;
    }

    const tableColumn = isCheckingAccount
        ? ["Data", "Descrição", "Nº Nota", "C/D", "Valor", "Saldo"]
        : ["Data", "Descrição", "Nº Nota", "Saída (-)"];

    const tableRows: (string | number)[][] = [];
    let runningBalance = previousBalance;
    let totalEntradas = 0;
    let totalSaidas = 0;

    const sortedTransactions = [...transactionsInPeriod].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedTransactions.forEach(t => {
        const entrada = t.nature === 'RECEITA' ? t.value : 0;
        const saida = t.nature === 'DESPESA' ? t.value : 0;
        
        runningBalance += entrada - saida;
        totalEntradas += entrada;
        totalSaidas += saida;

        const transactionData: (string|number)[] = [
            formatDate(t.date),
            t.description,
            t.numeroNota || '-',
        ];

        if (isCheckingAccount) {
            transactionData.push(t.nature === 'RECEITA' ? '+' : '-');
            transactionData.push(formatCurrency(t.value));
            transactionData.push(formatCurrency(runningBalance));
        } else {
            transactionData.push(saida > 0 ? formatCurrency(saida) : '-');
        }
        tableRows.push(transactionData);
    });

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: startY,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] }, // Blue
        columnStyles: isCheckingAccount ? {
            3: { cellWidth: 10, halign: 'center' } // Coluna C/D compacta
        } : {},
        didDrawPage: (data: any) => {
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(10);
            doc.text(`Página ${data.pageNumber} de ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
        }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text('Resumo do Período', 14, finalY);
    doc.setFontSize(10);
    
    let summaryY = finalY + 7;
    if (isCheckingAccount) {
        doc.text(`Saldo Anterior: ${formatCurrency(previousBalance)}`, 14, summaryY);
        summaryY += 7;
    }

    doc.text(`Total de Entradas: ${formatCurrency(totalEntradas)}`, 14, summaryY);
    summaryY += 7;
    doc.text(`Total de Saídas: ${formatCurrency(totalSaidas)}`, 14, summaryY);
    summaryY += 7;
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    
    if (isCheckingAccount) {
        const finalBalance = previousBalance + totalEntradas - totalSaidas;
        doc.text(`Saldo Final: ${formatCurrency(finalBalance)}`, 14, summaryY);
    } else {
        const totalFatura = totalSaidas - totalEntradas;
        doc.text(`Total da Fatura: ${formatCurrency(totalFatura)}`, 14, summaryY);
    }

    // Saída: Exibir PDF em nova aba em vez de baixar
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
};

export const generateCommentsPDF = (options: { 
    account: BankAccount,
    period: { start: string, end: string },
    transactions: Transaction[] 
}) => {
    const { account, period, transactions } = options;
    const { jsPDF } = window.jspdf;
    
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    doc.setFontSize(18);
    doc.text('Relatório de Comentários e Observações', margin, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Conta: ${account.name}`, margin, 29);
    doc.text(`Período: ${formatDate(period.start)} a ${formatDate(period.end)}`, margin, 36);

    let currentY = 45;

    const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (sortedTransactions.length === 0) {
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text('Nenhum comentário registrado para os filtros selecionados.', margin, currentY);
    } else {
        sortedTransactions.forEach((t) => {
            doc.autoTable({
                startY: currentY,
                head: [[
                    { content: `NOME DA TRANSAÇÃO: ${t.description || 'Sem Descrição'}`, styles: { halign: 'left', cellWidth: 'auto' } },
                    { content: `DATA: ${formatDate(t.date)}`, styles: { halign: 'center', cellWidth: 40 } },
                    { content: `VALOR DA TRANSAÇÃO: ${formatCurrency(t.value)}`, styles: { halign: 'right', cellWidth: 60 } }
                ]],
                body: [[
                    { content: t.comments || 'Sem observações.', colSpan: 3, styles: { cellPadding: 5, fontStyle: 'italic' } }
                ]],
                theme: 'grid',
                headStyles: { 
                    fillColor: [75, 85, 99],
                    textColor: [255, 255, 255],
                    fontSize: 10,
                    fontStyle: 'bold'
                },
                bodyStyles: {
                    fontSize: 10,
                    textColor: [31, 41, 55],
                },
                margin: { left: margin, right: margin },
                tableWidth: pageWidth - (margin * 2),
            });

            currentY = doc.lastAutoTable.finalY + 10;

            if (currentY > doc.internal.pageSize.getHeight() - 20) {
                doc.addPage();
                currentY = 20;
            }
        });
    }

    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin - 20, doc.internal.pageSize.getHeight() - 10);
    }

    // Saída: Exibir PDF em nova aba em vez de baixar
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
};