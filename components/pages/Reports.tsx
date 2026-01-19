import React, { useMemo } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { formatCurrency } from '../../utils/formatters';
import { CategoryType } from '../../types';
import { ArrowUpRight, ArrowDownLeft, Scale, ShieldCheck, Landmark } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const CustomLegend = (props: any) => {
  const { payload } = props;
  if (!payload || !payload.length) {
    return null;
  }

  return (
    <div className="mt-6 w-full">
        <ul className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-[10px] font-bold justify-center">
        {payload.map((entry: any, index: number) => (
            <li
            key={`item-${index}`}
            className="flex items-center gap-2.5"
            title={entry.value}
            >
            <span
                className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0 shadow-sm"
                style={{ backgroundColor: entry.color }}
            />
            <span className="text-slate-500 truncate uppercase tracking-widest font-bold">
                {entry.value}
            </span>
            </li>
        ))}
        </ul>
    </div>
  );
};


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
      tDate.setUTCHours(0,0,0,0);
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

  const COLORS = ['#0f172a', '#c5a059', '#334155', '#d9b36a', '#475569', '#94a3b8', '#cbd5e1'];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-[800] text-slate-900 tracking-tight">Dashboard Executivo</h1>
        <p className="text-slate-500 mt-2 font-medium tracking-wide">Relatório consolidado de ativos e fluxos financeiros.</p>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <ShieldCheck size={120} />
            </div>
            <div className="relative z-10">
                <p className="font-extrabold text-[#c5a059] uppercase tracking-[0.25em] text-[10px]">Patrimônio Total</p>
                <p className="text-4xl font-[800] mt-3 tracking-tighter tabular-nums">{formatCurrency(totalBalance)}</p>
            </div>
            <div className="flex items-center gap-2 mt-6 font-bold text-[11px] text-slate-400 uppercase tracking-widest relative z-10">
                <Landmark size={14} className="text-[#c5a059]" />
                <span>Interbancário Consolidado</span>
            </div>
        </div>
        
        <div className="bg-white p-8 rounded-3xl premium-shadow border border-slate-100 card-hover">
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em]">Receitas do Mês</p>
                <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-2xl">
                    <ArrowUpRight size={20} />
                </div>
            </div>
            <p className="text-3xl font-[800] text-slate-900 mt-3 tabular-nums">{formatCurrency(monthlySummary.income)}</p>
        </div>

        <div className="bg-white p-8 rounded-3xl premium-shadow border border-slate-100 card-hover">
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em]">Despesas do Mês</p>
                <div className="bg-rose-50 text-rose-600 p-2.5 rounded-2xl">
                    <ArrowDownLeft size={20} />
                </div>
            </div>
            <p className="text-3xl font-[800] text-slate-900 mt-3 tabular-nums">{formatCurrency(monthlySummary.expense)}</p>
        </div>
        
        <div className="bg-white p-8 rounded-3xl premium-shadow border border-slate-100 card-hover">
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em]">Balanço Líquido</p>
                 <div className="bg-slate-50 text-slate-600 p-2.5 rounded-2xl">
                    <Scale size={20} />
                </div>
            </div>
            <p className={`text-3xl font-[800] mt-3 tabular-nums ${monthlySummary.income - monthlySummary.expense >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                {formatCurrency(monthlySummary.income - monthlySummary.expense)}
            </p>
        </div>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl premium-shadow border border-slate-100">
           <h2 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-[0.25em] mb-8">Alocação por Categoria</h2>
            {expenseByCategoryData.length > 0 ? (
                <div style={{ width: '100%', height: 480 }}>
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie 
                                data={expenseByCategoryData} 
                                dataKey="value" 
                                nameKey="name" 
                                cx="50%" 
                                cy="40%" 
                                innerRadius={90} 
                                outerRadius={120} 
                                paddingAngle={5}
                                fill="#8884d8" 
                                labelLine={false} 
                                stroke="none"
                            >
                                {expenseByCategoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip 
                                formatter={(value: number) => formatCurrency(value)} 
                                contentStyle={{ backgroundColor: '#ffffff', border: 'none', borderRadius: '1.5rem', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)', fontFamily: 'Plus Jakarta Sans, sans-serif' }} 
                            />
                            <Legend content={<CustomLegend />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            ) : <p className="text-slate-400 text-center pt-24 font-bold italic tracking-wide uppercase text-[10px]">Dados insuficientes para análise visual.</p>}
        </div>
        <div className="lg:col-span-3 bg-white p-8 rounded-3xl premium-shadow border border-slate-100">
          <h2 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-[0.25em] mb-8">Fluxo de Competência Mensal</h2>
          <div style={{ width: '100%', height: 320 }}>
             <ResponsiveContainer>
                <BarChart data={[{ name: 'Mês Atual', receitas: monthlySummary.income, despesas: monthlySummary.expense }]} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase'}} />
                    <YAxis tickFormatter={(value) => formatCurrency(Number(value))} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 700}} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ backgroundColor: '#ffffff', border: 'none', borderRadius: '1.5rem', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)', fontFamily: 'Plus Jakarta Sans, sans-serif' }} />
                    <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '11px', fontWeight: 700}} />
                    <Bar dataKey="receitas" fill="#c5a059" name="Créditos" radius={[8, 8, 0, 0]} barSize={60} />
                    <Bar dataKey="despesas" fill="#0f172a" name="Débitos" radius={[8, 8, 0, 0]} barSize={60} />
                </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;