
import React, { useMemo } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { formatCurrency } from '../../utils/formatters';
import { CategoryType } from '../../types';
import { ArrowUpRight, ArrowDownLeft, DollarSign, Scale } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const Reports: React.FC = () => {
  const { accounts, transactions, categories, calculateCurrentBalance } = useAppData();

  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + calculateCurrentBalance(acc.id), 0);
  }, [accounts, calculateCurrentBalance]);

  const monthlySummary = useMemo(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= firstDay && tDate <= lastDay;
    });

    const income = monthTransactions
      .filter(t => t.nature === 'RECEITA')
      .reduce((sum, t) => sum + t.value, 0);

    const expense = monthTransactions
      .filter(t => t.nature === 'DESPESA')
      .reduce((sum, t) => sum + t.value, 0);

    return { income, expense };
  }, [transactions]);
  
  const expenseByCategoryData = useMemo(() => {
    const expenseCategories = categories.filter(c => c.type === CategoryType.DESPESA);
    const expenseData: { [key: string]: number } = {};

    transactions
        .filter(t => t.nature === 'DESPESA')
        .forEach(t => {
            const categoryName = categories.find(c => c.id === t.categoryId)?.name || 'Outros';
            if(expenseData[categoryName]) {
                expenseData[categoryName] += t.value;
            } else {
                expenseData[categoryName] = t.value;
            }
        });
        
    return Object.entries(expenseData).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

  }, [transactions, categories]);

  const COLORS = ['#0ea5e9', '#f43f5e', '#10b981', '#f97316', '#8b5cf6', '#eab308', '#64748b'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Relatórios</h1>
        <p className="text-slate-500 mt-1">Uma visão clara e consolidada das suas finanças.</p>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm flex items-start justify-between">
            <div>
                <p className="text-sm font-medium text-slate-500">Saldo Total</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{formatCurrency(totalBalance)}</p>
            </div>
            <div className="bg-sky-100 text-sky-600 p-3 rounded-full">
                <DollarSign size={24} />
            </div>
        </div>
         <div className="bg-white p-6 rounded-xl shadow-sm flex items-start justify-between">
            <div>
                <p className="text-sm font-medium text-slate-500">Receitas do Mês</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{formatCurrency(monthlySummary.income)}</p>
            </div>
            <div className="bg-emerald-100 text-emerald-600 p-3 rounded-full">
                <ArrowUpRight size={24} />
            </div>
        </div>
         <div className="bg-white p-6 rounded-xl shadow-sm flex items-start justify-between">
            <div>
                <p className="text-sm font-medium text-slate-500">Despesas do Mês</p>
                <p className="text-3xl font-bold text-rose-600 mt-1">{formatCurrency(monthlySummary.expense)}</p>
            </div>
            <div className="bg-rose-100 text-rose-600 p-3 rounded-full">
                <ArrowDownLeft size={24} />
            </div>
        </div>
         <div className="bg-white p-6 rounded-xl shadow-sm flex items-start justify-between">
            <div>
                <p className="text-sm font-medium text-slate-500">Balanço do Mês</p>
                <p className={`text-3xl font-bold mt-1 ${monthlySummary.income - monthlySummary.expense >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>{formatCurrency(monthlySummary.income - monthlySummary.expense)}</p>
            </div>
            <div className="bg-slate-100 text-slate-600 p-3 rounded-full">
                <Scale size={24} />
            </div>
        </div>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm">
           <h2 className="text-lg font-semibold text-slate-700 mb-4">Despesas por Categoria</h2>
            {expenseByCategoryData.length > 0 ? (
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie data={expenseByCategoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" labelLine={false}>
                                {expenseByCategoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            ) : <p className="text-slate-500 text-center pt-16">Sem dados de despesa para exibir.</p>}
        </div>
        <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Receitas vs. Despesas (Mês Atual)</h2>
          <div style={{ width: '100%', height: 300 }}>
             <ResponsiveContainer>
                <BarChart data={[{ name: 'Mês Atual', receitas: monthlySummary.income, despesas: monthlySummary.expense }]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => formatCurrency(Number(value))} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="receitas" fill="#10b981" name="Receitas" />
                    <Bar dataKey="despesas" fill="#f43f5e" name="Despesas" />
                </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Reports;

