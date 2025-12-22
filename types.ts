
export enum CategoryType {
  RECEITA = 'RECEITA',
  DESPESA = 'DESPESA',
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
}

export enum AccountType {
  CONTA_CORRENTE = 'Conta Corrente',
  CONTA_POUPANCA = 'Conta Poupança',
}

export interface BankAccount {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
}

export enum TransactionNature {
  RECEITA = 'RECEITA',
  DESPESA = 'DESPESA',
}

export interface Transaction {
  id: string;
  description: string;
  nature: TransactionNature;
  accountId: string;
  categoryId: string;
  date: string; // ISO format
  value: number;
  type: 'checking_account' | 'credit_card';
  scannedReceiptImage?: string; // Base64 encoded image
}
