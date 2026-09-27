import React, { useState } from 'react';
import { Copy, Check, Calculator, ShieldCheck, Database, FileText } from 'lucide-react';

export function FormulaGuideView() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const FORMULAS = [
    {
      title: 'Current Active Capital (Dynamic Latest Row)',
      sheet: 'Dashboard / Summary',
      formula: '=INDEX(Transactions!F2:F, COUNTA(Transactions!F2:F))',
      explanation: 'Looks up the latest running capital value in Column F of the simplified Transactions ledger.',
    },
    {
      title: 'Cumulative Realized Trade PnL',
      sheet: 'Dashboard / Summary',
      formula: '=SUMIF(Transactions!B:B, "Trade PnL", Transactions!C:C)',
      explanation: 'Sums all realized profit and loss entries from Column C where Type is "Trade PnL".',
    },
    {
      title: 'Total Gas & Fee Drag',
      sheet: 'Dashboard / Summary',
      formula: '=SUM(Transactions!E:E) + SUMIF(Transactions!B:B, "Gas", Transactions!C:C)',
      explanation: 'Combines explicit gas event rows with per-trade execution fees in Column E.',
    },
    {
      title: 'Current Loan / Debt Balance',
      sheet: 'Dashboard / Summary',
      formula: '=INDEX(Transactions!G2:G, COUNTA(Transactions!G2:G))',
      explanation: 'Returns the latest remaining loan balance in Column G.',
    },
    {
      title: 'Total Net Capital Inflows',
      sheet: 'Dashboard / Summary',
      formula: '=SUMIF(Transactions!B:B, "Deposit", Transactions!C:C) - SUMIF(Transactions!B:B, "Withdrawal", Transactions!C:C)',
      explanation: 'Calculates net external cash added to or removed from the trading system.',
    },
    {
      title: 'Daily Return % Formula (Sheet 2 Row 2)',
      sheet: 'Daily Snapshot',
      formula: '=(G2 - B2 - C2) / B2',
      explanation: '(End Capital − Start Capital − Net Inflows) / Start Capital. Prevents capital additions from falsifying return %.',
    },
    {
      title: 'Average Daily Return %',
      sheet: 'Dashboard / Summary',
      formula: '=AVERAGE(\'Daily Snapshot\'!H2:H)',
      explanation: 'Calculates the true arithmetic mean of daily returns across all trading days.',
    },
    {
      title: 'Trading PnL to Gas Drag Ratio',
      sheet: 'Dashboard / Summary',
      formula: '=IF(SUM(Transactions!E:E)>0, SUMIF(Transactions!B:B, "Trade PnL", Transactions!C:C) / SUM(Transactions!E:E), "N/A")',
      explanation: 'Measures capital efficiency by comparing total trading gain against network and transaction fees.',
    },
  ];

  return (
    <div id="formula-guide-view" className="space-y-6">
      {/* Intro */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Formula Reference
          </span>
          <span className="text-xs text-slate-400">Google Sheets & Excel Starter Blueprint</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white">
          10-Year Spreadsheet Formulas & Architecture
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
          For a 10-year crypto trading bot business, spreadsheets outlive proprietary SaaS tools, avoid vendor lock-in, and provide an indisputable audit trail for accounting and tax calculations. Here are the exact formulas running in the 3-sheet architecture:
        </p>
      </div>

      {/* Formula Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FORMULAS.map((item, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <h3 className="text-sm font-bold text-white tracking-tight">{item.title}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                  {item.sheet}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                {item.explanation}
              </p>
            </div>

            <div className="relative group">
              <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto select-all">
                {item.formula}
              </pre>
              <button
                onClick={() => handleCopy(item.formula, idx)}
                className="absolute right-2 top-2 p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                title="Copy formula"
              >
                {copiedIndex === idx ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 4 Pillars of 10-Year Durability */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          4 Pillars for 10-Year Operational Durability
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
            <span className="font-bold text-white block">1. Currency of Record</span>
            <p className="text-slate-400 leading-relaxed">
              Record capital, loans, and returns in a single benchmark currency (USD/USDT). Keep native crypto tokens in notes to prevent accounting confusion.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
            <span className="font-bold text-white block">2. Regular Backups</span>
            <p className="text-slate-400 leading-relaxed">
              Export monthly CSV snapshots from this app or Google Sheets. Store on encrypted cold storage and cloud to protect against accidental edits.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
            <span className="font-bold text-white block">3. Gas Drag Tracking</span>
            <p className="text-slate-400 leading-relaxed">
              Never log gross returns alone. Tag every bot trade with associated on-chain gas or exchange fees to isolate which bots generate actual net cashflow.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
            <span className="font-bold text-white block">4. Separate Debt Ledger</span>
            <p className="text-slate-400 leading-relaxed">
              Keep loan principal and interest on a distinct running track from trading equity. Never disguise borrowed capital as organic trading gains.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
