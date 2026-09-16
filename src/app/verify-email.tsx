import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LOCAL_API_URL } from '@/services/ai/client';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

export default function VerifyEmailScreen() {
  const { user, token, refreshUser, logout } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    await refreshUser();
    setLoading(false);
    if (user?.email_verified) {
      router.replace('/(tabs)');
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const response = await fetch(`${LOCAL_API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert('Email Sent', 'Please check your inbox for the verification link.');
      } else {
        Alert.alert('Error', data.error || 'Failed to resend verification email.');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setResending(false);
    }
  };

  if (user?.email_verified) {
    // If somehow verified but still on this screen
    router.replace('/(tabs)');
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-unread-outline" size={80} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Verify your email</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          We sent a verification link to <Text style={{ fontWeight: 'bold' }}>{user?.email}</Text>. Please verify your email to access all features of SPR App.
        </Text>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.primary }]} 
          onPress={handleRefresh}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>I've verified my email</Text>}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.outlineButton, { borderColor: colors.primary }]} 
          onPress={handleResend}
          disabled={resending}
        >
          {resending ? <ActivityIndicator color={colors.primary} /> : <Text style={[styles.outlineButtonText, { color: colors.primary }]}>Resend verification email</Text>}
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={[styles.logoutText, { color: colors.danger }]}>Log Out</Text>
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
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xxxl,
  },
  button: {
    width: '100%',
    height: 56,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  buttonText: {
    color: '#fff',
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  outlineButton: {
    width: '100%',
    height: 56,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  logoutButton: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
});
