import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { LOCAL_API_URL } from '@/services/ai/client';
import { FontSize, FontWeight, Spacing } from '@/constants/theme';
import { GoogleLogo } from '@/components/GoogleSignInButton';

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { login } = useAuth();
  const { colors } = useTheme();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleAuth = async () => {
      try {
        let token = (params.token as string) || (params.access_token as string);
        const code = params.code as string;
        const error = params.error as string;

        if (error) {
          setErrorMsg(error);
          setTimeout(() => router.replace('/(auth)/login' as any), 3000);
          return;
        }

        if (!token && code) {
          // Exchange code with backend
          const exchangeRes = await fetch(`${LOCAL_API_URL}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          });
          const exchangeData = await exchangeRes.json();
          if (!exchangeRes.ok) {
            throw new Error(exchangeData.error || 'Failed to authenticate Google authorization code');
          }
          token = exchangeData.token;
        }

        if (!token) {
          setErrorMsg('No authentication token received.');
          setTimeout(() => router.replace('/(auth)/login' as any), 3000);
          return;
        }

        // Fetch user info using token
        const res = await fetch(`${LOCAL_API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error('Failed to verify authentication session.');
        }

        const data = await res.json();
        await login(token, data.user);
        router.replace('/app' as any);
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setErrorMsg(err.message || 'Authentication failed');
        setTimeout(() => router.replace('/(auth)/login' as any), 3000);
      }
    };

    handleAuth();
  }, [params]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.card}>
        <GoogleLogo size={36} />
        <Text style={[styles.title, { color: colors.text }]}>
          {errorMsg ? 'Sign In Failed' : 'Completing Google Sign In...'}
        </Text>
        {errorMsg ? (
          <Text style={[styles.subtitle, { color: colors.danger }]}>
            {errorMsg} (Redirecting back...)
          </Text>
        ) : (
          <View style={{ alignItems: 'center', marginTop: Spacing.md }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.subtitle, { color: colors.textSecondary, marginTop: Spacing.md }]}>
              Setting up your session...
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  card: {
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.sm,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});

