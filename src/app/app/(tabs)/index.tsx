import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
  Platform,
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
import { PIGGY_LOGO } from '@/constants/assets';

export default function DashboardScreen() {
  const { colors, isDark } = useTheme();
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
        <LoadingState message="Loading your financial studio..." />
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
        {/* Studio Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.profileBtn, { borderColor: colors.primary }]}
            onPress={() => router.push('/profile' as any)}
            activeOpacity={0.8}
          >
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                  {(user?.username || user?.email || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <View style={styles.badgeRow}>
              <Text style={[styles.greeting, { color: colors.textSecondary }]}>{greeting}</Text>
              <View style={[styles.studioTag, { backgroundColor: colors.primary + '18' }]}>
                <Text style={[styles.studioTagText, { color: colors.primary }]}>STUDIO</Text>
              </View>
            </View>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {getUserDisplayName(user)}
            </Text>
          </View>

          {Platform.OS === 'web' && (
            <TouchableOpacity
              style={[styles.webBackBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
              onPress={() => router.push('/' as any)}
              activeOpacity={0.7}
            >
              <Ionicons name="globe-outline" size={14} color={colors.primary} />
              <Text style={[styles.webBackBtnText, { color: colors.textSecondary }]}>Website</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.settingsButton, { backgroundColor: colors.surface, borderColor: colors.border, marginLeft: Spacing.xs }]}
            onPress={() => router.push('/settings')}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Studio Balance Card */}
        <View style={[styles.balanceCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <View style={styles.balanceTop}>
            <View style={styles.brandEmblemRow}>
              <View style={[styles.logoCircle, { borderColor: colors.primary }]}>
                <Image
                  source={PIGGY_LOGO}
                  style={styles.logoImg}
                  alt="SPR Logo"
                />
              </View>
              <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>TOTAL NET LIQUIDITY</Text>
            </View>
            <View style={[styles.balanceBadge, { backgroundColor: colors.primary + '18' }]}>
              <Text style={[styles.balanceBadgeText, { color: colors.primary }]}>SPR ACTIVE</Text>
            </View>
          </View>

          <Text style={[styles.balanceAmount, { color: colors.text }]}>
            {hasData ? formatCurrency(summary.balance) : formatCurrency(0)}
          </Text>

          {/* Income & Expense Split */}
          <View style={[styles.balanceRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.balanceStat}>
              <View style={[styles.balanceStatIcon, { backgroundColor: colors.income + '18' }]}>
                <Ionicons name="trending-up" size={16} color={colors.income} />
              </View>
              <View>
                <Text style={[styles.balanceStatLabel, { color: colors.textTertiary }]}>Income Inflow</Text>
                <Text style={[styles.balanceStatValue, { color: colors.income }]}>{formatCurrency(summary.totalIncome)}</Text>
              </View>
            </View>

            <View style={[styles.balanceDivider, { backgroundColor: colors.border }]} />

            <View style={styles.balanceStat}>
              <View style={[styles.balanceStatIcon, { backgroundColor: colors.expense + '18' }]}>
                <Ionicons name="trending-down" size={16} color={colors.expense} />
              </View>
              <View>
                <Text style={[styles.balanceStatLabel, { color: colors.textTertiary }]}>Spent Outflow</Text>
                <Text style={[styles.balanceStatValue, { color: colors.expense }]}>{formatCurrency(summary.totalExpenses)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Studio Action Buttons */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push({ pathname: '/transaction/add', params: { type: 'income' } })}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.income + '18' }]}>
              <Ionicons name="add" size={20} color={colors.income} />
            </View>
            <Text style={[styles.quickActionText, { color: colors.text }]}>Income</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push({ pathname: '/transaction/add', params: { type: 'expense' } })}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.expense + '18' }]}>
              <Ionicons name="remove" size={20} color={colors.expense} />
            </View>
            <Text style={[styles.quickActionText, { color: colors.text }]}>Expense</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/simulator')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.secondary + '18' }]}>
              <Ionicons name="calculator-outline" size={18} color={colors.secondary} />
            </View>
            <Text style={[styles.quickActionText, { color: colors.text }]}>Simulate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/scanner')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#3B82F6' + '18' }]}>
              <Ionicons name="camera-outline" size={18} color="#3B82F6" />
            </View>
            <Text style={[styles.quickActionText, { color: colors.text }]}>Scan Menu</Text>
          </TouchableOpacity>
        </View>

        {/* Gamified Saving Pig Mascot Widget */}
        {activeGoals.length > 0 && (
          <SavingPig progress={activeGoals[0]} />
        )}
        
        {/* Daily Spending Limit Guardrail */}
        <DailyLimitCard limit={dailyLimit} />

        {/* Weekly & Monthly Spending Overview */}
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
            <Text style={[styles.overviewLabel, { color: colors.textTertiary }]}>Savings Rate</Text>
            <Text style={[styles.overviewValue, { color: colors.income }]}>
              {hasData ? formatPercentage(summary.savingsRate, 0) : '0%'}
            </Text>
          </Card>
        </View>

        {/* Category Spending Breakdown */}
        {summary.categorySpending.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Spending Categories</Text>
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
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Goals</Text>
              <TouchableOpacity onPress={() => router.push('/app/goals' as any)}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>View All →</Text>
              </TouchableOpacity>
            </View>
            {activeGoals.slice(0, 2).map(gp => (
              <TouchableOpacity key={gp.goal.id} onPress={() => router.push(`/goal/${gp.goal.id}`)} activeOpacity={0.8}>
                <Card style={styles.goalCard}>
                  <View style={styles.goalHeader}>
                    <View style={[styles.goalIcon, { backgroundColor: colors.primary + '18' }]}>
                      <Ionicons name="flag" size={16} color={colors.primary} />
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
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Pecuniary Alerts</Text>
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
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
            {recentTransactions.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/app/transactions' as any)}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>View Ledger →</Text>
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
              message="Add your first income or expense to start tracking your student finances."
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greeting: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  studioTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  studioTagText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginTop: 2 },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  webBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  webBackBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  balanceCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    ...Shadow.md,
  },
  balanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  brandEmblemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  logoImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  balanceBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
  },
  balanceBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.8,
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: FontWeight.extrabold,
    marginVertical: Spacing.sm,
    letterSpacing: -0.5,
  },
  balanceRow: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
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
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceStatLabel: {
    fontSize: FontSize.xs,
  },
  balanceStatValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  balanceDivider: {
    width: 1,
    height: 28,
    marginHorizontal: Spacing.xs,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  quickActionText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  overviewRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  overviewCard: {
    flex: 1,
    padding: Spacing.md,
    alignItems: 'center',
  },
  overviewLabel: {
    fontSize: FontSize.xs,
    marginBottom: Spacing.xs,
    fontWeight: FontWeight.medium,
  },
  overviewValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
  },
  seeAll: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  categoryName: {
    width: 80,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  categoryBarContainer: {
    flex: 1,
    height: 6,
    marginHorizontal: Spacing.sm,
    justifyContent: 'center',
  },
  categoryBar: {
    height: 6,
    borderRadius: BorderRadius.full,
    position: 'absolute',
  },
  categoryBarFill: {
    height: 6,
    borderRadius: BorderRadius.full,
    position: 'absolute',
  },
  categoryAmount: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    width: 70,
    textAlign: 'right',
  },
  goalCard: {
    marginBottom: Spacing.sm,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  goalIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  goalName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  goalSubtext: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  goalPercentage: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  goalProgressBg: {
    height: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  alertCard: {
    marginBottom: Spacing.sm,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  alertText: {
    flex: 1,
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
