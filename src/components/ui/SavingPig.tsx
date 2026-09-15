import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { GoalProgress } from '@/types/goal';
import { Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { formatCurrency } from '@/utils/formatters';

interface SavingPigProps {
  progress: GoalProgress;
}

export function SavingPig({ progress }: SavingPigProps) {
  const { colors } = useTheme();
  
  // Clamped percentage 0-100
  const pct = Math.min(100, Math.max(0, progress.percentage));
  
  let scaleTarget = 1;
  let text = "Just starting!";
  let emoji = "🐷";
  
  if (pct === 100) {
    scaleTarget = 1.5;
    text = "Goal reached!";
    emoji = "🎉🐷🎉";
  } else if (pct >= 75) {
    scaleTarget = 1.35;
    text = "Almost there!";
  } else if (pct >= 50) {
    scaleTarget = 1.2;
    text = "Halfway there!";
  } else if (pct >= 25) {
    scaleTarget = 1.1;
    text = "Making progress!";
  }
  
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: scaleTarget,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [scaleTarget, pct]);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.goalName, { color: colors.text }]}>{progress.goal.name}</Text>
      
      <View style={styles.pigArea}>
        <Animated.View style={[styles.pigContainer, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.pigEmoji}>{emoji}</Text>
        </Animated.View>
      </View>
      
      <Text style={[styles.statusText, { color: colors.primary }]}>{text}</Text>
      
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Saved</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(progress.goal.currentAmount)}</Text>
        </View>
        <View style={styles.statRight}>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Target</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(progress.goal.targetAmount)}</Text>
        </View>
      </View>
      
      <View style={[styles.progressBar, { backgroundColor: colors.surfaceHighlight }]}>
        <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${pct}%` }]} />
      </View>
      
      <Text style={[styles.progressText, { color: colors.textSecondary }]}>
        {pct.toFixed(0)}% Complete
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    ...Shadow.sm,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  goalName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.lg,
  },
  pigArea: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  pigContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pigEmoji: {
    fontSize: 56,
  },
  statusText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: Spacing.md,
  },
  stat: {
    alignItems: 'flex-start',
  },
  statRight: {
    alignItems: 'flex-end',
  },
  statLabel: {
    fontSize: FontSize.xs,
    marginBottom: 4,
  },
  statValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  progressText: {
    fontSize: FontSize.xs,
  },
});
