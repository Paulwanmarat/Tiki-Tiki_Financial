import { fetchWithAuth } from '@/services/ai/client';

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
  try {
    await fetchWithAuth('/api/history', { method: 'DELETE' });
  } catch (error) {
    console.error('Failed to clear AI history:', error);
    throw error;
  }
}
