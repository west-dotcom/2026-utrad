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
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Bot,
  TrendingUp,
  Award,
  BarChart3,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { AccountData, DailyLogRow } from '../data/accountsData';

interface BotProfitComparisonChartProps {
  accounts: AccountData[];
  dateRangeFilter: {
    startDate: string;
    endDate: string;
    label: string;
  };
}

interface BotPeriodMetrics {
  id: string;
  name: string;
  type: string;
  color: string;
  startingCapital: number;
  cumulativeProfit: number;
  roiPct: number;
  winRate: number;
  winningDays: number;
  totalDays: number;
  avgDailyProfit: number;
  peakDailyProfit: number;
  worstDailyProfit: number;
}

export function BotProfitComparisonChart({
  accounts,
  dateRangeFilter,
}: BotProfitComparisonChartProps) {
  // Metric mode: 'cumulative' ($ summary), 'roi' (% summary), or 'timeline' (daily progression)
  const [comparisonMode, setComparisonMode] = useState<'cumulative' | 'roi' | 'timeline'>(
    'cumulative'
  );

  // Helper date parser
  const parseRowDate = (dayStr: string): Date => {
    if (!dayStr) return new Date();
    if (dayStr.includes('/')) {
      const parts = dayStr.split('/');
      return new Date(parseInt(parts[2], 10), parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
    }
    if (dayStr.includes('-')) {
      const parts = dayStr.split('-');
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date(dayStr);
  };

  // Compute metrics for each bot over the selected date range
  const { botMetrics, timelineData, topBot, maxProfit } = useMemo(() => {
    const start = new Date(dateRangeFilter.startDate + 'T00:00:00');
    const end = new Date(dateRangeFilter.endDate + 'T23:59:59');

    // 1. Filter dailyLog for each bot
    const filteredByBot = accounts.map((acc) => {
      const rows = (acc.dailyLog || []).filter((r) => {
        const d = parseRowDate(r.day);
        return d >= start && d <= end;
      });
      return {
        account: acc,
        rows,
      };
    });

    // 2. Compute individual bot metrics
    const metrics: BotPeriodMetrics[] = filteredByBot.map(({ account, rows }) => {
      let cumProfit = 0;
      let winCount = 0;
      let activeDaysCount = 0;
      let peakProfit = -Infinity;
      let worstProfit = Infinity;

      for (const r of rows) {
        const pnl = Number(r.dailyReturn) || 0;
        cumProfit += pnl;
        if (pnl > 0) winCount++;
        if (pnl !== 0) activeDaysCount++;
        if (pnl > peakProfit) peakProfit = pnl;
        if (pnl < worstProfit) worstProfit = pnl;
      }

      const totalDays = rows.length;
      const startCap = account.assumptions?.startingCapital || 5000;
      const roiPct = startCap > 0 ? (cumProfit / startCap) * 100 : 0;
      const winRate = activeDaysCount > 0 ? (winCount / activeDaysCount) * 100 : 0;
      const avgDaily = activeDaysCount > 0 ? cumProfit / activeDaysCount : 0;

      return {
        id: account.id,
        name: account.name,
        type: account.type || 'Trading Bot',
        color:
          account.id === 'farmland'
            ? '#10b981'
            : account.id === 'firmly'
            ? '#3b82f6'
            : account.id === 'gadget'
            ? '#a855f7'
            : '#10b981',
        startingCapital: startCap,
        cumulativeProfit: cumProfit,
        roiPct,
        winRate,
        winningDays: winCount,
        totalDays: activeDaysCount,
        avgDailyProfit: avgDaily,
        peakDailyProfit: peakProfit === -Infinity ? 0 : peakProfit,
        worstDailyProfit: worstProfit === Infinity ? 0 : worstProfit,
      };
    });

    // Sort bots by cumulative profit descending
    const sorted = [...metrics].sort((a, b) => b.cumulativeProfit - a.cumulativeProfit);
    const top = sorted[0] || null;
    const maxP = Math.max(...metrics.map((m) => Math.abs(m.cumulativeProfit)), 1000);

    // 3. Build Timeline Progression Data
    // Find the longest rows list to iterate day by day
    const maxRowsLen = Math.max(...filteredByBot.map((b) => b.rows.length), 0);
    const timeline: {
      date: string;
      dayIndex: number;
      farmland: number;
      firmly: number;
      gadget: number;
      farmlandDaily: number;
      firmlyDaily: number;
      gadgetDaily: number;
    }[] = [];

    let farmRunning = 0;
    let firmRunning = 0;
    let gadRunning = 0;

    for (let i = 0; i < maxRowsLen; i++) {
      const fRow = filteredByBot.find((b) => b.account.id === 'farmland')?.rows[i];
      const fmRow = filteredByBot.find((b) => b.account.id === 'firmly')?.rows[i];
      const gRow = filteredByBot.find((b) => b.account.id === 'gadget')?.rows[i];

      const fPnl = Number(fRow?.dailyReturn) || 0;
      const fmPnl = Number(fmRow?.dailyReturn) || 0;
      const gPnl = Number(gRow?.dailyReturn) || 0;

      farmRunning += fPnl;
      firmRunning += fmPnl;
      gadRunning += gPnl;

      const dateStr = fRow?.day || fmRow?.day || gRow?.day || `Day ${i + 1}`;

      timeline.push({
        date: dateStr,
        dayIndex: i + 1,
        farmland: farmRunning,
        firmly: firmRunning,
        gadget: gadRunning,
        farmlandDaily: fPnl,
        firmlyDaily: fmPnl,
        gadgetDaily: gPnl,
      });
    }

    return {
      botMetrics: metrics,
      timelineData: timeline,
      topBot: top,
      maxProfit: maxP,
    };
  }, [accounts, dateRangeFilter]);

  // Formatter for dollar tooltip
  const formatDollar = (val: number) => {
    return `${val >= 0 ? '+' : ''}$${val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div
      id="bot-profit-comparison-widget"
      className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5"
    >
      {/* Top Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              Bot Performance Benchmark
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Window: <strong className="text-white">{dateRangeFilter.label}</strong>
            </span>
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 mt-1">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <span>Cumulative Profit Comparison — Farmland vs. Firmly vs. Gadget</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Comparative performance analysis evaluating net cumulative trading profits and ROI generated by each of the three bots over the selected time window.
          </p>
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono self-start md:self-auto">
          <button
            onClick={() => setComparisonMode('cumulative')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              comparisonMode === 'cumulative'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Cumulative Profit ($)
          </button>
          <button
            onClick={() => setComparisonMode('roi')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              comparisonMode === 'roi'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            ROI Return (%)
          </button>
          <button
            onClick={() => setComparisonMode('timeline')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              comparisonMode === 'timeline'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Timeline Progression
          </button>
        </div>
      </div>

      {/* 3 Bot Performance Cards with Top Performer Callout */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {botMetrics.map((bot) => {
          const isTop = topBot?.id === bot.id;
          return (
            <div
              key={bot.id}
              className={`p-4 rounded-xl border transition-all ${
                isTop
                  ? 'bg-slate-950 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                  : 'bg-slate-950/70 border-slate-800'
              } space-y-2`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full inline-block"
                    style={{ backgroundColor: bot.color }}
                  />
                  <span className="text-sm font-bold text-white">{bot.name}</span>
                </div>
                {isTop ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono">
                    <Award className="w-3 h-3 text-emerald-400" />
                    Top Performer
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono">
                    Starting: ${bot.startingCapital.toLocaleString()}
                  </span>
                )}
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <span className="text-[11px] text-slate-400 block font-mono">Cumulative Profit</span>
                  <div
                    className={`text-xl font-bold font-mono ${
                      bot.cumulativeProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatDollar(bot.cumulativeProfit)}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block font-mono">ROI Yield</span>
                  <div
                    className={`text-base font-bold font-mono ${
                      bot.roiPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {bot.roiPct >= 0 ? '+' : ''}
                    {bot.roiPct.toFixed(2)}%
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 font-mono">
                <span>
                  Win Rate:{' '}
                  <strong className="text-emerald-400">{bot.winRate.toFixed(1)}%</strong> (
                  {bot.winningDays}/{bot.totalDays}d)
                </span>
                <span>
                  Avg/Day:{' '}
                  <strong className="text-slate-300">
                    {bot.avgDailyProfit >= 0 ? '+' : ''}${Math.round(bot.avgDailyProfit)}
                  </strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Bar Chart Rendering Area */}
      <div className="h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {comparisonMode === 'timeline' ? (
            /* Multi-bar timeline progression chart */
            <BarChart
              data={timelineData}
              margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                interval={Math.ceil(timelineData.length / 10)}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-slate-950 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1.5 font-mono">
                        <p className="text-slate-300 font-bold border-b border-slate-800 pb-1">
                          Date: {label}
                        </p>
                        {payload.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5" style={{ color: item.color }}>
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: item.color }}
                              />
                              {item.name}:
                            </span>
                            <span className="font-bold text-white">
                              {formatDollar(Number(item.value))}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
              />
              <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.5} />
              <Bar
                dataKey="farmland"
                name="Farmland"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="firmly"
                name="Firmly"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="gadget"
                name="Gadget"
                fill="#a855f7"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          ) : (
            /* Summary Comparative Bar Chart (Cumulative Profit $ or ROI %) */
            <BarChart
              data={botMetrics}
              layout="vertical"
              margin={{ top: 20, right: 40, left: 30, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} horizontal={false} />
              <XAxis
                type="number"
                stroke="#64748b"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={(val) =>
                  comparisonMode === 'cumulative'
                    ? `$${val.toLocaleString()}`
                    : `${val.toFixed(1)}%`
                }
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#64748b"
                tick={{ fontSize: 12, fill: '#e2e8f0', fontWeight: 'bold' }}
                width={80}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as BotPeriodMetrics;
                    return (
                      <div className="bg-slate-950 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1.5 font-mono">
                        <div className="flex items-center gap-2 border-b border-slate-800 pb-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: data.color }}
                          />
                          <span className="font-bold text-white text-sm">{data.name} Bot</span>
                          <span className="text-[10px] text-slate-400">({data.type})</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Cumulative Profit:</span>
                          <span
                            className={`font-bold ${
                              data.cumulativeProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {formatDollar(data.cumulativeProfit)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">ROI Return %:</span>
                          <span className="font-bold text-white">
                            {data.roiPct >= 0 ? '+' : ''}
                            {data.roiPct.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Day Win Rate:</span>
                          <span className="font-bold text-emerald-400">
                            {data.winRate.toFixed(1)}% ({data.winningDays} win sessions)
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Avg Return / Day:</span>
                          <span className="font-bold text-slate-300">
                            +${Math.round(data.avgDailyProfit).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine x={0} stroke="#64748b" strokeWidth={1.5} />
              <Bar
                dataKey={comparisonMode === 'cumulative' ? 'cumulativeProfit' : 'roiPct'}
                name={comparisonMode === 'cumulative' ? 'Cumulative Profit ($)' : 'ROI (%)'}
                radius={[0, 8, 8, 0]}
                barSize={36}
              >
                {botMetrics.map((entry) => (
                  <Cell
                    key={entry.id}
                    fill={entry.color}
                    className="hover:opacity-85 transition-opacity cursor-pointer"
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Comparison Insights Summary Footer */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800 font-mono gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            Performance Leader:{' '}
            <strong className="text-white font-bold">{topBot?.name}</strong> leads with{' '}
            <strong className="text-emerald-400">{formatDollar(topBot?.cumulativeProfit || 0)}</strong>{' '}
            ({topBot?.roiPct.toFixed(1)}% ROI).
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-300 font-semibold">Farmland</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-slate-300 font-semibold">Firmly</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span className="text-slate-300 font-semibold">Gadget</span>
          </span>
        </div>
      </div>
    </div>
  );
}
