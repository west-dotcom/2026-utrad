import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Sparkles,
  DollarSign,
  Percent,
  TrendingUp,
  Check,
  RotateCcw,
  Building2,
  Sprout,
  Cpu,
  Edit2,
} from 'lucide-react';
import {
  AccountData,
  AccountAssumptions,
  getInitialAccountData,
  recalculateDailyLog,
  INITIAL_ACCOUNTS,
  getStoredAccountsList,
  renameAccountInStorage,
  AccountMeta,
} from '../data/accountsData';

export interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId?: string;
  accountName?: string;
  initialStartingCapital?: number;
  initialTargetDailyRatePct?: number;
  initialPlannedDailyProfit?: number;
  initialTargetCapital?: number;
  onSave?: (updated: {
    accountId: string;
    accountName?: string;
    assumptions: AccountAssumptions;
  }) => void;
}

export function AccountSettingsModal({
  isOpen,
  onClose,
  accountId: externalAccountId,
  accountName: externalAccountName,
  initialStartingCapital,
  initialTargetDailyRatePct,
  initialPlannedDailyProfit,
  initialTargetCapital,
  onSave,
}: AccountSettingsModalProps) {
  // Determine target account ID
  const activeAccId =
    externalAccountId ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('greenharvest_active_account_id_v3') ||
        localStorage.getItem('greenharvest_active_account_id_v2') ||
        'farmland'
      : 'farmland');

  const [selectedAccId, setSelectedAccId] = useState<string>(activeAccId);
  const [accountsList, setAccountsList] = useState<AccountMeta[]>(() => getStoredAccountsList());

  // Listen to accounts updates
  useEffect(() => {
    const handleUpdate = () => {
      setAccountsList(getStoredAccountsList());
    };
    window.addEventListener('greenharvest_accounts_updated', handleUpdate);
    return () => window.removeEventListener('greenharvest_accounts_updated', handleUpdate);
  }, []);

  // Form string states for smooth, uninterrupted number typing
  const [accountNameStr, setAccountNameStr] = useState<string>('');
  const [startingCapStr, setStartingCapStr] = useState<string>('5000');
  const [targetRateStr, setTargetRateStr] = useState<string>('15');
  const [plannedProfitStr, setPlannedProfitStr] = useState<string>('1280');
  const [targetCapStr, setTargetCapStr] = useState<string>('50000');
  const [applyToSchedule, setApplyToSchedule] = useState<boolean>(true);

  // Validation & feedback state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSavedSuccess, setIsSavedSuccess] = useState<boolean>(false);

  // Load existing values for the target account when modal opens or account changes
  useEffect(() => {
    if (!isOpen) return;

    setAccountsList(getStoredAccountsList());
    setSelectedAccId(activeAccId);
  }, [isOpen, activeAccId]);

  // Load account name and assumptions whenever selectedAccId or modal opens
  useEffect(() => {
    if (!isOpen) return;

    // Load account name
    try {
      const stored = localStorage.getItem(`greenharvest_account_data_${selectedAccId}_v3`);
      if (stored) {
        const parsed: AccountData = JSON.parse(stored);
        if (parsed.name) {
          setAccountNameStr(parsed.name);
        } else {
          const currentMeta = accountsList.find((a) => a.id === selectedAccId);
          setAccountNameStr(currentMeta?.name || selectedAccId);
        }
        if (parsed.assumptions) {
          setStartingCapStr(String(parsed.assumptions.startingCapital ?? 5000));
          setTargetRateStr(String(parsed.assumptions.targetDailyRatePct ?? 15));
          setPlannedProfitStr(String(parsed.assumptions.plannedDailyProfit ?? 1280));
          setTargetCapStr(String(parsed.assumptions.targetCapital ?? 50000));
          return;
        }
      } else {
        const currentMeta = accountsList.find((a) => a.id === selectedAccId);
        setAccountNameStr(currentMeta?.name || externalAccountName || selectedAccId);
      }
    } catch (e) {
      console.warn('Failed reading account assumptions from localStorage', e);
      setAccountNameStr(externalAccountName || selectedAccId);
    }

    // Default fallback
    setStartingCapStr('5000');
    setTargetRateStr('15');
    setPlannedProfitStr('1280');
    setTargetCapStr('50000');
  }, [isOpen, selectedAccId, externalAccountName, accountsList]);

  if (!isOpen) return null;

  // Stepper adjustments
  const handleStep = (field: 'capital' | 'rate' | 'profit' | 'target', delta: number) => {
    if (field === 'capital') {
      const current = parseFloat(startingCapStr) || 0;
      setStartingCapStr(String(Math.max(0, current + delta)));
    } else if (field === 'rate') {
      const current = parseFloat(targetRateStr) || 0;
      setTargetRateStr(String(Math.max(0, parseFloat((current + delta).toFixed(1)))));
    } else if (field === 'profit') {
      const current = parseFloat(plannedProfitStr) || 0;
      setPlannedProfitStr(String(Math.max(0, current + delta)));
    } else if (field === 'target') {
      const current = parseFloat(targetCapStr) || 0;
      setTargetCapStr(String(Math.max(0, current + delta)));
    }
  };

  // Reset to default institutional standard (5,000 / 15% / 1,280 / 50,000)
  const handleResetDefaults = () => {
    setStartingCapStr('5000');
    setTargetRateStr('15');
    setPlannedProfitStr('1280');
    setTargetCapStr('50000');
    setErrorMsg(null);
  };

  // Save changes and persist to localStorage
  const handleSave = () => {
    const startingCapital = parseFloat(startingCapStr);
    const targetDailyRatePct = parseFloat(targetRateStr);
    const plannedDailyProfit = parseFloat(plannedProfitStr);
    const targetCapital = parseFloat(targetCapStr) || 50000;

    if (isNaN(startingCapital) || startingCapital < 0) {
      setErrorMsg('Please enter a valid Starting Capital ($).');
      return;
    }
    if (isNaN(targetDailyRatePct) || targetDailyRatePct < 0) {
      setErrorMsg('Please enter a valid Target Daily Rate (%).');
      return;
    }
    if (isNaN(plannedDailyProfit) || plannedDailyProfit < 0) {
      setErrorMsg('Please enter a valid Planned Daily Profit ($).');
      return;
    }

    setErrorMsg(null);

    const updatedAssumptions: AccountAssumptions = {
      startingCapital,
      targetDailyRatePct,
      plannedDailyProfit,
      targetCapital,
    };

    try {
      // 1. Load full account data or create initial template
      const storageKey = `greenharvest_account_data_${selectedAccId}_v3`;
      let accountData: AccountData;
      const rawStored = localStorage.getItem(storageKey);

      if (rawStored) {
        accountData = JSON.parse(rawStored);
      } else {
        accountData = getInitialAccountData(selectedAccId);
      }

      // 2. Update assumptions and account name
      accountData.assumptions = updatedAssumptions;

      if (accountNameStr.trim()) {
        accountData.name = accountNameStr.trim();
        renameAccountInStorage(selectedAccId, accountNameStr.trim());
      }

      // 3. If applyToSchedule is true, update empty daily log rows with plannedDailyProfit
      if (applyToSchedule && accountData.dailyLog && accountData.dailyLog.length > 0) {
        accountData.dailyLog = accountData.dailyLog.map((row, idx) => {
          if (idx === 0) return row; // Row 0 is the initial one-off loss
          if (idx <= 14 || row.dailyReturn === 0) {
            return {
              ...row,
              dailyReturn: plannedDailyProfit,
              notes: row.notes || `Applied planned profit ($${plannedDailyProfit.toLocaleString()})`,
            };
          }
          return row;
        });
      }

      // 4. Recalculate daily log formulas cascading from the new starting capital and rate
      accountData.dailyLog = recalculateDailyLog(
        accountData.dailyLog,
        startingCapital,
        targetDailyRatePct
      );

      // 5. Persist updated account data to localStorage
      localStorage.setItem(storageKey, JSON.stringify(accountData));

      // 6. Also persist standalone backup keys
      localStorage.setItem(
        `greenharvest_assumptions_${selectedAccId}`,
        JSON.stringify(updatedAssumptions)
      );
      localStorage.setItem(
        'crypto_bot_daily_profit_target_v1',
        String(plannedDailyProfit)
      );

      // 7. Dispatch custom event so all active views update immediately
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('greenharvest_account_settings_updated', {
            detail: {
              accountId: selectedAccId,
              assumptions: updatedAssumptions,
              accountData,
            },
          })
        );
      }

      setIsSavedSuccess(true);

      // Notify parent callback
      if (onSave) {
        onSave({
          accountId: selectedAccId,
          accountName: accountNameStr.trim() || undefined,
          assumptions: updatedAssumptions,
        });
      }

      // Close modal after brief success confirmation
      setTimeout(() => {
        setIsSavedSuccess(false);
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Failed saving account settings to localStorage', err);
      setErrorMsg(`Failed saving to storage: ${err.message || 'Unknown error'}`);
    }
  };

  const currentAccMeta =
    accountsList.find((a) => a.id === selectedAccId) ||
    INITIAL_ACCOUNTS.find((a) => a.id === selectedAccId);

  return (
    <div
      id="account-settings-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="account-settings-modal-container"
        className="w-full max-w-xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/60 p-6 space-y-5 text-slate-100 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="account-settings-modal-title"
        aria-modal="true"
      >
        {/* Top Accent Glow Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400"></div>

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-xs">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  id="account-settings-modal-title"
                  className="text-lg font-bold text-white tracking-tight"
                >
                  Account Operating Assumptions
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-400/20 text-amber-300 border border-amber-400/40 uppercase">
                  Yellow Cells
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure core financial drivers for{' '}
                <strong className="text-white">
                  {externalAccountName || currentAccMeta?.name || selectedAccId}
                </strong>
                . Persists to localStorage and synchronizes all formulas.
              </p>
            </div>
          </div>

          <button
            id="account-settings-close-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Account Selector Pill (Farmland, Firmly, Gadget + User-Created Accounts) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
          <span className="text-slate-400 font-mono text-[11px] whitespace-nowrap">
            Selected Account ({accountsList.length}):
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 max-w-full">
            {accountsList.map((acc) => {
              const isSelected = selectedAccId === acc.id;
              const Icon =
                acc.icon === 'sprout' || acc.type === 'Agricultural Yield'
                  ? Sprout
                  : acc.icon === 'cpu' || acc.type === 'Grid / Gadget Bot'
                  ? Cpu
                  : Building2;
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setSelectedAccId(acc.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 text-white border border-slate-600 shadow-xs font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{acc.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Inputs */}
        <div className="space-y-4">
          {/* Account Name (Rename) Field */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-700 hover:border-amber-400/60 shadow-sm space-y-2 transition-colors">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <label htmlFor="settings-account-name" className="text-amber-300 flex items-center gap-1.5">
                <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Account Name (Rename)</span>
              </label>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                ID: {selectedAccId}
              </span>
            </div>
            <input
              id="settings-account-name"
              type="text"
              value={accountNameStr}
              onChange={(e) => setAccountNameStr(e.target.value)}
              placeholder="e.g. Farmland or Firmly or Alpha Bot"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-base font-bold text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all shadow-inner"
              required
            />
            <p className="text-[10px] text-slate-400">
              Change the display name of this account across the header, navigation tabs, and sheets.
            </p>
          </div>

          {/* 1. Starting Capital ($) */}
          <div className="p-4 rounded-xl bg-slate-950/80 border-2 border-amber-400/70 shadow-sm space-y-2 hover:border-amber-400 transition-colors">
            <div className="flex items-center justify-between text-xs font-bold">
              <label htmlFor="settings-starting-capital" className="text-amber-300 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                <span>Starting Capital</span>
                <span className="text-[10px] text-amber-400/80 font-mono">($)</span>
              </label>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                Yellow Cell • Row 0
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 text-lg font-bold text-amber-400 font-mono">$</span>
                <input
                  id="settings-starting-capital"
                  type="number"
                  step="100"
                  value={startingCapStr}
                  onChange={(e) => setStartingCapStr(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-amber-950/30 border-2 border-amber-400/80 rounded-lg text-xl font-bold font-mono text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-300 transition-all shadow-inner"
                  placeholder="5000"
                />
              </div>

              {/* Stepper buttons */}
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => handleStep('capital', 500)}
                  className="px-2.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer"
                  title="Add $500"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => handleStep('capital', -500)}
                  className="px-2.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer"
                  title="Subtract $500"
                >
                  -
                </button>
              </div>
            </div>

            {/* Presets */}
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-500">Quick Presets:</span>
              <div className="flex items-center gap-1.5">
                {[1000, 5000, 10000, 25000, 50000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setStartingCapStr(String(val))}
                    className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      parseFloat(startingCapStr) === val
                        ? 'bg-amber-400 text-slate-950 font-bold border-amber-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-amber-300 hover:border-slate-700'
                    }`}
                  >
                    ${val >= 1000 ? `${val / 1000}k` : val}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-amber-200/70">
              The principal capital balance allocated on Day 1 before one-off deductions.
            </p>
          </div>

          {/* 2. Target Daily Rate (%) */}
          <div className="p-4 rounded-xl bg-slate-950/80 border-2 border-amber-400/70 shadow-sm space-y-2 hover:border-amber-400 transition-colors">
            <div className="flex items-center justify-between text-xs font-bold">
              <label htmlFor="settings-target-daily-rate" className="text-amber-300 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-amber-400" />
                <span>Target Daily Rate</span>
                <span className="text-[10px] text-amber-400/80 font-mono">(%)</span>
              </label>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                Yellow Cell • Benchmark
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  id="settings-target-daily-rate"
                  type="number"
                  step="0.5"
                  value={targetRateStr}
                  onChange={(e) => setTargetRateStr(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 bg-amber-950/30 border-2 border-amber-400/80 rounded-lg text-xl font-bold font-mono text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-300 transition-all shadow-inner"
                  placeholder="15"
                />
                <span className="absolute right-3 top-2.5 text-lg font-bold text-amber-400 font-mono">%</span>
              </div>

              {/* Stepper buttons */}
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => handleStep('rate', 1)}
                  className="px-2.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer"
                  title="Add 1%"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => handleStep('rate', -1)}
                  className="px-2.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer"
                  title="Subtract 1%"
                >
                  -
                </button>
              </div>
            </div>

            {/* Presets */}
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-500">Quick Presets:</span>
              <div className="flex items-center gap-1.5">
                {[5, 10, 15, 20, 25].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTargetRateStr(String(val))}
                    className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      parseFloat(targetRateStr) === val
                        ? 'bg-amber-400 text-slate-950 font-bold border-amber-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-amber-300 hover:border-slate-700'
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-amber-200/70">
              Bot algorithmic target yield benchmark applied across the daily log.
            </p>
          </div>

          {/* 3. Planned Daily Profit ($) */}
          <div className="p-4 rounded-xl bg-slate-950/80 border-2 border-amber-400/70 shadow-sm space-y-2 hover:border-amber-400 transition-colors">
            <div className="flex items-center justify-between text-xs font-bold">
              <label htmlFor="settings-planned-daily-profit" className="text-amber-300 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                <span>Planned Daily Profit</span>
                <span className="text-[10px] text-amber-400/80 font-mono">($)</span>
              </label>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                Yellow Cell • Recovery Driver
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 text-lg font-bold text-amber-400 font-mono">$</span>
                <input
                  id="settings-planned-daily-profit"
                  type="number"
                  step="50"
                  value={plannedProfitStr}
                  onChange={(e) => setPlannedProfitStr(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-amber-950/30 border-2 border-amber-400/80 rounded-lg text-xl font-bold font-mono text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-300 transition-all shadow-inner"
                  placeholder="1280"
                />
              </div>

              {/* Stepper buttons */}
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => handleStep('profit', 100)}
                  className="px-2.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer"
                  title="Add $100"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => handleStep('profit', -100)}
                  className="px-2.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer"
                  title="Subtract $100"
                >
                  -
                </button>
              </div>
            </div>

            {/* Presets */}
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-500">Quick Presets:</span>
              <div className="flex items-center gap-1.5">
                {[500, 1000, 1280, 2000, 2500].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPlannedProfitStr(String(val))}
                    className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      parseFloat(plannedProfitStr) === val
                        ? 'bg-amber-400 text-slate-950 font-bold border-amber-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-amber-300 hover:border-slate-700'
                    }`}
                  >
                    ${val}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-amber-200/70">
              The benchmark daily dollar return used to calculate the drawdown recovery velocity.
            </p>
          </div>

          {/* Schedule Propagation Toggle */}
          <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors text-xs">
            <input
              type="checkbox"
              checked={applyToSchedule}
              onChange={(e) => setApplyToSchedule(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 bg-slate-900 border-slate-700 focus:ring-emerald-500 focus:ring-offset-slate-950"
            />
            <div className="space-y-0.5">
              <span className="font-semibold text-slate-200">
                Apply Planned Daily Profit to Upcoming Schedule Rows
              </span>
              <p className="text-[11px] text-slate-400">
                Automatically populate the next 14 days and all unrecorded days with this planned profit.
              </p>
            </div>
          </label>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              id="account-settings-save-btn"
              type="button"
              onClick={handleSave}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                isSavedSuccess
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-500 hover:from-amber-300 hover:to-emerald-400 text-slate-950'
              }`}
            >
              {isSavedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Settings Saved!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Save Settings to Storage</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
