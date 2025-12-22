import React, { createContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { BankAccount, Category, Transaction, Document, Attachment, NewAttachment } from '../types';
import { supabase, base64ToBlob } from '../supabase/client';

interface AppContextType {
  isLoading: boolean;
  accounts: BankAccount[];
  addAccount: (account: Omit<BankAccount, 'id'>) => Promise<BankAccount | null>;
  updateAccount: (account: BankAccount) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  getAccountById: (id: string) => BankAccount | undefined;
  
  categories: Category[];
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (category: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id'>, newAttachments?: NewAttachment[]) => Promise<void>;
  updateTransaction: (transaction: Transaction, newAttachments?: NewAttachment[]) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  documents: Document[];
  addDocument: (title: string, fileName: string, base64Data: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  
  calculateCurrentBalance: (accountId: string) => number;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accountsRes, categoriesRes, transactionsRes, documentsRes] = await Promise.all([
          supabase.from('accounts').select('*'),
          supabase.from('categories').select('*'),
          supabase.from('transactions').select('*').order('date', { ascending: false }),
          supabase.from('documents').select('*').order('created_at', { ascending: false })
        ]);

        if (accountsRes.error) throw accountsRes.error;
        if (categoriesRes.error) throw categoriesRes.error;
        if (transactionsRes.error) throw transactionsRes.error;
        if (documentsRes.error) throw documentsRes.error;
        
        const typedAccounts = accountsRes.data.map(a => ({...a, dataAbertura: a.dataAbertura.split('T')[0]}));
        const typedTransactions = transactionsRes.data.map(t => ({...t, date: t.date.split('T')[0]}));

        setAccounts(typedAccounts || []);
        setCategories(categoriesRes.data || []);
        setTransactions(typedTransactions || []);
        setDocuments(documentsRes.data || []);

      } catch (error: any) {
        console.error("Error fetching initial data:", error.message || error);
        console.error("Full error object:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);


  // Accounts CRUD
  const addAccount = async (accountData: Omit<BankAccount, 'id'>): Promise<BankAccount | null> => {
    const newAccount = { ...accountData, id: crypto.randomUUID() };
    const { data, error } = await supabase.from('accounts').insert(newAccount).select();
    if (error) {
      console.error("Error adding account:", error);
      return null;
    }
    if (data) {
      const createdAccount = data[0];
      setAccounts(prev => [...prev, createdAccount]);
      return createdAccount;
    }
    return null;
  };
  const updateAccount = async (updatedAccount: BankAccount) => {
    const { error } = await supabase.from('accounts').update(updatedAccount).eq('id', updatedAccount.id);
    if (error) return console.error("Error updating account:", error);
    setAccounts(prev => prev.map(acc => acc.id === updatedAccount.id ? updatedAccount : acc));
  };
  const deleteAccount = async (id: string) => {
    // RLS and CASCADE delete in Supabase will handle associated transactions
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (error) return console.error("Error deleting account:", error);
    setAccounts(prev => prev.filter(acc => acc.id !== id));
  };
  const getAccountById = (id: string) => accounts.find(acc => acc.id === id);

  // Categories CRUD
  const addCategory = async (categoryData: Omit<Category, 'id'>) => {
    const newCategory = { ...categoryData, id: crypto.randomUUID() };
    const { error } = await supabase.from('categories').insert(newCategory);
    if (error) return console.error("Error adding category:", error);
    setCategories(prev => [...prev, newCategory]);
  };
  const updateCategory = async (updatedCategory: Category) => {
    const { error } = await supabase.from('categories').update(updatedCategory).eq('id', updatedCategory.id);
    if (error) return console.error("Error updating category:", error);
    setCategories(prev => prev.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat));
  };
  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      console.error("Error deleting category:", error.message);
      throw error;
    }
    setCategories(prev => prev.filter(cat => cat.id !== id));
  };

  // Transactions CRUD
  const handleAttachmentUpload = async (newAttachments: NewAttachment[]): Promise<Attachment[]> => {
    const uploadedAttachments: Attachment[] = [];
    for (const attachment of newAttachments) {
      const filePath = `public/${crypto.randomUUID()}-${attachment.name}`;
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, base64ToBlob(attachment.data, 'image/jpeg'));

      if (uploadError) {
        console.error('Error uploading attachment:', uploadError);
        continue; // Skip failed uploads
      }
      
      const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(filePath);
      uploadedAttachments.push({ id: attachment.id, name: attachment.name, url: publicUrl });
    }
    return uploadedAttachments;
  }

  const addTransaction = async (transactionData: Omit<Transaction, 'id'>, newAttachments: NewAttachment[] = []) => {
    const uploadedAttachments = await handleAttachmentUpload(newAttachments);
    const newTransaction = { ...transactionData, id: crypto.randomUUID(), attachments: uploadedAttachments };
    const { error } = await supabase.from('transactions').insert(newTransaction);
    if (error) return console.error("Error adding transaction:", error);
    setTransactions(prev => [newTransaction, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };
  const updateTransaction = async (updatedTransactionData: Transaction, newAttachments: NewAttachment[] = []) => {
    const uploadedAttachments = await handleAttachmentUpload(newAttachments);
    const finalAttachments = [...(updatedTransactionData.attachments || []), ...uploadedAttachments];
    const transactionToUpdate = { ...updatedTransactionData, attachments: finalAttachments };
    const { error } = await supabase.from('transactions').update(transactionToUpdate).eq('id', transactionToUpdate.id);
    if (error) return console.error("Error updating transaction:", error);
    setTransactions(prev => prev.map(t => t.id === transactionToUpdate.id ? transactionToUpdate : t).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };
  const deleteTransaction = async (id: string) => {
    const transactionToDelete = transactions.find(t => t.id === id);
    if (transactionToDelete?.attachments) {
      for (const attachment of transactionToDelete.attachments) {
        try {
          const url = new URL(attachment.url);
          const storagePath = url.pathname.split('/attachments/')[1];
          await supabase.storage.from('attachments').remove([storagePath]);
        } catch(e) { console.error("Failed to parse or delete attachment from storage:", e) }
      }
    }
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) return console.error("Error deleting transaction:", error);
    setTransactions(prev => prev.filter(t => t.id !== id));
  };
  
  // Documents CRUD
  const addDocument = async (title: string, fileName: string, base64Data: string) => {
      const storagePath = `documents/${crypto.randomUUID()}-${fileName}`;
      const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(storagePath, base64ToBlob(base64Data, 'image/jpeg'));
      if (uploadError) return console.error("Error uploading document:", uploadError);

      const newDocument = { title, file_name: fileName, storage_path: storagePath };
      const { data, error } = await supabase.from('documents').insert(newDocument).select();
      if (error) {
        console.error("Error saving document record:", error);
        // Attempt to clean up orphaned storage file
        await supabase.storage.from('attachments').remove([storagePath]);
        return;
      }
      if (data) setDocuments(prev => [data[0], ...prev]);
  };
  const deleteDocument = async (id: string) => {
      const docToDelete = documents.find(d => d.id === id);
      if (!docToDelete) return;

      const { error: storageError } = await supabase.storage.from('attachments').remove([docToDelete.storage_path]);
      if (storageError) console.error("Error deleting document from storage:", storageError);
      
      const { error: dbError } = await supabase.from('documents').delete().eq('id', id);
      if (dbError) return console.error("Error deleting document from DB:", dbError);

      setDocuments(prev => prev.filter(d => d.id !== id));
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
    }, 0);

    return balance;
  }, [accounts, transactions]);

  const contextValue = {
    isLoading,
    accounts, addAccount, updateAccount, deleteAccount, getAccountById,
    categories, addCategory, updateCategory, deleteCategory,
    transactions, addTransaction, updateTransaction, deleteTransaction,
    documents, addDocument, deleteDocument,
    calculateCurrentBalance,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};