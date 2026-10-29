import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Card } from '@/components/ui/Card';
import { useTransactions } from '@/hooks/useTransactions';
import { useGoals } from '@/hooks/useGoals';
import { useAuth } from '@/context/AuthContext';
import * as aiHistoryDb from '@/services/database/aiHistory';
import { checkAiBackendStatus, AI_CONFIG } from '@/services/ai/client';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { PIGGY_LOGO } from '@/constants/assets';

export default function SettingsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { transactions } = useTransactions();
  const { goals } = useGoals();
  const [messageCount, setMessageCount] = useState(0);
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  useEffect(() => {
    loadStats();
    checkBackend();
  }, [user]);

  const checkBackend = async () => {
    const status = await checkAiBackendStatus();
    setIsBackendConnected(status);
  };

  const loadStats = async () => {
    if (!user) return;
    try {
      const msgs = await aiHistoryDb.getAIHistory(null, user.id);
      setMessageCount(msgs.length);
    } catch {}
  };

  const handleClearChatHistory = () => {
    if (!user) return;
    Alert.alert('Clear Chat History', 'Delete all AI assistant conversation history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            await aiHistoryDb.clearAIHistory(null, user.id);
            setMessageCount(0);
            Alert.alert('Done', 'Chat history cleared.');
          } catch {
            Alert.alert('Error', 'Failed to clear history.');
          }
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out of SPR Money Studio?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login' as any);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Studio Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.headerPre, { color: colors.primary }]}>STUDIO PREFERENCES</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Settings & Data</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Studio Mascot Header */}
        <Card style={[styles.brandCard, { borderColor: colors.primary + '30', backgroundColor: isDark ? '#1C1322' : '#FFFDF9' }]}>
          <Image
            source={PIGGY_LOGO}
            style={styles.brandMascot}
            resizeMode="cover"
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.brandTitle, { color: colors.text }]}>SPR Money Studio</Text>
            <Text style={[styles.brandSub, { color: colors.textSecondary }]}>
              Student Pecuniary Routine · Ver. 1.0
            </Text>
            <Text style={[styles.brandUser, { color: colors.primary }]}>
              Signed in as {user?.email || 'Student'}
            </Text>
          </View>
        </Card>

        {/* Data Stats */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>STUDIO LEDGER OVERVIEW</Text>
        <Card style={[styles.statsCard, { borderColor: colors.border }]}>
          <View style={styles.statRow}>
            <Ionicons name="swap-vertical" size={20} color={colors.primary} />
            <Text style={[styles.statText, { color: colors.text }]}>Logged Transactions</Text>
            <Text style={[styles.statValue, { color: colors.textSecondary }]}>{transactions.length}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.statRow}>
            <Ionicons name="flag" size={20} color={colors.primary} />
            <Text style={[styles.statText, { color: colors.text }]}>Active & Completed Goals</Text>
            <Text style={[styles.statValue, { color: colors.textSecondary }]}>{goals.length}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.statRow}>
            <Ionicons name="chatbubble" size={20} color={colors.primary} />
            <Text style={[styles.statText, { color: colors.text }]}>AI Advisor Consultations</Text>
            <Text style={[styles.statValue, { color: colors.textSecondary }]}>{messageCount}</Text>
          </View>
        </Card>

        {/* AI Backend Status */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>FIN-AI SERVICE CONNECTION</Text>
        <Card style={[styles.statsCard, { borderColor: colors.border }]}>
          <View style={styles.statRow}>
            <Ionicons
              name={isBackendConnected ? 'cloud-done' : 'cloud-offline'}
              size={22}
              color={isBackendConnected ? colors.success : colors.warning}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statText, { color: colors.text }]}>Gemini AI Engine</Text>
              <Text style={[styles.statusHint, { color: colors.textTertiary }]}>
                {isBackendConnected
                  ? 'Connected · Ready for financial advice & OCR'
                  : 'Backend offline. Make sure the Node server is running on port 3000.'}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isBackendConnected ? colors.success + '20' : colors.warning + '20',
                  borderColor: isBackendConnected ? colors.success + '40' : colors.warning + '40',
                },
              ]}
            >
              <Text style={[styles.statusText, { color: isBackendConnected ? colors.success : colors.warning }]}>
                {isBackendConnected ? 'ONLINE' : 'OFFLINE'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Actions */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>DATA & PRIVACY CONTROLS</Text>
        <Card style={[styles.statsCard, { borderColor: colors.border }]}>
          <TouchableOpacity style={styles.actionRow} onPress={handleClearChatHistory}>
            <Ionicons name="chatbubble-outline" size={20} color={colors.text} />
            <Text style={[styles.actionText, { color: colors.text }]}>Clear Fin-AI History</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </Card>

        {/* Help & Feedback */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>COMMUNITY & SUPPORT</Text>
        <Card style={[styles.statsCard, { borderColor: colors.border }]}>
          <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/feedback' as any)}>
            <Ionicons name="megaphone-outline" size={20} color={colors.text} />
            <Text style={[styles.actionText, { color: colors.text }]}>Send Feedback to Creators</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </Card>

        {/* Account */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>ACCOUNT CREDENTIALS</Text>
        <Card style={[styles.statsCard, { borderColor: colors.border }]}>
          <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/profile' as any)}>
            <Ionicons name="person-outline" size={20} color={colors.text} />
            <Text style={[styles.actionText, { color: colors.text }]}>Edit Profile & Avatar</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.actionRow} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={[styles.actionText, { color: colors.danger, fontWeight: FontWeight.semibold }]}>
              Sign Out
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.danger} />
          </TouchableOpacity>
        </Card>

        {/* Project Credits */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>ABOUT THE PROJECT</Text>
        <Card style={{ borderColor: colors.border, padding: Spacing.lg }}>
          <Text style={[styles.aboutTitle, { color: colors.text }]}>Student Pecuniary Routine (SPR)</Text>
          <Text style={[styles.aboutDescription, { color: colors.textSecondary }]}>
            Engineered to empower secondary school and university students to overcome impulsive buying, set realistic savings milestones, and establish conscious pecuniary habits.
          </Text>

          <View style={[styles.creditBox, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
            <Text style={[styles.creditTeam, { color: colors.primary }]}>Piggy Pockets Development Team</Text>
            <Text style={[styles.creditSchool, { color: colors.textSecondary }]}>
              Saipanyarangsit School · Mini English Program (MEP)
            </Text>
            <View style={[styles.advisorPill, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
              <Ionicons name="ribbon-outline" size={14} color={colors.primary} />
              <Text style={[styles.creditAdvisor, { color: colors.primary }]}>
                Project Advisor: Mr. Anthony Jose B. Ferrer
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerPre: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.huge,
  },
  brandCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1.5,
    marginBottom: Spacing.xs,
  },
  brandMascot: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  brandTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  brandSub: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  brandUser: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 1.2,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
    marginLeft: 2,
  },
  statsCard: {
    marginBottom: Spacing.xs,
    padding: Spacing.md,
    borderWidth: 1,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  statText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  statValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  statusHint: {
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  actionText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  aboutTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  aboutDescription: {
    fontSize: FontSize.xs,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  creditBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 4,
  },
  creditTeam: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  creditSchool: {
    fontSize: 11,
  },
  advisorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  creditAdvisor: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
});
