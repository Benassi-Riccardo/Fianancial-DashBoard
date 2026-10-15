import React, { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { GoogleLogin } from '@react-oauth/google';
import { Lock, Mail, User, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import monogramLogo from '@/FinanceFlow-Monogram_logo.jpg';

interface AuthPageProps {
  initialMode?: 'login' | 'signup';
}

export function AuthPage({ initialMode = 'login' }: AuthPageProps) {
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const { login, register, loginWithGoogle, isLoading, authError, clearAuthError } = useAuthStore();

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setLocalError(null);
    clearAuthError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (!email || !password) {
      setLocalError('Compila tutti i campi obbligatori.');
      return;
    }

    if (password.length < 6) {
      setLocalError('La password deve avere almeno 6 caratteri.');
      return;
    }

    try {
      if (isSignUp) {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
    } catch {
      // Error handled by store
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (credentialResponse.credential) {
      try {
        setLocalError(null);
        clearAuthError();
        await loginWithGoogle(credentialResponse.credential);
      } catch {
        // Handled in store
      }
    } else {
      setLocalError('Credenziale Google non ricevuta.');
    }
  };

  const handleGoogleError = () => {
    setLocalError('Autenticazione con Google fallita o annullata.');
  };

  const activeError = localError || authError;
  const hasGoogleClientId = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50/70 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img 
              src={monogramLogo} 
              alt="FinanceFlow Logo" 
              className="w-16 h-16 object-contain rounded-2xl shadow-lg shadow-sky-500/20 border border-sky-100 bg-white p-1" 
            />
          </div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
            FinanceFlow
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isSignUp ? 'Crea il tuo account per accedere alla dashboard' : 'Accedi per visualizzare e gestire le tue finanze'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-blue-100/50 border border-blue-100/60 p-6 sm:p-8">
          {/* Error Message */}
          {activeError && (
            <div className="mb-6 flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm animate-in fade-in duration-200">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{activeError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nome (Opzionale)
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Mario Rossi"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 text-sm transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="nome@esempio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="Minimo 6 caratteri"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 text-sm transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-sky-500/20 transition-all duration-200 disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Elaborazione in corso...</span>
                </>
              ) : (
                <>
                  <span>{isSignUp ? 'Crea Account' : 'Accedi'}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-medium">Oppure</span>
            </div>
          </div>

          {/* Google Login Section */}
          <div className="flex flex-col items-center justify-center">
            {hasGoogleClientId ? (
              <div className="w-full flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="outline"
                  shape="pill"
                  size="large"
                  text={isSignUp ? 'signup_with' : 'signin_with'}
                  width="100%"
                />
              </div>
            ) : (
              <div className="text-center p-3 rounded-xl bg-slate-50 border border-slate-100 w-full text-xs text-slate-500">
                <p className="font-medium text-slate-700">Google OAuth pronto</p>
                <p className="mt-0.5">Configura <code className="bg-slate-200/70 px-1 py-0.5 rounded text-[11px]">VITE_GOOGLE_CLIENT_ID</code> per abilitare il pulsante Google One-Tap.</p>
              </div>
            )}
          </div>

          {/* Toggle Login / Signup */}
          <div className="mt-6 text-center text-sm text-slate-500">
            {isSignUp ? (
              <span>
                Hai già un account?{' '}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="font-semibold text-sky-600 hover:text-sky-700 hover:underline cursor-pointer"
                >
                  Accedi qui
                </button>
              </span>
            ) : (
              <span>
                Non hai ancora un account?{' '}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="font-semibold text-sky-600 hover:text-sky-700 hover:underline cursor-pointer"
                >
                  Registrati gratis
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
