import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { GoalProgress } from '@/types/goal';
import { Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { formatCurrency } from '@/utils/formatters';
import { PIGGY_LOGO } from '@/constants/assets';

interface SavingPigProps {
  progress: GoalProgress;
}

export function SavingPig({ progress }: SavingPigProps) {
  const { colors } = useTheme();
  
  // Clamped percentage 0-100
  const pct = Math.min(100, Math.max(0, progress.percentage));
  
  let scaleTarget = 1;
  let text = "Just starting your savings!";
  let badgeLabel = "SEED STAGE";
  
  if (pct === 100) {
    scaleTarget = 1.25;
    text = "Goal fully unlocked. Milestone secured.";
    badgeLabel = "GOAL ACHIEVED";
  } else if (pct >= 75) {
    scaleTarget = 1.18;
    text = "Final sprint! Almost there!";
    badgeLabel = "FINAL SPRINT";
  } else if (pct >= 50) {
    scaleTarget = 1.12;
    text = "Halfway to your target!";
    badgeLabel = "HALFWAY";
  } else if (pct >= 25) {
    scaleTarget = 1.06;
    text = "Making steady progress!";
    badgeLabel = "BUILDING UP";
  }
  
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  
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
      <View style={styles.topRow}>
        <View style={[styles.badge, { backgroundColor: colors.primary + '18' }]}>
          <Text style={[styles.badgeText, { color: colors.primary }]}>{badgeLabel}</Text>
        </View>
        <Text style={[styles.progressPct, { color: colors.primary }]}>{pct.toFixed(0)}%</Text>
      </View>

      <Text style={[styles.goalName, { color: colors.text }]} numberOfLines={1}>
        {progress.goal.name}
      </Text>
      
      <View style={styles.pigArea}>
        <Animated.View style={[styles.pigContainer, { transform: [{ scale: scaleAnim }] }]}>
          <View style={[styles.mascotRing, { borderColor: colors.primary }]}>
            <Image
              source={PIGGY_LOGO}
              style={styles.mascotImage}
              alt="Piggy Mascot"
            />
          </View>
        </Animated.View>
      </View>
      
      <Text style={[styles.statusText, { color: colors.primary }]}>{text}</Text>
      
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Saved in Vault</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    ...Shadow.sm,
    marginBottom: Spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: Spacing.xs,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
  },
  progressPct: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extrabold,
  },
  goalName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    marginBottom: Spacing.md,
  },
  pigArea: {
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  pigContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
    borderWidth: 2.5,
    backgroundColor: '#000',
    shadowColor: '#F96A98',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  mascotImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  statusText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: Spacing.sm,
  },
  stat: {
    alignItems: 'flex-start',
  },
  statRight: {
    alignItems: 'flex-end',
  },
  statLabel: {
    fontSize: FontSize.xs,
    marginBottom: 2,
    fontWeight: FontWeight.medium,
  },
  statValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
});
