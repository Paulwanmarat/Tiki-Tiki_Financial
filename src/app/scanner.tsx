import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { scanMenuImage, MenuItem, OCRError } from '@/services/ocr/scanner';
import { getMenuRecommendations } from '@/services/ai/client';

const BUDGET_PRESETS = ['50', '80', '120', '200'];

export default function ScannerScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [budget, setBudget] = useState<string>('');
  const [status, setStatus] = useState<
    'idle' | 'uploading' | 'ocr_failed' | 'reviewing' | 'analyzing' | 'done'
  >('idle');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [recommendation, setRecommendation] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const pickImage = async (useCamera: boolean = false) => {
    try {
      let result;
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission required', 'Camera permission is needed to scan menus.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: 'images',
          quality: 0.8,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission required', 'Gallery permission is needed to select menus.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'images',
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
        setStatus('idle');
        setMenuItems([]);
        setErrorMessage('');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const processImage = async () => {
    if (!imageUri) return;
    setStatus('uploading');
    setErrorMessage('');

    try {
      const items = await scanMenuImage(imageUri);
      setMenuItems(items);
      setStatus('reviewing');
    } catch (error: any) {
      if (error instanceof OCRError) {
        setErrorMessage('Menu scanning is currently unavailable because OCR is not configured.');
        setStatus('ocr_failed');
      } else {
        setErrorMessage(error.message || 'Failed to process image');
        setStatus('ocr_failed');
      }
    }
  };

  const getRecommendations = async () => {
    const budgetNum = parseFloat(budget);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      Alert.alert('Invalid Budget', 'Please enter a valid budget amount in ฿.');
      return;
    }

    setStatus('analyzing');
    setErrorMessage('');
    try {
      const result = await getMenuRecommendations(menuItems, budgetNum);
      setRecommendation(result);
      setStatus('done');
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to get recommendations from AI');
      setStatus('reviewing');
    }
  };

  const addManualItem = () => {
    const newItem: MenuItem = { id: Date.now().toString(), name: 'New Item', price: 0 };
    setMenuItems([...menuItems, newItem]);
  };

  const updateItem = (id: string, field: 'name' | 'price', value: string) => {
    setMenuItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          if (field === 'price') {
            return { ...item, price: parseFloat(value) || 0 };
          }
          return { ...item, name: value };
        }
        return item;
      })
    );
  };

  const removeItem = (id: string) => {
    setMenuItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Studio Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.closeBtn, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.headerPre, { color: colors.primary }]}>STUDIO VISION OCR</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Menu Scanner</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {errorMessage ? (
          <View style={[styles.errorBox, { backgroundColor: colors.danger + '15', borderColor: colors.danger + '40' }]}>
            <Ionicons name="warning-outline" size={20} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>{errorMessage}</Text>
          </View>
        ) : null}

        {status === 'idle' || status === 'uploading' ? (
          <Card style={[styles.uploadCard, { borderColor: colors.border }]}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
            ) : (
              <View style={styles.placeholderContainer}>
                <View style={[styles.cameraCircle, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="camera-outline" size={48} color={colors.primary} />
                </View>
                <Text style={[styles.placeholderTitle, { color: colors.text }]}>Snap or Upload a Canteen Menu</Text>
                <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                  AI parses the prices and suggests the highest nutrition-to-baht meal combo.
                </Text>
              </View>
            )}

            <View style={styles.buttonRow}>
              <Button
                title="Camera"
                onPress={() => pickImage(true)}
                variant="secondary"
                style={{ flex: 1 }}
                icon={<Ionicons name="camera" size={18} color={colors.primary} style={{ marginRight: 8 }} />}
                disabled={status === 'uploading'}
              />
              <Button
                title="Gallery"
                onPress={() => pickImage(false)}
                variant="secondary"
                style={{ flex: 1 }}
                icon={<Ionicons name="image" size={18} color={colors.primary} style={{ marginRight: 8 }} />}
                disabled={status === 'uploading'}
              />
            </View>

            {imageUri && (
              <Button
                title={status === 'uploading' ? 'Extracting Prices...' : 'Run Menu OCR'}
                onPress={processImage}
                style={{ marginTop: Spacing.md, width: '100%' }}
                disabled={status === 'uploading'}
              />
            )}
          </Card>
        ) : null}

        {status === 'ocr_failed' && (
          <Card style={[styles.uploadCard, { borderColor: colors.danger + '40' }]}>
            <View style={styles.placeholderContainer}>
              <Ionicons name="alert-circle-outline" size={56} color={colors.danger} />
              <Text style={[styles.placeholderTitle, { color: colors.text }]}>OCR Unassisted</Text>
              <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                {errorMessage}
              </Text>
            </View>
            <View style={{ width: '100%', gap: Spacing.md }}>
              <Button title="Try Scanning Again" onPress={processImage} variant="primary" />
              <Button
                title="Enter Items Manually"
                onPress={() => {
                  setMenuItems([
                    { id: '1', name: 'Pad Kra Pao', price: 50 },
                    { id: '2', name: 'Fried Rice w/ Egg', price: 55 },
                    { id: '3', name: 'Iced Green Tea', price: 25 },
                  ]);
                  setErrorMessage('');
                  setStatus('reviewing');
                }}
                variant="secondary"
              />
            </View>
          </Card>
        )}

        {(status === 'reviewing' || status === 'analyzing') && (
          <View>
            {/* Budget Input Card */}
            <Card style={{ marginBottom: Spacing.lg, padding: Spacing.lg }}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Target Meal Budget</Text>
              <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                How much do you want to spend on this meal?
              </Text>

              <View style={[styles.budgetInputContainer, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
                <Text style={[styles.budgetCurrency, { color: colors.primary }]}>฿</Text>
                <TextInput
                  style={[styles.budgetInput, { color: colors.text }]}
                  placeholder="e.g. 80"
                  placeholderTextColor={colors.textTertiary}
                  value={budget}
                  onChangeText={setBudget}
                  keyboardType="numeric"
                />
              </View>

              {/* Preset Chips */}
              <View style={styles.presetRow}>
                {BUDGET_PRESETS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setBudget(p)}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: budget === p ? colors.primary : colors.surfaceHighlight,
                        borderColor: budget === p ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        { color: budget === p ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      ฿{p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Extracted Menu Items</Text>
                <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                  {menuItems.length} items parsed · Edit or add items below
                </Text>
              </View>
              <TouchableOpacity onPress={addManualItem} style={[styles.addItemBtn, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: FontWeight.bold, fontSize: FontSize.xs }}>
                  Add Item
                </Text>
              </TouchableOpacity>
            </View>

            {menuItems.map((item) => (
              <Card key={item.id} style={[styles.itemCard, { borderColor: colors.border }]}>
                <View style={styles.itemRow}>
                  <TextInput
                    style={[styles.itemInput, { color: colors.text, flex: 2 }]}
                    value={item.name}
                    onChangeText={(val) => updateItem(item.id, 'name', val)}
                    placeholder="Item name"
                    placeholderTextColor={colors.textTertiary}
                  />
                  <View style={styles.itemPriceWrap}>
                    <Text style={{ color: colors.primary, fontWeight: FontWeight.bold, marginRight: 2 }}>฿</Text>
                    <TextInput
                      style={[styles.itemPriceInput, { color: colors.text }]}
                      value={item.price.toString()}
                      onChangeText={(val) => updateItem(item.id, 'price', val)}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                  <TouchableOpacity onPress={() => removeItem(item.id)} style={{ marginLeft: Spacing.sm }}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))}

            <Button
              title={status === 'analyzing' ? 'Crunching Best Combos...' : 'Get Best Value Meal'}
              onPress={getRecommendations}
              style={{ marginTop: Spacing.lg }}
              disabled={status === 'analyzing' || !budget || menuItems.length === 0}
            />
          </View>
        )}

        {status === 'done' && (
          <View>
            <View style={[styles.aiHeader, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '35' }]}>
              <Ionicons name="scan-outline" size={22} color={colors.primary} />
              <View>
                <Text style={[styles.aiTitle, { color: colors.primary }]}>STUDIO COMBO RECOMMENDATION</Text>
                <Text style={[styles.aiSubtitle, { color: colors.textSecondary }]}>
                  Maximized satisfaction within ฿{budget} budget
                </Text>
              </View>
            </View>

            <Card style={[styles.recommendationCard, { borderColor: colors.border }]}>
              <Text style={[styles.recommendationText, { color: colors.text }]}>{recommendation}</Text>
            </Card>

            <Button
              title="Scan Another Menu"
              onPress={() => {
                setImageUri(null);
                setStatus('idle');
                setMenuItems([]);
                setRecommendation('');
                setBudget('');
              }}
              variant="secondary"
              style={{ marginTop: Spacing.xl }}
            />
          </View>
        )}
      </ScrollView>
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
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerPre: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.huge,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: FontSize.xs,
  },
  uploadCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderWidth: 1,
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    width: '100%',
  },
  cameraCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  placeholderTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    marginBottom: 4,
  },
  placeholderText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.lg,
  },
  previewImage: {
    width: '100%',
    height: 240,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
    marginTop: Spacing.sm,
  },
  budgetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  budgetCurrency: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginRight: 4,
  },
  budgetInput: {
    flex: 1,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    paddingVertical: Spacing.sm,
  },
  presetRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  presetChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  sectionSub: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  itemCard: {
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemInput: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSize.sm,
  },
  itemPriceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
    justifyContent: 'flex-end',
  },
  itemPriceInput: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: 4,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    minWidth: 40,
    textAlign: 'right',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  aiTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
  },
  aiSubtitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  recommendationCard: {
    padding: Spacing.lg,
    borderWidth: 1,
  },
  recommendationText: {
    fontSize: FontSize.sm,
    lineHeight: 22,
  },
});
