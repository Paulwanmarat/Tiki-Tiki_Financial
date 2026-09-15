import { Transaction, TransactionType } from '@/types/transaction';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.41:3000';

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = await SecureStore.getItemAsync('userToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMsg = errorData.error || errorMsg;
    } catch (e) {
      // Ignore parsing errors
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

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
  // Ideally, there would be a specific GET /:id route, 
  // but for simplicity and backward compat, we can fetch all and filter or add route later.
  // We'll just fetch all for this specific ID if needed, though getTransactionById isn't heavily used outside tests.
  throw new Error("getTransactionById is not currently implemented in REST. Use getTransactions()");
}

export async function getTransactionCount(db: any, userId: string): Promise<number> {
  const transactions = await getTransactions(db, userId);
  return transactions.length;
}
