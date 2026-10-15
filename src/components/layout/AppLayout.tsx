import React, { useEffect, useState } from 'react';
import { Sidebar, TabId } from './Sidebar';
import DashboardPage from '@/pages/DashboardPage';
import AnnualAnalysisPage from '@/pages/AnnualAnalysisPage';
import SinkingFundsPage from '@/pages/SinkingFundsPage';
import NetWorthPage from '@/pages/NetWorthPage';
import TransactionsPage from '@/pages/TransactionsPage';
import SettingsPage from '@/pages/SettingsPage';
import { useFinanceStore } from '@/store/useFinanceStore';
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';

// --- Skeleton Loader Component ---
function SkeletonLoader() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-200 rounded-lg" />
          <div className="h-4 w-72 bg-slate-200 rounded-lg" />
        </div>
        <div className="h-10 w-44 bg-slate-200 rounded-xl" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-blue-100/50 bg-white shadow-md shadow-blue-100/50 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-12 w-12 bg-slate-200 rounded-xl" />
              <div className="h-5 w-16 bg-slate-200 rounded-lg" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-24 bg-slate-200 rounded" />
              <div className="h-7 w-32 bg-slate-200 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-blue-100/50 bg-white shadow-md shadow-blue-100/50 p-6">
          <div className="h-6 w-40 bg-slate-200 rounded mb-6" />
          <div className="h-48 bg-slate-200 rounded-xl" />
        </div>
        <div className="rounded-xl border border-blue-100/50 bg-white shadow-md shadow-blue-100/50 p-6">
          <div className="h-6 w-40 bg-slate-200 rounded mb-6" />
          <div className="h-48 bg-slate-200 rounded-full mx-auto w-48" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-blue-100/50 bg-white shadow-md shadow-blue-100/50 p-6 space-y-4">
        <div className="h-6 w-36 bg-slate-200 rounded" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <div className="h-4 w-24 bg-slate-200 rounded" />
            <div className="h-4 w-32 bg-slate-200 rounded" />
            <div className="h-4 w-20 bg-slate-200 rounded" />
            <div className="h-4 w-16 bg-slate-200 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Error Banner Component ---
function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-8 mt-4">
      <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 shadow-sm">
        <AlertTriangle size={20} className="text-amber-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">Connessione al server non riuscita</p>
          <p className="text-xs mt-0.5 text-amber-700 truncate">{message}</p>
        </div>
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors shrink-0"
        >
          <RefreshCw size={14} />
          Riprova
        </button>
      </div>
    </div>
  );
}

import { useAuthStore } from '@/store/useAuthStore';
import { Header } from './Header';

export function AppLayout() {
  const [isScrolled, setIsScrolled] = React.useState(false);
  const mainRef = React.useRef<HTMLElement>(null);
  const { activeTab, setActiveTab, isLoading: isFinanceLoading, error, fetchDashboardData, resetFinanceData, clearError } = useFinanceStore();
  const { user, isAuthenticated, checkSession, isLoading: isAuthLoading } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      resetFinanceData();
      fetchDashboardData();
    }
  }, [isAuthenticated, user?.id, fetchDashboardData, resetFinanceData]);

  const handleRetry = () => {
    clearError();
    fetchDashboardData();
  };

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    setIsScrolled(e.currentTarget.scrollTop > 15);
  };

  const renderContent = () => {
    if (isFinanceLoading) {
      return <SkeletonLoader />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'annual':
        return <AnnualAnalysisPage />;
      case 'sinking':
        return <SinkingFundsPage />;
      case 'networth':
        return <NetWorthPage />;
      case 'transactions':
        return <TransactionsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex min-h-screen bg-blue-50 text-slate-900 selection:bg-sky-500/30">
      <Sidebar currentTab={activeTab} onTabChange={setActiveTab} />
      <main 
        ref={mainRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto flex flex-col"
      >
        <Header isScrolled={isScrolled} />
        <div className="flex-1">
          {error && <ErrorBanner message={error} onRetry={handleRetry} />}
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
