import React, { createContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { BankAccount, Category, Transaction } from '../types';

interface AppContextType {
  accounts: BankAccount[];
  addAccount: (account: Omit<BankAccount, 'id'>) => void;
  updateAccount: (account: BankAccount) => void;
  deleteAccount: (id: string) => void;
  getAccountById: (id: string) => BankAccount | undefined;
  
  categories: Category[];
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
  
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateTransaction: (transaction: Transaction) => void;
  deleteTransaction: (id: string) => void;
  
  calculateCurrentBalance: (accountId: string) => number;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

const usePersistentState = <T,>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [state, setState] = useState<T>(() => {
    try {
      const storedValue = localStorage.getItem(key);
      return storedValue ? JSON.parse(storedValue) : defaultValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, state]);

  return [state, setState];
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = usePersistentState<BankAccount[]>('accounts', []);
  const [categories, setCategories] = usePersistentState<Category[]>('categories', []);
  const [transactions, setTransactions] = usePersistentState<Transaction[]>('transactions', []);

  // Accounts CRUD
  const addAccount = (account: Omit<BankAccount, 'id'>) => {
    setAccounts(prev => [...prev, { ...account, id: crypto.randomUUID() }]);
  };
  const updateAccount = (updatedAccount: BankAccount) => {
    setAccounts(prev => prev.map(acc => acc.id === updatedAccount.id ? updatedAccount : acc));
  };
  const deleteAccount = (id: string) => {
    setAccounts(prev => prev.filter(acc => acc.id !== id));
    setTransactions(prev => prev.filter(t => t.accountId !== id));
  };
  const getAccountById = (id: string) => accounts.find(acc => acc.id === id);

  // Categories CRUD
  const addCategory = (category: Omit<Category, 'id'>) => {
    setCategories(prev => [...prev, { ...category, id: crypto.randomUUID() }]);
  };
  const updateCategory = (updatedCategory: Category) => {
    setCategories(prev => prev.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat));
  };
  const deleteCategory = (id: string) => {
    setCategories(prev => prev.filter(cat => cat.id !== id));
    setTransactions(prev => prev.filter(t => t.categoryId !== id));
  };

  // Transactions CRUD
  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    setTransactions(prev => [...prev, { ...transaction, id: crypto.randomUUID() }].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };
  const updateTransaction = (updatedTransaction: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };
  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };
  
  const calculateCurrentBalance = useMemo(() => (accountId: string): number => {
      const account = accounts.find(acc => acc.id === accountId);
      if (!account) return 0;
      
      const accountTransactions = transactions.filter(t => t.accountId === accountId && t.type === 'checking_account');
      
      const balance = accountTransactions.reduce((acc, curr) => {
          if (curr.nature === 'RECEITA') {
              return acc + curr.value;
          }
          return acc - curr.value;
      }, account.initialBalance);

      return balance;
  }, [accounts, transactions]);


  const contextValue = {
    accounts, addAccount, updateAccount, deleteAccount, getAccountById,
    categories, addCategory, updateCategory, deleteCategory,
    transactions, addTransaction, updateTransaction, deleteTransaction,
    calculateCurrentBalance
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};