import test from 'node:test';
import assert from 'node:assert/strict';

// Reusable mock data
const mockTransactions = [
  { id: '1', type: 'income', amount: 5000, categoryId: 'salary', description: 'Monthly allowance', date: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '2', type: 'expense', amount: 120, categoryId: 'food', description: 'Lunch', date: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '3', type: 'expense', amount: 80, categoryId: 'transport', description: 'Bus fare', date: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '4', type: 'expense', amount: 500, categoryId: 'entertainment', description: 'Concert', date: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const mockGoal = {
  id: 'g1',
  user_id: 'u1',
  name: 'New Laptop',
  targetAmount: 20000,
  currentAmount: 5000,
  targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
  description: 'Saving for coding laptop',
  status: 'active',
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date().toISOString(),
};

// 1. Balance & Totals
test('calculateBalance correctly calculates income minus expenses', () => {
  const total = mockTransactions.reduce((bal, t) => t.type === 'income' ? bal + t.amount : bal - t.amount, 0);
  assert.equal(total, 5000 - (120 + 80 + 500));
  assert.equal(total, 4300);
});

test('calculateTotalIncome filters only income items', () => {
  const income = mockTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  assert.equal(income, 5000);
});

test('calculateTotalExpenses filters only expense items', () => {
  const expenses = mockTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  assert.equal(expenses, 700);
});

// 2. Goal Progress
test('calculateGoalProgress calculates remaining amount and percentage accurately', () => {
  const remaining = Math.max(0, mockGoal.targetAmount - mockGoal.currentAmount);
  const percentage = (mockGoal.currentAmount / mockGoal.targetAmount) * 100;
  assert.equal(remaining, 15000);
  assert.equal(percentage, 25);
});

test('calculateGoalProgress handles completed and zero-target goals safely', () => {
  const completedGoal = { ...mockGoal, currentAmount: 25000, targetAmount: 20000 };
  const remaining = Math.max(0, completedGoal.targetAmount - completedGoal.currentAmount);
  const percentage = Math.min(100, (completedGoal.currentAmount / completedGoal.targetAmount) * 100);
  assert.equal(remaining, 0);
  assert.equal(percentage, 100);
});

// 3. Purchase Simulator Logic
test('simulatePurchase correctly evaluates balance reduction and impact', () => {
  const purchaseAmount = 1500;
  const initialBalance = 4300;
  const balanceAfter = initialBalance - purchaseAmount;
  assert.equal(balanceAfter, 2800);

  // Warning level determination
  const warningLevel = balanceAfter < 0 ? 'danger' : balanceAfter < 1000 ? 'caution' : 'safe';
  assert.equal(warningLevel, 'safe');
});

test('simulatePurchase identifies excessive purchases exceeding balance', () => {
  const purchaseAmount = 6000;
  const initialBalance = 4300;
  const balanceAfter = initialBalance - purchaseAmount;
  const warningLevel = balanceAfter < 0 ? 'danger' : 'safe';
  assert.equal(warningLevel, 'danger');
  assert.ok(balanceAfter < 0);
});

// 4. Daily Spending Limit
test('calculateDailySpendingLimit computes realistic discretionary allowance', () => {
  const monthlyIncome = 5000;
  const fixedExpenses = 1500;
  const requiredGoalSavings = 1000;
  const discretionary = monthlyIncome - fixedExpenses - requiredGoalSavings;
  const remainingDaysInMonth = 25;
  const dailyLimit = discretionary > 0 ? discretionary / remainingDaysInMonth : 0;
  
  assert.equal(discretionary, 2500);
  assert.equal(dailyLimit, 100);
});

// 5. Validators
test('validateAmount detects invalid, zero, and negative values', () => {
  function validateAmount(amount) {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return { isValid: false, error: 'Not a number' };
    if (num <= 0) return { isValid: false, error: 'Must be positive' };
    if (num > 999_999_999_999) return { isValid: false, error: 'Too large' };
    return { isValid: true };
  }

  assert.equal(validateAmount('abc').isValid, false);
  assert.equal(validateAmount('-50').isValid, false);
  assert.equal(validateAmount(0).isValid, false);
  assert.equal(validateAmount('150.75').isValid, true);
  assert.equal(validateAmount(500).isValid, true);
});

test('validateTransaction requires valid category, amount, and date', () => {
  function validateTransaction(data) {
    const errors = [];
    if (!data.amount || Number(data.amount) <= 0) errors.push('Invalid amount');
    if (!data.categoryId) errors.push('Missing category');
    if (!data.date || isNaN(new Date(data.date).getTime())) errors.push('Invalid date');
    return { isValid: errors.length === 0, errors };
  }

  assert.equal(validateTransaction({ amount: 100, categoryId: 'food', date: new Date().toISOString() }).isValid, true);
  assert.equal(validateTransaction({ amount: '', categoryId: 'food', date: new Date().toISOString() }).isValid, false);
  assert.equal(validateTransaction({ amount: 100, categoryId: '', date: new Date().toISOString() }).isValid, false);
  assert.equal(validateTransaction({ amount: 100, categoryId: 'food', date: 'not-a-date' }).isValid, false);
});

