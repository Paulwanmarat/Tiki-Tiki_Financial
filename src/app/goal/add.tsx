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
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useGoals } from '@/hooks/useGoals';
import { Button } from '@/components/ui/Button';
import { validateGoal } from '@/utils/validators';
import { formatDateForInput } from '@/utils/formatters';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

export default function AddGoalScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { addGoal } = useGoals();

  const defaultDate = new Date();
  defaultDate.setMonth(defaultDate.getMonth() + 3);

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState(formatDateForInput(defaultDate));
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSave = async () => {
    const validation = validateGoal({ name, targetAmount, targetDate });
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setSaving(true);
      setErrors([]);
      await addGoal({
        name: name.trim(),
        targetAmount: parseFloat(targetAmount),
        currentAmount: currentAmount ? parseFloat(currentAmount) : 0,
        targetDate: new Date(targetDate).toISOString(),
        description: description.trim(),
      });
      router.back();
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Failed to create goal']);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>New Savings Goal</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Goal Name</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g., New laptop, Emergency fund"
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Target Amount</Text>
            <View style={[styles.amountContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.currencySymbol, { color: colors.textTertiary }]}>₫</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                value={targetAmount}
                onChangeText={setTargetAmount}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Already Saved (optional)</Text>
            <View style={[styles.amountContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.currencySymbol, { color: colors.textTertiary }]}>₫</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                value={currentAmount}
                onChangeText={setCurrentAmount}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Target Date</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textTertiary}
              value={targetDate}
              onChangeText={setTargetDate}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Description (optional)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, minHeight: 80 }]}
              placeholder="Why is this goal important to you?"
              placeholderTextColor={colors.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={300}
            />
          </View>

          {errors.length > 0 && (
            <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
              {errors.map((err, i) => (
                <Text key={i} style={[styles.errorText, { color: colors.danger }]}>• {err}</Text>
              ))}
            </View>
          )}

          <Button title="Create Goal" onPress={handleSave} loading={saving} disabled={saving} size="lg" style={{ marginTop: Spacing.lg }} />
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
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.huge },
  fieldGroup: { marginBottom: Spacing.xl },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: Spacing.sm },
  textInput: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    minHeight: 48,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
  },
  currencySymbol: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginRight: Spacing.sm },
  amountInput: { flex: 1, fontSize: FontSize.xxl, fontWeight: FontWeight.bold, paddingVertical: Spacing.md },
  errorBox: { padding: Spacing.md, borderRadius: BorderRadius.md },
  errorText: { fontSize: FontSize.sm, marginBottom: Spacing.xs },
});
