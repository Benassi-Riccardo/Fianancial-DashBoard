import { create } from 'zustand';

export interface AuthUser {
  id: string | number;
  email: string;
  name: string;
  picture?: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void;
  checkSession: () => Promise<void>;
  clearAuthError: () => void;
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';
const TOKEN_KEY = 'financeflow_token';
const USER_KEY = 'financeflow_user';

// Use sessionStorage so the session is cleared automatically when the browser/tab closes
const storage = sessionStorage;

export const useAuthStore = create<AuthState>((set, get) => {
  // Initialize from sessionStorage (cleared automatically when browser closes)
  const storedToken = storage.getItem(TOKEN_KEY);
  const storedUserRaw = storage.getItem(USER_KEY);
  let initialUser: AuthUser | null = null;
  if (storedUserRaw) {
    try {
      initialUser = JSON.parse(storedUserRaw);
    } catch {
      initialUser = null;
    }
  }

  const saveAuth = (token: string, user: AuthUser) => {
    storage.setItem(TOKEN_KEY, token);
    storage.setItem(USER_KEY, JSON.stringify(user));
    set({
      token,
      user,
      isAuthenticated: true,
      isLoading: false,
      authError: null,
    });
  };

  return {
    user: initialUser,
    token: storedToken,
    isAuthenticated: !!storedToken,
    isLoading: !!storedToken, // if token exists, we'll verify it in checkSession
    authError: null,

    clearAuthError: () => set({ authError: null }),

    login: async (email, password) => {
      set({ isLoading: true, authError: null });
      try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Credenziali non valide');
        }
        saveAuth(data.token, data.user);
      } catch (err: any) {
        set({ isLoading: false, authError: err.message || 'Errore durante il login' });
        throw err;
      }
    },

    register: async (email, password, name) => {
      set({ isLoading: true, authError: null });
      try {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Errore durante la registrazione');
        }
        saveAuth(data.token, data.user);
      } catch (err: any) {
        set({ isLoading: false, authError: err.message || 'Errore durante la registrazione' });
        throw err;
      }
    },

    loginWithGoogle: async (credential) => {
      set({ isLoading: true, authError: null });
      try {
        const res = await fetch(`${API_BASE}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Errore durante l\'accesso con Google');
        }
        saveAuth(data.token, data.user);
      } catch (err: any) {
        set({ isLoading: false, authError: err.message || 'Errore durante l\'accesso con Google' });
        throw err;
      }
    },

    logout: () => {
      storage.removeItem(TOKEN_KEY);
      storage.removeItem(USER_KEY);
      // Reset finance data in memory
      try {
        import('@/store/useFinanceStore').then(({ useFinanceStore }) => {
          useFinanceStore.getState().resetFinanceData?.();
        });
      } catch {}
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        authError: null,
      });
    },

    checkSession: async () => {
      const token = get().token;
      if (!token) {
        set({ isLoading: false, isAuthenticated: false, user: null });
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          set({ user: data.user, isAuthenticated: true, isLoading: false });
          storage.setItem(USER_KEY, JSON.stringify(data.user));
        } else {
          // Token invalid or expired
          get().logout();
        }
      } catch (err) {
        // Network error - retain offline state or keep existing credentials
        set({ isLoading: false });
      }
    },
  };
});
