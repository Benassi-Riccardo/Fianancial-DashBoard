import React, { useState, useEffect } from 'react';
import { useFinanceStore } from '@/store/useFinanceStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Save, Plus, Trash2, X, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { ConfigCategory, TransactionType } from '@/types/finance';

const QUICK_EMOJIS = [
  '💰', '💵', '🏠', '🛒', '📺', '🚗', '⛽', '🍽️', '🍕', '☕',
  '🎉', '💊', '🛍️', '🏦', '🏋️', '✈️', '💡', '📱', '🎓', '💻'
];

export default function SettingsPage() {
  const { settings, updateSettings } = useFinanceStore();

  // Local form state
  const [liquiditaIniziale, setLiquiditaIniziale] = useState<number | string>(settings.liquiditaIniziale);
  const [budgetMensile, setBudgetMensile] = useState<number | string>(settings.budgetMensile);
  const [categories, setCategories] = useState<ConfigCategory[]>(settings.categorie || []);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatTipo, setNewCatTipo] = useState<TransactionType>('Spesa');
  const [newCatEmoji, setNewCatEmoji] = useState('🏷️');
  const [modalError, setModalError] = useState<string | null>(null);

  // Status & feedback state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync state when store settings change (e.g. on load)
  useEffect(() => {
    setLiquiditaIniziale(settings.liquiditaIniziale);
    setBudgetMensile(settings.budgetMensile);
    setCategories(settings.categorie || []);
  }, [settings]);

  // Check if there are unsaved changes
  const hasChanges = 
    Number(liquiditaIniziale) !== settings.liquiditaIniziale ||
    Number(budgetMensile) !== settings.budgetMensile ||
    JSON.stringify(categories) !== JSON.stringify(settings.categorie);

  const handleOpenModal = () => {
    setNewCatName('');
    setNewCatTipo('Spesa');
    setNewCatEmoji('🏷️');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const trimmedName = newCatName.trim();
    if (!trimmedName) {
      setModalError('Inserisci un nome per la categoria.');
      return;
    }

    const exists = categories.some(
      (c) => c.nome.toLowerCase() === trimmedName.toLowerCase()
    );
    if (exists) {
      setModalError('Esiste già una categoria con questo nome.');
      return;
    }

    const newCategory: ConfigCategory = {
      nome: trimmedName,
      tipo: newCatTipo,
      emoji: newCatEmoji || '📌',
    };

    setCategories([...categories, newCategory]);
    setIsModalOpen(false);
    setSaveSuccess(null);
  };

  const handleDeleteCategory = (idxToDelete: number) => {
    if (categories.length <= 1) {
      setSaveError('Devi mantenere almeno una categoria.');
      return;
    }
    setCategories(categories.filter((_, idx) => idx !== idxToDelete));
    setSaveSuccess(null);
  };

  const handleSave = async () => {
    setSaveError(null);
    setSaveSuccess(null);

    const parsedLiquidita = parseFloat(String(liquiditaIniziale));
    const parsedBudget = parseFloat(String(budgetMensile));

    if (isNaN(parsedLiquidita)) {
      setSaveError('La liquidità iniziale deve essere un valore numerico valido.');
      return;
    }

    if (isNaN(parsedBudget) || parsedBudget < 0) {
      setSaveError('Il budget mensile deve essere un numero maggiore o uguale a 0.');
      return;
    }

    if (categories.length === 0) {
      setSaveError('Devi configurare almeno una categoria.');
      return;
    }

    try {
      setIsSaving(true);
      await updateSettings({
        liquiditaIniziale: parsedLiquidita,
        budgetMensile: parsedBudget,
        categorie: categories,
      });
      setSaveSuccess('Impostazioni salvate con successo!');
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Errore durante il salvataggio delle impostazioni.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Impostazioni</h2>
            {hasChanges && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200 animate-pulse">
                Modifiche non salvate
              </span>
            )}
          </div>
          <p className="text-slate-500 mt-1">Configura le categorie, i budget e il capitale iniziale.</p>
        </div>

        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center space-x-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-sky-500/25 disabled:opacity-60 cursor-pointer"
        >
          {isSaving ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Salvataggio...</span>
            </>
          ) : (
            <>
              <Save size={18} />
              <span>Salva Modifiche</span>
            </>
          )}
        </button>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          <p className="text-sm font-medium">{saveSuccess}</p>
        </div>
      )}

      {saveError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 shadow-sm animate-in fade-in duration-200">
          <AlertCircle size={20} className="text-rose-600 shrink-0" />
          <p className="text-sm font-medium">{saveError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Generali */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurazione Iniziale</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Liquidità Inizio Anno (€)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium">€</span>
                  <input 
                    type="number" 
                    step="0.01"
                    value={liquiditaIniziale}
                    onChange={(e) => {
                      setLiquiditaIniziale(e.target.value);
                      setSaveSuccess(null);
                    }}
                    placeholder="5000"
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-8 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 transition-all text-sm font-medium"
                  />
                </div>
                <p className="text-xs text-slate-500">Il valore di partenza dei tuoi conti correnti a Gennaio (utilizzato per il calcolo del Net Worth).</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Obiettivo Budget Mensile (€)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium">€</span>
                  <input 
                    type="number" 
                    step="0.01"
                    value={budgetMensile}
                    onChange={(e) => {
                      setBudgetMensile(e.target.value);
                      setSaveSuccess(null);
                    }}
                    placeholder="1500"
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-8 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 transition-all text-sm font-medium"
                  />
                </div>
                <p className="text-xs text-slate-500">Soglia massima desiderata di spesa per un singolo mese (visibile nel grafico Avanzamento Budget).</p>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Categorie */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle>Gestione Categorie</CardTitle>
                <p className="text-xs text-slate-500 mt-1">{categories.length} categorie attive</p>
              </div>
              <button 
                onClick={handleOpenModal}
                className="flex items-center space-x-1.5 text-xs font-semibold bg-sky-50 text-sky-600 hover:bg-sky-100 border border-sky-200 px-3 py-2 rounded-xl transition-all cursor-pointer"
              >
                <Plus size={16} />
                <span>Nuova Categoria</span>
              </button>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto pr-1">
                {categories.map((cat, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between group hover:bg-slate-50/60 px-2 rounded-xl transition-colors">
                    <div className="flex items-center space-x-3.5">
                      <span className="text-xl bg-slate-100 w-10 h-10 flex items-center justify-center rounded-xl shadow-xs">
                        {cat.emoji}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{cat.nome}</p>
                        <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-md mt-0.5 ${
                          cat.tipo === 'Entrata' 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                            : cat.tipo === 'Risparmio'
                            ? 'bg-sky-50 text-sky-600 border border-sky-100'
                            : 'bg-rose-50 text-rose-600 border border-rose-100'
                        }`}>
                          {cat.tipo}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteCategory(idx)}
                      title="Elimina categoria"
                      className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-lg opacity-80 group-hover:opacity-100 transition-all cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {categories.length === 0 && (
                  <p className="text-center py-8 text-sm text-slate-400">Nessuna categoria presente. Aggiungine una!</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Modal Nuova Categoria */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold text-slate-900">Nuova Categoria</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nome Categoria *
                </label>
                <input 
                  type="text" 
                  placeholder="Es. Palestra, Ristoranti, ecc."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 text-sm"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tipo Categoria *
                </label>
                <select
                  value={newCatTipo}
                  onChange={(e) => setNewCatTipo(e.target.value as TransactionType)}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 text-sm cursor-pointer"
                >
                  <option value="Spesa">Uscita (Spesa)</option>
                  <option value="Entrata">Entrata</option>
                  <option value="Risparmio">Risparmio</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Icona / Emoji
                </label>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl bg-slate-100 w-11 h-11 flex items-center justify-center rounded-xl border border-slate-200">
                    {newCatEmoji}
                  </span>
                  <input 
                    type="text"
                    value={newCatEmoji}
                    onChange={(e) => setNewCatEmoji(e.target.value)}
                    maxLength={4}
                    placeholder="Emoji"
                    className="w-24 bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-center text-lg focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
                  />
                  <span className="text-xs text-slate-400">oppure seleziona in basso:</span>
                </div>

                <div className="grid grid-cols-10 gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                  {QUICK_EMOJIS.map((emoji, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setNewCatEmoji(emoji)}
                      className={`text-lg p-1.5 rounded-lg hover:bg-white hover:shadow-xs transition-all cursor-pointer ${
                        newCatEmoji === emoji ? 'bg-sky-100 ring-2 ring-sky-400' : ''
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold shadow-lg shadow-sky-500/20 transition-colors cursor-pointer"
                >
                  Aggiungi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
