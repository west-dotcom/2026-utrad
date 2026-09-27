import React, { useState } from 'react';
import {
  Calendar,
  Download,
  Info,
  TrendingUp,
  Percent,
  Wallet,
  Landmark,
  Target,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { DailySnapshot } from '../types';

interface DailySnapshotViewProps {
  snapshots: DailySnapshot[];
  dailyProfitTarget?: number;
  onUpdateDailyProfitTarget?: (target: number) => void;
}

export function DailySnapshotView({
  snapshots,
  dailyProfitTarget = 250,
  onUpdateDailyProfitTarget,
}: DailySnapshotViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [targetInput, setTargetInput] = useState<string>(String(dailyProfitTarget || 250));

  // Current effective profit target
  const currentTarget = parseFloat(targetInput) || 0;

  const handleTargetChange = (val: string) => {
    setTargetInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && onUpdateDailyProfitTarget) {
      onUpdateDailyProfitTarget(parsed);
    }
  };

  const handlePresetTarget = (amount: number) => {
    setTargetInput(String(amount));
    if (onUpdateDailyProfitTarget) {
      onUpdateDailyProfitTarget(amount);
    }
  };

  // Filter & Sort
  const filtered = snapshots
    .filter((s) => s.date.includes(searchTerm))
    .sort((a, b) => (sortOrder === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));

  // Target metrics calculation
  const totalDays = snapshots.length;
  const targetMetDays = snapshots.filter((s) => currentTarget > 0 && s.realizedPnL >= currentTarget);
  const targetMetCount = targetMetDays.length;
  const targetMetRate = totalDays > 0 ? (targetMetCount / totalDays) * 100 : 0;
  const targetMetTotalPnL = targetMetDays.reduce((acc, s) => acc + s.realizedPnL, 0);

  // Handle Export Snapshots to CSV
  const handleExportSnapshotsCsv = () => {
    const headers = [
      'Date',
      'Start Capital',
      'Net Inflows',
      'Realized PnL',
      'Target Met',
      'Interest',
      'End Capital',
      'Daily Return %',
      'Cumulative PnL',
      'Loan Balance',
      'Events Count',
    ];

    const rows = snapshots.map((s) => {
      const isMet = currentTarget > 0 ? (s.realizedPnL >= currentTarget ? 'YES' : 'NO') : 'N/A';
      return [
        s.date,
        s.startCapital,
        s.netInflows,
        s.realizedPnL,
        isMet,
        s.interest,
        s.endCapital,
        `${s.dailyReturnPct}%`,
        s.cumulativePnL,
        s.loanBalance,
        s.transactionCount,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `daily_snapshots_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="daily-snapshot-view" className="space-y-4">
      {/* Daily Profit Target Control Panel */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Target Title & Description */}
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 mt-0.5">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Daily Profit Target Tracker
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Goal Highlight Active
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
                Set your daily benchmark. Days meeting or exceeding this target are highlighted in vibrant green across the ledger.
              </p>
            </div>
          </div>

          {/* Target Setting Input & Quick Presets */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <div className="flex items-center bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 focus-within:border-emerald-500 transition-colors shadow-inner">
              <span className="text-slate-400 font-mono text-sm mr-1.5 font-bold">$</span>
              <input
                id="daily-profit-target-input"
                type="number"
                step="25"
                min="0"
                placeholder="250"
                value={targetInput}
                onChange={(e) => handleTargetChange(e.target.value)}
                className="w-24 bg-transparent text-sm font-mono font-bold text-white focus:outline-hidden"
              />
              <span className="text-[11px] text-slate-500 font-sans ml-1">/ day</span>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1">
              {[100, 250, 500, 1000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetTarget(preset)}
                  className={`px-2 py-1 text-[11px] font-mono rounded-lg transition-colors border ${
                    currentTarget === preset
                      ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700'
                  }`}
                >
                  ${preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Target Performance Overview Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80">
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/60">
            <span className="text-[10px] uppercase tracking-wider font-medium text-slate-400 block mb-1">
              Active Target
            </span>
            <span className="text-base font-bold font-mono text-white">
              ${currentTarget.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              <span className="text-[10px] text-slate-400 font-normal ml-1">/ day</span>
            </span>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/60">
            <span className="text-[10px] uppercase tracking-wider font-medium text-slate-400 block mb-1">
              Days Met / Total
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold font-mono text-emerald-400">
                {targetMetCount}
              </span>
              <span className="text-xs text-slate-500 font-mono">/ {totalDays} days</span>
            </div>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/60">
            <span className="text-[10px] uppercase tracking-wider font-medium text-slate-400 block mb-1">
              Goal Success Rate
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold font-mono text-emerald-300">
                {targetMetRate.toFixed(1)}%
              </span>
              <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, targetMetRate)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/60">
            <span className="text-[10px] uppercase tracking-wider font-medium text-slate-400 block mb-1">
              Target Days Profit
            </span>
            <span className="text-base font-bold font-mono text-emerald-400">
              +${targetMetTotalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-white">
            Daily Snapshot Archive ({snapshots.length} Days)
          </span>
          <input
            type="text"
            placeholder="Filter date (e.g. 2026-08)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-hidden focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
          >
            {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
          </button>
          <button
            id="export-snapshots-btn"
            onClick={handleExportSnapshotsCsv}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Snapshots CSV</span>
          </button>
        </div>
      </div>

      {/* Daily Snapshots Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold text-[10px]">
                <th className="py-3 px-3.5">Date</th>
                <th className="py-3 px-3 text-right">Start Capital</th>
                <th className="py-3 px-3 text-right">Net Inflows</th>
                <th className="py-3 px-3 text-right">Realized PnL</th>
                <th className="py-3 px-3 text-center">Profit Target Goal</th>
                <th className="py-3 px-3 text-right">Interest</th>
                <th className="py-3 px-3 text-right font-mono text-white">End Capital</th>
                <th className="py-3 px-3 text-right">Daily Return %</th>
                <th className="py-3 px-3 text-right">Cumulative PnL</th>
                <th className="py-3 px-3 text-right">Loan Balance</th>
                <th className="py-3 px-3 text-center">Events</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filtered.map((s) => {
                const isPositive = s.dailyReturnPct >= 0;
                const isTargetMet = currentTarget > 0 && s.realizedPnL >= currentTarget;
                const surplusOrDeficit = s.realizedPnL - currentTarget;

                return (
                  <tr
                    key={s.date}
                    className={`transition-colors ${
                      isTargetMet
                        ? 'bg-emerald-950/30 border-l-4 border-l-emerald-400 hover:bg-emerald-950/50 text-slate-100'
                        : 'hover:bg-slate-800/40 text-slate-200'
                    }`}
                  >
                    {/* Date */}
                    <td className="py-3 px-3.5 font-mono text-slate-300 whitespace-nowrap font-medium flex items-center gap-1.5">
                      {isTargetMet && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                      <span>{s.date}</span>
                    </td>

                    {/* Start Capital */}
                    <td className="py-3 px-3 text-right font-mono text-slate-400 whitespace-nowrap">
                      ${s.startCapital.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* Net Inflows */}
                    <td
                      className={`py-3 px-3 text-right font-mono whitespace-nowrap ${
                        s.netInflows > 0
                          ? 'text-emerald-400'
                          : s.netInflows < 0
                          ? 'text-amber-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {s.netInflows !== 0 ? (s.netInflows > 0 ? `+${s.netInflows.toLocaleString()}` : s.netInflows.toLocaleString()) : '—'}
                    </td>

                    {/* Realized PnL */}
                    <td
                      className={`py-3 px-3 text-right font-mono font-bold whitespace-nowrap ${
                        s.realizedPnL > 0
                          ? 'text-emerald-400'
                          : s.realizedPnL < 0
                          ? 'text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {s.realizedPnL > 0 ? '+' : ''}${s.realizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* Profit Target Status Highlight */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {currentTarget <= 0 ? (
                        <span className="text-slate-600 font-mono text-[11px]">—</span>
                      ) : isTargetMet ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Met (+${surplusOrDeficit.toFixed(0)})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium font-mono bg-slate-950/60 text-slate-400 border border-slate-800">
                          <Target className="w-3 h-3 text-slate-500" />
                          <span>-${Math.abs(surplusOrDeficit).toFixed(0)}</span>
                        </span>
                      )}
                    </td>

                    {/* Interest */}
                    <td className="py-3 px-3 text-right font-mono text-orange-400/90 whitespace-nowrap">
                      {s.interest > 0 ? `$${s.interest.toFixed(2)}` : '—'}
                    </td>

                    {/* End Capital */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-white whitespace-nowrap bg-slate-950/30">
                      ${s.endCapital.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* Daily Return % */}
                    <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          isPositive
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-rose-500/15 text-rose-400'
                        }`}
                      >
                        {isPositive ? '+' : ''}{s.dailyReturnPct}%
                      </span>
                    </td>

                    {/* Cumulative PnL */}
                    <td className="py-3 px-3 text-right font-mono text-emerald-400 whitespace-nowrap font-medium">
                      +${s.cumulativePnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* Loan Balance */}
                    <td className="py-3 px-3 text-right font-mono text-purple-300 whitespace-nowrap">
                      ${s.loanBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* Events count */}
                    <td className="py-3 px-3 text-center font-mono text-slate-400">
                      {s.transactionCount}
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
