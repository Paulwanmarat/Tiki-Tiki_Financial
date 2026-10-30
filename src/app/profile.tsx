import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { LOCAL_API_URL } from '@/services/ai/client';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { PIGGY_LOGO } from '@/constants/assets';
import { confirmAction } from '@/utils/confirm';

export default function ProfileScreen() {
  const { user, token, refreshUserProfile, logout } = useAuth();
  const { colors, isDark } = useTheme();
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
      Alert.alert('Permission required', 'Permission to access camera roll is required to set an avatar.');
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
      const filename = asset.fileName || asset.uri.split('/').pop() || 'avatar.jpg';
      const type = asset.mimeType || 'image/jpeg';

      if (Platform.OS === 'web') {
        const res = await fetch(asset.uri);
        const blob = await res.blob();
        formData.append('image', blob, filename);
      } else {
        formData.append('image', {
          uri: Platform.OS === 'ios' && !asset.uri.startsWith('file://') ? `file://${asset.uri}` : asset.uri,
          name: filename,
          type,
        } as any);
      }

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
    confirmAction(
      'Remove Picture',
      'Are you sure you want to remove your custom profile picture?',
      'Remove',
      async () => {
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
          Alert.alert('Error', error?.message || 'Failed to remove picture');
        } finally {
          setUploadingImage(false);
        }
      },
      true
    );
  };

  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleLogout = () => {
    confirmAction(
      'Log Out',
      'Are you sure you want to log out of SPR Money Studio?',
      'Log Out',
      async () => {
        await logout();
        router.replace('/(auth)/login' as any);
      },
      true
    );
  };

  const handleDeleteAccount = () => {
    confirmAction(
      'Permanent Account Deletion',
      'Are you sure you want to delete your account? All your recorded transactions, goals, and history will be permanently deleted from the database in compliance with GDPR. This action cannot be undone.',
      'Delete Permanently',
      async () => {
        setDeletingAccount(true);
        try {
          if (!token) return;
          const res = await fetch(`${LOCAL_API_URL}/api/profile`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Failed to delete account');
          }
          await logout();
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.alert('Account Deleted: Your account and personal data have been completely erased.');
          } else {
            Alert.alert('Account Deleted', 'Your account and personal data have been completely erased.');
          }
          router.replace('/(auth)/login' as any);
        } catch (err: any) {
          Alert.alert('Error', err.message);
        } finally {
          setDeletingAccount(false);
        }
      },
      true
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Studio Header */}
        <View style={[styles.header, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.headerPre, { color: colors.primary }]}>STUDIO IDENTITY</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Profile & Account</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={[styles.avatarRing, { borderColor: colors.primary + '40' }]}>
              {uploadingImage ? (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surface }]}>
                  <ActivityIndicator color={colors.primary} size="large" />
                </View>
              ) : user?.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
              ) : (
                <Image
                  source={PIGGY_LOGO}
                  style={styles.avatar}
                  resizeMode="cover"
                />
              )}
            </View>

            <View style={styles.avatarButtons}>
              <TouchableOpacity
                style={[styles.avatarBtn, { backgroundColor: colors.primary }]}
                onPress={handleChangePicture}
                disabled={uploadingImage}
              >
                <Ionicons name="camera-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.avatarBtnText}>Change Photo</Text>
              </TouchableOpacity>
              {user?.avatar_url && (
                <TouchableOpacity
                  style={[styles.avatarBtn, { backgroundColor: colors.danger + '20', borderColor: colors.danger + '40', borderWidth: 1 }]}
                  onPress={handleRemovePicture}
                  disabled={uploadingImage}
                >
                  <Text style={[styles.avatarBtnText, { color: colors.danger }]}>Reset Mascot</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Email Info Card */}
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <View>
                <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>STUDENT ACCOUNT EMAIL</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{user?.email}</Text>
              </View>
              {user?.email_verified ? (
                <View style={[styles.badge, { backgroundColor: colors.success + '20', borderColor: colors.success + '40' }]}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} style={{ marginRight: 4 }} />
                  <Text style={[styles.badgeText, { color: colors.success }]}>Verified</Text>
                </View>
              ) : (
                <View style={[styles.badge, { backgroundColor: colors.warning + '20', borderColor: colors.warning + '40' }]}>
                  <Text style={[styles.badgeText, { color: colors.warning }]}>Active Student</Text>
                </View>
              )}
            </View>
          </View>

          {/* Username Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Studio Nickname</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={{ color: colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginRight: 4 }}>
                @
              </Text>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Choose a studio handle"
                placeholderTextColor={colors.textTertiary}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: colors.primary,
                opacity: savingUsername || username === (user?.username || '') ? 0.6 : 1,
              },
            ]}
            onPress={handleSaveUsername}
            disabled={savingUsername || username === (user?.username || '')}
          >
            {savingUsername ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Save Profile Handle</Text>
            )}
          </TouchableOpacity>

          <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />

          {/* Security */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Security</Text>
          <TouchableOpacity
            style={[styles.securityButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/(auth)/forgot-password' as any)}
          >
            <Ionicons name="lock-closed-outline" size={20} color={colors.text} />
            <Text style={[styles.securityButtonText, { color: colors.text }]}>Reset Password</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />

          {/* Session & Sign Out */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account Session</Text>
          <TouchableOpacity
            style={[styles.securityButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={{ color: colors.danger, fontWeight: FontWeight.bold, fontSize: FontSize.sm }}>
                Log Out of SPR Studio
              </Text>
              <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 2 }}>
                Clears current device session and returns to login.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />

          {/* Danger Zone */}
          <Text style={[styles.sectionTitle, { color: colors.danger }]}>GDPR Privacy & Account Deletion</Text>
          <TouchableOpacity
            style={[styles.securityButton, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '40', opacity: deletingAccount ? 0.6 : 1 }]}
            onPress={handleDeleteAccount}
            disabled={deletingAccount}
            activeOpacity={0.7}
          >
            {deletingAccount ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            )}
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={{ color: colors.danger, fontWeight: FontWeight.bold, fontSize: FontSize.sm }}>
                {deletingAccount ? 'Erasing Account Data...' : 'Permanently Erase Account & All Data'}
              </Text>
              <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 2 }}>
                Irreversibly deletes transactions, goals, and history.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.danger} />
          </TouchableOpacity>
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
  backBtn: {
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatarRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    padding: 3,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  avatarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  avatarBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  infoCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: 0,
  },
  button: {
    height: 52,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  sectionDivider: {
    height: 1,
    marginVertical: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginLeft: 2,
    fontWeight: FontWeight.bold,
  },
  securityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
  },
  securityButtonText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    marginLeft: Spacing.md,
  },
});
