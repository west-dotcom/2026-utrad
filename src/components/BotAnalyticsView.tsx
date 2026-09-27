import React from 'react';
import { Cpu, Award, Fuel, TrendingUp, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { BotStrategyStats } from '../types';

interface BotAnalyticsViewProps {
  botStats: BotStrategyStats[];
  onOpenAddTx: () => void;
}

export function BotAnalyticsView({ botStats, onOpenAddTx }: BotAnalyticsViewProps) {
  const totalNet = botStats.reduce((sum, b) => sum + b.netPnL, 0);
  const totalGas = botStats.reduce((sum, b) => sum + b.totalGas, 0);

  return (
    <div id="bot-analytics-view" className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Strategy Intelligence
          </span>
          <span className="text-xs text-slate-400">
            {botStats.length} active bot instances & strategies
          </span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white">
          Strategy PnL After Gas & Fees
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
          A fundamental principle for 10-year durability: always analyse bot profitability <strong>net of gas fees</strong>. Many strategies look profitable in raw trade logs, but lose money once Arbitrum, Ethereum, or exchange fee drags are factored in.
        </p>
      </div>

      {/* Aggregate Bot Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {botStats.map((bot) => {
          const isProfitable = bot.netPnL >= 0;
          const gasDragPct = bot.grossPnL > 0 ? (bot.totalGas / bot.grossPnL) * 100 : 0;

          return (
            <div
              key={bot.botId}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-700 transition-colors"
            >
              {/* Bot Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-800 text-blue-400">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-mono">{bot.botId}</h3>
                    <span className="text-[11px] text-slate-400">
                      {bot.firstActive} → {bot.lastActive}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded border ${
                    isProfitable
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {isProfitable ? 'NET PROFIT' : 'NET LOSS'}
                </span>
              </div>

              {/* Net PnL Highlight */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                  Net Realized Return (After Gas)
                </span>
                <span
                  className={`text-2xl font-bold font-mono ${
                    bot.netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {bot.netPnL >= 0 ? '+' : ''}${bot.netPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Breakdown Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
                  <span className="text-slate-400 block text-[10px]">Gross PnL</span>
                  <span className="font-mono font-medium text-slate-200">
                    ${bot.grossPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
                  <span className="text-slate-400 block text-[10px]">Total Gas/Fees</span>
                  <span className="font-mono font-medium text-amber-400">
                    ${bot.totalGas.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
                  <span className="text-slate-400 block text-[10px]">Win Rate</span>
                  <span className="font-mono font-medium text-slate-200">
                    {bot.winRate}% ({bot.winCount}W / {bot.lossCount}L)
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
                  <span className="text-slate-400 block text-[10px]">Profit Factor</span>
                  <span className="font-mono font-medium text-slate-200">
                    {bot.profitFactor}
                  </span>
                </div>
              </div>

              {/* Gas Drag Ratio Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Gas Drag:</span>
                  <span className="font-mono text-amber-400">{gasDragPct.toFixed(1)}% of gross</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-amber-400 h-1.5 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, gasDragPct))}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Complete Table Comparison */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 bg-slate-950/60">
          <h3 className="text-sm font-bold text-white">Full Strategy Comparison Table</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                <th className="py-3 px-4">Bot ID / Strategy</th>
                <th className="py-3 px-3 text-center">Trades</th>
                <th className="py-3 px-3 text-right">Gross PnL</th>
                <th className="py-3 px-3 text-right">Total Gas & Fees</th>
                <th className="py-3 px-3 text-right">Net Realized PnL</th>
                <th className="py-3 px-3 text-right">Win Rate %</th>
                <th className="py-3 px-3 text-right">Profit Factor</th>
                <th className="py-3 px-3 text-right">Gas Drag %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {botStats.map((bot) => {
                const gasDrag = bot.grossPnL > 0 ? (bot.totalGas / bot.grossPnL) * 100 : 0;
                return (
                  <tr key={bot.botId} className="hover:bg-slate-800/40 text-slate-200">
                    <td className="py-3 px-4 font-mono font-bold text-white">{bot.botId}</td>
                    <td className="py-3 px-3 text-center font-mono text-slate-400">{bot.transactionCount}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">
                      ${bot.grossPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-amber-400">
                      ${bot.totalGas.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-mono font-bold ${
                        bot.netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {bot.netPnL >= 0 ? '+' : ''}${bot.netPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">{bot.winRate}%</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">{bot.profitFactor}</td>
                    <td className="py-3 px-3 text-right font-mono text-amber-400">{gasDrag.toFixed(1)}%</td>
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
