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
import { createMarketplaceListing } from '@/services/database/marketplace';
import { MarketplaceCategory, MarketplaceCondition } from '@/types/marketplace';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

const CATEGORIES: MarketplaceCategory[] = [
  'Textbooks',
  'Electronics',
  'Dorm & Living',
  'Clothing',
  'School Supplies',
  'Hobbies & Sports',
  'Other',
];

const CONDITIONS: { label: string; value: MarketplaceCondition; desc: string }[] = [
  { label: 'Brand New', value: 'new', desc: 'Unused, in original packaging' },
  { label: 'Like New', value: 'like_new', desc: 'Used once or twice, no visible wear' },
  { label: 'Good', value: 'good', desc: 'Fully functional, gentle cosmetic signs' },
  { label: 'Fair', value: 'fair', desc: 'Works well, has noticeable wear or scratches' },
  { label: 'Well Used', value: 'poor', desc: 'Heavily used but functional' },
];

export default function CreateMarketplaceListingScreen() {
  const { colors, isDark } = useTheme();
  const { currency, convertToBase } = useCurrency();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MarketplaceCategory>('Textbooks');
  const [condition, setCondition] = useState<MarketplaceCondition>('good');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handlePublish = async () => {
    const errs: string[] = [];
    if (!title.trim() || title.trim().length < 2) {
      errs.push('Item title is required (minimum 2 characters).');
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      errs.push('Please enter a valid non-negative selling price.');
    }

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    try {
      setSaving(true);
      setErrors([]);

      // Convert entered price to base currency (THB) for canonical storage
      const basePrice = convertToBase(numPrice);

      const images = imageUrl.trim() ? [imageUrl.trim()] : [];

      const created = await createMarketplaceListing({
        title: title.trim(),
        description: description.trim(),
        category,
        condition,
        price: basePrice,
        images,
        contact_info: contactInfo.trim(),
      });

      router.replace(`/marketplace/${created.id}` as any);
    } catch (err: any) {
      setErrors([err.message || 'Failed to create listing']);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>List Item for Sale</Text>
          <TouchableOpacity
            style={[styles.publishBtn, { backgroundColor: colors.primary }]}
            onPress={handlePublish}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.publishBtnText}>Publish</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Safeguard Notice */}
          <View style={[styles.safetyNotice, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
            <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
            <Text style={[styles.safetyText, { color: colors.text }]}>
              Campus Safe Exchange: Peer secondhand sales only. Prohibited: alcohol, tobacco, vapes, weapons, and exam materials.
            </Text>
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
            <Text style={[styles.label, { color: colors.textSecondary }]}>Item Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Thomas Calculus 14th Ed, TI-84 Plus, Dorm Desk Lamp"
              placeholderTextColor={colors.textTertiary}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          {/* Price */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Price ({currency.symbol}) *</Text>
            <View style={[styles.priceInputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.currencyPrefix, { color: colors.textTertiary }]}>{currency.symbol}</Text>
              <TextInput
                style={[styles.priceInput, { color: colors.text }]}
                placeholder="0.00"
                placeholderTextColor={colors.textTertiary}
                value={price}
                onChangeText={setPrice}
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
                      { borderColor: isSelected ? colors.primary : colors.border },
                      isSelected && { backgroundColor: colors.primary + '18' },
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.chipText, { color: isSelected ? colors.primary : colors.textSecondary }]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Condition */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Condition *</Text>
            <View style={styles.conditionList}>
              {CONDITIONS.map((cond) => {
                const isSelected = condition === cond.value;
                return (
                  <TouchableOpacity
                    key={cond.value}
                    style={[
                      styles.condOption,
                      { borderColor: isSelected ? colors.primary : colors.border, backgroundColor: colors.surface },
                      isSelected && { backgroundColor: colors.primary + '12' },
                    ]}
                    onPress={() => setCondition(cond.value)}
                  >
                    <View style={styles.condRadio}>
                      <View style={[styles.radioOuter, { borderColor: isSelected ? colors.primary : colors.border }]}>
                        {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                      </View>
                      <Text style={[styles.condLabel, { color: colors.text }]}>{cond.label}</Text>
                    </View>
                    <Text style={[styles.condDesc, { color: colors.textTertiary }]}>{cond.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Image URL / Link */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Cover Image URL (Optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="https://images.unsplash.com/... or cloud image link"
              placeholderTextColor={colors.textTertiary}
              value={imageUrl}
              onChangeText={setImageUrl}
              autoCapitalize="none"
            />
          </View>

          {/* Description */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Description & Notes</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Describe item condition, edition year, included accessories, or reasons for selling..."
              placeholderTextColor={colors.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Handover & Contact Info */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Campus Pickup / Contact Info</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Meet outside Central Library / LINE: @student_id"
              placeholderTextColor={colors.textTertiary}
              value={contactInfo}
              onChangeText={setContactInfo}
            />
            <Text style={[styles.hintText, { color: colors.textTertiary }]}>
              Shared with buyers who express confirmed interest.
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
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  publishBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.md,
    minWidth: 70,
    alignItems: 'center',
  },
  publishBtnText: {
    color: '#FFF',
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl + 20,
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
  },
  safetyNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  safetyText: {
    flex: 1,
    fontSize: FontSize.xs,
    lineHeight: 18,
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
    marginBottom: Spacing.md + 2,
  },
  label: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.semibold,
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: FontSize.sm,
  },
  textArea: {
    minHeight: 90,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: 12,
    fontSize: FontSize.sm,
    textAlignVertical: 'top',
  },
  priceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 6,
  },
  currencyPrefix: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  priceInput: {
    flex: 1,
    height: '100%',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
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
  conditionList: {
    gap: 8,
  },
  condOption: {
    padding: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  condRadio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  condLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  condDesc: {
    fontSize: FontSize.xs,
    marginLeft: 24,
    marginTop: 2,
  },
  hintText: {
    fontSize: 10,
    marginTop: 4,
  },
});

