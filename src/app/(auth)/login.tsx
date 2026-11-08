import React, { useState, useRef, useEffect } from 'react';
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
  Animated,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LOCAL_API_URL, isProductionWeb } from '@/services/ai/client';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { PIGGY_LOGO } from '@/constants/assets';
import GoogleSignInButton from '@/components/GoogleSignInButton';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { login, loginOffline } = useAuth();
  const { colors, isDark } = useTheme();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'Sign In | SPR Money Studio';
    }
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage('Please enter your email and password.');
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }

    // On production web, the Render backend is on a free-tier sleep schedule.
    // Skip the network round-trip and show a helpful message immediately.
    if (isProductionWeb()) {
      setErrorMessage(
        'Live login is unavailable — the backend server is sleeping (free tier). Use "Quick Demo Sign-In" below to access the app instantly, or try again later.'
      );
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    const controller = new AbortController();
    // 12-second timeout — long enough for Render cold start (50-90s), short enough to show error
    const timeoutTimer = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(`${LOCAL_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });

      clearTimeout(timeoutTimer);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      await login(data.token, data.user);
      router.replace('/app' as any);
    } catch (error: any) {
      clearTimeout(timeoutTimer);
      const isTimeout = error.name === 'AbortError' || error.message?.includes('aborted');
      const isNetwork = error.message?.includes('Network') || error.message?.includes('fetch') || error.message?.includes('Failed to fetch');
      let msg: string;
      if (isTimeout || isNetwork) {
        msg = 'The server is waking up (free-tier cold start). Please wait 30 seconds and try again, or use the Quick Demo Sign-In below.';
      } else {
        msg = error.message || 'Unable to connect to the server. Check your connection and try again.';
      }
      setErrorMessage(msg);
    } finally {
      clearTimeout(timeoutTimer);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Head>
        <title>Sign In | SPR Money Studio</title>
      </Head>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Return Link */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={[styles.backPill, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}
              onPress={() => router.push('/' as any)}
            >
              <Ionicons name="arrow-back" size={16} color={colors.text} />
              <Text style={[styles.backPillText, { color: colors.text }]}>Back to Website</Text>
            </TouchableOpacity>
            <View style={[styles.badgePill, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
              <Text style={[styles.badgePillText, { color: colors.primary }]}>STUDIO APP</Text>
            </View>
          </View>

          <Animated.View style={[styles.heroSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {/* Mascot Avatar */}
            <View style={[styles.mascotRing, { borderColor: colors.primary + '35' }]}>
              <Image
                source={PIGGY_LOGO}
                style={styles.mascotImage}
                resizeMode="cover"
              />
            </View>
            <Text style={[styles.brandPre, { color: colors.primary }]}>SPR MONEY STUDIO</Text>
            <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Sign in to manage your daily student allowance & goals
            </Text>
          </Animated.View>

          <Animated.View style={[styles.formSection, { opacity: fadeAnim }]}>
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="mail-outline" size={20} color={colors.textTertiary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="student@example.com"
                  placeholderTextColor={colors.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Password</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textTertiary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={{ alignSelf: 'flex-end', marginTop: Spacing.sm }}
                onPress={() => router.push('/(auth)/forgot-password' as any)}
              >
                <Text style={{ color: colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold }}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Inline Error Banner */}
            {errorMessage && (
              <View style={[styles.errorBanner, { backgroundColor: colors.expense + '18', borderColor: colors.expense + '50' }]}>
                <Ionicons name="alert-circle" size={18} color={colors.expense} />
                <Text style={[styles.errorBannerText, { color: colors.expense }]}>{errorMessage}</Text>
              </View>
            )}

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary, opacity: loading ? 0.75 : 1 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <View style={styles.buttonInner}>
                  <Text style={styles.buttonText}>Sign In to Studio</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textTertiary }]}>OR CONTINUE WITH</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Google Sign In */}
            <GoogleSignInButton mode="signin" />

            {/* Quick Demo Sign In for Instant Access */}
            <TouchableOpacity
              style={[
                styles.demoButton,
                { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
              ]}
              onPress={async () => {
                setLoading(true);
                setErrorMessage(null);
                const demoUser = {
                  id: 'demo-student-local',
                  email: 'student.google@gmail.com',
                  username: 'Google Student',
                  email_verified: true,
                  role: 'user' as const,
                  avatar_url: null,
                };
                // On production web, skip the Render round-trip — go offline immediately
                if (isProductionWeb()) {
                  loginOffline(demoUser);
                  setLoading(false);
                  router.replace('/app' as any);
                  return;
                }
                try {
                  const controller = new AbortController();
                  const timer = setTimeout(() => controller.abort(), 5000);
                  const res = await fetch(`${LOCAL_API_URL}/api/auth/google`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      isDevDemo: true,
                      demoEmail: demoUser.email,
                      demoName: demoUser.username,
                    }),
                    signal: controller.signal,
                  });
                  clearTimeout(timer);
                  const data = await res.json();
                  if (res.ok && data.token) {
                    await login(data.token, data.user);
                  } else {
                    // Server returned error — use offline session
                    loginOffline(demoUser);
                  }
                } catch {
                  // Network error or timeout — use offline session so user can still access app
                  loginOffline(demoUser);
                } finally {
                  setLoading(false);
                }
                router.replace('/app' as any);
              }}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Ionicons name="sparkles" size={16} color={colors.primary} />
              <Text style={[styles.demoButtonText, { color: colors.text }]}>
                Quick Demo Sign-In (Verified Student)
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer Register Link */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              New to SPR Money Studio?
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register' as any)}>
              <Text style={[styles.footerLink, { color: colors.primary }]}> Create Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxl,
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
  },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  backPillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  badgePill: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  mascotRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    padding: 3,
    marginBottom: Spacing.md,
    shadowColor: '#F96A98',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  mascotImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  brandPre: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    letterSpacing: 2.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },
  formSection: {
    marginBottom: Spacing.xl,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    height: 54,
    gap: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: 0,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  errorBannerText: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.semibold,
    flex: 1,
    lineHeight: 18,
  },
  button: {
    height: 54,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
    shadowColor: '#F96A98',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  demoButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  footerText: {
    fontSize: FontSize.sm,
  },
  footerLink: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xl,
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    letterSpacing: 1.2,
  },
});
