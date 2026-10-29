import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Card } from '@/components/ui/Card';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { PIGGY_LOGO } from '@/constants/assets';

interface MenuItemData {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  route: string;
  color: string;
  badge?: string;
}

export default function MoreScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const items: MenuItemData[] = [
    {
      icon: 'calculator',
      title: 'Spending Simulator',
      description: 'Model future purchase impacts on daily cash & goals',
      route: '/simulator',
      color: colors.primary,
      badge: 'INTERACTIVE',
    },
    {
      icon: 'camera',
      title: 'Menu OCR Scanner',
      description: 'Extract cafeteria meal prices & compute best-value combos',
      route: '/scanner',
      color: colors.accent,
      badge: 'AI VISION',
    },
    {
      icon: 'person',
      title: 'Profile & Avatar',
      description: 'Manage username, avatar picture & account security',
      route: '/profile',
      color: '#8B5CF6',
    },
    {
      icon: 'settings',
      title: 'Settings & Fin-AI Diagnostics',
      description: 'Preferences, backend connection & cache controls',
      route: '/settings',
      color: '#EC4899',
    },
    {
      icon: 'chatbox-ellipses',
      title: 'Send Feedback',
      description: 'Share thoughts directly with the Piggy Pockets creators',
      route: '/feedback',
      color: '#10B981',
    },
    ...(Platform.OS === 'web'
      ? [
          {
            icon: 'globe-outline' as const,
            title: 'Back to Marketing Website',
            description: 'Return to public marketing homepage and overview',
            route: '/',
            color: colors.primary,
          },
        ]
      : []),
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Studio Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.eyebrowRow}>
            <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.eyebrow, { color: colors.primary }]}>STUDIO UTILITIES</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>More Options</Text>
        </View>
        <View style={styles.headerMascotWrap}>
          <Image
            source={PIGGY_LOGO}
            style={styles.headerMascot}
            resizeMode="cover"
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.route}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.7}
          >
            <Card style={[styles.menuItem, { borderColor: colors.border }]}>
              <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <View style={styles.itemText}>
                <View style={styles.itemTitleRow}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
                  {item.badge && (
                    <View style={[styles.badgePill, { backgroundColor: item.color + '15', borderColor: item.color + '30' }]}>
                      <Text style={[styles.badgeText, { color: item.color }]}>{item.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.itemDescription, { color: colors.textSecondary }]}>
                  {item.description}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 1.5,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  headerMascotWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#F96A9840',
    overflow: 'hidden',
  },
  headerMascot: {
    width: '100%',
    height: '100%',
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.huge,
    gap: Spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderWidth: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  itemText: { flex: 1 },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
  },
  itemDescription: {
    fontSize: FontSize.xs,
    lineHeight: 16,
  },
});
