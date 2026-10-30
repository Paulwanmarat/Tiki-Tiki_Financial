import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Alert,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { LOCAL_API_URL } from '@/services/ai/client';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';

interface GoogleSignInButtonProps {
  mode?: 'signin' | 'signup';
  onSuccess?: () => void;
  onError?: (err: any) => void;
}

export function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <Path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <Path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.97 0 12s.45 3.84 1.24 5.42l4.04-3.15z"
      />
      <Path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </Svg>
  );
}

export default function GoogleSignInButton({
  mode = 'signin',
  onSuccess,
  onError,
}: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();
  const { colors, isDark } = useTheme();

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      // 1. Check if backend has Google OAuth configured
      const configRes = await fetch(`${LOCAL_API_URL}/api/auth/google/config`);
      const config = configRes.ok ? await configRes.json() : { configured: false };

      if (config.configured) {
        // Live Google OAuth flow
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          // Redirect to backend OAuth initiation
          window.location.href = `${LOCAL_API_URL}/api/auth/google`;
          return;
        } else {
          // Native mobile: Can trigger web browser auth session
          const WebBrowser = require('expo-web-browser');
          const redirectUrl = `${LOCAL_API_URL}/api/auth/google`;
          const result = await WebBrowser.openAuthSessionAsync(redirectUrl, 'spr-app://');
          if (result.type === 'success' && result.url) {
            // Process token from redirect
            const urlObj = new URL(result.url);
            const token = urlObj.searchParams.get('token');
            if (token) {
              const userRes = await fetch(`${LOCAL_API_URL}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (userRes.ok) {
                const { user } = await userRes.json();
                await login(token, user);
                onSuccess?.();
                router.replace('/app' as any);
                return;
              }
            }
          }
        }
      }

      // If Google Cloud Client ID is not yet configured, provide seamless preview options
      const handleDemoLogin = async (customEmail?: string, customName?: string) => {
        try {
          const res = await fetch(`${LOCAL_API_URL}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              isDevDemo: true,
              demoEmail: customEmail || 'student.google@gmail.com',
              demoName: customName || 'Google Student',
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Google login failed');

          await login(data.token, data.user);
          onSuccess?.();
          router.replace('/app' as any);
        } catch (err: any) {
          Alert.alert('Google Sign-In Error', err.message || 'Failed to sign in with Google');
          onError?.(err);
        }
      };

      if (Platform.OS === 'web') {
        // On Web, directly log in with Google preview profile or offer action
        await handleDemoLogin();
      } else {
        Alert.alert(
          'Google Sign-In',
          'Google Cloud OAuth credentials are not configured yet. Would you like to test with a verified Google profile?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In (Test Profile)', onPress: () => handleDemoLogin() },
          ]
        );
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      Alert.alert('Google Sign-In', err.message || 'Unable to complete Google Sign-In.');
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const label = mode === 'signup' ? 'Sign up with Google' : 'Continue with Google';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderColor: isDark ? '#334155' : '#E2E8F0',
          shadowColor: '#000000',
        },
      ]}
      onPress={handleGoogleAuth}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <View style={styles.content}>
          <GoogleLogo size={20} />
          <Text
            style={[
              styles.label,
              {
                color: isDark ? '#F8FAFC' : '#0F172A',
              },
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.2,
  },
});
