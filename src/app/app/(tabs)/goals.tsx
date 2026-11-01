import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useGoals } from '@/hooks/useGoals';
import { useTransactions } from '@/hooks/useTransactions';
import { ChatMessage } from '@/types/ai';
import { Goal, GoalProgress } from '@/types/goal';
import * as aiHistoryDb from '@/services/database/aiHistory';
import { askFinancialQuestion } from '@/services/ai/financeAssistant';
import {
  formatCurrency,
  formatPercentage,
  formatDateForInput,
  formatDate,
} from '@/utils/formatters';
import { calculateGoalProgress } from '@/utils/financeEngine';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { PIGGY_LOGO } from '@/constants/assets';
import { validateGoal } from '@/utils/validators';

export default function GoalsAndAIChatScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const { goalId, create } = useLocalSearchParams<{ goalId?: string; create?: string }>();

  const { goalsWithProgress, loading: goalsLoading, addGoal, updateGoal, refresh: refreshGoals } = useGoals();
  const { transactions } = useTransactions();
  const scrollRef = useRef<ScrollView>(null);

  // Active Goal Selection
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  // Chat State (Goal-scoped)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [cardCollapsed, setCardCollapsed] = useState(false);

  // New Goal Form State
  const defaultDate = new Date();
  defaultDate.setMonth(defaultDate.getMonth() + 3);
  const [newGoalName, setNewGoalName] = useState('');
  const [newTargetAmount, setNewTargetAmount] = useState('');
  const [newCurrentAmount, setNewCurrentAmount] = useState('');
  const [newTargetDate, setNewTargetDate] = useState(formatDateForInput(defaultDate));
  const [newGoalErrors, setNewGoalErrors] = useState<string[]>([]);
  const [creatingGoal, setCreatingGoal] = useState(false);

  // Trigger create modal from query param
  useEffect(() => {
    if (create === '1' || create === 'true') {
      setShowCreateModal(true);
    }
  }, [create]);

  // Sync selected goal with query params or first goal
  useEffect(() => {
    if (goalsWithProgress.length > 0) {
      if (goalId && goalsWithProgress.some((gp) => gp.goal.id === goalId)) {
        setSelectedGoalId(goalId);
      } else if (!selectedGoalId || !goalsWithProgress.some((gp) => gp.goal.id === selectedGoalId)) {
        setSelectedGoalId(goalsWithProgress[0].goal.id);
      }
    } else {
      setSelectedGoalId(null);
    }
  }, [goalId, goalsWithProgress]);

  // Get active selected goal progress
  const activeGoalProgress = useMemo(() => {
    if (!selectedGoalId) return null;
    return goalsWithProgress.find((gp) => gp.goal.id === selectedGoalId) || null;
  }, [selectedGoalId, goalsWithProgress]);

  // Load chat history for the active goal ("new goals = new chats")
  const loadGoalChatHistory = useCallback(async (gId: string) => {
    if (!user) return;
    try {
      setHistoryLoading(true);
      const history = await aiHistoryDb.getAIHistory(null, user.id, 50, gId);
      setMessages(history);
    } catch (err) {
      console.error('Failed to load goal chat history:', err);
      setMessages([]);
    } finally {
      setHistoryLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }, [user]);

  useEffect(() => {
    if (selectedGoalId) {
      loadGoalChatHistory(selectedGoalId);
    } else {
      setMessages([]);
    }
  }, [selectedGoalId, loadGoalChatHistory]);

  // Send message in current goal chat
  const handleSendMessage = async (textOverride?: string) => {
    const textToSend = (textOverride || input).trim();
    if (!textToSend || chatLoading || !user || !activeGoalProgress) return;

    setInput('');
    setChatLoading(true);

    const goal = activeGoalProgress.goal;

    try {
      // 1. Save user message to this goal's thread
      const userMsg = await aiHistoryDb.saveAIHistory(
        null,
        user.id,
        'user',
        textToSend,
        undefined,
        goal.id
      );
      setMessages((prev) => [...prev, userMsg]);

      // 2. Ask Gemini AI with specific goal context
      let reply = '';
      try {
        const goalsList = goalsWithProgress.map((gp) => gp.goal);
        reply = await askFinancialQuestion(textToSend, messages, transactions, goalsList, goal);
      } catch (err: any) {
        reply = `I could not connect to Piggy AI. (${err.message || 'Please check connection'}).`;
      }

      // 3. Save AI response to this goal's thread
      const assistantMsg = await aiHistoryDb.saveAIHistory(
        null,
        user.id,
        'assistant',
        reply,
        undefined,
        goal.id
      );
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Failed to send goal message:', err);
    } finally {
      setChatLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  // Create New Goal & Start New Chat Thread ("new goals = new chats")
  const handleCreateGoalSubmit = async () => {
    const validation = validateGoal({
      name: newGoalName,
      targetAmount: newTargetAmount,
      targetDate: newTargetDate,
    });
    if (!validation.isValid) {
      setNewGoalErrors(validation.errors);
      return;
    }

    try {
      setCreatingGoal(true);
      setNewGoalErrors([]);

      const createdGoal = await addGoal({
        name: newGoalName.trim(),
        targetAmount: parseFloat(newTargetAmount),
        currentAmount: newCurrentAmount ? parseFloat(newCurrentAmount) : 0,
        targetDate: new Date(newTargetDate).toISOString(),
      });

      // Reset form & close modal
      setNewGoalName('');
      setNewTargetAmount('');
      setNewCurrentAmount('');
      setShowCreateModal(false);

      // Select newly created goal immediately
      setSelectedGoalId(createdGoal.id);

      // Automatically generate a kickoff welcome strategy from Piggy AI
      if (user) {
        const kickoffText = `Welcome to your new goal chat for "${createdGoal.name}"! I've analyzed your student cash flow and milestone deadline. Ask me anything to fast-track your savings.`;
        try {
          const welcomeMsg = await aiHistoryDb.saveAIHistory(
            null,
            user.id,
            'assistant',
            kickoffText,
            undefined,
            createdGoal.id
          );
          setMessages([welcomeMsg]);
        } catch {
          // Non-blocking
        }
      }
    } catch (err: any) {
      setNewGoalErrors([err.message || 'Failed to create goal']);
    } finally {
      setCreatingGoal(false);
    }
  };

  // Deposit funds into active goal
  const handleDepositSubmit = async () => {
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0 || !activeGoalProgress) return;

    try {
      const current = activeGoalProgress.goal.currentAmount || 0;
      const newAmount = current + amt;
      await updateGoal(activeGoalProgress.goal.id, { currentAmount: newAmount });
      setShowDepositModal(false);
      setDepositAmount('');
      refreshGoals();

      // Post confirmation into chat
      if (user) {
        const depositNotice = `💰 Added ฿${amt} to "${activeGoalProgress.goal.name}". New progress: ${formatCurrency(newAmount)} / ${formatCurrency(activeGoalProgress.goal.targetAmount)}!`;
        const noticeMsg = await aiHistoryDb.saveAIHistory(
          null,
          user.id,
          'assistant',
          depositNotice,
          undefined,
          activeGoalProgress.goal.id
        );
        setMessages((prev) => [...prev, noticeMsg]);
      }
    } catch (err) {
      console.error('Failed to deposit funds:', err);
    }
  };

  const clearCurrentGoalChat = async () => {
    if (!user || !selectedGoalId) return;
    try {
      await aiHistoryDb.clearAIHistory(null, user.id, selectedGoalId);
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear chat:', err);
    }
  };

  // Suggested questions for the active goal
  const suggestedPrompts = useMemo(() => {
    if (!activeGoalProgress) return [];
    const name = activeGoalProgress.goal.name;
    return [
      `⚡ Fast-track roadmap for ${name}`,
      `☕ What small expenses can I trim for this?`,
      `📅 Weekly student savings target`,
      `🛡️ Can I afford a ฿150 weekend treat and still hit this?`,
    ];
  }, [activeGoalProgress]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 1. Header: Title, Active Goal Switcher & New Goal Button          */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <View style={[styles.topHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.topHeaderLeft}>
          <View style={[styles.mascotEmblem, { borderColor: colors.primary + '35' }]}>
            <Image source={PIGGY_LOGO} style={styles.mascotImg} resizeMode="cover" />
          </View>
          <View>
            <View style={styles.badgeRow}>
              <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.badgeText, { color: colors.success }]}>GOALS & FIN-AI</Text>
            </View>
            <Text style={[styles.screenTitle, { color: colors.text }]}>Goals & AI Advisor</Text>
          </View>
        </View>

        <View style={styles.topHeaderRight}>
          <TouchableOpacity
            style={[styles.addGoalBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.addGoalBtnText}>New Goal</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 2. Goal Selector Tabs Bar (Horizontal Carousel for Mobile & PC)    */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <View style={[styles.selectorBar, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.selectorScroll}
        >
          <TouchableOpacity
            style={[
              styles.newGoalPill,
              { borderColor: colors.primary + '50', backgroundColor: colors.primary + '10' },
            ]}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add-circle" size={15} color={colors.primary} />
            <Text style={[styles.newGoalPillText, { color: colors.primary }]}>+ New Goal</Text>
          </TouchableOpacity>

          {goalsWithProgress.map((gp) => {
            const isSelected = gp.goal.id === selectedGoalId;
            const isCompleted = gp.goal.status === 'completed';
            return (
              <TouchableOpacity
                key={gp.goal.id}
                style={[
                  styles.goalTabPill,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surfaceElevated,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedGoalId(gp.goal.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isCompleted ? 'trophy' : isSelected ? 'flag' : 'flag-outline'}
                  size={14}
                  color={isSelected ? '#FFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.goalTabPillText,
                    { color: isSelected ? '#FFF' : colors.text },
                    isSelected && { fontWeight: FontWeight.bold },
                  ]}
                  numberOfLines={1}
                >
                  {gp.goal.name}
                </Text>
                <View
                  style={[
                    styles.tabPctBadge,
                    {
                      backgroundColor: isSelected
                        ? 'rgba(255,255,255,0.25)'
                        : isCompleted
                        ? colors.success + '20'
                        : colors.primary + '18',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabPctText,
                      { color: isSelected ? '#FFF' : isCompleted ? colors.success : colors.primary },
                    ]}
                  >
                    {formatPercentage(gp.percentage, 0)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 3. Main Chat & Goal Showcase Body (ChatGPT.com layout)             */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {goalsWithProgress.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyPiggyRing, { borderColor: colors.primary + '30' }]}>
            <Image source={PIGGY_LOGO} style={styles.emptyPiggyImg} resizeMode="cover" />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Goals Yet</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Set your first savings milestone to start an AI strategy chat thread!
          </Text>

          <TouchableOpacity
            style={[styles.primaryCreateBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.primaryCreateBtnText}>Create Goal & Start Chat</Text>
          </TouchableOpacity>
        </View>
      ) : activeGoalProgress ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.chatWrapper}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
          {/* Active Goal Summary Card */}
          <View
            style={[
              styles.goalCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.goalCardHeader}>
              <View style={{ flex: 1 }}>
                <View style={styles.goalMetaRow}>
                  <Text style={[styles.goalCardTitle, { color: colors.text }]} numberOfLines={1}>
                    {activeGoalProgress.goal.name}
                  </Text>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          activeGoalProgress.goal.status === 'completed'
                            ? colors.success + '18'
                            : colors.primary + '15',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        {
                          color:
                            activeGoalProgress.goal.status === 'completed'
                              ? colors.success
                              : colors.primary,
                        },
                      ]}
                    >
                      {activeGoalProgress.goal.status === 'completed'
                        ? 'COMPLETED'
                        : `${activeGoalProgress.daysRemaining}d left`}
                    </Text>
                  </View>
                </View>

                {!cardCollapsed && (
                  <Text style={[styles.goalCardSub, { color: colors.textSecondary }]}>
                    Target: {formatCurrency(activeGoalProgress.goal.targetAmount)} · Deadline:{' '}
                    {formatDate(activeGoalProgress.goal.targetDate)}
                  </Text>
                )}
              </View>

              <View style={styles.cardHeaderActions}>
                <TouchableOpacity
                  style={[styles.depositBtn, { backgroundColor: colors.income + '18' }]}
                  onPress={() => setShowDepositModal(true)}
                >
                  <Ionicons name="add-circle" size={15} color={colors.income} />
                  <Text style={[styles.depositBtnText, { color: colors.income }]}>Deposit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setCardCollapsed(!cardCollapsed)}
                  style={styles.collapseToggle}
                >
                  <Ionicons
                    name={cardCollapsed ? 'chevron-down' : 'chevron-up'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Progress Bar & Required Savings */}
            {!cardCollapsed && (
              <View style={styles.progressSection}>
                <View style={[styles.progressTrack, { backgroundColor: colors.surfaceHighlight }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor:
                          activeGoalProgress.goal.status === 'completed'
                            ? colors.success
                            : colors.primary,
                        width: `${Math.min(100, Math.max(0, activeGoalProgress.percentage))}%`,
                      },
                    ]}
                  />
                </View>

                <View style={styles.progressNumbersRow}>
                  <Text style={[styles.savedText, { color: colors.text }]}>
                    Saved: {formatCurrency(activeGoalProgress.goal.currentAmount)}{' '}
                    <Text style={{ color: colors.primary, fontWeight: FontWeight.bold }}>
                      ({formatPercentage(activeGoalProgress.percentage, 0)})
                    </Text>
                  </Text>
                  {activeGoalProgress.requiredMonthlySaving > 0 && (
                    <Text style={[styles.paceText, { color: colors.textTertiary }]}>
                      Pace: ~{formatCurrency(Math.round(activeGoalProgress.requiredMonthlySaving / 30))}/day
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* ChatGPT-style Conversation Stream */}
          <ScrollView
            ref={scrollRef}
            style={styles.chatScroll}
            contentContainerStyle={styles.chatScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {historyLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textTertiary }]}>
                  Loading goal chat thread...
                </Text>
              </View>
            ) : messages.length === 0 ? (
              <View style={styles.freshChatIntro}>
                <View style={[styles.chatPiggyEmblem, { borderColor: colors.primary + '30' }]}>
                  <Image source={PIGGY_LOGO} style={styles.chatPiggyImg} resizeMode="cover" />
                </View>
                <Text style={[styles.freshTitle, { color: colors.text }]}>
                  Strategy Thread for {activeGoalProgress.goal.name}
                </Text>
                <Text style={[styles.freshSub, { color: colors.textSecondary }]}>
                  Target of {formatCurrency(activeGoalProgress.goal.targetAmount)} due{' '}
                  {formatDate(activeGoalProgress.goal.targetDate)}. Ask Piggy Fin-AI how to reach it!
                </Text>

                <View style={styles.promptList}>
                  {suggestedPrompts.map((prompt, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.promptCard,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                      onPress={() => handleSendMessage(prompt)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.promptCardText, { color: colors.text }]}>{prompt}</Text>
                      <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <View
                    key={msg.id}
                    style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}
                  >
                    {!isUser && (
                      <View style={[styles.avatarBubble, { borderColor: colors.primary + '40' }]}>
                        <Image source={PIGGY_LOGO} style={styles.avatarImg} resizeMode="cover" />
                      </View>
                    )}
                    <View
                      style={[
                        styles.messageBubble,
                        isUser
                          ? [styles.userBubble, { backgroundColor: colors.primary }]
                          : [
                              styles.assistantBubble,
                              { backgroundColor: colors.surface, borderColor: colors.border },
                            ],
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          { color: isUser ? '#FFF' : colors.text },
                        ]}
                      >
                        {msg.content}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}

            {chatLoading && (
              <View style={[styles.messageRow, styles.assistantRow]}>
                <View style={[styles.avatarBubble, { borderColor: colors.primary + '40' }]}>
                  <Image source={PIGGY_LOGO} style={styles.avatarImg} resizeMode="cover" />
                </View>
                <View
                  style={[
                    styles.messageBubble,
                    styles.assistantBubble,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              </View>
            )}
          </ScrollView>

          {/* ChatGPT-style Bottom Input Bar */}
          <View style={[styles.bottomInputBar, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
            <View
              style={[
                styles.inputCapsule,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}
            >
              <TextInput
                style={[styles.inputField, { color: colors.text }]}
                placeholder={`Ask Piggy about ${activeGoalProgress.goal.name}...`}
                placeholderTextColor={colors.textTertiary}
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={1000}
                onSubmitEditing={() => handleSendMessage()}
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  {
                    backgroundColor: input.trim() ? colors.primary : colors.surfaceHighlight,
                  },
                ]}
                disabled={!input.trim() || chatLoading}
                onPress={() => handleSendMessage()}
              >
                <Ionicons
                  name="arrow-up"
                  size={18}
                  color={input.trim() ? '#FFF' : colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : null}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 4. "+ New Goal" Modal (Fast Creation to Start New Chat)          */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <Modal visible={showCreateModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.modalPiggy, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="flag" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>New Goal & AI Chat</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
              Setting a new goal immediately starts a dedicated AI strategy chat for it.
            </Text>

            {newGoalErrors.length > 0 && (
              <View style={[styles.errorBox, { backgroundColor: colors.danger + '15' }]}>
                {newGoalErrors.map((err, i) => (
                  <Text key={i} style={[styles.errorText, { color: colors.danger }]}>
                    • {err}
                  </Text>
                ))}
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Goal Name</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. iPad for College, Semester Trip"
                placeholderTextColor={colors.textTertiary}
                value={newGoalName}
                onChangeText={setNewGoalName}
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Target Amount (฿)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. 5000"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                value={newTargetAmount}
                onChangeText={setNewTargetAmount}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Initial Saved (Optional ฿)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                value={newCurrentAmount}
                onChangeText={setNewCurrentAmount}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Target Deadline (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textTertiary}
                value={newTargetDate}
                onChangeText={setNewTargetDate}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]}
                onPress={handleCreateGoalSubmit}
                disabled={creatingGoal}
              >
                {creatingGoal ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Create Goal & Start Chat</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 5. Deposit Funds Modal                                            */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <Modal visible={showDepositModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border, maxWidth: 380 },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Funds to Goal</Text>
              <TouchableOpacity onPress={() => setShowDepositModal(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
              Enter amount to allocate towards "{activeGoalProgress?.goal.name}".
            </Text>

            <View style={styles.inputGroup}>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                    color: colors.text,
                    fontSize: 22,
                    fontWeight: 'bold',
                    textAlign: 'center',
                  },
                ]}
                placeholder="฿0.00"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                value={depositAmount}
                onChangeText={setDepositAmount}
                autoFocus
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {[50, 100, 200, 500].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.presetBtn, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
                  onPress={() => setDepositAmount(String(amt))}
                >
                  <Text style={[styles.presetBtnText, { color: colors.primary }]}>+฿{amt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: colors.income, width: '100%' }]}
              onPress={handleDepositSubmit}
            >
              <Text style={styles.modalSubmitText}>Confirm Deposit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 4,
    borderBottomWidth: 1,
  },
  topHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mascotEmblem: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  mascotImg: {
    width: '100%',
    height: '100%',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  screenTitle: {
    fontSize: FontSize.md + 1,
    fontWeight: FontWeight.bold,
  },
  topHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
  },
  addGoalBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#FFF',
  },
  selectorBar: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  selectorScroll: {
    paddingHorizontal: Spacing.lg,
    gap: 8,
    alignItems: 'center',
  },
  newGoalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  newGoalPillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  goalTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  goalTabPillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    maxWidth: 120,
  },
  tabPctBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tabPctText: {
    fontSize: 9,
    fontWeight: FontWeight.extrabold,
  },
  chatWrapper: {
    flex: 1,
    maxWidth: 860,
    width: '100%',
    alignSelf: 'center',
  },
  goalCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  goalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalCardTitle: {
    fontSize: FontSize.sm + 1,
    fontWeight: FontWeight.bold,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },
  goalCardSub: {
    fontSize: 11,
    marginTop: 2,
  },
  cardHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  depositBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
  },
  depositBtnText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  collapseToggle: {
    padding: 4,
  },
  progressSection: {
    marginTop: 10,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressNumbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  savedText: {
    fontSize: 11,
  },
  paceText: {
    fontSize: 10,
  },
  chatScroll: {
    flex: 1,
  },
  chatScrollContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: 8,
  },
  loadingText: {
    fontSize: 11,
  },
  freshChatIntro: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  chatPiggyEmblem: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 2,
    marginBottom: Spacing.sm,
  },
  chatPiggyImg: {
    width: '100%',
    height: '100%',
  },
  freshTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    marginBottom: 4,
  },
  freshSub: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    maxWidth: 420,
    lineHeight: 18,
  },
  promptList: {
    width: '100%',
    gap: 8,
  },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  promptCardText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    flex: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    gap: 8,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  avatarBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    marginTop: 2,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  messageText: {
    fontSize: FontSize.xs + 1,
    lineHeight: 20,
  },
  bottomInputBar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  inputCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingLeft: Spacing.md,
    paddingRight: 6,
    paddingVertical: 4,
    gap: 8,
  },
  inputField: {
    flex: 1,
    fontSize: FontSize.xs + 1,
    maxHeight: 90,
    paddingVertical: 6,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyPiggyRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: 'hidden',
    borderWidth: 2,
    marginBottom: Spacing.md,
  },
  emptyPiggyImg: {
    width: '100%',
    height: '100%',
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    maxWidth: 320,
    lineHeight: 20,
  },
  primaryCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
  },
  primaryCreateBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#FFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalPiggy: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  modalDesc: {
    fontSize: FontSize.xs,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  errorBox: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontSize: FontSize.xs,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: Spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.semibold,
  },
  modalSubmitBtn: {
    flex: 1.6,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
    color: '#FFF',
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  presetBtnText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
});
