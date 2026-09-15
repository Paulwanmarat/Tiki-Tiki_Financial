import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, StyleProp, ActivityIndicator } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  icon,
}: ButtonProps) {
  const { colors } = useTheme();

  const getBackgroundColor = () => {
    if (disabled) return colors.surfaceHighlight;
    switch (variant) {
      case 'primary': return colors.primary;
      case 'secondary': return colors.surfaceHighlight;
      case 'danger': return colors.danger;
      case 'ghost': return 'transparent';
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.textTertiary;
    switch (variant) {
      case 'primary': return '#FFFFFF';
      case 'secondary': return colors.text;
      case 'danger': return '#FFFFFF';
      case 'ghost': return colors.primary;
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm': return { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md };
      case 'md': return { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl };
      case 'lg': return { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xxl };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm': return FontSize.sm;
      case 'md': return FontSize.md;
      case 'lg': return FontSize.lg;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: variant === 'ghost' ? colors.border : 'transparent',
          borderWidth: variant === 'ghost' ? 1 : 0,
        },
        getPadding(),
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              {
                color: getTextColor(),
                fontSize: getFontSize(),
                marginLeft: icon ? Spacing.sm : 0,
              },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
  },
  text: {
    fontWeight: FontWeight.semibold,
  },
});
