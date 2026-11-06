/**
 * FinancialDataContext — Application-Wide Central Financial State Provider.
 *
 * Solves the data-synchronization problem across the entire application:
 * 1. Single Source of Truth: All screens (Dashboard, Transactions, Goals & AI,
 *    Simulator, Sidebar, Modals, Settings) subscribe to this shared reactive context.
 * 2. Instant Reactive Updates: When a transaction or goal is created, updated, or deleted,
 *    the backend is verified first, and then the master shared state updates immediately.
 * 3. Cross-Tab & Cross-Screen Consistency: Navigating between tabs or closing modals
 *    always renders the latest data without requiring a manual page refresh.
 * 4. User-Specific Isolation: State is automatically reset and re-fetched when the
 *    authenticated user changes (login, logout, switch account).
 * 5. Lifecycle Synchronization: Automatically revalidates on window focus / app resume.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { Transaction, TransactionType } from '@/types/transaction';
import { Goal, GoalProgress, GoalStatus } from '@/types/goal';
import * as transactionDb from '@/services/database/transactions';
import * as goalDb from '@/services/database/goals';
import { calculateGoalProgress } from '@/utils/financeEngine';
import { useAuth } from '@/context/AuthContext';

export interface FinancialDataContextType {
  // Data
  transactions: Transaction[];
  goals: Goal[];
  goalsWithProgress: GoalProgress[];
  loading: boolean;
  transactionsLoading: boolean;
  goalsLoading: boolean;
  error: string | null;

  // Transaction mutations
  addTransaction: (data: {
    type: TransactionType;
    amount: number;
    categoryId: string;
    description: string;
    date: string;
  }) => Promise<Transaction>;
  updateTransaction: (
    id: string,
    data: {
      type?: TransactionType;
      amount?: number;
      categoryId?: string;
      description?: string;
      date?: string;
    }
  ) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  getTransactionById: (id: string) => Promise<Transaction | null>;

  // Goal mutations
  addGoal: (data: {
    name: string;
    targetAmount: number;
    currentAmount?: number;
    targetDate: string;
    description?: string;
  }) => Promise<Goal>;
  updateGoal: (
    id: string,
    data: {
      name?: string;
      targetAmount?: number;
      currentAmount?: number;
      targetDate?: string;
      description?: string;
      status?: GoalStatus;
    }
  ) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
  addMoney: (id: string, amount: number) => Promise<void>;
  withdrawMoney: (id: string, amount: number) => Promise<void>;
  getGoalById: (id: string) => Promise<Goal | null>;

  // Synchronization triggers
  refreshTransactions: () => Promise<void>;
  refreshGoals: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const FinancialDataContext = createContext<FinancialDataContextType | null>(null);

export function FinancialDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guard against duplicate rapid submissions
  const pendingTxnSubmissions = useRef<Set<string>>(new Set());
  const pendingGoalSubmissions = useRef<Set<string>>(new Set());

  // ── 1. Fetching Logic ──────────────────────────────────────────────────────

  const loadTransactions = useCallback(async () => {
    if (!user?.id) {
      setTransactions([]);
      setTransactionsLoading(false);
      return;
    }
    try {
      setTransactionsLoading(true);
      setError(null);
      const data = await transactionDb.getTransactions(null, user.id);
      // Ensure sorted by date DESC
      const sorted = Array.isArray(data)
        ? [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        : [];
      setTransactions(sorted);
    } catch (err: any) {
      console.error('FinancialDataContext: Failed to fetch transactions:', err);
      setError(err?.message || 'Failed to load transactions');
    } finally {
      setTransactionsLoading(false);
    }
  }, [user?.id]);

  const loadGoals = useCallback(async () => {
    if (!user?.id) {
      setGoals([]);
      setGoalsLoading(false);
      return;
    }
    try {
      setGoalsLoading(true);
      setError(null);
      const data = await goalDb.getGoals(null, user.id);
      // Ensure sorted by targetDate ASC
      const sorted = Array.isArray(data)
        ? [...data].sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())
        : [];
      setGoals(sorted);
    } catch (err: any) {
      console.error('FinancialDataContext: Failed to fetch goals:', err);
      setError(err?.message || 'Failed to load goals');
    } finally {
      setGoalsLoading(false);
    }
  }, [user?.id]);

  const refreshAll = useCallback(async () => {
    if (!user?.id) return;
    await Promise.allSettled([loadTransactions(), loadGoals()]);
  }, [user?.id, loadTransactions, loadGoals]);

  // Initial load & user switch isolation
  useEffect(() => {
    if (user?.id) {
      refreshAll();
    } else {
      setTransactions([]);
      setGoals([]);
      setError(null);
    }
  }, [user?.id, refreshAll]);

  // Window Focus / App Resume revalidation (silent sync in background)
  useEffect(() => {
    if (!user?.id) return;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const onFocus = () => {
        refreshAll();
      };
      const onVisibilityChange = () => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          refreshAll();
        }
      };

      window.addEventListener('focus', onFocus);
      document.addEventListener('visibilitychange', onVisibilityChange);

      return () => {
        window.removeEventListener('focus', onFocus);
        document.removeEventListener('visibilitychange', onVisibilityChange);
      };
    } else {
      const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          refreshAll();
        }
      });
      return () => {
        subscription.remove();
      };
    }
  }, [user?.id, refreshAll]);

  // ── 2. Transaction Mutations (Immediate UI Update on Backend Confirm) ───────

  const addTransaction = useCallback(
    async (data: {
      type: TransactionType;
      amount: number;
      categoryId: string;
      description: string;
      date: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Deduplicate rapid double-clicks
      const submissionKey = `${data.type}-${data.amount}-${data.date}-${data.categoryId}`;
      if (pendingTxnSubmissions.current.has(submissionKey)) {
        throw new Error('Transaction submission already in progress');
      }
      pendingTxnSubmissions.current.add(submissionKey);

      try {
        // Step 1: Wait for backend confirmation
        const newTxn = await transactionDb.insertTransaction(null, user.id, data);

        // Step 2: Immediately update master state (prepend and deduplicate)
        setTransactions((prev) => {
          const filtered = prev.filter((t) => t.id !== newTxn.id);
          const next = [newTxn, ...filtered];
          return next.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        });

        return newTxn;
      } catch (err: any) {
        console.error('FinancialDataContext: addTransaction failed:', err);
        throw err;
      } finally {
        pendingTxnSubmissions.current.delete(submissionKey);
      }
    },
    [user?.id]
  );

  const updateTransaction = useCallback(
    async (
      id: string,
      data: {
        type?: TransactionType;
        amount?: number;
        categoryId?: string;
        description?: string;
        date?: string;
      }
    ) => {
      if (!user?.id) throw new Error('Not authenticated');

      try {
        // Step 1: Wait for backend confirmation
        await transactionDb.updateTransaction(null, user.id, id, data);

        // Step 2: Immediately update master state
        setTransactions((prev) => {
          const next = prev.map((t) => (t.id === id ? { ...t, ...data } : t));
          return next.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        });
      } catch (err: any) {
        console.error('FinancialDataContext: updateTransaction failed:', err);
        throw err;
      }
    },
    [user?.id]
  );

  const removeTransaction = useCallback(
    async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      try {
        // Step 1: Wait for backend confirmation
        await transactionDb.deleteTransaction(null, user.id, id);

        // Step 2: Immediately remove from master state
        setTransactions((prev) => prev.filter((t) => t.id !== id));
      } catch (err: any) {
        console.error('FinancialDataContext: removeTransaction failed:', err);
        throw err;
      }
    },
    [user?.id]
  );

  const getTransactionById = useCallback(
    async (id: string): Promise<Transaction | null> => {
      if (!id) return null;
      // Instant in-memory lookup first
      const found = transactions.find((t) => t.id === id);
      if (found) return found;

      if (!user?.id) return null;
      try {
        return await transactionDb.getTransactionById(null, user.id, id);
      } catch {
        return null;
      }
    },
    [transactions, user?.id]
  );

  // ── 3. Goal Mutations (Immediate UI Update on Backend Confirm) ─────────────

  const addGoal = useCallback(
    async (data: {
      name: string;
      targetAmount: number;
      currentAmount?: number;
      targetDate: string;
      description?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const submissionKey = `${data.name}-${data.targetAmount}-${data.targetDate}`;
      if (pendingGoalSubmissions.current.has(submissionKey)) {
        throw new Error('Goal creation already in progress');
      }
      pendingGoalSubmissions.current.add(submissionKey);

      try {
        // Step 1: Wait for backend confirmation
        const newGoal = await goalDb.insertGoal(null, user.id, data);

        // Step 2: Immediately update master state
        setGoals((prev) => {
          const filtered = prev.filter((g) => g.id !== newGoal.id);
          const next = [newGoal, ...filtered];
          return next.sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
        });

        return newGoal;
      } catch (err: any) {
        console.error('FinancialDataContext: addGoal failed:', err);
        throw err;
      } finally {
        pendingGoalSubmissions.current.delete(submissionKey);
      }
    },
    [user?.id]
  );

  const updateGoal = useCallback(
    async (
      id: string,
      data: {
        name?: string;
        targetAmount?: number;
        currentAmount?: number;
        targetDate?: string;
        description?: string;
        status?: GoalStatus;
      }
    ) => {
      if (!user?.id) throw new Error('Not authenticated');

      try {
        // Step 1: Wait for backend confirmation
        await goalDb.updateGoal(null, user.id, id, data);

        // Step 2: Immediately update master state
        setGoals((prev) => {
          const next = prev.map((g) => (g.id === id ? { ...g, ...data } : g));
          return next.sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
        });
      } catch (err: any) {
        console.error('FinancialDataContext: updateGoal failed:', err);
        throw err;
      }
    },
    [user?.id]
  );

  const removeGoal = useCallback(
    async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      try {
        // Step 1: Wait for backend confirmation
        await goalDb.deleteGoal(null, user.id, id);

        // Step 2: Immediately remove from master state
        setGoals((prev) => prev.filter((g) => g.id !== id));
      } catch (err: any) {
        console.error('FinancialDataContext: removeGoal failed:', err);
        throw err;
      }
    },
    [user?.id]
  );

  const addMoney = useCallback(
    async (id: string, amount: number) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (isNaN(amount) || amount <= 0) return;

      const target = goals.find((g) => g.id === id);
      const prevAmount = target?.currentAmount || 0;
      const targetAmount = target?.targetAmount || 1;
      const newAmount = prevAmount + amount;
      const newStatus: GoalStatus = newAmount >= targetAmount ? 'completed' : (target?.status || 'active');

      try {
        // Step 1: Send update to backend
        await goalDb.updateGoal(null, user.id, id, {
          currentAmount: newAmount,
          status: newStatus,
        });

        // Step 2: Immediately update master state
        setGoals((prev) =>
          prev.map((g) => (g.id === id ? { ...g, currentAmount: newAmount, status: newStatus } : g))
        );
      } catch (err: any) {
        console.error('FinancialDataContext: addMoney failed:', err);
        throw err;
      }
    },
    [user?.id, goals]
  );

  const withdrawMoney = useCallback(
    async (id: string, amount: number) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (isNaN(amount) || amount <= 0) return;

      const target = goals.find((g) => g.id === id);
      const prevAmount = target?.currentAmount || 0;
      const newAmount = Math.max(0, prevAmount - amount);

      try {
        await goalDb.updateGoal(null, user.id, id, {
          currentAmount: newAmount,
        });

        setGoals((prev) =>
          prev.map((g) => (g.id === id ? { ...g, currentAmount: newAmount } : g))
        );
      } catch (err: any) {
        console.error('FinancialDataContext: withdrawMoney failed:', err);
        throw err;
      }
    },
    [user?.id, goals]
  );

  const getGoalById = useCallback(
    async (id: string): Promise<Goal | null> => {
      if (!id) return null;
      const found = goals.find((g) => g.id === id);
      if (found) return found;

      if (!user?.id) return null;
      try {
        return await goalDb.getGoalById(null, user.id, id);
      } catch {
        return null;
      }
    },
    [goals, user?.id]
  );

  // ── 4. Derived & Memoized Data ─────────────────────────────────────────────

  const goalsWithProgress: GoalProgress[] = useMemo(() => {
    return goals.map(calculateGoalProgress);
  }, [goals]);

  const loading = transactionsLoading || goalsLoading;

  const value = useMemo(
    () => ({
      transactions,
      goals,
      goalsWithProgress,
      loading,
      transactionsLoading,
      goalsLoading,
      error,
      addTransaction,
      updateTransaction,
      removeTransaction,
      getTransactionById,
      addGoal,
      updateGoal,
      removeGoal,
      addMoney,
      withdrawMoney,
      getGoalById,
      refreshTransactions: loadTransactions,
      refreshGoals: loadGoals,
      refreshAll,
    }),
    [
      transactions,
      goals,
      goalsWithProgress,
      loading,
      transactionsLoading,
      goalsLoading,
      error,
      addTransaction,
      updateTransaction,
      removeTransaction,
      getTransactionById,
      addGoal,
      updateGoal,
      removeGoal,
      addMoney,
      withdrawMoney,
      getGoalById,
      loadTransactions,
      loadGoals,
      refreshAll,
    ]
  );

  return (
    <FinancialDataContext.Provider value={value}>
      {children}
    </FinancialDataContext.Provider>
  );
}

export function useFinancialData() {
  const context = useContext(FinancialDataContext);
  if (!context) {
    throw new Error('useFinancialData must be used within a FinancialDataProvider');
  }
  return context;
}

