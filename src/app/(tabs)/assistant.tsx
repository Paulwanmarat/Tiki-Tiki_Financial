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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useGoals } from '@/hooks/useGoals';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/States';
import { ChatMessage } from '@/types/ai';
import * as aiHistoryDb from '@/services/database/aiHistory';
import { calculateFinanceSummary, calculateCategorySpending, analyzeSpendingHabits } from '@/utils/financeEngine';
import { formatCurrency } from '@/utils/formatters';
import { askFinancialQuestion } from '@/services/ai/financeAssistant';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

const SUGGESTED_QUESTIONS = [
  'How am I doing financially?',
  'How much should I save each week?',
  'Where am I spending the most?',
  'Can I afford a big purchase?',
  'How can I improve my savings?',
];

export default function AssistantScreen() {
  const { colors } = useTheme();
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

  const generateLocalResponse = (question: string): string => {
    return `Fallback response because AI generation failed: I understand you're asking about your finances. Connect the backend to get a real response!`;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !user) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    try {
      // Save user message
      const userMsg = await aiHistoryDb.saveAIHistory(null, user.id, 'user', userMessage);
      setMessages(prev => [...prev, userMsg]);

      // Generate response via real AI API proxy
      let responseContent = '';
      try {
        responseContent = await askFinancialQuestion(userMessage, messages, transactions, goals);
      } catch (e: any) {
        console.warn('AI API Error:', e.message);
        responseContent = `I could not connect to the AI backend. Please make sure the server is running. (${e.message})`;
      }

      const assistantMsg = await aiHistoryDb.saveAIHistory(null, user.id, 'assistant', responseContent);
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Failed to send message:', err);
      const errorMsg = await aiHistoryDb.saveAIHistory(null, user.id, 'assistant', 'Sorry, I encountered an error. Please try again.');
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleSuggestion = (question: string) => {
    setInput(question);
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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>AI Assistant</Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>Your financial helper</Text>
        </View>
        {messages.length > 0 && (
          <TouchableOpacity onPress={clearChat}>
            <Ionicons name="trash-outline" size={22} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Disclaimer */}
      <View style={[styles.disclaimer, { backgroundColor: colors.surfaceHighlight }]}>
        <Ionicons name="information-circle" size={16} color={colors.textTertiary} />
        <Text style={[styles.disclaimerText, { color: colors.textTertiary }]}>
          Educational guidance only. Not professional financial advice.
        </Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        {messages.length === 0 ? (
          <ScrollView contentContainerStyle={styles.emptyContainer}>
            <View style={[styles.aiIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="chatbubble-ellipses" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Ask me anything about your finances</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              I analyze your real transaction data to give personalized insights.
            </Text>
            <View style={styles.suggestions}>
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.suggestion, { backgroundColor: colors.surface, borderColor: colors.border }]}
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
            {messages.map(msg => (
              <View
                key={msg.id}
                style={[
                  styles.messageBubble,
                  msg.role === 'user'
                    ? [styles.userBubble, { backgroundColor: colors.primary }]
                    : [styles.assistantBubble, { backgroundColor: colors.surface, borderColor: colors.border }],
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    { color: msg.role === 'user' ? '#FFF' : colors.text },
                  ]}
                >
                  {msg.content}
                </Text>
              </View>
            ))}
            {loading && (
              <View style={[styles.messageBubble, styles.assistantBubble, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.messageText, { color: colors.textTertiary }]}>Thinking...</Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* Input */}
        <View style={[styles.inputBar, { backgroundColor: colors.tabBar, borderTopColor: colors.tabBarBorder }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Ask about your finances..."
            placeholderTextColor={colors.textTertiary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: input.trim() ? colors.primary : colors.surfaceHighlight }]}
            onPress={sendMessage}
            disabled={!input.trim() || loading}
          >
            <Ionicons name="send" size={20} color={input.trim() ? '#FFF' : colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  subtitle: { fontSize: FontSize.sm },
  disclaimer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, gap: Spacing.sm, marginBottom: Spacing.sm },
  disclaimerText: { fontSize: FontSize.xs, flex: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxl },
  aiIcon: { width: 96, height: 96, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, textAlign: 'center', marginBottom: Spacing.sm },
  emptySubtitle: { fontSize: FontSize.md, textAlign: 'center', marginBottom: Spacing.xxl },
  suggestions: { width: '100%', gap: Spacing.sm },
  suggestion: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1 },
  suggestionText: { fontSize: FontSize.md, flex: 1 },
  chatContent: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, paddingBottom: Spacing.lg },
  messageBubble: { maxWidth: '85%', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, marginBottom: Spacing.sm },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: Spacing.xs },
  assistantBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: Spacing.xs, borderWidth: 1 },
  messageText: { fontSize: FontSize.md, lineHeight: 22 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth, gap: Spacing.sm },
  input: { flex: 1, borderRadius: BorderRadius.lg, borderWidth: 1, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: FontSize.md, maxHeight: 100 },
  sendButton: { width: 44, height: 44, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center' },
});
