import { create } from 'zustand';
import { Transaction, SinkingFund, Asset, Debt, Settings, TabId } from '../types/finance';

export type { TabId };

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
  activeTab: TabId;
  selectedMonth: number;
  selectedYear: number;

  // Loading & Error states
  isLoading: boolean;
  error: string | null;

  // Actions
  setActiveTab: (tab: TabId) => void;
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  createTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  deleteTransaction: (id: string) => void;
  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;
  fetchDashboardData: () => Promise<void>;
  updateSettings: (newSettings: Settings) => Promise<void>;
  createSinkingFund: (fund: { attivita: string; obiettivo: number; dataScadenza?: string; monthlyAllocation?: number; initialDeposit?: number }) => Promise<void>;
  deleteSinkingFund: (id: string) => Promise<void>;
  transactSinkingFund: (id: string, action: { type: 'deposit' | 'withdraw'; amount: number; note?: string; date?: string }) => Promise<void>;
  resetFinanceData: () => void;
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
    { nome: 'Accantonamenti', tipo: 'Spesa', emoji: '🎯' },
  ]
};

const RAW_API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';
const API_BASE = RAW_API_BASE.replace(/\/+$/, '');

export const useFinanceStore = create<FinanceState>((set, get) => ({
  transactions: [],
  sinkingFunds: [],
  assets: [],
  debts: [],
  settings: FALLBACK_SETTINGS,
  kpis: {},
  budgetData: { speso: 0, budget: 1500 },
  activeTab: 'dashboard',
  selectedMonth: new Date().getMonth(),
  selectedYear: new Date().getFullYear(),
  isLoading: true,
  error: null,

  setActiveTab: (tab) => set({ activeTab: tab }),

  addTransaction: (tx) => set((state) => ({
    transactions: [{ ...tx, id: Math.random().toString(36).substring(7) }, ...state.transactions]
  })),

  createTransaction: async (tx) => {
    const token = sessionStorage.getItem('financeflow_token');
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

  deleteTransaction: async (id) => {
    // Optimistic local update
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    }));

    try {
      const token = sessionStorage.getItem('financeflow_token');
      await fetch(`${API_BASE}/api/transactions/${id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      await get().fetchDashboardData();
    } catch (e) {
      console.error('Failed to delete transaction on server:', e);
      await get().fetchDashboardData();
    }
  },

  setSelectedMonth: (month) => set({ selectedMonth: month }),
  setSelectedYear: (year) => set({ selectedYear: year }),

  updateSettings: async (newSettings) => {
    const token = sessionStorage.getItem('financeflow_token');
    const res = await fetch(`${API_BASE}/api/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(newSettings),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Errore durante l\'aggiornamento delle impostazioni');
    }

    const data = await res.json();
    const saved = data.settings || newSettings;
    set((state) => ({
      settings: saved,
      budgetData: {
        ...state.budgetData,
        budget: saved.budgetMensile,
      },
    }));
  },

  createSinkingFund: async (fund) => {
    const token = sessionStorage.getItem('financeflow_token');
    const res = await fetch(`${API_BASE}/api/sinking-funds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(fund),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Errore durante la creazione del fondo');
    }
    await get().fetchDashboardData();
  },

  deleteSinkingFund: async (id) => {
    // Optimistic local update
    set((state) => ({
      sinkingFunds: state.sinkingFunds.filter((f) => f.id !== id),
    }));

    try {
      const token = sessionStorage.getItem('financeflow_token');
      await fetch(`${API_BASE}/api/sinking-funds/${id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      await get().fetchDashboardData();
    } catch (e) {
      console.error('Failed to delete sinking fund:', e);
      await get().fetchDashboardData();
    }
  },

  transactSinkingFund: async (id, action) => {
    const token = sessionStorage.getItem('financeflow_token');
    const res = await fetch(`${API_BASE}/api/sinking-funds/${id}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(action),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Errore durante l\'aggiornamento del fondo');
    }
    await get().fetchDashboardData();
  },

  resetFinanceData: () => set({
    transactions: [],
    sinkingFunds: [],
    assets: [],
    debts: [],
    settings: FALLBACK_SETTINGS,
    kpis: {},
    budgetData: { speso: 0, budget: 1500 },
    isLoading: true,
    error: null,
  }),

  clearError: () => set({ error: null }),

  fetchDashboardData: async () => {
    set({ isLoading: true, error: null });
    try {
      const token = sessionStorage.getItem('financeflow_token');
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
