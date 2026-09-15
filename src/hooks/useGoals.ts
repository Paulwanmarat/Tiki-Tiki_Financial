import { useState, useEffect, useCallback } from 'react';
import { Goal, GoalStatus } from '@/types/goal';
import { GoalProgress } from '@/types/goal';
import * as goalDb from '@/services/database/goals';
import { calculateGoalProgress } from '@/utils/financeEngine';
import { useAuth } from '@/context/AuthContext';

export function useGoals(statusFilter?: GoalStatus) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGoals = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await goalDb.getGoals(null, user.id, { status: statusFilter });
      setGoals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load goals');
      console.error('Failed to load goals:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, statusFilter]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const addGoal = useCallback(async (data: {
    name: string;
    targetAmount: number;
    currentAmount?: number;
    targetDate: string;
    description?: string;
  }) => {
    if (!user) throw new Error('Not authenticated');
    try {
      const newGoal = await goalDb.insertGoal(null, user.id, data);
      setGoals(prev => [newGoal, ...prev]);
      return newGoal;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add goal';
      setError(message);
      throw new Error(message);
    }
  }, [user?.id]);

  const updateGoal = useCallback(async (id: string, data: {
    name?: string;
    targetAmount?: number;
    currentAmount?: number;
    targetDate?: string;
    description?: string;
    status?: GoalStatus;
  }) => {
    if (!user) throw new Error('Not authenticated');
    try {
      await goalDb.updateGoal(null, user.id, id, data);
      await loadGoals();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update goal';
      setError(message);
      throw new Error(message);
    }
  }, [user?.id, loadGoals]);

  const removeGoal = useCallback(async (id: string) => {
    if (!user) throw new Error('Not authenticated');
    try {
      await goalDb.deleteGoal(null, user.id, id);
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete goal';
      setError(message);
      throw new Error(message);
    }
  }, [user?.id]);

  const addMoney = useCallback(async (id: string, amount: number) => {
    if (!user) throw new Error('Not authenticated');
    try {
      await goalDb.updateGoalProgress(null, user.id, id, amount);
      await loadGoals();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add money';
      setError(message);
      throw new Error(message);
    }
  }, [user?.id, loadGoals]);

  const withdrawMoney = useCallback(async (id: string, amount: number) => {
    if (!user) throw new Error('Not authenticated');
    try {
      await goalDb.updateGoalProgress(null, user.id, id, -amount);
      await loadGoals();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to withdraw money';
      setError(message);
      throw new Error(message);
    }
  }, [user?.id, loadGoals]);

  const getById = useCallback(async (id: string) => {
    if (!user) return null;
    try {
      return await goalDb.getGoalById(null, user.id, id);
    } catch (err) {
      console.error('Failed to get goal:', err);
      return null;
    }
  }, [user?.id]);

  const goalsWithProgress: GoalProgress[] = goals.map(calculateGoalProgress);

  return {
    goals,
    goalsWithProgress,
    loading,
    error,
    addGoal,
    updateGoal,
    removeGoal,
    addMoney,
    withdrawMoney,
    getById,
    refresh: loadGoals,
  };
}
