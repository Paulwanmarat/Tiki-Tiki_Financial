import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useTransactions } from '@/hooks/useTransactions';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TransactionType } from '@/types/transaction';
import { getCategoriesByType } from '@/constants/categories';
import { validateTransaction } from '@/utils/validators';
import { formatDateForInput } from '@/utils/formatters';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

export default function AddTransactionScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const { addTransaction } = useTransactions();

  const [type, setType] = useState<TransactionType>(
    params.type === 'income' ? 'income' : 'expense'
  );
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(formatDateForInput(new Date()));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const categories = getCategoriesByType(type);

  const handleSave = async () => {
    const validation = validateTransaction({
      amount,
      categoryId,
      date,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setSaving(true);
      setErrors([]);
      await addTransaction({
        type,
        amount: parseFloat(amount),
        categoryId,
        description: description.trim(),
        date: new Date(date).toISOString(),
      });
      router.back();
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Failed to save transaction']);
    } finally {
      setSaving(false);
    }
  };

  const handleTypeToggle = (newType: TransactionType) => {
    setType(newType);
    setCategoryId(''); // Reset category when switching types
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Add Transaction</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Type Toggle */}
          <View style={[styles.typeToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                type === 'income' && { backgroundColor: colors.income + '20' },
              ]}
              onPress={() => handleTypeToggle('income')}
            >
              <Ionicons
                name="arrow-up-circle"
                size={20}
                color={type === 'income' ? colors.income : colors.textTertiary}
              />
              <Text
                style={[
                  styles.typeText,
                  { color: type === 'income' ? colors.income : colors.textTertiary },
                ]}
              >
                Income
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                type === 'expense' && { backgroundColor: colors.expense + '20' },
              ]}
              onPress={() => handleTypeToggle('expense')}
            >
              <Ionicons
                name="arrow-down-circle"
                size={20}
                color={type === 'expense' ? colors.expense : colors.textTertiary}
              />
              <Text
                style={[
                  styles.typeText,
                  { color: type === 'expense' ? colors.expense : colors.textTertiary },
                ]}
              >
                Expense
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amount */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Amount</Text>
            <View style={[styles.amountContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.currencySymbol, { color: colors.textTertiary }]}>₫</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                autoFocus
              />
            </View>
          </View>

          {/* Category */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
            <View style={styles.categoryGrid}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryItem,
                    {
                      backgroundColor: categoryId === cat.id
                        ? cat.color + '20'
                        : colors.surface,
                      borderColor: categoryId === cat.id ? cat.color : colors.border,
                    },
                  ]}
                  onPress={() => setCategoryId(cat.id)}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: cat.color + '20' }]}>
                    <Ionicons
                      name={cat.icon as keyof typeof Ionicons.glyphMap}
                      size={18}
                      color={cat.color}
                    />
                  </View>
                  <Text
                    style={[
                      styles.categoryLabel,
                      { color: categoryId === cat.id ? colors.text : colors.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Description (optional)</Text>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="e.g., Lunch at cafe"
              placeholderTextColor={colors.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={200}
            />
          </View>

          {/* Date */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textTertiary}
              value={date}
              onChangeText={setDate}
            />
          </View>

          {/* Errors */}
          {errors.length > 0 && (
            <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
              {errors.map((err, i) => (
                <Text key={i} style={[styles.errorText, { color: colors.danger }]}>
                  • {err}
                </Text>
              ))}
            </View>
          )}

          {/* Save Button */}
          <Button
            title={type === 'income' ? 'Add Income' : 'Add Expense'}
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            size="lg"
            style={{ marginTop: Spacing.lg }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.huge,
  },
  typeToggle: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  typeText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  fieldGroup: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.sm,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
  },
  currencySymbol: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    marginRight: Spacing.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    paddingVertical: Spacing.lg,
  },
  textInput: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    minHeight: 48,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  categoryIcon: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  errorBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  errorText: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.xs,
  },
});
