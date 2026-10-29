import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useGoals } from '@/hooks/useGoals';
import { Card } from '@/components/ui/Card';
import { EmptyState, LoadingState } from '@/components/ui/States';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { GoalProgress } from '@/types/goal';
import { PIGGY_LOGO } from '@/constants/assets';

function GoalCard({ gp, colors, onPress }: { gp: GoalProgress; colors: any; onPress: () => void }) {
  const isCompleted = gp.goal.status === 'completed';
  const progressPct = Math.min(100, Math.max(0, gp.percentage));
  const progressColor = isCompleted ? colors.success : colors.primary;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      <Card style={[styles.goalCard, { borderColor: isCompleted ? colors.success + '40' : colors.border }]}>
        <View style={styles.goalHeader}>
          <View style={styles.goalTitleRow}>
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: isCompleted ? colors.success + '15' : colors.primary + '15' },
              ]}
            >
              <Ionicons
                name={isCompleted ? 'trophy' : 'flag'}
                size={16}
                color={isCompleted ? colors.success : colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.goalName, { color: colors.text }]} numberOfLines={1}>
                {gp.goal.name}
              </Text>
              <Text style={[styles.goalStatusPill, { color: isCompleted ? colors.success : colors.textTertiary }]}>
                {isCompleted ? 'GOAL ACHIEVED' : `${gp.daysRemaining > 0 ? gp.daysRemaining + ' days left' : 'In Progress'}`}
              </Text>
            </View>
          </View>
          <View style={styles.percentageWrap}>
            <Text style={[styles.goalPercentage, { color: progressColor }]}>
              {formatPercentage(gp.percentage, 0)}
            </Text>
          </View>
        </View>

        {/* Milestone Progress Bar */}
        <View style={[styles.progressBg, { backgroundColor: colors.surfaceHighlight }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: progressColor,
                width: `${progressPct}%`,
              },
            ]}
          />
        </View>

        {/* Milestone Ticks */}
        <View style={styles.ticksRow}>
          <Text style={[styles.tickLabel, { color: colors.textTertiary }]}>0%</Text>
          <Text style={[styles.tickLabel, { color: colors.textTertiary }]}>25%</Text>
          <Text style={[styles.tickLabel, { color: colors.textTertiary }]}>50%</Text>
          <Text style={[styles.tickLabel, { color: colors.textTertiary }]}>75%</Text>
          <Text style={[styles.tickLabel, { color: colors.textTertiary }]}>100%</Text>
        </View>

        {/* Footer Numbers */}
        <View style={[styles.goalFooter, { borderTopColor: colors.border, borderTopWidth: 1 }]}>
          <View>
            <Text style={[styles.footerLabel, { color: colors.textTertiary }]}>ACCUMULATED</Text>
            <Text style={[styles.goalAmounts, { color: colors.text }]}>
              {formatCurrency(gp.goal.currentAmount)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.footerLabel, { color: colors.textTertiary }]}>TARGET</Text>
            <Text style={[styles.goalAmounts, { color: colors.primary, fontWeight: FontWeight.bold }]}>
              {formatCurrency(gp.goal.targetAmount)}
            </Text>
          </View>
        </View>

        {!isCompleted && gp.requiredMonthlySaving > 0 && (
          <View style={[styles.hintBanner, { backgroundColor: colors.surfaceHighlight }]}>
            <Ionicons name="bulb-outline" size={14} color={colors.warning} />
            <Text style={[styles.goalHint, { color: colors.textSecondary }]}>
              Save {formatCurrency(gp.requiredMonthlySaving)}/mo (~{formatCurrency(Math.round(gp.requiredMonthlySaving / 30))}/day) to stay on target
            </Text>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}

export default function GoalsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { goalsWithProgress, loading, refresh } = useGoals();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const activeGoals = goalsWithProgress.filter((gp) => gp.goal.status === 'active');
  const completedGoals = goalsWithProgress.filter((gp) => gp.goal.status === 'completed');

  // Vault Totals
  const vaultStats = useMemo(() => {
    let saved = 0;
    let target = 0;
    for (const gp of goalsWithProgress) {
      saved += gp.goal.currentAmount;
      target += gp.goal.targetAmount;
    }
    const overallPct = target > 0 ? (saved / target) * 100 : 0;
    return { saved, target, overallPct };
  }, [goalsWithProgress]);

  if (loading && goalsWithProgress.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingState message="Loading savings vault..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Studio Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.eyebrowRow}>
            <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.eyebrow, { color: colors.primary }]}>STUDIO VAULT</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Savings Goals</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/goal/add')}
          accessibilityRole="button"
          accessibilityLabel="Add Goal"
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {goalsWithProgress.length === 0 ? (
          <EmptyState
            icon="flag-outline"
            title="No savings goals yet"
            message="Every big goal starts with a small daily routine. Tap + to set your first milestone."
          />
        ) : (
          <>
            {/* Piggy Vault Summary Showcase */}
            <Card style={[styles.vaultCard, { backgroundColor: isDark ? '#1C1322' : '#FFFDF9', borderColor: colors.primary + '35' }]}>
              <View style={styles.vaultInner}>
                <Image
                  source={PIGGY_LOGO}
                  style={styles.vaultPiggy}
                  resizeMode="cover"
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.vaultLabel, { color: colors.primary }]}>VAULT PROGRESS</Text>
                  <Text style={[styles.vaultTotal, { color: colors.text }]}>
                    {formatCurrency(vaultStats.saved)}
                  </Text>
                  <Text style={[styles.vaultSub, { color: colors.textSecondary }]}>
                    of {formatCurrency(vaultStats.target)} combined target ({vaultStats.overallPct.toFixed(0)}%)
                  </Text>
                </View>
              </View>
            </Card>

            {/* Active Goals */}
            {activeGoals.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  Active Milestones ({activeGoals.length})
                </Text>
                {activeGoals.map((gp) => (
                  <GoalCard
                    key={gp.goal.id}
                    gp={gp}
                    colors={colors}
                    onPress={() => router.push(`/goal/${gp.goal.id}`)}
                  />
                ))}
              </View>
            )}

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  Completed Trophies ({completedGoals.length})
                </Text>
                {completedGoals.map((gp) => (
                  <GoalCard
                    key={gp.goal.id}
                    gp={gp}
                    colors={colors}
                    onPress={() => router.push(`/goal/${gp.goal.id}`)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 1.5,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F96A98',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.huge,
  },
  vaultCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1.5,
  },
  vaultInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  vaultPiggy: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  vaultLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  vaultTotal: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  vaultSub: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  goalCard: {
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  goalStatusPill: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  percentageWrap: {
    paddingLeft: Spacing.sm,
  },
  goalPercentage: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  progressBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  ticksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  tickLabel: {
    fontSize: 9,
    fontWeight: FontWeight.medium,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
  },
  footerLabel: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  goalAmounts: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  hintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  goalHint: {
    flex: 1,
    fontSize: FontSize.xs,
  },
});
