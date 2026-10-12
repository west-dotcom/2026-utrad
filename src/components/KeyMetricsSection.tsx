import React from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Percent,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Sparkles,
  Award,
} from 'lucide-react';
import { AccountMetrics } from '../data/accountsData';

interface KeyMetricsSectionProps {
  metrics: AccountMetrics;
  isAggregate?: boolean;
  onNavigateToTab?: (tab: string) => void;
  onOpenAddTx?: () => void;
}

export function KeyMetricsSection({
  metrics,
  isAggregate = false,
  onNavigateToTab,
  onOpenAddTx,
}: KeyMetricsSectionProps) {
  const {
    currentCapital,
    startingCapital,
    cumulativePnL,
    cumulativePnLPct,
    dayWinRate,
    winDaysCount,
    totalDaysCount,
    dailyLog,
    accountName,
  } = metrics;

  // 1. Calculate Capital Trend vs Starting Capital
  const capitalDelta = currentCapital - startingCapital;
  const capitalGrowthPct = startingCapital > 0 ? (capitalDelta / startingCapital) * 100 : 0;
  const isCapitalPositive = capitalDelta >= 0;

  // 2. Total PnL Trend & status
  const isPnLPositive = cumulativePnL >= 0;

  // 3. Win Rate Trend (compare latest 7 recorded days vs overall win rate)
  const activeDays = (dailyLog || []).filter((r) => r.dailyReturn !== 0);
  const recent7Days = activeDays.slice(-7);
  const recent7Wins = recent7Days.filter((r) => r.dailyReturn > 0).length;
  const recent7WinRate = recent7Days.length > 0 ? (recent7Wins / recent7Days.length) * 100 : dayWinRate;
  const winRateTrendDiff = recent7WinRate - dayWinRate;

  // 4. Average Daily Profit ($ amount per active day)
  const totalRealizedDays = activeDays.length;
  const avgDailyProfitDollar =
    totalRealizedDays > 0 ? cumulativePnL / totalRealizedDays : 0;
  const isAvgProfitPositive = avgDailyProfitDollar >= 0;

  // Mini sparkline data for last 8 active days
  const sparklineDays = activeDays.slice(-8);
  const sparklineValues = sparklineDays.map((d) => d.dailyReturn);
  const minSpark = Math.min(...sparklineValues, 0);
  const maxSpark = Math.max(...sparklineValues, 1);
  const sparkRange = maxSpark - minSpark || 1;

  return (
    <section aria-label="Key Metrics Overview" className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-mono">
            <span>Key Metrics</span>
            <span className="text-slate-500 font-normal">|</span>
            <span className="text-xs text-slate-400 normal-case font-sans">
              {isAggregate ? 'Portfolio Aggregate Overview' : `${accountName} Performance`}
            </span>
          </h3>
        </div>
        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            <Activity className="w-3 h-3 text-emerald-400" />
            <span>{totalDaysCount} Recorded Trading Days</span>
          </span>
        </div>
      </div>

      {/* 4 Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: Current Total Capital */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-4.5 shadow-sm transition-all group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 opacity-80" />
          
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Current Total Capital
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-1">
            <span className="text-2xl font-extrabold font-mono text-white tracking-tight">
              ${currentCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Trend Indicator */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <div
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[11px] font-bold ${
                isCapitalPositive
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
              }`}
            >
              {isCapitalPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span>
                {isCapitalPositive ? '+' : ''}
                {capitalGrowthPct.toFixed(1)}%
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              vs ${startingCapital.toLocaleString()} start
            </span>
          </div>
        </div>

        {/* CARD 2: Total PnL */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 hover:border-blue-500/50 rounded-xl p-4.5 shadow-sm transition-all group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-indigo-400 to-cyan-500 opacity-80" />

          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Total PnL
            </span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 ${
              isPnLPositive
                ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
            }`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-1">
            <span
              className={`text-2xl font-extrabold font-mono tracking-tight ${
                isPnLPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isPnLPositive ? '+' : ''}$
              {cumulativePnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Trend Indicator */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <div
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[11px] font-bold ${
                isPnLPositive
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
              }`}
            >
              {isPnLPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span>
                {cumulativePnLPct >= 0 ? '+' : ''}
                {cumulativePnLPct.toFixed(1)}% ROI
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Net Bot Profit
            </span>
          </div>
        </div>

        {/* CARD 3: Win Rate Percentage */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 hover:border-amber-500/50 rounded-xl p-4.5 shadow-sm transition-all group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 opacity-80" />

          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Win Rate Percentage
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
              <Percent className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-1">
            <span className="text-2xl font-extrabold font-mono text-white tracking-tight">
              {dayWinRate.toFixed(1)}%
            </span>
            <span className="text-xs font-mono text-slate-400">
              {winDaysCount}W / {totalDaysCount - winDaysCount}L
            </span>
          </div>

          {/* Trend Indicator */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <div
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[11px] font-bold ${
                winRateTrendDiff >= 0
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              }`}
              title={`Last 7 days win rate: ${recent7WinRate.toFixed(1)}%`}
            >
              {winRateTrendDiff >= 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>
                {recent7WinRate.toFixed(1)}% 7D
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {dayWinRate >= 80 ? '🔥 High Precision' : dayWinRate >= 60 ? '⚡ Consistent' : '⚖️ Balanced'}
            </span>
          </div>
        </div>

        {/* CARD 4: Average Daily Profit */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 hover:border-purple-500/50 rounded-xl p-4.5 shadow-sm transition-all group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 via-fuchsia-400 to-pink-500 opacity-80" />

          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Average Daily Profit
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-1">
            <span
              className={`text-2xl font-extrabold font-mono tracking-tight ${
                isAvgProfitPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isAvgProfitPositive ? '+' : ''}$
              {avgDailyProfitDollar.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xs text-slate-400 font-normal ml-1">/day</span>
            </span>
          </div>

          {/* Trend Indicator */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <div
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[11px] font-bold ${
                isAvgProfitPositive
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
              }`}
            >
              {isAvgProfitPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span>
                {metrics.dailyReturnAvg >= 0 ? '+' : ''}
                {metrics.dailyReturnAvg.toFixed(2)}% /day
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Target: ${metrics.dailyProfitTarget.toLocaleString()}/d
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
