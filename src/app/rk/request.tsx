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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useCurrency } from '@/context/CurrencyContext';
import { RKWordmark } from '@/components/ui/RKWordmark';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { submitTrylandRequest } from '@/services/database/tryland';
import { TrylandCategory } from '@/types/tryland';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { formatDateForInput } from '@/utils/formatters';

const CATEGORIES: TrylandCategory[] = [
  'Educational expenses',
  'School supplies',
  'Learning equipment',
  'School-related activities',
  'Essential student bills',
];

export default function RKRequestScreen() {
  const { colors, isDark } = useTheme();
  const { currency, convertToBase } = useCurrency();
  const router = useRouter();

  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + 14);

  const [billCategory, setBillCategory] = useState<TrylandCategory>('Educational expenses');
  const [amountRequested, setAmountRequested] = useState('');
  const [dueDate, setDueDate] = useState(formatDateForInput(defaultDueDate));
  const [explanation, setExplanation] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = async () => {
    const errs: string[] = [];
    const numAmt = parseFloat(amountRequested);
    if (isNaN(numAmt) || numAmt <= 0) {
      errs.push('Please enter a valid requested bill amount.');
    }
    if (!explanation.trim() || explanation.trim().length < 15) {
      errs.push('Please provide an explanation of at least 15 characters.');
    }
    if (!dueDate) {
      errs.push('Please specify the bill payment due date.');
    }

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    try {
      setSubmitting(true);
      setErrors([]);

      const baseAmount = convertToBase(numAmt);

      const result = await submitTrylandRequest({
        bill_category: billCategory,
        amount_requested: baseAmount,
        due_date: new Date(dueDate).toISOString(),
        explanation: explanation.trim(),
        document_url: documentUrl.trim(),
      });

      router.replace('/rk/my-requests' as any);
    } catch (err: any) {
      setErrors([err.message || 'Failed to submit request']);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <RKWordmark size="sm" />
            <Text style={[styles.subHeading, { color: colors.textSecondary }]}>Upload Bill · Random Kindness Pays</Text>
          </View>
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: '#10B981' }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Privacy & Safeguard Box */}
          <View style={[styles.privacyBox, { backgroundColor: '#10B981' + '12', borderColor: '#10B981' + '35' }]}>
            <Ionicons name="shield-checkmark" size={20} color="#10B981" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.privacyTitle, { color: colors.text }]}>Student Privacy & Dignity Guarantee</Text>
              <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
                Your full name, bills, student IDs, and personal phone numbers are NEVER publicly displayed. Sponsors only see your anonymous alias and requested amount.
              </Text>
            </View>
          </View>

          {errors.length > 0 && (
            <View style={[styles.errorBox, { backgroundColor: colors.expense + '15', borderColor: colors.expense + '40' }]}>
              {errors.map((e, idx) => (
                <Text key={idx} style={[styles.errorText, { color: colors.expense }]}>• {e}</Text>
              ))}
            </View>
          )}

          {/* Expense Category */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Expense Category *</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map((cat) => {
                const isSelected = billCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.chip,
                      { borderColor: isSelected ? '#10B981' : colors.border },
                      isSelected && { backgroundColor: '#10B981' + '18' },
                    ]}
                    onPress={() => setBillCategory(cat)}
                  >
                    <Text style={[styles.chipText, { color: isSelected ? '#10B981' : colors.textSecondary }]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Amount Requested */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Requested Bill Amount ({currency.symbol}) *</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.currPrefix, { color: colors.textTertiary }]}>{currency.symbol}</Text>
              <TextInput
                style={[styles.priceInput, { color: colors.text }]}
                placeholder="e.g. 2500"
                placeholderTextColor={colors.textTertiary}
                value={amountRequested}
                onChangeText={setAmountRequested}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Due Date */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Payment Due Date *</Text>
            <DatePickerField
              value={dueDate}
              onChange={setDueDate}
              minDate={formatDateForInput(new Date())}
            />
          </View>

          {/* Explanation */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Explanation & Student Context *</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Explain why this assistance is needed (e.g. unexpected laboratory fee, essential textbook edition, commuting cost spike)..."
              placeholderTextColor={colors.textTertiary}
              value={explanation}
              onChangeText={setExplanation}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Secure Document Verification */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Supporting Document URL / Reference (Private to Reviewers)
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="https://... secure PDF or photo link of tuition bill / invoice"
              placeholderTextColor={colors.textTertiary}
              value={documentUrl}
              onChangeText={setDocumentUrl}
              autoCapitalize="none"
            />
            <Text style={[styles.hintText, { color: colors.textTertiary }]}>
              Only authorized institutional reviewers will examine this to verify the expense.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  subHeading: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  submitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.md,
    minWidth: 70,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl + 40,
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
  },
  privacyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  privacyTitle: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
  privacyText: {
    fontSize: FontSize.xs,
    lineHeight: 18,
    marginTop: 2,
  },
  errorBox: {
    padding: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: 4,
  },
  errorText: {
    fontSize: FontSize.xs,
  },
  fieldGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.semibold,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 6,
  },
  currPrefix: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  priceInput: {
    flex: 1,
    height: '100%',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  input: {
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: FontSize.sm,
  },
  textArea: {
    minHeight: 100,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: 12,
    fontSize: FontSize.sm,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: FontSize.xs,
  },
  hintText: {
    fontSize: 10,
    marginTop: 4,
  },
});

