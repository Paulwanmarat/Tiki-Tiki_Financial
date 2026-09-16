import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = (segments[0] as string) === '(auth)';
    const isVerifyEmail = (segments[0] as string) === 'verify-email';

    if (!user) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login' as any);
      }
    } else {
      if (!user.email_verified && !isVerifyEmail) {
        // Redirect unverified users to verify-email
        router.replace('/verify-email' as any);
      } else if (user.email_verified && (inAuthGroup || isVerifyEmail)) {
        // Redirect verified users away from auth and verify-email
        router.replace('/(tabs)' as any);
      }
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

function AppContent() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="verify-email" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="transaction/add"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="feedback"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="transaction/[id]"
          options={{
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="goal/add"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="goal/[id]"
          options={{
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="simulator"
          options={{
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="scanner"
          options={{
            presentation: 'fullScreenModal',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            presentation: 'card',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGuard>
          <AppContent />
        </AuthGuard>
      </AuthProvider>
    </ThemeProvider>
  );
}
