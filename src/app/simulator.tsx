import React, { useState, useMemo } from 'react';
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

export default function SimulatorScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { transactions } = useTransactions();
  const { goals } = useGoals();

  const [amount, setAmount] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<'weekly' | 'monthly'>('monthly');
  const [result, setResult] = useState<SimulationResult | null>(null);

  const handleSimulate = () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) return;

    const sim = simulatePurchase(transactions, goals, {
      purchaseAmount: parseFloat(amount),
      isRecurring,
      recurringFrequency,
    });
    setResult(sim);
  };

  const getWarningColor = (level: string) => {
    switch (level) {
      case 'safe': return colors.success;
      case 'caution': return colors.warning;
      case 'danger': return colors.danger;
      default: return colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Spending Simulator</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {transactions.length === 0 ? (
            <EmptyState
              icon="calculator-outline"
              title="No data yet"
              message="Add some transactions first so the simulator can analyze your finances."
            />
          ) : (
            <>
              {/* Input Section */}
              <Card style={{ marginBottom: Spacing.lg }}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>What do you want to buy?</Text>
                <View style={[styles.amountContainer, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
                  <Text style={[styles.currencySymbol, { color: colors.textTertiary }]}>₫</Text>
                  <TextInput
                    style={[styles.amountInput, { color: colors.text }]}
                    placeholder="Enter amount"
                    placeholderTextColor={colors.textTertiary}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.recurringRow}>
                  <View>
                    <Text style={[styles.recurringLabel, { color: colors.text }]}>Recurring purchase?</Text>
                    <Text style={[styles.recurringHint, { color: colors.textTertiary }]}>e.g., subscription, weekly expense</Text>
                  </View>
                  <Switch value={isRecurring} onValueChange={setIsRecurring} trackColor={{ true: colors.primary }} />
                </View>

                {isRecurring && (
                  <View style={styles.frequencyRow}>
                    {(['weekly', 'monthly'] as const).map(freq => (
                      <TouchableOpacity
                        key={freq}
                        style={[
                          styles.frequencyButton,
                          {
                            backgroundColor: recurringFrequency === freq ? colors.primary : colors.surfaceHighlight,
                            borderColor: recurringFrequency === freq ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setRecurringFrequency(freq)}
                      >
                        <Text style={{ color: recurringFrequency === freq ? '#FFF' : colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium }}>
                          {freq === 'weekly' ? 'Weekly' : 'Monthly'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Button title="Simulate Purchase" onPress={handleSimulate} size="lg" style={{ marginTop: Spacing.lg }} disabled={!amount || isNaN(parseFloat(amount))} />
              </Card>

              {/* Results */}
              {result && (
                <>
                  {/* Warning Banner */}
                  <View style={[styles.warningBanner, { backgroundColor: getWarningColor(result.warningLevel) + '15', borderColor: getWarningColor(result.warningLevel) }]}>
                    <Ionicons
                      name={result.warningLevel === 'safe' ? 'checkmark-circle' : result.warningLevel === 'caution' ? 'warning' : 'alert-circle'}
                      size={24}
                      color={getWarningColor(result.warningLevel)}
                    />
                    <Text style={[styles.warningText, { color: getWarningColor(result.warningLevel) }]}>
                      {result.warningMessage}
                    </Text>
                  </View>

                  {/* Balance Impact */}
                  <Card style={{ marginBottom: Spacing.lg }}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Balance Impact</Text>
                    <View style={styles.impactRow}>
                      <Text style={[styles.impactLabel, { color: colors.textSecondary }]}>Before</Text>
                      <Text style={[styles.impactValue, { color: colors.text }]}>{formatCurrency(result.balanceBefore)}</Text>
                    </View>
                    <View style={styles.impactRow}>
                      <Text style={[styles.impactLabel, { color: colors.textSecondary }]}>Purchase</Text>
                      <Text style={[styles.impactValue, { color: colors.expense }]}>-{formatCurrency(parseFloat(amount))}</Text>
                    </View>
                    <View style={[styles.impactRow, { borderTopColor: colors.border, borderTopWidth: 1, paddingTop: Spacing.md }]}>
                      <Text style={[styles.impactLabel, { color: colors.text, fontWeight: FontWeight.semibold }]}>After</Text>
                      <Text style={[styles.impactValue, { color: result.canAfford ? colors.income : colors.danger, fontWeight: FontWeight.bold }]}>
                        {formatCurrency(result.balanceAfter)}
                      </Text>
                    </View>
                    {isRecurring && (
                      <View style={styles.impactRow}>
                        <Text style={[styles.impactLabel, { color: colors.textSecondary }]}>Monthly Impact</Text>
                        <Text style={[styles.impactValue, { color: colors.expense }]}>-{formatCurrency(result.monthlyImpact)}/mo</Text>
                      </View>
                    )}
                  </Card>

                  {/* Daily Limit Impact */}
                  {result.dailyLimitBefore && result.dailyLimitAfter && (
                    <Card style={{ marginBottom: Spacing.lg }}>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Limit Impact</Text>
                      <View style={styles.impactRow}>
                        <Text style={[styles.impactLabel, { color: colors.textSecondary }]}>Today's Limit</Text>
                        <Text style={[styles.impactValue, { color: colors.text }]}>{formatCurrency(result.dailyLimitBefore.recommendedLimit)}</Text>
                      </View>
                      <View style={styles.impactRow}>
                        <Text style={[styles.impactLabel, { color: colors.textSecondary }]}>Purchase</Text>
                        <Text style={[styles.impactValue, { color: colors.expense }]}>-{formatCurrency(parseFloat(amount))}</Text>
                      </View>
                      <View style={[styles.impactRow, { borderTopColor: colors.border, borderTopWidth: 1, paddingTop: Spacing.md }]}>
                        <Text style={[styles.impactLabel, { color: colors.text, fontWeight: FontWeight.semibold }]}>Remaining Today</Text>
                        <Text style={[styles.impactValue, { color: result.dailyLimitAfter.remaining > 0 ? colors.income : colors.danger, fontWeight: FontWeight.bold }]}>
                          {formatCurrency(result.dailyLimitAfter.remaining)}
                        </Text>
                      </View>
                      {result.dailyLimitAfter.remaining <= 0 && (
                        <View style={{ marginTop: Spacing.sm }}>
                          <Text style={{ color: colors.danger, fontSize: FontSize.sm }}>
                            This purchase will put you over your daily limit by {formatCurrency(Math.abs(result.dailyLimitAfter.remaining))}.
                          </Text>
                        </View>
                      )}
                    </Card>
                  )}

                  {/* Goal Impact */}
                  {result.goalImpacts.length > 0 && (
                    <Card style={{ marginBottom: Spacing.lg }}>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>Impact on Goals</Text>
                      {result.goalImpacts.map((impact, idx) => (
                        <View key={idx} style={[styles.goalImpact, idx < result.goalImpacts.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                          <Text style={[styles.goalName, { color: colors.text }]}>{impact.goalName}</Text>
                          {impact.delayDays > 0 ? (
                            <View style={styles.delayInfo}>
                              <Ionicons name="time" size={16} color={colors.warning} />
                              <Text style={[styles.delayText, { color: colors.warning }]}>
                                Delays goal by ~{impact.delayDays} days
                              </Text>
                            </View>
                          ) : (
                            <Text style={[styles.noImpactText, { color: colors.success }]}>No significant delay</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.huge },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, marginBottom: Spacing.lg },
  amountContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.md, borderWidth: 1, paddingHorizontal: Spacing.lg },
  currencySymbol: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, marginRight: Spacing.sm },
  amountInput: { flex: 1, fontSize: FontSize.xxl, fontWeight: FontWeight.bold, paddingVertical: Spacing.lg },
  recurringRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.lg },
  recurringLabel: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  recurringHint: { fontSize: FontSize.xs, marginTop: 2 },
  frequencyRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  frequencyButton: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1 },
  warningBanner: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1, marginBottom: Spacing.lg, gap: Spacing.md },
  warningText: { flex: 1, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  impactRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  impactLabel: { fontSize: FontSize.md },
  impactValue: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  goalImpact: { paddingVertical: Spacing.md },
  goalName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginBottom: Spacing.xs },
  delayInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xs },
  delayText: { fontSize: FontSize.sm },
  noImpactText: { fontSize: FontSize.sm, marginTop: Spacing.xs },
  completionDate: { fontSize: FontSize.xs, marginTop: Spacing.xs },
});
