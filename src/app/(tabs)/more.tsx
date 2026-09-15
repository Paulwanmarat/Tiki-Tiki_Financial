import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Card } from '@/components/ui/Card';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

interface MenuItemData {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  route: string;
  color: string;
}

export default function MoreScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const items: MenuItemData[] = [
    {
      icon: 'calculator',
      title: 'Spending Simulator',
      description: 'See how a purchase affects your finances',
      route: '/simulator',
      color: colors.secondary,
    },
    {
      icon: 'camera',
      title: 'Menu Scanner',
      description: 'Scan a menu and get value recommendations',
      route: '/scanner',
      color: colors.accent,
    },
    {
      icon: 'settings',
      title: 'Settings',
      description: 'App preferences and data management',
      route: '/settings',
      color: colors.textTertiary,
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>More</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={item.route}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.7}
          >
            <Card style={styles.menuItem}>
              <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <View style={styles.itemText}>
                <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.itemDescription, { color: colors.textSecondary }]}>{item.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.huge, gap: Spacing.md },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  itemText: { flex: 1 },
  itemTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, marginBottom: 2 },
  itemDescription: { fontSize: FontSize.sm },
});
