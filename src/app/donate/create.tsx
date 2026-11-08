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
import { useAuth } from '@/context/AuthContext';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { createDonateCampaign } from '@/services/database/donate';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { formatDateForInput } from '@/utils/formatters';

const CATEGORIES = [
  'Student Welfare',
  'Campus Green Initiative',
  'Emergency Student Aid',
  'Tech Lab Equipment',
  'Community Drives',
];

export default function CreateDonateCampaignScreen() {
  const { colors, isDark } = useTheme();
  const { currency, convertToBase } = useCurrency();
  const { user } = useAuth();
  const router = useRouter();

  const isAdmin = Boolean(
    user && (
      user.role === 'admin' ||
      user.role === 'owner' ||
      user.email?.toLowerCase() === 'paulwanmarat@gmail.com' ||
      user.email?.toLowerCase() === 'admin@spr.app' ||
      user.email?.toLowerCase().startsWith('admin@')
    )
  );

  const defaultEndDate = new Date();
  defaultEndDate.setMonth(defaultEndDate.getMonth() + 1);

  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [endDate, setEndDate] = useState(formatDateForInput(defaultEndDate));
  const [coverImage, setCoverImage] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.replace('/donate')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Admin Access Required</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }}>
          <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md }}>
            <Ionicons name="lock-closed" size={32} color="#EF4444" />
          </View>
          <Text style={{ fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: colors.text, marginBottom: Spacing.xs, textAlign: 'center' }}>
            Administrator Authorization Required
          </Text>
          <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl, maxWidth: 360, lineHeight: 22 }}>
            Public fundraising campaigns may only be created by designated school administrators and the Application Owner. Regular student accounts cannot create public donation drives.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#EC4899', paddingHorizontal: 24, paddingVertical: 12, borderRadius: BorderRadius.md }}
            onPress={() => router.replace('/donate')}
          >
            <Text style={{ color: '#FFF', fontWeight: FontWeight.bold }}>Return to Donate Hub</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleCreate = async () => {
    const errs: string[] = [];
    if (!title.trim() || title.trim().length < 4) {
      errs.push('Campaign title is required (minimum 4 characters).');
    }
    const numTarget = parseFloat(targetAmount);
    if (isNaN(numTarget) || numTarget <= 0) {
      errs.push('Please enter a valid fundraising target amount.');
    }
    if (!objective.trim() || objective.trim().length < 10) {
      errs.push('Please state a clear objective (minimum 10 characters).');
    }

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    try {
      setSaving(true);
      setErrors([]);

      const baseTarget = convertToBase(numTarget);

      const created = await createDonateCampaign({
        title: title.trim(),
        objective: objective.trim(),
        description: description.trim(),
        target_amount: baseTarget,
        category,
        end_date: new Date(endDate).toISOString(),
        cover_image: coverImage.trim(),
      });

      router.replace(`/donate/${created.id}` as any);
    } catch (err: any) {
      setErrors([err.message || 'Failed to create campaign']);
    } finally {
      setSaving(false);
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Launch Fundraising Campaign</Text>
          <TouchableOpacity
            style={[styles.launchBtn, { backgroundColor: '#EC4899' }]}
            onPress={handleCreate}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.launchBtnText}>Launch</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Transparency note */}
          <View style={[styles.transparencyBox, { backgroundColor: '#EC4899' + '12', borderColor: '#EC4899' + '35' }]}>
            <Ionicons name="heart-circle" size={22} color="#EC4899" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.transparencyTitle, { color: colors.text }]}>Transparent Student Fundraising</Text>
              <Text style={[styles.transparencyDesc, { color: colors.textSecondary }]}>
                All contributions are transparently tracked against your goal. Funds directly support your club or initiative.
              </Text>
            </View>
          </View>

          {errors.length > 0 && (
            <View style={[styles.errorBox, { backgroundColor: colors.expense + '15', borderColor: colors.expense + '40' }]}>
              {errors.map((err, i) => (
                <Text key={i} style={[styles.errorText, { color: colors.expense }]}>• {err}</Text>
              ))}
            </View>
          )}

          {/* Title */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Campaign Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Campus Solar Bench, Calculator Loan Bank..."
              placeholderTextColor={colors.textTertiary}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Target Amount */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Fundraising Target ({currency.symbol}) *</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.currPrefix, { color: colors.textTertiary }]}>{currency.symbol}</Text>
              <TextInput
                style={[styles.priceInput, { color: colors.text }]}
                placeholder="e.g. 15000"
                placeholderTextColor={colors.textTertiary}
                value={targetAmount}
                onChangeText={setTargetAmount}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Category */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Category *</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.chip,
                      { borderColor: isSelected ? '#EC4899' : colors.border },
                      isSelected && { backgroundColor: '#EC4899' + '18' },
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.chipText, { color: isSelected ? '#EC4899' : colors.textSecondary }]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Target End Date */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Target End Date *</Text>
            <DatePickerField
              value={endDate}
              onChange={setEndDate}
              minDate={formatDateForInput(new Date())}
            />
          </View>

          {/* Campaign Objective */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Core Objective & Goal Statement *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Equip 40 freshmen with STEM tools without upfront costs."
              placeholderTextColor={colors.textTertiary}
              value={objective}
              onChangeText={setObjective}
            />
          </View>

          {/* Detailed Story */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Full Story & Impact Details</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Explain how funds will be used, milestones, and campus benefits..."
              placeholderTextColor={colors.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Cover Image Link */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Cover Image URL (Optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="https://images.unsplash.com/... or project photo"
              placeholderTextColor={colors.textTertiary}
              value={coverImage}
              onChangeText={setCoverImage}
              autoCapitalize="none"
            />
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
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  launchBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.md,
    minWidth: 70,
    alignItems: 'center',
  },
  launchBtnText: {
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
  transparencyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  transparencyTitle: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
  transparencyDesc: {
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
});

