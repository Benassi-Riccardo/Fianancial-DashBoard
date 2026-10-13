// Dashboard v2 - Transaction Modal + Google Sheets Write
import React, { useState } from 'react';
import { KpiCards } from '@/components/dashboard/KpiCards';
import { BudgetChart } from '@/components/dashboard/BudgetChart';
import { ExpenseDonut } from '@/components/dashboard/ExpenseDonut';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useFinanceStore } from '@/store/useFinanceStore';
import { Plus, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function DashboardPage() {
  const { transactions, settings, selectedMonth, selectedYear, setSelectedMonth, createTransaction } = useFinanceStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('');
  const [importo, setImporto] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [tipo, setTipo] = useState<'Spesa' | 'Entrata' | 'Risparmio'>('Spesa');

  const mesi = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setFormError(null);
    if (settings.categorie.length > 0 && !categoria) {
      setCategoria(settings.categorie[0].nome);
    }
  };

  const handleCategoryChange = (catName: string) => {
    setCategoria(catName);
    const catObj = settings.categorie.find(c => c.nome === catName);
    if (catObj) {
      if (catObj.tipo === 'Entrata') setTipo('Entrata');
      else setTipo('Spesa');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const val = parseFloat(importo);
    if (isNaN(val) || val <= 0) {
      setFormError('Inserisci un importo valido e maggiore di 0.');
      return;
    }

    const currentCat = categoria || settings.categorie[0]?.nome || '';
    if (!currentCat) {
      setFormError('Seleziona una categoria.');
      return;
    }

    try {
      setIsSubmitting(true);
      await createTransaction({
        nome: nome.trim() || currentCat,
        categoria: currentCat,
        importo: val,
        data: data || new Date().toISOString(),
        tipo
      });
      setIsModalOpen(false);
      setNome('');
      setImporto('');
    } catch (err: any) {
      setFormError(err.message || 'Errore durante il salvataggio della transazione');
    } finally {
      setIsSubmitting(false);
    }
  };

  const recentTransactions = [...transactions]
    .filter(t => {
      const d = new Date(t.data);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    })
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 5);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Panoramica</h2>
          <p className="text-slate-500 mt-1">Bentornato! Ecco il riepilogo delle tue finanze.</p>
        </div>
        <div className="flex items-center space-x-4">
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-sky-500 focus:border-sky-500 block px-4 py-2.5 shadow-sm outline-none"
          >
            {mesi.map((mese, idx) => (
              <option key={idx} value={idx}>{mese}</option>
            ))}
          </select>
          <button 
            onClick={handleOpenModal}
            className="flex items-center space-x-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-sky-500/20"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Nuova Transazione</span>
          </button>
        </div>
      </div>

      <KpiCards />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetChart />
        <ExpenseDonut />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ultimi Movimenti</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg border-y border-l border-slate-100">Nome</th>
                  <th className="px-4 py-3 border-y border-slate-100">Categoria</th>
                  <th className="px-4 py-3 border-y border-slate-100">Data</th>
                  <th className="px-4 py-3 text-right rounded-r-lg border-y border-r border-slate-100">Importo</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx) => {
                  const category = settings.categorie.find(c => c.nome === tx.categoria);
                  const isPositive = tx.tipo === 'Entrata';
                  
                  return (
                    <tr key={tx.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 font-medium text-slate-900">{tx.nome}</td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                          <span>{category?.emoji || '📌'}</span>
                          <span>{tx.categoria}</span>
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-500">
                        {format(new Date(tx.data), 'dd MMM yyyy', { locale: it })}
                      </td>
                      <td className={`px-4 py-4 text-right font-semibold ${isPositive ? 'text-sky-600' : 'text-slate-900'}`}>
                        {isPositive ? '+' : '-'}€{tx.importo.toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
                {recentTransactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      Nessun movimento recente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* Modal Nuova Transazione */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold text-slate-900">Nuova Transazione</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm p-3 rounded-xl">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrizione (Opzionale)</label>
                <input 
                  type="text" 
                  placeholder="Es. Spesa al supermercato"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Categoria *</label>
                <select
                  value={categoria || settings.categorie[0]?.nome || ''}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  required
                >
                  {settings.categorie.map((cat, i) => (
                    <option key={i} value={cat.nome}>
                      {cat.emoji} {cat.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Importo (€) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    value={importo}
                    onChange={(e) => setImporto(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  >
                    <option value="Spesa">Uscita (Spesa)</option>
                    <option value="Entrata">Entrata</option>
                    <option value="Risparmio">Risparmio</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data *</label>
                <input 
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  required
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold shadow-lg shadow-sky-500/20 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Salvataggio...</span>
                    </>
                  ) : (
                    <span>Salva Transazione</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

