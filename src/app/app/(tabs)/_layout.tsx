import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform, Image, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, FontSize } from '@/constants/theme';
import { PIGGY_LOGO } from '@/constants/assets';
import { DesktopSidebar } from '@/components/navigation/DesktopSidebar';

export default function TabLayout() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  return (
    <View style={[styles.container, isDesktop && styles.desktopRow]}>
      {/* ChatGPT-style sidebar on PC / Desktop Web */}
      {isDesktop && <DesktopSidebar />}

      <View style={{ flex: 1, height: '100%' }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: isDesktop
              ? { display: 'none' }
              : {
                  backgroundColor: colors.tabBar,
                  borderTopColor: colors.tabBarBorder,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  height: Platform.OS === 'ios' ? 88 : 64,
                  paddingTop: Spacing.sm,
                  paddingBottom: Platform.OS === 'ios' ? Spacing.xxl : Spacing.sm,
                },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textTertiary,
            tabBarLabelStyle: {
              fontSize: FontSize.xs,
              fontWeight: '600',
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Dashboard',
              tabBarIcon: ({ color, size, focused }) => (
                <View
                  style={{
                    width: size + 4,
                    height: size + 4,
                    borderRadius: (size + 4) / 2,
                    overflow: 'hidden',
                    borderWidth: focused ? 2 : 1,
                    borderColor: focused ? colors.primary : colors.textTertiary,
                    opacity: focused ? 1 : 0.75,
                  }}
                >
                  <Image
                    source={PIGGY_LOGO}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                </View>
              ),
            }}
          />
          <Tabs.Screen
            name="transactions"
            options={{
              title: 'Transactions',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="swap-vertical" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="goals"
            options={{
              title: 'Goals & AI',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="sparkles" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="assistant"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="more"
            options={{
              title: 'More',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="ellipsis-horizontal-circle" size={size} color={color} />
              ),
            }}
          />
        </Tabs>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  desktopRow: {
    flexDirection: 'row',
    height: '100%',
    ...Platform.select({
      web: {
        height: '100vh' as any,
        overflow: 'hidden' as any,
      },
    }),
  },
});
