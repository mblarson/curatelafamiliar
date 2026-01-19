import React, { createContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { BankAccount, Category, Transaction, Document, Attachment, NewAttachment, KeepAliveLog } from '../types';
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
  addCategoriesBatch: (categories: Omit<Category, 'id'>[]) => Promise<void>;
  updateCategory: (category: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id'>, newAttachments?: NewAttachment[]) => Promise<void>;
  addTransactionsBatch: (transactions: Omit<Transaction, 'id'>[]) => Promise<void>;
  updateTransaction: (transaction: Transaction, newAttachments?: NewAttachment[]) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  documents: Document[];
  addDocument: (title: string, fileName: string, base64Data: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  
  keepAliveLogs: KeepAliveLog[];
  
  calculateCurrentBalance: (accountId: string) => number;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [keepAliveLogs, setKeepAliveLogs] = useState<KeepAliveLog[]>([]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [accountsRes, categoriesRes, transactionsRes, documentsRes, keepAliveLogsRes] = await Promise.all([
        supabase.from('accounts').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('transactions').select('*').order('id', { ascending: false }), // Ordem de Inclusão (Baseado no ID gerado ou timestamp interno)
        supabase.from('documents').select('*').order('created_at', { ascending: false }),
        supabase.from('keep_alive_logs').select('*').order('pinged_at', { ascending: false })
      ]);

      if (accountsRes.error) console.error("Error fetching accounts:", accountsRes.error.message || accountsRes.error);
      if (categoriesRes.error) console.error("Error fetching categories:", categoriesRes.error.message || categoriesRes.error);
      if (transactionsRes.error) console.error("Error fetching transactions:", transactionsRes.error.message || transactionsRes.error);
      if (documentsRes.error) console.error("Error fetching documents:", documentsRes.error.message || documentsRes.error);
      if (keepAliveLogsRes.error) console.error("Error fetching logs:", keepAliveLogsRes.error.message || keepAliveLogsRes.error);
      
      const typedAccounts = (accountsRes.data || []).map(a => ({...a, dataAbertura: a.dataAbertura?.split('T')[0] || new Date().toISOString().split('T')[0]}));
      const typedTransactions = (transactionsRes.data || []).map(t => ({...t, date: t.date?.split('T')[0] || new Date().toISOString().split('T')[0]}));

      setAccounts(typedAccounts);
      setCategories(categoriesRes.data || []);
      setTransactions(typedTransactions);
      setDocuments(documentsRes.data || []);
      setKeepAliveLogs(keepAliveLogsRes.data || []);

    } catch (error: any)
    {
      console.error("Critical error in fetchData:", error.message || error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Accounts CRUD
  const addAccount = async (accountData: Omit<BankAccount, 'id'>): Promise<BankAccount | null> => {
    const newAccount = { ...accountData, id: crypto.randomUUID() };
    const { data, error } = await supabase.from('accounts').insert(newAccount).select();
    if (error) {
      console.error("Error adding account:", error.message);
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
    if (error) return console.error("Error updating account:", error.message);
    setAccounts(prev => prev.map(acc => acc.id === updatedAccount.id ? updatedAccount : acc));
  };
  const deleteAccount = async (id: string) => {
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (error) return console.error("Error deleting account:", error.message);
    setAccounts(prev => prev.filter(acc => acc.id !== id));
  };
  const getAccountById = (id: string) => accounts.find(acc => acc.id === id);

  // Categories CRUD
  const addCategory = async (categoryData: Omit<Category, 'id'>) => {
    const newCategory = { ...categoryData, id: crypto.randomUUID() };
    const { error } = await supabase.from('categories').insert(newCategory);
    if (error) return console.error("Error adding category:", error.message);
    setCategories(prev => [...prev, newCategory]);
  };
  const addCategoriesBatch = async (categoriesData: Omit<Category, 'id'>[]) => {
    const newCategories = categoriesData.map(c => ({ ...c, id: crypto.randomUUID() }));
    const { error } = await supabase.from('categories').insert(newCategories);
    if (error) {
        console.error("Error adding categories in batch:", error.message);
        throw error;
    }
    setCategories(prev => [...prev, ...newCategories].sort((a, b) => a.name.localeCompare(b.name)));
  };
  const updateCategory = async (updatedCategory: Category) => {
    const { error } = await supabase.from('categories').update(updatedCategory).eq('id', updatedCategory.id);
    if (error) return console.error("Error updating category:", error.message);
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
      const sanitizedName = attachment.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${crypto.randomUUID()}-${sanitizedName}`;
      
      console.log(`Iniciando upload de anexo: ${filePath}`);
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, base64ToBlob(attachment.data, 'image/jpeg'), {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        console.error('Error uploading attachment:', uploadError.message);
        continue;
      }
      
      const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(filePath);
      console.log(`Upload concluído com sucesso. URL: ${publicUrl}`);
      uploadedAttachments.push({ id: attachment.id, name: attachment.name, url: publicUrl });
    }
    return uploadedAttachments;
  }

  const addTransaction = async (transactionData: Omit<Transaction, 'id'>, newAttachments: NewAttachment[] = []) => {
    const uploadedAttachments = await handleAttachmentUpload(newAttachments);
    const newTransaction = { ...transactionData, id: crypto.randomUUID(), attachments: uploadedAttachments };
    const { error } = await supabase.from('transactions').insert(newTransaction);
    if (error) return console.error("Error adding transaction:", error.message);
    setTransactions(prev => [newTransaction, ...prev]);
  };
  const addTransactionsBatch = async (transactionsData: Omit<Transaction, 'id'>[]) => {
    const newTransactions = transactionsData.map(t => ({ ...t, id: crypto.randomUUID() }));
    const { error } = await supabase.from('transactions').insert(newTransactions);
    if (error) {
        console.error("Error adding transactions in batch:", error.message);
        throw error;
    }
    setTransactions(prev => [...newTransactions, ...prev]);
  };
  const updateTransaction = async (updatedTransactionData: Transaction, newAttachments: NewAttachment[] = []) => {
    const uploadedAttachments = await handleAttachmentUpload(newAttachments);
    const finalAttachments = [...(updatedTransactionData.attachments || []), ...uploadedAttachments];
    const transactionToUpdate = { ...updatedTransactionData, attachments: finalAttachments };
    const { error } = await supabase.from('transactions').update(transactionToUpdate).eq('id', transactionToUpdate.id);
    if (error) return console.error("Error updating transaction:", error.message);
    setTransactions(prev => prev.map(t => t.id === transactionToUpdate.id ? transactionToUpdate : t));
  };
  const deleteTransaction = async (id: string) => {
    const transactionToDelete = transactions.find(t => t.id === id);
    if (transactionToDelete?.attachments) {
      for (const attachment of transactionToDelete.attachments) {
        try {
          const url = new URL(attachment.url);
          const storagePath = url.pathname.split('/attachments/')[1];
          await supabase.storage.from('attachments').remove([storagePath]);
        } catch(e) { console.error("Failed to delete attachment from storage:", e) }
      }
    }
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
        console.error("Error deleting transaction:", error.message);
        throw error;
    }
    setTransactions(prev => prev.filter(t => t.id !== id));
  };
  
  // Documents CRUD
  const addDocument = async (title: string, fileName: string, base64Data: string) => {
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `documents/${crypto.randomUUID()}-${sanitizedName}`;
      
      const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(storagePath, base64ToBlob(base64Data, 'image/jpeg'), {
            contentType: 'image/jpeg',
            upsert: true
          });
      
      if (uploadError) {
          console.error("Error uploading document:", uploadError.message);
          throw uploadError;
      }

      const newDocument = { title, file_name: fileName, storage_path: storagePath };
      const { data, error } = await supabase.from('documents').insert(newDocument).select();
      if (error) {
        console.error("Error saving document record:", error.message);
        await supabase.storage.from('attachments').remove([storagePath]);
        throw error;
      }
      if (data) setDocuments(prev => [data[0], ...prev]);
  };
  const deleteDocument = async (id: string) => {
      const docToDelete = documents.find(d => d.id === id);
      if (!docToDelete) return;

      const { error: storageError } = await supabase.storage.from('attachments').remove([docToDelete.storage_path]);
      if (storageError) console.error("Error deleting document from storage:", storageError.message);
      
      const { error: dbError } = await supabase.from('documents').delete().eq('id', id);
      if (dbError) return console.error("Error deleting document from DB:", dbError.message);

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
    categories, addCategory, addCategoriesBatch, updateCategory, deleteCategory,
    transactions, addTransaction, addTransactionsBatch, updateTransaction, deleteTransaction,
    documents, addDocument, deleteDocument,
    keepAliveLogs,
    calculateCurrentBalance,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};