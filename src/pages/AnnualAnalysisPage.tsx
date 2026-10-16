import React, { useState, useMemo } from 'react';
import { useFinanceStore } from '@/store/useFinanceStore';
import { YearlyKpis } from '@/components/annual/YearlyKpis';
import { YearlyChart, MonthlyChartData } from '@/components/annual/YearlyChart';
import { CategoryBreakdown, CategoryExpense } from '@/components/annual/CategoryBreakdown';
import { YoYComparison, YearSummary } from '@/components/annual/YoYComparison';
import { MonthDetailModal } from '@/components/annual/MonthDetailModal';
import { Calendar, RefreshCw, Loader2 } from 'lucide-react';

const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const MONTH_SHORT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

export default function AnnualAnalysisPage() {
  const { 
    transactions, 
    settings, 
    selectedYear, 
    setSelectedYear, 
    fetchDashboardData, 
    isLoading: isGlobalLoading 
  } = useFinanceStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedMonthForModal, setSelectedMonthForModal] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Derive dynamic list of available years from transactions and current year
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    const currentCalYear = new Date().getFullYear();
    yearsSet.add(currentCalYear);
    yearsSet.add(currentCalYear - 1);
    yearsSet.add(currentCalYear - 2);

    transactions.forEach((t) => {
      if (t.data) {
        const y = new Date(t.data).getFullYear();
        if (!isNaN(y) && y > 2000 && y < 2100) {
          yearsSet.add(y);
        }
      }
    });

    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [transactions]);

  // Handle year change: update store and fetch fresh data from backend on Render
  const handleYearChange = async (newYear: number) => {
    setSelectedYear(newYear);
    setIsRefreshing(true);
    try {
      await fetchDashboardData();
    } catch (err) {
      console.error('Error refreshing annual data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchDashboardData();
    } catch (err) {
      console.error('Error refreshing annual data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Helper to calculate summary for any given year
  const calculateYearSummary = (targetYear: number): YearSummary => {
    const yearTxs = transactions.filter((t) => {
      const d = new Date(t.data);
      return d.getFullYear() === targetYear;
    });

    const income = yearTxs
      .filter((t) => t.tipo === 'Entrata')
      .reduce((acc, t) => acc + t.importo, 0);

    const expenses = yearTxs
      .filter((t) => t.tipo === 'Spesa')
      .reduce((acc, t) => acc + t.importo, 0);

    const savings = income - expenses;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;

    return {
      year: targetYear,
      income,
      expenses,
      savings,
      savingsRate,
      txCount: yearTxs.length,
    };
  };

  // Current selected year summary
  const currentSummary = useMemo(() => {
    return calculateYearSummary(selectedYear);
  }, [transactions, selectedYear]);

  // Previous year summary for YoY
  const prevSummary = useMemo(() => {
    return calculateYearSummary(selectedYear - 1);
  }, [transactions, selectedYear]);

  // Monthly breakdown for the 12-month chart
  const monthlyChartData: MonthlyChartData[] = useMemo(() => {
    return MONTH_SHORT.map((shortName, monthIndex) => {
      const monthTxs = transactions.filter((t) => {
        const d = new Date(t.data);
        return d.getFullYear() === selectedYear && d.getMonth() === monthIndex;
      });

      const entrate = monthTxs
        .filter((t) => t.tipo === 'Entrata')
        .reduce((acc, t) => acc + t.importo, 0);

      const uscite = monthTxs
        .filter((t) => t.tipo === 'Spesa')
        .reduce((acc, t) => acc + t.importo, 0);

      const risparmio = entrate - uscite;
      const tassoRisparmio = entrate > 0 ? (risparmio / entrate) * 100 : 0;

      return {
        monthIndex,
        name: shortName,
        fullName: MONTH_NAMES[monthIndex],
        Entrate: Number(entrate.toFixed(2)),
        Uscite: Number(uscite.toFixed(2)),
        Risparmio: Number(risparmio.toFixed(2)),
        tassoRisparmio,
        txCount: monthTxs.length,
      };
    });
  }, [transactions, selectedYear]);

  // Category breakdown for selected year
  const categoryExpenses: CategoryExpense[] = useMemo(() => {
    const yearExpenseTxs = transactions.filter((t) => {
      const d = new Date(t.data);
      return d.getFullYear() === selectedYear && t.tipo === 'Spesa';
    });

    const categoryMap = new Map<string, { importo: number; count: number }>();

    yearExpenseTxs.forEach((t) => {
      const cat = t.categoria || 'Varie';
      const current = categoryMap.get(cat) || { importo: 0, count: 0 };
      categoryMap.set(cat, {
        importo: current.importo + t.importo,
        count: current.count + 1,
      });
    });

    const totalExpense = currentSummary.expenses;

    const result: CategoryExpense[] = [];
    categoryMap.forEach((val, catName) => {
      const catConfig = settings.categorie?.find((c) => c.nome === catName);
      const emoji = catConfig?.emoji || '📌';
      const pct = totalExpense > 0 ? (val.importo / totalExpense) * 100 : 0;

      result.push({
        nome: catName,
        emoji,
        importo: Number(val.importo.toFixed(2)),
        percentuale: Number(pct.toFixed(2)),
        count: val.count,
      });
    });

    return result.sort((a, b) => b.importo - a.importo);
  }, [transactions, selectedYear, settings.categorie, currentSummary.expenses]);

  const handleOpenMonthModal = (monthIndex: number) => {
    setSelectedMonthForModal(monthIndex);
    setIsModalOpen(true);
  };

  const handleCloseMonthModal = () => {
    setIsModalOpen(false);
    setSelectedMonthForModal(null);
  };

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* A. Header della Pagina con Selettore Anno */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Visione Annuale ({selectedYear})
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Andamento storico di entrate e uscite e analisi dettagliata del budget.
          </p>
        </div>

        {/* Year Selector Dropdown & Refresh Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
              disabled={isRefreshing || isGlobalLoading}
              className="appearance-none bg-white border border-slate-200/90 text-slate-800 text-sm font-semibold rounded-xl pl-9 pr-8 py-2.5 shadow-2xs hover:border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 cursor-pointer transition-all"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  Anno {year}
                </option>
              ))}
            </select>
            <Calendar 
              size={16} 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-600 pointer-events-none" 
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
              ▼
            </div>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing || isGlobalLoading}
            title="Sincronizza con server Render"
            className="p-2.5 bg-white border border-slate-200/90 text-slate-600 hover:text-sky-600 hover:bg-sky-50/50 rounded-xl transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {isRefreshing || isGlobalLoading ? (
              <Loader2 size={16} className="animate-spin text-sky-600" />
            ) : (
              <RefreshCw size={16} />
            )}
          </button>
        </div>
      </div>

      {/* B. Sezione KPI Cards (Sintesi Annuale) */}
      <YearlyKpis
        totalIncome={currentSummary.income}
        totalExpenses={currentSummary.expenses}
        netSavings={currentSummary.savings}
        savingsRate={currentSummary.savingsRate}
      />

      {/* C. Grafico Principale dell'Andamento Annuale (Entrate vs Uscite) */}
      <YearlyChart
        data={monthlyChartData}
        selectedYear={selectedYear}
        onSelectMonth={handleOpenMonthModal}
      />

      {/* D. Sezione Analisi Dettagliata (Sotto al Grafico a 2 Colonne) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* 1. Top Categorie di Spesa */}
        <CategoryBreakdown
          categories={categoryExpenses}
          totalExpenses={currentSummary.expenses}
          selectedYear={selectedYear}
        />

        {/* 2. Confronto YoY (Anno su Anno) */}
        <YoYComparison
          currentYearSummary={currentSummary}
          prevYearSummary={prevSummary}
        />
      </div>

      {/* Interactive Month Detail Modal */}
      {selectedMonthForModal !== null && (
        <MonthDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseMonthModal}
          monthIndex={selectedMonthForModal}
          year={selectedYear}
          transactions={transactions}
        />
      )}

    </div>
  );
}
