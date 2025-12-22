
import React, { useState } from 'react';
import Categories from './components/pages/Categories';
import BankAccounts from './components/pages/BankAccounts';
import Transactions from './components/pages/Transactions';
import Reports from './components/pages/Reports';
import { Menu, X, Landmark, List, CreditCard, PieChart, Wallet } from 'lucide-react';

type Page = 'Conta Bancária' | 'Categorias' | 'Conta Corrente' | 'Cartão de Crédito' | 'Relatórios';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>('Relatórios');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
      case 'Relatórios':
        return <Reports />;
      default:
        return <Reports />;
    }
  };

  const menuItems: { name: Page; icon: React.ReactNode }[] = [
    { name: 'Relatórios', icon: <PieChart className="w-5 h-5" /> },
    { name: 'Conta Bancária', icon: <Landmark className="w-5 h-5" /> },
    { name: 'Categorias', icon: <List className="w-5 h-5" /> },
    { name: 'Conta Corrente', icon: <Wallet className="w-5 h-5" /> },
    { name: 'Cartão de Crédito', icon: <CreditCard className="w-5 h-5" /> },
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
        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
          activePage === page
            ? 'bg-sky-600 text-white shadow-md'
            : 'text-slate-600 hover:bg-sky-100 hover:text-sky-700'
        }`}
      >
        {icon}
        <span className="font-medium">{page}</span>
      </a>
    </li>
  );

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <aside
        className={`bg-white border-r border-slate-200 w-64 min-h-screen p-4 flex flex-col transition-transform duration-300 ease-in-out fixed lg:relative lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } z-20`}
      >
        <div className="flex items-center gap-2 pb-4 border-b border-slate-200">
          <div className="bg-sky-600 p-2 rounded-lg">
            <Landmark className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Curatela Contas</h1>
        </div>
        <nav className="mt-6 flex-1">
          <ul className="space-y-2">
            {menuItems.map(item => <NavLink key={item.name} page={item.name} icon={item.icon} />)}
          </ul>
        </nav>
        <div className="text-center text-xs text-slate-400 mt-6">
          <p>Feito com cuidado para você.</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white/80 backdrop-blur-lg shadow-sm p-4 flex items-center justify-between lg:hidden sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="bg-sky-600 p-2 rounded-lg">
              <Landmark className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-800">Curatela Contas</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2">
            {isSidebarOpen ? <X className="w-6 h-6 text-slate-700" /> : <Menu className="w-6 h-6 text-slate-700" />}
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {renderPage()}
        </main>
      </div>
      
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-10 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default App;
