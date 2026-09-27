export interface DailyLogRow {
  id: string;
  day: string; // e.g. "5/1/2025"
  startingCapital: number;
  dailyReturn: number; // Yellow editable input cell ($)
  dailyReturnPct: number; // Calculated: (dailyReturn / startingCapital) * 100
  endingCapital: number; // Calculated: startingCapital + dailyReturn
  cumulativePnL: number; // Calculated cumulative sum
  runningCapital: number; // Ending capital carrying forward
  ratePct: number; // 15.00%
  tradeLoss?: number; // e.g. -2545
  ugasFee?: number; // e.g. -1175
  notes?: string;
}

export type CashFlowType =
  | 'Deposit'
  | 'Withdrawal'
  | 'Loan In'
  | 'Loan Out'
  | 'Gas'
  | 'Fee'
  | 'Trade Loss';

export interface CashFlowItem {
  id: string;
  date: string;
  type: CashFlowType;
  amount: number; // Positive for inflow (Deposit, Loan In), negative for outflow/loss (Withdrawal, Loan Out, Gas, Fee, Trade Loss)
  asset: string; // USDT, USDC, USD
  notes?: string;
}

export interface AccountAssumptions {
  startingCapital: number; // Default $5,000 (editable yellow cell)
  targetDailyRatePct: number; // Default 15% (editable yellow cell)
  plannedDailyProfit: number; // Default $1,280 (editable yellow cell)
  targetCapital: number; // Default $50,000
}

export interface AccountData {
  id: string; // 'farmland' | 'firmly' | 'gadget' | custom
  name: string;
  tagline: string;
  type: 'Agricultural Yield' | 'Firm Arbitrage' | 'Grid / Gadget Bot' | 'Custom';
  themeColor: string; // hex or tailwind identifier
  assumptions: AccountAssumptions;
  oneOffLosses: {
    tradeLoss: number;
    ugasFee: number;
    combinedDailyReturn: number;
  };
  dailyLog: DailyLogRow[];
  cashFlows: CashFlowItem[];
}

export const INITIAL_ACCOUNTS: { id: string; name: string; type: string; icon: string }[] = [
  { id: 'farmland', name: 'Farmland', type: 'Agricultural Yield', icon: 'sprout' },
  { id: 'firmly', name: 'Firmly', type: 'Firm Arbitrage', icon: 'building' },
  { id: 'gadget', name: 'Gadget', type: 'Grid / Gadget Bot', icon: 'cpu' },
];

/**
 * Generate default daily log for an account.
 * Day 1 has initial loss.
 * Next 14 days pre-filled with the $1,280 planned daily return.
 * Hundreds of extra rows pre-formatted and ready for years of data!
 */
export function generateDefaultDailyLog(
  startingCapital: number = 5000,
  plannedDailyProfit: number = 1280,
  targetRatePct: number = 15,
  initialTradeLoss: number = -2545,
  initialUGasFee: number = -1175
): DailyLogRow[] {
  const rows: DailyLogRow[] = [];
  const startDate = new Date(2025, 4, 1); // 5/1/2025
  const initialCombinedLoss = initialTradeLoss + initialUGasFee; // e.g. -3720

  let currentStartCap = startingCapital;
  let runningCumPnL = 0;

  // Total 734 days (May 1, 2025 to May 4, 2027) matching 2-year template
  for (let i = 0; i < 734; i++) {
    const curDate = new Date(startDate);
    curDate.setDate(startDate.getDate() + i);

    const m = curDate.getMonth() + 1;
    const d = curDate.getDate();
    const y = curDate.getFullYear();
    const formattedDay = `${m}/${d}/${y}`;

    if (i === 0) {
      // Day 1: Original one-off losses
      const dRet = initialCombinedLoss;
      const endCap = currentStartCap + dRet;
      runningCumPnL += dRet;

      rows.push({
        id: `row-0`,
        day: formattedDay,
        startingCapital: currentStartCap,
        dailyReturn: dRet,
        dailyReturnPct: (dRet / currentStartCap) * 100,
        endingCapital: endCap,
        cumulativePnL: runningCumPnL,
        runningCapital: endCap,
        ratePct: targetRatePct,
        tradeLoss: initialTradeLoss,
        ugasFee: initialUGasFee,
        notes: `Initial day one-off loss (Trade PnL: $${initialTradeLoss}, UGas: $${initialUGasFee})`,
      });

      // Next day starts with day 1 ending capital ($1,280 for farmland)
      currentStartCap = endCap;
    } else if (i <= 14) {
      // Days 2 to 15 (Next 14 days): Pre-filled with planned $1,280 return
      const dRet = plannedDailyProfit;
      const endCap = currentStartCap + dRet;
      runningCumPnL += dRet;

      rows.push({
        id: `row-${i}`,
        day: formattedDay,
        startingCapital: currentStartCap,
        dailyReturn: dRet,
        dailyReturnPct: currentStartCap > 0 ? (dRet / currentStartCap) * 100 : 0,
        endingCapital: endCap,
        cumulativePnL: runningCumPnL,
        runningCapital: endCap,
        ratePct: targetRatePct,
        notes: `Pre-filled sample profit day #${i}`,
      });

      currentStartCap = endCap;
    } else {
      // Pre-formatted empty/ready future days
      rows.push({
        id: `row-${i}`,
        day: formattedDay,
        startingCapital: currentStartCap,
        dailyReturn: 0,
        dailyReturnPct: 0,
        endingCapital: currentStartCap,
        cumulativePnL: runningCumPnL,
        runningCapital: currentStartCap,
        ratePct: targetRatePct,
      });
    }
  }

  return rows;
}

/**
 * Generate default cash flows log for an account
 */
export function generateDefaultCashFlows(
  accountType: 'farmland' | 'firmly' | 'gadget' | string
): CashFlowItem[] {
  if (accountType === 'firmly') {
    return [
      {
        id: 'cf-firmly-1',
        date: '2025-05-01',
        type: 'Deposit',
        amount: 5000,
        asset: 'USDT',
        notes: 'Initial capital allocation for Firmly',
      },
      {
        id: 'cf-firmly-2',
        date: '2025-05-01',
        type: 'Trade Loss',
        amount: -1200,
        asset: 'USDT',
        notes: 'Realized trade drawdown',
      },
      {
        id: 'cf-firmly-3',
        date: '2025-05-01',
        type: 'Gas',
        amount: -450,
        asset: 'USDT',
        notes: 'Energy & bridge gas expenditure',
      },
      {
        id: 'cf-firmly-4',
        date: '2025-05-08',
        type: 'Loan In',
        amount: 2500,
        asset: 'USDT',
        notes: 'Working capital liquidity line',
      },
    ];
  }

  if (accountType === 'gadget') {
    return [
      {
        id: 'cf-gadget-1',
        date: '2025-05-01',
        type: 'Deposit',
        amount: 5000,
        asset: 'USDT',
        notes: 'Initial capital allocation for Gadget grid',
      },
      {
        id: 'cf-gadget-2',
        date: '2025-05-01',
        type: 'Trade Loss',
        amount: -1850,
        asset: 'USDT',
        notes: 'Bot slippage and market stop loss',
      },
      {
        id: 'cf-gadget-3',
        date: '2025-05-01',
        type: 'Gas',
        amount: -620,
        asset: 'USDT',
        notes: 'API and chain gas execution',
      },
      {
        id: 'cf-gadget-4',
        date: '2025-05-12',
        type: 'Withdrawal',
        amount: -600,
        asset: 'USDT',
        notes: 'Periodic profit withdrawal',
      },
    ];
  }

  // Farmland (default)
  return [
    {
      id: 'cf-farm-1',
      date: '2025-05-01',
      type: 'Deposit',
      amount: 5000,
      asset: 'USDT',
      notes: 'Initial principal lot allocation',
    },
    {
      id: 'cf-farm-2',
      date: '2025-05-01',
      type: 'Trade Loss',
      amount: -2545,
      asset: 'USDT',
      notes: 'Money lost in the trade (Trade PnL)',
    },
    {
      id: 'cf-farm-3',
      date: '2025-05-01',
      type: 'Gas',
      amount: -1175,
      asset: 'USDT',
      notes: 'Money used on UGas (Gas / Energy Fee)',
    },
    {
      id: 'cf-farm-4',
      date: '2025-05-10',
      type: 'Withdrawal',
      amount: -500,
      asset: 'USDT',
      notes: 'Sample capital withdrawal to cold storage',
    },
    {
      id: 'cf-farm-5',
      date: '2025-05-12',
      type: 'Loan In',
      amount: 1000,
      asset: 'USDT',
      notes: 'Operational bridge credit',
    },
  ];
}

/**
 * Generates initial profile for a given account ID
 */
export function getInitialAccountData(accountId: string): AccountData {
  switch (accountId) {
    case 'firmly': {
      const tradeLoss = -1200;
      const ugasFee = -450;
      return {
        id: 'firmly',
        name: 'Firmly',
        tagline: 'Firm Institutional Arbitrage & Operations',
        type: 'Firm Arbitrage',
        themeColor: '#3b82f6', // blue
        assumptions: {
          startingCapital: 5000,
          targetDailyRatePct: 15.0,
          plannedDailyProfit: 1280,
          targetCapital: 50000,
        },
        oneOffLosses: {
          tradeLoss,
          ugasFee,
          combinedDailyReturn: tradeLoss + ugasFee,
        },
        dailyLog: generateDefaultDailyLog(5000, 1280, 15, tradeLoss, ugasFee),
        cashFlows: generateDefaultCashFlows('firmly'),
      };
    }

    case 'gadget': {
      const tradeLoss = -1850;
      const ugasFee = -620;
      return {
        id: 'gadget',
        name: 'Gadget',
        tagline: 'Grid Bot & Algorithmic Execution System',
        type: 'Grid / Gadget Bot',
        themeColor: '#a855f7', // purple
        assumptions: {
          startingCapital: 5000,
          targetDailyRatePct: 15.0,
          plannedDailyProfit: 1280,
          targetCapital: 50000,
        },
        oneOffLosses: {
          tradeLoss,
          ugasFee,
          combinedDailyReturn: tradeLoss + ugasFee,
        },
        dailyLog: generateDefaultDailyLog(5000, 1280, 15, tradeLoss, ugasFee),
        cashFlows: generateDefaultCashFlows('gadget'),
      };
    }

    case 'farmland':
    default: {
      const tradeLoss = -2545;
      const ugasFee = -1175;
      return {
        id: 'farmland',
        name: 'Farmland',
        tagline: 'Agricultural Yield Bot & Primary Trading Capital',
        type: 'Agricultural Yield',
        themeColor: '#10b981', // emerald
        assumptions: {
          startingCapital: 5000,
          targetDailyRatePct: 15.0,
          plannedDailyProfit: 1280,
          targetCapital: 50000,
        },
        oneOffLosses: {
          tradeLoss,
          ugasFee,
          combinedDailyReturn: tradeLoss + ugasFee,
        },
        dailyLog: generateDefaultDailyLog(5000, 1280, 15, tradeLoss, ugasFee),
        cashFlows: generateDefaultCashFlows('farmland'),
      };
    }
  }
}

/**
 * Re-computes formulas for a daily log sequence
 */
export function recalculateDailyLog(
  rows: DailyLogRow[],
  startingCapital: number,
  targetRatePct: number
): DailyLogRow[] {
  let curStart = startingCapital;
  let cumPnL = 0;

  return rows.map((r, idx) => {
    const startCap = idx === 0 ? startingCapital : curStart;
    const dRet = Number(r.dailyReturn) || 0;
    const endCap = startCap + dRet;
    cumPnL += dRet;
    const dPct = startCap > 0 ? (dRet / startCap) * 100 : 0;

    curStart = endCap;

    return {
      ...r,
      startingCapital: startCap,
      dailyReturn: dRet,
      dailyReturnPct: dPct,
      endingCapital: endCap,
      cumulativePnL: cumPnL,
      runningCapital: endCap,
      ratePct: r.ratePct || targetRatePct,
    };
  });
}

/**
 * Loads an account's data from localStorage or initial defaults
 */
export function loadAccountData(accountId: string): AccountData {
  try {
    const saved = localStorage.getItem(`greenharvest_account_data_${accountId}_v2`);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn(`Failed loading account ${accountId}`, e);
  }
  return getInitialAccountData(accountId);
}

export interface AccountMetrics {
  accountId: string;
  accountName: string;
  accountType: string;
  startingCapital: number;
  currentCapital: number;
  cumulativePnL: number;
  cumulativePnLPct: number;
  totalDeposits: number;
  totalWithdrawals: number;
  netWithdrawals: number;
  totalGasFees: number;
  currentLoanBalance: number;
  loanToCapitalRatio: number;
  dailyReturnAvg: number;
  dailyReturnStdDev: number;
  sharpeRatio: number;
  dayWinRate: number;
  winDaysCount: number;
  totalDaysCount: number;
  dailyProfitTarget: number;
  targetMetRate: number;
  targetMetDaysCount: number;
  dailyLog: DailyLogRow[];
}

/**
 * Computes live metrics for a single account
 */
export function calculateAccountMetrics(account: AccountData): AccountMetrics {
  const activeDays = account.dailyLog.filter((r) => r.dailyReturn !== 0);
  const totalDaysCount = activeDays.length;
  const winDaysCount = activeDays.filter((r) => r.dailyReturn > 0).length;
  const dayWinRate = totalDaysCount > 0 ? (winDaysCount / totalDaysCount) * 100 : 0;

  const cumulativePnL = account.dailyLog.reduce((acc, r) => acc + (r.dailyReturn || 0), 0);
  const startingCapital = account.assumptions.startingCapital || 5000;
  const cumulativePnLPct = startingCapital > 0 ? (cumulativePnL / startingCapital) * 100 : 0;

  // Cash flows
  let totalDeposits = 0;
  let totalWithdrawals = 0;
  let totalLoansIn = 0;
  let totalLoansOut = 0;
  let totalGas = 0;
  let totalFees = 0;

  for (const cf of account.cashFlows) {
    const amt = Number(cf.amount) || 0;
    if (cf.type === 'Deposit') totalDeposits += Math.abs(amt);
    else if (cf.type === 'Withdrawal') totalWithdrawals += Math.abs(amt);
    else if (cf.type === 'Loan In') totalLoansIn += Math.abs(amt);
    else if (cf.type === 'Loan Out') totalLoansOut += Math.abs(amt);
    else if (cf.type === 'Gas') totalGas += Math.abs(amt);
    else if (cf.type === 'Fee') totalFees += Math.abs(amt);
  }

  const netWithdrawals = totalWithdrawals - totalDeposits;
  const currentLoanBalance = totalLoansIn - totalLoansOut;
  const totalGasFees = totalGas + totalFees;

  const currentCapital =
    startingCapital + cumulativePnL + totalDeposits - totalWithdrawals + currentLoanBalance;

  const loanToCapitalRatio =
    currentCapital > 0 ? (currentLoanBalance / currentCapital) * 100 : 0;

  const dailyReturnAvg =
    totalDaysCount > 0
      ? activeDays.reduce((acc, r) => acc + (r.dailyReturnPct || 0), 0) / totalDaysCount
      : 0;

  // Standard deviation & Sharpe
  const variance =
    totalDaysCount > 1
      ? activeDays.reduce((acc, r) => acc + Math.pow((r.dailyReturnPct || 0) - dailyReturnAvg, 2), 0) /
        (totalDaysCount - 1)
      : 0;
  const dailyReturnStdDev = Math.sqrt(variance);
  const sharpeRatio =
    dailyReturnStdDev > 0 ? (dailyReturnAvg / dailyReturnStdDev) * Math.sqrt(365) : 0;

  const dailyProfitTarget = account.assumptions.plannedDailyProfit || 1280;
  const targetMetDaysCount = activeDays.filter((r) => r.dailyReturn >= dailyProfitTarget).length;
  const targetMetRate = totalDaysCount > 0 ? (targetMetDaysCount / totalDaysCount) * 100 : 0;

  return {
    accountId: account.id,
    accountName: account.name,
    accountType: account.type,
    startingCapital,
    currentCapital,
    cumulativePnL,
    cumulativePnLPct,
    totalDeposits,
    totalWithdrawals,
    netWithdrawals,
    totalGasFees,
    currentLoanBalance,
    loanToCapitalRatio,
    dailyReturnAvg,
    dailyReturnStdDev,
    sharpeRatio,
    dayWinRate,
    winDaysCount,
    totalDaysCount,
    dailyProfitTarget,
    targetMetRate,
    targetMetDaysCount,
    dailyLog: account.dailyLog,
  };
}

/**
 * Computes combined aggregate metrics summing all 3 accounts (Farmland, Firmly, Gadget)
 */
export function calculateAggregateMetrics(accounts: AccountData[]): AccountMetrics {
  const accountMetrics = accounts.map(calculateAccountMetrics);

  const startingCapital = accountMetrics.reduce((acc, m) => acc + m.startingCapital, 0);
  const currentCapital = accountMetrics.reduce((acc, m) => acc + m.currentCapital, 0);
  const cumulativePnL = accountMetrics.reduce((acc, m) => acc + m.cumulativePnL, 0);
  const cumulativePnLPct = startingCapital > 0 ? (cumulativePnL / startingCapital) * 100 : 0;

  const totalDeposits = accountMetrics.reduce((acc, m) => acc + m.totalDeposits, 0);
  const totalWithdrawals = accountMetrics.reduce((acc, m) => acc + m.totalWithdrawals, 0);
  const netWithdrawals = totalWithdrawals - totalDeposits;
  const totalGasFees = accountMetrics.reduce((acc, m) => acc + m.totalGasFees, 0);
  const currentLoanBalance = accountMetrics.reduce((acc, m) => acc + m.currentLoanBalance, 0);
  const loanToCapitalRatio =
    currentCapital > 0 ? (currentLoanBalance / currentCapital) * 100 : 0;

  const winDaysCount = accountMetrics.reduce((acc, m) => acc + m.winDaysCount, 0);
  const totalDaysCount = accountMetrics.reduce((acc, m) => acc + m.totalDaysCount, 0);
  const dayWinRate = totalDaysCount > 0 ? (winDaysCount / totalDaysCount) * 100 : 0;

  const dailyReturnAvg =
    accounts.length > 0
      ? accountMetrics.reduce((acc, m) => acc + m.dailyReturnAvg, 0) / accounts.length
      : 0;
  const dailyReturnStdDev =
    accounts.length > 0
      ? accountMetrics.reduce((acc, m) => acc + m.dailyReturnStdDev, 0) / accounts.length
      : 0;
  const sharpeRatio =
    dailyReturnStdDev > 0 ? (dailyReturnAvg / dailyReturnStdDev) * Math.sqrt(365) : 0;

  const dailyProfitTarget = accountMetrics.reduce((acc, m) => acc + m.dailyProfitTarget, 0);
  const targetMetDaysCount = accountMetrics.reduce((acc, m) => acc + m.targetMetDaysCount, 0);
  const targetMetRate = totalDaysCount > 0 ? (targetMetDaysCount / totalDaysCount) * 100 : 0;

  // Build combined daily log sequence (summing day-by-day ending capital)
  const maxLen = Math.max(...accounts.map((a) => a.dailyLog.length), 0);
  const combinedDailyLog: DailyLogRow[] = [];

  for (let i = 0; i < maxLen; i++) {
    const dayRows = accounts.map((a) => a.dailyLog[i]).filter(Boolean);
    const day = dayRows[0]?.day || `Day ${i + 1}`;
    const startCap = dayRows.reduce((acc, r) => acc + r.startingCapital, 0);
    const dRet = dayRows.reduce((acc, r) => acc + r.dailyReturn, 0);
    const endCap = dayRows.reduce((acc, r) => acc + r.endingCapital, 0);
    const cumPnL = dayRows.reduce((acc, r) => acc + r.cumulativePnL, 0);
    const dPct = startCap > 0 ? (dRet / startCap) * 100 : 0;

    combinedDailyLog.push({
      id: `agg-row-${i}`,
      day,
      startingCapital: startCap,
      dailyReturn: dRet,
      dailyReturnPct: dPct,
      endingCapital: endCap,
      cumulativePnL: cumPnL,
      runningCapital: endCap,
      ratePct: 15,
      notes: `Total Aggregate across ${accounts.length} accounts`,
    });
  }

  return {
    accountId: 'aggregate',
    accountName: 'Total Aggregate',
    accountType: 'All 3 Accounts Combined',
    startingCapital,
    currentCapital,
    cumulativePnL,
    cumulativePnLPct,
    totalDeposits,
    totalWithdrawals,
    netWithdrawals,
    totalGasFees,
    currentLoanBalance,
    loanToCapitalRatio,
    dailyReturnAvg,
    dailyReturnStdDev,
    sharpeRatio,
    dayWinRate,
    winDaysCount,
    totalDaysCount,
    dailyProfitTarget,
    targetMetRate,
    targetMetDaysCount,
    dailyLog: combinedDailyLog,
  };
}
