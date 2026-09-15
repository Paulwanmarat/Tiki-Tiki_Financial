import { CategorySpending } from './transaction';
import { GoalProgress } from './goal';

export { CategorySpending };

export interface FinanceSummary {
  balance: number;
  totalIncome: number;
  totalExpenses: number;
  weeklySpending: number;
  monthlySpending: number;
  categorySpending: CategorySpending[];
  savingsRate: number;
}

export interface SimulationParams {
  purchaseAmount: number;
  categoryId?: string;
  isRecurring?: boolean;
  recurringFrequency?: 'weekly' | 'monthly';
}

export interface DailySpendingLimit {
  recommendedLimit: number;
  spentToday: number;
  remaining: number;
  statusMessage: string;
  requiredGoalSavings: number;
  estimatedEssentialExpenses: number;
  discretionaryMoney: number;
  remainingDays: number;
}

export interface SimulationResult {
  balanceBefore: number;
  balanceAfter: number;
  remainingDiscretionary: number;
  canAfford: boolean;
  goalImpacts: GoalImpact[];
  monthlyImpact: number;
  warningLevel: 'safe' | 'caution' | 'danger';
  warningMessage: string;
  dailyLimitBefore?: DailySpendingLimit;
  dailyLimitAfter?: DailySpendingLimit;
}

export interface GoalImpact {
  goalName: string;
  completionDateBefore: Date | null;
  completionDateAfter: Date | null;
  delayDays: number;
  percentageImpact: number;
}

export interface SpendingAnalysis {
  topCategories: CategorySpending[];
  monthOverMonthChange: number;
  weekOverWeekChange: number;
  unusualSpending: UnusualSpending[];
  dailyAverage: number;
  projectedMonthly: number;
}

export interface UnusualSpending {
  categoryName: string;
  categoryIcon: string;
  currentAmount: number;
  previousAmount: number;
  changePercentage: number;
  direction: 'increase' | 'decrease';
}

export interface SpendingTrend {
  period: string;
  amount: number;
  label: string;
}
