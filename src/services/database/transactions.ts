import { Transaction, TransactionType } from '@/types/transaction';
import { fetchWithAuth } from '@/services/ai/client';

export async function insertTransaction(
  db: any, // db parameter retained for backwards compatibility with hooks, but unused
  userId: string,
  data: {
    type: TransactionType;
    amount: number;
    categoryId: string;
    description: string;
    date: string;
  }
): Promise<Transaction & { userId: string }> {
  return fetchWithAuth('/api/transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTransaction(
  db: any,
  userId: string,
  id: string,
  data: {
    type?: TransactionType;
    amount?: number;
    categoryId?: string;
    description?: string;
    date?: string;
  }
): Promise<void> {
  await fetchWithAuth(`/api/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTransaction(
  db: any,
  userId: string,
  id: string
): Promise<void> {
  await fetchWithAuth(`/api/transactions/${id}`, {
    method: 'DELETE',
  });
}

export async function getTransactions(
  db: any,
  userId: string,
  options?: {
    type?: TransactionType;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
    orderBy?: 'date' | 'amount' | 'createdAt';
    orderDir?: 'ASC' | 'DESC';
  }
): Promise<(Transaction & { userId: string })[]> {
  let queryStr = '';
  if (options) {
    const params = new URLSearchParams();
    if (options.type) params.append('type', options.type);
    if (options.categoryId) params.append('categoryId', options.categoryId);
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);

    const stringParams = params.toString();
    if (stringParams) queryStr = `?${stringParams}`;
  }

  return fetchWithAuth(`/api/transactions${queryStr}`);
}

export async function getTransactionById(
  db: any,
  userId: string,
  id: string
): Promise<(Transaction & { userId: string }) | null> {
  if (!id) return null;
  try {
    const data = await fetchWithAuth(`/api/transactions/${id}`);
    return data;
  } catch (error: any) {
    if (error?.status === 404 || error?.message?.includes('not found')) {
      return null;
    }
    // Fallback: search within getTransactions()
    try {
      const all = await getTransactions(db, userId);
      return all.find(t => t.id === id) || null;
    } catch {
      return null;
    }
  }
}

export async function getTransactionCount(db: any, userId: string): Promise<number> {
  const transactions = await getTransactions(db, userId);
  return transactions.length;
}
