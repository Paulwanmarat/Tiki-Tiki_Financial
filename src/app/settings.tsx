import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Card } from '@/components/ui/Card';
import { useTransactions } from '@/hooks/useTransactions';
import { useGoals } from '@/hooks/useGoals';
import { useAuth } from '@/context/AuthContext';
import { useCurrency, CURRENCIES, CurrencyDef } from '@/context/CurrencyContext';
import { useLanguage } from '@/context/LanguageContext';
import * as aiHistoryDb from '@/services/database/aiHistory';
import { checkAiBackendStatus, AI_CONFIG } from '@/services/ai/client';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { PIGGY_LOGO, SCHOOL_LOGO } from '@/constants/assets';
import { confirmAction } from '@/utils/confirm';

export default function SettingsScreen() {
  const { colors, isDark, themeMode, systemTheme, setThemeMode } = useTheme();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { transactions } = useTransactions();
  const { goals } = useGoals();
  const { currency, setCurrency, formatCurrency } = useCurrency();
  const { language, setLanguage, t } = useLanguage();
  const [messageCount, setMessageCount] = useState(0);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

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
    confirmAction(
      'Clear Chat History',
      'Delete all AI assistant conversation history?',
      'Clear',
      async () => {
        try {
          await aiHistoryDb.clearAIHistory(null, user.id);
          setMessageCount(0);
          Alert.alert('Done', 'Chat history cleared.');
        } catch {
          Alert.alert('Error', 'Failed to clear history.');
        }
      },
      true
    );
  };

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

        {/* ── App Appearance & Theme ───────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>APP APPEARANCE & THEME</Text>
        <Card style={[styles.statsCard, { borderColor: colors.border, padding: Spacing.md }]}>
          <View style={styles.themeHeaderRow}>
            <View style={[styles.themeIconCircle, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons
                name={themeMode === 'system' ? 'phone-portrait-outline' : isDark ? 'moon' : 'sunny'}
                size={20}
                color={colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statText, { color: colors.text }]}>Color Theme</Text>
              <Text style={[styles.statusHint, { color: colors.textTertiary }]}>
                {themeMode === 'system'
                  ? `Based on device & browser settings (${systemTheme === 'dark' ? 'Dark' : 'Light'})`
                  : themeMode === 'dark'
                  ? 'Always Dark Mode'
                  : 'Always Light Mode'}
              </Text>
            </View>
          </View>

          {/* 3-way Segment Control: Light, Dark, Auto/Device */}
          <View style={[styles.themeSegmentTrack, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.themeSegmentBtn,
                themeMode === 'light' && [styles.themeSegmentBtnActive, { backgroundColor: colors.surface, borderColor: colors.border }],
              ]}
              onPress={() => setThemeMode('light')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="sunny"
                size={16}
                color={themeMode === 'light' ? colors.primary : colors.textTertiary}
              />
              <Text
                style={[
                  styles.themeSegmentText,
                  { color: themeMode === 'light' ? colors.primary : colors.textSecondary },
                  themeMode === 'light' && { fontWeight: FontWeight.bold },
                ]}
              >
                Light
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeSegmentBtn,
                themeMode === 'dark' && [styles.themeSegmentBtnActive, { backgroundColor: colors.surface, borderColor: colors.border }],
              ]}
              onPress={() => setThemeMode('dark')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="moon"
                size={16}
                color={themeMode === 'dark' ? colors.primary : colors.textTertiary}
              />
              <Text
                style={[
                  styles.themeSegmentText,
                  { color: themeMode === 'dark' ? colors.primary : colors.textSecondary },
                  themeMode === 'dark' && { fontWeight: FontWeight.bold },
                ]}
              >
                Dark
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeSegmentBtn,
                themeMode === 'system' && [styles.themeSegmentBtnActive, { backgroundColor: colors.surface, borderColor: colors.border }],
              ]}
              onPress={() => setThemeMode('system')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="phone-portrait-outline"
                size={16}
                color={themeMode === 'system' ? colors.primary : colors.textTertiary}
              />
              <Text
                style={[
                  styles.themeSegmentText,
                  { color: themeMode === 'system' ? colors.primary : colors.textSecondary },
                  themeMode === 'system' && { fontWeight: FontWeight.bold },
                ]}
              >
                Auto / Device
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* ── Language Setting ───────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{t('settings.language', 'LANGUAGE / ภาษา')}</Text>
        <Card style={[styles.statsCard, { borderColor: colors.border, padding: Spacing.md }]}>
          <View style={styles.themeHeaderRow}>
            <View style={[styles.themeIconCircle, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="globe-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statText, { color: colors.text }]}>App Language</Text>
              <Text style={[styles.statusHint, { color: colors.textTertiary }]}>
                {language === 'th' ? 'ภาษาไทย (Thai)' : 'English (United States)'}
              </Text>
            </View>
          </View>

          <View style={[styles.themeSegmentTrack, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border, marginTop: Spacing.sm }]}>
            <TouchableOpacity
              style={[
                styles.themeSegmentBtn,
                language === 'en' && [styles.themeSegmentBtnActive, { backgroundColor: colors.surface, borderColor: colors.border }],
              ]}
              onPress={() => setLanguage('en')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.themeSegmentText,
                  { color: language === 'en' ? colors.primary : colors.textSecondary },
                  language === 'en' && { fontWeight: FontWeight.bold },
                ]}
              >
                🇺🇸 English
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeSegmentBtn,
                language === 'th' && [styles.themeSegmentBtnActive, { backgroundColor: colors.surface, borderColor: colors.border }],
              ]}
              onPress={() => setLanguage('th')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.themeSegmentText,
                  { color: language === 'th' ? colors.primary : colors.textSecondary },
                  language === 'th' && { fontWeight: FontWeight.bold },
                ]}
              >
                🇹🇭 ภาษาไทย
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* ── Currency Setting ───────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>DISPLAY CURRENCY</Text>
        <Card style={[styles.statsCard, { borderColor: colors.border }]}>
          <TouchableOpacity style={styles.actionRow} onPress={() => setShowCurrencyPicker(true)}>
            <Text style={[styles.currencySymbolBig, { color: colors.primary }]}>{currency.symbol}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statText, { color: colors.text }]}>{currency.name}</Text>
              <Text style={[styles.statusHint, { color: colors.textTertiary }]}>
                {currency.code} · Tap to change currency
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
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

        {/* Project Credits & Institutional Attribution */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>ABOUT THE PROJECT</Text>
        <Card style={{ borderColor: colors.border, padding: Spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md }}>
            {/* Primary Product Identity */}
            <View style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', borderWidth: 2, borderColor: colors.primary }}>
              <Image source={PIGGY_LOGO} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
            {/* Supporting Institutional Affiliation */}
            <View style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', backgroundColor: '#FFFFFF', padding: 3, borderWidth: 1, borderColor: colors.border }}>
              <Image source={SCHOOL_LOGO} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.aboutTitle, { color: colors.text }]}>Student Pecuniary Routine</Text>
              <Text style={{ fontSize: 11, color: colors.textTertiary }}>SPR Money Studio · MEP Edition</Text>
            </View>
          </View>

          <Text style={[styles.aboutDescription, { color: colors.textSecondary }]}>
            Engineered to empower secondary school and university students to overcome impulsive buying, set realistic savings milestones, and establish conscious pecuniary habits.
          </Text>

          <View style={[styles.creditBox, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
            <Text style={[styles.creditTeam, { color: colors.primary }]}>Piggy Pockets Development Team</Text>
            <Text style={[styles.creditSchool, { color: colors.textSecondary }]}>
              Saipanyarangsit School · Mini English Program (MEP)
            </Text>

            {/* Team Members */}
            <View style={{ marginTop: Spacing.sm, gap: 4 }}>
              {[
                { name: 'Witchayaporn Boriraj', role: 'Presentation Slide Maker' },
                { name: 'Pimnara Boonyawatputthi', role: 'Researcher' },
                { name: 'Wachrawit Jindawong', role: 'Presentation Slide Maker' },
                { name: 'Phanyawat Wanmarat', role: 'Programmer' },
              ].map((m, idx) => (
                <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: FontSize.xs, color: colors.text, fontWeight: FontWeight.semibold }}>{m.name}</Text>
                  <Text style={{ fontSize: 11, color: colors.textTertiary }}>{m.role}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.advisorPill, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30', marginTop: Spacing.md }]}>
              <Ionicons name="ribbon-outline" size={14} color={colors.primary} />
              <Text style={[styles.creditAdvisor, { color: colors.primary }]}>
                Project Advisor: Mr. Anthony Jose B. Ferrer
              </Text>
            </View>
          </View>
        </Card>
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
                      pickerStyles.currencyRow,
                      { borderBottomColor: colors.border },
                      isSelected && { backgroundColor: colors.primary + '12' },
                    ]}
                    onPress={() => {
                      setCurrency(item);
                      setShowCurrencyPicker(false);
                    }}
                  >
                    <View style={[pickerStyles.symbolBox, { backgroundColor: colors.primary + '18' }]}>
                      <Text style={[pickerStyles.symbolText, { color: colors.primary }]}>{item.symbol}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[pickerStyles.currencyName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[pickerStyles.currencyCode, { color: colors.textTertiary }]}>
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
  currencySymbolBig: {
    fontSize: 24,
    fontWeight: FontWeight.bold,
    width: 40,
    textAlign: 'center',
  },
  themeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  themeIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeSegmentTrack: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  themeSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: BorderRadius.sm + 2,
  },
  themeSegmentBtnActive: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  themeSegmentText: {
    fontSize: FontSize.xs + 1,
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
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  currencyRow: {
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
  symbolText: {
    fontSize: 18,
    fontWeight: FontWeight.bold,
  },
  currencyName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  currencyCode: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
});
