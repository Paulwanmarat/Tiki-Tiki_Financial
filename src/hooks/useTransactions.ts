import { useMemo } from 'react';
import { Transaction, TransactionType } from '@/types/transaction';
import { useFinancialData } from '@/context/FinancialDataContext';

export function useTransactions(options?: {
  type?: TransactionType;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  const {
    transactions: allTransactions,
    transactionsLoading: loading,
    error,
    addTransaction,
    updateTransaction,
    removeTransaction,
    getTransactionById: getById,
    refreshTransactions: refresh,
  } = useFinancialData();

  const transactions = useMemo(() => {
    if (!options) return allTransactions;

    let filtered = allTransactions;
    if (options.type) {
      filtered = filtered.filter((t) => t.type === options.type);
    }
    if (options.categoryId) {
      filtered = filtered.filter((t) => t.categoryId === options.categoryId);
    }
    if (options.startDate) {
      filtered = filtered.filter((t) => t.date >= options.startDate!);
    }
    if (options.endDate) {
      filtered = filtered.filter((t) => t.date <= options.endDate!);
    }
    if (options.limit && options.limit > 0) {
      filtered = filtered.slice(0, options.limit);
    }
    return filtered;
  }, [
    allTransactions,
    options?.type,
    options?.categoryId,
    options?.startDate,
    options?.endDate,
    options?.limit,
  ]);

  return {
    transactions,
    loading,
    error,
    addTransaction,
    updateTransaction,
    removeTransaction,
    getById,
    refresh,
  };
}
