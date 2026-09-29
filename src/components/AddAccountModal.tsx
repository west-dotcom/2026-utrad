import React, { useState } from 'react';
import {
  X,
  Plus,
  DollarSign,
  Fuel,
  TrendingDown,
  TrendingUp,
  Percent,
  Calculator,
  ShieldCheck,
  Building2,
  Sprout,
  Cpu,
} from 'lucide-react';
import {
  createNewAccountInStorage,
  AccountMeta,
  AccountData,
} from '../data/accountsData';

export interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountCreated?: (newAccount: AccountMeta, accountData: AccountData) => void;
}

export function AddAccountModal({
  isOpen,
  onClose,
  onAccountCreated,
}: AddAccountModalProps) {
  const [accountName, setAccountName] = useState('');
  const [strategyType, setStrategyType] = useState('Firm Arbitrage');
  const [startingCapitalStr, setStartingCapitalStr] = useState('5000');
  const [gasFeeStr, setGasFeeStr] = useState('1175');
  const [tradeLossStr, setTradeLossStr] = useState('2545');
  const [targetRateStr, setTargetRateStr] = useState('15');
  const [plannedProfitStr, setPlannedProfitStr] = useState('1280');
  const [targetCapitalStr, setTargetCapitalStr] = useState('50000');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const numStartingCap = Math.max(0, parseFloat(startingCapitalStr) || 0);
  const numGasFee = Math.max(0, parseFloat(gasFeeStr) || 0);
  const numTradeLoss = Math.max(0, parseFloat(tradeLossStr) || 0);
  const numTargetRate = Math.max(0, parseFloat(targetRateStr) || 0);
  const numPlannedProfit = Math.max(0, parseFloat(plannedProfitStr) || 0);
  const numTargetCap = Math.max(numStartingCap, parseFloat(targetCapitalStr) || 50000);

  const initialDeficit = -(numGasFee + numTradeLoss);
  const netDay1Ending = numStartingCap + initialDeficit;

  const handleStep = (
    field: 'capital' | 'gas' | 'loss' | 'rate' | 'profit' | 'target',
    delta: number
  ) => {
    if (field === 'capital') {
      setStartingCapitalStr(String(Math.max(0, numStartingCap + delta)));
    } else if (field === 'gas') {
      setGasFeeStr(String(Math.max(0, numGasFee + delta)));
    } else if (field === 'loss') {
      setTradeLossStr(String(Math.max(0, numTradeLoss + delta)));
    } else if (field === 'rate') {
      setTargetRateStr(String(Math.max(0, parseFloat((numTargetRate + delta).toFixed(1)))));
    } else if (field === 'profit') {
      setPlannedProfitStr(String(Math.max(0, numPlannedProfit + delta)));
    } else if (field === 'target') {
      setTargetCapitalStr(String(Math.max(0, numTargetCap + delta)));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim()) {
      setErrorMsg('Please enter an account name.');
      return;
    }
    if (numStartingCap <= 0) {
      setErrorMsg('Please enter a valid starting capital amount (money in question).');
      return;
    }

    try {
      const result = createNewAccountInStorage({
        name: accountName.trim(),
        type: strategyType,
        startingCapital: numStartingCap,
        gasFee: numGasFee,
        tradeLoss: numTradeLoss,
        targetDailyRatePct: numTargetRate,
        plannedDailyProfit: numPlannedProfit,
        targetCapital: numTargetCap,
      });

      if (onAccountCreated) {
        onAccountCreated(result.newAccount, result.accountData);
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create account.');
    }
  };

  return (
    <div
      id="add-account-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="add-account-modal-container"
        className="w-full max-w-xl my-8 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-5 text-slate-100 relative"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Top Accent Strip */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-400 to-teal-400 rounded-t-2xl"></div>

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Add New Trading Account
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure account name, starting capital (money in question), gas fees, and yield drivers.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/60 text-rose-200 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* 1. Account Name & Strategy Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-slate-200 font-semibold flex items-center gap-1.5">
                <span>Account Name</span>
                <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. Firmly or Masaka Harvest"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-bold text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-inner"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-200 font-semibold">Strategy & Category</label>
              <select
                value={strategyType}
                onChange={(e) => setStrategyType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 shadow-inner"
              >
                <option value="Firm Arbitrage">🏢 Firm Arbitrage</option>
                <option value="Agricultural Yield">🌾 Agricultural Yield</option>
                <option value="Grid / Gadget Bot">⚡ Grid / Gadget Bot</option>
                <option value="Custom Bot">⚙️ Custom Bot</option>
              </select>
            </div>
          </div>

          {/* 2. THE MONEY IN QUESTION (Starting Capital) - Yellow Cell Focus */}
          <div className="p-4 rounded-xl bg-slate-950/90 border-2 border-amber-400/80 shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-amber-300 font-bold flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span>The Money in Question (Starting Capital)</span>
              </label>
              <span className="text-[10px] font-mono bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded font-bold border border-amber-400/30">
                Yellow Cell • Row 0
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 text-lg font-bold text-amber-400 font-mono">$</span>
                <input
                  type="number"
                  step="100"
                  value={startingCapitalStr}
                  onChange={(e) => setStartingCapitalStr(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-amber-950/20 border-2 border-amber-400/70 rounded-lg text-xl font-bold font-mono text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
                  placeholder="5000"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => handleStep('capital', 500)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-slate-700 cursor-pointer"
                  title="Add $500"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => handleStep('capital', -500)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-slate-700 cursor-pointer"
                  title="Subtract $500"
                >
                  -
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <span className="text-slate-500">Presets:</span>
              {[2500, 5000, 10000, 25000, 50000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setStartingCapitalStr(String(val))}
                  className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                    numStartingCap === val
                      ? 'bg-amber-400 text-slate-950 font-bold border-amber-400'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-amber-300 hover:border-slate-700'
                  }`}
                >
                  ${val.toLocaleString()}
                </button>
              ))}
            </div>

            <p className="text-[10px] text-slate-400">
              Initial principal deposit allocated for this bot or trading operations account.
            </p>
          </div>

          {/* 3. GAS FEES & TRADE DRAWDOWN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Gas Fees Input */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-700 hover:border-purple-400/60 transition-colors space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-purple-300 font-bold flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5 text-purple-400" />
                  <span>Gas Fees (UGas / Cost)</span>
                </label>
                <span className="text-[10px] font-mono text-purple-400/80">Outflow ($)</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1.5 text-sm font-bold text-purple-400 font-mono">$</span>
                  <input
                    type="number"
                    step="50"
                    value={gasFeeStr}
                    onChange={(e) => setGasFeeStr(e.target.value)}
                    className="w-full pl-6 pr-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-base font-bold font-mono text-purple-200 focus:outline-none focus:border-purple-400 shadow-inner"
                    placeholder="1175"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleStep('gas', 100)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold text-[10px] border border-slate-700 cursor-pointer"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStep('gas', -100)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold text-[10px] border border-slate-700 cursor-pointer"
                  >
                    -
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[10px] font-mono">
                <span className="text-slate-500">Presets:</span>
                {[0, 250, 500, 1175].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setGasFeeStr(String(val))}
                    className={`px-1 py-0.5 rounded border transition-colors cursor-pointer ${
                      numGasFee === val
                        ? 'bg-purple-500 text-white font-bold border-purple-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-purple-300'
                    }`}
                  >
                    ${val}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400">
                UGas energy tokens, gas fees, or bridge costs deducted at bot activation.
              </p>
            </div>

            {/* Initial Trade Loss / Realized Deficit */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-700 hover:border-rose-400/60 transition-colors space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-rose-300 font-bold flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                  <span>Initial Trade Loss (Deficit)</span>
                </label>
                <span className="text-[10px] font-mono text-rose-400/80">Outflow ($)</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1.5 text-sm font-bold text-rose-400 font-mono">$</span>
                  <input
                    type="number"
                    step="50"
                    value={tradeLossStr}
                    onChange={(e) => setTradeLossStr(e.target.value)}
                    className="w-full pl-6 pr-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-base font-bold font-mono text-rose-200 focus:outline-none focus:border-rose-400 shadow-inner"
                    placeholder="2545"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleStep('loss', 100)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold text-[10px] border border-slate-700 cursor-pointer"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStep('loss', -100)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold text-[10px] border border-slate-700 cursor-pointer"
                  >
                    -
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[10px] font-mono">
                <span className="text-slate-500">Presets:</span>
                {[0, 1000, 2000, 2545].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTradeLossStr(String(val))}
                    className={`px-1 py-0.5 rounded border transition-colors cursor-pointer ${
                      numTradeLoss === val
                        ? 'bg-rose-500 text-white font-bold border-rose-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-rose-300'
                    }`}
                  >
                    ${val}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400">
                Initial trade drawdown or one-off loss (can be $0 for fresh accounts).
              </p>
            </div>
          </div>

          {/* 4. OPERATIONAL BENCHMARKS (Target Rate & Planned Daily Profit) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-slate-300 font-semibold">
                <span className="flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-amber-400" />
                  Target Daily Rate (%)
                </span>
                <span className="text-[10px] text-amber-400 font-mono">Yellow Cell</span>
              </div>
              <input
                type="number"
                step="0.5"
                value={targetRateStr}
                onChange={(e) => setTargetRateStr(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold focus:outline-none focus:border-amber-400"
                placeholder="15"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-slate-300 font-semibold">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  Planned Daily Profit ($)
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">Yellow Cell</span>
              </div>
              <input
                type="number"
                step="50"
                value={plannedProfitStr}
                onChange={(e) => setPlannedProfitStr(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold focus:outline-none focus:border-emerald-400"
                placeholder="1280"
              />
            </div>
          </div>

          {/* 5. LIVE RECONCILIATION PREVIEW */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold border-b border-slate-800/80 pb-1.5">
              <span className="flex items-center gap-1 text-slate-300">
                <Calculator className="w-3.5 h-3.5 text-teal-400" />
                Day 1 Reconciliation Preview
              </span>
              <span>Account: {accountName || 'New Account'}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
              <div className="p-2 rounded-lg bg-slate-900/80">
                <div className="text-[10px] text-slate-500 uppercase">Starting Capital</div>
                <div className="text-amber-300 font-bold text-sm">
                  ${numStartingCap.toLocaleString()}
                </div>
              </div>

              <div className="p-2 rounded-lg bg-slate-900/80">
                <div className="text-[10px] text-slate-500 uppercase">Gas Fees</div>
                <div className="text-purple-300 font-bold text-sm">
                  -${numGasFee.toLocaleString()}
                </div>
              </div>

              <div className="p-2 rounded-lg bg-slate-900/80">
                <div className="text-[10px] text-slate-500 uppercase">Trade Loss</div>
                <div className="text-rose-300 font-bold text-sm">
                  -${numTradeLoss.toLocaleString()}
                </div>
              </div>

              <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30">
                <div className="text-[10px] text-emerald-400 uppercase">Day 1 Net Ending</div>
                <div className="text-emerald-300 font-bold text-sm">
                  ${netDay1Ending.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/40 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Account</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
