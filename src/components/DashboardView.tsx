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
import { DailySnapshot, LedgerSummary, BotStrategyStats } from '../types';
import {
  loadAccountData,
  calculateAccountMetrics,
  calculateAggregateMetrics,
  AccountMetrics,
} from '../data/accountsData';
import { DailyProfitLossBarChart } from './DailyProfitLossBarChart';
import { CalendarRoiHeatmap } from './CalendarRoiHeatmap';
import { DateRangePicker, DateRangeFilter } from './DateRangePicker';
import { BotProfitComparisonChart } from './BotProfitComparisonChart';

interface DashboardViewProps {
  summary: LedgerSummary;
  snapshots: DailySnapshot[];
  botStats?: BotStrategyStats[];
  selectedAccountId?: string;
  onSelectAccount?: (id: string) => void;
  onNavigateToTab: (tab: string) => void;
  onOpenAddTx: () => void;
}

export function DashboardView({
  summary,
  snapshots,
  botStats,
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

  // Load all 3 core accounts: Farmland, Firmly, Gadget
  const accountIds = useMemo(() => ['farmland', 'firmly', 'gadget'], []);

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
    startDate: '2025-05-01',
    endDate: '2025-05-30',
    label: '30 Days (May 1 - May 30, 2025)',
  });

  // Filter dailyLog by the active date range window
  const filteredDailyLogForCharts = useMemo(() => {
    if (!activeMetrics.dailyLog || activeMetrics.dailyLog.length === 0) return [];

    const start = new Date(chartDateFilter.startDate + 'T00:00:00');
    const end = new Date(chartDateFilter.endDate + 'T23:59:59');

    const filtered = activeMetrics.dailyLog.filter((row) => {
      if (!row.day) return false;
      let y = 2025;
      let m = 5;
      let d = 1;
      if (row.day.includes('/')) {
        const parts = row.day.split('/');
        m = parseInt(parts[0], 10);
        d = parseInt(parts[1], 10);
        y = parseInt(parts[2], 10);
      } else if (row.day.includes('-')) {
        const parts = row.day.split('-');
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
        d = parseInt(parts[2], 10);
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
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'farmland', label: 'Farmland', icon: Sprout, color: 'text-emerald-400' },
              { id: 'firmly', label: 'Firmly', icon: Building2, color: 'text-blue-400' },
              { id: 'gadget', label: 'Gadget', icon: Cpu, color: 'text-purple-400' },
            ].map((acc) => {
              const Icon = acc.icon;
              const isSelected = selectedAccountId === acc.id;
              return (
                <button
                  key={acc.id}
                  onClick={() => onSelectAccount && onSelectAccount(acc.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 text-white font-bold border border-slate-700 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${acc.color}`} />
                  <span>{acc.label}</span>
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
                Summing All 3 Trading Accounts (Farmland + Firmly + Gadget)
              </span>
            </div>
            <span className="text-xs text-emerald-400 font-mono font-bold">
              Total Capital: ${aggregateMetrics.currentCapital.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* 3 Accounts Comparative Snapshot Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
        {/* Metric 1: Current Capital (FILTERED) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">
              {isAggregate ? '∑ Total Portfolio Capital' : `${activeMetrics.accountName} Capital`}
            </span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white">
              ${activeMetrics.currentCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span
              className={`text-xs font-mono font-medium flex items-center ${
                activeMetrics.currentCapital >= activeMetrics.startingCapital ? 'text-emerald-400' : 'text-rose-400'
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
          <p className="text-[11px] text-slate-400">
            Starting: ${activeMetrics.startingCapital.toLocaleString()} • Net Inflows: ${activeMetrics.totalDeposits.toLocaleString()}
          </p>
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
