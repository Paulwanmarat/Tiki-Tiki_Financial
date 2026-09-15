import { useMemo } from 'react';
import { Transaction } from '@/types/transaction';
import { Goal } from '@/types/goal';
import {
  calculateFinanceSummary,
  analyzeSpendingHabits,
  getSpendingTrends,
  calculateGoalProgress,
  calculateDailySpendingLimit,
} from '@/utils/financeEngine';

export function useDashboard(transactions: Transaction[], goals: Goal[]) {
  const summary = useMemo(
    () => calculateFinanceSummary(transactions),
    [transactions]
  );

  const analysis = useMemo(
    () => analyzeSpendingHabits(transactions),
    [transactions]
  );

  const trends = useMemo(
    () => getSpendingTrends(transactions, 6),
    [transactions]
  );

  const recentTransactions = useMemo(
    () => transactions.slice(0, 5),
    [transactions]
  );

  const activeGoals = useMemo(
    () => goals.filter(g => g.status === 'active').map(calculateGoalProgress),
    [goals]
  );

  const dailyLimit = useMemo(
    () => calculateDailySpendingLimit(transactions, goals),
    [transactions, goals]
  );

  return {
    summary,
    analysis,
    trends,
    recentTransactions,
    activeGoals,
    dailyLimit,
  };
}
