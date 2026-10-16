import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { Calendar, MousePointerClick, TrendingUp } from 'lucide-react';

export interface MonthlyChartData {
  monthIndex: number;
  name: string;
  fullName: string;
  Entrate: number;
  Uscite: number;
  Risparmio: number;
  tassoRisparmio: number;
  txCount: number;
}

interface YearlyChartProps {
  data: MonthlyChartData[];
  selectedYear: number;
  onSelectMonth: (monthIndex: number) => void;
}

export function YearlyChart({ data, selectedYear, onSelectMonth }: YearlyChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const monthData = payload[0]?.payload as MonthlyChartData;
      const isPositive = monthData.Risparmio >= 0;

      return (
        <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200 text-xs space-y-2 min-w-[200px]">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="font-bold text-slate-800 text-sm">{monthData.fullName} {selectedYear}</span>
            <span className="text-[10px] text-sky-600 font-medium bg-sky-50 px-2 py-0.5 rounded-full">
              {monthData.txCount} transazioni
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                Entrate:
              </span>
              <span className="font-semibold text-emerald-600">
                €{monthData.Entrate.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                Uscite:
              </span>
              <span className="font-semibold text-rose-600">
                €{monthData.Uscite.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-100 font-medium">
              <span className="text-slate-600">Risparmio Netto:</span>
              <span className={`font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isPositive ? '+' : ''}€{monthData.Risparmio.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Tasso di Risparmio:</span>
              <span className="font-semibold text-slate-700">
                {monthData.tassoRisparmio.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="pt-2 text-[10px] text-sky-600 font-medium text-center border-t border-slate-100 flex items-center justify-center gap-1">
            <MousePointerClick size={12} />
            <span>Clicca per vedere i dettagli del mese</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const handleChartClick = (state: any) => {
    if (state && state.activeTooltipIndex !== undefined) {
      onSelectMonth(state.activeTooltipIndex);
    }
  };

  return (
    <Card className="border border-blue-100/70 shadow-xs">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-2 border-b border-slate-100">
        <div>
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp size={20} className="text-sky-600" />
            Andamento Entrate vs Uscite ({selectedYear})
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Confronto mensile entrate, uscite e saldo di risparmio. Clicca su un mese per esplorare le transazioni.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80 shrink-0">
          <Calendar size={14} className="text-slate-400" />
          <span>Interattivo (12 Mesi)</span>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="min-h-[380px] w-full cursor-pointer">
          <ResponsiveContainer width="100%" height={380}>
            <ComposedChart
              data={data}
              margin={{ top: 20, right: 20, left: 0, bottom: 10 }}
              onClick={handleChartClick}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `€${value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '15px' }}
                iconType="circle"
                formatter={(value) => <span className="text-xs font-semibold text-slate-700">{value}</span>}
              />
              <Bar
                dataKey="Entrate"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
              <Bar
                dataKey="Uscite"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
              <Line
                type="monotone"
                dataKey="Risparmio"
                stroke="#0284c7"
                strokeWidth={3}
                dot={{ r: 4, fill: '#0284c7', strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 7, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Interactive Month Selector Strip */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Dettaglio per Mese:
            </span>
            <span className="text-[11px] text-slate-400">
              Seleziona un mese per aprire il prospetto completo
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-1.5">
            {data.map((m) => {
              const hasData = m.Entrate > 0 || m.Uscite > 0;
              const isPositive = m.Risparmio >= 0;

              return (
                <button
                  key={m.monthIndex}
                  onClick={() => onSelectMonth(m.monthIndex)}
                  title={`${m.fullName}: Entrate €${m.Entrate.toFixed(0)}, Uscite €${m.Uscite.toFixed(0)}`}
                  className={`px-2 py-2 rounded-xl text-center transition-all cursor-pointer border ${
                    hasData
                      ? isPositive
                        ? 'bg-emerald-50/50 hover:bg-emerald-100/60 border-emerald-100 text-slate-800'
                        : 'bg-rose-50/50 hover:bg-rose-100/60 border-rose-100 text-slate-800'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-100 text-slate-400'
                  }`}
                >
                  <div className="text-xs font-bold">{m.name}</div>
                  <div
                    className={`text-[10px] font-semibold mt-0.5 truncate ${
                      hasData
                        ? isPositive
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {hasData ? `${isPositive ? '+' : ''}€${Math.round(m.Risparmio)}` : '€0'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
