import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Alert,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useCurrency } from '@/context/CurrencyContext';
import { useAuth } from '@/context/AuthContext';
import { confirmAction } from '@/utils/confirm';
import {
  getProjectById,
  activatePilotSubscription,
  getProjectAIHistory,
  askProjectAI,
  deleteProject,
} from '@/services/database/projects';
import { ProjectDetail, ProjectAIMessage } from '@/types/projects';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { PIGGY_LOGO } from '@/constants/assets';

export default function ProjectDetailScreen() {
  const { colors, isDark } = useTheme();
  const { formatCurrency } = useCurrency();
  const { user } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activatingPass, setActivatingPass] = useState(false);

  const isAdmin = Boolean(
    user && (
      user.role === 'admin' ||
      user.role === 'owner' ||
      user.email?.toLowerCase() === 'paulwanmarat@gmail.com' ||
      user.email?.toLowerCase() === 'admin@spr.app'
    )
  );

  const isCreator = Boolean(user && project && (project.created_by === user.id || isAdmin));

  const handleDeleteProject = () => {
    if (!project || !isCreator) return;
    confirmAction(
      'Remove Project Blueprint',
      `Are you sure you want to remove "${project.title}"? This action cannot be undone.`,
      'Remove Blueprint',
      async () => {
        try {
          await deleteProject(project.id);
          Alert.alert('Project Removed', 'The project blueprint has been removed successfully.');
          router.replace('/projects' as any);
        } catch (err: any) {
          Alert.alert('Notice', err?.message || 'Failed to remove project');
        }
      },
      true
    );
  };

  // AI Project Assistant State
  const [showAiDrawer, setShowAiDrawer] = useState(false);
  const [aiMessages, setAiMessages] = useState<ProjectAIMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const aiScrollRef = useRef<ScrollView>(null);

  const loadProject = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getProjectById(id);
      setProject(data);

      // Load AI conversation history
      const history = await getProjectAIHistory(id).catch(() => []);
      setAiMessages(history);
    } catch (err: any) {
      setError(err?.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const handleActivatePilot = async () => {
    try {
      setActivatingPass(true);
      const res = await activatePilotSubscription();
      Alert.alert('Unlocked! 🎓', res.message);
      await loadProject();
    } catch (err: any) {
      Alert.alert('Notice', err?.message || 'Failed to activate pass');
    } finally {
      setActivatingPass(false);
    }
  };

  const handleSendAiQuestion = async (queryText?: string) => {
    const textToSend = (queryText || aiInput).trim();
    if (!textToSend || !id || aiLoading) return;

    setAiInput('');
    const tempUserMsg: ProjectAIMessage = {
      id: 'temp_' + Date.now(),
      role: 'user',
      content: textToSend,
      created_at: new Date().toISOString(),
    };
    setAiMessages((prev) => [...prev, tempUserMsg]);

    try {
      setAiLoading(true);
      const result = await askProjectAI(id, textToSend);
      const assistantMsg: ProjectAIMessage = {
        id: result.assistantMessageId,
        role: 'assistant',
        content: result.reply,
        created_at: new Date().toISOString(),
      };
      setAiMessages((prev) => [...prev, assistantMsg]);
      setTimeout(() => {
        aiScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err: any) {
      Alert.alert('AI Advisor Notice', err?.message || 'Failed to get mentor response');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading project guide...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !project) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.expense} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>{error || 'Project not found'}</Text>
          <TouchableOpacity
            style={[styles.backBtnAction, { backgroundColor: colors.primary }]}
            onPress={() => router.replace('/projects' as any)}
          >
            <Text style={styles.backBtnActionText}>Back to Projects</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const coverImg = project.images && project.images.length > 0 ? project.images[0] : null;
  const isLocked = project.is_premium && !project.canAccessFullContent;

  const quickPrompts = [
    'How can I lower estimated material costs?',
    'What common mistakes happen during assembly?',
    'Explain step 2 in simpler terms',
  ];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 1. Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {project.title}
        </Text>
        <TouchableOpacity
          style={[
            styles.aiToggleBtn,
            { backgroundColor: showAiDrawer ? colors.primary : colors.surfaceHighlight, borderColor: colors.border },
          ]}
          onPress={() => setShowAiDrawer(!showAiDrawer)}
        >
          <Ionicons name="sparkles" size={16} color={showAiDrawer ? '#FFF' : colors.primary} />
          <Text style={[styles.aiToggleText, { color: showAiDrawer ? '#FFF' : colors.text }]}>
            {showAiDrawer ? 'Hide AI' : 'Ask AI'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column' }}>
        {/* Main Content Area */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.mainWrapper, isDesktop && styles.desktopWrapper]}>
            {/* Cover image */}
            {coverImg ? (
              <View style={[styles.coverWrap, { borderColor: colors.border }]}>
                <Image source={{ uri: coverImg }} style={styles.coverImg} resizeMode="cover" />
              </View>
            ) : null}

            {/* Title & Metadata Header */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.categoryRow}>
                <Text style={[styles.categoryBadge, { color: colors.primary, backgroundColor: colors.primary + '18' }]}>
                  {project.category.toUpperCase()}
                </Text>
                <Text style={[styles.diffBadge, { color: colors.textSecondary }]}>
                  Difficulty: <Text style={{ fontWeight: FontWeight.bold, color: colors.text }}>{project.difficulty}</Text>
                </Text>
              </View>

              <Text style={[styles.projTitle, { color: colors.text }]}>{project.title}</Text>

              {/* Author & Launch Credit */}
              <View style={styles.authorDetailRow}>
                <View style={[styles.authorPill, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '35' }]}>
                  <Ionicons name="sparkles" size={12} color={colors.primary} />
                  <Text style={[styles.authorPillText, { color: colors.primary }]}>BLUEPRINT CREATOR</Text>
                </View>
                <Ionicons name="person-circle" size={18} color={colors.primary} />
                <Text style={[styles.authorDetailText, { color: colors.textSecondary }]}>
                  Launched by <Text style={{ fontWeight: FontWeight.bold, color: colors.text }}>{project.author_name || 'SPR Innovation Lab'}</Text>
                </Text>
              </View>

              {/* Stats Bar */}
              <View style={[styles.statsRow, { backgroundColor: colors.surfaceHighlight }]}>
                <View style={styles.statBox}>
                  <Text style={[styles.statLabel, { color: colors.textTertiary }]}>EST. BUDGET</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {project.estimated_budget === 0 ? 'Free (Software)' : formatCurrency(project.estimated_budget)}
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statBox}>
                  <Text style={[styles.statLabel, { color: colors.textTertiary }]}>TIME TO COMPLETE</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>~{project.estimated_days} days</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statBox}>
                  <Text style={[styles.statLabel, { color: colors.textTertiary }]}>TRACK</Text>
                  <Text style={[styles.statValue, { color: project.is_premium ? '#8B5CF6' : colors.success }]}>
                    {project.is_premium ? 'Advanced' : 'Free Starter'}
                  </Text>
                </View>
              </View>

              {/* Remove Blueprint Button (Creator or Admin) */}
              {isCreator && (
                <TouchableOpacity
                  style={[styles.removeBlueprintBtn, { borderColor: colors.expense + '40', backgroundColor: colors.expense + '0A' }]}
                  onPress={handleDeleteProject}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.expense} />
                  <Text style={[styles.removeBlueprintText, { color: colors.expense }]}>
                    Remove Project Blueprint
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 1. Introduction & Objective */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.stepNumber, { color: colors.primary }]}>01</Text>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Introduction & Objective</Text>
              </View>
              <Text style={[styles.bodyText, { color: colors.text }]}>{project.description}</Text>
            </View>

            {/* 2. Required Materials & Component Sources */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.stepNumber, { color: colors.primary }]}>02</Text>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Required Materials</Text>
              </View>

              <View style={styles.materialsList}>
                {project.materials.map((mat, i) => (
                  <View
                    key={i}
                    style={[styles.matRow, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}
                  >
                    <Ionicons name="hardware-chip-outline" size={18} color={colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.matName, { color: colors.text }]}>{mat.name}</Text>
                      {mat.source ? (
                        <Text style={[styles.matSource, { color: colors.textTertiary }]}>Source: {mat.source}</Text>
                      ) : null}
                    </View>
                    <Text style={[styles.matCost, { color: colors.text }]}>
                      {mat.estCost === 0 ? 'Free' : formatCurrency(mat.estCost)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Premium Lock Wall if applicable */}
            {isLocked ? (
              <View style={[styles.premiumWall, { backgroundColor: colors.surface, borderColor: '#8B5CF6' }]}>
                <Ionicons name="lock-closed" size={36} color="#8B5CF6" />
                <Text style={[styles.lockedTitle, { color: colors.text }]}>Advanced Project Blueprint</Text>
                <Text style={[styles.lockedSub, { color: colors.textSecondary }]}>
                  The step-by-step schematics and full source guides are part of the Advanced Track.
                  Activate your complimentary Student Pilot Pass to unlock instantly.
                </Text>
                <TouchableOpacity
                  style={[styles.unlockBtn, { backgroundColor: '#8B5CF6' }]}
                  onPress={handleActivatePilot}
                  disabled={activatingPass}
                >
                  {activatingPass ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.unlockBtnText}>Activate Student Pilot Pass</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* 3. Step-by-Step Development Guide */}
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.stepNumber, { color: colors.primary }]}>03</Text>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Step-by-Step Implementation</Text>
                  </View>

                  <View style={styles.stepsList}>
                    {project.steps.map((st, i) => (
                      <View key={i} style={styles.stepItem}>
                        <View style={styles.stepMarkerCol}>
                          <View style={[styles.stepDot, { backgroundColor: colors.primary }]}>
                            <Text style={styles.stepDotText}>{i + 1}</Text>
                          </View>
                          {i < project.steps.length - 1 && (
                            <View style={[styles.stepLine, { backgroundColor: colors.border }]} />
                          )}
                        </View>
                        <View style={styles.stepContentCol}>
                          <Text style={[styles.stepTitle, { color: colors.text }]}>{st.title}</Text>
                          <Text style={[styles.stepDetail, { color: colors.textSecondary }]}>{st.detail}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>

                {/* 4. Expected Outcome */}
                {project.expected_outcome ? (
                  <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.sectionHeader}>
                      <Text style={[styles.stepNumber, { color: colors.success }]}>04</Text>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>Expected Outcome & Verification</Text>
                    </View>
                    <Text style={[styles.bodyText, { color: colors.text }]}>{project.expected_outcome}</Text>
                  </View>
                ) : null}

                {/* 5. Additional Resources */}
                {project.resources && project.resources.length > 0 ? (
                  <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.sectionHeader}>
                      <Text style={[styles.stepNumber, { color: colors.accent }]}>05</Text>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>Additional Resources & Docs</Text>
                    </View>
                    {project.resources.map((res, i) => (
                      <View key={i} style={styles.resRow}>
                        <Ionicons name="link-outline" size={16} color={colors.primary} />
                        <Text style={[styles.resText, { color: colors.primary }]}>{res}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </>
            )}
          </View>
        </ScrollView>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 2. Integrated AI Project Mentor Drawer / Sidebar              */}
        {/* ───────────────────────────────────────────────────────────── */}
        {showAiDrawer && (
          <View
            style={[
              styles.aiDrawer,
              { backgroundColor: colors.surface, borderLeftColor: colors.border },
              isDesktop && styles.desktopAiDrawer,
            ]}
          >
            {/* Drawer Header */}
            <View style={[styles.aiHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.aiPiggyEmblem, { borderColor: colors.primary + '40' }]}>
                  <Image source={PIGGY_LOGO} style={styles.aiPiggyImg} resizeMode="cover" />
                </View>
                <View>
                  <Text style={[styles.aiTitle, { color: colors.text }]}>AI Project Mentor</Text>
                  <Text style={[styles.aiSub, { color: colors.textTertiary }]}>Contextual Project Guidance</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowAiDrawer(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Conversation Stream */}
            <ScrollView
              ref={aiScrollRef}
              style={styles.aiStream}
              contentContainerStyle={{ padding: 12, gap: 10 }}
            >
              {aiMessages.length === 0 ? (
                <View style={styles.aiFreshIntro}>
                  <Text style={[styles.freshTitle, { color: colors.text }]}>
                    Ask anything about {project.title}
                  </Text>
                  <Text style={[styles.freshSub, { color: colors.textSecondary }]}>
                    I have full access to this project's parts list, code steps, and student budget.
                  </Text>

                  <View style={styles.quickPromptsList}>
                    {quickPrompts.map((q, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[styles.quickPromptBtn, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}
                        onPress={() => handleSendAiQuestion(q)}
                      >
                        <Text style={[styles.quickPromptText, { color: colors.text }]}>{q}</Text>
                        <Ionicons name="arrow-forward" size={13} color={colors.primary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : (
                aiMessages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <View
                      key={msg.id}
                      style={[
                        styles.aiMsgBubble,
                        isUser
                          ? [styles.aiUserBubble, { backgroundColor: colors.primary }]
                          : [styles.aiAssistantBubble, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }],
                      ]}
                    >
                      <Text style={[styles.aiMsgText, { color: isUser ? '#FFF' : colors.text }]}>
                        {msg.content}
                      </Text>
                    </View>
                  );
                })
              )}

              {aiLoading && (
                <View style={[styles.aiAssistantBubble, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}
            </ScrollView>

            {/* AI Bottom Input */}
            <View style={[styles.aiInputBar, { borderTopColor: colors.border }]}>
              <TextInput
                style={[styles.aiTextInput, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border, color: colors.text }]}
                placeholder="Ask about cheaper parts or steps..."
                placeholderTextColor={colors.textTertiary}
                value={aiInput}
                onChangeText={setAiInput}
                onSubmitEditing={() => handleSendAiQuestion()}
              />
              <TouchableOpacity
                style={[styles.aiSendBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleSendAiQuestion()}
                disabled={!aiInput.trim() || aiLoading}
              >
                <Ionicons name="arrow-up" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  aiToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  aiToggleText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl + 40,
  },
  mainWrapper: {
    width: '100%',
    alignSelf: 'center',
    gap: 14,
  },
  desktopWrapper: {
    maxWidth: 780,
  },
  coverWrap: {
    width: '100%',
    height: 220,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  coverImg: {
    width: '100%',
    height: '100%',
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryBadge: {
    fontSize: 9,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  diffBadge: {
    fontSize: FontSize.xs,
  },
  projTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    lineHeight: 26,
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  stepNumber: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  bodyText: {
    fontSize: FontSize.sm,
    lineHeight: 22,
  },
  materialsList: {
    gap: 8,
  },
  matRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  matName: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.semibold,
  },
  matSource: {
    fontSize: 10,
    marginTop: 2,
  },
  matCost: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
  stepsList: {
    gap: 14,
  },
  stepItem: {
    flexDirection: 'row',
    gap: 12,
  },
  stepMarkerCol: {
    alignItems: 'center',
    width: 24,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  stepLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  stepContentCol: {
    flex: 1,
    paddingBottom: 8,
  },
  stepTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    marginBottom: 4,
  },
  stepDetail: {
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
  resRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  resText: {
    fontSize: FontSize.xs,
    textDecorationLine: 'underline',
  },
  premiumWall: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    textAlign: 'center',
    gap: 10,
  },
  lockedTitle: {
    fontSize: FontSize.md + 1,
    fontWeight: FontWeight.bold,
  },
  lockedSub: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 420,
  },
  unlockBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    marginTop: 6,
  },
  unlockBtnText: {
    color: '#FFF',
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
  aiDrawer: {
    borderTopWidth: 1,
    height: 320,
  },
  desktopAiDrawer: {
    width: 360,
    height: '100%',
    borderLeftWidth: 1,
    borderTopWidth: 0,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
  },
  aiPiggyEmblem: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  aiPiggyImg: {
    width: '100%',
    height: '100%',
  },
  aiTitle: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
  aiSub: {
    fontSize: 9,
  },
  aiStream: {
    flex: 1,
  },
  aiFreshIntro: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  freshTitle: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  freshSub: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
    maxWidth: 240,
    marginBottom: 8,
  },
  quickPromptsList: {
    width: '100%',
    gap: 6,
  },
  quickPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  quickPromptText: {
    fontSize: 10,
    flex: 1,
  },
  aiMsgBubble: {
    padding: 10,
    borderRadius: BorderRadius.md,
    maxWidth: '85%',
  },
  aiUserBubble: {
    alignSelf: 'flex-end',
  },
  aiAssistantBubble: {
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  aiMsgText: {
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
  aiInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
  },
  aiTextInput: {
    flex: 1,
    height: 38,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: FontSize.xs,
  },
  aiSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: 12,
  },
  loadingText: {
    fontSize: FontSize.sm,
  },
  errorTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  backBtnAction: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    marginTop: 8,
  },
  backBtnActionText: {
    color: '#FFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  authorDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
  },
  authorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  authorPillText: {
    fontSize: 10,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.5,
  },
  authorDetailText: {
    fontSize: FontSize.xs,
  },
  removeBlueprintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  removeBlueprintText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
});

