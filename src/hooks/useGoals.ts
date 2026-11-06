import { useMemo } from 'react';
import { Goal, GoalStatus, GoalProgress } from '@/types/goal';
import { calculateGoalProgress } from '@/utils/financeEngine';
import { useFinancialData } from '@/context/FinancialDataContext';

export function useGoals(statusFilter?: GoalStatus) {
  const {
    goals: allGoals,
    goalsWithProgress: allGoalsWithProgress,
    goalsLoading: loading,
    error,
    addGoal,
    updateGoal,
    removeGoal,
    addMoney,
    withdrawMoney,
    getGoalById: getById,
    refreshGoals: refresh,
  } = useFinancialData();

  const goals = useMemo(() => {
    if (!statusFilter) return allGoals;
    return allGoals.filter((g) => g.status === statusFilter);
  }, [allGoals, statusFilter]);

  const goalsWithProgress: GoalProgress[] = useMemo(() => {
    if (!statusFilter) return allGoalsWithProgress;
    return goals.map(calculateGoalProgress);
  }, [allGoalsWithProgress, goals, statusFilter]);

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
    refresh,
  };
}
