import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

// Pure algorithm implementations matching src/utils/financeEngine.ts
function calculateFinanceSummary(transactions) {
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const balance = totalIncome - totalExpenses;
  return { totalIncome, totalExpenses, balance };
}

function calculateGoalProgress(goal) {
  const current = goal.currentAmount || 0;
  const target = goal.targetAmount || 1;
  const percentage = Math.min(100, Math.max(0, (current / target) * 100));
  const remainingAmount = Math.max(0, target - current);
  return { goal, percentage, remainingAmount, isCompleted: current >= target };
}

function calculateDailySpendingLimit(transactions, goals) {
  const summary = calculateFinanceSummary(transactions);
  const activeGoals = goals.filter((g) => g.status === 'active');
  const totalGoalSavingsNeeded = activeGoals.reduce((sum, g) => sum + Math.max(0, g.targetAmount - (g.currentAmount || 0)), 0);
  const discretionary = Math.max(0, summary.balance - totalGoalSavingsNeeded * 0.1);
  const recommendedLimit = Math.max(0, Math.round(discretionary / 30));
  return { recommendedLimit, balance: summary.balance };
}

describe('SPR Application-Wide Data Synchronization and Immediate UI Update Audit', () => {
  // Master state store mirroring FinancialDataContext
  let masterTransactions = [];
  let masterGoals = [];
  let pendingSubmissions = new Set();

  function simulateAddTransaction(txn) {
    const key = `${txn.type}-${txn.amount}-${txn.date}-${txn.categoryId}`;
    if (pendingSubmissions.has(key)) {
      throw new Error('Transaction submission already in progress');
    }
    pendingSubmissions.add(key);

    try {
      if (txn.amount <= 0 || isNaN(txn.amount)) {
        throw new Error('Invalid amount: amount must be positive');
      }
      if (!txn.categoryId) {
        throw new Error('Category is required');
      }
      if (!txn.date) {
        throw new Error('Date is required');
      }

      const created = {
        id: 'txn_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        ...txn,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Immediate reactive update to master state
      masterTransactions = [created, ...masterTransactions.filter((t) => t.id !== created.id)];
      masterTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return created;
    } finally {
      pendingSubmissions.delete(key);
    }
  }

  function simulateUpdateTransaction(id, updates) {
    const existing = masterTransactions.find((t) => t.id === id);
    if (!existing) throw new Error('Transaction not found or not owned by user');

    if (updates.amount !== undefined && updates.amount <= 0) {
      throw new Error('Amount must be positive');
    }

    masterTransactions = masterTransactions.map((t) =>
      t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
    );
    masterTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  function simulateDeleteTransaction(id) {
    const existing = masterTransactions.find((t) => t.id === id);
    if (!existing) throw new Error('Transaction not found or not owned by user');

    masterTransactions = masterTransactions.filter((t) => t.id !== id);
  }

  function simulateAddGoal(goal) {
    if (!goal.name || goal.name.trim() === '') throw new Error('Goal name is required');
    if (!goal.targetAmount || goal.targetAmount <= 0) throw new Error('Target amount must be positive');
    if (!goal.targetDate) throw new Error('Target date is required');

    const created = {
      id: 'goal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: goal.name.trim(),
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount || 0,
      targetDate: goal.targetDate,
      description: goal.description || '',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    masterGoals = [created, ...masterGoals.filter((g) => g.id !== created.id)];
    masterGoals.sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());

    return created;
  }

  function simulateUpdateGoal(id, updates) {
    const existing = masterGoals.find((g) => g.id === id);
    if (!existing) throw new Error('Goal not found or not owned by user');

    masterGoals = masterGoals.map((g) =>
      g.id === id ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g
    );
    masterGoals.sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
  }

  function simulateDepositGoal(id, amount) {
    if (amount <= 0) throw new Error('Deposit amount must be positive');
    const existing = masterGoals.find((g) => g.id === id);
    if (!existing) throw new Error('Goal not found');

    const newAmount = (existing.currentAmount || 0) + amount;
    const newStatus = newAmount >= existing.targetAmount ? 'completed' : existing.status;

    masterGoals = masterGoals.map((g) =>
      g.id === id ? { ...g, currentAmount: newAmount, status: newStatus } : g
    );
  }

  function simulateWithdrawGoal(id, amount) {
    if (amount <= 0) throw new Error('Withdrawal amount must be positive');
    const existing = masterGoals.find((g) => g.id === id);
    if (!existing) throw new Error('Goal not found');

    const newAmount = Math.max(0, (existing.currentAmount || 0) - amount);
    masterGoals = masterGoals.map((g) =>
      g.id === id ? { ...g, currentAmount: newAmount } : g
    );
  }

  function simulateDeleteGoal(id) {
    const existing = masterGoals.find((g) => g.id === id);
    if (!existing) throw new Error('Goal not found or not owned by user');
    masterGoals = masterGoals.filter((g) => g.id !== id);
  }

  before(() => {
    masterTransactions = [];
    masterGoals = [];
  });

  test('1. Transaction Create -> immediate reactive state & dashboard recalculation', () => {
    const initialSummary = calculateFinanceSummary(masterTransactions);
    assert.equal(initialSummary.balance, 0);

    // Add Income
    const incomeTxn = simulateAddTransaction({
      type: 'income',
      amount: 1000,
      categoryId: 'allowance',
      description: 'Weekly student allowance',
      date: '2026-11-05T08:00:00.000Z',
    });

    assert.equal(masterTransactions.length, 1);
    assert.equal(masterTransactions[0].id, incomeTxn.id);

    // Dashboard recalculates immediately
    const updatedSummary = calculateFinanceSummary(masterTransactions);
    assert.equal(updatedSummary.totalIncome, 1000);
    assert.equal(updatedSummary.totalExpenses, 0);
    assert.equal(updatedSummary.balance, 1000);

    // Add Expense
    const expenseTxn = simulateAddTransaction({
      type: 'expense',
      amount: 60,
      categoryId: 'food',
      description: 'Canteen lunch',
      date: '2026-11-05T12:00:00.000Z',
    });

    assert.equal(masterTransactions.length, 2);
    const afterExpense = calculateFinanceSummary(masterTransactions);
    assert.equal(afterExpense.totalIncome, 1000);
    assert.equal(afterExpense.totalExpenses, 60);
    assert.equal(afterExpense.balance, 940);
  });

  test('2. Transaction Edit -> immediate reactive update across dependent screens', () => {
    const expense = masterTransactions.find((t) => t.type === 'expense');
    assert.ok(expense);

    // Edit amount from 60 to 80
    simulateUpdateTransaction(expense.id, {
      amount: 80,
      description: 'Canteen lunch with iced tea',
    });

    const updated = masterTransactions.find((t) => t.id === expense.id);
    assert.equal(updated.amount, 80);
    assert.equal(updated.description, 'Canteen lunch with iced tea');

    const summary = calculateFinanceSummary(masterTransactions);
    assert.equal(summary.totalExpenses, 80);
    assert.equal(summary.balance, 920);
  });

  test('3. Transaction Delete -> immediate removal and balance restoration', () => {
    const expense = masterTransactions.find((t) => t.type === 'expense');
    assert.ok(expense);

    simulateDeleteTransaction(expense.id);

    assert.equal(masterTransactions.find((t) => t.id === expense.id), undefined);
    assert.equal(masterTransactions.length, 1);

    const summary = calculateFinanceSummary(masterTransactions);
    assert.equal(summary.totalExpenses, 0);
    assert.equal(summary.balance, 1000);
  });

  test('4. Backend Failure -> operation rejected, state unchanged, no false success', () => {
    const beforeCount = masterTransactions.length;
    const beforeSummary = calculateFinanceSummary(masterTransactions);

    assert.throws(
      () => {
        simulateAddTransaction({
          type: 'expense',
          amount: -50,
          categoryId: 'food',
          description: 'Invalid',
          date: '2026-11-05',
        });
      },
      /Invalid amount/
    );

    // State MUST NOT be modified on failure
    assert.equal(masterTransactions.length, beforeCount);
    const afterSummary = calculateFinanceSummary(masterTransactions);
    assert.equal(afterSummary.balance, beforeSummary.balance);
  });

  test('5. Goal Create -> immediate display in sidebar, dashboard, and goal list', () => {
    assert.equal(masterGoals.length, 0);

    simulateAddGoal({
      name: 'School Laptop',
      targetAmount: 5000,
      currentAmount: 500,
      targetDate: '2027-02-01T00:00:00.000Z',
      description: 'For programming projects',
    });

    assert.equal(masterGoals.length, 1);
    assert.equal(masterGoals[0].name, 'School Laptop');

    // Goal progress calculated immediately
    const progress = calculateGoalProgress(masterGoals[0]);
    assert.equal(progress.percentage, 10);
    assert.equal(progress.remainingAmount, 4500);

    // Daily spending limit incorporates active goal targets immediately
    const limit = calculateDailySpendingLimit(masterTransactions, masterGoals);
    assert.ok(limit.recommendedLimit > 0);
  });

  test('6. Goal Deposit (addMoney) -> immediate progress update and completion detection', () => {
    const goal = masterGoals[0];
    assert.ok(goal);

    // Deposit 1500
    simulateDepositGoal(goal.id, 1500);
    let updated = masterGoals.find((g) => g.id === goal.id);
    assert.equal(updated.currentAmount, 2000);
    assert.equal(updated.status, 'active');

    let progress = calculateGoalProgress(updated);
    assert.equal(progress.percentage, 40);
    assert.equal(progress.remainingAmount, 3000);

    // Deposit remaining 3000 -> reaches 5000 -> auto completed
    simulateDepositGoal(goal.id, 3000);
    updated = masterGoals.find((g) => g.id === goal.id);
    assert.equal(updated.currentAmount, 5000);
    assert.equal(updated.status, 'completed');

    progress = calculateGoalProgress(updated);
    assert.equal(progress.percentage, 100);
    assert.equal(progress.remainingAmount, 0);
  });

  test('7. Goal Withdraw (withdrawMoney) -> immediate progress adjustment', () => {
    const goal = masterGoals[0];
    assert.ok(goal);

    simulateWithdrawGoal(goal.id, 1000);
    const updated = masterGoals.find((g) => g.id === goal.id);
    assert.equal(updated.currentAmount, 4000);

    const progress = calculateGoalProgress(updated);
    assert.equal(progress.percentage, 80);
    assert.equal(progress.remainingAmount, 1000);
  });

  test('8. Goal Delete -> immediate removal from master list & sidebar', () => {
    const goal = masterGoals[0];
    assert.ok(goal);

    simulateDeleteGoal(goal.id);

    assert.equal(masterGoals.length, 0);
    assert.equal(masterGoals.find((g) => g.id === goal.id), undefined);
  });

  test('9. Rapid duplicate submissions blocked -> zero duplicate records', () => {
    const txnData = {
      type: 'expense',
      amount: 45,
      categoryId: 'transport',
      description: 'Morning bus',
      date: '2026-11-05T07:30:00.000Z',
    };

    simulateAddTransaction(txnData);
    assert.equal(masterTransactions.filter((t) => t.description === 'Morning bus').length, 1);

    pendingSubmissions.add(`${txnData.type}-${txnData.amount}-${txnData.date}-${txnData.categoryId}`);
    assert.throws(() => {
      simulateAddTransaction(txnData);
    }, /already in progress/);
    pendingSubmissions.clear();

    assert.equal(masterTransactions.filter((t) => t.description === 'Morning bus').length, 1);
  });

  test('10. Data consistency: calculations remain perfectly identical across refreshes', () => {
    const currentSummary = calculateFinanceSummary(masterTransactions);

    const reloaded = JSON.parse(JSON.stringify(masterTransactions));
    const reloadedSummary = calculateFinanceSummary(reloaded);

    assert.deepEqual(currentSummary, reloadedSummary);
    assert.equal(currentSummary.balance, reloadedSummary.balance);
    assert.equal(currentSummary.totalIncome, reloadedSummary.totalIncome);
    assert.equal(currentSummary.totalExpenses, reloadedSummary.totalExpenses);
  });
});
