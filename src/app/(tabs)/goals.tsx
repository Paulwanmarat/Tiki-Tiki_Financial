import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useGoals } from '@/hooks/useGoals';
import { Card } from '@/components/ui/Card';
import { EmptyState, LoadingState } from '@/components/ui/States';
import { formatCurrency, formatPercentage, formatDate } from '@/utils/formatters';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { GoalProgress } from '@/types/goal';

function GoalCard({ gp, colors, onPress }: { gp: GoalProgress; colors: any; onPress: () => void }) {
  const isCompleted = gp.goal.status === 'completed';
  const progressColor = isCompleted ? colors.success : colors.primary;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.goalCard}>
        <View style={styles.goalHeader}>
          <View style={styles.goalTitleRow}>
            {isCompleted && (
              <Ionicons name="checkmark-circle" size={20} color={colors.success} style={{ marginRight: 6 }} />
            )}
            <Text style={[styles.goalName, { color: colors.text }]} numberOfLines={1}>{gp.goal.name}</Text>
          </View>
          <Text style={[styles.goalPercentage, { color: progressColor }]}>
            {formatPercentage(gp.percentage, 0)}
          </Text>
        </View>

        <View style={[styles.progressBg, { backgroundColor: colors.surfaceHighlight }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: progressColor,
                width: `${Math.min(100, gp.percentage)}%`,
              },
            ]}
          />
        </View>

        <View style={styles.goalFooter}>
          <Text style={[styles.goalAmounts, { color: colors.textSecondary }]}>
            {formatCurrency(gp.goal.currentAmount)} / {formatCurrency(gp.goal.targetAmount)}
          </Text>
          {!isCompleted && gp.daysRemaining > 0 && (
            <Text style={[styles.goalDays, { color: colors.textTertiary }]}>
              {gp.daysRemaining} days left
            </Text>
          )}
        </View>

        {!isCompleted && gp.requiredMonthlySaving > 0 && (
          <Text style={[styles.goalHint, { color: colors.textTertiary }]}>
            Save {formatCurrency(gp.requiredMonthlySaving)}/month to reach your goal
          </Text>
        )}
      </Card>
    </TouchableOpacity>
  );
}

export default function GoalsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { goalsWithProgress, loading, refresh } = useGoals();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const activeGoals = goalsWithProgress.filter(gp => gp.goal.status === 'active');
  const completedGoals = goalsWithProgress.filter(gp => gp.goal.status === 'completed');

  if (loading && goalsWithProgress.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingState message="Loading goals..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Savings Goals</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/goal/add')}
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
            message="Set a financial goal to start tracking your progress."
          />
        ) : (
          <>
            {activeGoals.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  Active ({activeGoals.length})
                </Text>
                {activeGoals.map(gp => (
                  <GoalCard
                    key={gp.goal.id}
                    gp={gp}
                    colors={colors}
                    onPress={() => router.push(`/goal/${gp.goal.id}`)}
                  />
                ))}
              </View>
            )}

            {completedGoals.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  Completed ({completedGoals.length})
                </Text>
                {completedGoals.map(gp => (
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
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.huge },
  section: { marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  goalCard: { marginBottom: Spacing.md },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  goalTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  goalName: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, flex: 1 },
  goalPercentage: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginLeft: Spacing.sm },
  progressBg: {
    height: 10,
    borderRadius: 5,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  progressFill: { height: 10, borderRadius: 5 },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalAmounts: { fontSize: FontSize.sm },
  goalDays: { fontSize: FontSize.sm },
  goalHint: { fontSize: FontSize.xs, marginTop: Spacing.sm, fontStyle: 'italic' },
});
