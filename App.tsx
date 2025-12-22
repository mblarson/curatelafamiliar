import React, { useState } from 'react';
import Categories from './components/pages/Categories';
import BankAccounts from './components/pages/BankAccounts';
import Transactions from './components/pages/Transactions';
import Reports from './components/pages/Reports';
import Documents from './components/pages/Documents';
import Console from './components/ui/Console';
import { useAppData } from './hooks/useAppData';
import { Menu, X, Landmark, List, CreditCard, LayoutDashboard, Wallet, HeartPulse, Loader2, FileText } from 'lucide-react';

type Page = 'Dashboard' | 'Conta Bancária' | 'Categorias' | 'Conta Corrente' | 'Cartão de Crédito' | 'Documentos';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isLoading } = useAppData();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-lg font-semibold text-gray-600">Carregando dados...</p>
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
      default:
        return <Reports />;
    }
  };

  const menuItems: { name: Page; icon: React.ReactNode }[] = [
    { name: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Conta Corrente', icon: <Wallet className="w-5 h-5" /> },
    { name: 'Cartão de Crédito', icon: <CreditCard className="w-5 h-5" /> },
    { name: 'Documentos', icon: <FileText className="w-5 h-5" /> },
    { name: 'Conta Bancária', icon: <Landmark className="w-5 h-5" /> },
    { name: 'Categorias', icon: <List className="w-5 h-5" /> },
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
        className={`flex items-center gap-3 p-3 rounded-lg transition-colors font-medium ${
          activePage === page
            ? 'bg-blue-600 text-white shadow'
            : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
        }`}
      >
        {icon}
        <span>{page}</span>
      </a>
    </li>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`bg-white w-64 min-h-screen p-4 flex flex-col transition-transform duration-300 ease-in-out fixed lg:relative lg:translate-x-0 z-20 shadow-lg lg:shadow-none ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div className="bg-blue-600 p-2 rounded-lg">
            <HeartPulse className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Curatela Contas</h1>
        </div>
        <nav className="mt-6 flex-1">
          <ul className="space-y-2">
            {menuItems.map(item => <NavLink key={item.name} page={item.name} icon={item.icon} />)}
          </ul>
        </nav>
        
        <div className="border-t border-gray-100 pt-4 mt-auto">
          <div className="text-center text-xs text-gray-400 pt-2">
            <p>Feito com cuidado para você.</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white/80 backdrop-blur-lg border-b border-gray-100 p-4 flex items-center justify-between lg:hidden sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-800">Curatela Contas</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2">
            {isSidebarOpen ? <X className="w-6 h-6 text-gray-700" /> : <Menu className="w-6 h-6 text-gray-700" />}
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
      
      {/* Modals */}
      <Console />
    </div>
  );
};

export default App;