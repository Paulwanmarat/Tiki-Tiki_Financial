export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  description: string;
  date: string; // ISO 8601
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType | 'both';
}

export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  total: number;
  percentage: number;
  transactionCount: number;
}

export interface TransactionFilter {
  type?: TransactionType;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
}

export interface TransactionGroup {
  date: string;
  label: string;
  transactions: Transaction[];
  total: number;
}
