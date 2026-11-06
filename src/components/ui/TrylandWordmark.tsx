import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, FontWeight } from '@/constants/theme';

interface TrylandWordmarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
}

export function TrylandWordmark({ size = 'md', showSubtitle = false }: TrylandWordmarkProps) {
  const { colors, isDark } = useTheme();

  const config = {
    sm: { treeSize: 18, fontSize: FontSize.md, subSize: 9, gap: 1 },
    md: { treeSize: 22, fontSize: FontSize.xl, subSize: 10, gap: 2 },
    lg: { treeSize: 30, fontSize: FontSize.xxl + 2, subSize: 11, gap: 2 },
    xl: { treeSize: 40, fontSize: FontSize.xxl + 10, subSize: 13, gap: 3 },
  }[size];

  const primaryForestGreen = '#10B981';
  const deepForestGreen = '#059669';

  return (
    <View style={styles.container}>
      <View style={[styles.wordmarkRow, { gap: config.gap }]}>
        {/* Tree functioning visually as the letter T */}
        <View style={styles.treeIconWrap}>
          <Text style={{ fontSize: config.treeSize, lineHeight: config.treeSize + 4 }}>🌳</Text>
        </View>
        <Text
          style={[
            styles.wordmarkText,
            {
              fontSize: config.fontSize,
              color: isDark ? '#F9FAFB' : '#111827',
              letterSpacing: 1.5,
            },
          ]}
        >
          RYLAND
        </Text>
      </View>
      {showSubtitle && (
        <Text style={[styles.subtitle, { fontSize: config.subSize, color: colors.textSecondary }]}>
          STUDENT BILL SPONSORSHIP
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  treeIconWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: -1,
  },
  wordmarkText: {
    fontWeight: FontWeight.extrabold,
    fontFamily: 'System',
  },
  subtitle: {
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    marginTop: 2,
  },
});

