import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { PieChart as PieIcon, Layers, ChevronDown, ChevronUp } from 'lucide-react';

export interface CategoryExpense {
  nome: string;
  emoji: string;
  importo: number;
  percentuale: number;
  count: number;
}

interface CategoryBreakdownProps {
  categories: CategoryExpense[];
  totalExpenses: number;
  selectedYear: number;
}

export function CategoryBreakdown({
  categories,
  totalExpenses,
  selectedYear,
}: CategoryBreakdownProps) {
  const [showAll, setShowAll] = useState(false);
  const displayLimit = showAll ? categories.length : 6;
  const displayedCategories = categories.slice(0, displayLimit);

  // Palette of vibrant colors for the top category bars
  const barColors = [
    'from-sky-500 to-blue-600',
    'from-indigo-500 to-indigo-700',
    'from-purple-500 to-purple-700',
    'from-amber-500 to-orange-600',
    'from-emerald-500 to-teal-600',
    'from-rose-500 to-pink-600',
    'from-slate-400 to-slate-600',
  ];

  return (
    <Card className="border border-blue-100/70 shadow-xs flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
            <PieIcon size={18} className="text-sky-600" />
            Top Categorie di Spesa ({selectedYear})
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Ripartizione percentuale delle uscite annuali
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80">
          <Layers size={13} className="text-slate-400" />
          <span>{categories.length} categorie</span>
        </div>
      </CardHeader>

      <CardContent className="p-6 flex-1 flex flex-col justify-between">
        {categories.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm flex-1 flex flex-col items-center justify-center">
            <Layers size={36} className="text-slate-300 mb-2 stroke-1" />
            <p className="font-medium text-slate-500">Nessuna spesa registrata per il {selectedYear}</p>
            <p className="text-xs text-slate-400 mt-1">Le categorie appariranno quando registrerai uscite.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedCategories.map((cat, idx) => {
              const gradient = barColors[idx % barColors.length];

              return (
                <div key={cat.nome} className="group">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base leading-none">{cat.emoji}</span>
                      <span className="font-semibold text-slate-800 truncate">
                        {cat.nome}
                      </span>
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                        {cat.count} tx
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 pl-2">
                      <span className="font-bold text-slate-900">
                        €{cat.importo.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-md min-w-[46px] text-right">
                        {cat.percentuale.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-500 ease-out`}
                      style={{ width: `${Math.min(100, Math.max(2, cat.percentuale))}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {categories.length > 6 && (
              <div className="pt-2 text-center">
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:bg-sky-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  {showAll ? (
                    <>
                      <ChevronUp size={14} />
                      Mostra solo le prime 6
                    </>
                  ) : (
                    <>
                      <ChevronDown size={14} />
                      Vedi tutte le altre ({categories.length - 6})
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {totalExpenses > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-600">
            <span>Totale Annuale Analizzato:</span>
            <span className="font-bold text-slate-900 text-sm">
              €{totalExpenses.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
