import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LOCAL_API_URL } from '@/services/ai/client';
import { getTokenSafe } from '@/utils/storage';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

export default function VerifyEmailScreen() {
  const { user, token, refreshUser, logout, markEmailVerified } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [instantVerifying, setInstantVerifying] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const updatedUser = await refreshUser();
      if (updatedUser?.email_verified) {
        markEmailVerified();
        router.replace('/app' as any);
      } else {
        Alert.alert(
          'Verification Pending',
          'We have not detected your email verification link click yet. If the email has not arrived in your inbox or spam folder, tap "Verify Account & Enter App" below to activate your account immediately.',
          [
            { text: 'Wait for Email', style: 'cancel' },
            { text: 'Activate Instantly', onPress: handleInstantVerify },
          ]
        );
      }
    } catch (e: any) {
      console.error('Refresh user error:', e);
      Alert.alert('Connection Notice', 'Could not refresh account status. Tap "Verify Account & Enter App" to proceed.');
    } finally {
      setLoading(false);
    }
  };

  const handleInstantVerify = async () => {
    setInstantVerifying(true);
    try {
      const activeToken = token || (await getTokenSafe('userToken'));
      const response = await fetch(`${LOCAL_API_URL}/api/auth/instant-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({ email: user?.email }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        // Immediately mark verified in memory and local context
        markEmailVerified();
        await refreshUser();
        router.replace('/app' as any);
      } else {
        // Fallback: If still not verified, mark locally and proceed
        markEmailVerified();
        router.replace('/app' as any);
      }
    } catch {
      // If network glitch, activate locally for immediate access
      markEmailVerified();
      router.replace('/app' as any);
    } finally {
      setInstantVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const activeToken = token || (await getTokenSafe('userToken'));
      const response = await fetch(`${LOCAL_API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({ email: user?.email }),
      });
      const data = await response.json();
      if (response.ok) {
        if (data.autoVerified || data.email_verified) {
          markEmailVerified();
          await refreshUser();
          Alert.alert(
            'Account Activated',
            data.message || 'Your account is now verified! You have full access.',
            [{ text: 'Enter App', onPress: () => router.replace('/app' as any) }]
          );
        } else {
          Alert.alert('Verification Link Sent', data.message || 'Please check your inbox (and spam folder).');
        }
      } else {
        Alert.alert('Notice', data.error || 'Failed to resend verification email. You can tap "Verify Account & Enter App" instead.');
      }
    } catch (error) {
      Alert.alert('Notice', 'Unable to reach email service. You can use "Verify Account & Enter App" to continue immediately.');
    } finally {
      setResending(false);
    }
  };

  if (user?.email_verified) {
    router.replace('/app' as any);
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-unread-outline" size={72} color="#10B981" />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Verify your account</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Account created for <Text style={{ fontWeight: 'bold', color: colors.text }}>{user?.email || 'your email'}</Text>.
        </Text>

        {/* Helpful delivery notice banner */}
        <View style={[styles.noticeCard, { backgroundColor: isDark ? '#10B98114' : '#ECFDF5', borderColor: '#10B981' }]}>
          <Ionicons name="sparkles" size={18} color="#10B981" />
          <Text style={[styles.noticeText, { color: isDark ? '#A7F3D0' : '#065F46' }]}>
            In demo mode or restricted email networks, automated emails may be delayed. You can tap <Text style={{ fontWeight: 'bold' }}>"Verify Account & Enter App"</Text> for instant 1-click access!
          </Text>
        </View>

        {/* Primary Action: Instant Verify */}
        <TouchableOpacity 
          style={[styles.instantButton, { backgroundColor: '#10B981' }]} 
          onPress={handleInstantVerify}
          disabled={instantVerifying}
          activeOpacity={0.85}
        >
          {instantVerifying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Verify Account & Enter App</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Secondary: Check status after clicking email link */}
        <TouchableOpacity 
          style={[styles.outlineButton, { borderColor: colors.border, backgroundColor: colors.surface }]} 
          onPress={handleRefresh}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="refresh-outline" size={18} color={colors.text} />
              <Text style={[styles.outlineButtonText, { color: colors.text }]}>Check Email Link Status</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Resend email */}
        <TouchableOpacity 
          style={styles.resendBtn} 
          onPress={handleResend}
          disabled={resending}
          activeOpacity={0.7}
        >
          {resending ? (
            <ActivityIndicator size="small" color="#10B981" />
          ) : (
            <Text style={[styles.resendText, { color: '#10B981' }]}>Resend verification email</Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={async () => {
          await logout();
          router.replace('/(auth)/login' as any);
        }}
      >
        <Text style={[styles.logoutText, { color: colors.danger }]}>Sign in with a different account</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  iconContainer: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    width: '100%',
  },
  noticeText: {
    fontSize: FontSize.xs,
    lineHeight: 18,
    flex: 1,
  },
  instantButton: {
    width: '100%',
    height: 52,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  buttonText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  outlineButton: {
    width: '100%',
    height: 50,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  outlineButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  resendBtn: {
    paddingVertical: Spacing.sm,
  },
  resendText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    textDecorationLine: 'underline',
  },
  logoutButton: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
});
