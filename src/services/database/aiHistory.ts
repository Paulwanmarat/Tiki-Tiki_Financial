import { fetchWithAuth } from '@/services/ai/client';

export interface AIHistoryItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  contextSnapshot?: string;
  timestamp: string;
  goal_id?: string | null;
}

export async function saveAIHistory(
  db: any,
  userId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  contextSnapshot?: string,
  goalId?: string | null
): Promise<AIHistoryItem & { userId: string }> {
  return fetchWithAuth('/api/history', {
    method: 'POST',
    body: JSON.stringify({ role, content, contextSnapshot, goalId }),
  });
}

export async function getAIHistory(
  db: any,
  userId: string,
  limit: number = 50,
  goalId?: string | null
): Promise<(AIHistoryItem & { userId: string })[]> {
  const endpoint = goalId ? `/api/history?goalId=${encodeURIComponent(goalId)}` : '/api/history';
  const history = await fetchWithAuth(endpoint);
  return Array.isArray(history) ? history.slice(-limit) : [];
}

export async function clearAIHistory(
  db: any,
  userId: string,
  goalId?: string | null
): Promise<void> {
  try {
    const endpoint = goalId ? `/api/history?goalId=${encodeURIComponent(goalId)}` : '/api/history';
    await fetchWithAuth(endpoint, { method: 'DELETE' });
  } catch (error) {
    console.error('Failed to clear AI history:', error);
    throw error;
  }
}
