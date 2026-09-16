import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LOCAL_API_URL } from '@/services/ai/client';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen() {
  const { user, token, refreshUserProfile } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [username, setUsername] = useState(user?.username || '');
  const [savingUsername, setSavingUsername] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (user?.username) {
      setUsername(user.username);
    }
  }, [user]);

  const handleSaveUsername = async () => {
    if (!token) return;
    const trimmed = username.trim();
    if (trimmed && (trimmed.length < 3 || trimmed.length > 20)) {
      Alert.alert('Invalid Username', 'Username must be between 3 and 20 characters.');
      return;
    }
    if (trimmed && !/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      Alert.alert('Invalid Username', 'Only letters, numbers, and underscores are allowed.');
      return;
    }

    setSavingUsername(true);
    try {
      const response = await fetch(`${LOCAL_API_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: trimmed || null }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update username');
      }
      await refreshUserProfile();
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSavingUsername(false);
    }
  };

  const handleChangePicture = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission to access camera roll is required!');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (pickerResult.canceled) {
      return;
    }

    const asset = pickerResult.assets[0];
    
    setUploadingImage(true);
    try {
      if (!token) throw new Error('Not authenticated');

      const formData = new FormData();
      const filename = asset.uri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append('image', {
        uri: asset.uri,
        name: filename,
        type,
      } as any);

      const response = await fetch(`${LOCAL_API_URL}/api/profile/avatar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload picture');
      }
      await refreshUserProfile();
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemovePicture = async () => {
    Alert.alert('Remove Picture', 'Are you sure you want to remove your profile picture?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setUploadingImage(true);
          try {
            if (!token) throw new Error('Not authenticated');
            const response = await fetch(`${LOCAL_API_URL}/api/profile/avatar`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to remove picture');
            await refreshUserProfile();
          } catch (error: any) {
            Alert.alert('Error', error.message);
          } finally {
            setUploadingImage(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile & Account</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {uploadingImage ? (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surface }]}>
                  <ActivityIndicator color={colors.primary} size="large" />
                </View>
              ) : user?.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surface }]}>
                  <Ionicons name="person" size={60} color={colors.textTertiary} />
                </View>
              )}
            </View>

            <View style={styles.avatarButtons}>
              <TouchableOpacity style={[styles.avatarBtn, { backgroundColor: colors.primary }]} onPress={handleChangePicture} disabled={uploadingImage}>
                <Text style={styles.avatarBtnText}>Change Picture</Text>
              </TouchableOpacity>
              {user?.avatar_url && (
                <TouchableOpacity style={[styles.avatarBtn, { backgroundColor: colors.danger + '20' }]} onPress={handleRemovePicture} disabled={uploadingImage}>
                  <Text style={[styles.avatarBtnText, { color: colors.danger }]}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={[styles.infoSection, { backgroundColor: colors.surface }]}>
            <View style={styles.infoRow}>
              <View>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{user?.email}</Text>
              </View>
              {user?.email_verified ? (
                <View style={[styles.badge, { backgroundColor: colors.success + '20' }]}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} style={{ marginRight: 4 }} />
                  <Text style={[styles.badgeText, { color: colors.success }]}>Verified</Text>
                </View>
              ) : (
                <View style={[styles.badge, { backgroundColor: colors.warning + '20' }]}>
                  <Text style={[styles.badgeText, { color: colors.warning }]}>Unverified</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Username</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={{ color: colors.textTertiary, fontSize: FontSize.md, marginRight: 4 }}>@</Text>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Choose a username"
                placeholderTextColor={colors.textTertiary}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary, opacity: savingUsername ? 0.7 : 1 }]}
            onPress={handleSaveUsername}
            disabled={savingUsername || username === (user?.username || '')}
          >
            {savingUsername ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Username</Text>}
          </TouchableOpacity>

          <View style={styles.sectionDivider} />

          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Security</Text>
          <TouchableOpacity
            style={[styles.securityButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/(auth)/forgot-password' as any)}
          >
            <Ionicons name="lock-closed-outline" size={20} color={colors.text} />
            <Text style={[styles.securityButtonText, { color: colors.text }]}>Change Password</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
  content: { padding: Spacing.lg },
  avatarSection: { alignItems: 'center', marginBottom: Spacing.xxl },
  avatarContainer: { marginBottom: Spacing.lg },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  avatarPlaceholder: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  avatarButtons: { flexDirection: 'row', gap: Spacing.md },
  avatarBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full },
  avatarBtnText: { color: '#fff', fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  infoSection: { padding: Spacing.lg, borderRadius: BorderRadius.xl, marginBottom: Spacing.xl },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: FontSize.xs, textTransform: 'uppercase', marginBottom: 4 },
  infoValue: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: FontWeight.bold },
  inputGroup: { marginBottom: Spacing.lg },
  inputLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: Spacing.sm, marginLeft: Spacing.xs },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, height: 56 },
  input: { flex: 1, fontSize: FontSize.md, paddingVertical: 0 },
  button: { height: 56, borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
  sectionDivider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: Spacing.xl, opacity: 0.5 },
  sectionTitle: { fontSize: FontSize.sm, textTransform: 'uppercase', marginBottom: Spacing.md, marginLeft: Spacing.xs, fontWeight: FontWeight.semibold },
  securityButton: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderWidth: 1, borderRadius: BorderRadius.lg },
  securityButtonText: { flex: 1, fontSize: FontSize.md, fontWeight: FontWeight.medium, marginLeft: Spacing.md },
});
