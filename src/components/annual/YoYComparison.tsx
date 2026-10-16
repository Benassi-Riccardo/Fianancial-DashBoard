import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  GitCompare, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export interface YearSummary {
  year: number;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
  txCount: number;
}

interface YoYComparisonProps {
  currentYearSummary: YearSummary;
  prevYearSummary: YearSummary;
}

export function YoYComparison({
  currentYearSummary,
  prevYearSummary,
}: YoYComparisonProps) {
  const hasPrevData = prevYearSummary.txCount > 0;

  // Percentage variations: ((current - prev) / prev) * 100
  const calcVariation = (current: number, prev: number) => {
    if (prev === 0) return current > 0 ? 100 : 0;
    return ((current - prev) / Math.abs(prev)) * 100;
  };

  const incomeVar = calcVariation(currentYearSummary.income, prevYearSummary.income);
  const expenseVar = calcVariation(currentYearSummary.expenses, prevYearSummary.expenses);
  const savingsVar = calcVariation(currentYearSummary.savings, prevYearSummary.savings);
  const rateDelta = currentYearSummary.savingsRate - prevYearSummary.savingsRate;

  // Inverted logic for expenses: lower expenses is good (green), higher expenses is alert (rose)
  const isExpenseGood = expenseVar <= 0;
  const isIncomeGood = incomeVar >= 0;
  const isSavingsGood = savingsVar >= 0;
  const isRateGood = rateDelta >= 0;

  return (
    <Card className="border border-blue-100/70 shadow-xs flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
            <GitCompare size={18} className="text-sky-600" />
            Confronto Anno su Anno (YoY)
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentYearSummary.year} vs {prevYearSummary.year} (Anno Precedente)
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80">
          <span>{currentYearSummary.year} / {prevYearSummary.year}</span>
        </div>
      </CardHeader>

      <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-5">
        {!hasPrevData ? (
          <div className="py-10 text-center text-slate-400 text-sm flex-1 flex flex-col items-center justify-center">
            <AlertCircle size={36} className="text-slate-300 mb-2 stroke-1" />
            <p className="font-medium text-slate-600">Dati dell'anno {prevYearSummary.year} non disponibili</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Per visualizzare il confronto YoY automatico sono necessarie transazioni registrate nell'anno {prevYearSummary.year}.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Spese YoY */}
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Uscite Annuali
                </span>
                <div
                  className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                    isExpenseGood
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {isExpenseGood ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                  <span>{expenseVar > 0 ? '+' : ''}{expenseVar.toFixed(1)}%</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block">{currentYearSummary.year}:</span>
                  <span className="font-semibold text-slate-800">
                    €{currentYearSummary.expenses.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">{prevYearSummary.year}:</span>
                  <span className="font-semibold text-slate-600">
                    €{prevYearSummary.expenses.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Entrate YoY */}
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Entrate Annuali
                </span>
                <div
                  className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                    isIncomeGood
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {isIncomeGood ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  <span>{incomeVar > 0 ? '+' : ''}{incomeVar.toFixed(1)}%</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block">{currentYearSummary.year}:</span>
                  <span className="font-semibold text-slate-800">
                    €{currentYearSummary.income.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">{prevYearSummary.year}:</span>
                  <span className="font-semibold text-slate-600">
                    €{prevYearSummary.income.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Risparmio Netto YoY */}
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Risparmio Netto
                </span>
                <div
                  className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                    isSavingsGood
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {isSavingsGood ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  <span>{savingsVar > 0 ? '+' : ''}{savingsVar.toFixed(1)}%</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block">{currentYearSummary.year}:</span>
                  <span className={`font-semibold ${currentYearSummary.savings >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    €{currentYearSummary.savings.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">{prevYearSummary.year}:</span>
                  <span className="font-semibold text-slate-600">
                    €{prevYearSummary.savings.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Tasso di Risparmio Delta */}
            <div className="p-3.5 rounded-xl border border-sky-100 bg-sky-50/40">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Variazione Tasso di Risparmio:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded-md ${
                    isRateGood
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {rateDelta > 0 ? '+' : ''}{rateDelta.toFixed(1)} p.p.
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                <span>Da {prevYearSummary.savingsRate.toFixed(1)}% ({prevYearSummary.year})</span>
                <span>A {currentYearSummary.savingsRate.toFixed(1)}% ({currentYearSummary.year})</span>
              </div>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Stato confronto:</span>
          <span className="inline-flex items-center gap-1 font-semibold text-sky-700">
            <CheckCircle2 size={13} className="text-sky-600" />
            {hasPrevData ? 'Dati annuali sincronizzati' : 'In attesa di dati storici'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
