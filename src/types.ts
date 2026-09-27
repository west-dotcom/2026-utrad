export type TransactionType =
  | 'Deposit'
  | 'Withdrawal'
  | 'Trade PnL'
  | 'Loan In'
  | 'Loan Out'
  | 'Gas'
  | 'Interest';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  amount: number; // positive or negative according to standard conventions
  asset: string; // USDT, USDC, BTC, ETH, SOL, USD
  gasFee?: number; // Optional legacy gas or exchange fee
  runningCapital?: number; // Calculated running capital
  loanBalance?: number; // Calculated running loan balance
  sourceDest?: string;
  botId?: string;
  notes?: string;
}

export interface DailySnapshot {
  date: string;
  startCapital: number;
  netInflows: number; // deposits - withdrawals
  realizedPnL: number;
  gasFees?: number;
  interest: number;
  endCapital: number;
  dailyReturnPct: number; // (end - start - net inflows) / start
  cumulativePnL: number;
  loanBalance: number;
  transactionCount: number;
  targetMet?: boolean;
}

export interface BotStrategyStats {
  botId: string;
  transactionCount: number;
  grossPnL: number;
  totalGas: number;
  netPnL: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  profitFactor: number;
  firstActive: string;
  lastActive: string;
}

export interface LedgerSummary {
  currentCapital: number;
  startingCapital: number;
  cumulativePnL: number;
  cumulativePnLPct: number;
  totalDeposits: number;
  totalWithdrawals: number;
  netDeposits: number;
  totalGasFees?: number;
  gasPercentOfProfit?: number;
  currentLoanBalance: number;
  loanToCapitalRatio: number;
  totalInterestPaid: number;
  dailyReturnAvg: number;
  dailyReturnStdDev: number;
  sharpeRatio: number; // annualized assuming 0% risk-free
  winDaysCount: number;
  totalDaysCount: number;
  dayWinRate: number;
  dailyProfitTarget?: number;
  targetMetDaysCount?: number;
  targetMetRate?: number;
}

export interface GoogleSheetMeta {
  spreadsheetId: string;
  title: string;
  url: string;
  lastSyncedAt: string | null;
  sheetNames: string[];
}
