import { ChatMessage, AIContext } from '@/types/ai';
import { Transaction } from '@/types/transaction';
import { Goal } from '@/types/goal';
import { askAiApi } from './client';
import { buildSystemPrompt, buildFinancialContextPrompt } from './prompts';
import { calculateFinanceSummary, analyzeSpendingHabits, calculateGoalProgress, calculateDailySpendingLimit } from '@/utils/financeEngine';
import { getCategoryById } from '@/constants/categories';

export async function askFinancialQuestion(
  userQuestion: string,
  chatHistory: ChatMessage[],
  transactions: Transaction[],
  goals: Goal[],
  activeGoal?: Goal | null,
  currencySymbol: string = '฿'
): Promise<string> {
  // 1. Build context from real user data
  const summary = calculateFinanceSummary(transactions);
  const analysis = analyzeSpendingHabits(transactions);
  const dailyLimitStatus = calculateDailySpendingLimit(transactions, goals);
  
  const aiContext: AIContext = {
    balance: summary.balance,
    totalIncome: summary.totalIncome,
    totalExpenses: summary.totalExpenses,
    monthlySpending: summary.monthlySpending,
    weeklySpending: summary.weeklySpending,
    dailyLimit: dailyLimitStatus.recommendedLimit,
    spentToday: dailyLimitStatus.spentToday,
    remainingDailyLimit: dailyLimitStatus.remaining,
    topCategories: analysis.topCategories.map(c => ({
      name: c.categoryName,
      amount: c.total,
      percentage: c.percentage,
    })),
    activeGoals: goals
      .filter(g => g.status === 'active')
      .map(g => {
        const progress = calculateGoalProgress(g);
        return {
          name: g.name,
          target: g.targetAmount,
          current: g.currentAmount,
          percentage: progress.percentage,
        };
      }),
    recentTransactions: transactions.slice(0, 5).map(t => ({
      description: t.description,
      amount: t.amount,
      category: getCategoryById(t.categoryId)?.name || 'Unknown',
      date: t.date,
      type: t.type,
    })),
    monthOverMonthChange: analysis.monthOverMonthChange,
  };

  let contextPrompt = buildFinancialContextPrompt(aiContext);

  if (activeGoal) {
    const progress = calculateGoalProgress(activeGoal);
    const sym = currencySymbol;
    contextPrompt += `\n\n🎯 CURRENT ACTIVE GOAL FOCUS:
- Goal Name: "${activeGoal.name}"
- Target Amount: ${sym}${activeGoal.targetAmount}
- Saved So Far: ${sym}${activeGoal.currentAmount} (${progress.percentage.toFixed(0)}% reached)
- Target Deadline: ${activeGoal.targetDate} (${progress.daysRemaining} days left)
- Required Daily Savings: ~${sym}${Math.round(progress.requiredMonthlySaving / 30)}/day
Please provide student-friendly financial guidance specifically focused on hitting this goal.`;
  }

  // 2. Format history for the AI provider
  const formattedMessages = chatHistory.map(msg => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user', // System handled separately
    content: msg.content,
  }));

  // Append current question with context injected silently
  // We attach the context to the latest message so the AI has fresh data
  formattedMessages.push({
    role: 'user',
    content: `${contextPrompt}\n\nUser Question: ${userQuestion}`,
  });

  // 3. Make API call
  try {
    const systemInstruction = buildSystemPrompt();
    const reply = await askAiApi(formattedMessages, systemInstruction);
    return reply;
  } catch (error: any) {
    console.warn('Failed to ask AI API:', error);
    throw error;
  }
}
