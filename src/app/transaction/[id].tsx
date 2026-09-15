import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useTransactions } from '@/hooks/useTransactions';
import { Button } from '@/components/ui/Button';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { Card } from '@/components/ui/Card';
import { Transaction, TransactionType } from '@/types/transaction';
import { getCategoryById, getCategoriesByType } from '@/constants/categories';
import { formatCurrency, formatDate, formatDateForInput } from '@/utils/formatters';
import { validateTransaction } from '@/utils/validators';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

export default function TransactionDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getById, updateTransaction, removeTransaction } = useTransactions();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  // Edit fields
  const [editType, setEditType] = useState<TransactionType>('expense');
  const [editAmount, setEditAmount] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');

  useEffect(() => {
    loadTransaction();
  }, [id]);

  const loadTransaction = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const txn = await getById(id);
      if (txn) {
        setTransaction(txn);
        setEditType(txn.type);
        setEditAmount(txn.amount.toString());
        setEditCategoryId(txn.categoryId);
        setEditDescription(txn.description);
        setEditDate(formatDateForInput(new Date(txn.date)));
      } else {
        setError('Transaction not found');
      }
    } catch (err) {
      setError('Failed to load transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;

    const validation = validateTransaction({ amount: editAmount, categoryId: editCategoryId, date: editDate });
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setSaving(true);
      setErrors([]);
      await updateTransaction(id, {
        type: editType,
        amount: parseFloat(editAmount),
        categoryId: editCategoryId,
        description: editDescription.trim(),
        date: new Date(editDate).toISOString(),
      });
      setEditing(false);
      await loadTransaction();
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Failed to update']);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            try {
              await removeTransaction(id);
              router.back();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete transaction');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingState message="Loading transaction..." />
      </SafeAreaView>
    );
  }

  if (error || !transaction) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <ErrorState message={error ?? 'Transaction not found'} onRetry={loadTransaction} />
      </SafeAreaView>
    );
  }

  const category = getCategoryById(transaction.categoryId);
  const isIncome = transaction.type === 'income';
  const categories = getCategoriesByType(editType);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {editing ? 'Edit Transaction' : 'Transaction Details'}
          </Text>
          {!editing ? (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Ionicons name="create-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => { setEditing(false); loadTransaction(); }}>
              <Text style={{ color: colors.textSecondary, fontSize: FontSize.md }}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!editing ? (
            <>
              {/* View Mode */}
              <View style={[styles.amountCard, { backgroundColor: isIncome ? colors.income : colors.expense }]}>
                <Text style={styles.amountLabel}>{isIncome ? 'Income' : 'Expense'}</Text>
                <Text style={styles.amountValue}>
                  {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
                </Text>
              </View>

              <Card style={{ marginBottom: Spacing.lg }}>
                <DetailRow label="Category" value={category?.name ?? 'Unknown'} colors={colors} icon={category?.icon} iconColor={category?.color} />
                <DetailRow label="Description" value={transaction.description || 'No description'} colors={colors} />
                <DetailRow label="Date" value={formatDate(transaction.date, 'long')} colors={colors} />
                <DetailRow label="Created" value={formatDate(transaction.createdAt, 'medium')} colors={colors} isLast />
              </Card>

              <Button
                title="Delete Transaction"
                onPress={handleDelete}
                variant="danger"
                size="lg"
                icon={<Ionicons name="trash-outline" size={18} color="#FFF" />}
              />
            </>
          ) : (
            <>
              {/* Edit Mode */}
              <View style={[styles.typeToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.typeButton, editType === 'income' && { backgroundColor: colors.income + '20' }]}
                  onPress={() => { setEditType('income'); setEditCategoryId(''); }}
                >
                  <Text style={[styles.typeText, { color: editType === 'income' ? colors.income : colors.textTertiary }]}>Income</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, editType === 'expense' && { backgroundColor: colors.expense + '20' }]}
                  onPress={() => { setEditType('expense'); setEditCategoryId(''); }}
                >
                  <Text style={[styles.typeText, { color: editType === 'expense' ? colors.expense : colors.textTertiary }]}>Expense</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Amount</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={editAmount}
                  onChangeText={setEditAmount}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
                <View style={styles.categoryGrid}>
                  {categories.map(cat => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryItem,
                        {
                          backgroundColor: editCategoryId === cat.id ? cat.color + '20' : colors.surface,
                          borderColor: editCategoryId === cat.id ? cat.color : colors.border,
                        },
                      ]}
                      onPress={() => setEditCategoryId(cat.id)}
                    >
                      <Ionicons name={cat.icon as keyof typeof Ionicons.glyphMap} size={16} color={cat.color} />
                      <Text style={[styles.categoryLabel, { color: editCategoryId === cat.id ? colors.text : colors.textSecondary }]} numberOfLines={1}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  multiline
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={editDate}
                  onChangeText={setEditDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              {errors.length > 0 && (
                <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
                  {errors.map((err, i) => (
                    <Text key={i} style={[styles.errorText, { color: colors.danger }]}>• {err}</Text>
                  ))}
                </View>
              )}

              <Button title="Save Changes" onPress={handleSave} loading={saving} disabled={saving} size="lg" />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value, colors, icon, iconColor, isLast }: {
  label: string; value: string; colors: any; icon?: string; iconColor?: string; isLast?: boolean;
}) {
  return (
    <View style={[detailStyles.row, !isLast && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Text style={[detailStyles.label, { color: colors.textTertiary }]}>{label}</Text>
      <View style={detailStyles.valueRow}>
        {icon && <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={16} color={iconColor ?? colors.text} style={{ marginRight: 6 }} />}
        <Text style={[detailStyles.value, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md },
  label: { fontSize: FontSize.sm },
  valueRow: { flexDirection: 'row', alignItems: 'center' },
  value: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.huge },
  amountCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  amountLabel: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  amountValue: { color: '#FFF', fontSize: FontSize.hero, fontWeight: FontWeight.extrabold, marginTop: Spacing.sm },
  typeToggle: { flexDirection: 'row', borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.xs, marginBottom: Spacing.xl },
  typeButton: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  typeText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  fieldGroup: { marginBottom: Spacing.xl },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: Spacing.sm },
  textInput: { borderRadius: BorderRadius.md, borderWidth: 1, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: FontSize.md, minHeight: 48 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  categoryItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, gap: Spacing.sm },
  categoryLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  errorBox: { padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md },
  errorText: { fontSize: FontSize.sm, marginBottom: Spacing.xs },
});
