import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useTransactions } from '@/hooks/useTransactions';
import { TransactionItem } from '@/components/transactions/TransactionItem';
import { EmptyState, LoadingState } from '@/components/ui/States';
import { Transaction, TransactionType } from '@/types/transaction';
import { formatCurrency, getDayLabel } from '@/utils/formatters';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

interface TransactionGroup {
  date: string;
  label: string;
  transactions: Transaction[];
  total: number;
}

function groupTransactionsByDate(transactions: Transaction[]): TransactionGroup[] {
  const groups = new Map<string, Transaction[]>();

  for (const txn of transactions) {
    const dateKey = txn.date.split('T')[0];
    const existing = groups.get(dateKey) ?? [];
    existing.push(txn);
    groups.set(dateKey, existing);
  }

  return Array.from(groups.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, txns]) => ({
      date,
      label: getDayLabel(date),
      transactions: txns,
      total: txns.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0),
    }));
}

export default function TransactionsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { transactions, loading } = useTransactions();
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate high-level ledger stats
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    }
    return { income, expense, net: income - expense };
  }, [transactions]);

  const filtered = useMemo(() => {
    let result = transactions;
    if (filterType !== 'all') {
      result = result.filter((t) => t.type === filterType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) => t.description.toLowerCase().includes(q));
    }
    return result;
  }, [transactions, filterType, searchQuery]);

  const groups = useMemo(() => groupTransactionsByDate(filtered), [filtered]);

  if (loading && transactions.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingState message="Loading studio ledger..." />
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
            <Text style={[styles.eyebrow, { color: colors.primary }]}>STUDIO LEDGER</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Transactions</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/transaction/add')}
          accessibilityRole="button"
          accessibilityLabel="Add Transaction"
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Mini Ledger Stats Strip */}
      <View style={[styles.statsStrip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.statCell}>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>INFLOW</Text>
          <Text style={[styles.statVal, { color: colors.income }]}>+{formatCurrency(stats.income)}</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statCell}>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>OUTFLOW</Text>
          <Text style={[styles.statVal, { color: colors.expense }]}>-{formatCurrency(stats.expense)}</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statCell}>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>NET BALANCE</Text>
          <Text style={[styles.statVal, { color: stats.net >= 0 ? colors.income : colors.danger }]}>
            {formatCurrency(stats.net)}
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search items, notes, places..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['all', 'income', 'expense'] as const).map((type) => {
          const isSelected = filterType === type;
          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterTab,
                {
                  backgroundColor: isSelected ? colors.primary : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setFilterType(type)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: isSelected ? '#FFF' : colors.textSecondary },
                ]}
              >
                {type === 'all' ? 'All Entries' : type === 'income' ? 'Income (+)' : 'Expenses (-)'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Transaction List */}
      {groups.length > 0 ? (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.date}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item: group }) => (
            <View style={styles.group}>
              <View style={styles.groupHeader}>
                <View style={styles.dateTag}>
                  <Ionicons name="calendar-outline" size={13} color={colors.textTertiary} />
                  <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>
                    {group.label}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.groupTotal,
                    { color: group.total >= 0 ? colors.income : colors.expense },
                  ]}
                >
                  {group.total >= 0 ? '+' : ''}{formatCurrency(group.total)}
                </Text>
              </View>
              <View style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {group.transactions.map((txn) => (
                  <TransactionItem
                    key={txn.id}
                    transaction={txn}
                    onPress={() => router.push(`/transaction/${txn.id}`)}
                  />
                ))}
              </View>
            </View>
          )}
        />
      ) : (
        <EmptyState
          icon="receipt-outline"
          title={searchQuery ? 'No matching entries' : 'No transactions recorded'}
          message={
            searchQuery
              ? 'Try adjusting your search keywords or filter tab.'
              : 'Tap the + button to log your first income or expense.'
          }
        />
      )}
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
  statsStrip: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: '80%',
    alignSelf: 'center',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  statVal: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    paddingVertical: Spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.huge,
  },
  group: {
    marginBottom: Spacing.lg,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    paddingHorizontal: 2,
  },
  dateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  groupLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupTotal: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  groupCard: {
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
  },
});
