import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, FontWeight } from '@/constants/theme';

interface TrylandWordmarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
}

export function TrylandWordmark({ size = 'md', showSubtitle = false }: TrylandWordmarkProps) {
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
        <Text style={{ fontSize: config.iconSize }}>🌳</Text>
        <Text
          style={[
            styles.wordmarkText,
            {
              fontSize: config.fontSize,
              color: isDark ? '#ECFDF5' : '#065F46',
              letterSpacing: 1.2,
            },
          ]}
        >
          TRYLAND
        </Text>
        <View style={styles.badge}>
          <Text style={[styles.badgeText, { fontSize: config.tagSize }]}>SAVE THE PLANET</Text>
        </View>
      </View>
      {showSubtitle && (
        <Text style={[styles.subtitle, { fontSize: config.subSize, color: colors.textSecondary }]}>
          Donate to plant more trees · Campus & mangrove reforestation
        </Text>
      )}
    </View>
  );
}

export default TrylandWordmark;

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
    backgroundColor: '#05966922',
    borderWidth: 1,
    borderColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 2,
  },
  badgeText: {
    color: '#059669',
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
  },
  subtitle: {
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.3,
    marginTop: 2,
  },
});
