import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  Wallet,
  DollarSign,
  Target,
  Landmark,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Activity,
  Layers,
  Award,
  Sprout,
  Building2,
  Cpu,
  ChevronDown,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  BarChart3,
  TrendingDown,
  PlusCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { DailySnapshot, LedgerSummary, BotStrategyStats, Transaction, MarketCondition } from '../types';
import {
  loadAccountData,
  calculateAccountMetrics,
  calculateAggregateMetrics,
  AccountMetrics,
  getStoredAccountsList,
  AccountMeta,
} from '../data/accountsData';
import { DailyProfitLossBarChart } from './DailyProfitLossBarChart';
import { CalendarRoiHeatmap } from './CalendarRoiHeatmap';
import { DateRangePicker, DateRangeFilter } from './DateRangePicker';
import { BotProfitComparisonChart } from './BotProfitComparisonChart';
import { MARKET_CONDITIONS_DATA, getConditionBadge } from './TransactionsView';

interface DashboardViewProps {
  summary: LedgerSummary;
  snapshots: DailySnapshot[];
  botStats?: BotStrategyStats[];
  transactions?: Transaction[];
  selectedAccountId?: string;
  onSelectAccount?: (id: string) => void;
  onNavigateToTab: (tab: string) => void;
  onOpenAddTx: () => void;
}

export function DashboardView({
  summary,
  snapshots,
  botStats,
  transactions,
  selectedAccountId = 'farmland',
  onSelectAccount,
  onNavigateToTab,
  onOpenAddTx,
}: DashboardViewProps) {
  // Total Aggregate toggle state (false = selected account, true = sum of all 3 accounts)
  const [isAggregate, setIsAggregate] = useState<boolean>(() => {
    try {
      return localStorage.getItem('greenharvest_dash_aggregate_v1') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('greenharvest_dash_aggregate_v1', String(isAggregate));
    } catch (e) {
      console.warn(e);
    }
  }, [isAggregate]);

  // Load all accounts dynamically including any user-added accounts
  const [accountsList, setAccountsList] = useState<AccountMeta[]>(() => getStoredAccountsList());

  useEffect(() => {
    const handleUpdate = () => {
      setAccountsList(getStoredAccountsList());
    };
    window.addEventListener('greenharvest_accounts_updated', handleUpdate);
    return () => window.removeEventListener('greenharvest_accounts_updated', handleUpdate);
  }, []);

  const accountIds = useMemo(() => accountsList.map((a) => a.id), [accountsList]);

  const allAccountsData = useMemo(() => {
    return accountIds.map(loadAccountData);
  }, [accountIds, selectedAccountId, isAggregate]);

  const selectedAccountData = useMemo(() => {
    return loadAccountData(selectedAccountId || 'farmland');
  }, [selectedAccountId, isAggregate]);

  // Individual metrics for all 3 accounts
  const individualAccountMetrics = useMemo(() => {
    return allAccountsData.map(calculateAccountMetrics);
  }, [allAccountsData]);

  // Metrics for currently selected account
  const singleMetrics = useMemo(() => {
    return calculateAccountMetrics(selectedAccountData);
  }, [selectedAccountData]);

  // Metrics for sum of all 3 accounts
  const aggregateMetrics = useMemo(() => {
    return calculateAggregateMetrics(allAccountsData);
  }, [allAccountsData]);

  // Active metrics depending on toggle
  const activeMetrics: AccountMetrics = isAggregate ? aggregateMetrics : singleMetrics;

  // Date Range Filter state for analytical charts (Line chart, Bar chart, Heatmap)
  const [chartDateFilter, setChartDateFilter] = useState<DateRangeFilter>({
    preset: '30D',
    startDate: '2026-01-01',
    endDate: '2026-01-30',
    label: '30 Days (Jan 1 - Jan 30, 2026)',
  });

  // Filter dailyLog by the active date range window
  const filteredDailyLogForCharts = useMemo(() => {
    if (!activeMetrics.dailyLog || activeMetrics.dailyLog.length === 0) return [];

    const start = new Date(chartDateFilter.startDate + 'T00:00:00');
    const end = new Date(chartDateFilter.endDate + 'T23:59:59');

    const filtered = activeMetrics.dailyLog.filter((row) => {
      if (!row.day) return false;
      let y = 2026;
      let m = 1;
      let d = 1;
      if (row.day.includes('/')) {
        const parts = row.day.split('/');
        // Format could be YYYY/MM/DD or MM/DD/YYYY
        if (parts[0].length === 4) {
          y = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10);
          d = parseInt(parts[2], 10);
        } else {
          m = parseInt(parts[0], 10);
          d = parseInt(parts[1], 10);
          y = parseInt(parts[2], 10);
        }
      } else if (row.day.includes('-')) {
        const parts = row.day.split('-');
        if (parts[0].length === 4) {
          y = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10);
          d = parseInt(parts[2], 10);
        } else {
          m = parseInt(parts[0], 10);
          d = parseInt(parts[1], 10);
          y = parseInt(parts[2], 10);
        }
      }
      const rowDate = new Date(y, m - 1, d);
      return rowDate >= start && rowDate <= end;
    });

    return filtered.length > 0 ? filtered : activeMetrics.dailyLog.slice(0, 30);
  }, [activeMetrics.dailyLog, chartDateFilter]);

  // Sum of realized PnL across the filtered window
  const filteredPnLForCharts = useMemo(() => {
    return filteredDailyLogForCharts.reduce((sum, r) => sum + (Number(r.dailyReturn) || 0), 0);
  }, [filteredDailyLogForCharts]);

  // Chart data: uses filteredDailyLogForCharts
  const chartDays = useMemo(() => {
    return filteredDailyLogForCharts;
  }, [filteredDailyLogForCharts]);

  // Recharts range & unit controls
  const [returnChartRange, setReturnChartRange] = useState<number | 'auto'>('auto');
  const [returnMetricUnit, setReturnMetricUnit] = useState<'dollars' | 'percent'>('dollars');

  // Recharts data prepared for selected account or total aggregate
  const rechartsDailyReturnData = useMemo(() => {
    const sliceDays =
      returnChartRange === 'auto'
        ? filteredDailyLogForCharts
        : returnChartRange === 0
        ? filteredDailyLogForCharts.filter((d, idx) => idx === 0 || d.dailyReturn !== 0)
        : filteredDailyLogForCharts.slice(0, returnChartRange);

    return sliceDays.map((d, idx) => ({
      index: idx + 1,
      date: d.day,
      dailyReturn: Number(d.dailyReturn) || 0,
      dailyReturnPct: Number((d.dailyReturnPct || 0).toFixed(2)),
      endingCapital: Number(d.endingCapital) || 0,
      target: activeMetrics.dailyProfitTarget,
      isLoss: (d.dailyReturn || 0) < 0,
      isProfit: (d.dailyReturn || 0) > 0,
    }));
  }, [filteredDailyLogForCharts, returnChartRange, activeMetrics.dailyProfitTarget]);

  const chartThemeColor = isAggregate
    ? '#10b981'
    : selectedAccountId === 'firmly'
    ? '#3b82f6'
    : selectedAccountId === 'gadget'
    ? '#a855f7'
    : '#10b981';

  // Active days with recorded returns for target progress
  const targetActiveDays = useMemo(() => {
    return activeMetrics.dailyLog.filter((r) => r.dailyReturn !== 0);
  }, [activeMetrics]);

  // Selected day index for evaluating target progress (-1 means latest active day)
  const [targetEvalDayIndex, setTargetEvalDayIndex] = useState<number>(-1);

  // Evaluated day for the daily profit target progress bar
  const evaluatedTargetDay = useMemo(() => {
    if (targetActiveDays.length === 0) {
      return activeMetrics.dailyLog[0] || null;
    }
    if (targetEvalDayIndex >= 0 && targetEvalDayIndex < targetActiveDays.length) {
      return targetActiveDays[targetEvalDayIndex];
    }
    // Default to latest active recorded day
    return targetActiveDays[targetActiveDays.length - 1];
  }, [targetActiveDays, targetEvalDayIndex, activeMetrics]);

  const currentDayPnL = evaluatedTargetDay?.dailyReturn ?? 0;
  const currentDayDate = evaluatedTargetDay?.day ?? 'Latest Day';
  const dailyTarget = activeMetrics.dailyProfitTarget || 1280;

  // Percentage toward target (can exceed 100% or be negative)
  const targetProgressPct = dailyTarget > 0 ? (currentDayPnL / dailyTarget) * 100 : 0;
  // Clamped for CSS width (0% to 100%)
  const clampedProgressPct = Math.max(0, Math.min(100, targetProgressPct));
  const isTargetAchieved = currentDayPnL >= dailyTarget;
  const isDrawdownDay = currentDayPnL < 0;
  const remainingToGoal = Math.max(0, dailyTarget - currentDayPnL);
  const surplusBeyondGoal = Math.max(0, currentDayPnL - dailyTarget);

  // Executive Dashboard: Market Condition Execution Metrics (Bullish, Bearish, Sideways, Volatile)
  const marketConditionMetrics = useMemo(() => {
    let txList: Transaction[] = transactions || [];
    if (!txList || txList.length === 0) {
      try {
        const stored = localStorage.getItem('crypto_bot_ledger_txs_v1');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            txList = parsed;
          }
        }
      } catch (e) {
        console.warn(e);
      }
    }

    // Filter to Trade PnL entries or explicit trade records
    const tradeTxs = txList.filter((t) => t.type === 'Trade PnL' || t.marketCondition);

    const counts: Record<MarketCondition, { count: number; pnl: number; wins: number; losses: number }> = {
      Bullish: { count: 0, pnl: 0, wins: 0, losses: 0 },
      Bearish: { count: 0, pnl: 0, wins: 0, losses: 0 },
      Sideways: { count: 0, pnl: 0, wins: 0, losses: 0 },
      Volatile: { count: 0, pnl: 0, wins: 0, losses: 0 },
    };

    if (tradeTxs.length > 0) {
      tradeTxs.forEach((tx) => {
        const badge = getConditionBadge(tx.marketCondition, tx.notes, tx.amount);
        const cond = badge.value;
        const amt = Number(tx.amount) || 0;
        counts[cond].count += 1;
        counts[cond].pnl += amt;
        if (amt >= 0) {
          counts[cond].wins += 1;
        } else {
          counts[cond].losses += 1;
        }
      });
    } else {
      // Derive from active account's recorded daily cycles (30 days) to display live executive metrics
      const activeRows = activeMetrics.dailyLog.slice(0, 30).filter((r) => r.dailyReturn !== 0);
      activeRows.forEach((row, idx) => {
        const ret = Number(row.dailyReturn) || 0;
        if (idx === 0 && ret < 0) {
          // Day 1 one-off losses: Trade drawdown (-$2,545 Bearish) + Gas/Energy (-$1,175 Volatile)
          counts.Bearish.count += 1;
          counts.Bearish.pnl += row.tradeLoss || -2545;
          counts.Bearish.losses += 1;

          counts.Volatile.count += 1;
          counts.Volatile.pnl += row.ugasFee || -1175;
          counts.Volatile.losses += 1;
        } else if (ret > 0) {
          // Automated bot trading cycles: alternate between Bullish trend-following & Sideways range/grid
          if (idx % 2 === 1) {
            counts.Bullish.count += 1;
            counts.Bullish.pnl += ret;
            counts.Bullish.wins += 1;
          } else {
            counts.Sideways.count += 1;
            counts.Sideways.pnl += ret;
            counts.Sideways.wins += 1;
          }
        }
      });
    }

    const totalTrades =
      counts.Bullish.count + counts.Bearish.count + counts.Sideways.count + counts.Volatile.count;
    const totalPnL =
      counts.Bullish.pnl + counts.Bearish.pnl + counts.Sideways.pnl + counts.Volatile.pnl;

    return {
      counts,
      totalTrades: totalTrades || 1,
      totalPnL,
    };
  }, [transactions, activeMetrics.dailyLog]);

  const [hoveredPoint, setHoveredPoint] = useState<{
    date: string;
    endCapital: number;
    dailyReturnPct: number;
    dailyReturn: number;
  } | null>(null);

  // SVG Chart dimensions
  const chartWidth = 900;
  const chartHeight = 260;
  const padding = { top: 20, right: 30, bottom: 40, left: 70 };

  // Calculate scales for Equity Curve
  const capitals = chartDays.map((s) => s.endingCapital);
  const minCap = Math.min(...capitals, activeMetrics.startingCapital * 0.9);
  const maxCap = Math.max(...capitals, activeMetrics.startingCapital * 1.1);
  const capRange = maxCap - minCap || 1;

  const getX = (index: number) => {
    if (chartDays.length <= 1) return padding.left;
    return padding.left + (index / (chartDays.length - 1)) * (chartWidth - padding.left - padding.right);
  };

  const getY = (val: number) => {
    return chartHeight - padding.bottom - ((val - minCap) / capRange) * (chartHeight - padding.top - padding.bottom);
  };

  // Generate SVG path for equity line
  const points = chartDays.map((s, i) => `${getX(i)},${getY(s.endingCapital)}`);
  const equityLinePath = points.length > 0 ? `M ${points.join(' L ')}` : '';
  const equityAreaPath =
    points.length > 0
      ? `M ${points[0]} L ${points.join(' L ')} L ${getX(chartDays.length - 1)},${chartHeight - padding.bottom} L ${getX(0)},${chartHeight - padding.bottom} Z`
      : '';

  // Bar chart scale for daily returns
  const returnPcts = chartDays.map((s) => s.dailyReturnPct);
  const maxReturn = Math.max(1, ...returnPcts.map((r) => Math.abs(r)));
  const barChartHeight = 120;
  const barZeroY = barChartHeight / 2;

  // Helper for account icon
  const getAccountIcon = (id: string) => {
    if (id === 'farmland') return <Sprout className="w-4 h-4 text-emerald-400" />;
    if (id === 'firmly') return <Building2 className="w-4 h-4 text-blue-400" />;
    return <Cpu className="w-4 h-4 text-purple-400" />;
  };

  return (
    <div id="dashboard-view" className="space-y-6">
      {/* Top Banner with Total Aggregate Toggle & Actions */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Executive Trading Operations
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {isAggregate ? '∑ Sum of All 3 Accounts' : `Account: ${activeMetrics.accountName}`}
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mt-1 flex items-center gap-2">
            <span>
              {isAggregate
                ? 'Portfolio Total Aggregate Dashboard'
                : `${activeMetrics.accountName} Trading Dashboard`}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isAggregate
              ? 'Aggregated portfolio view combining Farmland, Firmly, and Gadget capital, PnL, cash flows, and daily logs.'
              : `Filtered view displaying live metrics, PnL, and daily activity strictly for ${activeMetrics.accountName}.`}
          </p>

          {/* Quick-Glance Pill Counts: Bot Trades by Market Condition */}
          <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Market Conditions:</span>
            </span>
            <button
              type="button"
              onClick={() => onNavigateToTab('transactions')}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-xs cursor-pointer transition-all active:scale-95"
              title="Bullish trades executed (Buying) - Click to view in Transactions"
            >
              <span>📈 Bullish</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-emerald-100 text-[11px] font-extrabold">
                {marketConditionMetrics.counts.Bullish.count}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateToTab('transactions')}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 shadow-xs cursor-pointer transition-all active:scale-95"
              title="Bearish trades executed (Selling) - Click to view in Transactions"
            >
              <span>📉 Bearish</span>
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500/30 text-rose-100 text-[11px] font-extrabold">
                {marketConditionMetrics.counts.Bearish.count}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateToTab('transactions')}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-xs cursor-pointer transition-all active:scale-95"
              title="Sideways trades executed (Range/Grid) - Click to view in Transactions"
            >
              <span>↔️ Sideways</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-100 text-[11px] font-extrabold">
                {marketConditionMetrics.counts.Sideways.count}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateToTab('transactions')}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/40 shadow-xs cursor-pointer transition-all active:scale-95"
              title="Volatile trades executed (Choppy/Spikes) - Click to view in Transactions"
            >
              <span>⚡ Volatile</span>
              <span className="px-1.5 py-0.2 rounded-full bg-purple-500/30 text-purple-100 text-[11px] font-extrabold">
                {marketConditionMetrics.counts.Volatile.count}
              </span>
            </button>
          </div>
        </div>

        {/* Action Controls & Total Aggregate Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {/* TOTAL AGGREGATE TOGGLE */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 shadow-inner">
            <button
              id="dash-toggle-single-btn"
              onClick={() => setIsAggregate(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                !isAggregate
                  ? 'bg-slate-800 text-white font-bold shadow-xs border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Show metrics filtered to the currently selected account"
            >
              {getAccountIcon(selectedAccountId)}
              <span>{singleMetrics.accountName}</span>
            </button>

            <button
              id="dash-toggle-aggregate-btn"
              onClick={() => setIsAggregate(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isAggregate
                  ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-900/30'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Toggle to show the combined sum of all three accounts (Farmland + Firmly + Gadget)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Total Aggregate</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="dash-add-tx-btn"
              onClick={onOpenAddTx}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Record Event</span>
            </button>
            <button
              id="dash-open-sheets-btn"
              onClick={() => onNavigateToTab('farmland')}
              className="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Daily Sheet</span>
            </button>
          </div>
        </div>
      </div>

      {/* ACCOUNT FILTER SELECTOR / AGGREGATE SUMMARY BANNER */}
      {!isAggregate ? (
        /* Single Account Filter Bar */
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700">
              {getAccountIcon(selectedAccountId)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">
                  Filtered by Account: <strong className="text-emerald-400">{singleMetrics.accountName}</strong>
                </span>
                <span className="text-[10px] px-2 py-0.2 rounded font-mono bg-slate-800 text-slate-300">
                  {singleMetrics.accountType}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Displaying Current Capital (${singleMetrics.currentCapital.toLocaleString()}), Realized PnL ({singleMetrics.cumulativePnL >= 0 ? '+' : ''}${singleMetrics.cumulativePnL.toLocaleString()}), and cash flows for this account.
              </p>
            </div>
          </div>

          {/* Quick Account Switcher Pills */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
            {accountsList.map((acc) => {
              const Icon =
                acc.icon === 'building' || acc.type === 'Firm Arbitrage'
                  ? Building2
                  : acc.icon === 'cpu' || acc.type === 'Grid / Gadget Bot'
                  ? Cpu
                  : Sprout;
              const color =
                acc.icon === 'building' || acc.type === 'Firm Arbitrage'
                  ? 'text-blue-400'
                  : acc.icon === 'cpu' || acc.type === 'Grid / Gadget Bot'
                  ? 'text-purple-400'
                  : 'text-emerald-400';
              const isSelected = selectedAccountId === acc.id;
              return (
                <button
                  key={acc.id}
                  onClick={() => onSelectAccount && onSelectAccount(acc.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 text-white font-bold border border-slate-700 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                  <span>{acc.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Total Aggregate Multi-Account Summary Strip */
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-blue-950/40 border border-emerald-500/30 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                ∑ Total Aggregate Mode Active
              </span>
              <span className="text-xs text-white font-bold">
                Summing All {accountsList.length} Trading Accounts ({accountsList.map((a) => a.name).join(' + ')})
              </span>
            </div>
            <span className="text-xs text-emerald-400 font-mono font-bold">
              Total Capital: ${aggregateMetrics.currentCapital.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Accounts Comparative Snapshot Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {individualAccountMetrics.map((acc) => {
              const isProfit = acc.cumulativePnL >= 0;
              return (
                <div
                  key={acc.accountId}
                  onClick={() => {
                    if (onSelectAccount) {
                      onSelectAccount(acc.accountId);
                      setIsAggregate(false);
                    }
                  }}
                  className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer space-y-1 group"
                  title={`Click to filter dashboard strictly to ${acc.accountName}`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5 group-hover:text-emerald-400 transition-colors">
                      {getAccountIcon(acc.accountId)}
                      {acc.accountName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Cap: ${acc.currentCapital.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xs text-slate-400">Net Realized PnL:</span>
                    <span className={`text-xs font-mono font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isProfit ? '+' : ''}${acc.cumulativePnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center justify-between font-mono pt-1 border-t border-slate-800/80">
                    <span>Win Rate: {acc.dayWinRate.toFixed(1)}%</span>
                    <span className="text-emerald-400 group-hover:underline">Filter to this →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6 CORE METRIC CARDS (Filtered dynamically by selectedAccountId or Aggregate) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Metric 1: Current Capital (FILTERED & RECONCILED) */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 hover:border-emerald-400/80 rounded-xl p-5 shadow-md hover:shadow-lg hover:shadow-emerald-950/20 transition-all space-y-2.5 relative overflow-hidden group">
          {/* Top subtle glow accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 opacity-90" />

          <div className="flex items-center justify-between text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                {isAggregate ? '∑ Total Portfolio Capital' : `${activeMetrics.accountName} Capital`}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Reconciled
              </span>
            </div>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline justify-between pt-0.5">
            <span className="text-2xl font-extrabold font-mono text-white tracking-tight">
              ${activeMetrics.currentCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${
                activeMetrics.currentCapital >= activeMetrics.startingCapital
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              }`}
            >
              {activeMetrics.currentCapital >= activeMetrics.startingCapital ? '+' : ''}
              {(
                ((activeMetrics.currentCapital - activeMetrics.startingCapital) /
                  (activeMetrics.startingCapital || 1)) *
                100
              ).toFixed(1)}
              % vs start
            </span>
          </div>

          {/* Mathematical Reconciled Capital Equation */}
          <div className="pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Starting Capital:</span>
              <span className="font-bold text-slate-200">
                ${activeMetrics.startingCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">PnL & Net Flows:</span>
              <span
                className={`font-bold ${
                  activeMetrics.currentCapital >= activeMetrics.startingCapital
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                {activeMetrics.currentCapital >= activeMetrics.startingCapital ? '+' : ''}$
                {(activeMetrics.currentCapital - activeMetrics.startingCapital).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Cumulative Realized PnL (FILTERED) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">
              {isAggregate ? '∑ Combined Realized PnL' : `${activeMetrics.accountName} Realized PnL`}
            </span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span
              className={`text-2xl font-bold font-mono ${
                activeMetrics.cumulativePnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {activeMetrics.cumulativePnL >= 0 ? '+' : ''}$
              {activeMetrics.cumulativePnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-mono font-medium text-emerald-400">
              {activeMetrics.cumulativePnLPct >= 0 ? '+' : ''}
              {activeMetrics.cumulativePnLPct.toFixed(1)}% Return
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {isAggregate
              ? 'Sum of all realized returns across Farmland, Firmly & Gadget'
              : `Realized daily bot earnings and trade deductions for ${activeMetrics.accountName}`}
          </p>
        </div>

        {/* Metric 3: Daily Return & Win Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Avg Daily Return & Win Rate</span>
            <Percent className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white">
              {activeMetrics.dailyReturnAvg >= 0 ? '+' : ''}
              {activeMetrics.dailyReturnAvg.toFixed(3)}%
            </span>
            <span className="text-xs font-mono font-medium text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
              Win Rate: {activeMetrics.dayWinRate.toFixed(1)}% ({activeMetrics.winDaysCount}/{activeMetrics.totalDaysCount})
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Sharpe Ratio: <span className="font-mono text-slate-200">{activeMetrics.sharpeRatio.toFixed(2)}</span> • Daily StdDev: {activeMetrics.dailyReturnStdDev.toFixed(2)}%
          </p>
        </div>

        {/* Metric 4: Daily Profit Target & Goal Hit Rate (with Progress Bar) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Daily Profit Target</span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white">
              ${activeMetrics.dailyProfitTarget.toLocaleString()}
              <span className="text-xs text-slate-400 font-normal ml-1">/ day</span>
            </span>
            <span className="text-xs font-mono font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {activeMetrics.targetMetRate.toFixed(1)}% Hit Rate
            </span>
          </div>

          {/* Progress Bar inside Card 4 */}
          <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">
                {currentDayDate}: <strong className={isDrawdownDay ? 'text-rose-400' : 'text-emerald-400'}>
                  {currentDayPnL >= 0 ? '+' : ''}${currentDayPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </strong>
              </span>
              <span className={isTargetAchieved ? 'text-emerald-400 font-bold' : isDrawdownDay ? 'text-rose-400' : 'text-amber-400 font-semibold'}>
                {targetProgressPct.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isTargetAchieved
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : isDrawdownDay
                    ? 'bg-rose-500'
                    : 'bg-gradient-to-r from-amber-500 to-emerald-500'
                }`}
                style={{ width: `${clampedProgressPct}%` }}
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Met on {activeMetrics.targetMetDaysCount} of {activeMetrics.totalDaysCount} active days</span>
            <span className="text-emerald-400 font-medium">
              {isTargetAchieved ? '✓ Target Achieved' : `$${remainingToGoal.toLocaleString(undefined, { maximumFractionDigits: 0 })} to go`}
            </span>
          </p>
        </div>

        {/* Metric 5: Outstanding Loan Balance */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Outstanding Loan / Debt</span>
            <Landmark className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white">
              ${activeMetrics.currentLoanBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-mono font-medium text-slate-300">
              {activeMetrics.loanToCapitalRatio.toFixed(1)}% Debt/Cap
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Total borrowed operational leverage currently outstanding
          </p>
        </div>

        {/* Metric 6: Harvested Withdrawals */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Withdrawn to Safety</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              ${activeMetrics.totalWithdrawals.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-mono text-slate-400">
              Net Outflows: ${activeMetrics.netWithdrawals.toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Total capital removed to external cold storage or fiat accounts
          </p>
        </div>
      </div>

      {/* DEDICATED DAILY PROFIT TARGET PROGRESS COMPONENT */}
      <div
        id="daily-profit-target-progress-widget"
        className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                Performance Goal Tracker
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {isAggregate
                  ? `∑ Portfolio Target: $${dailyTarget.toLocaleString()}`
                  : `${activeMetrics.accountName} Target: $${dailyTarget.toLocaleString()}`}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 mt-1">
              <Target className="w-5 h-5 text-emerald-400" />
              <span>Daily Profit Target Progress</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live tracking showing how close the day's total PnL is to your planned daily profit target of ${dailyTarget.toLocaleString()}.
            </p>
          </div>

          {/* Day Selector */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-slate-400 font-mono">Evaluating:</span>
            <select
              value={targetEvalDayIndex}
              onChange={(e) => setTargetEvalDayIndex(Number(e.target.value))}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            >
              <option value={-1}>
                ⚡ Latest Active Day ({targetActiveDays[targetActiveDays.length - 1]?.day || 'Today'})
              </option>
              {targetActiveDays.map((d, idx) => (
                <option key={d.id || `day-opt-${idx}`} value={idx}>
                  Day #{idx + 1} ({d.day}): {d.dailyReturn >= 0 ? '+' : ''}${d.dailyReturn.toLocaleString()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Progress Bar & Amount Stats Box */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-slate-400 font-medium">Day's Total PnL vs Target:</span>
              <span
                className={`text-2xl font-bold font-mono ${
                  currentDayPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {currentDayPnL >= 0 ? '+' : ''}${currentDayPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-slate-500 font-mono text-sm">
                / ${dailyTarget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Target Status Badge */}
            <div className="flex items-center gap-2">
              {isTargetAchieved ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Target Achieved ({targetProgressPct.toFixed(1)}%)
                </span>
              ) : isDrawdownDay ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                  Day Drawdown (${Math.abs(currentDayPnL).toLocaleString()} loss)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  In Progress ({targetProgressPct.toFixed(1)}%) • ${remainingToGoal.toLocaleString(undefined, { minimumFractionDigits: 2 })} to go
                </span>
              )}
            </div>
          </div>

          {/* Visual Progress Bar Track */}
          <div className="relative pt-1 pb-4">
            <div className="w-full bg-slate-900 rounded-full h-4 overflow-hidden border border-slate-800 p-0.5 shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  isTargetAchieved
                    ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 shadow-md shadow-emerald-500/30'
                    : isDrawdownDay
                    ? 'bg-gradient-to-r from-rose-600 to-rose-500 shadow-md shadow-rose-500/20'
                    : 'bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500 shadow-md shadow-amber-500/20'
                }`}
                style={{ width: `${clampedProgressPct}%` }}
              />
            </div>

            {/* Milestone Tick Markers along the Progress Bar */}
            <div className="relative w-full flex justify-between text-[10px] text-slate-500 font-mono mt-1 px-1">
              <span className="text-slate-400">0% ($0)</span>
              <span className={clampedProgressPct >= 25 ? 'text-emerald-400' : 'text-slate-500'}>
                25% (${(dailyTarget * 0.25).toLocaleString()})
              </span>
              <span className={clampedProgressPct >= 50 ? 'text-emerald-400' : 'text-slate-500'}>
                50% (${(dailyTarget * 0.5).toLocaleString()})
              </span>
              <span className={clampedProgressPct >= 75 ? 'text-emerald-400' : 'text-slate-500'}>
                75% (${(dailyTarget * 0.75).toLocaleString()})
              </span>
              <span className={isTargetAchieved ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                100% Target (${dailyTarget.toLocaleString()})
              </span>
            </div>
          </div>

          {/* Quick Context Strip */}
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80 font-mono gap-2">
            <div className="flex items-center gap-3">
              <span>
                Evaluated Date: <strong className="text-white">{currentDayDate}</strong>
              </span>
              <span>•</span>
              <span>
                Goal Status:{' '}
                <strong className={isTargetAchieved ? 'text-emerald-400' : isDrawdownDay ? 'text-rose-400' : 'text-amber-400'}>
                  {isTargetAchieved
                    ? surplusBeyondGoal > 0
                      ? `+$${surplusBeyondGoal.toLocaleString()} Surplus beyond target`
                      : 'Target reached (100%)'
                    : isDrawdownDay
                    ? 'Day registered a net loss'
                    : `$${remainingToGoal.toLocaleString()} required to reach target`}
                </strong>
              </span>
            </div>
            <div className="text-slate-400">
              Account Target Hit Rate:{' '}
              <strong className="text-emerald-400">{activeMetrics.targetMetDaysCount}</strong> of{' '}
              {activeMetrics.totalDaysCount} days ({activeMetrics.targetMetRate.toFixed(1)}%)
            </div>
          </div>
        </div>
      </div>

      {/* SYNCHRONIZED DATE RANGE PICKER COMPONENT */}
      <DateRangePicker
        currentFilter={chartDateFilter}
        onChangeFilter={setChartDateFilter}
        filteredDaysCount={filteredDailyLogForCharts.length}
        filteredPnL={filteredPnLForCharts}
      />

      {/* RECHARTS LINE CHART: DAILY RETURN TREND OVER TIME */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                Recharts Dynamic Analytics
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {isAggregate ? '∑ All 3 Accounts Combined' : `Account: ${activeMetrics.accountName}`}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 mt-1">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              <span>
                {isAggregate
                  ? 'Daily Return Trend Over Time (Total Aggregate)'
                  : `${activeMetrics.accountName} — Daily Return Trend Over Time`}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Interactive time-series line chart tracking daily profit & loss realizations, Day 1 drawdown dip, and target baseline.
            </p>
          </div>

          {/* Controls: Unit Toggle ($ vs %) & Range Selector */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {/* Unit Toggle */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                id="recharts-unit-dollars-btn"
                onClick={() => setReturnMetricUnit('dollars')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  returnMetricUnit === 'dollars'
                    ? 'bg-slate-800 text-emerald-400 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                $ Return
              </button>
              <button
                id="recharts-unit-percent-btn"
                onClick={() => setReturnMetricUnit('percent')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  returnMetricUnit === 'percent'
                    ? 'bg-slate-800 text-emerald-400 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                % Return
              </button>
            </div>

            {/* Time Range Pills */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
              {[
                { label: '15D', days: 15 },
                { label: '30D', days: 30 },
                { label: '60D', days: 60 },
                { label: 'All Tracked', days: 0 },
              ].map((r) => (
                <button
                  key={r.label}
                  onClick={() => setReturnChartRange(r.days)}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    returnChartRange === r.days
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recharts Chart Container */}
        <div className="w-full h-80 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={rechartsDailyReturnData}
              margin={{ top: 15, right: 30, left: 15, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />

              <XAxis
                dataKey="date"
                stroke="#64748b"
                fontSize={11}
                fontFamily="monospace"
                tickLine={false}
                dy={8}
              />

              <YAxis
                stroke="#64748b"
                fontSize={11}
                fontFamily="monospace"
                tickLine={false}
                dx={-5}
                tickFormatter={(val) =>
                  returnMetricUnit === 'dollars'
                    ? `$${Number(val).toLocaleString()}`
                    : `${Number(val).toFixed(1)}%`
                }
              />

              <RechartsTooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const isPositive = (data.dailyReturn || 0) >= 0;
                    return (
                      <div className="bg-slate-950 border border-slate-700 p-3.5 rounded-xl shadow-2xl text-xs font-mono space-y-1.5 min-w-[210px]">
                        <div className="text-slate-400 font-bold border-b border-slate-800 pb-1 flex items-center justify-between">
                          <span>{label}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400 font-semibold">
                            {isAggregate ? 'Total Aggregate' : activeMetrics.accountName}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Daily Return:</span>
                          <span className={`font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPositive ? '+' : ''}${data.dailyReturn.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Daily Return %:</span>
                          <span className={data.dailyReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {data.dailyReturnPct >= 0 ? '+' : ''}{data.dailyReturnPct.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Ending Capital:</span>
                          <span className="text-white font-bold">
                            ${data.endingCapital.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                          <span className="text-amber-400">Planned Target:</span>
                          <span className="text-amber-300 font-bold">
                            ${data.target.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Zero PnL Reference Line */}
              <ReferenceLine
                y={0}
                stroke="#64748b"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                label={{
                  value: 'Break-Even (0)',
                  fill: '#94a3b8',
                  fontSize: 10,
                  position: 'insideBottomRight',
                }}
              />

              {/* Daily Profit Target Reference Line */}
              <ReferenceLine
                y={
                  returnMetricUnit === 'dollars'
                    ? activeMetrics.dailyProfitTarget
                    : (activeMetrics.dailyProfitTarget / (activeMetrics.startingCapital || 1)) * 100
                }
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                label={{
                  value: `Target: ${
                    returnMetricUnit === 'dollars'
                      ? '$' + activeMetrics.dailyProfitTarget.toLocaleString()
                      : (
                          (activeMetrics.dailyProfitTarget / (activeMetrics.startingCapital || 1)) *
                          100
                        ).toFixed(1) + '%'
                  }`,
                  fill: '#f59e0b',
                  fontSize: 10,
                  position: 'insideTopRight',
                }}
              />

              <Line
                type="monotone"
                dataKey={returnMetricUnit === 'dollars' ? 'dailyReturn' : 'dailyReturnPct'}
                name={returnMetricUnit === 'dollars' ? 'Daily Return ($)' : 'Daily Return (%)'}
                stroke={chartThemeColor}
                strokeWidth={2.5}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (!cx || !cy) return null;
                  const isNeg = (payload.dailyReturn || 0) < 0;
                  const isZero = (payload.dailyReturn || 0) === 0;
                  return (
                    <circle
                      key={`dot-${payload.date}-${payload.index}`}
                      cx={cx}
                      cy={cy}
                      r={isNeg ? 5 : isZero ? 2 : 4}
                      fill={isNeg ? '#f43f5e' : isZero ? '#64748b' : '#10b981'}
                      stroke="#0f172a"
                      strokeWidth={1.5}
                    />
                  );
                }}
                activeDot={{
                  r: 7,
                  strokeWidth: 2,
                  stroke: '#ffffff',
                  fill: chartThemeColor,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend / Key Footer */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800 gap-2 font-mono">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              Positive Profit Day
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
              Loss / Drawdown Day
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-500 inline-block border-t border-dashed"></span>
              Daily Target (${activeMetrics.dailyProfitTarget.toLocaleString()})
            </span>
          </div>
          <span>Showing {rechartsDailyReturnData.length} recorded daily cycles</span>
        </div>
      </div>

      {/* RECHARTS BAR CHART: DAILY PROFIT/LOSS AMOUNTS */}
      <DailyProfitLossBarChart
        dailyLog={filteredDailyLogForCharts}
        accountName={activeMetrics.accountName}
        isAggregate={isAggregate}
        plannedDailyProfit={activeMetrics.dailyProfitTarget}
        startingCapital={activeMetrics.startingCapital}
        dateRangeLabel={chartDateFilter.label}
      />

      {/* ========================================================================= */}
      {/* EXECUTIVE DASHBOARD: BOT STRATEGY EXECUTION BY MARKET CONDITION SUMMARY */}
      {/* ========================================================================= */}
      <div
        id="executive-market-conditions-summary"
        className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-md space-y-5"
      >
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                Executive Strategy Overview
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {isAggregate ? '∑ All Accounts Combined' : `${activeMetrics.accountName} Trading Bot`}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 mt-1">
              <Activity className="w-5 h-5 text-emerald-400" />
              <span>Bot Strategy Execution by Market Condition</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Breakdown of executed bot trades categorized by market regime (Bullish, Bearish, Sideways, Volatile) to evaluate strategy performance and drawdown resilience.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-2">
              <span className="text-slate-500">Total Trades:</span>
              <strong className="text-white font-bold">{marketConditionMetrics.totalTrades}</strong>
            </span>
            <button
              type="button"
              onClick={() => onNavigateToTab('transactions')}
              className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <span>View Ledger</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            </button>
          </div>
        </div>

        {/* 4 Color-Coded Pill-Style Condition Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. BULLISH (BUYING) PILL */}
          <div
            onClick={() => onNavigateToTab('transactions')}
            className="p-4 rounded-xl bg-slate-950/70 border border-emerald-500/30 hover:border-emerald-400 transition-all cursor-pointer group space-y-2.5 relative overflow-hidden"
            title="Click to view Bullish trades in Transactions"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-base">📈</span>
                <span className="text-xs font-bold text-emerald-400">Bullish</span>
                <span className="text-[10px] text-slate-400 font-mono">(Buying)</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs">
                {marketConditionMetrics.counts.Bullish.count} Trades
              </span>
            </div>

            <div className="space-y-1 pt-1 border-t border-slate-800/80">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-slate-400">Net Realized PnL:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {marketConditionMetrics.counts.Bullish.pnl >= 0 ? '+' : ''}$
                  {marketConditionMetrics.counts.Bullish.pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-slate-400">Win Rate:</span>
                <span className="font-mono font-semibold text-emerald-300">
                  {marketConditionMetrics.counts.Bullish.count > 0
                    ? ((marketConditionMetrics.counts.Bullish.wins / marketConditionMetrics.counts.Bullish.count) * 100).toFixed(0)
                    : '100'}%
                </span>
              </div>
              <div className="flex items-baseline justify-between text-[11px] text-slate-500">
                <span>Regime Share:</span>
                <span className="font-mono">
                  {((marketConditionMetrics.counts.Bullish.count / marketConditionMetrics.totalTrades) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* 2. BEARISH (SELLING) PILL */}
          <div
            onClick={() => onNavigateToTab('transactions')}
            className="p-4 rounded-xl bg-slate-950/70 border border-rose-500/30 hover:border-rose-400 transition-all cursor-pointer group space-y-2.5 relative overflow-hidden"
            title="Click to view Bearish trades in Transactions"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-base">📉</span>
                <span className="text-xs font-bold text-rose-400">Bearish</span>
                <span className="text-[10px] text-slate-400 font-mono">(Selling)</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-xs">
                {marketConditionMetrics.counts.Bearish.count} Trades
              </span>
            </div>

            <div className="space-y-1 pt-1 border-t border-slate-800/80">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-slate-400">Net Realized PnL:</span>
                <span className="font-mono font-bold text-rose-400">
                  {marketConditionMetrics.counts.Bearish.pnl >= 0 ? '+' : ''}$
                  {marketConditionMetrics.counts.Bearish.pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-slate-400">Win Rate:</span>
                <span className="font-mono font-semibold text-rose-300">
                  {marketConditionMetrics.counts.Bearish.count > 0
                    ? ((marketConditionMetrics.counts.Bearish.wins / marketConditionMetrics.counts.Bearish.count) * 100).toFixed(0)
                    : '0'}%
                </span>
              </div>
              <div className="flex items-baseline justify-between text-[11px] text-slate-500">
                <span>Regime Share:</span>
                <span className="font-mono">
                  {((marketConditionMetrics.counts.Bearish.count / marketConditionMetrics.totalTrades) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* 3. SIDEWAYS (GRID/RANGE) PILL */}
          <div
            onClick={() => onNavigateToTab('transactions')}
            className="p-4 rounded-xl bg-slate-950/70 border border-amber-500/30 hover:border-amber-400 transition-all cursor-pointer group space-y-2.5 relative overflow-hidden"
            title="Click to view Sideways trades in Transactions"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-base">↔️</span>
                <span className="text-xs font-bold text-amber-400">Sideways</span>
                <span className="text-[10px] text-slate-400 font-mono">(Grid/Range)</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs">
                {marketConditionMetrics.counts.Sideways.count} Trades
              </span>
            </div>

            <div className="space-y-1 pt-1 border-t border-slate-800/80">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-slate-400">Net Realized PnL:</span>
                <span className="font-mono font-bold text-amber-400">
                  {marketConditionMetrics.counts.Sideways.pnl >= 0 ? '+' : ''}$
                  {marketConditionMetrics.counts.Sideways.pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-slate-400">Win Rate:</span>
                <span className="font-mono font-semibold text-amber-300">
                  {marketConditionMetrics.counts.Sideways.count > 0
                    ? ((marketConditionMetrics.counts.Sideways.wins / marketConditionMetrics.counts.Sideways.count) * 100).toFixed(0)
                    : '100'}%
                </span>
              </div>
              <div className="flex items-baseline justify-between text-[11px] text-slate-500">
                <span>Regime Share:</span>
                <span className="font-mono">
                  {((marketConditionMetrics.counts.Sideways.count / marketConditionMetrics.totalTrades) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* 4. VOLATILE (SPIKES/CHOPPY) PILL */}
          <div
            onClick={() => onNavigateToTab('transactions')}
            className="p-4 rounded-xl bg-slate-950/70 border border-purple-500/30 hover:border-purple-400 transition-all cursor-pointer group space-y-2.5 relative overflow-hidden"
            title="Click to view Volatile trades in Transactions"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-base">⚡</span>
                <span className="text-xs font-bold text-purple-400">Volatile</span>
                <span className="text-[10px] text-slate-400 font-mono">(Spikes)</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-xs">
                {marketConditionMetrics.counts.Volatile.count} Trades
              </span>
            </div>

            <div className="space-y-1 pt-1 border-t border-slate-800/80">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-slate-400">Net Realized PnL:</span>
                <span className="font-mono font-bold text-purple-400">
                  {marketConditionMetrics.counts.Volatile.pnl >= 0 ? '+' : ''}$
                  {marketConditionMetrics.counts.Volatile.pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-slate-400">Win Rate:</span>
                <span className="font-mono font-semibold text-purple-300">
                  {marketConditionMetrics.counts.Volatile.count > 0
                    ? ((marketConditionMetrics.counts.Volatile.wins / marketConditionMetrics.counts.Volatile.count) * 100).toFixed(0)
                    : '50'}%
                </span>
              </div>
              <div className="flex items-baseline justify-between text-[11px] text-slate-500">
                <span>Regime Share:</span>
                <span className="font-mono">
                  {((marketConditionMetrics.counts.Volatile.count / marketConditionMetrics.totalTrades) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Stacked Distribution Bar */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 font-semibold text-slate-300">
              <span>Strategy Market Regime Distribution:</span>
            </span>
            <span>{marketConditionMetrics.totalTrades} Executed Trades = 100%</span>
          </div>

          <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800 flex p-0.5">
            {marketConditionMetrics.counts.Bullish.count > 0 && (
              <div
                style={{ width: `${(marketConditionMetrics.counts.Bullish.count / marketConditionMetrics.totalTrades) * 100}%` }}
                className="h-full bg-emerald-500 rounded-l-full transition-all duration-500"
                title={`Bullish: ${marketConditionMetrics.counts.Bullish.count} trades (${((marketConditionMetrics.counts.Bullish.count / marketConditionMetrics.totalTrades) * 100).toFixed(1)}%)`}
              />
            )}
            {marketConditionMetrics.counts.Sideways.count > 0 && (
              <div
                style={{ width: `${(marketConditionMetrics.counts.Sideways.count / marketConditionMetrics.totalTrades) * 100}%` }}
                className="h-full bg-amber-500 transition-all duration-500"
                title={`Sideways: ${marketConditionMetrics.counts.Sideways.count} trades (${((marketConditionMetrics.counts.Sideways.count / marketConditionMetrics.totalTrades) * 100).toFixed(1)}%)`}
              />
            )}
            {marketConditionMetrics.counts.Bearish.count > 0 && (
              <div
                style={{ width: `${(marketConditionMetrics.counts.Bearish.count / marketConditionMetrics.totalTrades) * 100}%` }}
                className="h-full bg-rose-500 transition-all duration-500"
                title={`Bearish: ${marketConditionMetrics.counts.Bearish.count} trades (${((marketConditionMetrics.counts.Bearish.count / marketConditionMetrics.totalTrades) * 100).toFixed(1)}%)`}
              />
            )}
            {marketConditionMetrics.counts.Volatile.count > 0 && (
              <div
                style={{ width: `${(marketConditionMetrics.counts.Volatile.count / marketConditionMetrics.totalTrades) * 100}%` }}
                className="h-full bg-purple-500 rounded-r-full transition-all duration-500"
                title={`Volatile: ${marketConditionMetrics.counts.Volatile.count} trades (${((marketConditionMetrics.counts.Volatile.count / marketConditionMetrics.totalTrades) * 100).toFixed(1)}%)`}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                <span>Bullish ({((marketConditionMetrics.counts.Bullish.count / marketConditionMetrics.totalTrades) * 100).toFixed(0)}%)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                <span>Sideways ({((marketConditionMetrics.counts.Sideways.count / marketConditionMetrics.totalTrades) * 100).toFixed(0)}%)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                <span>Bearish ({((marketConditionMetrics.counts.Bearish.count / marketConditionMetrics.totalTrades) * 100).toFixed(0)}%)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span>
                <span>Volatile ({((marketConditionMetrics.counts.Volatile.count / marketConditionMetrics.totalTrades) * 100).toFixed(0)}%)</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenAddTx}
                className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Record New Trade Event</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3-BOT CUMULATIVE PROFIT COMPARISON BAR CHART */}
      <BotProfitComparisonChart
        accounts={allAccountsData}
        dateRangeFilter={chartDateFilter}
      />

      {/* CALENDAR-BASED ROI % HEATMAP */}
      <CalendarRoiHeatmap
        dailyLog={filteredDailyLogForCharts}
        accountName={activeMetrics.accountName}
        isAggregate={isAggregate}
        dateRangeLabel={chartDateFilter.label}
      />

      {/* Main Chart Section: Equity Curve (Capital over Time) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              <span>
                {isAggregate
                  ? 'Total Combined Equity Curve (Farmland + Firmly + Gadget)'
                  : `${activeMetrics.accountName} Equity Curve & Running Capital`}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Mathematical running capital over time, factoring Day 1 initial losses, cash flows, and daily returns.
            </p>
          </div>

          {hoveredPoint && (
            <div className="flex items-center gap-4 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
              <span className="text-slate-400">Date: <strong className="text-white">{hoveredPoint.date}</strong></span>
              <span className="text-slate-400">Capital: <strong className="text-emerald-400">${hoveredPoint.endCapital.toLocaleString()}</strong></span>
              <span className="text-slate-400">
                Return: <strong className={hoveredPoint.dailyReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {hoveredPoint.dailyReturn >= 0 ? '+' : ''}${hoveredPoint.dailyReturn.toLocaleString()} ({hoveredPoint.dailyReturnPct.toFixed(1)}%)
                </strong>
              </span>
            </div>
          )}
        </div>

        {/* Responsive SVG Chart */}
        <div className="w-full overflow-x-auto">
          <div className="min-w-[700px]">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-auto select-none"
            >
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                const yVal = minCap + pct * capRange;
                const y = getY(yVal);
                return (
                  <g key={idx}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={chartWidth - padding.right}
                      y2={y}
                      stroke="#334155"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 4}
                      fill="#94a3b8"
                      fontSize="10"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      ${Math.round(yVal / 1000)}k
                    </text>
                  </g>
                );
              })}

              {/* Area under equity line */}
              {equityAreaPath && (
                <path d={equityAreaPath} fill="url(#equityGrad)" />
              )}

              {/* Baseline (Starting Capital) */}
              <line
                x1={padding.left}
                y1={getY(activeMetrics.startingCapital)}
                x2={chartWidth - padding.right}
                y2={getY(activeMetrics.startingCapital)}
                stroke="#64748b"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />

              {/* Equity Line */}
              {equityLinePath && (
                <path
                  d={equityLinePath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data points & hover triggers */}
              {chartDays.map((s, i) => {
                const cx = getX(i);
                const cy = getY(s.endingCapital);
                const isHovered = hoveredPoint?.date === s.day;
                return (
                  <g key={s.id || s.day}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 6 : 3}
                      fill={isHovered ? '#34d399' : '#10b981'}
                      stroke="#0f172a"
                      strokeWidth="2"
                      className="cursor-pointer transition-all"
                      onMouseEnter={() =>
                        setHoveredPoint({
                          date: s.day,
                          endCapital: s.endingCapital,
                          dailyReturnPct: s.dailyReturnPct,
                          dailyReturn: s.dailyReturn,
                        })
                      }
                    />
                    {/* Date label at intervals */}
                    {(i === 0 || i === Math.floor(chartDays.length / 2) || i === chartDays.length - 1) && (
                      <text
                        x={cx}
                        y={chartHeight - 12}
                        fill="#94a3b8"
                        fontSize="10"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {s.day}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-500 inline-block"></span> Running Capital
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-slate-500 inline-block border-t border-dashed"></span> Starting Capital Baseline (${activeMetrics.startingCapital.toLocaleString()})
            </span>
          </div>
          <span>Hover data points to inspect daily metrics</span>
        </div>
      </div>

      {/* Two Column Layout: Daily Returns Histogram & Capital Deconstruction */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Returns Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Daily Return % Performance</h3>
              <p className="text-xs text-slate-400">
                Formula: (EOD Capital - Start Capital - Net Inflows) / Start Capital
              </p>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              Avg: {activeMetrics.dailyReturnAvg.toFixed(3)}%
            </span>
          </div>

          <div className="w-full overflow-x-auto">
            <div className="min-w-[400px]">
              <svg viewBox={`0 0 ${chartWidth} ${barChartHeight}`} className="w-full h-auto">
                {/* Zero line */}
                <line
                  x1={padding.left}
                  y1={barZeroY}
                  x2={chartWidth - padding.right}
                  y2={barZeroY}
                  stroke="#475569"
                  strokeWidth="1"
                />

                {chartDays.map((s, i) => {
                  const x = getX(i);
                  const barH = (Math.abs(s.dailyReturnPct) / maxReturn) * (barChartHeight / 2 - 10);
                  const y = s.dailyReturnPct >= 0 ? barZeroY - barH : barZeroY;
                  const isPositive = s.dailyReturnPct >= 0;

                  return (
                    <g key={s.id || s.day}>
                      <rect
                        x={x - 4}
                        y={y}
                        width="8"
                        height={Math.max(2, barH)}
                        fill={isPositive ? '#10b981' : '#f43f5e'}
                        rx="1"
                        className="opacity-85 hover:opacity-100 cursor-pointer"
                        onMouseEnter={() =>
                          setHoveredPoint({
                            date: s.day,
                            endCapital: s.endingCapital,
                            dailyReturnPct: s.dailyReturnPct,
                            dailyReturn: s.dailyReturn,
                          })
                        }
                      />
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
            <span className="text-emerald-400 font-mono">▲ Positive Days: {activeMetrics.winDaysCount}</span>
            <span className="text-rose-400 font-mono">▼ Drawdown Days: {activeMetrics.totalDaysCount - activeMetrics.winDaysCount}</span>
          </div>
        </div>

        {/* Capital Flows & Financial Health */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Capital Flow & Debt Deconstruction
              </h3>
              <p className="text-xs text-slate-400">
                {isAggregate ? 'Combined across all 3 accounts' : `Detailed breakdown for ${activeMetrics.accountName}`}
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('farmland')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
            >
              Open Daily Sheet →
            </button>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white">Starting Capital Baseline</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Initial principal committed</span>
              </div>
              <span className="font-mono text-sm font-bold text-white">
                ${activeMetrics.startingCapital.toLocaleString()}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white">Net External Deposits & Withdrawals</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Deposits: ${activeMetrics.totalDeposits.toLocaleString()} • Withdrawals: ${activeMetrics.totalWithdrawals.toLocaleString()}
                </span>
              </div>
              <span className={`font-mono text-sm font-bold ${activeMetrics.totalDeposits >= activeMetrics.totalWithdrawals ? 'text-blue-400' : 'text-purple-400'}`}>
                {activeMetrics.totalDeposits >= activeMetrics.totalWithdrawals ? '+' : ''}${(activeMetrics.totalDeposits - activeMetrics.totalWithdrawals).toLocaleString()}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white">Cumulative Trading Net PnL</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Total realized trade gain & loss adjustments</span>
              </div>
              <span className={`font-mono text-sm font-bold ${activeMetrics.cumulativePnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {activeMetrics.cumulativePnL >= 0 ? '+' : ''}${activeMetrics.cumulativePnL.toLocaleString()}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white">Outstanding Debt / Loan Balance</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Debt-to-Capital: {activeMetrics.loanToCapitalRatio.toFixed(1)}%
                </span>
              </div>
              <span className={`font-mono text-sm font-bold ${activeMetrics.currentLoanBalance > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                ${activeMetrics.currentLoanBalance.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
