import React, { useState } from 'react';
import { useFinanceStore } from '@/store/useFinanceStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { 
  Plus, 
  Target, 
  CheckCircle2, 
  TrendingUp, 
  AlertTriangle, 
  PiggyBank, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  Wallet, 
  X, 
  Loader2, 
  Trash2,
  Clock,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { SinkingFund } from '@/types/finance';
import { 
  getRemainingMonths, 
  getRequiredMonthlyContribution, 
  getMonthlyCommitment, 
  getSinkingFundStatus, 
  calculateSinkingMetrics 
} from '@/lib/sinkingFunds';

export default function SinkingFundsPage() {
  const { sinkingFunds, createSinkingFund, deleteSinkingFund, transactSinkingFund } = useFinanceStore();

  // Modal states
  const [isNewFundModalOpen, setIsNewFundModalOpen] = useState(false);
  const [selectedFundForAction, setSelectedFundForAction] = useState<SinkingFund | null>(null);
  const [actionType, setActionType] = useState<'deposit' | 'withdraw'>('deposit');
  const [actionAmount, setActionAmount] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // New Fund Form state
  const [newAttivita, setNewAttivita] = useState('');
  const [newObiettivo, setNewObiettivo] = useState('');
  const [newDataScadenza, setNewDataScadenza] = useState('');
  const [newInitialDeposit, setNewInitialDeposit] = useState('');
  const [newMonthlyAllocation, setNewMonthlyAllocation] = useState('');
  const [newFundError, setNewFundError] = useState<string | null>(null);
  const [isCreatingFund, setIsCreatingFund] = useState(false);

  // Filter state
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');

  // Overall metrics
  const metrics = calculateSinkingMetrics(sinkingFunds);

  // Quick Action Modal handlers
  const handleOpenActionModal = (fund: SinkingFund, type: 'deposit' | 'withdraw') => {
    setSelectedFundForAction(fund);
    setActionType(type);
    setActionAmount('');
    setActionError(null);
  };

  const handleCloseActionModal = () => {
    setSelectedFundForAction(null);
    setActionAmount('');
    setActionError(null);
  };

  const handleSubmitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFundForAction) return;

    setActionError(null);
    const amountVal = parseFloat(actionAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      setActionError('Inserisci un importo valido maggiore di 0.');
      return;
    }

    const currentBalance = Math.max(
      0, 
      (selectedFundForAction.risparmioMensile || 0) - (selectedFundForAction.spese || 0)
    );

    if (actionType === 'withdraw' && amountVal > currentBalance) {
      setActionError(`Fondi insufficienti. Saldo disponibile: €${currentBalance.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`);
      return;
    }

    try {
      setIsSubmittingAction(true);
      await transactSinkingFund(selectedFundForAction.id, {
        type: actionType,
        amount: amountVal,
      });
      handleCloseActionModal();
    } catch (err: any) {
      setActionError(err.message || 'Errore durante l\'operazione.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Create Fund Form handlers
  const handleOpenNewFundModal = () => {
    setNewAttivita('');
    setNewObiettivo('');
    setNewDataScadenza('');
    setNewInitialDeposit('');
    setNewMonthlyAllocation('');
    setNewFundError(null);
    setIsNewFundModalOpen(true);
  };

  const handleSubmitNewFund = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewFundError(null);

    const goalVal = parseFloat(newObiettivo);
    if (!newAttivita.trim()) {
      setNewFundError('Inserisci il nome dell\'obiettivo.');
      return;
    }

    if (isNaN(goalVal) || goalVal <= 0) {
      setNewFundError('L\'obiettivo deve essere un importo maggiore di 0.');
      return;
    }

    if (!newDataScadenza) {
      setNewFundError('Seleziona una data di scadenza prevista.');
      return;
    }

    const initialDep = parseFloat(newInitialDeposit) || 0;
    const monthlyAlloc = parseFloat(newMonthlyAllocation) || 0;

    try {
      setIsCreatingFund(true);
      await createSinkingFund({
        attivita: newAttivita.trim(),
        obiettivo: goalVal,
        dataScadenza: newDataScadenza,
        initialDeposit: initialDep,
        monthlyAllocation: monthlyAlloc,
      });
      setIsNewFundModalOpen(false);
    } catch (err: any) {
      setNewFundError(err.message || 'Errore durante la creazione del fondo.');
    } finally {
      setIsCreatingFund(false);
    }
  };

  const handleDeleteFund = async (fundId: string, name: string) => {
    if (window.confirm(`Sei sicuro di voler eliminare il fondo "${name}"?`)) {
      try {
        await deleteSinkingFund(fundId);
      } catch (err: any) {
        alert(err.message || 'Errore durante l\'eliminazione');
      }
    }
  };

  // Filtered funds
  const filteredFunds = sinkingFunds.filter((fund) => {
    const current = Math.max(0, (fund.risparmioMensile || 0) - (fund.spese || 0));
    const isCompleted = current >= fund.obiettivo;
    if (filterStatus === 'active') return !isCompleted;
    if (filterStatus === 'completed') return isCompleted;
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Sinking Funds</h2>
          <p className="text-slate-500 mt-1">Accantona regolarmente per spese previste, scadenze e grandi progetti.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleOpenNewFundModal}
            className="flex items-center space-x-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-sky-500/25 cursor-pointer"
          >
            <Plus size={20} />
            <span>Nuovo Fondo</span>
          </button>
        </div>
      </div>

      {/* Top Summary Metrics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Saved */}
        <Card className="border-blue-100/60 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Totale Risparmiato</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                €{metrics.totalSaved.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-emerald-600 font-medium mt-1">
                {metrics.completedCount} completati su {sinkingFunds.length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <PiggyBank size={24} />
            </div>
          </CardContent>
        </Card>

        {/* Total Goal */}
        <Card className="border-blue-100/60 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Obiettivo Totale</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                €{metrics.totalGoal.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Rimanenti: €{Math.max(0, metrics.totalGoal - metrics.totalSaved).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Target size={24} />
            </div>
          </CardContent>
        </Card>

        {/* Monthly Total Commitment */}
        <Card className="border-blue-100/60 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Impegno Mensile</p>
              <h3 className="text-2xl font-bold text-sky-600 mt-1">
                €{metrics.monthlyTotalCommitment.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {metrics.activeCount} fondi attivi da alimentare
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Wallet size={24} />
            </div>
          </CardContent>
        </Card>

        {/* Overall Progress */}
        <Card className="border-blue-100/60 shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Progresso Globale</p>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                {metrics.overallPercentage.toFixed(1)}%
              </span>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-500 rounded-full"
                  style={{ width: `${metrics.overallPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                <span>€{metrics.totalSaved.toLocaleString('it-IT')}</span>
                <span>€{metrics.totalGoal.toLocaleString('it-IT')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterStatus === 'all' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tutti ({sinkingFunds.length})
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterStatus === 'active' 
                ? 'bg-sky-500 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            In corso ({metrics.activeCount})
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterStatus === 'completed' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Completati ({metrics.completedCount})
          </button>
        </div>
      </div>

      {/* Sinking Funds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredFunds.map((fund) => {
          const currentAmount = Math.max(0, (fund.risparmioMensile || 0) - (fund.spese || 0));
          const targetAmount = fund.obiettivo;
          const percentage = targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : 0;
          const statusInfo = getSinkingFundStatus(fund);
          const remainingMonths = getRemainingMonths(fund.dataScadenza);
          const reqMonthly = getRequiredMonthlyContribution(targetAmount, currentAmount, fund.dataScadenza);
          const isCompleted = statusInfo.status === 'Completed';

          return (
            <Card 
              key={fund.id} 
              className={`transition-all hover:shadow-md ${
                isCompleted 
                  ? 'border-emerald-200/60 bg-emerald-50/20' 
                  : 'hover:border-sky-200'
              }`}
            >
              <CardContent className="p-6 space-y-5">
                
                {/* Header card */}
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-bold text-lg text-slate-900 truncate" title={fund.attivita}>
                      {fund.attivita}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Target size={13} className="text-slate-400 shrink-0" />
                      <span>Obiettivo: <strong className="text-slate-700">€{targetAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</strong></span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Status Badge */}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusInfo.badgeClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                      {statusInfo.status === 'Completed' && <CheckCircle2 size={13} className="shrink-0" />}
                      {statusInfo.status === 'On Track' && <TrendingUp size={13} className="shrink-0" />}
                      {statusInfo.status === 'Behind' && <AlertTriangle size={13} className="shrink-0" />}
                      <span>{statusInfo.label}</span>
                    </span>

                    <button
                      onClick={() => handleDeleteFund(fund.id, fund.attivita)}
                      title="Elimina fondo"
                      className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Progress Section */}
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline text-sm font-semibold">
                    <span className={isCompleted ? 'text-emerald-600 font-bold' : 'text-slate-900'}>
                      €{currentAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-400">/ €{targetAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                    </span>
                    <span className={`text-xs font-bold ${isCompleted ? 'text-emerald-600' : 'text-sky-600'}`}>
                      {percentage.toFixed(1)}%
                    </span>
                  </div>

                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted 
                          ? 'bg-emerald-500' 
                          : statusInfo.status === 'Behind' 
                          ? 'bg-amber-500' 
                          : 'bg-sky-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                {/* Info breakdown grid */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[11px] text-slate-400 font-medium">Quota Necessaria</p>
                    <p className="font-bold text-slate-800 mt-0.5">
                      {isCompleted ? (
                        <span className="text-emerald-600">Raggiunto!</span>
                      ) : (
                        `€${reqMonthly.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mese`
                      )}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                      <Clock size={11} /> Scadenza
                    </p>
                    <p className="font-bold text-slate-800 mt-0.5 truncate">
                      {fund.dataScadenza ? (
                        <>
                          {format(new Date(fund.dataScadenza), 'MMM yyyy', { locale: it })}
                          <span className="text-[10px] font-normal text-slate-400 ml-1">
                            ({remainingMonths} {remainingMonths === 1 ? 'mese' : 'mesi'})
                          </span>
                        </>
                      ) : (
                        'Nessuna'
                      )}
                    </p>
                  </div>
                </div>

                {/* Quick Action Buttons on Card */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleOpenActionModal(fund, 'deposit')}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200/80 transition-all cursor-pointer"
                  >
                    <Plus size={15} />
                    <span>+ Deposita</span>
                  </button>

                  <button
                    onClick={() => handleOpenActionModal(fund, 'withdraw')}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-semibold border border-slate-200 hover:border-rose-200 transition-all cursor-pointer"
                  >
                    <ArrowDownRight size={15} />
                    <span>- Preleva</span>
                  </button>
                </div>

              </CardContent>
            </Card>
          );
        })}

        {filteredFunds.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
            <PiggyBank size={40} className="mx-auto text-slate-300" />
            <h4 className="text-base font-semibold text-slate-700">Nessun fondo trovato</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Crea il tuo primo fondo di accantonamento per pianificare le spese future e mantenere le tue finanze sotto controllo.
            </p>
            <button
              onClick={handleOpenNewFundModal}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Crea Fondo Ora</span>
            </button>
          </div>
        )}
      </div>

      {/* Interactive Quick-Deposit / Withdraw Modal */}
      {selectedFundForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 space-y-5">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {actionType === 'deposit' ? 'Deposita Fondi' : 'Preleva Fondi'}
                </h3>
                <p className="text-xs text-slate-500 font-medium truncate max-w-xs">
                  {selectedFundForAction.attivita}
                </p>
              </div>
              <button
                onClick={handleCloseActionModal}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Toggle Mode inside Modal */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setActionType('deposit');
                  setActionError(null);
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  actionType === 'deposit' 
                    ? 'bg-white text-emerald-700 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                + Deposita
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionType('withdraw');
                  setActionError(null);
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  actionType === 'withdraw' 
                    ? 'bg-white text-rose-700 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                - Preleva
              </button>
            </div>

            {/* Current Fund Balance Summary */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
              <div>
                <p className="text-slate-400">Saldo Disponibile</p>
                <p className="text-base font-bold text-slate-900">
                  €{(Math.max(0, (selectedFundForAction.risparmioMensile || 0) - (selectedFundForAction.spese || 0))).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-400">Obiettivo Totale</p>
                <p className="text-sm font-semibold text-slate-600">
                  €{selectedFundForAction.obiettivo.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {actionError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitAction} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Importo da {actionType === 'deposit' ? 'depositare' : 'prelevare'} (€) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">€</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={actionAmount}
                    onChange={(e) => setActionAmount(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-8 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 text-sm font-semibold"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {/* Quick Amount Chips */}
              <div className="flex flex-wrap gap-1.5">
                {[50, 100, 200, 500].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setActionAmount(String(preset))}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
                  >
                    +€{preset}
                  </button>
                ))}
                {actionType === 'withdraw' && (
                  <button
                    type="button"
                    onClick={() => {
                      const cur = Math.max(0, (selectedFundForAction.risparmioMensile || 0) - (selectedFundForAction.spese || 0));
                      setActionAmount(String(cur));
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium border border-rose-200 transition-colors cursor-pointer ml-auto"
                  >
                    Tutto il saldo
                  </button>
                )}
              </div>

              {/* Live Preview */}
              {parseFloat(actionAmount) > 0 && (
                <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-100 text-xs flex justify-between items-center text-sky-800">
                  <span>Nuovo saldo previsto:</span>
                  <strong className="text-sm">
                    €{Math.max(
                      0,
                      (Math.max(0, (selectedFundForAction.risparmioMensile || 0) - (selectedFundForAction.spese || 0))) + 
                      (actionType === 'deposit' ? parseFloat(actionAmount) : -parseFloat(actionAmount))
                    ).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              )}

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseActionModal}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction}
                  className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-60 ${
                    actionType === 'deposit'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  }`}
                >
                  {isSubmittingAction ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Salvataggio...</span>
                    </>
                  ) : (
                    <span>{actionType === 'deposit' ? 'Conferma Deposito' : 'Conferma Prelievo'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Nuovo Fondo Modal */}
      {isNewFundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Nuovo Fondo di Accantonamento</h3>
              <button
                onClick={() => setIsNewFundModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {newFundError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{newFundError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitNewFund} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nome Fondo / Progetto *
                </label>
                <input
                  type="text"
                  placeholder="Es. Assicurazione Auto, Vacanze Estive"
                  value={newAttivita}
                  onChange={(e) => setNewAttivita(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 text-sm"
                  autoFocus
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Obiettivo Totale (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="1200.00"
                    value={newObiettivo}
                    onChange={(e) => setNewObiettivo(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Scadenza Prevista *
                  </label>
                  <input
                    type="date"
                    value={newDataScadenza}
                    onChange={(e) => setNewDataScadenza(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 text-sm cursor-pointer"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Versamento Iniziale (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newInitialDeposit}
                    onChange={(e) => setNewInitialDeposit(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Allocazione Mensile (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Opzionale"
                    value={newMonthlyAllocation}
                    onChange={(e) => setNewMonthlyAllocation(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 text-sm"
                  />
                </div>
              </div>

              {/* Dynamic Helper Hint */}
              {parseFloat(newObiettivo) > 0 && newDataScadenza && (
                <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-sky-800 text-[11px] flex items-start gap-2">
                  <Sparkles size={16} className="text-sky-500 shrink-0 mt-0.5" />
                  <div>
                    <span>
                      Quota mensile calcolata per raggiungere l'obiettivo:{' '}
                      <strong>
                        €{getRequiredMonthlyContribution(
                          parseFloat(newObiettivo),
                          parseFloat(newInitialDeposit) || 0,
                          newDataScadenza
                        ).toFixed(2)} / mese
                      </strong>{' '}
                      ({getRemainingMonths(newDataScadenza)} mesi rimasti).
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsNewFundModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isCreatingFund}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition-all cursor-pointer disabled:opacity-60"
                >
                  {isCreatingFund ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Creazione in corso...</span>
                    </>
                  ) : (
                    <span>Crea Fondo</span>
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
