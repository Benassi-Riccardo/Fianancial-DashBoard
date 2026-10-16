import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { ArrowUpRight, ArrowDownRight, Wallet, Percent, TrendingUp, TrendingDown } from 'lucide-react';

interface YearlyKpisProps {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
}

export function YearlyKpis({
  totalIncome,
  totalExpenses,
  netSavings,
  savingsRate,
}: YearlyKpisProps) {
  const isPositiveSavings = netSavings >= 0;
  const isPositiveRate = savingsRate >= 0;

  const kpis = [
    {
      title: 'Entrate Totali',
      value: `€${totalIncome.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: 'Totale incassato nell\'anno',
      icon: ArrowUpRight,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      badge: null,
    },
    {
      title: 'Uscite Totali',
      value: `€${totalExpenses.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: 'Totale speso nell\'anno',
      icon: ArrowDownRight,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-100',
      badge: null,
    },
    {
      title: 'Risparmio Netto',
      value: `${isPositiveSavings ? '+' : ''}€${netSavings.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: isPositiveSavings ? 'Saldo annuale positivo' : 'Disavanzo annuale',
      icon: Wallet,
      color: isPositiveSavings ? 'text-emerald-600' : 'text-rose-600',
      bg: isPositiveSavings ? 'bg-emerald-50' : 'bg-rose-50',
      border: isPositiveSavings ? 'border-emerald-100' : 'border-rose-100',
      badge: {
        text: isPositiveSavings ? 'In attivo' : 'In passivo',
        isPositive: isPositiveSavings,
      },
    },
    {
      title: 'Tasso di Risparmio %',
      value: `${isPositiveRate ? '+' : ''}${savingsRate.toFixed(1)}%`,
      subtitle: 'Delle entrate risparmiato',
      icon: isPositiveRate ? TrendingUp : TrendingDown,
      color: isPositiveRate ? 'text-sky-600' : 'text-amber-600',
      bg: isPositiveRate ? 'bg-sky-50' : 'bg-amber-50',
      border: isPositiveRate ? 'border-sky-100' : 'border-amber-100',
      badge: {
        text: savingsRate >= 20 ? 'Ottimo' : savingsRate > 0 ? 'Buono' : 'Attenzione',
        isPositive: savingsRate > 0,
      },
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <Card key={idx} className="group hover:border-blue-200 transition-all duration-200 shadow-xs hover:shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.border} border`}>
                  <Icon size={24} className={kpi.color} />
                </div>
                {kpi.badge && (
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      kpi.badge.isPositive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {kpi.badge.text}
                  </span>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  {kpi.title}
                </p>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {kpi.value}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {kpi.subtitle}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
