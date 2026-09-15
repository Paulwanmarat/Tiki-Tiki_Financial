import { useState, useEffect, useCallback } from 'react';
import { Transaction, TransactionType } from '@/types/transaction';
import * as transactionDb from '@/services/database/transactions';
import { useAuth } from '@/context/AuthContext';

export function useTransactions(options?: {
  type?: TransactionType;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTransactions = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await transactionDb.getTransactions(null, user.id, options);
      setTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, options?.type, options?.categoryId, options?.startDate, options?.endDate, options?.limit]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const addTransaction = useCallback(async (data: {
    type: TransactionType;
    amount: number;
    categoryId: string;
    description: string;
    date: string;
  }) => {
    if (!user) throw new Error('Not authenticated');
    try {
      const newTransaction = await transactionDb.insertTransaction(null, user.id, data);
      setTransactions(prev => [newTransaction, ...prev]);
      return newTransaction;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add transaction';
      setError(message);
      throw new Error(message);
    }
  }, [user?.id]);

  const updateTransaction = useCallback(async (id: string, data: {
    type?: TransactionType;
    amount?: number;
    categoryId?: string;
    description?: string;
    date?: string;
  }) => {
    if (!user) throw new Error('Not authenticated');
    try {
      await transactionDb.updateTransaction(null, user.id, id, data);
      await loadTransactions(); // Refresh to get updated data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update transaction';
      setError(message);
      throw new Error(message);
    }
  }, [user?.id, loadTransactions]);

  const removeTransaction = useCallback(async (id: string) => {
    if (!user) throw new Error('Not authenticated');
    try {
      await transactionDb.deleteTransaction(null, user.id, id);
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete transaction';
      setError(message);
      throw new Error(message);
    }
  }, [user?.id]);

  const getById = useCallback(async (id: string) => {
    if (!user) return null;
    try {
      return await transactionDb.getTransactionById(null, user.id, id);
    } catch (err) {
      console.error('Failed to get transaction:', err);
      return null;
    }
  }, [user?.id]);

  return {
    transactions,
    loading,
    error,
    addTransaction,
    updateTransaction,
    removeTransaction,
    getById,
    refresh: loadTransactions,
  };
}
