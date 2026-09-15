import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTransactions } from '@/hooks/useTransactions';
import { useGoals } from '@/hooks/useGoals';
import { useAuth } from '@/context/AuthContext';
import * as aiHistoryDb from '@/services/database/aiHistory';
import { checkAiBackendStatus, AI_CONFIG } from '@/services/ai/client';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

export default function SettingsScreen() {
  const { colors } = useTheme();
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
        text: 'Clear', style: 'destructive', onPress: async () => {
          try {
            await aiHistoryDb.clearAIHistory(null, user.id);
            setMessageCount(0);
            Alert.alert('Done', 'Chat history cleared.');
          } catch { Alert.alert('Error', 'Failed to clear history.'); }
        },
      },
    ]);
  };
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Data Stats */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>YOUR DATA</Text>
        <Card style={styles.statsCard}>
          <View style={styles.statRow}>
            <Ionicons name="swap-vertical" size={20} color={colors.primary} />
            <Text style={[styles.statText, { color: colors.text }]}>Transactions</Text>
            <Text style={[styles.statValue, { color: colors.textSecondary }]}>{transactions.length}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.statRow}>
            <Ionicons name="flag" size={20} color={colors.primary} />
            <Text style={[styles.statText, { color: colors.text }]}>Goals</Text>
            <Text style={[styles.statValue, { color: colors.textSecondary }]}>{goals.length}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.statRow}>
            <Ionicons name="chatbubble" size={20} color={colors.primary} />
            <Text style={[styles.statText, { color: colors.text }]}>Chat Messages</Text>
            <Text style={[styles.statValue, { color: colors.textSecondary }]}>{messageCount}</Text>
          </View>
        </Card>

        {/* AI Backend */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>AI BACKEND</Text>
        <Card style={styles.statsCard}>
          <View style={styles.statRow}>
            <Ionicons 
              name={isBackendConnected ? "cloud-done-outline" : "cloud-offline-outline"} 
              size={20} 
              color={isBackendConnected ? colors.success : colors.warning} 
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statText, { color: colors.text }]}>Status</Text>
              <Text style={[styles.statusHint, { color: colors.textTertiary }]}>
                {isBackendConnected 
                  ? `Connected to AI Proxy` 
                  : `Disconnected. Start the server on ${AI_CONFIG.baseUrl.replace('/api', '')}`}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: isBackendConnected ? colors.success + '20' : colors.warning + '20' }]}>
              <Text style={[styles.statusText, { color: isBackendConnected ? colors.success : colors.warning }]}>
                {isBackendConnected ? 'Connected' : 'Offline'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Actions */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>DATA MANAGEMENT</Text>
        <Card style={styles.statsCard}>
          <TouchableOpacity style={styles.actionRow} onPress={handleClearChatHistory}>
            <Ionicons name="chatbubble-outline" size={20} color={colors.text} />
            <Text style={[styles.actionText, { color: colors.text }]}>Clear Chat History</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </Card>

        {/* Account */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>ACCOUNT</Text>
        <Card style={styles.statsCard}>
          <TouchableOpacity style={styles.actionRow} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={[styles.actionText, { color: colors.danger }]}>Log Out</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </Card>

        {/* About */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>ABOUT</Text>
        <Card>
          <Text style={[styles.aboutTitle, { color: colors.text }]}>Tiki Finance</Text>
          <Text style={[styles.aboutVersion, { color: colors.textTertiary }]}>Version 1.0.0</Text>
          <Text style={[styles.aboutDescription, { color: colors.textSecondary }]}>
            A personal finance app built for students and young adults. Track spending, set goals, simulate purchases, and get AI-powered insights.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.huge },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, textTransform: 'uppercase', letterSpacing: 1, marginTop: Spacing.xl, marginBottom: Spacing.sm, marginLeft: Spacing.xs },
  statsCard: { marginBottom: Spacing.sm },
  statRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.md },
  statText: { flex: 1, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  statValue: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.xs },
  statusHint: { fontSize: FontSize.xs, marginTop: 2 },
  statusBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  statusText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.md },
  actionText: { flex: 1, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  aboutTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginBottom: Spacing.xs },
  aboutVersion: { fontSize: FontSize.sm, marginBottom: Spacing.md },
  aboutDescription: { fontSize: FontSize.md, lineHeight: 22 },
});
