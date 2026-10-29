import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useGoals } from '@/hooks/useGoals';
import { useAuth } from '@/context/AuthContext';
import { EmptyState } from '@/components/ui/States';
import { ChatMessage } from '@/types/ai';
import * as aiHistoryDb from '@/services/database/aiHistory';
import { askFinancialQuestion } from '@/services/ai/financeAssistant';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { PIGGY_LOGO } from '@/constants/assets';

const SUGGESTED_QUESTIONS = [
  '01 // Daily Allowance & Burn Rate Analysis',
  '02 // Milestone Timeline & Projected Completion',
  '03 // Discretionary Spend Impact Test (฿65)',
  '04 // Category Outflow Distribution Review',
  '05 // Strategic ฿500 Monthly Reserve Protocol',
];

export default function AssistantScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { transactions } = useTransactions();
  const { goals } = useGoals();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [user]);

  const loadHistory = async () => {
    if (!user) {
      setInitialLoad(false);
      return;
    }
    try {
      const history = await aiHistoryDb.getAIHistory(null, user.id);
      setMessages(history);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    } finally {
      setInitialLoad(false);
    }
  };

  const sendMessage = async (overrideText?: string) => {
    const textToSend = (overrideText || input).trim();
    if (!textToSend || loading || !user) return;

    setInput('');
    setLoading(true);

    try {
      // Save user message
      const userMsg = await aiHistoryDb.saveAIHistory(null, user.id, 'user', textToSend);
      setMessages((prev) => [...prev, userMsg]);

      // Generate response via real AI API proxy
      let responseContent = '';
      try {
        responseContent = await askFinancialQuestion(textToSend, messages, transactions, goals);
      } catch (e: any) {
        console.warn('AI API Error:', e.message);
        responseContent = `I could not connect to the AI backend. Please verify your internet connection or server status. (${e.message})`;
      }

      const assistantMsg = await aiHistoryDb.saveAIHistory(null, user.id, 'assistant', responseContent);
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Failed to send message:', err);
      const errorMsg = await aiHistoryDb.saveAIHistory(
        null,
        user.id,
        'assistant',
        'Sorry, I encountered an error. Please try again.'
      );
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  const handleSuggestion = (question: string) => {
    sendMessage(question);
  };

  const clearChat = async () => {
    if (!user) return;
    try {
      await aiHistoryDb.clearAIHistory(null, user.id);
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Studio Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.mascotBadge, { borderColor: colors.primary + '40' }]}>
            <Image
              source={PIGGY_LOGO}
              style={styles.headerMascot}
              resizeMode="cover"
            />
          </View>
          <View>
            <View style={styles.statusRow}>
              <View style={[styles.onlineDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.statusText, { color: colors.success }]}>STUDIO FIN-AI · ACTIVE</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Piggy Advisor</Text>
          </View>
        </View>

        {messages.length > 0 && (
          <TouchableOpacity
            onPress={clearChat}
            style={[styles.clearBtn, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel="Clear Chat"
          >
            <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Safety Notice Strip */}
      <View style={[styles.disclaimer, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
        <Ionicons name="pulse-outline" size={14} color={colors.primary} />
        <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
          Contextual student insights modeled from your real ledger. Educational guidance only.
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {messages.length === 0 ? (
          <ScrollView contentContainerStyle={styles.emptyContainer} showsVerticalScrollIndicator={false}>
            <View style={[styles.aiIconRing, { borderColor: colors.primary + '35' }]}>
              <Image
                source={PIGGY_LOGO}
                style={styles.emptyPiggy}
                resizeMode="cover"
              />
            </View>
            <Text style={[styles.emptyPre, { color: colors.primary }]}>SPR INTELLIGENCE</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              What can Piggy help you figure out?
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Ask about daily spending limits, upcoming target goals, or whether today's craving fits your budget.
            </Text>

            <View style={styles.suggestions}>
              <Text style={[styles.suggestionsLabel, { color: colors.textTertiary }]}>
                RECOMMENDED PROMPTS
              </Text>
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.suggestion,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  onPress={() => handleSuggestion(q)}
                >
                  <Text style={[styles.suggestionText, { color: colors.text }]}>{q}</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.chatContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageRow,
                    isUser ? styles.userRow : styles.assistantRow,
                  ]}
                >
                  {!isUser && (
                    <View style={styles.assistantAvatar}>
                      <Image
                        source={PIGGY_LOGO}
                        style={styles.assistantAvatarImg}
                        resizeMode="cover"
                      />
                    </View>
                  )}
                  <View
                    style={[
                      styles.messageBubble,
                      isUser
                        ? [styles.userBubble, { backgroundColor: colors.primary }]
                        : [
                            styles.assistantBubble,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                            },
                          ],
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        { color: isUser ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {msg.content}
                    </Text>
                  </View>
                </View>
              );
            })}

            {loading && (
              <View style={[styles.messageRow, styles.assistantRow]}>
                <View style={styles.assistantAvatar}>
                  <Image
                    source={PIGGY_LOGO}
                    style={styles.assistantAvatarImg}
                    resizeMode="cover"
                  />
                </View>
                <View
                  style={[
                    styles.messageBubble,
                    styles.assistantBubble,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    },
                  ]}
                >
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.messageText, { color: colors.textSecondary }]}>
                    Piggy is crunching numbers...
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {/* Input Bar */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: colors.tabBar,
              borderTopColor: colors.tabBarBorder,
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            placeholder="Ask Piggy about your spending..."
            placeholderTextColor={colors.textTertiary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            onSubmitEditing={() => sendMessage()}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: input.trim() ? colors.primary : colors.surfaceHighlight,
              },
            ]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || loading}
          >
            <Ionicons
              name="send"
              size={18}
              color={input.trim() ? '#FFFFFF' : colors.textTertiary}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  mascotBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  headerMascot: {
    width: '100%',
    height: '100%',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  disclaimerText: {
    fontSize: 10,
    flex: 1,
    lineHeight: 14,
  },
  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  aiIconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    padding: 3,
    marginBottom: Spacing.md,
  },
  emptyPiggy: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  emptyPre: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 2,
    marginBottom: 2,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  suggestions: {
    width: '100%',
    gap: Spacing.sm,
  },
  suggestionsLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    marginBottom: 2,
    marginLeft: 2,
  },
  suggestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    flex: 1,
    paddingRight: Spacing.sm,
  },
  chatContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  assistantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 2,
  },
  assistantAvatarImg: {
    width: '100%',
    height: '100%',
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  userBubble: {
    borderBottomRightRadius: Spacing.xs,
  },
  assistantBubble: {
    borderBottomLeftRadius: Spacing.xs,
    borderWidth: 1,
  },
  messageText: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
