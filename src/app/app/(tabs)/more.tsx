import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform, Image, Modal, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useCurrency, CURRENCIES, CurrencyDef } from '@/context/CurrencyContext';
import { Card } from '@/components/ui/Card';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { PIGGY_LOGO, SCHOOL_LOGO } from '@/constants/assets';
import { useAuth } from '@/context/AuthContext';
import { confirmAction } from '@/utils/confirm';

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
  const { user, logout } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const isUserAdmin = Boolean(
    user && (
      user.role === 'admin' ||
      user.role === 'owner' ||
      user.email?.toLowerCase() === 'paulwanmarat@gmail.com' ||
      user.email?.toLowerCase() === 'admin@spr.app' ||
      user.email?.toLowerCase().startsWith('admin@')
    )
  );

  const handleLogout = () => {
    confirmAction(
      'Log Out',
      'Are you sure you want to log out of SPR Money Studio?',
      'Log Out',
      async () => {
        await logout();
        router.replace('/(auth)/login' as any);
      },
      true
    );
  };

  const items: MenuItemData[] = [
    {
      icon: 'cart',
      title: 'SPR Marketplace',
      description: 'Buy & sell pre-loved campus textbooks, dorm items & tech',
      route: '/marketplace',
      color: '#F59E0B',
      badge: 'PRE-LOVED',
    },
    {
      icon: 'bulb',
      title: 'SPR Projects',
      description: 'Student project blueprints, IoT guides & AI mentor',
      route: '/projects',
      color: '#8B5CF6',
      badge: 'INNOVATION',
    },
    {
      icon: 'happy',
      title: 'RK (Rich Kid)',
      description: 'Where students upload bills & Rich Kids can pay them',
      route: '/tryland',
      color: '#10B981',
      badge: 'BILLS & SPONSORS',
    },
    {
      icon: 'heart',
      title: 'SPR Donate & Causes',
      description: 'Fund meaningful campus initiatives & student community projects',
      route: '/donate',
      color: '#EC4899',
      badge: 'COMMUNITY',
    },
    {
      icon: 'analytics-outline',
      title: 'Live Impact Totals',
      description: 'Real-time database audit of verified sponsorships & donations (฿ THB)',
      route: '/impact',
      color: '#10B981',
      badge: 'LIVE ฿',
    },
    ...(isUserAdmin
      ? [
          {
            icon: 'shield-checkmark-outline' as const,
            title: 'Payment Verification',
            description: 'Review pending PromptPay transfers, bank slips & approve funding',
            route: '/admin/payments',
            color: '#3B82F6',
            badge: 'ADMIN',
          },
        ]
      : []),
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
        <View style={{ flex: 1 }}>
          <View style={styles.eyebrowRow}>
            <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.eyebrow, { color: colors.primary }]}>STUDIO UTILITIES & ECOSYSTEM</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Platform Hub</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={styles.headerMascotWrap}>
            <Image
              source={PIGGY_LOGO}
              style={styles.headerMascot}
              resizeMode="cover"
            />
          </View>
          <View style={[styles.headerMascotWrap, { backgroundColor: '#FFFFFF', padding: 2 }]}>
            <Image
              source={SCHOOL_LOGO}
              style={styles.headerMascot}
              resizeMode="contain"
            />
          </View>
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

        {/* ── Currency Quick-Select ───────────────── */}
        <TouchableOpacity onPress={() => setShowCurrencyPicker(true)} activeOpacity={0.7}>
          <Card style={[styles.menuItem, { borderColor: colors.primary + '40', backgroundColor: colors.primary + '08' }]}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '18' }]}>
              <Text style={{ fontSize: 18, fontWeight: FontWeight.bold, color: colors.primary }}>{currency.symbol}</Text>
            </View>
            <View style={styles.itemText}>
              <View style={styles.itemTitleRow}>
                <Text style={[styles.itemTitle, { color: colors.text }]}>Display Currency</Text>
                <View style={[styles.badgePill, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>{currency.code}</Text>
                </View>
              </View>
              <Text style={[styles.itemDescription, { color: colors.textSecondary }]}>
                {currency.name} · Tap to change
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </Card>
        </TouchableOpacity>

        {/* Log Out Button */}
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.7}
          style={styles.logoutWrapper}
        >
          <Card style={[styles.menuItem, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '35' }]}>
            <View style={[styles.iconContainer, { backgroundColor: colors.danger + '20' }]}>
              <Ionicons name="log-out-outline" size={22} color={colors.danger} />
            </View>
            <View style={styles.itemText}>
              <Text style={[styles.itemTitle, { color: colors.danger }]}>Log Out of SPR Studio</Text>
              <Text style={[styles.itemDescription, { color: colors.textSecondary }]}>
                End your active session on this device
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.danger} />
          </Card>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Currency Picker Modal ─────────────────── */}
      <Modal visible={showCurrencyPicker} transparent animationType="slide" onRequestClose={() => setShowCurrencyPicker(false)}>
        <View style={pickerStyles.backdrop}>
          <View style={[pickerStyles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[pickerStyles.header, { borderBottomColor: colors.border }]}>
              <Text style={[pickerStyles.title, { color: colors.text }]}>Select Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyPicker(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }: { item: CurrencyDef }) => {
                const isSelected = item.code === currency.code;
                return (
                  <TouchableOpacity
                    style={[
                      pickerStyles.row,
                      { borderBottomColor: colors.border },
                      isSelected && { backgroundColor: colors.primary + '12' },
                    ]}
                    onPress={() => { setCurrency(item); setShowCurrencyPicker(false); }}
                  >
                    <View style={[pickerStyles.symbolBox, { backgroundColor: colors.primary + '18' }]}>
                      <Text style={[pickerStyles.symbol, { color: colors.primary }]}>{item.symbol}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[pickerStyles.name, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[pickerStyles.code, { color: colors.textTertiary }]}>
                        {item.code} · {item.code === 'THB' ? 'Base Currency (1.0x)' : `1฿ ≈ ${item.symbol}${item.rateFromBase}`}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 32 }}
            />
          </View>
        </View>
      </Modal>
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
  logoutWrapper: {
    marginTop: Spacing.sm,
  },
});

const pickerStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  symbolBox: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: { fontSize: 18, fontWeight: FontWeight.bold },
  name: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  code: { fontSize: FontSize.xs, marginTop: 2 },
});
