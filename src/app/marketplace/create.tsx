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
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useCurrency } from '@/context/CurrencyContext';
import { createMarketplaceListing } from '@/services/database/marketplace';
import { MarketplaceCategory, MarketplaceCondition, MarketplaceImageAttachment } from '@/types/marketplace';
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
  const [attachedImage, setAttachedImage] = useState<MarketplaceImageAttachment | null>(null);
  const [pickingImage, setPickingImage] = useState(false);
  const [contactInfo, setContactInfo] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handlePickFromGallery = async () => {
    try {
      setPickingImage(true);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Needed', 'Photo library permission is required to attach an item photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const dataUri = asset.base64 ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}` : asset.uri;
        setAttachedImage({
          uri: dataUri,
          name: asset.fileName || 'marketplace_item.jpg',
          type: asset.mimeType || 'image/jpeg',
          base64: asset.base64 || undefined,
        });
      }
    } catch (e: any) {
      console.error('Gallery pick error:', e);
      Alert.alert('Notice', 'Could not open photo gallery. You can still paste an image link if needed.');
    } finally {
      setPickingImage(false);
    }
  };

  const handlePickFromCamera = async () => {
    try {
      setPickingImage(true);
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Needed', 'Camera permission is required to snap an item photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const dataUri = asset.base64 ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}` : asset.uri;
        setAttachedImage({
          uri: dataUri,
          name: asset.fileName || 'camera_item.jpg',
          type: asset.mimeType || 'image/jpeg',
          base64: asset.base64 || undefined,
        });
      }
    } catch (e: any) {
      console.error('Camera capture error:', e);
      Alert.alert('Notice', 'Could not open camera.');
    } finally {
      setPickingImage(false);
    }
  };

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

      // Prioritize attached device image; fallback to manual URL if entered
      const primaryImage = attachedImage?.uri || imageUrl.trim();
      const images = primaryImage ? [primaryImage] : [];

      const created = await createMarketplaceListing({
        title: title.trim(),
        description: description.trim(),
        category,
        condition,
        price: basePrice,
        images,
        attached_image: attachedImage,
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

          {/* Item Photo Attachment (Directly from Device) */}
          <View style={styles.fieldGroup}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>
                Item Photo (Attach Directly)
              </Text>
              <View style={[styles.attachBadge, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '35' }]}>
                <Ionicons name="sparkles" size={11} color={colors.primary} />
                <Text style={[styles.attachBadgeText, { color: colors.primary }]}>No URL Required</Text>
              </View>
            </View>

            {attachedImage ? (
              <View style={[styles.attachedCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
                <Image source={{ uri: attachedImage.uri }} style={styles.attachedPreview} resizeMode="cover" />
                <View style={styles.attachedInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={[styles.attachedTitle, { color: colors.text }]} numberOfLines={1}>
                      {attachedImage.name || 'Photo Attached'}
                    </Text>
                  </View>
                  <Text style={[styles.attachedSub, { color: colors.textTertiary }]}>
                    Ready to publish with your listing
                  </Text>

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <TouchableOpacity
                      style={[styles.smallBtn, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}
                      onPress={handlePickFromGallery}
                      disabled={pickingImage}
                    >
                      <Ionicons name="images-outline" size={14} color={colors.text} />
                      <Text style={[styles.smallBtnText, { color: colors.text }]}>Change</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.smallBtn, { backgroundColor: colors.expense + '15', borderColor: colors.expense + '30' }]}
                      onPress={() => setAttachedImage(null)}
                    >
                      <Ionicons name="trash-outline" size={14} color={colors.expense} />
                      <Text style={[styles.smallBtnText, { color: colors.expense }]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <View style={[styles.uploadBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={{ alignItems: 'center', marginBottom: 12 }}>
                  <View style={[styles.uploadIconCircle, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name="camera-outline" size={26} color={colors.primary} />
                  </View>
                  <Text style={[styles.uploadBoxTitle, { color: colors.text }]}>
                    Snap or Attach Item Photo
                  </Text>
                  <Text style={[styles.uploadBoxSub, { color: colors.textTertiary }]}>
                    Pick directly from your camera roll or take a live photo
                  </Text>
                </View>

                <View style={styles.uploadBtnRow}>
                  <TouchableOpacity
                    style={[styles.attachActionBtn, { backgroundColor: colors.primary }]}
                    onPress={handlePickFromGallery}
                    disabled={pickingImage}
                    activeOpacity={0.85}
                  >
                    {pickingImage ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="images" size={16} color="#fff" />
                        <Text style={styles.attachActionBtnText}>Choose from Photos</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.attachActionBtnOutline, { borderColor: colors.border, backgroundColor: colors.surfaceHighlight }]}
                    onPress={handlePickFromCamera}
                    disabled={pickingImage}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="camera" size={16} color={colors.text} />
                    <Text style={[styles.attachActionBtnOutlineText, { color: colors.text }]}>Take Photo</Text>
                  </TouchableOpacity>
                </View>

                {/* Optional URL Fallback */}
                <View style={styles.urlFallbackContainer}>
                  <Text style={[styles.orDividerText, { color: colors.textTertiary }]}>
                    — or paste web image URL if preferred —
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, marginTop: 6 }]}
                    placeholder="https://images.unsplash.com/... (optional)"
                    placeholderTextColor={colors.textTertiary}
                    value={imageUrl}
                    onChangeText={setImageUrl}
                    autoCapitalize="none"
                  />
                </View>
              </View>
            )}
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
  attachBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  attachBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  attachedCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    padding: 12,
    gap: 12,
  },
  attachedPreview: {
    width: '100%',
    height: 180,
    borderRadius: BorderRadius.sm,
  },
  attachedInfo: {
    gap: 2,
  },
  attachedTitle: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
  attachedSub: {
    fontSize: 11,
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  smallBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  uploadBox: {
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  uploadBoxTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  uploadBoxSub: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 8,
  },
  uploadBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  attachActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  attachActionBtnText: {
    color: '#FFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  attachActionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  attachActionBtnOutlineText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  urlFallbackContainer: {
    marginTop: 12,
    width: '100%',
  },
  orDividerText: {
    fontSize: 11,
    textAlign: 'center',
  },
});

