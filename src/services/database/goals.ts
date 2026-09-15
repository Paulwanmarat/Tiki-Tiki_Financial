import { Goal, GoalStatus } from '@/types/goal';
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

export async function insertGoal(
  db: any,
  userId: string,
  data: {
    name: string;
    targetAmount: number;
    currentAmount?: number;
    targetDate: string;
    description?: string;
  }
): Promise<Goal & { userId: string }> {
  return fetchWithAuth('/api/goals', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateGoal(
  db: any,
  userId: string,
  id: string,
  data: {
    name?: string;
    targetAmount?: number;
    currentAmount?: number;
    targetDate?: string;
    description?: string;
    status?: GoalStatus;
  }
): Promise<void> {
  await fetchWithAuth(`/api/goals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteGoal(
  db: any,
  userId: string,
  id: string
): Promise<void> {
  await fetchWithAuth(`/api/goals/${id}`, {
    method: 'DELETE',
  });
}

export async function getGoals(
  db: any,
  userId: string,
  options?: {
    status?: GoalStatus;
    limit?: number;
    offset?: number;
    orderBy?: 'targetDate' | 'createdAt' | 'targetAmount';
    orderDir?: 'ASC' | 'DESC';
  }
): Promise<(Goal & { userId: string })[]> {
  // Query strings can be added if backend supports it. For now, fetch all and filter locally if needed,
  // or rely on backend returning all active goals since there are rarely more than a few.
  const goals = await fetchWithAuth('/api/goals');
  
  if (options?.status) {
    return goals.filter((g: Goal) => g.status === options.status);
  }
  return goals;
}

export async function getGoalById(
  db: any,
  userId: string,
  id: string
): Promise<(Goal & { userId: string }) | null> {
  const goals = await fetchWithAuth('/api/goals');
  return goals.find((g: Goal) => g.id === id) || null;
}

export async function updateGoalProgress(
  db: any,
  userId: string,
  id: string,
  amountToAdd: number
): Promise<void> {
  const goal = await getGoalById(db, userId, id);
  if (!goal) throw new Error('Goal not found');
  
  const newAmount = Math.max(0, goal.currentAmount + amountToAdd);
  const newStatus = newAmount >= goal.targetAmount ? 'completed' : goal.status;
  
  await updateGoal(db, userId, id, {
    currentAmount: newAmount,
    status: newStatus
  });
}
