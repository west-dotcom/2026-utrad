import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Target,
  Award,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Sliders,
  Check,
  Paintbrush,
} from 'lucide-react';
import { DailyLogRow } from '../data/accountsData';

interface RunningCapitalLineChartProps {
  dailyLog: DailyLogRow[];
  accountName: string;
  isAggregate?: boolean;
  startingCapital: number;
  targetCapital?: number;
  dateRangeLabel?: string;
  onOpenAddTx?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export function RunningCapitalLineChart({
  dailyLog,
  accountName,
  isAggregate = false,
  startingCapital = 5000,
  targetCapital = 50000,
  dateRangeLabel,
  onOpenAddTx,
  onNavigateToTab,
}: RunningCapitalLineChartProps) {
  // Range selection: 'auto' (all passed days) or 7, 14, 30 days
  const [dayRange, setDayRange] = useState<number | 'auto'>('auto');

  // Visual toggles for reference lines, smoothing, and area fill
  const [showBaseline, setShowBaseline] = useState<boolean>(true);
  const [showPeakAth, setShowPeakAth] = useState<boolean>(true);
  const [showTarget, setShowTarget] = useState<boolean>(false);
  const [curveType, setCurveType] = useState<'monotone' | 'linear'>('monotone');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [fillMode, setFillMode] = useState<'gradient' | 'subtle' | 'none'>('gradient');
  const [fillToBaseline, setFillToBaseline] = useState<boolean>(false);

  // Prepare and sanitize data points for Recharts
  const chartData = useMemo(() => {
    if (!dailyLog || dailyLog.length === 0) return [];

    const validDays = dailyLog.filter((d) => d.day && d.day.trim() !== '');
    const selectedDays =
      dayRange === 'auto'
        ? validDays
        : validDays.slice(Math.max(0, validDays.length - dayRange));

    return selectedDays.map((d, idx) => {
      const runningCap = Number(d.endingCapital || d.runningCapital || 0);
      const startCap = Number(d.startingCapital || startingCapital);
      const dayReturn = Number(d.dailyReturn || 0);
      const dayReturnPct = Number(d.dailyReturnPct || 0);
      const cumPnL = Number(d.cumulativePnL || 0);
      const growthAmount = runningCap - startingCapital;
      const growthPct =
        startingCapital > 0 ? (growthAmount / startingCapital) * 100 : 0;

      return {
        id: d.id || `cap-point-${idx}`,
        index: idx + 1,
        date: d.day,
        runningCapital: runningCap,
        startingCapital: startCap,
        dailyReturn: dayReturn,
        dailyReturnPct: dayReturnPct,
        cumulativePnL: cumPnL,
        growthAmount,
        growthPct,
        targetCapital,
      };
    });
  }, [dailyLog, dayRange, startingCapital, targetCapital]);

  // Key performance statistics over the visualized window
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return {
        currentCapital: startingCapital,
        growthAmount: 0,
        growthPct: 0,
        peakCapital: startingCapital,
        peakDate: 'N/A',
        lowestCapital: startingCapital,
        lowestDate: 'N/A',
        maxDrawdownPct: 0,
        avgDailyGrowth: 0,
      };
    }

    const currentCapital = chartData[chartData.length - 1].runningCapital;
    const growthAmount = currentCapital - startingCapital;
    const growthPct =
      startingCapital > 0 ? (growthAmount / startingCapital) * 100 : 0;

    let peakCapital = -Infinity;
    let peakDate = '';
    let lowestCapital = Infinity;
    let lowestDate = '';

    chartData.forEach((pt) => {
      if (pt.runningCapital > peakCapital) {
        peakCapital = pt.runningCapital;
        peakDate = pt.date;
      }
      if (pt.runningCapital < lowestCapital) {
        lowestCapital = pt.runningCapital;
        lowestDate = pt.date;
      }
    });

    // Compute max drawdown from historical peak in the visualized series
    let maxDrawdown = 0;
    let runningHigh = chartData[0]?.runningCapital || startingCapital;

    chartData.forEach((pt) => {
      if (pt.runningCapital > runningHigh) {
        runningHigh = pt.runningCapital;
      }
      const dd = runningHigh > 0 ? ((runningHigh - pt.runningCapital) / runningHigh) * 100 : 0;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
      }
    });

    const avgDailyGrowth =
      chartData.length > 0 ? growthAmount / chartData.length : 0;

    return {
      currentCapital,
      growthAmount,
      growthPct,
      peakCapital: peakCapital === -Infinity ? startingCapital : peakCapital,
      peakDate,
      lowestCapital: lowestCapital === Infinity ? startingCapital : lowestCapital,
      lowestDate,
      maxDrawdownPct: maxDrawdown,
      avgDailyGrowth,
    };
  }, [chartData, startingCapital]);

  // Compute adaptive Y-axis domain padding
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 10000];

    const allValues = chartData.map((d) => d.runningCapital);
    allValues.push(startingCapital);
    if (showTarget && targetCapital && targetCapital < stats.peakCapital * 1.5) {
      allValues.push(targetCapital);
    }

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.12 || 500;

    const domainMin = Math.max(0, Math.floor((min - padding) / 500) * 500);
    const domainMax = Math.ceil((max + padding) / 500) * 500;

    return [domainMin, domainMax];
  }, [chartData, startingCapital, targetCapital, showTarget, stats.peakCapital]);

  return (
    <div
      id="recharts-running-capital-section"
      className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5"
    >
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              Portfolio Growth Line Graph
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {isAggregate ? 'Combined Portfolio Equity' : `${accountName} Running Capital`}
            </span>
          </div>

          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 mt-1">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span>
              {isAggregate
                ? 'Total Combined Running Capital & Equity Curve'
                : `${accountName} Running Capital Growth`}
            </span>
          </h3>

          <p className="text-xs text-slate-400 mt-0.5">
            Interactive Recharts time series charting mathematical running capital, cumulative compounding, and portfolio trajectory over time.
          </p>
        </div>

        {/* Top Controls: Day Range Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            {[
              { label: '7D', range: 7 },
              { label: '14D', range: 14 },
              { label: '30D', range: 30 },
              { label: 'All Tracked', range: 'auto' as const },
            ].map((btn) => (
              <button
                key={btn.label}
                onClick={() => setDayRange(btn.range)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs ${
                  dayRange === btn.range
                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Curve smoothing toggle */}
          <button
            onClick={() => setCurveType((prev) => (prev === 'monotone' ? 'linear' : 'monotone'))}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
              curveType === 'monotone'
                ? 'bg-slate-800 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
            title="Toggle between Monotone smooth spline and Linear precise line"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{curveType === 'monotone' ? 'Smooth Curve' : 'Linear Line'}</span>
          </button>

          {/* Area Fill mode toggle */}
          <button
            onClick={() =>
              setFillMode((prev) =>
                prev === 'gradient' ? 'subtle' : prev === 'subtle' ? 'none' : 'gradient'
              )
            }
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
              fillMode !== 'none'
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 shadow-xs'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
            title="Toggle between Vibrant area gradient fill, Subtle fill, and Outline only"
          >
            <Paintbrush className="w-3.5 h-3.5 text-emerald-400" />
            <span>Fill: {fillMode === 'gradient' ? 'Vibrant' : fillMode === 'subtle' ? 'Subtle' : 'Off'}</span>
          </button>
        </div>
      </div>

      {/* 4-Stat Portfolio Performance Executive Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
        {/* Card 1: Current Running Capital */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Current Running Capital
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                stats.growthAmount >= 0
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {stats.growthAmount >= 0 ? '+' : ''}
              {stats.growthPct.toFixed(1)}%
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            ${stats.currentCapital.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {stats.growthAmount >= 0 ? '+' : ''}$
            {stats.growthAmount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            net growth vs baseline
          </div>
        </div>

        {/* Card 2: Starting Capital Baseline */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Starting Capital Baseline
            </span>
            <span className="text-[10px] font-mono text-slate-500">Day 1 Principal</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            ${startingCapital.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="text-[11px] text-slate-400">
            Committed starting funds
          </div>
        </div>

        {/* Card 3: Peak Capital (ATH) */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-cyan-400" />
              Peak Capital (ATH)
            </span>
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/40 px-1 rounded border border-cyan-800/50">
              {stats.peakDate || 'Latest'}
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-cyan-400">
            ${stats.peakCapital.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            All-time high achieved in period
          </div>
        </div>

        {/* Card 4: Max Drawdown from ATH */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              Max Drawdown from Peak
            </span>
            <span className="text-[10px] font-mono text-slate-500">Peak-to-Trough</span>
          </div>
          <div className={`text-xl font-bold font-mono ${stats.maxDrawdownPct > 10 ? 'text-rose-400' : 'text-slate-300'}`}>
            -{stats.maxDrawdownPct.toFixed(2)}%
          </div>
          <div className="text-[11px] text-slate-400">
            {stats.currentCapital >= stats.peakCapital
              ? 'Trading currently at peak ATH'
              : `$${(stats.peakCapital - stats.currentCapital).toLocaleString(undefined, { maximumFractionDigits: 0 })} below peak ATH`}
          </div>
        </div>
      </div>

      {/* Main Recharts Line / Area Chart Container */}
      <div className="w-full h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 15, right: 30, left: 15, bottom: 25 }}
          >
            <defs>
              <linearGradient id="runningCapitalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={fillMode === 'subtle' ? 0.25 : 0.65} />
                <stop offset="35%" stopColor="#059669" stopOpacity={fillMode === 'subtle' ? 0.12 : 0.35} />
                <stop offset="75%" stopColor="#047857" stopOpacity={fillMode === 'subtle' ? 0.05 : 0.12} />
                <stop offset="100%" stopColor="#020617" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.35} />
            )}

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

            {/* Starting Capital Baseline Reference Line */}
            {showBaseline && (
              <ReferenceLine
                y={startingCapital}
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                label={{
                  value: `Baseline: $${startingCapital.toLocaleString()}`,
                  fill: '#94a3b8',
                  fontSize: 10,
                  position: 'insideBottomLeft',
                }}
              />
            )}

            {/* Peak ATH Reference Line */}
            {showPeakAth && stats.peakCapital > startingCapital && (
              <ReferenceLine
                y={stats.peakCapital}
                stroke="#06b6d4"
                strokeWidth={1.2}
                strokeDasharray="3 3"
                label={{
                  value: `Peak ATH: $${stats.peakCapital.toLocaleString()}`,
                  fill: '#06b6d4',
                  fontSize: 10,
                  position: 'insideTopRight',
                }}
              />
            )}

            {/* Optional Target Milestone Line */}
            {showTarget && targetCapital > startingCapital && (
              <ReferenceLine
                y={targetCapital}
                stroke="#f59e0b"
                strokeWidth={1.2}
                strokeDasharray="4 4"
                label={{
                  value: `Target Milestone: $${targetCapital.toLocaleString()}`,
                  fill: '#f59e0b',
                  fontSize: 10,
                  position: 'insideTopLeft',
                }}
              />
            )}

            {/* Rich Interactive Tooltip */}
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const isGain = data.growthAmount >= 0;
                  const dayReturnPositive = data.dailyReturn >= 0;

                  return (
                    <div className="bg-slate-950 border border-slate-700 p-4 rounded-xl shadow-2xl text-xs font-mono space-y-2 min-w-[240px]">
                      <div className="text-slate-400 font-bold border-b border-slate-800 pb-1.5 flex items-center justify-between">
                        <span>{label}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400 font-semibold">
                          {isAggregate ? 'Combined Portfolio' : accountName}
                        </span>
                      </div>

                      {/* Running Capital Hero Metric */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-sans">Running Capital:</span>
                        <span className="font-bold text-base text-emerald-400">
                          $
                          {Number(data.runningCapital).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>

                      {/* Growth vs Starting Capital */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                        <span className="text-slate-400 font-sans">Total Growth vs Start:</span>
                        <span
                          className={`font-bold ${
                            isGain ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isGain ? '+' : ''}$
                          {Number(data.growthAmount).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          ({isGain ? '+' : ''}
                          {Number(data.growthPct).toFixed(1)}%)
                        </span>
                      </div>

                      {/* Day Realized Return */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-sans">Day Return:</span>
                        <span
                          className={`font-bold ${
                            dayReturnPositive ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {dayReturnPositive ? '+' : ''}$
                          {Number(data.dailyReturn).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          ({Number(data.dailyReturnPct).toFixed(2)}%)
                        </span>
                      </div>

                      {/* Cumulative PnL */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-sans">Cumulative PnL:</span>
                        <span className="text-white font-bold">
                          $
                          {Number(data.cumulativePnL).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>

                      {/* Starting Baseline Reference */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] text-slate-500">
                        <span className="font-sans">Starting Baseline:</span>
                        <span>${Number(startingCapital).toLocaleString()}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Running Capital Area & Line Plot */}
            <Area
              type={curveType}
              dataKey="runningCapital"
              name="Running Capital"
              stroke="#10b981"
              strokeWidth={2.5}
              fill={fillMode === 'none' ? 'transparent' : 'url(#runningCapitalGrad)'}
              baseValue={fillToBaseline ? startingCapital : 'dataMin'}
              activeDot={{
                r: 6,
                fill: '#34d399',
                stroke: '#020617',
                strokeWidth: 2,
              }}
              dot={
                chartData.length <= 40
                  ? {
                      r: 3,
                      fill: '#10b981',
                      stroke: '#0f172a',
                      strokeWidth: 1.5,
                    }
                  : false
              }
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Interactive Legend & Visibility Toggles Footer */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800 gap-3 font-mono">
        <div className="flex flex-wrap items-center gap-4">
          {/* Running Capital Key */}
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 bg-emerald-500 rounded inline-block"></span>
            <span className="text-white font-semibold">Running Capital</span>
          </span>

          {/* Toggle Baseline Reference Line */}
          <button
            onClick={() => setShowBaseline((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer transition-colors ${
              showBaseline ? 'bg-slate-800 text-slate-300' : 'text-slate-500 hover:text-slate-400'
            }`}
            title="Toggle Starting Capital Baseline reference line"
          >
            <span className="w-3 h-0.5 bg-slate-400 inline-block border-t border-dashed"></span>
            <span>Starting Baseline (${startingCapital.toLocaleString()})</span>
            {showBaseline && <Check className="w-3 h-3 text-emerald-400" />}
          </button>

          {/* Toggle Fill to Baseline vs Minimum */}
          {fillMode !== 'none' && (
            <button
              onClick={() => setFillToBaseline((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer transition-colors ${
                fillToBaseline ? 'bg-slate-800 text-emerald-300' : 'text-slate-500 hover:text-slate-400'
              }`}
              title="Toggle whether gradient fills down to Baseline or data minimum"
            >
              <Paintbrush className="w-3 h-3 text-emerald-400" />
              <span>Fill to Baseline</span>
              {fillToBaseline && <Check className="w-3 h-3 text-emerald-400" />}
            </button>
          )}

          {/* Toggle Peak ATH Reference Line */}
          <button
            onClick={() => setShowPeakAth((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer transition-colors ${
              showPeakAth ? 'bg-slate-800 text-cyan-300' : 'text-slate-500 hover:text-slate-400'
            }`}
            title="Toggle All-Time High line"
          >
            <span className="w-3 h-0.5 bg-cyan-400 inline-block border-t border-dashed"></span>
            <span>Peak ATH (${stats.peakCapital.toLocaleString()})</span>
            {showPeakAth && <Check className="w-3 h-3 text-cyan-400" />}
          </button>

          {/* Toggle Target Milestone Reference Line */}
          {targetCapital > startingCapital && (
            <button
              onClick={() => setShowTarget((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer transition-colors ${
                showTarget ? 'bg-slate-800 text-amber-300' : 'text-slate-500 hover:text-slate-400'
              }`}
              title="Toggle Target Milestone reference line"
            >
              <span className="w-3 h-0.5 bg-amber-400 inline-block border-t border-dashed"></span>
              <span>Target Milestone (${targetCapital.toLocaleString()})</span>
              {showTarget && <Check className="w-3 h-3 text-amber-400" />}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span>Tracking {chartData.length} daily equity intervals</span>
          {onOpenAddTx && (
            <button
              onClick={onOpenAddTx}
              className="text-emerald-400 hover:text-emerald-300 cursor-pointer font-sans font-semibold flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Record Day</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
