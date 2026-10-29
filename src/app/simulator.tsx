import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useGoals } from '@/hooks/useGoals';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/States';
import { simulatePurchase } from '@/utils/financeEngine';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { SimulationResult } from '@/types/finance';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

const STUDENT_PRESETS = [
  { label: '01 · Cafe Drink', amount: '65' },
  { label: '02 · Campus Meal', amount: '50' },
  { label: '03 · Study Supplies', amount: '120' },
  { label: '04 · Cinema Pass', amount: '250' },
  { label: '05 · Tech Hardware', amount: '1200' },
];

export default function SimulatorScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { transactions } = useTransactions();
  const { goals } = useGoals();

  const [amount, setAmount] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<'weekly' | 'monthly'>('monthly');
  const [result, setResult] = useState<SimulationResult | null>(null);

  const runSimulation = (val: string, recurring = isRecurring, freq = recurringFrequency) => {
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
      setResult(null);
      return;
    }
    const sim = simulatePurchase(transactions, goals, {
      purchaseAmount: num,
      isRecurring: recurring,
      recurringFrequency: freq,
    });
    setResult(sim);
  };

  const handleSimulate = () => {
    runSimulation(amount);
  };

  const handleSelectPreset = (presetAmount: string) => {
    setAmount(presetAmount);
    runSimulation(presetAmount);
  };

  const getBadgeMeta = (level: string) => {
    switch (level) {
      case 'safe':
        return {
          title: 'SAFE ZONE',
          desc: 'Fits comfortably within your student budget and daily cushion.',
          color: colors.success,
          bg: colors.success + '15',
          border: colors.success + '40',
          icon: 'checkmark-circle' as const,
        };
      case 'caution':
        return {
          title: 'CAUTION ZONE',
          desc: 'Will tighten remaining daily spending. Keep non-essentials minimal.',
          color: colors.warning,
          bg: colors.warning + '15',
          border: colors.warning + '40',
          icon: 'alert-circle' as const,
        };
      case 'danger':
      default:
        return {
          title: 'BUDGET BREAKER',
          desc: 'Exceeds daily limits or compromises your target savings timeline.',
          color: colors.danger,
          bg: colors.danger + '15',
          border: colors.danger + '40',
          icon: 'warning' as const,
        };
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={[styles.header, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerPre, { color: colors.primary }]}>STUDIO SANDBOX</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Spending Simulator</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {transactions.length === 0 ? (
            <EmptyState
              icon="calculator-outline"
              title="No transactions yet"
              message="Add at least one transaction first so the simulator can model against your real balance."
            />
          ) : (
            <>
              {/* Simulator Card */}
              <Card style={{ marginBottom: Spacing.lg, padding: Spacing.xl }}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>What do you plan to buy?</Text>
                <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                  Test-drive a purchase before parting with your money.
                </Text>

                {/* Amount Input */}
                <View style={[styles.amountContainer, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
                  <Text style={[styles.currencySymbol, { color: colors.primary }]}>฿</Text>
                  <TextInput
                    style={[styles.amountInput, { color: colors.text }]}
                    placeholder="0.00"
                    placeholderTextColor={colors.textTertiary}
                    value={amount}
                    onChangeText={(val) => {
                      setAmount(val);
                      if (val) runSimulation(val);
                      else setResult(null);
                    }}
                    keyboardType="numeric"
                    autoFocus={false}
                  />
                </View>

                {/* Student Quick Presets */}
                <Text style={[styles.presetLabel, { color: colors.textTertiary }]}>QUICK STUDENT PRESETS</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetScroll}>
                  {STUDENT_PRESETS.map((p) => {
                    const isSelected = amount === p.amount;
                    return (
                      <TouchableOpacity
                        key={p.label}
                        onPress={() => handleSelectPreset(p.amount)}
                        style={[
                          styles.presetChip,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.surfaceHighlight,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.presetChipText,
                            { color: isSelected ? '#FFFFFF' : colors.text },
                          ]}
                        >
                          {p.label} · ฿{p.amount}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Recurring Switch */}
                <View style={[styles.recurringRow, { borderTopColor: colors.border, borderTopWidth: 1 }]}>
                  <View style={{ flex: 1, paddingRight: Spacing.md }}>
                    <Text style={[styles.recurringLabel, { color: colors.text }]}>Recurring Subscription?</Text>
                    <Text style={[styles.recurringHint, { color: colors.textSecondary }]}>
                      Models repeating weekly or monthly drain on future savings.
                    </Text>
                  </View>
                  <Switch
                    value={isRecurring}
                    onValueChange={(val) => {
                      setIsRecurring(val);
                      if (amount) runSimulation(amount, val, recurringFrequency);
                    }}
                    trackColor={{ true: colors.primary, false: colors.border }}
                  />
                </View>

                {isRecurring && (
                  <View style={styles.frequencyRow}>
                    {(['weekly', 'monthly'] as const).map((freq) => (
                      <TouchableOpacity
                        key={freq}
                        style={[
                          styles.frequencyButton,
                          {
                            backgroundColor: recurringFrequency === freq ? colors.primary : colors.surfaceHighlight,
                            borderColor: recurringFrequency === freq ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => {
                          setRecurringFrequency(freq);
                          if (amount) runSimulation(amount, isRecurring, freq);
                        }}
                      >
                        <Text
                          style={{
                            color: recurringFrequency === freq ? '#FFFFFF' : colors.textSecondary,
                            fontSize: FontSize.sm,
                            fontWeight: FontWeight.semibold,
                          }}
                        >
                          {freq === 'weekly' ? 'Every Week' : 'Every Month'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Button
                  title="Simulate Impact"
                  onPress={handleSimulate}
                  size="lg"
                  style={{ marginTop: Spacing.lg }}
                  disabled={!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0}
                />
              </Card>

              {/* Results Showcase */}
              {result && (
                <>
                  {/* Warning Verdict Banner */}
                  {(() => {
                    const meta = getBadgeMeta(result.warningLevel);
                    return (
                      <View
                        style={[
                          styles.verdictBanner,
                          {
                            backgroundColor: meta.bg,
                            borderColor: meta.border,
                          },
                        ]}
                      >
                        <View style={styles.verdictHeader}>
                          <Ionicons name={meta.icon} size={22} color={meta.color} />
                          <View style={[styles.verdictBadge, { backgroundColor: meta.color }]}>
                            <Text style={styles.verdictBadgeText}>{meta.title}</Text>
                          </View>
                        </View>
                        <Text style={[styles.verdictMessage, { color: colors.text }]}>
                          {result.warningMessage}
                        </Text>
                        <Text style={[styles.verdictDesc, { color: colors.textSecondary }]}>
                          {meta.desc}
                        </Text>
                      </View>
                    );
                  })()}

                  {/* Balance Impact Card */}
                  <Card style={{ marginBottom: Spacing.lg, padding: Spacing.xl }}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Net Balance Impact</Text>
                    <View style={styles.impactRow}>
                      <Text style={[styles.impactLabel, { color: colors.textSecondary }]}>Current Net Balance</Text>
                      <Text style={[styles.impactValue, { color: colors.text }]}>
                        {formatCurrency(result.balanceBefore)}
                      </Text>
                    </View>
                    <View style={styles.impactRow}>
                      <Text style={[styles.impactLabel, { color: colors.textSecondary }]}>Simulated Spend</Text>
                      <Text style={[styles.impactValue, { color: colors.expense }]}>
                        -{formatCurrency(parseFloat(amount) || 0)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.impactRow,
                        { borderTopColor: colors.border, borderTopWidth: 1, paddingTop: Spacing.md, marginTop: Spacing.xs },
                      ]}
                    >
                      <Text style={[styles.impactLabel, { color: colors.text, fontWeight: FontWeight.bold }]}>
                        Post-Purchase Balance
                      </Text>
                      <Text
                        style={[
                          styles.impactValue,
                          {
                            color: result.canAfford ? colors.income : colors.danger,
                            fontWeight: FontWeight.bold,
                            fontSize: FontSize.lg,
                          },
                        ]}
                      >
                        {formatCurrency(result.balanceAfter)}
                      </Text>
                    </View>
                    {isRecurring && (
                      <View style={[styles.impactRow, { borderTopColor: colors.border, borderTopWidth: 1, paddingTop: Spacing.sm }]}>
                        <Text style={[styles.impactLabel, { color: colors.textSecondary }]}>Projected Monthly Drain</Text>
                        <Text style={[styles.impactValue, { color: colors.expense }]}>
                          -{formatCurrency(result.monthlyImpact)}/mo
                        </Text>
                      </View>
                    )}
                  </Card>

                  {/* Daily Limit Impact */}
                  {result.dailyLimitBefore && result.dailyLimitAfter && (
                    <Card style={{ marginBottom: Spacing.lg, padding: Spacing.xl }}>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Guardrail Impact</Text>
                      <View style={styles.impactRow}>
                        <Text style={[styles.impactLabel, { color: colors.textSecondary }]}>Today's Limit</Text>
                        <Text style={[styles.impactValue, { color: colors.text }]}>
                          {formatCurrency(result.dailyLimitBefore.recommendedLimit)}
                        </Text>
                      </View>
                      <View style={styles.impactRow}>
                        <Text style={[styles.impactLabel, { color: colors.textSecondary }]}>Remaining Today</Text>
                        <Text
                          style={[
                            styles.impactValue,
                            {
                              color: result.dailyLimitAfter.remaining > 0 ? colors.income : colors.danger,
                              fontWeight: FontWeight.bold,
                            },
                          ]}
                        >
                          {formatCurrency(result.dailyLimitAfter.remaining)}
                        </Text>
                      </View>
                      {result.dailyLimitAfter.remaining <= 0 && (
                        <View style={[styles.dangerNotice, { backgroundColor: colors.danger + '15', borderColor: colors.danger + '40' }]}>
                          <Ionicons name="warning-outline" size={16} color={colors.danger} />
                          <Text style={[styles.dangerNoticeText, { color: colors.danger }]}>
                            This single purchase exceeds today's daily limit by {formatCurrency(Math.abs(result.dailyLimitAfter.remaining))}.
                          </Text>
                        </View>
                      )}
                    </Card>
                  )}

                  {/* Goal Impact */}
                  {result.goalImpacts.length > 0 && (
                    <Card style={{ marginBottom: Spacing.lg, padding: Spacing.xl }}>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>Savings Goals Timeline</Text>
                      {result.goalImpacts.map((impact, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.goalImpact,
                            idx < result.goalImpacts.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
                          ]}
                        >
                          <Text style={[styles.goalName, { color: colors.text }]}>{impact.goalName}</Text>
                          {impact.delayDays > 0 ? (
                            <View style={styles.delayInfo}>
                              <Ionicons name="time" size={16} color={colors.warning} />
                              <Text style={[styles.delayText, { color: colors.warning }]}>
                                Delays target date by ~{impact.delayDays} days
                              </Text>
                            </View>
                          ) : (
                            <View style={styles.delayInfo}>
                              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                              <Text style={[styles.noImpactText, { color: colors.success }]}>
                                On track · No timeline delay
                              </Text>
                            </View>
                          )}
                          {impact.completionDateAfter && (
                            <Text style={[styles.completionDate, { color: colors.textTertiary }]}>
                              Est. completion: {formatDate(impact.completionDateAfter.toISOString(), 'medium')}
                            </Text>
                          )}
                        </View>
                      ))}
                    </Card>
                  )}
                </>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.lg,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  currencySymbol: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    marginRight: Spacing.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    paddingVertical: Spacing.md,
  },
  presetLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  presetScroll: {
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  presetChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  recurringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
  },
  recurringLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  recurringHint: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  frequencyButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  verdictBanner: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    marginBottom: Spacing.lg,
  },
  verdictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  verdictBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  verdictBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
  },
  verdictMessage: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    marginTop: Spacing.xs,
  },
  verdictDesc: {
    fontSize: FontSize.xs,
    marginTop: 4,
    lineHeight: 16,
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  impactLabel: {
    fontSize: FontSize.sm,
  },
  impactValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  dangerNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  dangerNoticeText: {
    flex: 1,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  goalImpact: {
    paddingVertical: Spacing.md,
  },
  goalName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  delayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  delayText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  noImpactText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  completionDate: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
});
