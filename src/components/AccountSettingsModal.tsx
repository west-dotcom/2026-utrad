import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Sparkles,
  DollarSign,
  Percent,
  TrendingUp,
  TrendingDown,
  Check,
  RotateCcw,
  Building2,
  Sprout,
  Cpu,
  Edit2,
  Landmark,
  ArrowUpRight,
  Fuel,
  Wallet,
  ShieldCheck,
} from 'lucide-react';
import {
  AccountData,
  AccountAssumptions,
  CashFlowType,
  CashFlowItem,
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
  initialLoan?: number;
  initialWithdrawal?: number;
  initialUGasFee?: number;
  initialTradeLoss?: number;
  onSave?: (updated: {
    accountId: string;
    accountName?: string;
    assumptions: AccountAssumptions;
    accountData?: AccountData;
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
  initialLoan,
  initialWithdrawal,
  initialUGasFee,
  initialTradeLoss,
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

  // The 4 requested financial parameters: The loan, withdrawal, U-gas, and money lost
  const [loanStr, setLoanStr] = useState<string>('0');
  const [withdrawalStr, setWithdrawalStr] = useState<string>('0');
  const [uGasStr, setUGasStr] = useState<string>('0');
  const [moneyLostStr, setMoneyLostStr] = useState<string>('0');

  const [applyToSchedule, setApplyToSchedule] = useState<boolean>(true);

  // Validation & feedback state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSavedSuccess, setIsSavedSuccess] = useState<boolean>(false);

  // Sync selected account when activeAccId changes
  useEffect(() => {
    if (!isOpen) return;
    setAccountsList(getStoredAccountsList());
    setSelectedAccId(activeAccId);
  }, [isOpen, activeAccId]);

  // Load account data, name, assumptions, loan, withdrawal, U-gas, and money lost
  useEffect(() => {
    if (!isOpen) return;

    try {
      const stored =
        localStorage.getItem(`greenharvest_account_data_${selectedAccId}_v3`) ||
        localStorage.getItem(`greenharvest_account_data_${selectedAccId}_v2`);

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

          // Load Loan
          if (parsed.assumptions.loanAmount !== undefined) {
            setLoanStr(String(parsed.assumptions.loanAmount));
          } else {
            const loanCf = parsed.cashFlows?.find((c) => c.type === 'Loan In');
            setLoanStr(loanCf ? String(Math.abs(loanCf.amount)) : '0');
          }

          // Load Withdrawal
          if (parsed.assumptions.withdrawalAmount !== undefined) {
            setWithdrawalStr(String(parsed.assumptions.withdrawalAmount));
          } else {
            const withCf = parsed.cashFlows?.find((c) => c.type === 'Withdrawal');
            setWithdrawalStr(withCf ? String(Math.abs(withCf.amount)) : '0');
          }

          // Load U-Gas
          if (parsed.assumptions.ugasFee !== undefined) {
            setUGasStr(String(Math.abs(parsed.assumptions.ugasFee)));
          } else if (parsed.oneOffLosses?.ugasFee !== undefined) {
            setUGasStr(String(Math.abs(parsed.oneOffLosses.ugasFee)));
          } else {
            const gasCf = parsed.cashFlows?.find((c) => c.type === 'Gas');
            setUGasStr(gasCf ? String(Math.abs(gasCf.amount)) : '0');
          }

          // Load Money Lost
          if (parsed.assumptions.moneyLost !== undefined) {
            setMoneyLostStr(String(Math.abs(parsed.assumptions.moneyLost)));
          } else if (parsed.oneOffLosses?.tradeLoss !== undefined) {
            setMoneyLostStr(String(Math.abs(parsed.oneOffLosses.tradeLoss)));
          } else {
            const lossCf = parsed.cashFlows?.find((c) => c.type === 'Trade Loss');
            setMoneyLostStr(lossCf ? String(Math.abs(lossCf.amount)) : '0');
          }
          return;
        }
      }
    } catch (e) {
      console.warn('Failed reading account assumptions from localStorage', e);
    }

    // Default fallback based on initial account data template
    const initData = getInitialAccountData(selectedAccId);
    setAccountNameStr(initData.name || externalAccountName || selectedAccId);
    setStartingCapStr(String(initData.assumptions.startingCapital ?? 5000));
    setTargetRateStr(String(initData.assumptions.targetDailyRatePct ?? 15));
    setPlannedProfitStr(String(initData.assumptions.plannedDailyProfit ?? 1280));
    setTargetCapStr(String(initData.assumptions.targetCapital ?? 50000));

    // Loan default
    const defLoan = initData.cashFlows?.find((c) => c.type === 'Loan In');
    setLoanStr(defLoan ? String(Math.abs(defLoan.amount)) : '0');

    // Withdrawal default
    const defWith = initData.cashFlows?.find((c) => c.type === 'Withdrawal');
    setWithdrawalStr(defWith ? String(Math.abs(defWith.amount)) : '0');

    // U-Gas default
    setUGasStr(String(Math.abs(initData.oneOffLosses?.ugasFee ?? 0)));

    // Money lost default
    setMoneyLostStr(String(Math.abs(initData.oneOffLosses?.tradeLoss ?? 0)));
  }, [isOpen, selectedAccId, externalAccountName, accountsList]);

  if (!isOpen) return null;

  // Stepper adjustments
  const handleStep = (
    field: 'capital' | 'rate' | 'profit' | 'target' | 'loan' | 'withdrawal' | 'ugas' | 'loss',
    delta: number
  ) => {
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
    } else if (field === 'loan') {
      const current = parseFloat(loanStr) || 0;
      setLoanStr(String(Math.max(0, current + delta)));
    } else if (field === 'withdrawal') {
      const current = parseFloat(withdrawalStr) || 0;
      setWithdrawalStr(String(Math.max(0, current + delta)));
    } else if (field === 'ugas') {
      const current = parseFloat(uGasStr) || 0;
      setUGasStr(String(Math.max(0, current + delta)));
    } else if (field === 'loss') {
      const current = parseFloat(moneyLostStr) || 0;
      setMoneyLostStr(String(Math.max(0, current + delta)));
    }
  };

  // Reset to default standard
  const handleResetDefaults = () => {
    const initData = getInitialAccountData(selectedAccId);
    setStartingCapStr(String(initData.assumptions.startingCapital ?? 5000));
    setTargetRateStr(String(initData.assumptions.targetDailyRatePct ?? 15));
    setPlannedProfitStr(String(initData.assumptions.plannedDailyProfit ?? 1280));
    setTargetCapStr(String(initData.assumptions.targetCapital ?? 50000));

    const defLoan = initData.cashFlows?.find((c) => c.type === 'Loan In');
    setLoanStr(defLoan ? String(Math.abs(defLoan.amount)) : '0');

    const defWith = initData.cashFlows?.find((c) => c.type === 'Withdrawal');
    setWithdrawalStr(defWith ? String(Math.abs(defWith.amount)) : '0');

    setUGasStr(String(Math.abs(initData.oneOffLosses?.ugasFee ?? 0)));
    setMoneyLostStr(String(Math.abs(initData.oneOffLosses?.tradeLoss ?? 0)));
    setErrorMsg(null);
  };

  // Live calculations for header summary preview
  const numStartingCap = Math.max(0, parseFloat(startingCapStr) || 0);
  const numLoan = Math.max(0, parseFloat(loanStr) || 0);
  const numWithdrawal = Math.max(0, parseFloat(withdrawalStr) || 0);
  const numUGas = Math.max(0, parseFloat(uGasStr) || 0);
  const numMoneyLost = Math.max(0, parseFloat(moneyLostStr) || 0);
  const totalOneOffDeductions = numMoneyLost + numUGas;
  const netDay1Capital = numStartingCap - totalOneOffDeductions;
  const netFinancingReserve = numLoan - numWithdrawal;

  // Save changes and persist to localStorage
  const handleSave = () => {
    const startingCapital = parseFloat(startingCapStr);
    const targetDailyRatePct = parseFloat(targetRateStr);
    const plannedDailyProfit = parseFloat(plannedProfitStr);
    const targetCapital = parseFloat(targetCapStr) || 50000;
    const loanAmount = parseFloat(loanStr) || 0;
    const withdrawalAmount = parseFloat(withdrawalStr) || 0;
    const ugasFee = parseFloat(uGasStr) || 0;
    const moneyLost = parseFloat(moneyLostStr) || 0;

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
    if (isNaN(loanAmount) || loanAmount < 0) {
      setErrorMsg('Please enter a valid Loan amount ($).');
      return;
    }
    if (isNaN(withdrawalAmount) || withdrawalAmount < 0) {
      setErrorMsg('Please enter a valid Withdrawal amount ($).');
      return;
    }
    if (isNaN(ugasFee) || ugasFee < 0) {
      setErrorMsg('Please enter a valid U-Gas fee ($).');
      return;
    }
    if (isNaN(moneyLost) || moneyLost < 0) {
      setErrorMsg('Please enter a valid Money Lost amount ($).');
      return;
    }

    setErrorMsg(null);

    const updatedAssumptions: AccountAssumptions = {
      startingCapital,
      targetDailyRatePct,
      plannedDailyProfit,
      targetCapital,
      loanAmount,
      withdrawalAmount,
      ugasFee,
      moneyLost,
    };

    try {
      // 1. Load full account data or create initial template
      const storageKeyV3 = `greenharvest_account_data_${selectedAccId}_v3`;
      const storageKeyV2 = `greenharvest_account_data_${selectedAccId}_v2`;
      let accountData: AccountData;
      const rawStored = localStorage.getItem(storageKeyV3) || localStorage.getItem(storageKeyV2);

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

      // 3. Update one-off losses (U-Gas and Money Lost)
      const combinedOneOffLoss = -(Math.abs(moneyLost) + Math.abs(ugasFee));
      accountData.oneOffLosses = {
        tradeLoss: -Math.abs(moneyLost),
        ugasFee: -Math.abs(ugasFee),
        combinedDailyReturn: combinedOneOffLoss,
      };

      // 4. Update Day 1 (Row 0) in dailyLog with new starting capital and one-off deductions
      if (accountData.dailyLog && accountData.dailyLog.length > 0) {
        const dRet = combinedOneOffLoss;
        const endCap = startingCapital + dRet;
        accountData.dailyLog[0] = {
          ...accountData.dailyLog[0],
          startingCapital,
          dailyReturn: dRet,
          dailyReturnPct: startingCapital > 0 ? (dRet / startingCapital) * 100 : 0,
          endingCapital: endCap,
          cumulativePnL: dRet,
          runningCapital: endCap,
          ratePct: targetDailyRatePct,
          tradeLoss: -Math.abs(moneyLost),
          ugasFee: -Math.abs(ugasFee),
          notes: `Day 1 Initial: Money Lost -$${moneyLost.toLocaleString()}, U-Gas -$${ugasFee.toLocaleString()}`,
        };
      }

      // 5. If applyToSchedule is true, update empty daily log rows with plannedDailyProfit
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

      // 6. Recalculate daily log formulas cascading from new starting capital and rate
      accountData.dailyLog = recalculateDailyLog(
        accountData.dailyLog,
        startingCapital,
        targetDailyRatePct
      );

      // 7. Synchronize cash flows ledger for this account
      const cfs: CashFlowItem[] = [...(accountData.cashFlows || [])];

      // Deposit (Starting Capital)
      const depIdx = cfs.findIndex((c) => c.type === 'Deposit');
      const depositItem: CashFlowItem = {
        id: depIdx >= 0 ? cfs[depIdx].id : `cf-${selectedAccId}-deposit`,
        date: '2026-01-01',
        type: 'Deposit',
        amount: startingCapital,
        asset: 'USDT',
        notes: `Initial capital allocation ($${startingCapital.toLocaleString()})`,
      };
      if (depIdx >= 0) cfs[depIdx] = depositItem;
      else cfs.unshift(depositItem);

      // Trade Loss / Money Lost
      const tlIdx = cfs.findIndex((c) => c.type === 'Trade Loss');
      if (moneyLost > 0) {
        const item: CashFlowItem = {
          id: tlIdx >= 0 ? cfs[tlIdx].id : `cf-${selectedAccId}-trade`,
          date: '2026-01-01',
          type: 'Trade Loss',
          amount: -Math.abs(moneyLost),
          asset: 'USDT',
          notes: `Realized trade drawdown / money lost ($${moneyLost.toLocaleString()})`,
        };
        if (tlIdx >= 0) cfs[tlIdx] = item;
        else cfs.push(item);
      } else if (tlIdx >= 0) {
        cfs.splice(tlIdx, 1);
      }

      // U-Gas
      const gasIdx = cfs.findIndex((c) => c.type === 'Gas');
      if (ugasFee > 0) {
        const item: CashFlowItem = {
          id: gasIdx >= 0 ? cfs[gasIdx].id : `cf-${selectedAccId}-gas`,
          date: '2026-01-01',
          type: 'Gas',
          amount: -Math.abs(ugasFee),
          asset: 'USDT',
          notes: `U-Gas network transaction energy fee ($${ugasFee.toLocaleString()})`,
        };
        if (gasIdx >= 0) cfs[gasIdx] = item;
        else cfs.push(item);
      } else if (gasIdx >= 0) {
        cfs.splice(gasIdx, 1);
      }

      // The Loan (Loan In)
      const loanIdx = cfs.findIndex((c) => c.type === 'Loan In');
      if (loanAmount > 0) {
        const item: CashFlowItem = {
          id: loanIdx >= 0 ? cfs[loanIdx].id : `cf-${selectedAccId}-loan`,
          date: '2026-01-03',
          type: 'Loan In',
          amount: Math.abs(loanAmount),
          asset: 'USDC',
          notes: `Working capital credit line / Loan In ($${loanAmount.toLocaleString()})`,
        };
        if (loanIdx >= 0) cfs[loanIdx] = item;
        else cfs.push(item);
      } else if (loanIdx >= 0) {
        cfs.splice(loanIdx, 1);
      }

      // The Withdrawal
      const withIdx = cfs.findIndex((c) => c.type === 'Withdrawal');
      if (withdrawalAmount > 0) {
        const item: CashFlowItem = {
          id: withIdx >= 0 ? cfs[withIdx].id : `cf-${selectedAccId}-with`,
          date: '2026-01-10',
          type: 'Withdrawal',
          amount: -Math.abs(withdrawalAmount),
          asset: 'USDT',
          notes: `Capital profit withdrawal / sweep ($${withdrawalAmount.toLocaleString()})`,
        };
        if (withIdx >= 0) cfs[withIdx] = item;
        else cfs.push(item);
      } else if (withIdx >= 0) {
        cfs.splice(withIdx, 1);
      }

      accountData.cashFlows = cfs;

      // 8. Persist updated account data to localStorage
      localStorage.setItem(storageKeyV3, JSON.stringify(accountData));
      localStorage.setItem(storageKeyV2, JSON.stringify(accountData));
      localStorage.setItem(
        `greenharvest_assumptions_${selectedAccId}`,
        JSON.stringify(updatedAssumptions)
      );
      localStorage.setItem(
        'crypto_bot_daily_profit_target_v1',
        String(plannedDailyProfit)
      );

      // 9. Dispatch custom event so all active views update immediately
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
          accountData,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="account-settings-modal-container"
        className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-gradient-to-b from-slate-900 via-slate-900/98 to-slate-950 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 text-slate-100 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="account-settings-modal-title"
        aria-modal="true"
      >
        {/* Top Accent Glow Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-emerald-400 via-blue-500 to-rose-400" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-3 border-b border-slate-800/80 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-emerald-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-xs shrink-0">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3
                    id="account-settings-modal-title"
                    className="text-base sm:text-lg font-bold text-white tracking-tight"
                  >
                    Account Operating Assumptions & Capital Drivers
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-400/20 text-amber-300 border border-amber-400/40 uppercase">
                    Yellow Cells & Cash Flows
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure yield drivers, loan lines, profit withdrawals, U-gas drag, and money lost for{' '}
                  <strong className="text-white">
                    {externalAccountName || currentAccMeta?.name || selectedAccId}
                  </strong>
                  .
                </p>
              </div>
            </div>

            <button
              id="account-settings-close-btn"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Account Selector Pill Strip */}
          <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
            <span className="text-slate-400 font-mono text-[11px] whitespace-nowrap">
              Active Account ({accountsList.length}):
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
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar">
          {/* Error Notification */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Account Name (Rename) Field */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-700/80 hover:border-amber-400/60 shadow-sm space-y-1.5 transition-colors">
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
              placeholder="e.g. Farmland, Firmly, Alpha Grid Bot"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm sm:text-base font-bold text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all shadow-inner"
              required
            />
          </div>

          {/* SECTION 1: CORE YIELD & CAPITAL ASSUMPTIONS (Yellow Cells) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                  1. Core Yield Assumptions (Yellow Cells)
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-400/10 text-amber-300 border border-amber-400/20">
                  Formula Engine
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* 1A. Starting Capital ($) */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border-2 border-amber-400/70 shadow-sm space-y-2 hover:border-amber-400 transition-colors">
                <div className="flex items-center justify-between text-xs font-bold">
                  <label htmlFor="settings-starting-capital" className="text-amber-300 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                    <span>Starting Capital</span>
                  </label>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                    Row 0
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-base font-bold text-amber-400 font-mono">$</span>
                    <input
                      id="settings-starting-capital"
                      type="number"
                      step="100"
                      value={startingCapStr}
                      onChange={(e) => setStartingCapStr(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 bg-amber-950/30 border-2 border-amber-400/80 rounded-lg text-lg font-bold font-mono text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all shadow-inner"
                      placeholder="5000"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleStep('capital', 500)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Add $500"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStep('capital', -500)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Subtract $500"
                    >
                      -
                    </button>
                  </div>
                </div>

                {/* Presets */}
                <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-mono pt-1">
                  {[1000, 5000, 10000, 25000, 50000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setStartingCapStr(String(val))}
                      className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer shrink-0 ${
                        parseFloat(startingCapStr) === val
                          ? 'bg-amber-400 text-slate-950 font-bold border-amber-400'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-amber-300'
                      }`}
                    >
                      ${val >= 1000 ? `${val / 1000}k` : val}
                    </button>
                  ))}
                </div>
              </div>

              {/* 1B. Target Daily Rate (%) */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border-2 border-amber-400/70 shadow-sm space-y-2 hover:border-amber-400 transition-colors">
                <div className="flex items-center justify-between text-xs font-bold">
                  <label htmlFor="settings-target-daily-rate" className="text-amber-300 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-amber-400" />
                    <span>Target Daily Rate</span>
                  </label>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                    Daily Rate
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
                      className="w-full pl-3 pr-7 py-1.5 bg-amber-950/30 border-2 border-amber-400/80 rounded-lg text-lg font-bold font-mono text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all shadow-inner"
                      placeholder="15"
                    />
                    <span className="absolute right-3 top-2 text-base font-bold text-amber-400 font-mono">%</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleStep('rate', 1)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Add 1%"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStep('rate', -1)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Subtract 1%"
                    >
                      -
                    </button>
                  </div>
                </div>

                {/* Presets */}
                <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-mono pt-1">
                  {[5, 10, 15, 20, 25].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setTargetRateStr(String(val))}
                      className={`px-2 py-0.5 rounded border transition-colors cursor-pointer shrink-0 ${
                        parseFloat(targetRateStr) === val
                          ? 'bg-amber-400 text-slate-950 font-bold border-amber-400'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-amber-300'
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>

              {/* 1C. Planned Daily Profit ($) */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border-2 border-amber-400/70 shadow-sm space-y-2 hover:border-amber-400 transition-colors">
                <div className="flex items-center justify-between text-xs font-bold">
                  <label htmlFor="settings-planned-daily-profit" className="text-amber-300 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                    <span>Planned Daily Profit</span>
                  </label>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                    Planned Return
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-base font-bold text-amber-400 font-mono">$</span>
                    <input
                      id="settings-planned-daily-profit"
                      type="number"
                      step="50"
                      value={plannedProfitStr}
                      onChange={(e) => setPlannedProfitStr(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 bg-amber-950/30 border-2 border-amber-400/80 rounded-lg text-lg font-bold font-mono text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all shadow-inner"
                      placeholder="1280"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleStep('profit', 100)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Add $100"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStep('profit', -100)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Subtract $100"
                    >
                      -
                    </button>
                  </div>
                </div>

                {/* Presets */}
                <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-mono pt-1">
                  {[500, 1000, 1280, 2000, 2500].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPlannedProfitStr(String(val))}
                      className={`px-2 py-0.5 rounded border transition-colors cursor-pointer shrink-0 ${
                        parseFloat(plannedProfitStr) === val
                          ? 'bg-amber-400 text-slate-950 font-bold border-amber-400'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-amber-300'
                      }`}
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              </div>

              {/* 1D. Target Capital Goal ($) */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 shadow-sm space-y-2 hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between text-xs font-bold">
                  <label htmlFor="settings-target-capital" className="text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Target Capital Goal</span>
                  </label>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    2-Year Goal
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-base font-bold text-slate-400 font-mono">$</span>
                    <input
                      id="settings-target-capital"
                      type="number"
                      step="1000"
                      value={targetCapStr}
                      onChange={(e) => setTargetCapStr(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-lg font-bold font-mono text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all shadow-inner"
                      placeholder="50000"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleStep('target', 5000)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Add $5,000"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStep('target', -5000)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Subtract $5,000"
                    >
                      -
                    </button>
                  </div>
                </div>

                {/* Presets */}
                <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-mono pt-1">
                  {[25000, 50000, 75000, 100000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setTargetCapStr(String(val))}
                      className={`px-2 py-0.5 rounded border transition-colors cursor-pointer shrink-0 ${
                        parseFloat(targetCapStr) === val
                          ? 'bg-emerald-500 text-white font-bold border-emerald-400'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-emerald-300'
                      }`}
                    >
                      ${val / 1000}k
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: THE LOAN, WITHDRAWAL, U-GAS, AND MONEY LOST */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider font-mono">
                  2. Capital Flows & Drawdowns (Loan, Withdrawal, U-Gas, Money Lost)
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  Cash Flows & Row 0
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* 2A. The Loan */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border-2 border-blue-500/60 shadow-sm space-y-2 hover:border-blue-400 transition-colors">
                <div className="flex items-center justify-between text-xs font-bold">
                  <label htmlFor="settings-loan-amount" className="text-blue-300 flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-blue-400" />
                    <span>The Loan</span>
                    <span className="text-[10px] text-blue-400/70 font-mono">(Working Capital)</span>
                  </label>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                    Loan In
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-base font-bold text-blue-400 font-mono">$</span>
                    <input
                      id="settings-loan-amount"
                      type="number"
                      step="500"
                      value={loanStr}
                      onChange={(e) => setLoanStr(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 bg-blue-950/30 border-2 border-blue-400/80 rounded-lg text-lg font-bold font-mono text-blue-200 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-all shadow-inner"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleStep('loan', 500)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Add $500"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStep('loan', -500)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Subtract $500"
                    >
                      -
                    </button>
                  </div>
                </div>

                {/* Presets */}
                <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-mono pt-1">
                  {[0, 1000, 2500, 5000, 10000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setLoanStr(String(val))}
                      className={`px-2 py-0.5 rounded border transition-colors cursor-pointer shrink-0 ${
                        parseFloat(loanStr) === val
                          ? 'bg-blue-500 text-white font-bold border-blue-400'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-blue-300'
                      }`}
                    >
                      ${val >= 1000 ? `${val / 1000}k` : val}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-blue-200/70">
                  Working capital facility or institutional credit line added to cash reserves.
                </p>
              </div>

              {/* 2B. Withdrawal */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border-2 border-purple-500/60 shadow-sm space-y-2 hover:border-purple-400 transition-colors">
                <div className="flex items-center justify-between text-xs font-bold">
                  <label htmlFor="settings-withdrawal-amount" className="text-purple-300 flex items-center gap-1.5">
                    <ArrowUpRight className="w-3.5 h-3.5 text-purple-400" />
                    <span>Withdrawal</span>
                    <span className="text-[10px] text-purple-400/70 font-mono">(Profit Sweep)</span>
                  </label>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                    Withdrawal
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-base font-bold text-purple-400 font-mono">$</span>
                    <input
                      id="settings-withdrawal-amount"
                      type="number"
                      step="250"
                      value={withdrawalStr}
                      onChange={(e) => setWithdrawalStr(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 bg-purple-950/30 border-2 border-purple-400/80 rounded-lg text-lg font-bold font-mono text-purple-200 focus:outline-none focus:ring-1 focus:ring-purple-400 transition-all shadow-inner"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleStep('withdrawal', 250)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Add $250"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStep('withdrawal', -250)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Subtract $250"
                    >
                      -
                    </button>
                  </div>
                </div>

                {/* Presets */}
                <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-mono pt-1">
                  {[0, 500, 1000, 2000, 5000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setWithdrawalStr(String(val))}
                      className={`px-2 py-0.5 rounded border transition-colors cursor-pointer shrink-0 ${
                        parseFloat(withdrawalStr) === val
                          ? 'bg-purple-500 text-white font-bold border-purple-400'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-purple-300'
                      }`}
                    >
                      ${val >= 1000 ? `${val / 1000}k` : val}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-purple-200/70">
                  Periodic profit sweep or principal capital taken off the table to cold storage.
                </p>
              </div>

              {/* 2C. U-gas */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border-2 border-amber-500/60 shadow-sm space-y-2 hover:border-amber-400 transition-colors">
                <div className="flex items-center justify-between text-xs font-bold">
                  <label htmlFor="settings-ugas-amount" className="text-amber-300 flex items-center gap-1.5">
                    <Fuel className="w-3.5 h-3.5 text-amber-400" />
                    <span>U-Gas</span>
                    <span className="text-[10px] text-amber-400/70 font-mono">(Energy / Gas Drag)</span>
                  </label>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    UGas Fee
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-base font-bold text-amber-400 font-mono">$</span>
                    <input
                      id="settings-ugas-amount"
                      type="number"
                      step="100"
                      value={uGasStr}
                      onChange={(e) => setUGasStr(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 bg-amber-950/30 border-2 border-amber-400/80 rounded-lg text-lg font-bold font-mono text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all shadow-inner"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleStep('ugas', 100)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Add $100"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStep('ugas', -100)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Subtract $100"
                    >
                      -
                    </button>
                  </div>
                </div>

                {/* Presets */}
                <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-mono pt-1">
                  {[0, 250, 500, 1000, 1175].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setUGasStr(String(val))}
                      className={`px-2 py-0.5 rounded border transition-colors cursor-pointer shrink-0 ${
                        parseFloat(uGasStr) === val
                          ? 'bg-amber-400 text-slate-950 font-bold border-amber-400'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-amber-300'
                      }`}
                    >
                      ${val}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-amber-200/70">
                  Energy & blockchain / API gas execution fees deducted from Day 1 trading capital.
                </p>
              </div>

              {/* 2D. Lastly, Money Lost */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border-2 border-rose-500/70 shadow-sm space-y-2 hover:border-rose-400 transition-colors">
                <div className="flex items-center justify-between text-xs font-bold">
                  <label htmlFor="settings-money-lost-amount" className="text-rose-300 flex items-center gap-1.5">
                    <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                    <span>Money Lost</span>
                    <span className="text-[10px] text-rose-400/70 font-mono">(Trade Loss)</span>
                  </label>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                    Trade Drawdown
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-base font-bold text-rose-400 font-mono">$</span>
                    <input
                      id="settings-money-lost-amount"
                      type="number"
                      step="250"
                      value={moneyLostStr}
                      onChange={(e) => setMoneyLostStr(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 bg-rose-950/30 border-2 border-rose-400/80 rounded-lg text-lg font-bold font-mono text-rose-200 focus:outline-none focus:ring-1 focus:ring-rose-400 transition-all shadow-inner"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleStep('loss', 250)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Add $250"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStep('loss', -250)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Subtract $250"
                    >
                      -
                    </button>
                  </div>
                </div>

                {/* Presets */}
                <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-mono pt-1">
                  {[0, 1000, 1850, 2545, 5000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setMoneyLostStr(String(val))}
                      className={`px-2 py-0.5 rounded border transition-colors cursor-pointer shrink-0 ${
                        parseFloat(moneyLostStr) === val
                          ? 'bg-rose-500 text-white font-bold border-rose-400'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-rose-300'
                      }`}
                    >
                      ${val}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-rose-200/70">
                  Initial realized trading deficit, slippage, and stop-loss drawdown recorded on Day 1.
                </p>
              </div>
            </div>
          </div>

          {/* LIVE IMPACT SUMMARY STRIP */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2 shadow-inner">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono">
              <span className="uppercase tracking-wider font-bold text-slate-300 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Live Day 1 Balance & Net Flow Preview</span>
              </span>
              <span className="text-emerald-400 font-bold">Automatic Recalculation</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400">Starting Cap</div>
                <div className="text-sm font-bold text-amber-300">${numStartingCap.toLocaleString()}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-rose-400">Day 1 Loss + U-Gas</div>
                <div className="text-sm font-bold text-rose-400">-${totalOneOffDeductions.toLocaleString()}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-emerald-400">Net Day 1 Cap</div>
                <div className="text-sm font-bold text-white">${netDay1Capital.toLocaleString()}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-blue-400">Loan - Withdr.</div>
                <div className={`text-sm font-bold ${netFinancingReserve >= 0 ? 'text-blue-300' : 'text-purple-300'}`}>
                  {netFinancingReserve >= 0 ? '+' : ''}${netFinancingReserve.toLocaleString()}
                </div>
              </div>
            </div>
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
                Automatically populate the next 14 days and all unrecorded days with this planned profit ($
                {plannedProfitStr}).
              </p>
            </div>
          </label>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 sm:p-5 pt-3 border-t border-slate-800/80 bg-slate-950/90 flex items-center justify-between gap-3 shrink-0">
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
                  <span>Save All Settings</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
