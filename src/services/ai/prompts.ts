import { ChatMessage, AIContext, MenuRecommendation, MenuItem } from '@/types/ai';

export function buildSystemPrompt(): string {
  return `You are Tiki AI, a friendly, smart, and concise personal finance assistant for students and young adults.
Your role is to help users manage their money, build savings habits, evaluate purchases, and reach their financial goals.

Guidelines:
1. Always base your advice on the user's REAL financial context provided below.
2. Be encouraging, concise, practical, and non-judgmental. Do not use overly formal or complex financial jargon.
3. Keep advice realistic for students (e.g., focus on small habit tweaks, 50/30/20 budget rule, saving strategies).
4. If a user asks "Can I afford this?", look at their balance and monthly spending, and mention the simulator.
5. Clearly highlight risks if the user is overspending or falling behind on goals.
6. Provide actionable recommendations.
7. Remember: You are providing educational financial guidance, not certified investment or legal advice.`;
}

export function buildFinancialContextPrompt(context: AIContext): string {
  return `=== CURRENT USER FINANCIAL CONTEXT ===
- Current Balance: ${context.balance}
- Total Income: ${context.totalIncome}
- Total Expenses: ${context.totalExpenses}
- Spending This Month: ${context.monthlySpending}
- Spending This Week: ${context.weeklySpending}
- Month-over-Month Spending Change: ${context.monthOverMonthChange > 0 ? '+' : ''}${context.monthOverMonthChange.toFixed(1)}%

Daily Spending Limit (Calculated by Finance Engine):
- Recommended Daily Limit: ${context.dailyLimit || 0}
- Spent Today: ${context.spentToday || 0}
- Remaining Today: ${context.remainingDailyLimit || 0}

Top Spending Categories (Expense):
${context.topCategories.map(c => `- ${c.name}: ${c.amount} (${c.percentage.toFixed(1)}%)`).join('\n') || '- None'}

Active Savings Goals:
${context.activeGoals.map(g => `- ${g.name}: saved ${g.current} / target ${g.target} (${g.percentage.toFixed(1)}%)`).join('\n') || '- None'}

Recent Transactions (last 5):
${context.recentTransactions.map(t => `- [${t.type}] ${t.date}: ${t.amount} for ${t.description} (Category: ${t.category})`).join('\n') || '- None'}
======================================`;
}

export function buildMenuRecommendationPrompt(
  items: MenuItem[],
  budget: number,
  mealType: string,
  dietaryPref: string,
  userBalance: number
): string {
  return `
Scanned Menu Items:
${items.map((it) => `- ${it.name}: ${it.price} (${it.description || 'No description'})`).join('\n')}

User Request & Context:
- Target Budget: ${budget}
- Current User Available Balance: ${userBalance}
- Desired Meal Type: ${mealType}
- Dietary Preference: ${dietaryPref}

Provide a structured recommendation for the user. Do not just pick the cheapest item. Consider the value for money, user preferences, and their budget.
`;
}
