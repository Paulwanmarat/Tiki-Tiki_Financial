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
  const { colors } = useTheme();
  const router = useRouter();
  const { transactions, loading } = useTransactions();
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    let result = transactions;
    if (filterType !== 'all') {
      result = result.filter(t => t.type === filterType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        t => t.description.toLowerCase().includes(q)
      );
    }
    return result;
  }, [transactions, filterType, searchQuery]);

  const groups = useMemo(() => groupTransactionsByDate(filtered), [filtered]);

  if (loading && transactions.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingState message="Loading transactions..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Transactions</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/transaction/add')}
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search transactions..."
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
        {(['all', 'income', 'expense'] as const).map(type => (
          <TouchableOpacity
            key={type}
            style={[
              styles.filterTab,
              {
                backgroundColor: filterType === type ? colors.primary : colors.surface,
                borderColor: filterType === type ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setFilterType(type)}
          >
            <Text
              style={[
                styles.filterText,
                { color: filterType === type ? '#FFF' : colors.textSecondary },
              ]}
            >
              {type === 'all' ? 'All' : type === 'income' ? 'Income' : 'Expenses'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transaction List */}
      {groups.length > 0 ? (
        <FlatList
          data={groups}
          keyExtractor={item => item.date}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item: group }) => (
            <View style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>
                  {group.label}
                </Text>
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
                {group.transactions.map(txn => (
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
          title={searchQuery ? 'No matches found' : 'No transactions yet'}
          message={
            searchQuery
              ? 'Try a different search term.'
              : 'Tap the + button to add your first transaction.'
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
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: Spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filterTab: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
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
    marginBottom: Spacing.sm,
  },
  groupLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  groupTotal: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  groupCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
  },
});
