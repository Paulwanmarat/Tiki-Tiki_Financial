import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, usePathname, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { useGoals } from '@/hooks/useGoals';
import { PIGGY_LOGO, SCHOOL_LOGO } from '@/constants/assets';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { formatPercentage, getUserDisplayName } from '@/utils/formatters';
import { confirmAction } from '@/utils/confirm';
import * as aiHistoryDb from '@/services/database/aiHistory';

interface DesktopSidebarProps {
  onNewGoal?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function DesktopSidebar({ onNewGoal, collapsed = false, onToggleCollapse }: DesktopSidebarProps) {
  const { colors, isDark } = useTheme();
  const { user, logout } = useAuth();
  const { formatCurrency } = useCurrency();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useLocalSearchParams<{ goalId?: string }>();
  const { goalsWithProgress, removeGoal } = useGoals();

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

  const navItems = [
    { label: 'Dashboard', icon: 'grid-outline', activeIcon: 'grid', route: '/app' },
    { label: 'Transactions', icon: 'swap-vertical-outline', activeIcon: 'swap-vertical', route: '/app/transactions' },
    { label: 'Goals & AI Chat', icon: 'flag-outline', activeIcon: 'flag', route: '/app/goals' },
    { label: 'Spending Simulator', icon: 'calculator-outline', activeIcon: 'calculator', route: '/simulator' },
    { label: 'Menu OCR Scanner', icon: 'camera-outline', activeIcon: 'camera', route: '/scanner' },
  ];

  const communityItems = [
    { label: 'Marketplace', icon: 'cart-outline', activeIcon: 'cart', route: '/marketplace' },
    { label: 'SPR Projects', icon: 'bulb-outline', activeIcon: 'bulb', route: '/projects' },
    { label: '🌳RYLAND', icon: 'leaf-outline', activeIcon: 'leaf', route: '/tryland' },
    { label: 'Donate & Causes', icon: 'heart-outline', activeIcon: 'heart', route: '/donate' },
    { label: 'Live Impact (฿)', icon: 'analytics-outline', activeIcon: 'analytics', route: '/impact' },
    { label: 'Payment Admin', icon: 'shield-checkmark-outline', activeIcon: 'shield-checkmark', route: '/admin/payments' },
  ];

  const handleGoalSelect = (goalId: string) => {
    router.push({
      pathname: '/app/goals' as any,
      params: { goalId },
    });
  };

  const handleDeleteGoal = (goalId: string, goalName: string, e: any) => {
    e?.stopPropagation?.();
    confirmAction(
      'Delete Goal',
      `Delete "${goalName}" and its AI chat history? This cannot be undone.`,
      'Delete',
      async () => {
        try {
          if (user) {
            await aiHistoryDb.clearAIHistory(null, user.id, goalId);
          }
          await removeGoal(goalId);
          // If currently viewing that goal's chat, navigate away
          if (pathname === '/app/goals' && searchParams.goalId === goalId) {
            router.replace('/app/goals' as any);
          }
        } catch (err: any) {
          Alert.alert('Error', err?.message || 'Failed to delete goal');
        }
      },
      true
    );
  };

  const handleCreateNewGoal = () => {
    if (onNewGoal) {
      onNewGoal();
    } else {
      router.push({
        pathname: '/app/goals' as any,
        params: { create: '1' },
      });
    }
  };

  return (
    <View
      style={[
        styles.sidebar,
        {
          backgroundColor: isDark ? '#110D15' : '#FBF7F4',
          borderColor: colors.border,
        },
      ]}
    >
      {/* 1. Header: Brand + Collapse Toggle */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.brandRow}
          onPress={() => router.push('/' as any)}
          activeOpacity={0.8}
        >
          <View style={[styles.logoCircle, { borderColor: colors.primary }]}>
            <Image source={PIGGY_LOGO} style={styles.logoImg} resizeMode="cover" />
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.brandTitle, { color: colors.text }]}>SPR</Text>
              <View style={[styles.studioBadge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.studioBadgeText, { color: colors.primary }]}>STUDIO</Text>
              </View>
            </View>
            <Text style={[styles.brandSub, { color: colors.textTertiary }]}>Student Pecuniary Routine</Text>
          </View>
        </TouchableOpacity>

        {onToggleCollapse && (
          <TouchableOpacity onPress={onToggleCollapse} style={styles.collapseBtn}>
            <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* 2. ChatGPT-style "+ New Goal / Chat" Button */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          style={[
            styles.newGoalBtn,
            {
              backgroundColor: colors.surface,
              borderColor: colors.primary + '60',
            },
          ]}
          onPress={handleCreateNewGoal}
          activeOpacity={0.8}
        >
          <View style={[styles.newGoalIconWrap, { backgroundColor: colors.primary }]}>
            <Ionicons name="add" size={16} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.newGoalText, { color: colors.text }]}>New Goal / Chat</Text>
            <Text style={[styles.newGoalSub, { color: colors.textTertiary }]}>Set target · start AI thread</Text>
          </View>
          <Ionicons name="sparkles" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* 3. Main Navigation Items */}
      <View style={styles.navSection}>
        <Text style={[styles.sectionHeading, { color: colors.textTertiary }]}>NAVIGATION</Text>
        {navItems.map((item) => {
          const isActive = pathname === item.route;
          return (
            <TouchableOpacity
              key={item.route}
              style={[
                styles.navItem,
                isActive && [
                  styles.navItemActive,
                  { backgroundColor: colors.primary + '15' },
                ],
              ]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={(isActive ? item.activeIcon : item.icon) as any}
                size={18}
                color={isActive ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.navItemText,
                  { color: isActive ? colors.primary : colors.text },
                  isActive && { fontWeight: FontWeight.bold },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 3b. Student Community & Commerce */}
      <View style={[styles.navSection, { marginTop: 4 }]}>
        <Text style={[styles.sectionHeading, { color: colors.textTertiary }]}>CAMPUS & COMMUNITY</Text>
        {communityItems.map((item) => {
          const isActive = pathname.startsWith(item.route);
          return (
            <TouchableOpacity
              key={item.route}
              style={[
                styles.navItem,
                isActive && [
                  styles.navItemActive,
                  { backgroundColor: colors.primary + '15' },
                ],
              ]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={(isActive ? item.activeIcon : item.icon) as any}
                size={18}
                color={isActive ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.navItemText,
                  { color: isActive ? colors.primary : colors.text },
                  isActive && { fontWeight: FontWeight.bold },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 4. Goal Chats List (ChatGPT Recent Chats Style) */}
      <View style={styles.chatsSection}>
        <View style={styles.chatsHeader}>
          <Text style={[styles.sectionHeading, { color: colors.textTertiary }]}>GOAL CHATS</Text>
          <Text style={[styles.countBadge, { color: colors.primary, backgroundColor: colors.primary + '18' }]}>
            {goalsWithProgress.length}
          </Text>
        </View>

        <ScrollView
          style={styles.chatsList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Spacing.md }}
        >
          {goalsWithProgress.length === 0 ? (
            <TouchableOpacity
              style={[styles.emptyChatPrompt, { borderColor: colors.border }]}
              onPress={handleCreateNewGoal}
            >
              <Ionicons name="chatbubbles-outline" size={16} color={colors.textTertiary} />
              <Text style={[styles.emptyChatText, { color: colors.textSecondary }]}>
                No goal chats yet.{'\n'}Tap "+ New Goal / Chat" above!
              </Text>
            </TouchableOpacity>
          ) : (
            goalsWithProgress.map((gp) => {
              const isSelected =
                pathname === '/app/goals' &&
                (searchParams.goalId === gp.goal.id || (!searchParams.goalId && goalsWithProgress[0]?.goal.id === gp.goal.id));
              const isCompleted = gp.goal.status === 'completed';

              return (
                <TouchableOpacity
                  key={gp.goal.id}
                  style={[
                    styles.goalChatItem,
                    isSelected && [
                      styles.goalChatItemActive,
                      {
                        backgroundColor: colors.primary + '18',
                        borderColor: colors.primary + '40',
                      },
                    ],
                  ]}
                  onPress={() => handleGoalSelect(gp.goal.id)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={isCompleted ? 'trophy' : isSelected ? 'chatbubble-ellipses' : 'chatbubble-outline'}
                    size={16}
                    color={isCompleted ? colors.success : isSelected ? colors.primary : colors.textTertiary}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[
                        styles.goalChatTitle,
                        { color: isSelected ? colors.primary : colors.text },
                        isSelected && { fontWeight: FontWeight.bold },
                      ]}
                      numberOfLines={1}
                    >
                      {gp.goal.name}
                    </Text>
                    <Text style={[styles.goalChatSub, { color: colors.textTertiary }]} numberOfLines={1}>
                      {formatCurrency(gp.goal.currentAmount)} / {formatCurrency(gp.goal.targetAmount)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.pctPill,
                      {
                        backgroundColor: isCompleted ? colors.success + '20' : colors.primary + '18',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pctPillText,
                        { color: isCompleted ? colors.success : colors.primary },
                      ]}
                    >
                      {formatPercentage(gp.percentage, 0)}
                    </Text>
                  </View>
                  {/* Delete button — shown on hover/tap for each goal row */}
                  <TouchableOpacity
                    style={[styles.sidebarDeleteBtn, { backgroundColor: colors.danger + '18' }]}
                    onPress={(e) => handleDeleteGoal(gp.goal.id, gp.goal.name, e)}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    accessibilityLabel={`Delete goal ${gp.goal.name}`}
                  >
                    <Ionicons name="trash-outline" size={12} color={colors.danger} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* 5. Institutional Affiliation */}
      <View style={[styles.schoolAffilBar, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <Image source={SCHOOL_LOGO} style={styles.schoolAffilLogo} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.schoolAffilTitle, { color: colors.textSecondary }]}>Saipanyarangsit School</Text>
          <Text style={[styles.schoolAffilSub, { color: colors.textTertiary }]}>Mini English Program (MEP)</Text>
        </View>
      </View>

      {/* 6. User Profile Drawer at Bottom */}
      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={styles.profileRow}
          onPress={() => router.push('/profile' as any)}
          activeOpacity={0.8}
        >
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.userAvatar} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                {(user?.username || user?.email || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
              {getUserDisplayName(user)}
            </Text>
            <Text style={[styles.userEmail, { color: colors.textTertiary }]} numberOfLines={1}>
              {user?.email || 'Student Account'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.footerActions}>
          <TouchableOpacity
            style={[styles.footerIconBtn, { borderColor: colors.border }]}
            onPress={() => router.push('/settings' as any)}
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={17} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerIconBtn, { borderColor: colors.border }]}
            onPress={handleLogout}
            accessibilityLabel="Log out"
          >
            <Ionicons name="log-out-outline" size={17} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 270,
    height: '100%',
    borderRightWidth: 1,
    flexDirection: 'column',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        position: 'sticky' as any,
        top: 0,
        height: '100vh' as any,
      },
    }),
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  logoImg: {
    width: '100%',
    height: '100%',
  },
  brandTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.5,
  },
  studioBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  studioBadgeText: {
    fontSize: 8,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  brandSub: {
    fontSize: 9,
    fontWeight: FontWeight.medium,
  },
  collapseBtn: {
    padding: 6,
    borderRadius: BorderRadius.sm,
  },
  actionSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  newGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  newGoalIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newGoalText: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
  newGoalSub: {
    fontSize: 10,
  },
  navSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    gap: 2,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 1.2,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 9,
    borderRadius: BorderRadius.md,
  },
  navItemActive: {
    borderRadius: BorderRadius.md,
  },
  navItemText: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.medium,
  },
  chatsSection: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  chatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
    paddingRight: Spacing.xs,
  },
  countBadge: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 99,
  },
  chatsList: {
    flex: 1,
  },
  emptyChatPrompt: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
    gap: 6,
  },
  emptyChatText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  goalChatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  goalChatItemActive: {
    borderRadius: BorderRadius.md,
  },
  goalChatTitle: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.medium,
  },
  goalChatSub: {
    fontSize: 10,
    marginTop: 1,
  },
  pctPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pctPillText: {
    fontSize: 9,
    fontWeight: FontWeight.extrabold,
  },
  footer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  schoolAffilBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  schoolAffilLogo: {
    width: 22,
    height: 22,
  },
  schoolAffilTitle: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
  },
  schoolAffilSub: {
    fontSize: 9,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  avatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  userName: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
  userEmail: {
    fontSize: 10,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  footerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  sidebarDeleteBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
});
