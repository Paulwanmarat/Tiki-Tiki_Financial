import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export function EmptyState({ icon, title, message, style, children }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.surfaceHighlight }]}>
        <Ionicons name={icon} size={48} color={colors.textTertiary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      {children}
    </View>
  );
}

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.shimmer, { backgroundColor: colors.shimmer }]} />
      <View style={[styles.shimmerSmall, { backgroundColor: colors.shimmer }]} />
      <Text style={[styles.loadingText, { color: colors.textTertiary }]}>{message}</Text>
    </View>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: colors.dangerLight }]}>
        <Ionicons name="alert-circle" size={48} color={colors.danger} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>Something went wrong</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      {onRetry && (
        <Text
          style={[styles.retryButton, { color: colors.primary }]}
          onPress={onRetry}
        >
          Try Again
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.huge,
    paddingHorizontal: Spacing.xxl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingText: {
    fontSize: FontSize.sm,
    marginTop: Spacing.lg,
  },
  shimmer: {
    width: '80%',
    height: 20,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  shimmerSmall: {
    width: '50%',
    height: 16,
    borderRadius: BorderRadius.sm,
  },
  retryButton: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
});
