export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  contextSnapshot?: string; // JSON string of financial context at time of message
}

export interface AIContext {
  balance: number;
  totalIncome: number;
  totalExpenses: number;
  monthlySpending: number;
  weeklySpending: number;
  dailyLimit?: number;
  spentToday?: number;
  remainingDailyLimit?: number;
  topCategories: { name: string; amount: number; percentage: number }[];
  activeGoals: { name: string; target: number; current: number; percentage: number; requiredSavings?: number }[];
  recentTransactions: { description: string; amount: number; category: string; date: string; type: string }[];
  monthOverMonthChange: number;
}

export interface MenuScanResult {
  items: MenuItem[];
  rawText: string;
  confidence: number;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  category?: string;
  isEdited?: boolean;
}

export interface MenuRecommendation {
  item: MenuItem;
  reason: string;
  tag: 'best-value' | 'cheapest' | 'within-budget' | 'recommended';
  score: number;
}

export interface AIServiceConfig {
  baseUrl: string;
  timeout: number;
}
