import { Transaction, Category, BankAccount } from '../types';
import { formatCurrency, formatDate } from './formatters';

declare global {
    interface Window {
        jspdf: any;
    }
}

export const generateTransactionsPDF = (
    transactions: Transaction[],
    categories: Category[],
    accounts: BankAccount[],
    title: string
) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(18);
    doc.text(`Relatório de Lançamentos - ${title}`, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 14, 29);

    const tableColumn = ["Data", "Descrição", "Conta", "Natureza", "Valor"];
    const tableRows: (string | number)[][] = [];

    const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'N/A';
    const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || 'N/A';

    transactions.forEach(t => {
        const transactionData = [
            formatDate(t.date),
            t.description || getCategoryName(t.categoryId),
            getAccountName(t.accountId),
            t.nature,
            formatCurrency(t.value)
        ];
        tableRows.push(transactionData);
    });

    let totalReceitas = 0;
    let totalDespesas = 0;
    transactions.forEach(t => {
        if (t.nature === 'RECEITA') totalReceitas += t.value;
        else totalDespesas += t.value;
    });
    const saldo = totalReceitas - totalDespesas;

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [22, 163, 74] },
        didDrawPage: (data: any) => {
            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(10);
            doc.text(`Página ${data.pageNumber} de ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
        }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text('Resumo do Período', 14, finalY);
    doc.setFontSize(10);
    doc.text(`Total de Receitas: ${formatCurrency(totalReceitas)}`, 14, finalY + 7);
    doc.text(`Total de Despesas: ${formatCurrency(totalDespesas)}`, 14, finalY + 14);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`Saldo do Período: ${formatCurrency(saldo)}`, 14, finalY + 21);


    doc.save(`relatorio_${title.toLowerCase().replace(' ', '_')}_${new Date().toISOString().slice(0,10)}.pdf`);
};