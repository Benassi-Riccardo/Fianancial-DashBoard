import { create } from 'zustand';
import { Transaction, SinkingFund, Asset, Debt, Settings } from '../types/finance';

// KPI data coming from Google Sheets
export interface KpiData {
  [key: string]: { value: number; trend: string };
}

export interface BudgetData {
  speso: number;
  budget: number;
}

interface FinanceState {
  // Data
  transactions: Transaction[];
  sinkingFunds: SinkingFund[];
  assets: Asset[];
  debts: Debt[];
  settings: Settings;
  kpis: KpiData;
  budgetData: BudgetData;

  // State
  selectedMonth: number;
  selectedYear: number;

  // Loading & Error states
  isLoading: boolean;
  error: string | null;

  // Actions
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  createTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  deleteTransaction: (id: string) => void;
  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;
  fetchDashboardData: () => Promise<void>;
  clearError: () => void;
}

// Fallback data used when API is unreachable
const FALLBACK_SETTINGS: Settings = {
  liquiditaIniziale: 5000,
  budgetMensile: 1500,
  categorie: [
    { nome: 'Stipendio', tipo: 'Entrata', emoji: '💰' },
    { nome: 'Casa', tipo: 'Spesa', emoji: '🏠' },
    { nome: 'Cibo/Spesa', tipo: 'Spesa', emoji: '🛒' },
    { nome: 'Abbonamenti', tipo: 'Spesa', emoji: '📺' },
  ]
};

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

export const useFinanceStore = create<FinanceState>((set, get) => ({
  transactions: [],
  sinkingFunds: [],
  assets: [],
  debts: [],
  settings: FALLBACK_SETTINGS,
  kpis: {},
  budgetData: { speso: 0, budget: 1500 },
  selectedMonth: new Date().getMonth(),
  selectedYear: new Date().getFullYear(),
  isLoading: true,
  error: null,

  addTransaction: (tx) => set((state) => ({
    transactions: [{ ...tx, id: Math.random().toString(36).substring(7) }, ...state.transactions]
  })),

  createTransaction: async (tx) => {
    const token = localStorage.getItem('financeflow_token');
    const res = await fetch(`${API_BASE}/api/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(tx)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Errore durante la creazione della transazione');
    }
    await get().fetchDashboardData();
  },

  deleteTransaction: (id) => set((state) => ({
    transactions: state.transactions.filter(t => t.id !== id)
  })),

  setSelectedMonth: (month) => set({ selectedMonth: month }),
  setSelectedYear: (year) => set({ selectedYear: year }),

  clearError: () => set({ error: null }),

  fetchDashboardData: async () => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('financeflow_token');
      const res = await fetch(`${API_BASE}/api/finances`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server returned ${res.status}`);
      }
      const data = await res.json();

      set({
        transactions: data.transactions ?? [],
        sinkingFunds: data.sinkingFunds ?? [],
        assets: data.assets ?? [],
        debts: data.debts ?? [],
        settings: data.settings ?? FALLBACK_SETTINGS,
        kpis: data.kpis ?? {},
        budgetData: data.budget ?? { speso: 0, budget: 1500 },
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      set({
        isLoading: false,
        error: err.message || 'Impossibile connettersi al server. Verifica che il backend sia in esecuzione.',
      });
    }
  },
}));
