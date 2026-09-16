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
import { useAuth } from '@/context/AuthContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useGoals } from '@/hooks/useGoals';
import { useDashboard } from '@/hooks/useDashboard';
import { Card } from '@/components/ui/Card';
import { EmptyState, LoadingState } from '@/components/ui/States';
import { SavingPig } from '@/components/ui/SavingPig';
import { DailyLimitCard } from '@/components/ui/DailyLimitCard';
import { TransactionItem } from '@/components/transactions/TransactionItem';
import { formatCurrency, formatPercentage, getUserDisplayName } from '@/utils/formatters';
import { Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '@/constants/theme';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { transactions, loading: txnLoading, refresh: refreshTxns } = useTransactions();
  const { goals, loading: goalsLoading, refresh: refreshGoals } = useGoals();
  const { summary, analysis, recentTransactions, activeGoals, dailyLimit } = useDashboard(transactions, goals);

  const loading = txnLoading || goalsLoading;
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshTxns(), refreshGoals()]);
    setRefreshing(false);
  };

  if (loading && transactions.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingState message="Loading your finances..." />
      </SafeAreaView>
    );
  }

  const hasData = transactions.length > 0;
  const greeting = getGreeting();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>{greeting} 👋</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {getUserDisplayName(user)}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.settingsButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
          <View style={styles.balanceTop}>
            <Text style={styles.balanceLabel}>Total Balance</Text>
            <View style={[styles.balanceBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={styles.balanceBadgeText}>SPR</Text>
            </View>
          </View>
          <Text style={styles.balanceAmount}>
            {hasData ? formatCurrency(summary.balance) : formatCurrency(0)}
          </Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceStat}>
              <View style={[styles.balanceStatIcon, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Ionicons name="trending-up" size={16} color="#fff" />
              </View>
              <View>
                <Text style={styles.balanceStatLabel}>Income</Text>
                <Text style={styles.balanceStatValue}>{formatCurrency(summary.totalIncome)}</Text>
              </View>
            </View>
            <View style={[styles.balanceDivider, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
            <View style={styles.balanceStat}>
              <View style={[styles.balanceStatIcon, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Ionicons name="trending-down" size={16} color="#fff" />
              </View>
              <View>
                <Text style={styles.balanceStatLabel}>Expenses</Text>
                <Text style={styles.balanceStatValue}>{formatCurrency(summary.totalExpenses)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Gamified Saving Pig */}
        {activeGoals.length > 0 && (
          <SavingPig progress={activeGoals[0]} />
        )}
        
        {/* Daily Spending Limit */}
        <DailyLimitCard limit={dailyLimit} />

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push({ pathname: '/transaction/add', params: { type: 'income' } })}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.income + '15' }]}>
              <Ionicons name="add-circle" size={22} color={colors.income} />
            </View>
            <Text style={[styles.quickActionText, { color: colors.text }]}>Income</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push({ pathname: '/transaction/add', params: { type: 'expense' } })}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.expense + '15' }]}>
              <Ionicons name="remove-circle" size={22} color={colors.expense} />
            </View>
            <Text style={[styles.quickActionText, { color: colors.text }]}>Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/simulator')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.secondary + '15' }]}>
              <Ionicons name="calculator" size={22} color={colors.secondary} />
            </View>
            <Text style={[styles.quickActionText, { color: colors.text }]}>Simulate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/scanner')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.accent + '15' }]}>
              <Ionicons name="scan" size={22} color={colors.accent} />
            </View>
            <Text style={[styles.quickActionText, { color: colors.text }]}>Scan</Text>
          </TouchableOpacity>
        </View>

        {/* Spending Overview */}
        <View style={styles.overviewRow}>
          <Card style={styles.overviewCard}>
            <Text style={[styles.overviewLabel, { color: colors.textTertiary }]}>This Week</Text>
            <Text style={[styles.overviewValue, { color: colors.text }]}>{formatCurrency(summary.weeklySpending)}</Text>
          </Card>
          <Card style={styles.overviewCard}>
            <Text style={[styles.overviewLabel, { color: colors.textTertiary }]}>This Month</Text>
            <Text style={[styles.overviewValue, { color: colors.text }]}>{formatCurrency(summary.monthlySpending)}</Text>
          </Card>
          <Card style={styles.overviewCard}>
            <Text style={[styles.overviewLabel, { color: colors.textTertiary }]}>Savings</Text>
            <Text style={[styles.overviewValue, { color: colors.income }]}>
              {hasData ? formatPercentage(summary.savingsRate, 0) : '0%'}
            </Text>
          </Card>
        </View>

        {/* Category Spending */}
        {summary.categorySpending.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Spending</Text>
            <Card>
              {summary.categorySpending.slice(0, 4).map((cat) => (
                <View key={cat.categoryId} style={styles.categoryRow}>
                  <View style={[styles.categoryDot, { backgroundColor: cat.categoryColor }]} />
                  <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={1}>
                    {cat.categoryName}
                  </Text>
                  <View style={styles.categoryBarContainer}>
                    <View
                      style={[styles.categoryBar, { backgroundColor: cat.categoryColor + '20', width: '100%' }]}
                    />
                    <View
                      style={[styles.categoryBarFill, { backgroundColor: cat.categoryColor, width: `${cat.percentage}%` }]}
                    />
                  </View>
                  <Text style={[styles.categoryAmount, { color: colors.textSecondary }]}>
                    {formatCurrency(cat.total)}
                  </Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* Active Goals */}
        {activeGoals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Goals</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/goals')}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
              </TouchableOpacity>
            </View>
            {activeGoals.slice(0, 2).map(gp => (
              <TouchableOpacity key={gp.goal.id} onPress={() => router.push(`/goal/${gp.goal.id}`)}>
                <Card style={styles.goalCard}>
                  <View style={styles.goalHeader}>
                    <View style={[styles.goalIcon, { backgroundColor: colors.primary + '15' }]}>
                      <Ionicons name="flag" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.goalName, { color: colors.text }]}>{gp.goal.name}</Text>
                      <Text style={[styles.goalSubtext, { color: colors.textTertiary }]}>
                        {formatCurrency(gp.goal.currentAmount)} of {formatCurrency(gp.goal.targetAmount)}
                      </Text>
                    </View>
                    <Text style={[styles.goalPercentage, { color: colors.primary }]}>
                      {formatPercentage(gp.percentage, 0)}
                    </Text>
                  </View>
                  <View style={[styles.goalProgressBg, { backgroundColor: colors.surfaceHighlight }]}>
                    <View
                      style={[styles.goalProgressFill, {
                        backgroundColor: colors.primary,
                        width: `${Math.min(100, gp.percentage)}%`,
                      }]}
                    />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Spending Alerts */}
        {analysis.unusualSpending.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Spending Alerts</Text>
            {analysis.unusualSpending.slice(0, 3).map((unusual, index) => (
              <Card key={index} style={[styles.alertCard, { borderLeftColor: unusual.direction === 'increase' ? colors.danger : colors.success, borderLeftWidth: 3 }]}>
                <View style={styles.alertContent}>
                  <Ionicons
                    name={unusual.direction === 'increase' ? 'trending-up' : 'trending-down'}
                    size={20}
                    color={unusual.direction === 'increase' ? colors.danger : colors.success}
                  />
                  <View style={styles.alertText}>
                    <Text style={[styles.alertTitle, { color: colors.text }]}>
                      {unusual.categoryName}
                    </Text>
                    <Text style={[styles.alertDescription, { color: colors.textSecondary }]}>
                      {Math.abs(unusual.changePercentage).toFixed(0)}% {unusual.direction} vs last month
                      {' · '}{formatCurrency(unusual.currentAmount)}
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent</Text>
            {recentTransactions.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
              </TouchableOpacity>
            )}
          </View>
          {recentTransactions.length > 0 ? (
            <Card>
              {recentTransactions.map(txn => (
                <TransactionItem
                  key={txn.id}
                  transaction={txn}
                  onPress={() => router.push(`/transaction/${txn.id}`)}
                />
              ))}
            </Card>
          ) : (
            <EmptyState
              icon="receipt-outline"
              title="No transactions yet"
              message="Add your first income or expense to start tracking."
            />
          )}
        </View>

        <View style={{ height: Spacing.huge }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  greeting: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginTop: 2 },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  balanceCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    marginBottom: Spacing.lg,
    ...Shadow.lg,
  },
  balanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  balanceLabel: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: FontWeight.medium,
  },
  balanceBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  balanceBadgeText: {
    fontSize: FontSize.xs,
    color: '#fff',
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  balanceAmount: {
    fontSize: 36,
    color: '#FFFFFF',
    fontWeight: FontWeight.extrabold,
    marginVertical: Spacing.sm,
  },
  balanceRow: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  balanceStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  balanceStatIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceStatLabel: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.6)',
  },
  balanceStatValue: {
    fontSize: FontSize.sm,
    color: '#FFFFFF',
    fontWeight: FontWeight.semibold,
  },
  balanceDivider: {
    width: 1,
    height: 32,
    marginHorizontal: Spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  overviewRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  overviewCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
  },
  overviewLabel: {
    fontSize: FontSize.xs,
    marginBottom: Spacing.xs,
  },
  overviewValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  section: { marginBottom: Spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  seeAll: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  categoryName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    width: 80,
  },
  categoryBarContainer: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    marginHorizontal: Spacing.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  categoryBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 6,
    borderRadius: 3,
  },
  categoryBarFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 6,
    borderRadius: 3,
  },
  categoryAmount: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    width: 90,
    textAlign: 'right',
  },
  goalCard: { marginBottom: Spacing.sm },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  goalIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  goalPercentage: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  goalProgressBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: 6,
    borderRadius: 3,
  },
  goalSubtext: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  alertCard: { marginBottom: Spacing.sm },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  alertTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  alertDescription: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
});
