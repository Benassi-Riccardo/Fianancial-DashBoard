import React, { useState } from 'react';
import { Transaction } from '@/types/finance';
import { 
  X, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  Search, 
  Filter, 
  Receipt,
  PieChart as PieIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface MonthDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthIndex: number;
  year: number;
  transactions: Transaction[];
}

const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

export function MonthDetailModal({
  isOpen,
  onClose,
  monthIndex,
  year,
  transactions,
}: MonthDetailModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Entrata' | 'Spesa'>('all');

  if (!isOpen) return null;

  const monthName = MONTH_NAMES[monthIndex] || '';

  // Filter transactions for this specific month and year
  const monthTxs = transactions.filter((t) => {
    const d = new Date(t.data);
    return d.getMonth() === monthIndex && d.getFullYear() === year;
  });

  const totalIncome = monthTxs
    .filter((t) => t.tipo === 'Entrata')
    .reduce((acc, t) => acc + t.importo, 0);

  const totalExpenses = monthTxs
    .filter((t) => t.tipo === 'Spesa')
    .reduce((acc, t) => acc + t.importo, 0);

  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  // Filtered by search and type
  const filteredTxs = monthTxs.filter((t) => {
    const matchSearch =
      t.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.categoria.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = typeFilter === 'all' || t.tipo === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
        aria-hidden="true" 
      />

      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-10 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-100/80 text-sky-700">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Dettaglio {monthName} {year}
              </h3>
              <p className="text-xs text-slate-500">
                {monthTxs.length} transazioni registrate in questo mese
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick Month Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 pb-4 bg-slate-50/60 border-b border-slate-100 text-xs">
          <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs">
            <span className="text-slate-500 block mb-0.5">Entrate Mese</span>
            <span className="text-base font-bold text-emerald-600">
              €{totalIncome.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-rose-100 shadow-2xs">
            <span className="text-slate-500 block mb-0.5">Uscite Mese</span>
            <span className="text-base font-bold text-rose-600">
              €{totalExpenses.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-sky-100 shadow-2xs">
            <span className="text-slate-500 block mb-0.5">Risparmio Netto</span>
            <span className={`text-base font-bold ${netSavings >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {netSavings >= 0 ? '+' : ''}€{netSavings.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
            <span className="text-slate-500 block mb-0.5">Tasso Risparmio</span>
            <span className="text-base font-bold text-indigo-600">
              {savingsRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 py-3 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca nome o categoria..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                typeFilter === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tutte ({monthTxs.length})
            </button>
            <button
              onClick={() => setTypeFilter('Entrata')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                typeFilter === 'Entrata'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Entrate
            </button>
            <button
              onClick={() => setTypeFilter('Spesa')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                typeFilter === 'Spesa'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              Uscite
            </button>
          </div>
        </div>

        {/* Transactions List */}
        <div className="p-6 overflow-y-auto flex-1 divide-y divide-slate-100">
          {filteredTxs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <Receipt size={32} className="mx-auto mb-2 text-slate-300 stroke-1" />
              <p className="font-medium text-slate-600">Nessuna transazione trovata</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {monthTxs.length === 0
                  ? 'Nessun movimento registrato per questo mese.'
                  : 'Nessun risultato per i filtri selezionati.'}
              </p>
            </div>
          ) : (
            filteredTxs.map((t) => {
              const isIncome = t.tipo === 'Entrata';
              let formattedDate = '';
              try {
                formattedDate = format(new Date(t.data), 'd MMMM yyyy', { locale: it });
              } catch {
                formattedDate = t.data;
              }

              return (
                <div
                  key={t.id}
                  className="py-3 flex items-center justify-between hover:bg-slate-50/70 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-xl ${
                        isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      {isIncome ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-800 truncate">{t.nome}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium text-slate-600">
                          {t.categoria}
                        </span>
                        <span>•</span>
                        <span>{formattedDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-3">
                    <span
                      className={`font-bold text-sm ${
                        isIncome ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {isIncome ? '+' : '-'}€{t.importo.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="block text-[10px] text-slate-400 uppercase font-medium">
                      {t.tipo}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Visualizzate <strong className="text-slate-800">{filteredTxs.length}</strong> di {monthTxs.length} transazioni
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
