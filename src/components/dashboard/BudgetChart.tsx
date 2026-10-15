import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useFinanceStore } from '@/store/useFinanceStore';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, Legend } from 'recharts';
import { getMonthlyCommitment, isSinkingFundDeposit } from '@/lib/sinkingFunds';
import { Target, AlertCircle, ArrowUpRight, PiggyBank, CheckCircle2 } from 'lucide-react';

export function BudgetChart() {
  const { transactions, settings, sinkingFunds, selectedMonth, selectedYear, setActiveTab } = useFinanceStore();

  const currentMonth = selectedMonth;
  const currentYear = selectedYear;

  // General operational expenses excluding sinking fund deposits (so deposits aren't double-counted)
  const generalExpenses = transactions
    .filter(t => {
      const d = new Date(t.data);
      return t.tipo === 'Spesa' && !isSinkingFundDeposit(t) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((acc, t) => acc + t.importo, 0);

  // Sinking fund deposits fulfilled during the current selected calendar month
  const monthlyDeposited = transactions
    .filter(t => {
      const d = new Date(t.data);
      return isSinkingFundDeposit(t) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((acc, t) => acc + t.importo, 0);

  // Active sinking funds planned commitments for the current month
  const activeSinkingFunds = sinkingFunds.filter(
    (f) => Math.max(0, (f.risparmioMensile || 0) - (f.spese || 0)) < f.obiettivo
  );
  const sinkingCommitment = activeSinkingFunds.reduce(
    (sum, f) => sum + getMonthlyCommitment(f),
    0
  );

  const budget = settings.budgetMensile || 1500;
  // Sinking fund deposits fulfill the planned commitment rather than adding an extra expense to the budget
  const totaleImpegnato = generalExpenses + sinkingCommitment;
  const residuoDisponibile = budget - totaleImpegnato;
  
  const percentageSpese = Math.min((generalExpenses / budget) * 100, 100);
  const percentageSinking = Math.min((sinkingCommitment / budget) * 100, Math.max(0, 100 - percentageSpese));
  const percentageTotale = (totaleImpegnato / budget) * 100;

  const data = [
    {
      name: 'Riepilogo Mese',
      Spese: Number(generalExpenses.toFixed(2)),
      'Sinking Funds': Number(sinkingCommitment.toFixed(2)),
      budget: budget
    }
  ];

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle>Avanzamento Budget & Cash Flow</CardTitle>
        {activeSinkingFunds.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('sinking')}
            title="Vai alla gestione Sinking Funds"
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 hover:border-sky-300 hover:text-sky-900 transition-all duration-150 cursor-pointer group shadow-xs hover:shadow-sm"
          >
            <Target size={13} className="text-sky-600 group-hover:scale-110 transition-transform" />
            <span>{activeSinkingFunds.length} {activeSinkingFunds.length === 1 ? 'fondo attivo' : 'fondi attivi'}</span>
            <ArrowUpRight size={12} className="text-sky-500 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </button>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center space-y-5">
        
        {/* Breakdown metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-center">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[11px] font-medium text-slate-500">Spese Mese</p>
            <p className="text-sm font-bold text-rose-600">€{generalExpenses.toFixed(2)}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-sky-50/60 border border-sky-100 flex flex-col justify-between">
            <div>
              <p className="text-[11px] font-medium text-sky-700">Sinking Funds</p>
              <p className="text-sm font-bold text-sky-600">+€{sinkingCommitment.toFixed(2)}</p>
            </div>
            <p className="text-[10px] text-sky-800 font-medium mt-1 truncate" title={`€${monthlyDeposited.toFixed(2)} / €${sinkingCommitment.toFixed(2)} depositati`}>
              €{monthlyDeposited.toFixed(2)} depositati
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[11px] font-medium text-slate-500">Budget Totale</p>
            <p className="text-sm font-bold text-slate-900">€{budget.toFixed(2)}</p>
          </div>
          <div className={`p-2.5 rounded-xl border ${residuoDisponibile >= 0 ? 'bg-emerald-50/60 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
            <p className="text-[11px] font-medium">{residuoDisponibile >= 0 ? 'Residuo Libero' : 'Sforamento'}</p>
            <p className="text-sm font-bold">€{Math.abs(residuoDisponibile).toFixed(2)}</p>
          </div>
        </div>

        {/* Monthly Sinking Fund Fulfillment Status */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-xl bg-sky-50/70 border border-sky-100 text-xs">
          <div className="flex items-center gap-2">
            <PiggyBank size={16} className="text-sky-600 shrink-0" />
            <span className="font-semibold text-slate-700">Versamenti Sinking Funds:</span>
            <span className="text-slate-600">
              <strong className="text-sky-700 font-bold">€{monthlyDeposited.toFixed(2)}</strong> / €{sinkingCommitment.toFixed(2)} depositati questo mese
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-28 h-2 bg-sky-200/60 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  monthlyDeposited >= sinkingCommitment && sinkingCommitment > 0 ? 'bg-emerald-500' : 'bg-sky-500'
                }`}
                style={{ width: `${Math.min(100, sinkingCommitment > 0 ? (monthlyDeposited / sinkingCommitment) * 100 : (monthlyDeposited > 0 ? 100 : 0))}%` }}
              />
            </div>
            <span className={`text-[11px] font-bold ${
              monthlyDeposited >= sinkingCommitment && sinkingCommitment > 0 ? 'text-emerald-700' : 'text-sky-700'
            }`}>
              {sinkingCommitment > 0 ? `${Math.round((monthlyDeposited / sinkingCommitment) * 100)}%` : (monthlyDeposited > 0 ? '100%' : '0%')}
            </span>
            {monthlyDeposited >= sinkingCommitment && sinkingCommitment > 0 && (
              <CheckCircle2 size={13} className="text-emerald-600" />
            )}
          </div>
        </div>

        {/* Stacked Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium text-slate-600">
            <span>Impegnato: €{totaleImpegnato.toFixed(2)}</span>
            <span className={percentageTotale > 100 ? 'text-rose-600 font-bold' : 'text-slate-500'}>
              {percentageTotale.toFixed(1)}% del budget
            </span>
          </div>

          <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            {/* Spese portion */}
            <div 
              className="h-full bg-rose-500 transition-all duration-500"
              style={{ width: `${percentageSpese}%` }}
              title={`Spese: €${generalExpenses.toFixed(2)}`}
            />
            {/* Sinking funds portion */}
            <div 
              className="h-full bg-sky-500 transition-all duration-500"
              style={{ width: `${percentageSinking}%` }}
              title={`Sinking Funds: €${sinkingCommitment.toFixed(2)}`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" /> Spese
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-sky-500 inline-block" /> Sinking Funds
              </span>
            </div>
            {totaleImpegnato > budget && (
              <span className="text-rose-600 font-semibold flex items-center gap-1">
                <AlertCircle size={12} /> Fuori budget di €{(totaleImpegnato - budget).toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Horizontal Stacked BarChart */}
        <div className="h-32 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data} 
              layout="vertical" 
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <XAxis 
                type="number" 
                hide 
                domain={[0, Math.max(budget, totaleImpegnato) * 1.05]} 
              />
              <YAxis dataKey="name" type="category" hide />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                formatter={(value: any, name: any) => [
                  `€${Number(value).toFixed(2)}`,
                  String(name || '')
                ]}
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  borderColor: '#e2e8f0', 
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <ReferenceLine 
                x={budget} 
                stroke="#64748b" 
                strokeDasharray="4 4" 
                label={{ 
                  value: `Limite: €${budget}`, 
                  fill: '#64748b', 
                  fontSize: 11, 
                  position: 'top' 
                }} 
              />
              <Bar 
                dataKey="Spese" 
                stackId="budgetStack" 
                fill="#f43f5e" 
                radius={[4, 0, 0, 4]} 
                barSize={24} 
              />
              <Bar 
                dataKey="Sinking Funds" 
                stackId="budgetStack" 
                fill="#0ea5e9" 
                radius={[0, 4, 4, 0]} 
                barSize={24} 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </CardContent>
    </Card>
  );
}
