import React, { useState } from 'react';
import Categories from './components/pages/Categories';
import BankAccounts from './components/pages/BankAccounts';
import Transactions from './components/pages/Transactions';
import Reports from './components/pages/Reports';
import Documents from './components/pages/Documents';
import Funcionamento from './components/pages/Funcionamento';
import CommentsReport from './components/pages/CommentsReport';
import Console from './components/ui/Console';
import AIChat from './components/ai/AIChat';
import { useAppData } from './hooks/useAppData';
import { Menu, X, Landmark, List, CreditCard, LayoutDashboard, Wallet, HeartPulse, Loader2, FileText, Activity, MessageSquare, ShieldCheck } from 'lucide-react';

type Page = 'Dashboard' | 'Conta Bancária' | 'Categorias' | 'Conta Corrente' | 'Cartão de Crédito' | 'Documentos' | 'Funcionamento' | 'Comentários';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isLoading: isDataLoading } = useAppData();

  if (isDataLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-[#c5a059] animate-spin mx-auto" />
          <p className="mt-6 text-xl font-light text-slate-300 tracking-[0.2em]">AUTENTICANDO...</p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case 'Categorias':
        return <Categories />;
      case 'Conta Bancária':
        return <BankAccounts />;
      case 'Conta Corrente':
        return <Transactions transactionType="checking_account" title="Conta Corrente" />;
      case 'Cartão de Crédito':
        return <Transactions transactionType="credit_card" title="Cartão de Crédito" />;
      case 'Dashboard':
        return <Reports />;
      case 'Documentos':
        return <Documents />;
      case 'Funcionamento':
        return <Funcionamento />;
      case 'Comentários':
        return <CommentsReport />;
      default:
        return <Reports />;
    }
  };

  const menuItems: { name: Page; icon: React.ReactNode }[] = [
    { name: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Conta Corrente', icon: <Wallet className="w-5 h-5" /> },
    { name: 'Cartão de Crédito', icon: <CreditCard className="w-5 h-5" /> },
    { name: 'Comentários', icon: <MessageSquare className="w-5 h-5" /> },
    { name: 'Documentos', icon: <FileText className="w-5 h-5" /> },
    { name: 'Conta Bancária', icon: <Landmark className="w-5 h-5" /> },
    { name: 'Categorias', icon: <List className="w-5 h-5" /> },
    { name: 'Funcionamento', icon: <Activity className="w-5 h-5" /> },
  ];

  const NavLink: React.FC<{ page: Page, icon: React.ReactNode }> = ({ page, icon }) => (
    <li key={page}>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          setActivePage(page);
          setIsSidebarOpen(false);
        }}
        className={`flex items-center gap-3.5 p-3.5 rounded-xl transition-all duration-300 font-semibold ${
          activePage === page
            ? 'sidebar-item-active text-white scale-[1.02]'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
      >
        <span className={activePage === page ? 'text-white' : 'text-[#c5a059]'}>
          {icon}
        </span>
        <span className="tracking-tight">{page}</span>
      </a>
    </li>
  );

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`bg-slate-900 w-72 min-h-screen p-6 flex flex-col transition-transform duration-500 ease-in-out fixed lg:relative lg:translate-x-0 z-30 shadow-2xl ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-4 pb-8 mb-4 border-b border-slate-800">
          <div className="bg-gradient-to-br from-[#c5a059] to-[#d9b36a] p-2.5 rounded-xl shadow-lg">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Curatela</h1>
            <p className="text-[10px] text-[#c5a059] font-bold uppercase tracking-[0.25em] leading-none mt-1">Sovereign Trust</p>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto no-scrollbar">
          <ul className="space-y-1.5">
            {menuItems.map(item => <NavLink key={item.name} page={item.name} icon={item.icon} />)}
          </ul>
        </nav>
        
        <div className="border-t border-slate-800 pt-6 mt-6">
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                <p className="text-[10px] text-[#c5a059] font-extrabold uppercase tracking-[0.2em] text-center">Proteção Garantida</p>
            </div>
            <p className="text-center text-[10px] text-slate-500 mt-4 font-bold uppercase tracking-[0.15em]">Versão Premium 2.5</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 p-4 flex items-center justify-between lg:hidden sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-[#c5a059]" />
            </div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">Curatela Contas</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-600">
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-10 bg-slate-50">
          <div className="max-w-7xl mx-auto animate-slide-up">
            {renderPage()}
          </div>
        </main>
      </div>
      
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-20 lg:hidden transition-opacity duration-500" 
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
      
      {/* Modals & Global Components */}
      <Console />
      <AIChat />
    </div>
  );
};

export default App;