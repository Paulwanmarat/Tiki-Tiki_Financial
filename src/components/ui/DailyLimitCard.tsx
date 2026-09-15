import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { DailySpendingLimit } from '@/types/finance';
import { Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { formatCurrency } from '@/utils/formatters';

interface DailyLimitCardProps {
  limit: DailySpendingLimit;
}

export function DailyLimitCard({ limit }: DailyLimitCardProps) {
  const { colors } = useTheme();
  
  const pct = limit.recommendedLimit > 0 
    ? Math.min(100, (limit.spentToday / limit.recommendedLimit) * 100) 
    : 100;
    
  let statusColor = colors.success;
  if (limit.spentToday > limit.recommendedLimit) {
    statusColor = colors.danger;
  } else if (limit.spentToday > limit.recommendedLimit * 0.8) {
    statusColor = colors.accent; // Note: 'accent' could be orange/yellow
  }
  
  if (limit.discretionaryMoney <= 0) {
    statusColor = colors.danger;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.textSecondary }]}>Today's Spending Limit</Text>
      
      <View style={styles.mainRow}>
        <Text style={[styles.recommendedAmount, { color: colors.text }]}>
          {formatCurrency(limit.recommendedLimit)}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusBadgeText, { color: statusColor }]}>
            {limit.spentToday > limit.recommendedLimit || limit.discretionaryMoney <= 0 ? 'Exceeded' : 'Available'}
          </Text>
        </View>
      </View>
      
      <Text style={[styles.statusMessage, { color: colors.text }]}>
        {limit.statusMessage}
      </Text>
      
      <View style={[styles.progressBar, { backgroundColor: colors.surfaceHighlight }]}>
        <View style={[styles.progressFill, { backgroundColor: statusColor, width: `${pct}%` }]} />
      </View>
      
      <View style={styles.statsRow}>
        <View>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Spent Today</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(limit.spentToday)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Remaining</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(limit.remaining)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    ...Shadow.sm,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.sm,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  recommendedAmount: {
    fontSize: 28,
    fontWeight: FontWeight.bold,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statusBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  statusMessage: {
    fontSize: FontSize.xs,
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: FontSize.xs,
    marginBottom: 4,
  },
  statValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
});
