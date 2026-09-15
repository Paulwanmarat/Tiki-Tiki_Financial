import { Category } from '@/types/transaction';

export const DEFAULT_EXPENSE_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food & Dining', icon: 'restaurant', color: '#F97316', type: 'expense' },
  { id: 'transport', name: 'Transport', icon: 'car', color: '#3B82F6', type: 'expense' },
  { id: 'shopping', name: 'Shopping', icon: 'cart', color: '#EC4899', type: 'expense' },
  { id: 'entertainment', name: 'Entertainment', icon: 'game-controller', color: '#8B5CF6', type: 'expense' },
  { id: 'bills', name: 'Bills & Utilities', icon: 'receipt', color: '#EF4444', type: 'expense' },
  { id: 'education', name: 'Education', icon: 'school', color: '#06B6D4', type: 'expense' },
  { id: 'health', name: 'Health', icon: 'medkit', color: '#10B981', type: 'expense' },
  { id: 'groceries', name: 'Groceries', icon: 'basket', color: '#84CC16', type: 'expense' },
  { id: 'rent', name: 'Rent & Housing', icon: 'home', color: '#F59E0B', type: 'expense' },
  { id: 'personal', name: 'Personal Care', icon: 'person', color: '#D946EF', type: 'expense' },
  { id: 'subscriptions', name: 'Subscriptions', icon: 'card', color: '#14B8A6', type: 'expense' },
  { id: 'other-expense', name: 'Other', icon: 'ellipsis-horizontal', color: '#64748B', type: 'expense' },
];

export const DEFAULT_INCOME_CATEGORIES: Category[] = [
  { id: 'salary', name: 'Salary', icon: 'briefcase', color: '#10B981', type: 'income' },
  { id: 'freelance', name: 'Freelance', icon: 'laptop', color: '#6366F1', type: 'income' },
  { id: 'allowance', name: 'Allowance', icon: 'wallet', color: '#F59E0B', type: 'income' },
  { id: 'gift', name: 'Gift', icon: 'gift', color: '#EC4899', type: 'income' },
  { id: 'investment', name: 'Investment', icon: 'trending-up', color: '#06B6D4', type: 'income' },
  { id: 'refund', name: 'Refund', icon: 'arrow-undo', color: '#8B5CF6', type: 'income' },
  { id: 'other-income', name: 'Other', icon: 'ellipsis-horizontal', color: '#64748B', type: 'income' },
];

export const ALL_CATEGORIES: Category[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
];

export function getCategoryById(id: string): Category | undefined {
  return ALL_CATEGORIES.find(c => c.id === id);
}

export function getCategoriesByType(type: 'income' | 'expense'): Category[] {
  return ALL_CATEGORIES.filter(c => c.type === type || c.type === 'both');
}
