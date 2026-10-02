import React, { useState, useEffect } from 'react';
import { X, PlusCircle, ArrowUpRight, ArrowDownRight, Calendar, DollarSign, ChevronRight, Activity, Tag } from 'lucide-react';
import { Transaction, TransactionType, MarketCondition } from '../types';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Omit<Transaction, 'id' | 'runningCapital' | 'loanBalance'>, editId?: string) => void;
  editTransaction?: Transaction | null;
  currentCapital: number;
  currentLoanBalance: number;
}

const TRANSACTION_TYPES: { type: TransactionType; label: string; desc: string }[] = [
  { type: 'Trade PnL', label: 'Trade PnL', desc: 'Daily realized trading profit or loss' },
  { type: 'Deposit', label: 'Deposit', desc: 'External capital added to trading account' },
  { type: 'Withdrawal', label: 'Withdrawal', desc: 'Funds moved to bank or cold storage' },
  { type: 'Loan In', label: 'Loan Drawdown', desc: 'Borrowed funds received into capital' },
  { type: 'Loan Out', label: 'Loan Repayment', desc: 'Principal repaid back to lender' },
  { type: 'Interest', label: 'Loan Interest', desc: 'Accrued financing cost deducted from capital' },
];

const POPULAR_ASSETS = ['USDT', 'USDC', 'USD', 'BTC', 'ETH', 'SOL'];

const MARKET_CONDITIONS_OPTIONS: {
  value: MarketCondition;
  label: string;
  badge: string;
  icon: string;
}[] = [
  { value: 'Bullish', label: 'Bullish (Uptrend / Buying)', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: '📈' },
  { value: 'Bearish', label: 'Bearish (Downtrend / Selling)', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40', icon: '📉' },
  { value: 'Sideways', label: 'Sideways (Rangebound / Grid)', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40', icon: '↔️' },
  { value: 'Volatile', label: 'Volatile (Spikes / Choppy)', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40', icon: '⚡' },
];

const QUICK_CONDITION_MEMOS = [
  { label: '↔️ Sideways', condition: 'Sideways' as MarketCondition, memo: 'Sideways consolidation range' },
  { label: '🟢 Buying', condition: 'Bullish' as MarketCondition, memo: 'Buying trend / dip execution' },
  { label: '🔴 Selling', condition: 'Bearish' as MarketCondition, memo: 'Selling pressure / short profit' },
  { label: '📈 Bullish', condition: 'Bullish' as MarketCondition, memo: 'Bullish momentum breakout' },
  { label: '📉 Bearish', condition: 'Bearish' as MarketCondition, memo: 'Bearish drawdown hedge' },
  { label: '⚡ Volatile', condition: 'Volatile' as MarketCondition, memo: 'High volatility whipsaw cycle' },
];

export function AddTransactionModal({
  isOpen,
  onClose,
  onSave,
  editTransaction,
  currentCapital,
  currentLoanBalance,
}: AddTransactionModalProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<TransactionType>('Trade PnL');
  const [amount, setAmount] = useState<string>('500');
  const [asset, setAsset] = useState('USDT');
  const [marketCondition, setMarketCondition] = useState<MarketCondition>('Bullish');
  const [notes, setNotes] = useState<string>('');

  // Shift date helper (+1d, -1d, etc.)
  const shiftDate = (days: number) => {
    try {
      const parts = date.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const dateObj = new Date(year, month, day);
        dateObj.setDate(dateObj.getDate() + days);
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        setDate(`${y}-${m}-${d}`);
        return;
      }
      const fallback = new Date();
      fallback.setDate(fallback.getDate() + days);
      setDate(fallback.toISOString().split('T')[0]);
    } catch {
      setDate(new Date().toISOString().split('T')[0]);
    }
  };

  useEffect(() => {
    if (editTransaction) {
      setDate(editTransaction.date);
      setType(editTransaction.type);
      setAmount(String(editTransaction.amount));
      setAsset(editTransaction.asset);
      setMarketCondition(editTransaction.marketCondition || 'Bullish');
      setNotes(editTransaction.notes || '');
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setType('Trade PnL');
      setAmount('350');
      setAsset('USDT');
      setMarketCondition('Bullish');
      setNotes('');
    }
  }, [editTransaction, isOpen]);

  if (!isOpen) return null;

  const parsedAmount = parseFloat(amount) || 0;

  // Live impact calculation
  let capitalDelta = 0;
  let loanDelta = 0;

  switch (type) {
    case 'Deposit':
      capitalDelta = Math.abs(parsedAmount);
      break;
    case 'Withdrawal':
      capitalDelta = -Math.abs(parsedAmount);
      break;
    case 'Trade PnL':
      capitalDelta = parsedAmount;
      break;
    case 'Loan In':
      capitalDelta = Math.abs(parsedAmount);
      loanDelta = Math.abs(parsedAmount);
      break;
    case 'Loan Out':
      capitalDelta = -Math.abs(parsedAmount);
      loanDelta = -Math.abs(parsedAmount);
      break;
    case 'Interest':
      capitalDelta = -Math.abs(parsedAmount);
      break;
    default:
      break;
  }

  const projectedCapital = currentCapital + capitalDelta;
  const projectedLoan = Math.max(0, currentLoanBalance + loanDelta);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(
      {
        date,
        type,
        amount: parsedAmount,
        asset,
        gasFee: 0,
        marketCondition,
        notes: notes.trim(),
      },
      editTransaction ? editTransaction.id : undefined
    );
  };

  const handleApplyConditionPreset = (preset: typeof QUICK_CONDITION_MEMOS[0]) => {
    setMarketCondition(preset.condition);
    if (!notes) {
      setNotes(preset.memo);
    } else if (!notes.toLowerCase().includes(preset.condition.toLowerCase())) {
      setNotes(`[${preset.condition}] ${notes}`);
    }
  };

  return (
    <div
      id="add-tx-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="add-tx-modal-container"
        className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-400" />
              {editTransaction ? 'Edit Daily Transaction' : 'Manual Daily Data Entry'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter daily trading performance, deposits, withdrawals, or loans.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Row 1: Date & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Date</span>
                </span>
                <div className="flex items-center gap-1 text-[10px] font-mono normal-case">
                  <button
                    type="button"
                    onClick={() => shiftDate(-1)}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                    title="Previous Day (-1 Day)"
                  >
                    ❮ -1d
                  </button>
                  <button
                    type="button"
                    onClick={() => setDate(new Date().toISOString().split('T')[0])}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                    title="Set to Today"
                  >
                    Today
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-950 border-2 border-slate-700 hover:border-emerald-500/60 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold transition-all shadow-inner focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => shiftDate(1)}
                  className="shrink-0 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs font-mono flex items-center gap-1 shadow-md hover:shadow-emerald-950/40 border border-emerald-400/40 transition-all cursor-pointer active:scale-95 group"
                  title="Advance to Next Date (+1 Day)"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Event Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TransactionType)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:border-emerald-500"
              >
                {TRANSACTION_TYPES.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Type explanation tip */}
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
            {TRANSACTION_TYPES.find((t) => t.type === type)?.desc}
          </div>

          {/* Row 2: Amount & Asset */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                Amount {type === 'Trade PnL' ? '(+ Gain / - Loss)' : ''}
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder={type === 'Trade PnL' ? 'e.g. 450 or -120' : 'e.g. 5000'}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Asset Currency
              </label>
              <input
                type="text"
                required
                value={asset}
                onChange={(e) => setAsset(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:border-emerald-500"
              />
              <div className="flex gap-1.5 mt-1.5">
                {POPULAR_ASSETS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAsset(a)}
                    className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                      asset === a
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 3: Market Trading Condition Dropdown */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Market Condition</span>
                <span className="text-[10px] text-slate-400 font-normal lowercase">(categorizes strategy performance)</span>
              </label>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                MARKET_CONDITIONS_OPTIONS.find((c) => c.value === marketCondition)?.badge || 'bg-slate-800 text-slate-300'
              }`}>
                {MARKET_CONDITIONS_OPTIONS.find((c) => c.value === marketCondition)?.icon} {marketCondition}
              </span>
            </div>

            <select
              id="modal-market-condition-select"
              value={marketCondition}
              onChange={(e) => setMarketCondition(e.target.value as MarketCondition)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:border-emerald-500 font-medium"
            >
              {MARKET_CONDITIONS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.icon} {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Row 4: Notes / Trade Memo with Quick Condition Buttons */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-400" />
                <span>Note / Bot Memo</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal normal-case">
                Click preset to apply condition & memo:
              </span>
            </div>

            {/* Quick condition presets */}
            <div className="flex flex-wrap gap-1.5 pb-1">
              {QUICK_CONDITION_MEMOS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleApplyConditionPreset(preset)}
                  className={`text-[10px] px-2 py-1 rounded-lg border font-mono font-medium transition-all cursor-pointer ${
                    marketCondition === preset.condition
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 shadow-xs'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-850'
                  }`}
                  title={`Set to ${preset.condition} and insert "${preset.memo}"`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="e.g. Sideways range grid execution or Bullish breakout"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Live Impact Preview */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] block">
              Ledger Balance Impact Preview
            </span>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-slate-400 block">Capital Impact:</span>
                <span
                  className={`font-mono text-sm font-semibold flex items-center gap-1 ${
                    capitalDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {capitalDelta >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {capitalDelta >= 0 ? '+' : ''}${capitalDelta.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  → New Cap: ${projectedCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block">Loan Balance Impact:</span>
                <span
                  className={`font-mono text-sm font-semibold ${
                    loanDelta > 0 ? 'text-amber-400' : loanDelta < 0 ? 'text-emerald-400' : 'text-slate-300'
                  }`}
                >
                  {loanDelta > 0 ? `+${loanDelta}` : loanDelta < 0 ? loanDelta : '$0'}
                </span>
                <span className="text-[11px] text-slate-500 font-mono block">
                  → New Debt: ${projectedLoan.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
            >
              Cancel
            </button>
            <button
              id="submit-tx-btn"
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              {editTransaction ? 'Save Changes' : 'Append Daily Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
