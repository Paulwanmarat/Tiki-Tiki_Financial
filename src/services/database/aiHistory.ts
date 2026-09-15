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

export interface AIHistoryItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  contextSnapshot?: string;
  timestamp: string;
}

export async function saveAIHistory(
  db: any,
  userId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  contextSnapshot?: string
): Promise<AIHistoryItem & { userId: string }> {
  return fetchWithAuth('/api/history', {
    method: 'POST',
    body: JSON.stringify({ role, content, contextSnapshot }),
  });
}

export async function getAIHistory(
  db: any,
  userId: string,
  limit: number = 50
): Promise<(AIHistoryItem & { userId: string })[]> {
  const history = await fetchWithAuth('/api/history');
  return history.slice(-limit); // Just a basic limit since API returns all for now.
}

export async function clearAIHistory(
  db: any,
  userId: string
): Promise<void> {
  // If clear isn't supported, we could ignore or iterate over all and delete.
  // For safety, let's just fetch all and delete them, or implement a backend route later.
  const history = await fetchWithAuth('/api/history');
  for (const item of history) {
    await fetchWithAuth(`/api/history/${item.id}`, { method: 'DELETE' });
  }
}
