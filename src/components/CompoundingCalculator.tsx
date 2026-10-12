import React, { useState, useMemo, useEffect } from 'react';
import {
  Calculator,
  TrendingUp,
  CheckCircle2,
  Circle,
  Sparkles,
  Calendar,
  DollarSign,
  ArrowUpRight,
  RotateCcw,
  Percent,
  Layers,
  Award,
  ChevronRight,
  Sliders,
  Info,
  Check,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
} from 'recharts';

export interface CompoundingMonthRow {
  month: number;
  label: string;
  startingBalance: number;
  monthlyTargetProfit: number; // e.g. target return for this month
  endingBalance: number;
  cumulativeProfit: number;
  growthMultiple: number;
  isHit: boolean;
  actualProfit?: number;
  completedDate?: string;
  notes?: string;
}

interface CompoundingCalculatorProps {
  initialStartingTarget?: number; // Starting target return on investment, e.g. $1
  initialMonths?: number; // default 20 months
  currentTotalCapital?: number;
  onNavigateToTab?: (tab: string) => void;
  isWidget?: boolean; // When embedded inside DashboardView vs Full tab view
}

const STORAGE_KEY_CONFIG = 'crypto_bot_compounding_calc_config_v1';
const STORAGE_KEY_PROGRESS = 'crypto_bot_compounding_calc_progress_v1';

export function CompoundingCalculator({
  initialStartingTarget = 1,
  initialMonths = 20,
  currentTotalCapital,
  onNavigateToTab,
  isWidget = false,
}: CompoundingCalculatorProps) {
  // Parameters
  const [startingTarget, setStartingTarget] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.startingTarget === 'number') return parsed.startingTarget;
      }
    } catch {}
    return initialStartingTarget;
  });

  const [monthsCount, setMonthsCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.monthsCount === 'number') return parsed.monthsCount;
      }
    } catch {}
    return initialMonths;
  });

  // Compounding growth rate per month (e.g. 50% or 100% or custom multiplier per month)
  // Default to 100% doubling rate per month ($1 -> $2 -> $4 -> ... $524,288 in 20 months)
  // or linear / fixed interest. Users can toggle between Doubling (100%), 50%, 30%, 20%, or custom.
  const [monthlyGrowthRatePct, setMonthlyGrowthRatePct] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.monthlyGrowthRatePct === 'number') return parsed.monthlyGrowthRatePct;
      }
    } catch {}
    return 100; // 100% per month compounding (doubling model)
  });

  // Growth preset mode: 'doubling' (100%), 'aggressive' (50%), 'moderate' (30%), 'steady' (15%), 'custom'
  const [growthMode, setGrowthMode] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.growthMode) return parsed.growthMode;
      }
    } catch {}
    return 'doubling';
  });

  // Additional monthly injection/contribution (optional)
  const [monthlyAddition, setMonthlyAddition] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.monthlyAddition === 'number') return parsed.monthlyAddition;
      }
    } catch {}
    return 0;
  });

  // Checklist of hit milestones: array of booleans or record of month -> boolean
  const [progressChecks, setProgressChecks] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROGRESS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return {};
  });

  // Save config changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_CONFIG,
        JSON.stringify({
          startingTarget,
          monthsCount,
          monthlyGrowthRatePct,
          growthMode,
          monthlyAddition,
        })
      );
    } catch (e) {
      console.warn(e);
    }
  }, [startingTarget, monthsCount, monthlyGrowthRatePct, growthMode, monthlyAddition]);

  // Save progress checks
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(progressChecks));
    } catch (e) {
      console.warn(e);
    }
  }, [progressChecks]);

  // Handle Preset selection
  const handleSelectPreset = (preset: 'doubling' | 'aggressive' | 'moderate' | 'steady' | 'custom') => {
    setGrowthMode(preset);
    if (preset === 'doubling') setMonthlyGrowthRatePct(100);
    else if (preset === 'aggressive') setMonthlyGrowthRatePct(50);
    else if (preset === 'moderate') setMonthlyGrowthRatePct(30);
    else if (preset === 'steady') setMonthlyGrowthRatePct(15);
  };

  // Generate 20-month compounding schedule
  const schedule = useMemo<CompoundingMonthRow[]>(() => {
    const rows: CompoundingMonthRow[] = [];
    let currentBalance = startingTarget;
    let totalProfit = 0;
    const rate = monthlyGrowthRatePct / 100;

    for (let m = 1; m <= monthsCount; m++) {
      const startBal = currentBalance;
      // Monthly target profit earned in month m
      const targetProfit = startBal * rate;
      const endBal = startBal + targetProfit + monthlyAddition;
      totalProfit += targetProfit;
      const growthMul = endBal / (startingTarget || 1);
      const isHit = !!progressChecks[m];

      rows.push({
        month: m,
        label: `Month ${m}`,
        startingBalance: startBal,
        monthlyTargetProfit: targetProfit,
        endingBalance: endBal,
        cumulativeProfit: totalProfit,
        growthMultiple: growthMul,
        isHit,
      });

      currentBalance = endBal;
    }

    return rows;
  }, [startingTarget, monthsCount, monthlyGrowthRatePct, monthlyAddition, progressChecks]);

  // Summary statistics
  const finalBalance = schedule[schedule.length - 1]?.endingBalance ?? startingTarget;
  const totalProfitCalculated = schedule[schedule.length - 1]?.cumulativeProfit ?? 0;
  const overallMultiple = finalBalance / (startingTarget || 1);
  const checkedCount = useMemo(() => {
    return Object.values(progressChecks).filter(Boolean).length;
  }, [progressChecks]);
  const progressPct = monthsCount > 0 ? (checkedCount / monthsCount) * 100 : 0;

  // Next month to achieve
  const nextTargetMonth = useMemo(() => {
    for (let m = 1; m <= monthsCount; m++) {
      if (!progressChecks[m]) {
        return schedule.find((r) => r.month === m) || null;
      }
    }
    return null;
  }, [schedule, monthsCount, progressChecks]);

  // Toggle single milestone check
  const toggleMonth = (monthNumber: number) => {
    setProgressChecks((prev) => ({
      ...prev,
      [monthNumber]: !prev[monthNumber],
    }));
  };

  // Check off all up to a month
  const checkAllUpTo = (monthNumber: number) => {
    setProgressChecks((prev) => {
      const next = { ...prev };
      for (let m = 1; m <= monthsCount; m++) {
        if (m <= monthNumber) {
          next[m] = true;
        }
      }
      return next;
    });
  };

  // Reset all checkmarks
  const handleResetCheckmarks = () => {
    if (window.confirm('Reset all monthly progress checkmarks back to 0?')) {
      setProgressChecks({});
    }
  };

  // Quick preset starting return targets: $1, $5, $10, $50, $100, $500
  const targetPresets = [1, 5, 10, 25, 50, 100];

  return (
    <div
      id="compounding-calculator-container"
      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md space-y-6"
    >
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/90">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5" />
              <span>20-Month Compounding Roadmap</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Starting Target: ${startingTarget} • {monthsCount} Months
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1.5 flex items-center gap-2">
            <span>Compounding Target Calculator</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Interactive Checklist
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Model your exponential return on investment starting with just <strong>${startingTarget}</strong>.
            Check off each monthly milestone as your trading bots and yield activities hit the target.
          </p>
        </div>

        {/* Milestone Achievement Badge */}
        <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 self-stretch sm:self-auto justify-between sm:justify-start">
          <div>
            <div className="text-[11px] text-slate-400 font-mono">Milestone Progress</div>
            <div className="text-lg font-bold font-mono text-emerald-400">
              {checkedCount} / {monthsCount} Months ({progressPct.toFixed(0)}%)
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Quick Interactive Parameters Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
        {/* Param 1: Starting Target Investment / Base Return */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Starting Target Return:</span>
            </span>
            <span className="text-[11px] font-mono font-bold text-emerald-400">${startingTarget}</span>
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">$</span>
              <input
                type="number"
                min={0.1}
                step={0.5}
                value={startingTarget}
                onChange={(e) => setStartingTarget(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-6 pr-3 py-1.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-hidden"
              />
            </div>
            {/* Quick $1 shortcut */}
            <button
              type="button"
              onClick={() => setStartingTarget(1)}
              className={`px-2 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                startingTarget === 1
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Set to $1 starting target"
            >
              $1
            </button>
          </div>
          <div className="flex items-center gap-1 flex-wrap pt-0.5">
            <span className="text-[10px] text-slate-500 font-mono">Quick:</span>
            {targetPresets.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setStartingTarget(val)}
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  startingTarget === val
                    ? 'bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/50'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                ${val}
              </button>
            ))}
          </div>
        </div>

        {/* Param 2: Compounding Horizon (Months) */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>Horizon Duration:</span>
            </span>
            <span className="text-[11px] font-mono font-bold text-blue-400">{monthsCount} Months</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={6}
              max={36}
              value={monthsCount}
              onChange={(e) => setMonthsCount(parseInt(e.target.value, 10))}
              className="flex-1 accent-emerald-500 cursor-pointer"
            />
            <span className="text-xs font-mono text-slate-300 bg-slate-900 px-2 py-1 rounded border border-slate-800">
              {monthsCount}m
            </span>
          </div>
          <div className="flex items-center gap-1.5 pt-0.5">
            {[12, 20, 24, 36].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMonthsCount(m)}
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded cursor-pointer ${
                  monthsCount === m
                    ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>

        {/* Param 3: Monthly Growth / ROI Target (%) */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-amber-400" />
              <span>Monthly Compounding Rate:</span>
            </span>
            <span className="text-[11px] font-mono font-bold text-amber-400">+{monthlyGrowthRatePct}% /mo</span>
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                min={1}
                max={500}
                value={monthlyGrowthRatePct}
                onChange={(e) => {
                  setMonthlyGrowthRatePct(Math.max(1, parseFloat(e.target.value) || 1));
                  setGrowthMode('custom');
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-8 py-1.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-hidden"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">%</span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-wrap pt-0.5">
            <button
              type="button"
              onClick={() => handleSelectPreset('doubling')}
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded cursor-pointer ${
                growthMode === 'doubling' && monthlyGrowthRatePct === 100
                  ? 'bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/50'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
              title="100% per month (Doubles monthly)"
            >
              2x (100%)
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('aggressive')}
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded cursor-pointer ${
                growthMode === 'aggressive' && monthlyGrowthRatePct === 50
                  ? 'bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/50'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
              title="50% per month"
            >
              50%/mo
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('moderate')}
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded cursor-pointer ${
                growthMode === 'moderate' && monthlyGrowthRatePct === 30
                  ? 'bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/50'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
              title="30% per month"
            >
              30%/mo
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('steady')}
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded cursor-pointer ${
                growthMode === 'steady' && monthlyGrowthRatePct === 15
                  ? 'bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/50'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
              title="15% per month (Matches daily 0.5% rate)"
            >
              15%/mo
            </button>
          </div>
        </div>

        {/* Param 4: Actions & Reset */}
        <div className="space-y-1.5 flex flex-col justify-between">
          <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Checklist Actions:</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">{checkedCount} Checked</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => checkAllUpTo(monthsCount)}
              className="flex-1 py-1.5 px-2 bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold cursor-pointer transition-colors text-center"
            >
              Check All
            </button>
            <button
              type="button"
              onClick={handleResetCheckmarks}
              className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-300 border border-slate-700 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1"
              title="Clear all checked milestones"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            Checkmarks auto-save to browser storage.
          </p>
        </div>
      </div>

      {/* Projected Financial Outcome Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: Starting Seed Target */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase tracking-wider font-semibold">Starting Base</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-white">
            ${startingTarget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Month 1 Target ROI Baseline
          </div>
        </div>

        {/* CARD 2: Final Compounded Target */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/30 border border-emerald-500/40 rounded-xl p-4 space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-300 text-xs">
            <span className="uppercase tracking-wider font-semibold">Month {monthsCount} Target</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-400 tracking-tight">
            ${finalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-300/80 font-mono flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{overallMultiple.toLocaleString(undefined, { maximumFractionDigits: 1 })}x Compounding Multiple</span>
          </div>
        </div>

        {/* CARD 3: Next Monthly Milestone */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase tracking-wider font-semibold">Next Target</span>
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-white">
            {nextTargetMonth ? (
              <span>
                ${nextTargetMonth.endingBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            ) : (
              <span className="text-emerald-400 text-lg flex items-center gap-1">
                <CheckCircle2 className="w-5 h-5" /> All Hit!
              </span>
            )}
          </div>
          <div className="text-[11px] text-blue-400 font-mono">
            {nextTargetMonth ? `Month ${nextTargetMonth.month} Target (+$${nextTargetMonth.monthlyTargetProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })})` : 'All 20 Months Achieved'}
          </div>
        </div>

        {/* CARD 4: Total Progress Percentage */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase tracking-wider font-semibold">Checklist Hit Rate</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-amber-400">
            {progressPct.toFixed(1)}%
          </div>
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800 mt-2">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${Math.min(100, progressPct)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Visual Growth Area Chart (Recharts) */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              📈 Exponential Compounding Trajectory
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              (Logarithmic & Linear Visualization)
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            Formula: Target(m) = ${startingTarget} × (1 + {monthlyGrowthRatePct}%)<sup>m</sup>
          </div>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={schedule} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="compoundingGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'monospace' }}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'monospace' }}
                tickFormatter={(val) =>
                  val >= 1000000
                    ? `$${(val / 1000000).toFixed(1)}M`
                    : val >= 1000
                    ? `$${(val / 1000).toFixed(0)}k`
                    : `$${val}`
                }
              />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const row: CompoundingMonthRow = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-xl text-xs font-mono space-y-1">
                        <div className="font-bold text-white flex items-center justify-between gap-4">
                          <span>{row.label}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] ${
                              row.isHit
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {row.isHit ? '✓ TARGET HIT' : 'Pending'}
                          </span>
                        </div>
                        <div className="text-slate-400">
                          Start Balance: <span className="text-white">${row.startingBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="text-slate-400">
                          Monthly Target Profit: <span className="text-emerald-400">+${row.monthlyTargetProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="text-slate-400">
                          Compounded Balance: <span className="text-white font-bold">${row.endingBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                          Growth Multiple: {row.growthMultiple.toLocaleString(undefined, { maximumFractionDigits: 1 })}x
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="endingBalance"
                name="Compounded Target"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#compoundingGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* THE 20-MONTH CHECKLIST TABLE */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Interactive Monthly Milestone Checklist ({monthsCount} Months)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Click the checkmark or the row as you hit each month's targeted balance.
            </p>
          </div>
          <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>Green = Target Hit</span>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-700 ml-2" />
            <span>Gray = In Progress</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th scope="col" className="py-3 px-4 w-12 text-center">
                  Status
                </th>
                <th scope="col" className="py-3 px-4">
                  Month
                </th>
                <th scope="col" className="py-3 px-4 text-right">
                  Starting Balance
                </th>
                <th scope="col" className="py-3 px-4 text-right">
                  Target Profit (+{monthlyGrowthRatePct}%)
                </th>
                <th scope="col" className="py-3 px-4 text-right">
                  Target End Balance
                </th>
                <th scope="col" className="py-3 px-4 text-right">
                  Growth Multiple
                </th>
                <th scope="col" className="py-3 px-4 text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {schedule.map((row) => {
                const isCurrentNext = nextTargetMonth?.month === row.month;
                return (
                  <tr
                    key={row.month}
                    onClick={() => toggleMonth(row.month)}
                    className={`transition-colors cursor-pointer group ${
                      row.isHit
                        ? 'bg-emerald-950/20 hover:bg-emerald-950/30 text-white'
                        : isCurrentNext
                        ? 'bg-blue-950/20 hover:bg-blue-950/30'
                        : 'hover:bg-slate-800/40 text-slate-300'
                    }`}
                  >
                    {/* Status Checkbox */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMonth(row.month);
                        }}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer mx-auto ${
                          row.isHit
                            ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/40'
                            : isCurrentNext
                            ? 'border-2 border-blue-400 bg-blue-950/50 text-blue-400 hover:bg-blue-900/50'
                            : 'border border-slate-700 bg-slate-900 text-transparent hover:border-slate-500'
                        }`}
                        title={row.isHit ? 'Mark as pending' : 'Mark as target hit'}
                      >
                        {row.isHit ? (
                          <Check className="w-4 h-4 stroke-[3]" />
                        ) : isCurrentNext ? (
                          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                        ) : null}
                      </button>
                    </td>

                    {/* Month Label */}
                    <td className="py-3 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <span>Month {row.month}</span>
                        {isCurrentNext && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/40 animate-pulse">
                            Current Goal
                          </span>
                        )}
                        {row.isHit && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Achieved
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Starting Balance */}
                    <td className="py-3 px-4 text-right text-slate-400">
                      ${row.startingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Target Profit */}
                    <td className="py-3 px-4 text-right text-emerald-400 font-semibold">
                      +${row.monthlyTargetProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Target End Balance */}
                    <td className="py-3 px-4 text-right font-bold text-white">
                      <span className={row.isHit ? 'text-emerald-300' : ''}>
                        ${row.endingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Growth Multiple */}
                    <td className="py-3 px-4 text-right text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                        {row.growthMultiple.toLocaleString(undefined, { maximumFractionDigits: 1 })}x
                      </span>
                    </td>

                    {/* Check Action / Quick button */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMonth(row.month);
                        }}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                          row.isHit
                            ? 'bg-emerald-500/20 text-emerald-300 hover:bg-rose-500/20 hover:text-rose-300 border border-emerald-500/30'
                            : 'bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white border border-slate-700'
                        }`}
                      >
                        {row.isHit ? '✓ Hit' : 'Check Off'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
