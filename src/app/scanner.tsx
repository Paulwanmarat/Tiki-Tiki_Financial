import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
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

export default function ScannerScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [budget, setBudget] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'uploading' | 'ocr_failed' | 'reviewing' | 'analyzing' | 'done'>('idle');
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
      Alert.alert('Invalid Budget', 'Please enter a valid budget amount.');
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
    setMenuItems(prev => prev.map(item => {
      if (item.id === id) {
        if (field === 'price') {
          return { ...item, price: parseFloat(value) || 0 };
        }
        return { ...item, name: value };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setMenuItems(prev => prev.filter(item => item.id !== id));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Menu Scanner</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {errorMessage ? (
          <View style={[styles.errorBox, { backgroundColor: colors.danger + '20', borderColor: colors.danger }]}>
            <Ionicons name="warning" size={20} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>{errorMessage}</Text>
          </View>
        ) : null}

        {status === 'idle' || status === 'uploading' ? (
          <Card style={styles.uploadCard}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
            ) : (
              <View style={styles.placeholderContainer}>
                <Ionicons name="camera-outline" size={64} color={colors.textTertiary} />
                <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>Take a photo of a menu to get started</Text>
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
                title={status === 'uploading' ? "Processing..." : "Scan Menu"} 
                onPress={processImage} 
                style={{ marginTop: Spacing.md }} 
                disabled={status === 'uploading'}
              />
            )}
          </Card>
        ) : null}

        {status === 'ocr_failed' && (
          <Card style={styles.uploadCard}>
            <View style={styles.placeholderContainer}>
              <Ionicons name="alert-circle-outline" size={64} color={colors.danger} />
              <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                {errorMessage}
              </Text>
            </View>
            <View style={{ width: '100%', gap: Spacing.md }}>
              <Button 
                title="Try Scanning Again" 
                onPress={processImage} 
                variant="primary" 
              />
              <Button 
                title="Enter Menu Items Manually" 
                onPress={() => {
                  setMenuItems([]);
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
            <Card style={{ marginBottom: Spacing.lg }}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Budget</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceHighlight }]}
                placeholder="Enter budget (e.g. 200000)"
                placeholderTextColor={colors.textTertiary}
                value={budget}
                onChangeText={setBudget}
                keyboardType="numeric"
              />
            </Card>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Extracted Items</Text>
              <TouchableOpacity onPress={addManualItem}>
                <Text style={{ color: colors.primary, fontWeight: FontWeight.semibold }}>+ Add Item</Text>
              </TouchableOpacity>
            </View>

            {menuItems.map(item => (
              <Card key={item.id} style={styles.itemCard}>
                <View style={styles.itemRow}>
                  <TextInput
                    style={[styles.itemInput, { color: colors.text, flex: 2 }]}
                    value={item.name}
                    onChangeText={(val) => updateItem(item.id, 'name', val)}
                    placeholder="Item name"
                    placeholderTextColor={colors.textTertiary}
                  />
                  <TextInput
                    style={[styles.itemInput, { color: colors.text, flex: 1, textAlign: 'right' }]}
                    value={item.price.toString()}
                    onChangeText={(val) => updateItem(item.id, 'price', val)}
                    keyboardType="numeric"
                    placeholder="Price"
                    placeholderTextColor={colors.textTertiary}
                  />
                  <TouchableOpacity onPress={() => removeItem(item.id)} style={{ marginLeft: Spacing.sm }}>
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))}

            <Button 
              title={status === 'analyzing' ? "Analyzing..." : "Get Recommendations"} 
              onPress={getRecommendations} 
              style={{ marginTop: Spacing.lg }}
              disabled={status === 'analyzing' || !budget || menuItems.length === 0}
            />
          </View>
        )}

        {status === 'done' && (
          <View>
            <View style={[styles.aiHeader, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="sparkles" size={24} color={colors.primary} />
              <Text style={[styles.aiTitle, { color: colors.primary }]}>AI Recommendation</Text>
            </View>
            <Card style={styles.recommendationCard}>
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
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
  content: { padding: Spacing.lg, paddingBottom: Spacing.huge },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  errorText: { flex: 1, fontSize: FontSize.sm },
  uploadCard: { alignItems: 'center', padding: Spacing.lg },
  placeholderContainer: { alignItems: 'center', justifyContent: 'center', height: 200, width: '100%', marginBottom: Spacing.lg },
  placeholderText: { marginTop: Spacing.md, fontSize: FontSize.md, textAlign: 'center' },
  previewImage: { width: '100%', height: 250, borderRadius: BorderRadius.md, marginBottom: Spacing.lg },
  buttonRow: { flexDirection: 'row', gap: Spacing.md, width: '100%' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm, marginTop: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, marginBottom: Spacing.xs },
  input: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: FontSize.md },
  itemCard: { padding: Spacing.sm, marginBottom: Spacing.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemInput: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, fontSize: FontSize.md },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.sm },
  aiTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  recommendationCard: { padding: Spacing.lg },
  recommendationText: { fontSize: FontSize.md, lineHeight: 24 },
});
