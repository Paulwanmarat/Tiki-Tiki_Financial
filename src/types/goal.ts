export type GoalStatus = 'active' | 'completed' | 'cancelled';

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // ISO 8601
  description: string;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface GoalProgress {
  goal: Goal;
  remainingAmount: number;
  percentage: number;
  requiredWeeklySaving: number;
  requiredMonthlySaving: number;
  estimatedCompletionDate: Date | null;
  isOnTrack: boolean;
  daysRemaining: number;
}
