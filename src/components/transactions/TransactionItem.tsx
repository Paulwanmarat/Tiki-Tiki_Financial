import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Transaction } from '@/types/transaction';
import { getCategoryById } from '@/constants/categories';
import { formatCurrency, formatRelativeDate } from '@/utils/formatters';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: (transaction: Transaction) => void;
}

export function TransactionItem({ transaction, onPress }: TransactionItemProps) {
  const { colors } = useTheme();
  const category = getCategoryById(transaction.categoryId);
  const isIncome = transaction.type === 'income';

  return (
    <TouchableOpacity
      style={[styles.container, { borderBottomColor: colors.border }]}
      onPress={() => onPress?.(transaction)}
      activeOpacity={0.6}
    >
      <View style={[styles.iconContainer, { backgroundColor: category?.color + '20' }]}>
        <Ionicons
          name={(category?.icon as keyof typeof Ionicons.glyphMap) ?? 'help-circle'}
          size={22}
          color={category?.color ?? colors.textTertiary}
        />
      </View>
      <View style={styles.info}>
        <Text style={[styles.description, { color: colors.text }]} numberOfLines={1}>
          {transaction.description || category?.name || 'Unknown'}
        </Text>
        <Text style={[styles.category, { color: colors.textTertiary }]}>
          {category?.name ?? 'Unknown'} · {formatRelativeDate(transaction.date)}
        </Text>
      </View>
      <Text
        style={[
          styles.amount,
          { color: isIncome ? colors.income : colors.expense },
        ]}
      >
        {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  info: {
    flex: 1,
  },
  description: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    marginBottom: 2,
  },
  category: {
    fontSize: FontSize.xs,
  },
  amount: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginLeft: Spacing.sm,
  },
});
