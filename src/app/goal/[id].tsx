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
import { useGoals } from '@/hooks/useGoals';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { Goal } from '@/types/goal';
import { calculateGoalProgress } from '@/utils/financeEngine';
import { formatCurrency, formatPercentage, formatDate, formatDateForInput } from '@/utils/formatters';
import { validateAmount } from '@/utils/validators';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

export default function GoalDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getById, updateGoal, removeGoal, addMoney, withdrawMoney, refresh } = useGoals();

  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moneyAmount, setMoneyAmount] = useState('');
  const [moneyAction, setMoneyAction] = useState<'add' | 'withdraw' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTarget, setEditTarget] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const loadGoal = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const g = await getById(id);
      if (g) {
        setGoal(g);
        setEditName(g.name);
        setEditTarget(g.targetAmount.toString());
        setEditDate(formatDateForInput(new Date(g.targetDate)));
        setEditDescription(g.description);
      } else {
        setError('Goal not found');
      }
    } catch { setError('Failed to load goal'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadGoal(); }, [id]);

  const handleMoneyAction = async () => {
    if (!id || !moneyAction) return;
    const validation = validateAmount(moneyAmount);
    if (!validation.isValid) {
      Alert.alert('Invalid Amount', validation.errors[0]);
      return;
    }
    try {
      setProcessing(true);
      const amt = parseFloat(moneyAmount);
      if (moneyAction === 'add') {
        await addMoney(id, amt);
      } else {
        await withdrawMoney(id, amt);
      }
      setMoneyAmount('');
      setMoneyAction(null);
      await loadGoal();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Operation failed');
    } finally { setProcessing(false); }
  };

  const handleSaveEdit = async () => {
    if (!id) return;
    try {
      setProcessing(true);
      await updateGoal(id, {
        name: editName.trim(),
        targetAmount: parseFloat(editTarget),
        targetDate: new Date(editDate).toISOString(),
        description: editDescription.trim(),
      });
      setEditing(false);
      await loadGoal();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update');
    } finally { setProcessing(false); }
  };

  const handleDelete = () => {
    Alert.alert('Delete Goal', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          if (!id) return;
          try { await removeGoal(id); router.back(); }
          catch { Alert.alert('Error', 'Failed to delete'); }
        },
      },
    ]);
  };

  if (loading) return <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}><LoadingState /></SafeAreaView>;
  if (error || !goal) return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      <ErrorState message={error ?? 'Goal not found'} onRetry={loadGoal} />
    </SafeAreaView>
  );

  const progress = calculateGoalProgress(goal);
  const isCompleted = goal.status === 'completed';
  const progressColor = isCompleted ? colors.success : colors.primary;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{editing ? 'Edit Goal' : 'Goal Details'}</Text>
          {!editing ? (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Ionicons name="create-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => { setEditing(false); loadGoal(); }}>
              <Text style={{ color: colors.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!editing ? (
            <>
              {/* Progress Card */}
              <View style={[styles.progressCard, { backgroundColor: progressColor }]}>
                <Text style={styles.progressLabel}>{goal.name}</Text>
                <Text style={styles.progressPercentage}>{formatPercentage(progress.percentage, 0)}</Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${Math.min(100, progress.percentage)}%` }]} />
                </View>
                <Text style={styles.progressAmounts}>
                  {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                </Text>
              </View>

              {/* Stats */}
              <Card style={{ marginBottom: Spacing.lg }}>
                <StatRow label="Remaining" value={formatCurrency(progress.remainingAmount)} colors={colors} />
                <StatRow label="Target Date" value={formatDate(goal.targetDate, 'medium')} colors={colors} />
                <StatRow label="Days Left" value={progress.daysRemaining > 0 ? `${progress.daysRemaining} days` : 'Past due'} colors={colors} />
                <StatRow label="Weekly Saving Needed" value={formatCurrency(progress.requiredWeeklySaving)} colors={colors} />
                <StatRow label="Monthly Saving Needed" value={formatCurrency(progress.requiredMonthlySaving)} colors={colors} isLast />
              </Card>

              {goal.description ? (
                <Card style={{ marginBottom: Spacing.lg }}>
                  <Text style={[styles.descriptionLabel, { color: colors.textTertiary }]}>Description</Text>
                  <Text style={[styles.descriptionText, { color: colors.text }]}>{goal.description}</Text>
                </Card>
              ) : null}

              {/* Add/Withdraw Money */}
              {!isCompleted && (
                <View style={{ marginBottom: Spacing.lg }}>
                  {moneyAction ? (
                    <Card>
                      <Text style={[styles.moneyTitle, { color: colors.text }]}>
                        {moneyAction === 'add' ? 'Add Money' : 'Withdraw Money'}
                      </Text>
                      <View style={[styles.moneyInput, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
                        <Text style={[styles.currencySymbol, { color: colors.textTertiary }]}>₫</Text>
                        <TextInput
                          style={[styles.moneyTextInput, { color: colors.text }]}
                          placeholder="0"
                          placeholderTextColor={colors.textTertiary}
                          value={moneyAmount}
                          onChangeText={setMoneyAmount}
                          keyboardType="numeric"
                          autoFocus
                        />
                      </View>
                      <View style={styles.moneyActions}>
                        <Button title="Cancel" variant="ghost" onPress={() => { setMoneyAction(null); setMoneyAmount(''); }} style={{ flex: 1 }} />
                        <Button title={moneyAction === 'add' ? 'Add' : 'Withdraw'} onPress={handleMoneyAction} loading={processing} style={{ flex: 1 }} />
                      </View>
                    </Card>
                  ) : (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.success + '15' }]}
                        onPress={() => setMoneyAction('add')}
                      >
                        <Ionicons name="add-circle" size={24} color={colors.success} />
                        <Text style={[styles.actionBtnText, { color: colors.success }]}>Add Money</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.warning + '15' }]}
                        onPress={() => setMoneyAction('withdraw')}
                      >
                        <Ionicons name="remove-circle" size={24} color={colors.warning} />
                        <Text style={[styles.actionBtnText, { color: colors.warning }]}>Withdraw</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              <Button title="Delete Goal" onPress={handleDelete} variant="danger" size="lg" icon={<Ionicons name="trash-outline" size={18} color="#FFF" />} />
            </>
          ) : (
            <>
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
                <TextInput style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={editName} onChangeText={setEditName} />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Target Amount</Text>
                <TextInput style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={editTarget} onChangeText={setEditTarget} keyboardType="numeric" />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Target Date</Text>
                <TextInput style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={editDate} onChangeText={setEditDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textTertiary} />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
                <TextInput style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, minHeight: 80 }]} value={editDescription} onChangeText={setEditDescription} multiline />
              </View>
              <Button title="Save Changes" onPress={handleSaveEdit} loading={processing} size="lg" />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StatRow({ label, value, colors, isLast }: { label: string; value: string; colors: any; isLast?: boolean }) {
  return (
    <View style={[statStyles.row, !isLast && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Text style={[statStyles.label, { color: colors.textTertiary }]}>{label}</Text>
      <Text style={[statStyles.value, { color: colors.text }]}>{value}</Text>
    </View>
  );
}
const statStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.md },
  label: { fontSize: FontSize.sm },
  value: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.huge },
  progressCard: { borderRadius: BorderRadius.xl, padding: Spacing.xxl, alignItems: 'center', marginBottom: Spacing.lg },
  progressLabel: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.md, fontWeight: FontWeight.medium },
  progressPercentage: { color: '#FFF', fontSize: 56, fontWeight: FontWeight.extrabold, marginVertical: Spacing.sm },
  progressBarBg: { width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, marginBottom: Spacing.md, overflow: 'hidden' },
  progressBarFill: { height: 8, backgroundColor: '#FFF', borderRadius: 4 },
  progressAmounts: { color: 'rgba(255,255,255,0.9)', fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  descriptionLabel: { fontSize: FontSize.sm, marginBottom: Spacing.sm },
  descriptionText: { fontSize: FontSize.md, lineHeight: 22 },
  actionButtons: { flexDirection: 'row', gap: Spacing.md },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.lg, borderRadius: BorderRadius.lg, gap: Spacing.sm },
  actionBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  moneyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, marginBottom: Spacing.md },
  moneyInput: { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.md, borderWidth: 1, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  currencySymbol: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginRight: Spacing.sm },
  moneyTextInput: { flex: 1, fontSize: FontSize.xxl, fontWeight: FontWeight.bold, paddingVertical: Spacing.md },
  moneyActions: { flexDirection: 'row', gap: Spacing.md },
  fieldGroup: { marginBottom: Spacing.xl },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: Spacing.sm },
  textInput: { borderRadius: BorderRadius.md, borderWidth: 1, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: FontSize.md, minHeight: 48 },
});
