// ─── Currency formatting ──────────────────────────────────────────────────────
// Components should use useCurrency() from @/context/CurrencyContext for
// user-selected currency.  These standalone functions are kept as fallbacks for
// non-hook contexts (e.g. unit tests, server-side helpers) and default to THB.

import { formatCurrencyWith, formatCurrencyCompactWith, DEFAULT_CURRENCY } from '@/context/CurrencyContext';

export function getUserDisplayName(user?: { username?: string | null, email?: string } | null): string {
  if (!user) return 'Student';
  if (user.username) return user.username;
  if (user.email) {
    const localPart = user.email.split('@')[0];
    return localPart.charAt(0).toUpperCase() + localPart.slice(1);
  }
  return 'Student';
}

export function formatCurrency(amount: number): string {
  return formatCurrencyWith(amount, DEFAULT_CURRENCY);
}

export function formatCurrencyCompact(amount: number): string {
  return formatCurrencyCompactWith(amount, DEFAULT_CURRENCY);
}

export function formatDate(dateStr: string, style: 'short' | 'medium' | 'long' = 'medium'): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Invalid date';

  switch (style) {
    case 'short':
      return date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' });
    case 'medium':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    case 'long':
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Just now';
      return `${diffMins}m ago`;
    }
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export function formatPercentage(value: number, decimals: number = 1): string {
  if (isNaN(value)) return '0%';
  return `${value.toFixed(decimals)}%`;
}

export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === now.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return formatDate(dateStr, 'medium');
}
