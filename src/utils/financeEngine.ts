import { Transaction } from '@/types/transaction';
import { Goal } from '@/types/goal';
import { GoalProgress } from '@/types/goal';
import {
  CategorySpending,
  FinanceSummary,
  SimulationParams,
  SimulationResult,
  GoalImpact,
  SpendingAnalysis,
  UnusualSpending,
  SpendingTrend,
  DailySpendingLimit,
} from '@/types/finance';
import { getCategoryById } from '@/constants/categories';

// ─── Core Calculations ───────────────────────────────────────────────

export function calculateBalance(transactions: Transaction[]): number {
  return transactions.reduce((balance, t) => {
    return t.type === 'income' ? balance + t.amount : balance - t.amount;
  }, 0);
}

export function calculateTotalIncome(transactions: Transaction[]): number {
  return transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
}

export function calculateTotalExpenses(transactions: Transaction[]): number {
  return transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
}

// ─── Time-Based Calculations ─────────────────────────────────────────

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfPreviousMonth(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() - 1);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfPreviousWeek(date: Date): Date {
  const startOfWeek = getStartOfWeek(date);
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  return startOfWeek;
}

function filterByDateRange(transactions: Transaction[], start: Date, end: Date): Transaction[] {
  return transactions.filter(t => {
    const d = new Date(t.date);
    return d >= start && d <= end;
  });
}

export function calculateMonthlySpending(transactions: Transaction[], month?: Date): number {
  const now = month ?? new Date();
  const start = getStartOfMonth(now);
  const end = new Date(now);

  return filterByDateRange(transactions, start, end)
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
}

export function calculateWeeklySpending(transactions: Transaction[], weekStart?: Date): number {
  const now = weekStart ?? new Date();
  const start = getStartOfWeek(now);
  const end = new Date(now);

  return filterByDateRange(transactions, start, end)
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
}

export function calculateMonthlyIncome(transactions: Transaction[], month?: Date): number {
  const now = month ?? new Date();
  const start = getStartOfMonth(now);
  const end = new Date(now);

  return filterByDateRange(transactions, start, end)
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
}

// ─── Category Analysis ───────────────────────────────────────────────

export function calculateCategorySpending(
  transactions: Transaction[],
  type: 'expense' | 'income' = 'expense'
): CategorySpending[] {
  const filtered = transactions.filter(t => t.type === type);
  const total = filtered.reduce((sum, t) => sum + t.amount, 0);

  const categoryMap = new Map<string, { amount: number; count: number }>();

  for (const t of filtered) {
    const existing = categoryMap.get(t.categoryId) ?? { amount: 0, count: 0 };
    existing.amount += t.amount;
    existing.count += 1;
    categoryMap.set(t.categoryId, existing);
  }

  const result: CategorySpending[] = [];
  for (const [categoryId, data] of categoryMap.entries()) {
    const category = getCategoryById(categoryId);
    result.push({
      categoryId,
      categoryName: category?.name ?? 'Unknown',
      categoryIcon: category?.icon ?? 'help-circle',
      categoryColor: category?.color ?? '#64748B',
      total: data.amount,
      percentage: total > 0 ? (data.amount / total) * 100 : 0,
      transactionCount: data.count,
    });
  }

  return result.sort((a, b) => b.total - a.total);
}

// ─── Goal Calculations ───────────────────────────────────────────────

export function calculateGoalProgress(goal: Goal): GoalProgress {
  const now = new Date();
  const targetDate = new Date(goal.targetDate);
  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
  const percentage = goal.targetAmount > 0
    ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
    : 0;
  const daysRemaining = Math.max(0, Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const weeksRemaining = Math.max(1, daysRemaining / 7);
  const monthsRemaining = Math.max(1, daysRemaining / 30);

  const requiredWeeklySaving = remainingAmount > 0 ? remainingAmount / weeksRemaining : 0;
  const requiredMonthlySaving = remainingAmount > 0 ? remainingAmount / monthsRemaining : 0;

  return {
    goal,
    remainingAmount,
    percentage,
    requiredWeeklySaving,
    requiredMonthlySaving,
    estimatedCompletionDate: targetDate,
    isOnTrack: percentage >= ((now.getTime() - new Date(goal.createdAt).getTime()) / (targetDate.getTime() - new Date(goal.createdAt).getTime())) * 100 || goal.status === 'completed',
    daysRemaining,
  };
}

export function calculateRequiredWeeklySavings(goal: Goal): number {
  return calculateGoalProgress(goal).requiredWeeklySaving;
}

export function calculateGoalSavingsRequirement(goal: Goal): number {
  // Goal requirements based on remaining amount and remaining time
  const now = new Date();
  const targetDate = new Date(goal.targetDate);
  if (targetDate <= now) return 0; // Deadline passed
  
  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
  if (remainingAmount === 0) return 0; // Completed
  
  const daysRemaining = Math.max(1, Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const monthsRemaining = Math.max(1, daysRemaining / 30);
  
  return remainingAmount / monthsRemaining; // Required savings per month
}

export function calculateSavingsPigProgress(goal: Goal): number {
  if (goal.targetAmount <= 0) return 0;
  const progress = (goal.currentAmount / goal.targetAmount) * 100;
  return Math.min(100, Math.max(0, progress));
}

export function calculateRequiredMonthlySavings(goal: Goal): number {
  return calculateGoalProgress(goal).requiredMonthlySaving;
}

export function estimateGoalCompletionDate(
  goal: Goal,
  monthlySavingsRate: number
): Date | null {
  if (monthlySavingsRate <= 0) return null;
  if (goal.currentAmount >= goal.targetAmount) return new Date();

  const remaining = goal.targetAmount - goal.currentAmount;
  const monthsNeeded = remaining / monthlySavingsRate;
  const completionDate = new Date();
  completionDate.setMonth(completionDate.getMonth() + Math.ceil(monthsNeeded));
  return completionDate;
}

// ─── Finance Summary ─────────────────────────────────────────────────

export function calculateFinanceSummary(transactions: Transaction[]): FinanceSummary {
  const totalIncome = calculateTotalIncome(transactions);
  const totalExpenses = calculateTotalExpenses(transactions);
  const balance = totalIncome - totalExpenses;
  const weeklySpending = calculateWeeklySpending(transactions);
  const monthlySpending = calculateMonthlySpending(transactions);
  const categorySpending = calculateCategorySpending(transactions, 'expense');
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  return {
    balance,
    totalIncome,
    totalExpenses,
    weeklySpending,
    monthlySpending,
    categorySpending,
    savingsRate,
  };
}

// ─── Daily Spending Limit ──────────────────────────────────────────────

export function calculateTodaySpent(transactions: Transaction[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return transactions
    .filter(t => {
      const d = new Date(t.date);
      return t.type === 'expense' && d >= today;
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

export function calculateDailySpendingLimit(
  transactions: Transaction[], 
  goals: Goal[]
): DailySpendingLimit {
  const currentBalance = calculateBalance(transactions);
  
  // 1. Required goal savings
  const activeGoals = goals.filter(g => g.status === 'active');
  const requiredGoalSavings = activeGoals.reduce((sum, g) => sum + calculateGoalSavingsRequirement(g), 0);
  
  // 2. Essential expenses
  const essentialCategories = ['rent', 'bills', 'groceries', 'transport', 'health'];
  
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Estimate based on last 30 days
  const estimatedEssentialExpenses = filterByDateRange(transactions, thirtyDaysAgo, now)
    .filter(t => t.type === 'expense' && essentialCategories.includes(t.categoryId))
    .reduce((sum, t) => sum + t.amount, 0);
    
  // What we already paid THIS month
  const essentialSpentThisMonth = filterByDateRange(transactions, startOfThisMonth, now)
    .filter(t => t.type === 'expense' && essentialCategories.includes(t.categoryId))
    .reduce((sum, t) => sum + t.amount, 0);
    
  // What we STILL need to hold back for the rest of the month
  const remainingEssentialExpected = Math.max(0, estimatedEssentialExpenses - essentialSpentThisMonth);
  
  // 3. Remaining days in the month
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(1, daysInMonth - now.getDate() + 1);
  
  // 4. Calculate discretionary money at start of today.
  // We want the limit for today to not shift just because we spend money today on discretionary things.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const spentTodayDiscretionary = transactions
    .filter(t => t.type === 'expense' && !essentialCategories.includes(t.categoryId) && new Date(t.date) >= today)
    .reduce((sum, t) => sum + t.amount, 0);
    
  const balanceBeforeTodayDiscretionary = currentBalance + spentTodayDiscretionary;
  
  const discretionaryMoney = balanceBeforeTodayDiscretionary - requiredGoalSavings - remainingEssentialExpected;
  
  // 5. Recommended limit
  let recommendedLimit = 0;
  if (discretionaryMoney > 0) {
    recommendedLimit = discretionaryMoney / remainingDays;
  }
  
  // 6. Spent today
  const spentToday = spentTodayDiscretionary;
  const remaining = Math.max(0, recommendedLimit - spentToday);
  
  let statusMessage = "You are within today's spending limit.";
  if (discretionaryMoney <= 0) {
    statusMessage = "Your current spending is above what your goals and essential expenses allow.";
  } else if (spentToday > recommendedLimit) {
    statusMessage = "You have exceeded today's recommended spending.";
  } else if (spentToday > recommendedLimit * 0.8) {
    statusMessage = "You are getting close to today's limit.";
  }

  return {
    recommendedLimit,
    spentToday,
    remaining,
    statusMessage,
    requiredGoalSavings,
    estimatedEssentialExpenses,
    discretionaryMoney,
    remainingDays
  };
}

// ─── Spending Simulator ──────────────────────────────────────────────

export function simulatePurchase(
  transactions: Transaction[],
  goals: Goal[],
  params: SimulationParams
): SimulationResult {
  const summary = calculateFinanceSummary(transactions);
  const balanceBefore = summary.balance;
  const balanceAfter = balanceBefore - params.purchaseAmount;

  // Monthly impact for recurring purchases
  let monthlyImpact = params.purchaseAmount;
  if (params.isRecurring && params.recurringFrequency === 'weekly') {
    monthlyImpact = params.purchaseAmount * 4.33;
  }

  // Discretionary = income - essential expenses
  const essentialCategories = ['rent', 'bills', 'groceries', 'transport', 'health'];
  const essentialSpending = transactions
    .filter(t => t.type === 'expense' && essentialCategories.includes(t.categoryId))
    .reduce((sum, t) => sum + t.amount, 0);
  const monthlyIncome = calculateMonthlyIncome(transactions);
  const remainingDiscretionary = monthlyIncome - (summary.monthlySpending + monthlyImpact - essentialSpending);

  // Goal impacts
  const averageMonthlySavings = monthlyIncome - summary.monthlySpending;
  const newMonthlySavings = averageMonthlySavings - monthlyImpact;

  const goalImpacts: GoalImpact[] = goals
    .filter(g => g.status === 'active')
    .map(goal => {
      const completionBefore = estimateGoalCompletionDate(goal, Math.max(0, averageMonthlySavings));
      const completionAfter = estimateGoalCompletionDate(goal, Math.max(0, newMonthlySavings));

      let delayDays = 0;
      if (completionBefore && completionAfter) {
        delayDays = Math.ceil((completionAfter.getTime() - completionBefore.getTime()) / (1000 * 60 * 60 * 24));
      }

      return {
        goalName: goal.name,
        completionDateBefore: completionBefore,
        completionDateAfter: completionAfter,
        delayDays: Math.max(0, delayDays),
        percentageImpact: averageMonthlySavings > 0 ? (monthlyImpact / averageMonthlySavings) * 100 : 0,
      };
    });

  // Warning level
  let warningLevel: 'safe' | 'caution' | 'danger' = 'safe';
  let warningMessage = 'This purchase fits within your budget.';

  if (balanceAfter < 0) {
    warningLevel = 'danger';
    warningMessage = 'This purchase would put you in a negative balance!';
  } else if (balanceAfter < summary.monthlySpending * 0.5) {
    warningLevel = 'caution';
    warningMessage = 'This purchase would leave you with less than half your typical monthly spending.';
  } else if (monthlyImpact > averageMonthlySavings * 0.5) {
    warningLevel = 'caution';
    warningMessage = 'This purchase would significantly impact your savings rate.';
  }

  const dailyLimitBefore = calculateDailySpendingLimit(transactions, goals);
  
  // Simulate the transaction being added today
  const simulatedTransaction: Transaction = {
    id: 'simulated',
    amount: params.purchaseAmount,
    type: 'expense',
    categoryId: params.categoryId || 'other',
    date: new Date().toISOString(),
    description: 'Simulated Purchase',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const dailyLimitAfter = calculateDailySpendingLimit([...transactions, simulatedTransaction], goals);

  return {
    balanceBefore,
    balanceAfter,
    remainingDiscretionary: Math.max(0, remainingDiscretionary),
    canAfford: balanceAfter >= 0,
    goalImpacts,
    monthlyImpact,
    warningLevel,
    warningMessage,
    dailyLimitBefore,
    dailyLimitAfter
  };
}

// ─── Spending Analysis ───────────────────────────────────────────────

export function analyzeSpendingHabits(transactions: Transaction[]): SpendingAnalysis {
  const now = new Date();
  const thisMonthStart = getStartOfMonth(now);
  const prevMonthStart = getStartOfPreviousMonth(now);
  const thisWeekStart = getStartOfWeek(now);
  const prevWeekStart = getStartOfPreviousWeek(now);

  const thisMonthTxns = filterByDateRange(transactions, thisMonthStart, now).filter(t => t.type === 'expense');
  const prevMonthTxns = filterByDateRange(transactions, prevMonthStart, thisMonthStart).filter(t => t.type === 'expense');
  const thisWeekTxns = filterByDateRange(transactions, thisWeekStart, now).filter(t => t.type === 'expense');
  const prevWeekTxns = filterByDateRange(transactions, prevWeekStart, thisWeekStart).filter(t => t.type === 'expense');

  const thisMonthTotal = thisMonthTxns.reduce((s, t) => s + t.amount, 0);
  const prevMonthTotal = prevMonthTxns.reduce((s, t) => s + t.amount, 0);
  const thisWeekTotal = thisWeekTxns.reduce((s, t) => s + t.amount, 0);
  const prevWeekTotal = prevWeekTxns.reduce((s, t) => s + t.amount, 0);

  const monthOverMonthChange = prevMonthTotal > 0
    ? ((thisMonthTotal - prevMonthTotal) / prevMonthTotal) * 100
    : 0;
  const weekOverWeekChange = prevWeekTotal > 0
    ? ((thisWeekTotal - prevWeekTotal) / prevWeekTotal) * 100
    : 0;

  // Unusual spending detection
  const thisMonthByCategory = calculateCategorySpending(thisMonthTxns, 'expense');
  const prevMonthByCategory = calculateCategorySpending(prevMonthTxns, 'expense');

  const unusualSpending: UnusualSpending[] = [];
  for (const current of thisMonthByCategory) {
    const previous = prevMonthByCategory.find(p => p.categoryId === current.categoryId);
    if (previous) {
      const change = ((current.total - previous.total) / previous.total) * 100;
      if (Math.abs(change) > 20) {
        unusualSpending.push({
          categoryName: current.categoryName,
          categoryIcon: current.categoryIcon,
          currentAmount: current.total,
          previousAmount: previous.total,
          changePercentage: change,
          direction: change > 0 ? 'increase' : 'decrease',
        });
      }
    }
  }

  const dayOfMonth = now.getDate();
  const dailyAverage = dayOfMonth > 0 ? thisMonthTotal / dayOfMonth : 0;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projectedMonthly = dailyAverage * daysInMonth;

  return {
    topCategories: thisMonthByCategory.slice(0, 5),
    monthOverMonthChange,
    weekOverWeekChange,
    unusualSpending: unusualSpending.sort((a, b) => Math.abs(b.changePercentage) - Math.abs(a.changePercentage)),
    dailyAverage,
    projectedMonthly,
  };
}

export function getSpendingTrends(
  transactions: Transaction[],
  periods: number = 6
): SpendingTrend[] {
  const now = new Date();
  const trends: SpendingTrend[] = [];

  for (let i = periods - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const monthExpenses = filterByDateRange(transactions, start, end)
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);

    trends.push({
      period: start.toISOString(),
      amount: monthExpenses,
      label: start.toLocaleDateString('en-US', { month: 'short' }),
    });
  }

  return trends;
}
