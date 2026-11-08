import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { FinancialDataProvider } from '@/context/FinancialDataContext';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Head from 'expo-router/head';
import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const topSegment = segments[0] as string | undefined;
  const isRoot = !topSegment || topSegment === 'index';
  const isWebPublicLanding = Platform.OS === 'web' && isRoot;
  const inAuthGroup = topSegment === '(auth)' || topSegment === 'auth-callback';
  const isPublicRoute =
    isWebPublicLanding ||
    inAuthGroup ||
    topSegment === 'donate' ||
    topSegment === 'rk' ||
    topSegment === 'tryland' ||
    topSegment === 'projects' ||
    topSegment === 'marketplace' ||
    topSegment === 'simulator' ||
    topSegment === 'feedback';

  useEffect(() => {
    if (isLoading) return;

    const isVerifyEmail = topSegment === 'verify-email';

    // Public routes are always accessible
    if (isPublicRoute) {
      // If user is already verified and logged in, redirect them away from auth screens to /app
      if (user && user.email_verified && inAuthGroup) {
        router.replace('/app' as any);
      }
      return;
    }

    if (!user) {
      router.replace('/(auth)/login' as any);
    } else {
      if (!user.email_verified && !isVerifyEmail) {
        // Redirect unverified users to verify-email
        router.replace('/verify-email' as any);
      } else if (user.email_verified && isVerifyEmail) {
        // Redirect verified users away from verify-email to /app
        router.replace('/app' as any);
      }
    }
  }, [user, isLoading, segments, isPublicRoute, inAuthGroup, topSegment]);

  return <>{children}</>;
}

function AppContent() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <Head>
        <title>SPR Money Studio | Student Pecuniary Routine</title>
        <meta
          name="description"
          content="SPR Money Studio - Student Pecuniary Routine, smart financial companion and daily allowance manager"
        />
      </Head>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
        <Stack.Screen name="verify-email" options={{ headerShown: false }} />
        <Stack.Screen name="app" options={{ headerShown: false }} />
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
        <Stack.Screen
          name="profile"
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
      <CurrencyProvider>
        <AuthProvider>
          <AuthGuard>
            <FinancialDataProvider>
              <AppContent />
            </FinancialDataProvider>
          </AuthGuard>
        </AuthProvider>
      </CurrencyProvider>
    </ThemeProvider>
  );
}
