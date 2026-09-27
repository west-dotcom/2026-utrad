import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart2,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { DailyLogRow } from '../data/accountsData';

interface DailyProfitLossBarChartProps {
  dailyLog: DailyLogRow[];
  accountName: string;
  isAggregate?: boolean;
  plannedDailyProfit?: number;
  startingCapital?: number;
  dateRangeLabel?: string;
}

export function DailyProfitLossBarChart({
  dailyLog,
  accountName,
  isAggregate = false,
  plannedDailyProfit = 1280,
  startingCapital = 5000,
  dateRangeLabel,
}: DailyProfitLossBarChartProps) {
  // Range selection: 'all' (uses all filtered days from parent) or specific slice
  const [dayRange, setDayRange] = useState<number | 'auto'>('auto');

  // Filter and prepare dataset
  const chartData = useMemo(() => {
    if (!dailyLog || dailyLog.length === 0) return [];

    // If dayRange is 'auto' (default), use all filtered days passed from DateRangePicker
    const selectedDays =
      dayRange === 'auto'
        ? dailyLog
        : dayRange === 0
        ? dailyLog.filter((d, idx) => idx === 0 || d.dailyReturn !== 0)
        : dailyLog.slice(0, dayRange);

    return selectedDays.map((d, index) => {
      const pnl = Number(d.dailyReturn) || 0;
      return {
        id: d.id || `day-${index}`,
        index: index + 1,
        date: d.day,
        pnl,
        pnlFormatted: `${pnl >= 0 ? '+' : ''}$${pnl.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        pnlPct: Number(d.dailyReturnPct || 0).toFixed(2),
        endingCapital: Number(d.endingCapital) || 0,
        isPositive: pnl > 0,
        isNegative: pnl < 0,
        isZero: pnl === 0,
        target: plannedDailyProfit,
      };
    });
  }, [dailyLog, dayRange, plannedDailyProfit]);

  // Summary statistics for the selected period
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return {
        totalPnL: 0,
        winCount: 0,
        lossCount: 0,
        zeroCount: 0,
        winRate: 0,
        bestDay: 0,
        worstDay: 0,
        avgDailyPnL: 0,
      };
    }

    let totalPnL = 0;
    let winCount = 0;
    let lossCount = 0;
    let zeroCount = 0;
    let bestDay = chartData[0]?.pnl || 0;
    let worstDay = chartData[0]?.pnl || 0;

    for (const d of chartData) {
      totalPnL += d.pnl;
      if (d.pnl > 0) winCount++;
      else if (d.pnl < 0) lossCount++;
      else zeroCount++;

      if (d.pnl > bestDay) bestDay = d.pnl;
      if (d.pnl < worstDay) worstDay = d.pnl;
    }

    const activeDaysCount = winCount + lossCount;
    const winRate = activeDaysCount > 0 ? (winCount / activeDaysCount) * 100 : 0;
    const avgDailyPnL = chartData.length > 0 ? totalPnL / chartData.length : 0;

    return {
      totalPnL,
      winCount,
      lossCount,
      zeroCount,
      winRate,
      bestDay,
      worstDay,
      avgDailyPnL,
    };
  }, [chartData]);

  // Compute dynamic domain bounds with comfortable padding
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [-4000, 2000];
    const pnlVals = chartData.map((d) => d.pnl);
    const minVal = Math.min(...pnlVals, -100);
    const maxVal = Math.max(...pnlVals, plannedDailyProfit, 100);
    const padding = Math.max(Math.abs(minVal), Math.abs(maxVal)) * 0.15;

    return [
      Math.floor((minVal - padding) / 500) * 500,
      Math.ceil((maxVal + padding) / 500) * 500,
    ];
  }, [chartData, plannedDailyProfit]);

  return (
    <div
      id="daily-pnl-bar-chart"
      className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5"
    >
      {/* Top Header & Range Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              Visual Performance Trends
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {isAggregate ? '∑ Sum of All 3 Accounts' : `Account: ${accountName}`}
            </span>
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 mt-1">
            <BarChart2 className="w-5 h-5 text-emerald-400" />
            <span>
              {dateRangeLabel
                ? `${isAggregate ? 'Total Aggregate' : accountName} — Daily Profit/Loss (${dateRangeLabel})`
                : isAggregate
                ? 'Daily Profit/Loss Amounts — Last 30 Days (Aggregate)'
                : `${accountName} — Daily Profit/Loss Amounts (Last 30 Days)`}
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Color-coded bar chart displaying individual daily trading profits, one-off drawdown losses, and target benchmarks.
          </p>
        </div>

        {/* Range Selector Pills */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono self-start md:self-auto">
          {[
            { label: `Active Window (${dailyLog.length}d)`, days: 'auto' as const },
            { label: 'Last 14 Days', days: 14 as const },
            { label: 'All Recorded', days: 0 as const },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => setDayRange(item.days)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                dayRange === item.days
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Performance Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* Net 30D PnL */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Period Net P&L</span>
            <DollarSign className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div
            className={`text-lg font-bold font-mono ${
              stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {stats.totalPnL >= 0 ? '+' : ''}$
            {stats.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500 font-mono block">
            Across {chartData.length} recorded cycles
          </span>
        </div>

        {/* Best Single Day */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Best Day (Max Profit)</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400">
            {stats.bestDay >= 0 ? '+' : ''}$
            {stats.bestDay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500 font-mono block">
            Target: ${plannedDailyProfit.toLocaleString()}
          </span>
        </div>

        {/* Worst Single Day / Drawdown */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Max Drawdown / Loss</span>
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div
            className={`text-lg font-bold font-mono ${
              stats.worstDay < 0 ? 'text-rose-400' : 'text-slate-300'
            }`}
          >
            {stats.worstDay >= 0 ? '+' : ''}$
            {stats.worstDay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500 font-mono block">
            {stats.worstDay < 0 ? 'Historical Day 1 one-off' : 'No loss days'}
          </span>
        </div>

        {/* Win Rate & Positive Days */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Profitable Days</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400">
            {stats.winCount}{' '}
            <span className="text-xs text-slate-500 font-normal">
              / {stats.winCount + stats.lossCount} active
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono block">
            Win Rate: <strong className="text-emerald-400">{stats.winRate.toFixed(1)}%</strong>
          </span>
        </div>

        {/* Average Daily Return */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 col-span-2 sm:col-span-1">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Avg Daily P&L</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div
            className={`text-lg font-bold font-mono ${
              stats.avgDailyPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {stats.avgDailyPnL >= 0 ? '+' : ''}$
            {stats.avgDailyPnL.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <span className="text-[10px] text-slate-500 font-mono block">
            Per calendar trading day
          </span>
        </div>
      </div>

      {/* Recharts Bar Chart Container */}
      <div className="w-full h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 25 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.35} />

            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={11}
              fontFamily="monospace"
              tickLine={false}
              dy={8}
            />

            <YAxis
              domain={yDomain}
              stroke="#64748b"
              fontSize={11}
              fontFamily="monospace"
              tickLine={false}
              dx={-5}
              tickFormatter={(val) => `$${Number(val).toLocaleString()}`}
            />

            {/* Zero Break-Even Reference Line */}
            <ReferenceLine
              y={0}
              stroke="#64748b"
              strokeWidth={1.5}
              label={{
                value: '$0.00 Break-Even',
                fill: '#94a3b8',
                fontSize: 10,
                position: 'insideBottomRight',
              }}
            />

            {/* Target Daily Profit Benchmark Line */}
            <ReferenceLine
              y={plannedDailyProfit}
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              label={{
                value: `Target: $${plannedDailyProfit.toLocaleString()}`,
                fill: '#f59e0b',
                fontSize: 10,
                position: 'insideTopRight',
              }}
            />

            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const isProfit = (data.pnl || 0) > 0;
                  const isLoss = (data.pnl || 0) < 0;

                  return (
                    <div className="bg-slate-950 border border-slate-700 p-4 rounded-xl shadow-2xl text-xs font-mono space-y-2 min-w-[220px]">
                      <div className="text-slate-400 font-bold border-b border-slate-800 pb-1.5 flex items-center justify-between">
                        <span>{label}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400 font-semibold">
                          {isAggregate ? 'Total Aggregate' : accountName}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Daily Profit/Loss:</span>
                        <span
                          className={`font-bold text-sm ${
                            isProfit
                              ? 'text-emerald-400'
                              : isLoss
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {data.pnlFormatted}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Daily Return %:</span>
                        <span
                          className={
                            data.pnl >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
                          }
                        >
                          {data.pnl >= 0 ? '+' : ''}
                          {data.pnlPct}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Ending Capital:</span>
                        <span className="text-white font-bold">
                          $
                          {data.endingCapital.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-800 text-[11px]">
                        <span className="text-amber-400">Target Benchmark:</span>
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

            {/* Bar with dynamic color coding for profit vs loss */}
            <Bar dataKey="pnl" name="Daily Profit/Loss" radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={`cell-${entry.id}`}
                  fill={
                    entry.pnl > 0
                      ? '#10b981' // Emerald green for profit
                      : entry.pnl < 0
                      ? '#f43f5e' // Rose red for loss/drawdown
                      : '#475569' // Slate for zero
                  }
                  opacity={0.9}
                  className="hover:opacity-100 transition-opacity cursor-pointer"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Guide Footer */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800 gap-2 font-mono">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
            Profitable Day (+PnL)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-500 inline-block"></span>
            Drawdown / Loss Day (-PnL)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber-500 inline-block border-t border-dashed"></span>
            Daily Profit Target (${plannedDailyProfit.toLocaleString()})
          </span>
        </div>
        <span className="text-slate-500">
          Showing {chartData.length} days • Hover any bar to view exact figures
        </span>
      </div>
    </div>
  );
}
