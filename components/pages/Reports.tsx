
import React, { useMemo } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { formatCurrency } from '../../utils/formatters';
import { CategoryType } from '../../types';
import { ArrowUpRight, ArrowDownLeft, DollarSign, Scale, ArrowRight } from 'lucide-react';
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

  const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f97316', '#8b5cf6', '#eab308', '#64748b'];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 mt-1">Uma visão clara e consolidada das suas finanças.</p>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Blue Card */}
        <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-lg flex flex-col justify-between">
            <div>
                <p className="font-medium opacity-80">Saldo Total Consolidado</p>
                <p className="text-4xl font-bold mt-2">{formatCurrency(totalBalance)}</p>
            </div>
            <a href="#" className="flex items-center gap-2 mt-4 font-semibold text-sm opacity-80 hover:opacity-100 transition-opacity">
                Ver detalhes <ArrowRight size={16} />
            </a>
        </div>
        
        {/* White Cards */}
        <div className="bg-white p-6 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">Receitas do Mês</p>
                <div className="bg-green-100 text-green-600 p-2 rounded-full">
                    <ArrowUpRight size={20} />
                </div>
            </div>
            <p className="text-3xl font-bold text-gray-800 mt-2">{formatCurrency(monthlySummary.income)}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">Despesas do Mês</p>
                <div className="bg-red-100 text-red-600 p-2 rounded-full">
                    <ArrowDownLeft size={20} />
                </div>
            </div>
            <p className="text-3xl font-bold text-gray-800 mt-2">{formatCurrency(monthlySummary.expense)}</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">Balanço do Mês</p>
                 <div className="bg-gray-100 text-gray-600 p-2 rounded-full">
                    <Scale size={20} />
                </div>
            </div>
            <p className={`text-3xl font-bold mt-2 ${monthlySummary.income - monthlySummary.expense >= 0 ? 'text-gray-800' : 'text-red-600'}`}>{formatCurrency(monthlySummary.income - monthlySummary.expense)}</p>
        </div>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm">
           <h2 className="text-lg font-semibold text-gray-700 mb-4">Despesas por Categoria</h2>
            {expenseByCategoryData.length > 0 ? (
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie data={expenseByCategoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" labelLine={false} stroke="none">
                                {expenseByCategoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.75rem' }} />
                            <Legend iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            ) : <p className="text-gray-500 text-center pt-16">Sem dados de despesa para exibir.</p>}
        </div>
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Receitas vs. Despesas (Mês Atual)</h2>
          <div style={{ width: '100%', height: 300 }}>
             <ResponsiveContainer>
                <BarChart data={[{ name: 'Mês Atual', receitas: monthlySummary.income, despesas: monthlySummary.expense }]} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(value) => formatCurrency(Number(value))} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={{fill: '#f1f5f9'}} contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.75rem' }} />
                    <Legend iconType="circle"/>
                    <Bar dataKey="receitas" fill="#22c55e" name="Receitas" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesas" fill="#ef4444" name="Despesas" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Reports;
