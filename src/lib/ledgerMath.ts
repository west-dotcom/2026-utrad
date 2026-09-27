import { Transaction, DailySnapshot, BotStrategyStats, LedgerSummary } from '../types';

/**
 * Calculates running capital and loan balances sequentially across all transactions.
 * Rules based on 10-year trading bot business ledger model:
 * - Capital = starting capital + net deposits - withdrawals + cumulative realized PnL - gas/fees +- loan adjustments
 * - Loan Balance = running balance of principal + interest paid/accrued
 */
export function calculateLedgerBalances(
  transactions: Transaction[],
  initialStartingCapital: number = 0,
  initialLoanBalance: number = 0
): Transaction[] {
  // Sort chronologically ascending
  const sorted = [...transactions].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    // If same date, Deposits and Loans come before trades and withdrawals
    const orderPriority: Record<string, number> = {
      'Deposit': 1,
      'Loan In': 2,
      'Trade PnL': 3,
      'Gas': 4,
      'Interest': 5,
      'Loan Out': 6,
      'Withdrawal': 7,
    };
    return (orderPriority[a.type] || 5) - (orderPriority[b.type] || 5);
  });

  let runningCap = initialStartingCapital;
  let runningLoan = initialLoanBalance;

  return sorted.map((tx) => {
    switch (tx.type) {
      case 'Deposit':
        runningCap += Math.abs(tx.amount);
        break;
      case 'Withdrawal':
        runningCap -= Math.abs(tx.amount);
        break;
      case 'Trade PnL':
        runningCap += tx.amount; // positive for profit, negative for loss
        break;
      case 'Loan In':
        // Loan proceeds injected into trading balance
        runningCap += Math.abs(tx.amount);
        runningLoan += Math.abs(tx.amount);
        break;
      case 'Loan Out':
        // Loan principal repayment from trading balance
        runningCap -= Math.abs(tx.amount);
        runningLoan = Math.max(0, runningLoan - Math.abs(tx.amount));
        break;
      case 'Gas':
        // Legacy gas type if present
        runningCap -= Math.abs(tx.amount);
        break;
      case 'Interest':
        // Interest paid directly from trading capital
        runningCap -= Math.abs(tx.amount);
        break;
    }

    return {
      ...tx,
      runningCapital: Math.round(runningCap * 100) / 100,
      loanBalance: Math.round(runningLoan * 100) / 100,
    };
  });
}

/**
 * Builds the Daily Snapshot series aggregated by day.
 * Formula: Daily return = (end-of-day capital - start-of-day capital - net inflows) / start-of-day capital
 */
export function buildDailySnapshots(
  transactionsWithBalances: Transaction[],
  initialStartingCapital: number = 0,
  dailyProfitTarget: number = 0
): DailySnapshot[] {
  if (transactionsWithBalances.length === 0) return [];

  // Group by date
  const byDate = new Map<string, Transaction[]>();
  for (const tx of transactionsWithBalances) {
    const list = byDate.get(tx.date) || [];
    list.push(tx);
    byDate.set(tx.date, list);
  }

  const sortedDates = Array.from(byDate.keys()).sort();
  const snapshots: DailySnapshot[] = [];

  let previousEndCapital = initialStartingCapital;
  let cumPnL = 0;

  for (let i = 0; i < sortedDates.length; i++) {
    const date = sortedDates[i];
    const dayTxs = byDate.get(date)!;

    let deposits = 0;
    let withdrawals = 0;
    let realizedPnL = 0;
    let interest = 0;

    for (const tx of dayTxs) {
      if (tx.type === 'Deposit') deposits += Math.abs(tx.amount);
      else if (tx.type === 'Withdrawal') withdrawals += Math.abs(tx.amount);
      else if (tx.type === 'Trade PnL') realizedPnL += tx.amount;
      else if (tx.type === 'Interest') interest += Math.abs(tx.amount);
      else if (tx.type === 'Loan In') deposits += Math.abs(tx.amount);
      else if (tx.type === 'Loan Out') withdrawals += Math.abs(tx.amount);
    }

    const netInflows = deposits - withdrawals;
    const startCapital = i === 0 ? (dayTxs[0].runningCapital! - (realizedPnL - interest + netInflows)) : previousEndCapital;
    const lastTxOfDay = dayTxs[dayTxs.length - 1];
    const endCapital = lastTxOfDay.runningCapital ?? previousEndCapital;
    const endLoan = lastTxOfDay.loanBalance ?? 0;

    // Daily return formula: (end-of-day - start-of-day - net inflows) / start-of-day
    let dailyReturnPct = 0;
    if (startCapital > 0) {
      const netGain = endCapital - startCapital - netInflows;
      dailyReturnPct = (netGain / startCapital) * 100;
    }

    cumPnL += realizedPnL;

    const targetMet = dailyProfitTarget > 0 ? realizedPnL >= dailyProfitTarget : undefined;

    snapshots.push({
      date,
      startCapital: Math.round(startCapital * 100) / 100,
      netInflows: Math.round(netInflows * 100) / 100,
      realizedPnL: Math.round(realizedPnL * 100) / 100,
      gasFees: 0,
      interest: Math.round(interest * 100) / 100,
      endCapital: Math.round(endCapital * 100) / 100,
      dailyReturnPct: Math.round(dailyReturnPct * 1000) / 1000,
      cumulativePnL: Math.round(cumPnL * 100) / 100,
      loanBalance: Math.round(endLoan * 100) / 100,
      transactionCount: dayTxs.length,
      targetMet,
    });

    previousEndCapital = endCapital;
  }

  return snapshots;
}

/**
 * Computes high-level business ledger KPI metrics
 */
export function calculateLedgerSummary(
  transactions: Transaction[],
  snapshots: DailySnapshot[],
  dailyProfitTarget: number = 0
): LedgerSummary {
  let totalDeposits = 0;
  let totalWithdrawals = 0;
  let cumulativePnL = 0;
  let totalGasFees = 0;
  let totalInterestPaid = 0;

  for (const tx of transactions) {
    if (tx.type === 'Deposit' || tx.type === 'Loan In') {
      totalDeposits += Math.abs(tx.amount);
    } else if (tx.type === 'Withdrawal' || tx.type === 'Loan Out') {
      totalWithdrawals += Math.abs(tx.amount);
    } else if (tx.type === 'Trade PnL') {
      cumulativePnL += tx.amount;
    } else if (tx.type === 'Interest') {
      totalInterestPaid += Math.abs(tx.amount);
    }
  }

  const netDeposits = totalDeposits - totalWithdrawals;
  const lastTx = transactions.length > 0 ? transactions[transactions.length - 1] : null;
  const currentCapital = lastTx?.runningCapital ?? 0;
  const startingCapital = snapshots.length > 0 ? snapshots[0].startCapital : 0;
  const currentLoanBalance = lastTx?.loanBalance ?? 0;

  const gasPercentOfProfit = cumulativePnL > 0 ? (totalGasFees / cumulativePnL) * 100 : 0;
  const loanToCapitalRatio = currentCapital > 0 ? (currentLoanBalance / currentCapital) * 100 : 0;
  const cumulativePnLPct = startingCapital > 0 ? (cumulativePnL / startingCapital) * 100 : 0;

  // Daily statistics
  const returnPcts = snapshots.map((s) => s.dailyReturnPct);
  const totalDays = returnPcts.length;
  const winDays = returnPcts.filter((r) => r > 0).length;
  const dayWinRate = totalDays > 0 ? (winDays / totalDays) * 100 : 0;

  const targetMetDaysCount = snapshots.filter((s) => s.targetMet).length;
  const targetMetRate = totalDays > 0 ? (targetMetDaysCount / totalDays) * 100 : 0;

  const dailyReturnAvg = totalDays > 0 ? returnPcts.reduce((a, b) => a + b, 0) / totalDays : 0;

  // Standard deviation of daily returns
  const variance =
    totalDays > 1
      ? returnPcts.reduce((sum, r) => sum + Math.pow(r - dailyReturnAvg, 2), 0) / (totalDays - 1)
      : 0;
  const dailyReturnStdDev = Math.sqrt(variance);

  // Annualized Sharpe ratio (assuming 365 trading days for crypto, 0 risk-free)
  const annualizedReturn = dailyReturnAvg * 365;
  const annualizedStdDev = dailyReturnStdDev * Math.sqrt(365);
  const sharpeRatio = annualizedStdDev > 0 ? annualizedReturn / annualizedStdDev : 0;

  return {
    currentCapital: Math.round(currentCapital * 100) / 100,
    startingCapital: Math.round(startingCapital * 100) / 100,
    cumulativePnL: Math.round(cumulativePnL * 100) / 100,
    cumulativePnLPct: Math.round(cumulativePnLPct * 100) / 100,
    totalDeposits: Math.round(totalDeposits * 100) / 100,
    totalWithdrawals: Math.round(totalWithdrawals * 100) / 100,
    netDeposits: Math.round(netDeposits * 100) / 100,
    totalGasFees: 0,
    gasPercentOfProfit: 0,
    currentLoanBalance: Math.round(currentLoanBalance * 100) / 100,
    loanToCapitalRatio: Math.round(loanToCapitalRatio * 10) / 10,
    totalInterestPaid: Math.round(totalInterestPaid * 100) / 100,
    dailyReturnAvg: Math.round(dailyReturnAvg * 100) / 100,
    dailyReturnStdDev: Math.round(dailyReturnStdDev * 100) / 100,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    winDaysCount: winDays,
    totalDaysCount: totalDays,
    dayWinRate: Math.round(dayWinRate * 10) / 10,
    dailyProfitTarget,
    targetMetDaysCount,
    targetMetRate: Math.round(targetMetRate * 10) / 10,
  };
}

/**
 * Computes performance analytics by Bot ID / Strategy
 */
export function calculateBotStats(transactions: Transaction[]): BotStrategyStats[] {
  const map = new Map<string, {
    count: number;
    grossPnL: number;
    gas: number;
    wins: number;
    losses: number;
    winPnL: number;
    lossPnL: number;
    first: string;
    last: string;
  }>();

  for (const tx of transactions) {
    const botId = tx.botId?.trim() || 'Manual / Untagged';
    const entry = map.get(botId) || {
      count: 0,
      grossPnL: 0,
      gas: 0,
      wins: 0,
      losses: 0,
      winPnL: 0,
      lossPnL: 0,
      first: tx.date,
      last: tx.date,
    };

    entry.count += 1;
    const gas = Math.max(0, tx.gasFee || 0);
    entry.gas += (tx.type === 'Gas' ? Math.abs(tx.amount) : gas);

    if (tx.type === 'Trade PnL') {
      entry.grossPnL += tx.amount;
      if (tx.amount > 0) {
        entry.wins += 1;
        entry.winPnL += tx.amount;
      } else if (tx.amount < 0) {
        entry.losses += 1;
        entry.lossPnL += Math.abs(tx.amount);
      }
    }

    if (tx.date < entry.first) entry.first = tx.date;
    if (tx.date > entry.last) entry.last = tx.date;

    map.set(botId, entry);
  }

  const results: BotStrategyStats[] = [];
  for (const [botId, d] of map.entries()) {
    const netPnL = d.grossPnL - d.gas;
    const winRate = (d.wins + d.losses) > 0 ? (d.wins / (d.wins + d.losses)) * 100 : 0;
    const profitFactor = d.lossPnL > 0 ? d.winPnL / d.lossPnL : d.winPnL > 0 ? 99.9 : 0;

    results.push({
      botId,
      transactionCount: d.count,
      grossPnL: Math.round(d.grossPnL * 100) / 100,
      totalGas: Math.round(d.gas * 100) / 100,
      netPnL: Math.round(netPnL * 100) / 100,
      winCount: d.wins,
      lossCount: d.losses,
      winRate: Math.round(winRate * 10) / 10,
      profitFactor: Math.round(profitFactor * 100) / 100,
      firstActive: d.first,
      lastActive: d.last,
    });
  }

  return results.sort((a, b) => b.netPnL - a.netPnL);
}

export const recalculateLedger = calculateLedgerBalances;
export const generateDailySnapshots = buildDailySnapshots;
export const calculateBotStrategyStats = calculateBotStats;
