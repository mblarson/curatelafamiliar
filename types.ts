
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
  dataAbertura: string; // ISO format
}

export enum TransactionNature {
  RECEITA = 'RECEITA',
  DESPESA = 'DESPESA',
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
}

// Para uso transitório no formulário antes do upload
export interface NewAttachment {
  id: string;
  name: string;
  data: string; // Base64 encoded string
  type: 'image_base64_jpeg';
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
  attachments?: Attachment[];
  comments?: string;
}

export interface Document {
    id: string;
    title: string;
    file_name: string;
    storage_path: string;
    created_at: string;
}

export interface KeepAliveLog {
  id: string;
  pinged_at: string;
}
