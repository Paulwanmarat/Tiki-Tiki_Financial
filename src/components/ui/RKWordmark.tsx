import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, FontWeight } from '@/constants/theme';

interface RKWordmarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
}

export function RKWordmark({ size = 'md', showSubtitle = false }: RKWordmarkProps) {
  const { colors, isDark } = useTheme();

  const config = {
    sm: { iconSize: 16, fontSize: FontSize.md, tagSize: 8, subSize: 9, gap: 4 },
    md: { iconSize: 20, fontSize: FontSize.xl, tagSize: 9, subSize: 10, gap: 6 },
    lg: { iconSize: 26, fontSize: FontSize.xxl + 2, tagSize: 10, subSize: 11, gap: 8 },
    xl: { iconSize: 34, fontSize: FontSize.xxl + 10, tagSize: 12, subSize: 12, gap: 10 },
  }[size];

  return (
    <View style={styles.container}>
      <View style={[styles.wordmarkRow, { gap: config.gap }]}>
        <Ionicons name="happy" size={config.iconSize} color="#10B981" />
        <Text
          style={[
            styles.wordmarkText,
            {
              fontSize: config.fontSize,
              color: isDark ? '#F9FAFB' : '#111827',
              letterSpacing: 1.2,
            },
          ]}
        >
          RK
        </Text>
        <View style={styles.badge}>
          <Text style={[styles.badgeText, { fontSize: config.tagSize }]}>RICH KID</Text>
        </View>
      </View>
      {showSubtitle && (
        <Text style={[styles.subtitle, { fontSize: config.subSize, color: colors.textSecondary }]}>
          Where students upload bills · Rich Kids pay
        </Text>
      )}
    </View>
  );
}

// Backwards compatibility alias
export const TrylandWordmark = RKWordmark;
export default RKWordmark;

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordmarkText: {
    fontWeight: FontWeight.extrabold,
    fontFamily: 'System',
  },
  badge: {
    backgroundColor: '#F59E0B22',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 2,
  },
  badgeText: {
    color: '#D97706',
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
  },
  subtitle: {
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.3,
    marginTop: 2,
  },
});

