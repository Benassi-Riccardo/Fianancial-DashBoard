import { SinkingFund, Transaction } from '@/types/finance';

/**
 * Checks if a transaction represents a deposit into a sinking fund
 */
export function isSinkingFundDeposit(t: Transaction): boolean {
  return t.tipo === 'Spesa' && (t.categoria === 'Accantonamenti' || t.nome.startsWith('Accantonamento:'));
}

/**
 * Checks if a transaction represents a withdrawal from a sinking fund
 */
export function isSinkingFundWithdrawal(t: Transaction): boolean {
  return t.tipo === 'Entrata' && (t.categoria === 'Accantonamenti' || t.nome.startsWith('Prelievo:'));
}

export type SinkingFundBadgeStatus = 'Completed' | 'On Track' | 'Behind';

export interface SinkingFundStatusInfo {
  status: SinkingFundBadgeStatus;
  label: string;
  badgeClass: string;
  dotClass: string;
}

export interface SinkingFundMetrics {
  totalSaved: number;
  totalGoal: number;
  overallPercentage: number;
  monthlyTotalCommitment: number;
  activeCount: number;
  completedCount: number;
}

/**
 * Calculates remaining months from now to the target date.
 * Returns 0 if in the past, 1 if in the current month, or the positive month count.
 */
export function getRemainingMonths(targetDateStr: string | Date | null | undefined): number {
  if (!targetDateStr) return 1;
  const target = new Date(targetDateStr);
  if (isNaN(target.getTime())) return 1;

  const now = new Date();
  const yearDiff = target.getFullYear() - now.getFullYear();
  const monthDiff = target.getMonth() - now.getMonth();
  const totalMonths = yearDiff * 12 + monthDiff;

  return totalMonths <= 0 ? 0 : totalMonths;
}

/**
 * Calculates the required monthly contribution to reach the goal by the deadline:
 * (targetAmount - currentAmount) / remainingMonths
 */
export function getRequiredMonthlyContribution(
  targetAmount: number,
  currentAmount: number,
  targetDateStr: string | Date | null | undefined
): number {
  const remaining = Math.max(0, targetAmount - currentAmount);
  if (remaining <= 0) return 0;

  const remainingMonths = getRemainingMonths(targetDateStr);
  if (remainingMonths <= 0) return remaining; // Overdue or due this month

  return remaining / remainingMonths;
}

/**
 * Returns the effective monthly commitment for a given fund.
 * If user set a manual monthlyAllocation > 0, returns that;
 * otherwise dynamically calculates the required monthly contribution.
 */
export function getMonthlyCommitment(fund: SinkingFund): number {
  const currentAmount = Math.max(0, (fund.risparmioMensile || 0) - (fund.spese || 0));
  if (currentAmount >= fund.obiettivo) return 0; // Completed, no commitment

  if (fund.monthlyAllocation && fund.monthlyAllocation > 0) {
    return fund.monthlyAllocation;
  }

  return getRequiredMonthlyContribution(fund.obiettivo, currentAmount, fund.dataScadenza);
}

/**
 * Automatically computes the status badge for a sinking fund:
 * - Completed: currentAmount >= targetAmount
 * - On Track: current balance meets or exceeds the required cumulative pace or monthly allocation is sufficient
 * - Behind: behind the required monthly pace
 */
export function getSinkingFundStatus(fund: SinkingFund): SinkingFundStatusInfo {
  const currentAmount = Math.max(0, (fund.risparmioMensile || 0) - (fund.spese || 0));
  const targetAmount = fund.obiettivo;

  // 1. Completed
  if (currentAmount >= targetAmount) {
    return {
      status: 'Completed',
      label: 'Completato',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotClass: 'bg-emerald-500',
    };
  }

  const remainingMonths = getRemainingMonths(fund.dataScadenza);

  // 2. If target is in the past and goal is not reached -> Behind
  if (remainingMonths === 0) {
    return {
      status: 'Behind',
      label: 'In ritardo',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      dotClass: 'bg-rose-500',
    };
  }

  const reqMonthly = getRequiredMonthlyContribution(targetAmount, currentAmount, fund.dataScadenza);
  const plannedMonthly = fund.monthlyAllocation || 0;

  // 3. If explicit planned allocation is provided:
  if (plannedMonthly > 0) {
    if (plannedMonthly >= reqMonthly * 0.95) {
      return {
        status: 'On Track',
        label: 'In linea',
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
        dotClass: 'bg-sky-500',
      };
    } else {
      return {
        status: 'Behind',
        label: 'In ritardo',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        dotClass: 'bg-amber-500',
      };
    }
  }

  // 4. If no explicit planned allocation: compare current savings to remaining timeline
  const progressRatio = currentAmount / targetAmount;
  const expectedMinProgress = 1 / Math.max(1, remainingMonths + 1);

  if (progressRatio >= expectedMinProgress || currentAmount > 0) {
    return {
      status: 'On Track',
      label: 'In linea',
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
      dotClass: 'bg-sky-500',
    };
  }

  return {
    status: 'Behind',
    label: 'In ritardo',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
  };
}

/**
 * Aggregates overall sinking fund metrics for the top summary bar
 */
export function calculateSinkingMetrics(funds: SinkingFund[]): SinkingFundMetrics {
  let totalSaved = 0;
  let totalGoal = 0;
  let monthlyTotalCommitment = 0;
  let activeCount = 0;
  let completedCount = 0;

  for (const fund of funds) {
    const current = Math.max(0, (fund.risparmioMensile || 0) - (fund.spese || 0));
    totalSaved += current;
    totalGoal += fund.obiettivo || 0;

    if (current >= fund.obiettivo) {
      completedCount++;
    } else {
      activeCount++;
      monthlyTotalCommitment += getMonthlyCommitment(fund);
    }
  }

  const overallPercentage = totalGoal > 0 ? Math.min(100, (totalSaved / totalGoal) * 100) : 0;

  return {
    totalSaved,
    totalGoal,
    overallPercentage,
    monthlyTotalCommitment,
    activeCount,
    completedCount,
  };
}
