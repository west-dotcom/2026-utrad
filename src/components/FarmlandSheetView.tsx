import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Fuel,
  ArrowDownCircle,
  FileSpreadsheet,
  Download,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Info,
  ChevronDown,
  HelpCircle,
  ShieldCheck,
  Building2,
  Sprout,
  Cpu,
  Layers,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Sliders,
  Wallet,
  Landmark,
} from 'lucide-react';
import {
  AccountData,
  DailyLogRow,
  CashFlowItem,
  CashFlowType,
  INITIAL_ACCOUNTS,
  getInitialAccountData,
  loadAccountData,
  recalculateDailyLog,
  getStoredAccountsList,
  renameAccountInStorage,
  AccountMeta,
} from '../data/accountsData';
import { AccountSettingsModal } from './AccountSettingsModal';
import { AddAccountModal } from './AddAccountModal';
import { RenameAccountModal } from './RenameAccountModal';

interface FarmlandSheetViewProps {
  onSyncToGoogleSheets?: () => void;
  selectedAccountId?: string;
  onSelectAccount?: (id: string) => void;
}

export function FarmlandSheetView({
  onSyncToGoogleSheets,
  selectedAccountId: externalAccountId,
  onSelectAccount: externalSelectAccount,
}: FarmlandSheetViewProps) {
  // Accounts list (farmland, firmly, gadget + custom user-added accounts)
  const [accounts, setAccounts] = useState<AccountMeta[]>(() => getStoredAccountsList());

  // Listen to accounts updates from any modal or header action
  useEffect(() => {
    const handleUpdate = () => {
      setAccounts(getStoredAccountsList());
    };
    window.addEventListener('greenharvest_accounts_updated', handleUpdate);
    return () => window.removeEventListener('greenharvest_accounts_updated', handleUpdate);
  }, []);

  // Active account ID
  const [activeAccountId, setActiveAccountId] = useState<string>(() => {
    return externalAccountId || localStorage.getItem('greenharvest_active_account_id_v3') || 'farmland';
  });

  // Keep in sync with external account prop whenever user switches account from header or dashboard
  useEffect(() => {
    if (externalAccountId && externalAccountId !== activeAccountId) {
      setActiveAccountId(externalAccountId);
      try {
        const fresh = loadAccountData(externalAccountId);
        setAccountData(fresh);
      } catch (e) {
        console.warn('Failed loading account in FarmlandSheetView', e);
      }
      setDailyLogPage(1);
      setSchedulePage(1);
    }
  }, [externalAccountId, activeAccountId]);

  // Account dropdown and modal states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [newAccountModalOpen, setNewAccountModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState('Firm Arbitrage');

  // Detailed inputs when adding a new account (gas fees, trade loss / money in question, starting capital, targets)
  const [newStartingCapital, setNewStartingCapital] = useState('5000');
  const [newTradeLoss, setNewTradeLoss] = useState('2000');
  const [newGasFee, setNewGasFee] = useState('500');
  const [newTargetDailyRate, setNewTargetDailyRate] = useState('15.0');
  const [newPlannedDailyProfit, setNewPlannedDailyProfit] = useState('1280');

  // Rename account modal state
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameTargetId, setRenameTargetId] = useState('');
  const [renameTargetName, setRenameTargetName] = useState('');

  // Sub-tabs matching the user's specific requested sections
  // 1. Dashboard, 2. Daily Log, 3. Cash Flows, 4. Assumptions, 5. 2-Year Schedule (26-Page)
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'dailylog' | 'cashflows' | 'assumptions' | 'schedule2yr'>('dashboard');

  // Load active account data from localStorage or default
  const [accountData, setAccountData] = useState<AccountData>(() => {
    const initId = externalAccountId || localStorage.getItem('greenharvest_active_account_id_v3') || 'farmland';
    try {
      const saved = localStorage.getItem(`greenharvest_account_data_${initId}_v3`);
      if (saved) return JSON.parse(saved);

      // Check if v2 had 2026 data
      const oldV2 = localStorage.getItem(`greenharvest_account_data_${initId}_v2`);
      if (oldV2) {
        const parsed = JSON.parse(oldV2);
        if (parsed?.dailyLog?.[0]?.day && parsed.dailyLog[0].day.includes('2026')) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed loading account data', e);
    }
    return getInitialAccountData(initId);
  });

  // When activeAccountId changes, reload data for that account
  const handleSwitchAccount = (accId: string) => {
    setActiveAccountId(accId);
    if (externalSelectAccount) {
      externalSelectAccount(accId);
    }
    try {
      localStorage.setItem('greenharvest_active_account_id_v3', accId);
      localStorage.setItem('greenharvest_active_account_id_v2', accId);
      const data = loadAccountData(accId);
      setAccountData(data);
    } catch (e) {
      console.warn('Failed to switch account in storage', e);
      setAccountData(getInitialAccountData(accId));
    }
    setIsDropdownOpen(false);
    setDailyLogPage(1);
    setSchedulePage(1);
  };

  // Save accountData to localStorage whenever it changes
  useEffect(() => {
    if (!accountData || !accountData.id) return;
    try {
      localStorage.setItem(`greenharvest_account_data_${accountData.id}_v3`, JSON.stringify(accountData));
      localStorage.setItem(`greenharvest_account_data_${accountData.id}_v2`, JSON.stringify(accountData));
    } catch (err) {
      console.error('Failed saving accountData', err);
    }
  }, [accountData]);

  // Save accounts list whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('greenharvest_accounts_list_v2', JSON.stringify(accounts));
    } catch (err) {
      console.error('Failed saving accounts list', err);
    }
  }, [accounts]);

  // Listen for account settings modal updates so view updates instantaneously
  useEffect(() => {
    const handleSettingsUpdated = (e: any) => {
      const detail = e.detail;
      if (detail && detail.accountId === accountData.id) {
        if (detail.accountData) {
          setAccountData(detail.accountData);
        } else if (detail.assumptions) {
          setAccountData((prev) => {
            const recalculated = recalculateDailyLog(
              prev.dailyLog,
              detail.assumptions.startingCapital,
              detail.assumptions.targetDailyRatePct
            );
            return {
              ...prev,
              assumptions: detail.assumptions,
              dailyLog: recalculated,
            };
          });
        }
      }
    };

    window.addEventListener('greenharvest_account_settings_updated', handleSettingsUpdated);
    return () => {
      window.removeEventListener('greenharvest_account_settings_updated', handleSettingsUpdated);
    };
  }, [accountData.id]);

  // Pagination for Daily Log (25 rows per page)
  const [dailyLogPage, setDailyLogPage] = useState<number>(1);
  const DAILY_LOG_ROWS_PER_PAGE = 25;
  const totalDailyLogPages = Math.max(1, Math.ceil(accountData.dailyLog.length / DAILY_LOG_ROWS_PER_PAGE));

  const paginatedDailyLog = useMemo(() => {
    const start = (dailyLogPage - 1) * DAILY_LOG_ROWS_PER_PAGE;
    return accountData.dailyLog.slice(start, start + DAILY_LOG_ROWS_PER_PAGE);
  }, [accountData.dailyLog, dailyLogPage]);

  // Pagination for 26-page 2-year template (28 rows per page)
  const [schedulePage, setSchedulePage] = useState<number>(1);
  const SCHEDULE_ROWS_PER_PAGE = 28;
  const totalSchedulePages = Math.max(1, Math.ceil(accountData.dailyLog.length / SCHEDULE_ROWS_PER_PAGE));

  const paginatedSchedule = useMemo(() => {
    const start = (schedulePage - 1) * SCHEDULE_ROWS_PER_PAGE;
    return accountData.dailyLog.slice(start, start + SCHEDULE_ROWS_PER_PAGE);
  }, [accountData.dailyLog, schedulePage]);

  // Inline editing state for Daily Log
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editReturnVal, setEditReturnVal] = useState<string>('');
  const [editDayVal, setEditDayVal] = useState<string>('');
  const [editNotesVal, setEditNotesVal] = useState<string>('');

  // Quick Add Row for Daily Log
  const [newLogDay, setNewLogDay] = useState('');
  const [newLogReturn, setNewLogReturn] = useState('1280');
  const [newLogNotes, setNewLogNotes] = useState('');

  // Cash Flows Form State
  const [cfDate, setCfDate] = useState(new Date().toISOString().split('T')[0]);
  const [cfType, setCfType] = useState<CashFlowType>('Deposit');
  const [cfAmount, setCfAmount] = useState('1000');
  const [cfAsset, setCfAsset] = useState('USDT');
  const [cfNotes, setCfNotes] = useState('');

  // Local string states for fluid number editing without snapping to 0 or locking while typing
  const [startingCapStr, setStartingCapStr] = useState<string>(() => String(accountData.assumptions.startingCapital));
  const [targetRateStr, setTargetRateStr] = useState<string>(() => String(accountData.assumptions.targetDailyRatePct));
  const [dailyProfitStr, setDailyProfitStr] = useState<string>(() => String(accountData.assumptions.plannedDailyProfit));
  const [targetCapStr, setTargetCapStr] = useState<string>(() => String(accountData.assumptions.targetCapital));
  const [tradeLossStr, setTradeLossStr] = useState<string>(() => String(accountData.oneOffLosses.tradeLoss));
  const [ugasFeeStr, setUgasFeeStr] = useState<string>(() => String(accountData.oneOffLosses.ugasFee));
  const [assumptionsSavedAlert, setAssumptionsSavedAlert] = useState<boolean>(false);

  // Keep local string states in sync when account switches or resets
  useEffect(() => {
    setStartingCapStr(String(accountData.assumptions.startingCapital));
    setTargetRateStr(String(accountData.assumptions.targetDailyRatePct));
    setDailyProfitStr(String(accountData.assumptions.plannedDailyProfit));
    setTargetCapStr(String(accountData.assumptions.targetCapital));
    setTradeLossStr(String(accountData.oneOffLosses.tradeLoss));
    setUgasFeeStr(String(accountData.oneOffLosses.ugasFee));
  }, [
    accountData.id,
    accountData.assumptions.startingCapital,
    accountData.assumptions.targetDailyRatePct,
    accountData.assumptions.plannedDailyProfit,
    accountData.assumptions.targetCapital,
    accountData.oneOffLosses.tradeLoss,
    accountData.oneOffLosses.ugasFee,
  ]);

  // Core Assumptions update function with cascading formula recalculation
  const handleUpdateAssumptions = (key: keyof AccountData['assumptions'], val: number) => {
    setAccountData((prev) => {
      const updatedAssumptions = { ...prev.assumptions, [key]: val };
      // If startingCapital or targetDailyRatePct changed, recalculate daily log
      const recalculatedRows = recalculateDailyLog(
        prev.dailyLog,
        updatedAssumptions.startingCapital,
        updatedAssumptions.targetDailyRatePct
      );
      return {
        ...prev,
        assumptions: updatedAssumptions,
        dailyLog: recalculatedRows,
      };
    });
  };

  // Fluid input change handler that allows typing decimals, backspacing, and editing freely
  const handleTypeAssumption = (
    key: keyof AccountData['assumptions'],
    rawVal: string,
    setLocal: (v: string) => void
  ) => {
    setLocal(rawVal);
    const parsed = parseFloat(rawVal);
    if (!isNaN(parsed) && parsed >= 0) {
      handleUpdateAssumptions(key, parsed);
      setAssumptionsSavedAlert(true);
      setTimeout(() => setAssumptionsSavedAlert(false), 2500);
    }
  };

  // Preset chip 1-click update
  const handleApplyPreset = (key: keyof AccountData['assumptions'], val: number) => {
    if (key === 'startingCapital') setStartingCapStr(String(val));
    if (key === 'targetDailyRatePct') setTargetRateStr(String(val));
    if (key === 'plannedDailyProfit') setDailyProfitStr(String(val));
    if (key === 'targetCapital') setTargetCapStr(String(val));
    handleUpdateAssumptions(key, val);
    setAssumptionsSavedAlert(true);
    setTimeout(() => setAssumptionsSavedAlert(false), 2500);
  };

  // Stepper buttons (+ / -)
  const handleStepAssumption = (key: keyof AccountData['assumptions'], step: number) => {
    const current = accountData.assumptions[key] || 0;
    const nextVal = Math.max(0, parseFloat((current + step).toFixed(2)));
    handleApplyPreset(key, nextVal);
  };

  // One-off losses edits with smooth typing
  const handleUpdateOneOffLosses = (tradeLoss: number, ugasFee: number) => {
    setAccountData((prev) => {
      const combined = tradeLoss + ugasFee;
      // Also update row 0
      const updatedRows = [...prev.dailyLog];
      if (updatedRows.length > 0) {
        updatedRows[0] = {
          ...updatedRows[0],
          tradeLoss,
          ugasFee,
          dailyReturn: combined,
          endingCapital: updatedRows[0].startingCapital + combined,
          runningCapital: updatedRows[0].startingCapital + combined,
          cumulativePnL: combined,
          dailyReturnPct: (combined / updatedRows[0].startingCapital) * 100,
        };
      }
      const recalculated = recalculateDailyLog(
        updatedRows,
        prev.assumptions.startingCapital,
        prev.assumptions.targetDailyRatePct
      );

      return {
        ...prev,
        oneOffLosses: {
          tradeLoss,
          ugasFee,
          combinedDailyReturn: combined,
        },
        dailyLog: recalculated,
      };
    });
  };

  const handleTypeTradeLoss = (valStr: string) => {
    setTradeLossStr(valStr);
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed)) {
      handleUpdateOneOffLosses(parsed, accountData.oneOffLosses.ugasFee);
    }
  };

  const handleTypeUgasFee = (valStr: string) => {
    setUgasFeeStr(valStr);
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed)) {
      handleUpdateOneOffLosses(accountData.oneOffLosses.tradeLoss, parsed);
    }
  };

  // Batch Apply Planned Daily Profit to next 14 days or empty rows
  const handleApplyPlannedProfitToEmptyDays = () => {
    const profit = parseFloat(dailyProfitStr) || accountData.assumptions.plannedDailyProfit;
    setAccountData((prev) => {
      const updatedRows = prev.dailyLog.map((row, idx) => {
        if (idx === 0) return row; // Row 0 is the initial loss row
        // Pre-fill next 14 days or any row without entries
        if (idx <= 14 || row.dailyReturn === 0) {
          return {
            ...row,
            dailyReturn: profit,
            notes: row.notes || `Applied planned profit ($${profit.toLocaleString()})`,
          };
        }
        return row;
      });

      const recalculated = recalculateDailyLog(
        updatedRows,
        prev.assumptions.startingCapital,
        prev.assumptions.targetDailyRatePct
      );

      return {
        ...prev,
        assumptions: {
          ...prev.assumptions,
          plannedDailyProfit: profit,
        },
        dailyLog: recalculated,
      };
    });
    setAssumptionsSavedAlert(true);
    setTimeout(() => setAssumptionsSavedAlert(false), 3000);
  };

  // Compute Cash Flows Totals that automatically feed the Dashboard
  const cashFlowTotals = useMemo(() => {
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let totalLoansIn = 0;
    let totalLoansOut = 0;
    let totalGas = 0;
    let totalFees = 0;
    let totalTradeLosses = 0;

    for (const cf of accountData.cashFlows) {
      const amt = Number(cf.amount) || 0;
      switch (cf.type) {
        case 'Deposit':
          totalDeposits += Math.abs(amt);
          break;
        case 'Withdrawal':
          totalWithdrawals += Math.abs(amt);
          break;
        case 'Loan In':
          totalLoansIn += Math.abs(amt);
          break;
        case 'Loan Out':
          totalLoansOut += Math.abs(amt);
          break;
        case 'Gas':
          totalGas += Math.abs(amt);
          break;
        case 'Fee':
          totalFees += Math.abs(amt);
          break;
        case 'Trade Loss':
          totalTradeLosses += Math.abs(amt);
          break;
      }
    }

    const netWithdrawals = totalWithdrawals - totalDeposits;
    const outstandingLoan = totalLoansIn - totalLoansOut;
    const totalGasFees = totalGas + totalFees;

    return {
      totalDeposits,
      totalWithdrawals,
      netWithdrawals,
      totalLoansIn,
      totalLoansOut,
      outstandingLoan,
      totalGas,
      totalFees,
      totalGasFees,
      totalTradeLosses,
    };
  }, [accountData.cashFlows]);

  // Compute Dashboard Live KPIs
  const dashboardKpis = useMemo(() => {
    const activeDays = accountData.dailyLog.filter((r) => r.dailyReturn !== 0);
    const daysTracked = activeDays.length;
    const winDays = activeDays.filter((r) => r.dailyReturn > 0).length;
    const positiveDaysPct = daysTracked > 0 ? (winDays / daysTracked) * 100 : 0;

    const totalRealizedPnL = accountData.dailyLog.reduce((acc, r) => acc + (r.dailyReturn || 0), 0);
    const avgDailyReturnPct =
      daysTracked > 0
        ? activeDays.reduce((acc, r) => acc + (r.dailyReturnPct || 0), 0) / daysTracked
        : 0;

    // Current capital from starting capital + net cash flows + cumulative PnL
    const latestDay = accountData.dailyLog[accountData.dailyLog.length - 1];
    const currentCapital =
      latestDay && daysTracked > 0
        ? accountData.assumptions.startingCapital +
          totalRealizedPnL +
          cashFlowTotals.totalDeposits -
          cashFlowTotals.totalWithdrawals +
          cashFlowTotals.outstandingLoan
        : accountData.assumptions.startingCapital;

    return {
      currentCapital,
      totalRealizedPnL,
      totalGasFees: cashFlowTotals.totalGasFees,
      netWithdrawals: cashFlowTotals.netWithdrawals,
      outstandingLoan: cashFlowTotals.outstandingLoan,
      avgDailyReturnPct,
      daysTracked,
      positiveDaysPct,
    };
  }, [accountData, cashFlowTotals]);

  // Edit Daily Return handler
  const handleSaveDailyReturnEdit = (id: string) => {
    const retVal = parseFloat(editReturnVal);
    if (isNaN(retVal)) return;

    setAccountData((prev) => {
      const updatedRows = prev.dailyLog.map((r) => {
        if (r.id === id) {
          return {
            ...r,
            day: editDayVal !== undefined ? editDayVal.trim() : (r.day || ''),
            dailyReturn: retVal,
            notes: editNotesVal,
          };
        }
        return r;
      });

      const recalculated = recalculateDailyLog(
        updatedRows,
        prev.assumptions.startingCapital,
        prev.assumptions.targetDailyRatePct
      );

      return {
        ...prev,
        dailyLog: recalculated,
      };
    });

    setEditingRowId(null);
  };

  // Quick Add Row to Daily Log
  const handleAddDailyLogRow = (e: React.FormEvent) => {
    e.preventDefault();
    const retVal = parseFloat(newLogReturn) || 0;
    const dayStr = newLogDay || new Date().toLocaleDateString();

    setAccountData((prev) => {
      const newRow: DailyLogRow = {
        id: `row-${Date.now()}`,
        day: dayStr,
        startingCapital: 0, // will be recalculated
        dailyReturn: retVal,
        dailyReturnPct: 0,
        endingCapital: 0,
        cumulativePnL: 0,
        runningCapital: 0,
        ratePct: prev.assumptions.targetDailyRatePct,
        notes: newLogNotes || `User logged return: $${retVal}`,
      };

      const updated = [newRow, ...prev.dailyLog];
      const recalculated = recalculateDailyLog(
        updated,
        prev.assumptions.startingCapital,
        prev.assumptions.targetDailyRatePct
      );

      return {
        ...prev,
        dailyLog: recalculated,
      };
    });

    setNewLogDay('');
    setNewLogReturn('1280');
    setNewLogNotes('');
  };

  // Add Cash Flow Handler
  const handleAddCashFlow = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(cfAmount);
    if (isNaN(amt) || amt <= 0) return;

    // Apply negative sign for outflows
    let signedAmt = amt;
    if (['Withdrawal', 'Loan Out', 'Gas', 'Fee', 'Trade Loss'].includes(cfType)) {
      signedAmt = -Math.abs(amt);
    } else {
      signedAmt = Math.abs(amt);
    }

    const newCf: CashFlowItem = {
      id: `cf-${Date.now()}`,
      date: cfDate,
      type: cfType,
      amount: signedAmt,
      asset: cfAsset,
      notes: cfNotes || `${cfType} transaction`,
    };

    setAccountData((prev) => ({
      ...prev,
      cashFlows: [newCf, ...prev.cashFlows],
    }));

    setCfAmount('1000');
    setCfNotes('');
  };

  // Delete Cash Flow
  const handleDeleteCashFlow = (id: string) => {
    setAccountData((prev) => ({
      ...prev,
      cashFlows: prev.cashFlows.filter((c) => c.id !== id),
    }));
  };

  // Reset Account Template
  const handleResetAccount = () => {
    if (window.confirm(`Reset "${accountData.name}" to its original default schedule and prefilled days?`)) {
      const fresh = getInitialAccountData(accountData.id);
      setAccountData(fresh);
      setDailyLogPage(1);
      setSchedulePage(1);
    }
  };

  // Rename Account Handler
  const handleRenameAccount = (accId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    // 1. Update in accounts array & localStorage
    setAccounts((prev) => {
      const updated = prev.map((a) => (a.id === accId ? { ...a, name: trimmed } : a));
      try {
        localStorage.setItem('greenharvest_accounts_list_v2', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed saving updated accounts list', e);
      }
      return updated;
    });

    // 2. If it's the currently active accountData, update its name too
    if (accountData.id === accId) {
      setAccountData((prev) => {
        const updated = { ...prev, name: trimmed };
        try {
          localStorage.setItem(`greenharvest_account_data_${accId}_v3`, JSON.stringify(updated));
          localStorage.setItem(`greenharvest_account_data_${accId}_v2`, JSON.stringify(updated));
        } catch (e) {
          console.warn(e);
        }
        return updated;
      });
    } else {
      // Update that account's stored data in localStorage
      try {
        const stored = localStorage.getItem(`greenharvest_account_data_${accId}_v3`);
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.name = trimmed;
          localStorage.setItem(`greenharvest_account_data_${accId}_v3`, JSON.stringify(parsed));
          localStorage.setItem(`greenharvest_account_data_${accId}_v2`, JSON.stringify(parsed));
        }
      } catch (e) {
        console.warn(e);
      }
    }

    // 3. Dispatch event for header & tabs
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('greenharvest_accounts_updated', {
          detail: { accountId: accId, name: trimmed },
        })
      );
    }

    setRenameModalOpen(false);
  };

  // Create New Account with customizable gas fees, money in question / trade loss, starting capital, and targets
  const handleCreateNewAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName.trim()) return;

    const startCap = Math.max(0, parseFloat(newStartingCapital) || 5000);
    const tradeLossVal = Math.abs(parseFloat(newTradeLoss) || 0);
    const gasFeeVal = Math.abs(parseFloat(newGasFee) || 0);
    const combinedInitialLoss = -(tradeLossVal + gasFeeVal);
    const targetRate = Math.max(0, parseFloat(newTargetDailyRate) || 15.0);
    const plannedProfit = Math.max(0, parseFloat(newPlannedDailyProfit) || 1280);

    const safeBaseId = newAccountName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const newId = `${safeBaseId}-${Date.now().toString().slice(-4)}`;

    const newAccObj = {
      id: newId,
      name: newAccountName.trim(),
      type: newAccountType,
      icon: newAccountType === 'Agricultural Yield' ? 'sprout' : newAccountType === 'Grid / Gadget Bot' ? 'cpu' : 'building',
    };

    // Build initial cash flows
    const initialCashFlows: CashFlowItem[] = [
      {
        id: `cf-${newId}-deposit`,
        date: new Date().toISOString().split('T')[0],
        type: 'Deposit',
        amount: startCap,
        asset: 'USDT',
        notes: 'Initial principal funding',
      },
    ];

    if (gasFeeVal > 0) {
      initialCashFlows.push({
        id: `cf-${newId}-gas`,
        date: new Date().toISOString().split('T')[0],
        type: 'Gas',
        amount: -gasFeeVal,
        asset: 'USDT',
        notes: 'Initial UGas / transaction fees',
      });
    }

    if (tradeLossVal > 0) {
      initialCashFlows.push({
        id: `cf-${newId}-tradeloss`,
        date: new Date().toISOString().split('T')[0],
        type: 'Trade Loss',
        amount: -tradeLossVal,
        asset: 'USDT',
        notes: 'Initial realized trading deficit / money in question',
      });
    }

    // Build initial daily log rows
    const templateRows: DailyLogRow[] = accountData.dailyLog.map((r, idx) => {
      if (idx === 0) {
        return {
          ...r,
          tradeLoss: -tradeLossVal,
          ugasFee: -gasFeeVal,
          dailyReturn: combinedInitialLoss,
          startingCapital: startCap,
          endingCapital: startCap + combinedInitialLoss,
          runningCapital: startCap + combinedInitialLoss,
          cumulativePnL: combinedInitialLoss,
          dailyReturnPct: startCap > 0 ? (combinedInitialLoss / startCap) * 100 : 0,
          ratePct: targetRate,
          notes:
            tradeLossVal > 0 || gasFeeVal > 0
              ? `Initial one-off deficit: Trade -$${tradeLossVal.toLocaleString()} & UGas -$${gasFeeVal.toLocaleString()}`
              : 'Day 1 baseline entry',
        };
      }
      return {
        ...r,
        dailyReturn: idx <= 14 ? plannedProfit : 0,
        ratePct: targetRate,
        notes: idx <= 14 ? `Planned target profit ($${plannedProfit.toLocaleString()})` : '',
      };
    });

    const recalculatedRows = recalculateDailyLog(templateRows, startCap, targetRate);

    const newProfile: AccountData = {
      id: newId,
      name: newAccountName.trim(),
      tagline: `${newAccountType} Account Operations`,
      type: newAccountType as any,
      themeColor: '#3b82f6',
      assumptions: {
        startingCapital: startCap,
        targetDailyRatePct: targetRate,
        plannedDailyProfit: plannedProfit,
        targetCapital: 50000,
      },
      oneOffLosses: {
        tradeLoss: -tradeLossVal,
        ugasFee: -gasFeeVal,
        combinedDailyReturn: combinedInitialLoss,
      },
      dailyLog: recalculatedRows,
      cashFlows: initialCashFlows,
    };

    const updatedAccounts = [...accounts, newAccObj];
    setAccounts(updatedAccounts);
    try {
      localStorage.setItem('greenharvest_accounts_list_v2', JSON.stringify(updatedAccounts));
      localStorage.setItem(`greenharvest_account_data_${newId}_v3`, JSON.stringify(newProfile));
      localStorage.setItem(`greenharvest_account_data_${newId}_v2`, JSON.stringify(newProfile));
    } catch (e) {
      console.warn(e);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('greenharvest_accounts_updated', {
          detail: { accountId: newId, name: newAccountName.trim() },
        })
      );
    }

    setNewAccountModalOpen(false);
    setNewAccountName('');
    setNewStartingCapital('5000');
    setNewTradeLoss('2000');
    setNewGasFee('500');
    handleSwitchAccount(newId);
  };

  // CSV Export
  const handleExportCsv = () => {
    const headers = ['DAYS', 'STARTING CAPITAL', 'DAILY RETURN', 'DAILY RETURN %', 'ENDING CAPITAL', 'CUMULATIVE PNL', 'RUNNING CAPITAL', 'RATE %', 'NOTES'];
    const csvRows = accountData.dailyLog.map((r) => [
      r.day,
      r.startingCapital.toFixed(2),
      r.dailyReturn.toFixed(2),
      `${r.dailyReturnPct.toFixed(2)}%`,
      r.endingCapital.toFixed(2),
      r.cumulativePnL.toFixed(2),
      r.runningCapital.toFixed(2),
      `${r.ratePct.toFixed(2)}%`,
      `"${r.notes || ''}"`,
    ]);
    const csvContent = [headers.join(','), ...csvRows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${accountData.name}_DailyLog_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // SVG Equity curve points
  const equityPoints = useMemo(() => {
    const sample = accountData.dailyLog.slice(0, 30);
    if (sample.length === 0) return '';
    const caps = sample.map((s) => s.endingCapital);
    const minCap = Math.min(...caps);
    const maxCap = Math.max(...caps, 1);
    const range = maxCap - minCap || 1;

    return sample
      .map((s, idx) => {
        const x = (idx / (sample.length - 1)) * 500;
        const y = 140 - ((s.endingCapital - minCap) / range) * 110 - 15;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [accountData.dailyLog]);

  // Current account icon helper
  const getAccountIcon = (type: string, id: string) => {
    if (id === 'farmland' || type.includes('Agri')) {
      return <Sprout className="w-4 h-4 text-emerald-400" />;
    }
    if (id === 'gadget' || type.includes('Grid') || type.includes('Gadget')) {
      return <Cpu className="w-4 h-4 text-purple-400" />;
    }
    return <Building2 className="w-4 h-4 text-blue-400" />;
  };

  return (
    <div id="multi-account-sheet-view" className="space-y-6">
      {/* ACCOUNT HEADER BAR WITH DROPDOWN SELECTOR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Account Selector Dropdown & Branding */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
          {/* Dropdown Container */}
          <div className="relative">
            <button
              id="account-dropdown-btn"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 hover:border-slate-600 text-white font-bold text-sm shadow-sm transition-all cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
                {getAccountIcon(accountData.type, accountData.id)}
              </div>
              <div className="text-left">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono font-semibold">
                  Account Switcher
                </div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>{accountData.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-normal bg-slate-800 text-slate-300">
                    {accountData.type}
                  </span>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 ml-1 transition-transform ${isDropdownOpen ? 'rotate-180 text-emerald-400' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute left-0 mt-2 w-72 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800/80">
                <div className="p-2.5 bg-slate-900/90 text-xs font-semibold text-slate-400 flex items-center justify-between">
                  <span>Select Active Account</span>
                  <span className="text-[10px] font-mono text-emerald-400">{accounts.length} Accounts</span>
                </div>

                <div className="p-1 space-y-0.5">
                  {accounts.map((acc) => {
                    const isSelected = acc.id === accountData.id;
                    return (
                      <div
                        key={acc.id}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-colors group ${
                          isSelected
                            ? 'bg-slate-800 text-white font-bold'
                            : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                        }`}
                      >
                        <button
                          id={`select-account-${acc.id}`}
                          onClick={() => {
                            handleSwitchAccount(acc.id);
                            setIsDropdownOpen(false);
                          }}
                          className="flex items-center gap-2.5 flex-1 cursor-pointer text-left overflow-hidden pr-2"
                        >
                          <div className={`w-6 h-6 shrink-0 rounded-md flex items-center justify-center ${isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                            {getAccountIcon(acc.type, acc.id)}
                          </div>
                          <div className="truncate">
                            <div className="font-semibold text-white truncate">{acc.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{acc.type}</div>
                          </div>
                        </button>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Rename Account Pencil Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsDropdownOpen(false);
                              setRenameTargetId(acc.id);
                              setRenameTargetName(acc.name);
                              setRenameModalOpen(true);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-amber-300 hover:bg-slate-700/60 transition-colors cursor-pointer"
                            title={`Rename ${acc.name}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-2 bg-slate-900/60 space-y-1.5">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setNewAccountModalOpen(true);
                    }}
                    className="w-full py-1.5 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add New Account (With Gas & Capital)</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsSettingsModalOpen(true);
                    }}
                    className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    <span>Account Assumptions (Yellow Cells)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                {accountData.name} Model
              </span>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                {accountData.tagline}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Live automated ledger, pre-filled one-off loss reconciliation, daily return tracking & cash flow integration.
            </p>
          </div>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          <button
            id="account-bar-settings-btn"
            onClick={() => setIsSettingsModalOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-400/15 hover:bg-amber-400 text-amber-300 hover:text-slate-950 border border-amber-400/40 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            title="Edit Starting Capital, Target Daily Rate & Planned Profit"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Account Settings</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Export CSV of this account"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={handleResetAccount}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Reset to original template"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Reset</span>
          </button>
          {onSyncToGoogleSheets && (
            <button
              onClick={onSyncToGoogleSheets}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Sync to Sheets</span>
            </button>
          )}
        </div>
      </div>

      {/* 5 CORE SECTIONS SUB-NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto no-scrollbar">
        <button
          id="tab-btn-dashboard"
          onClick={() => setActiveSubTab('dashboard')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeSubTab === 'dashboard'
              ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>1. Dashboard</span>
          <span className="text-[10px] font-mono opacity-70">Live KPIs</span>
        </button>

        <button
          id="tab-btn-dailylog"
          onClick={() => setActiveSubTab('dailylog')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeSubTab === 'dailylog'
              ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>2. Daily Log</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-yellow-400/20 text-yellow-300 font-mono font-bold">
            Yellow Return Cell
          </span>
        </button>

        <button
          id="tab-btn-cashflows"
          onClick={() => setActiveSubTab('cashflows')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeSubTab === 'cashflows'
              ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>3. Cash Flows</span>
          <span className="text-[10px] font-mono opacity-70">({accountData.cashFlows.length})</span>
        </button>

        <button
          id="tab-btn-assumptions"
          onClick={() => setActiveSubTab('assumptions')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeSubTab === 'assumptions'
              ? 'bg-slate-800 text-amber-300 shadow-sm border border-amber-400/50 ring-1 ring-amber-400/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Sliders className="w-4 h-4 text-amber-400" />
          <span>4. Assumptions</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-400/20 text-amber-300 font-mono font-bold border border-amber-400/40">
            🟡 Yellow Cells (Editable)
          </span>
        </button>

        <button
          id="tab-btn-schedule2yr"
          onClick={() => setActiveSubTab('schedule2yr')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeSubTab === 'schedule2yr'
              ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>5. 2-Year Schedule</span>
          <span className="text-[10px] font-mono opacity-70">26-Page PDF Model</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* SECTION 1: DASHBOARD (Live KPIs, One-Off Losses, Instructions) */}
      {/* ========================================================= */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          {/* LIVE KPIS GRID (Exact KPIs requested by user) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3.5">
            {/* KPI 1: Current Capital */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium">Current Capital</span>
                <Wallet className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                ${dashboardKpis.currentCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Start: ${accountData.assumptions.startingCapital.toLocaleString()} + PnL & Flows
              </p>
            </div>

            {/* KPI 2: Total Realized PnL */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium">Total Realized PnL</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className={`text-2xl font-bold font-mono ${dashboardKpis.totalRealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {dashboardKpis.totalRealizedPnL >= 0 ? '+' : ''}
                ${dashboardKpis.totalRealizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Cumulative across all tracked days
              </p>
            </div>

            {/* KPI 3: Total Gas / Fees */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium">Total Gas / Fees</span>
                <Fuel className="w-4 h-4 text-fuchsia-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-fuchsia-400">
                ${dashboardKpis.totalGasFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                UGas & gas movements recorded
              </p>
            </div>

            {/* KPI 4: Net Withdrawals */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium">Net Withdrawals</span>
                <ArrowDownCircle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-amber-400">
                ${dashboardKpis.netWithdrawals.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Withdrawals (${cashFlowTotals.totalWithdrawals.toLocaleString()}) - Deposits
              </p>
            </div>

            {/* KPI 5: Outstanding Loan */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium">Outstanding Loan</span>
                <Landmark className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-blue-400">
                ${dashboardKpis.outstandingLoan.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Loan In (${cashFlowTotals.totalLoansIn.toLocaleString()}) - Loan Out
              </p>
            </div>

            {/* KPI 6: Avg Daily Return % */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium">Avg Daily Return %</span>
                <Percent className="w-4 h-4 text-teal-400" />
              </div>
              <div className={`text-2xl font-bold font-mono ${dashboardKpis.avgDailyReturnPct >= 0 ? 'text-teal-400' : 'text-rose-400'}`}>
                {dashboardKpis.avgDailyReturnPct.toFixed(2)}%
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Target: {accountData.assumptions.targetDailyRatePct.toFixed(2)}% daily
              </p>
            </div>

            {/* KPI 7: Days Tracked */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium">Days Tracked</span>
                <Calendar className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                {dashboardKpis.daysTracked} <span className="text-xs text-slate-500 font-normal">/ {accountData.dailyLog.length}</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Active trading days with entries
              </p>
            </div>

            {/* KPI 8: Positive Days % */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium">Positive Days %</span>
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {dashboardKpis.positiveDaysPct.toFixed(1)}%
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Win rate of recorded trading days
              </p>
            </div>
          </div>

          {/* ========================================================= */}
          {/* EXECUTIVE OPERATING ASSUMPTIONS (YELLOW INPUT CELLS) */}
          {/* Direct, instantaneous editing right on the Dashboard tab */}
          {/* ========================================================= */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-950 border-2 border-amber-400/60 shadow-xl shadow-amber-950/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-500/20">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400/20 text-amber-300 border border-amber-400/50 font-mono tracking-wider flex items-center gap-1.5 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                    Yellow Cells • Editable Drivers
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
                    Dynamic Financial Drivers
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                  <span>Operating Assumptions for {accountData.name}</span>
                </h3>
                <p className="text-xs text-amber-200/80">
                  Yellow cells are user-adjustable drivers. Changing any value below immediately updates starting capital, recovery velocity, and all 734 schedule days.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleApplyPlannedProfitToEmptyDays}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-400/20 hover:bg-amber-400 text-amber-300 hover:text-slate-950 border border-amber-400/40 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  title="Fill next 14 days with the planned daily profit"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Apply Profit to Schedule</span>
                </button>
                <button
                  onClick={() => setActiveSubTab('assumptions')}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Open full Assumptions & Recovery page"
                >
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tab 4 ↗</span>
                </button>
              </div>
            </div>

            {/* REAL-TIME NOTIFICATION ON VALUE CHANGE */}
            {assumptionsSavedAlert && (
              <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs font-mono flex items-center gap-2 animate-in fade-in duration-200">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">
                  Recalculation Complete: Starting Capital, Recovery Pace & 2-Year Balances Synchronized in Real-Time!
                </span>
              </div>
            )}

            {/* 4 LUXURY DRIVER CARDS WITH INLINE INPUTS & STEPPERS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Starting Capital ($5,000) */}
              <div className="p-4 rounded-xl bg-slate-950/90 border-2 border-amber-400/70 shadow-sm space-y-2.5 hover:border-amber-400 transition-colors">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-amber-300 flex items-center gap-1.5">
                    <span>Starting Capital</span>
                    <span className="text-[10px] text-amber-400/80 font-mono">($)</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold">
                    Row 0 Day 1
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-base font-bold text-amber-400 font-mono">$</span>
                    <input
                      type="number"
                      step="100"
                      value={startingCapStr}
                      onChange={(e) => handleTypeAssumption('startingCapital', e.target.value, setStartingCapStr)}
                      className="w-full pl-7 pr-3 py-2 bg-amber-950/30 border-2 border-amber-400/80 rounded-lg text-lg font-black font-mono text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-300 transition-all shadow-inner"
                      placeholder="5000"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleStepAssumption('startingCapital', 500)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Add $500"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStepAssumption('startingCapital', -500)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Subtract $500"
                    >
                      -
                    </button>
                  </div>
                </div>

                {/* Preset Chips */}
                <div className="flex items-center gap-1 text-[10px] font-mono">
                  <span className="text-slate-500">Presets:</span>
                  {[1000, 5000, 10000, 25000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleApplyPreset('startingCapital', val)}
                      className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                        accountData.assumptions.startingCapital === val
                          ? 'bg-amber-400 text-slate-950 font-bold border-amber-400'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-amber-300 hover:border-slate-700'
                      }`}
                    >
                      ${val >= 1000 ? `${val / 1000}k` : val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card 2: Target Daily Rate (15%) */}
              <div className="p-4 rounded-xl bg-slate-950/90 border-2 border-amber-400/70 shadow-sm space-y-2.5 hover:border-amber-400 transition-colors">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-amber-300 flex items-center gap-1.5">
                    <span>Target Daily Rate</span>
                    <span className="text-[10px] text-amber-400/80 font-mono">(%)</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold">
                    Target Yield
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.5"
                      value={targetRateStr}
                      onChange={(e) => handleTypeAssumption('targetDailyRatePct', e.target.value, setTargetRateStr)}
                      className="w-full pl-3 pr-7 py-2 bg-amber-950/30 border-2 border-amber-400/80 rounded-lg text-lg font-black font-mono text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-300 transition-all shadow-inner"
                      placeholder="15"
                    />
                    <span className="absolute right-3 top-2.5 text-base font-bold text-amber-400 font-mono">%</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleStepAssumption('targetDailyRatePct', 1)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Add 1%"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStepAssumption('targetDailyRatePct', -1)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Subtract 1%"
                    >
                      -
                    </button>
                  </div>
                </div>

                {/* Preset Chips */}
                <div className="flex items-center gap-1 text-[10px] font-mono">
                  <span className="text-slate-500">Presets:</span>
                  {[5, 10, 15, 20].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleApplyPreset('targetDailyRatePct', val)}
                      className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                        accountData.assumptions.targetDailyRatePct === val
                          ? 'bg-amber-400 text-slate-950 font-bold border-amber-400'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-amber-300 hover:border-slate-700'
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Card 3: Planned Daily Profit ($1,280) */}
              <div className="p-4 rounded-xl bg-slate-950/90 border-2 border-amber-400/70 shadow-sm space-y-2.5 hover:border-amber-400 transition-colors">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-amber-300 flex items-center gap-1.5">
                    <span>Planned Daily Profit</span>
                    <span className="text-[10px] text-amber-400/80 font-mono">($)</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold">
                    Recovery Driver
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-base font-bold text-amber-400 font-mono">$</span>
                    <input
                      type="number"
                      step="50"
                      value={dailyProfitStr}
                      onChange={(e) => handleTypeAssumption('plannedDailyProfit', e.target.value, setDailyProfitStr)}
                      className="w-full pl-7 pr-3 py-2 bg-amber-950/30 border-2 border-amber-400/80 rounded-lg text-lg font-black font-mono text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-300 transition-all shadow-inner"
                      placeholder="1280"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleStepAssumption('plannedDailyProfit', 100)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Add $100"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStepAssumption('plannedDailyProfit', -100)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Subtract $100"
                    >
                      -
                    </button>
                  </div>
                </div>

                {/* Preset Chips */}
                <div className="flex items-center gap-1 text-[10px] font-mono">
                  <span className="text-slate-500">Presets:</span>
                  {[500, 1000, 1280, 2500].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleApplyPreset('plannedDailyProfit', val)}
                      className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                        accountData.assumptions.plannedDailyProfit === val
                          ? 'bg-amber-400 text-slate-950 font-bold border-amber-400'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-amber-300 hover:border-slate-700'
                      }`}
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card 4: Target Operating Capital ($50,000) */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 shadow-sm space-y-2.5 hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <span>Target Portfolio Capital</span>
                    <span className="text-[10px] text-slate-500 font-mono">($)</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    2-Year Goal
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-base font-bold text-slate-400 font-mono">$</span>
                    <input
                      type="number"
                      step="5000"
                      value={targetCapStr}
                      onChange={(e) => handleTypeAssumption('targetCapital', e.target.value, setTargetCapStr)}
                      className="w-full pl-7 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-lg font-bold font-mono text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      placeholder="50000"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleStepAssumption('targetCapital', 5000)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Add $5,000"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStepAssumption('targetCapital', -5000)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Subtract $5,000"
                    >
                      -
                    </button>
                  </div>
                </div>

                {/* Preset Chips */}
                <div className="flex items-center gap-1 text-[10px] font-mono">
                  <span className="text-slate-500">Presets:</span>
                  {[25000, 50000, 100000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleApplyPreset('targetCapital', val)}
                      className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                        accountData.assumptions.targetCapital === val
                          ? 'bg-slate-700 text-white font-bold border-slate-600'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      ${val / 1000}k
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ORIGINAL ONE-OFF LOSSES CARDS (Trade -$2,545 + UGas -$1,175 for Farmland) */}
          <div className="p-5 rounded-2xl bg-fuchsia-950/20 border border-fuchsia-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-fuchsia-500/20 text-fuchsia-300 font-mono border border-fuchsia-500/40">
                  Initial Historical Losses
                </span>
                <h3 className="text-sm font-bold text-white">
                  Original One-Off Losses Entered for {accountData.name}
                </h3>
              </div>
              <span className="text-xs text-fuchsia-300 font-mono font-semibold">
                First Day (2026/01/01) Total Deduction: -${Math.abs(accountData.oneOffLosses.combinedDailyReturn).toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Trade Loss */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-fuchsia-500/40">
                <div className="text-xs font-semibold text-fuchsia-300 flex items-center justify-between mb-1">
                  <span>money lost in the trade</span>
                  <span className="text-[10px] font-mono text-fuchsia-400">Trade PnL</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold font-mono text-fuchsia-400">
                    -${Math.abs(accountData.oneOffLosses.tradeLoss).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <input
                    type="number"
                    value={tradeLossStr}
                    onChange={(e) => handleTypeTradeLoss(e.target.value)}
                    className="w-24 px-2 py-1 bg-slate-950 border border-fuchsia-500/50 rounded text-xs font-mono text-fuchsia-200 text-right focus:outline-none focus:ring-1 focus:ring-fuchsia-400"
                    title="Change trade loss"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Direct realized trading deficit</p>
              </div>

              {/* UGas Fee */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-fuchsia-500/40">
                <div className="text-xs font-semibold text-fuchsia-300 flex items-center justify-between mb-1">
                  <span>money used on UGas</span>
                  <span className="text-[10px] font-mono text-fuchsia-400">Gas Drag</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold font-mono text-fuchsia-400">
                    -${Math.abs(accountData.oneOffLosses.ugasFee).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <input
                    type="number"
                    value={ugasFeeStr}
                    onChange={(e) => handleTypeUgasFee(e.target.value)}
                    className="w-24 px-2 py-1 bg-slate-950 border border-fuchsia-500/50 rounded text-xs font-mono text-fuchsia-200 text-right focus:outline-none focus:ring-1 focus:ring-fuchsia-400"
                    title="Change UGas fee"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Energy & network gas consumption</p>
              </div>

              {/* Combined Daily Return */}
              <div className="p-3.5 rounded-xl bg-fuchsia-900/40 border border-fuchsia-400">
                <div className="text-xs font-bold text-white flex items-center justify-between mb-1">
                  <span>DAILY RETREN (Combined)</span>
                  <span className="text-[10px] bg-fuchsia-800 text-white px-1.5 py-0.2 rounded font-mono">
                    Auto Sum
                  </span>
                </div>
                <div className="text-xl font-extrabold font-mono text-white mt-1">
                  -${Math.abs(accountData.oneOffLosses.combinedDailyReturn).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-fuchsia-200 mt-1">
                  Subtracted from ${accountData.assumptions.startingCapital.toLocaleString()} = ${(accountData.assumptions.startingCapital + accountData.oneOffLosses.combinedDailyReturn).toLocaleString()} day 1 end
                </p>
              </div>
            </div>
          </div>

          {/* CLEAR INSTRUCTIONS ON HOW TO USE THE FILE (User's exact 4-step workflow) */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">
                How to Use This File Going Forward
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* STEP 1: Interactive Assumptions Review & Edit */}
              <div
                onClick={() => setActiveSubTab('assumptions')}
                className="p-4 rounded-xl bg-gradient-to-br from-amber-950/30 via-slate-950 to-slate-900 border-2 border-amber-400/60 hover:border-amber-400 shadow-md shadow-amber-950/20 cursor-pointer transition-all duration-200 group space-y-2 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 font-bold flex items-center justify-center font-mono text-xs border border-amber-400/40">
                    1
                  </div>
                  <span className="text-[9px] font-mono font-bold text-amber-300 uppercase px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors">
                    Click to Edit ✎
                  </span>
                </div>
                <div className="font-bold text-white text-sm group-hover:text-amber-300 transition-colors">
                  Review & Edit Yellow Cells
                </div>
                <p className="text-slate-300 leading-relaxed text-xs">
                  Change the yellow cells: <strong className="text-amber-300">Starting Capital (${accountData.assumptions.startingCapital.toLocaleString()})</strong>, <strong className="text-amber-300">Target Daily Rate ({accountData.assumptions.targetDailyRatePct}%)</strong>, or <strong className="text-amber-300">Planned Daily Profit (${accountData.assumptions.plannedDailyProfit.toLocaleString()})</strong>.
                </p>
                <div className="pt-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveSubTab('assumptions');
                    }}
                    className="w-full py-1.5 px-3 rounded-lg text-xs font-bold bg-amber-400/20 hover:bg-amber-400 text-amber-300 hover:text-slate-950 border border-amber-400/50 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Open Assumptions Editor</span>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center font-mono">
                  2
                </div>
                <div className="font-bold text-white text-sm">Track Cash Flows</div>
                <p className="text-slate-300 leading-relaxed">
                  Every time money moves (Deposit, Withdrawal, Loan In, Loan Out, Gas, Fee) → add a row in <strong className="text-emerald-400">3. Cash Flows</strong>. Totals feed the dashboard automatically.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center font-mono">
                  3
                </div>
                <div className="font-bold text-white text-sm">Enter Daily Return ($)</div>
                <p className="text-slate-300 leading-relaxed">
                  Every day (or when your bot reports) → go to <strong className="text-yellow-300">2. Daily Log</strong>, type Date & the Daily Return ($) in the <span className="bg-yellow-400/20 text-yellow-300 px-1 py-0.2 rounded font-mono font-bold">yellow column</span>. Everything else calculates!
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center font-mono">
                  4
                </div>
                <div className="font-bold text-white text-sm">Dashboard Self-Updates</div>
                <p className="text-slate-300 leading-relaxed">
                  The Dashboard updates by itself! Current Capital, Cumulative PnL, Running Balances, Win Rates, and Equity Curves reflect all updates in real-time.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 2: DAILY LOG (Automated Formulas, Yellow Return, 14 Days Pre-filled, Equity Curve) */}
      {/* ========================================================= */}
      {activeSubTab === 'dailylog' && (
        <div className="space-y-6">
          {/* EQUITY CURVE MINI CHART */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Equity Curve & Cumulative Running Capital ({accountData.name})
                </h4>
                <p className="text-xs text-slate-400">
                  Visualizes Day 1 one-off loss dip, followed by pre-filled $1,280 daily profit trajectory
                </p>
              </div>
              <span className="text-xs font-mono px-2 py-1 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                Latest: ${accountData.dailyLog[14]?.endingCapital.toLocaleString() || '19,200'}
              </span>
            </div>

            {/* SVG Curve */}
            <div className="h-32 w-full bg-slate-950/70 border border-slate-800/80 rounded-xl p-2 relative overflow-hidden flex items-end">
              <svg className="w-full h-full" viewBox="0 0 500 140" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Area fill */}
                {equityPoints && (
                  <polygon
                    points={`0,140 ${equityPoints} 500,140`}
                    fill="url(#equityGrad)"
                  />
                )}
                {/* Line stroke */}
                {equityPoints && (
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    points={equityPoints}
                  />
                )}
              </svg>
            </div>
          </div>

          {/* QUICK ADD ROW BAR FOR DAILY LOG */}
          <form
            onSubmit={handleAddDailyLogRow}
            className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                Quick Daily Return Entry
              </span>
              <span className="text-[11px] text-yellow-300 font-mono">
                Type Date & Daily Return ($) in the yellow input below
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1 font-mono">DATE (e.g. 5/16/2025)</label>
                <input
                  type="text"
                  placeholder="e.g. 5/16/2025"
                  value={newLogDay}
                  onChange={(e) => setNewLogDay(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-yellow-400 mb-1 font-mono font-bold">
                  DAILY RETURN ($) [YELLOW INPUT]
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="1280"
                  value={newLogReturn}
                  onChange={(e) => setNewLogReturn(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-yellow-950/40 border-2 border-yellow-400 text-yellow-300 font-mono font-bold focus:ring-1 focus:ring-yellow-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1 font-mono">NOTES / BOT MEMO</label>
                <input
                  type="text"
                  placeholder="e.g. Bot run 14-cycle profit"
                  value={newLogNotes}
                  onChange={(e) => setNewLogNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Log Daily Return</span>
                </button>
              </div>
            </div>
          </form>

          {/* CLEAN DAILY TRACKER TABLE WITH AUTOMATIC FORMULAS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-slate-950 px-6 py-3.5 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <span className="font-extrabold tracking-wide text-sm font-mono text-emerald-400">
                  {accountData.name} DAILY TRACKER
                </span>
                <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded font-mono text-slate-300">
                  Formulas: Start Cap → Daily Return ($) → Daily Return (%) → End Cap → Cum PnL → Running Cap
                </span>
              </div>
              <div className="text-xs font-mono text-slate-400">
                Page {dailyLogPage} of {totalDailyLogPages} ({accountData.dailyLog.length} rows)
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                    <th className="py-3 px-3.5 font-bold">DATE</th>
                    <th className="py-3 px-3.5 font-bold text-slate-300">STARTING CAPITAL</th>
                    <th className="py-3 px-3.5 font-bold text-yellow-300 bg-yellow-950/20">
                      DAILY RETURN ($) [EDIT]
                    </th>
                    <th className="py-3 px-3.5 font-bold text-slate-300">DAILY RETURN (%)</th>
                    <th className="py-3 px-3.5 font-bold text-slate-200">ENDING CAPITAL</th>
                    <th className="py-3 px-3.5 font-bold text-emerald-400">CUMULATIVE PNL</th>
                    <th className="py-3 px-3.5 font-bold text-slate-300">RUNNING CAPITAL</th>
                    <th className="py-3 px-3.5 font-bold text-slate-400">NOTES</th>
                    <th className="py-3 px-3.5 font-bold text-center w-16">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono">
                  {paginatedDailyLog.map((row, idx) => {
                    const isEditing = editingRowId === row.id;
                    const isDayOne = row.day === '2026/01/01' || (dailyLogPage === 1 && idx === 0);
                    const isPrefilledProfit = row.dailyReturn > 0;

                    if (isEditing) {
                      return (
                        <tr key={row.id} className="bg-slate-800/70 text-white">
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={editDayVal}
                              onChange={(e) => setEditDayVal(e.target.value)}
                              className="w-24 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs font-mono text-white"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">
                            ${row.startingCapital.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 bg-yellow-950/40">
                            <input
                              type="number"
                              step="0.01"
                              value={editReturnVal}
                              onChange={(e) => setEditReturnVal(e.target.value)}
                              className="w-24 px-2 py-1 bg-yellow-950 border-2 border-yellow-400 rounded text-xs font-mono text-yellow-200 font-bold"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 font-mono">Auto %</td>
                          <td className="py-2.5 px-3 text-slate-400 font-mono">Auto $</td>
                          <td className="py-2.5 px-3 text-slate-400 font-mono">Auto $</td>
                          <td className="py-2.5 px-3 text-slate-400 font-mono">Auto $</td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={editNotesVal}
                              onChange={(e) => setEditNotesVal(e.target.value)}
                              className="w-32 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleSaveDailyReturnEdit(row.id)}
                                className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                                title="Save"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingRowId(null)}
                                className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr
                        key={row.id}
                        className={`hover:bg-slate-800/40 transition-colors group ${
                          isDayOne ? 'bg-fuchsia-950/20' : isPrefilledProfit ? 'bg-emerald-950/10' : ''
                        }`}
                      >
                        {/* DATE */}
                        <td className="py-2.5 px-3.5 font-semibold text-slate-200 whitespace-nowrap">
                          {row.day ? (
                            <span>{row.day}</span>
                          ) : (
                            <span className="text-slate-600 font-mono text-[11px]">—</span>
                          )}
                          {isDayOne && (
                            <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30">
                              Loss Day
                            </span>
                          )}
                        </td>

                        {/* STARTING CAPITAL */}
                        <td className="py-2.5 px-3.5 text-slate-300">
                          ${row.startingCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* DAILY RETURN ($) - Yellow editable highlight cell */}
                        <td className="py-2.5 px-3.5 bg-yellow-500/10 font-bold">
                          {row.dailyReturn !== 0 ? (
                            <span
                              className={`px-2 py-0.5 rounded font-mono font-bold ${
                                row.dailyReturn < 0
                                  ? 'bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-500/40'
                                  : 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/40'
                              }`}
                            >
                              {row.dailyReturn > 0 ? '+' : ''}
                              ${row.dailyReturn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono">$0.00</span>
                          )}
                        </td>

                        {/* DAILY RETURN (%) */}
                        <td className="py-2.5 px-3.5 font-mono">
                          <span
                            className={
                              row.dailyReturnPct > 0
                                ? 'text-emerald-400'
                                : row.dailyReturnPct < 0
                                ? 'text-rose-400'
                                : 'text-slate-500'
                            }
                          >
                            {row.dailyReturnPct > 0 ? '+' : ''}
                            {row.dailyReturnPct.toFixed(2)}%
                          </span>
                        </td>

                        {/* ENDING CAPITAL */}
                        <td className="py-2.5 px-3.5 font-bold text-white">
                          ${row.endingCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* CUMULATIVE PNL */}
                        <td className="py-2.5 px-3.5 font-bold font-mono">
                          <span
                            className={
                              row.cumulativePnL > 0
                                ? 'text-emerald-400'
                                : row.cumulativePnL < 0
                                ? 'text-fuchsia-400'
                                : 'text-slate-500'
                            }
                          >
                            {row.cumulativePnL > 0 ? '+' : ''}
                            ${row.cumulativePnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* RUNNING CAPITAL */}
                        <td className="py-2.5 px-3.5 text-slate-300 font-mono">
                          ${row.runningCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* NOTES */}
                        <td className="py-2.5 px-3.5 text-slate-400 text-[11px] max-w-xs truncate" title={row.notes}>
                          {row.notes || '-'}
                        </td>

                        {/* ACTIONS */}
                        <td className="py-2.5 px-3.5 text-center">
                          <button
                            onClick={() => {
                              setEditingRowId(row.id);
                              setEditReturnVal(String(row.dailyReturn));
                              setEditDayVal(row.day);
                              setEditNotesVal(row.notes || '');
                            }}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-yellow-300 transition-colors cursor-pointer"
                            title="Edit this return"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>
                Showing days {(dailyLogPage - 1) * DAILY_LOG_ROWS_PER_PAGE + 1} to{' '}
                {Math.min(dailyLogPage * DAILY_LOG_ROWS_PER_PAGE, accountData.dailyLog.length)} of {accountData.dailyLog.length} rows
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={dailyLogPage === 1}
                  onClick={() => setDailyLogPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-white font-bold">
                  Page {dailyLogPage} / {totalDailyLogPages}
                </span>
                <button
                  disabled={dailyLogPage === totalDailyLogPages}
                  onClick={() => setDailyLogPage((p) => Math.min(totalDailyLogPages, p + 1))}
                  className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 3: CASH FLOWS (Separate Log for Deposits, Withdrawals, Loans, Gas, Fees, Trade Losses) */}
      {/* ========================================================= */}
      {activeSubTab === 'cashflows' && (
        <div className="space-y-6">
          {/* SUMMARY TOTALS STRIP (Feeds Dashboard) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <span className="text-slate-400 block mb-0.5">Total Deposits</span>
              <span className="text-lg font-bold font-mono text-emerald-400">
                ${cashFlowTotals.totalDeposits.toLocaleString()}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <span className="text-slate-400 block mb-0.5">Total Withdrawals</span>
              <span className="text-lg font-bold font-mono text-amber-400">
                ${cashFlowTotals.totalWithdrawals.toLocaleString()}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <span className="text-slate-400 block mb-0.5">Net Withdrawals</span>
              <span className="text-lg font-bold font-mono text-amber-300">
                ${cashFlowTotals.netWithdrawals.toLocaleString()}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <span className="text-slate-400 block mb-0.5">Total Gas & Fees</span>
              <span className="text-lg font-bold font-mono text-fuchsia-400">
                ${cashFlowTotals.totalGasFees.toLocaleString()}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <span className="text-slate-400 block mb-0.5">Outstanding Loan</span>
              <span className="text-lg font-bold font-mono text-blue-400">
                ${cashFlowTotals.outstandingLoan.toLocaleString()}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <span className="text-slate-400 block mb-0.5">Trade Losses Logged</span>
              <span className="text-lg font-bold font-mono text-rose-400">
                ${cashFlowTotals.totalTradeLosses.toLocaleString()}
              </span>
            </div>
          </div>

          {/* ADD CASH FLOW FORM */}
          <form
            onSubmit={handleAddCashFlow}
            className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Record Cash Flow Movement for {accountData.name}
              </span>
              <span className="text-[11px] text-slate-400">
                Automatically aggregates and feeds live Dashboard KPIs
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1 font-mono">DATE</label>
                <input
                  type="date"
                  value={cfDate}
                  onChange={(e) => setCfDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1 font-mono">FLOW TYPE</label>
                <select
                  value={cfType}
                  onChange={(e) => setCfType(e.target.value as CashFlowType)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Deposit">Deposit (Inflow +)</option>
                  <option value="Withdrawal">Withdrawal (Outflow -)</option>
                  <option value="Loan In">Loan In (Borrowed +)</option>
                  <option value="Loan Out">Loan Out (Repaid -)</option>
                  <option value="Gas">Gas (Energy Fee -)</option>
                  <option value="Fee">Fee (Exchange / Network -)</option>
                  <option value="Trade Loss">Trade Loss (One-Off -)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1 font-mono">AMOUNT ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={cfAmount}
                  onChange={(e) => setCfAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1 font-mono">ASSET</label>
                <select
                  value={cfAsset}
                  onChange={(e) => setCfAsset(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono focus:border-emerald-500 focus:outline-none"
                >
                  <option value="USDT">USDT</option>
                  <option value="USDC">USDC</option>
                  <option value="USD">USD</option>
                  <option value="BTC">BTC</option>
                  <option value="ETH">ETH</option>
                </select>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[10px] text-slate-400 mb-1 font-mono">NOTES</label>
                <input
                  type="text"
                  placeholder="e.g. Bot allocation"
                  value={cfNotes}
                  onChange={(e) => setCfNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Flow</span>
                </button>
              </div>
            </div>
          </form>

          {/* CASH FLOWS TABLE */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                    <th className="py-3 px-4 font-bold">DATE</th>
                    <th className="py-3 px-4 font-bold">FLOW TYPE</th>
                    <th className="py-3 px-4 font-bold">AMOUNT</th>
                    <th className="py-3 px-4 font-bold">ASSET</th>
                    <th className="py-3 px-4 font-bold">NOTES</th>
                    <th className="py-3 px-4 font-bold text-center w-16">DELETE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono">
                  {accountData.cashFlows.map((cf) => {
                    const isPositive = cf.amount > 0;
                    return (
                      <tr key={cf.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-slate-200">{cf.date}</td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              cf.type === 'Deposit'
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                                : cf.type === 'Withdrawal'
                                ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                                : cf.type === 'Loan In' || cf.type === 'Loan Out'
                                ? 'bg-blue-950/80 text-blue-300 border-blue-500/40'
                                : cf.type === 'Gas' || cf.type === 'Fee'
                                ? 'bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-500/40'
                                : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                            }`}
                          >
                            {cf.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-bold">
                          <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                            {isPositive ? '+' : ''}${cf.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-400">{cf.asset}</td>
                        <td className="py-2.5 px-4 text-slate-300 text-[11px]">{cf.notes || '-'}</td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={() => handleDeleteCashFlow(cf.id)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete cash flow entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* ========================================================= */}
      {/* SECTION 4: ASSUMPTIONS (Easy Yellow Cells You Can Change) */}
      {/* ========================================================= */}
      {activeSubTab === 'assumptions' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/50 font-mono tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                    Configurable Yellow Input Cells
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                    Financial Model Drivers
                  </span>
                </div>
                <h3 className="text-xl font-black text-white mt-1">
                  Operating Assumptions for {accountData.name}
                </h3>
                <p className="text-xs text-amber-200/80 mt-0.5">
                  Change any yellow cell below to immediately recalculate the daily tracker, recovery milestones, and 734-day capital schedule.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleApplyPlannedProfitToEmptyDays}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-400/20 hover:bg-amber-400 text-amber-300 hover:text-slate-950 border border-amber-400/40 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  title="Apply planned daily profit across schedule"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Apply Profit to Schedule</span>
                </button>

                <button
                  onClick={() => {
                    handleApplyPreset('startingCapital', 5000);
                    handleApplyPreset('targetDailyRatePct', 15.0);
                    handleApplyPreset('plannedDailyProfit', 1280);
                    handleApplyPreset('targetCapital', 50000);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Reset to 5000 / 15% / 1280 defaults"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Defaults</span>
                </button>
              </div>
            </div>

            {/* REAL-TIME NOTIFICATION ON VALUE CHANGE */}
            {assumptionsSavedAlert && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs font-mono flex items-center gap-2 animate-in fade-in duration-200">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">
                  Recalculation Complete: Starting Capital, Recovery Pace & 2-Year Balances Synchronized in Real-Time!
                </span>
              </div>
            )}

            {/* YELLOW CELLS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Yellow Cell 1: Starting Capital ($5,000) */}
              <div className="p-5 rounded-2xl bg-slate-950/90 border-2 border-amber-400/80 shadow-lg shadow-amber-950/20 space-y-3 hover:border-amber-400 transition-colors">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-amber-300 flex items-center gap-1.5">
                    <span>Starting Capital ($)</span>
                  </span>
                  <span className="text-[10px] font-mono bg-amber-400/20 px-2 py-0.5 rounded text-amber-200 font-bold border border-amber-400/30">
                    Yellow Cell
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-lg font-bold text-amber-400 font-mono">$</span>
                    <input
                      type="number"
                      step="100"
                      value={startingCapStr}
                      onChange={(e) => handleTypeAssumption('startingCapital', e.target.value, setStartingCapStr)}
                      className="w-full pl-8 pr-3 py-2 bg-amber-950/30 border-2 border-amber-400/80 rounded-xl text-2xl font-black font-mono text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-300 transition-all shadow-inner"
                      placeholder="5000"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleStepAssumption('startingCapital', 500)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Add $500"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStepAssumption('startingCapital', -500)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Subtract $500"
                    >
                      -
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[10px] font-mono">
                  <span className="text-slate-500">Presets:</span>
                  {[1000, 5000, 10000, 25000, 50000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleApplyPreset('startingCapital', val)}
                      className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                        accountData.assumptions.startingCapital === val
                          ? 'bg-amber-400 text-slate-950 font-bold border-amber-400'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-amber-300 hover:border-slate-700'
                      }`}
                    >
                      ${val >= 1000 ? `${val / 1000}k` : val}
                    </button>
                  ))}
                </div>

                <p className="text-[11px] text-amber-200/80">
                  Initial principal allocation per trading lot (Row 0 Day 1).
                </p>
              </div>

              {/* Yellow Cell 2: Target Daily Rate (15%) */}
              <div className="p-5 rounded-2xl bg-slate-950/90 border-2 border-amber-400/80 shadow-lg shadow-amber-950/20 space-y-3 hover:border-amber-400 transition-colors">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-amber-300 flex items-center gap-1.5">
                    <span>Target Daily Rate (%)</span>
                  </span>
                  <span className="text-[10px] font-mono bg-amber-400/20 px-2 py-0.5 rounded text-amber-200 font-bold border border-amber-400/30">
                    Yellow Cell
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.5"
                      value={targetRateStr}
                      onChange={(e) => handleTypeAssumption('targetDailyRatePct', e.target.value, setTargetRateStr)}
                      className="w-full pl-3 pr-8 py-2 bg-amber-950/30 border-2 border-amber-400/80 rounded-xl text-2xl font-black font-mono text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-300 transition-all shadow-inner"
                      placeholder="15"
                    />
                    <span className="absolute right-3 top-2.5 text-lg font-bold text-amber-400 font-mono">%</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleStepAssumption('targetDailyRatePct', 1)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Add 1%"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStepAssumption('targetDailyRatePct', -1)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Subtract 1%"
                    >
                      -
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[10px] font-mono">
                  <span className="text-slate-500">Presets:</span>
                  {[5, 10, 15, 20, 25].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleApplyPreset('targetDailyRatePct', val)}
                      className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                        accountData.assumptions.targetDailyRatePct === val
                          ? 'bg-amber-400 text-slate-950 font-bold border-amber-400'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-amber-300 hover:border-slate-700'
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>

                <p className="text-[11px] text-amber-200/80">
                  Bot strategy target yield rate per daily operational cycle.
                </p>
              </div>

              {/* Yellow Cell 3: Planned Daily Profit ($1,280) */}
              <div className="p-5 rounded-2xl bg-slate-950/90 border-2 border-amber-400/80 shadow-lg shadow-amber-950/20 space-y-3 hover:border-amber-400 transition-colors">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-amber-300 flex items-center gap-1.5">
                    <span>Planned Daily Profit ($)</span>
                  </span>
                  <span className="text-[10px] font-mono bg-amber-400/20 px-2 py-0.5 rounded text-amber-200 font-bold border border-amber-400/30">
                    Yellow Cell
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-lg font-bold text-amber-400 font-mono">$</span>
                    <input
                      type="number"
                      step="50"
                      value={dailyProfitStr}
                      onChange={(e) => handleTypeAssumption('plannedDailyProfit', e.target.value, setDailyProfitStr)}
                      className="w-full pl-8 pr-3 py-2 bg-amber-950/30 border-2 border-amber-400/80 rounded-xl text-2xl font-black font-mono text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-300 transition-all shadow-inner"
                      placeholder="1280"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleStepAssumption('plannedDailyProfit', 100)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Add $100"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStepAssumption('plannedDailyProfit', -100)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Subtract $100"
                    >
                      -
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[10px] font-mono">
                  <span className="text-slate-500">Presets:</span>
                  {[500, 1000, 1280, 2000, 2500].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleApplyPreset('plannedDailyProfit', val)}
                      className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                        accountData.assumptions.plannedDailyProfit === val
                          ? 'bg-amber-400 text-slate-950 font-bold border-amber-400'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-amber-300 hover:border-slate-700'
                      }`}
                    >
                      ${val}
                    </button>
                  ))}
                </div>

                <p className="text-[11px] text-amber-200/80">
                  Target daily profit benchmark for recovery velocity calculations.
                </p>
              </div>

              {/* Target Operating Capital Baseline ($50,000) */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 shadow-sm space-y-3 hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>Target Operating Capital ($)</span>
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded">
                    2-Year Goal
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-lg font-bold text-slate-400 font-mono">$</span>
                    <input
                      type="number"
                      step="5000"
                      value={targetCapStr}
                      onChange={(e) => handleTypeAssumption('targetCapital', e.target.value, setTargetCapStr)}
                      className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-2xl font-bold font-mono text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      placeholder="50000"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleStepAssumption('targetCapital', 5000)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Add $5,000"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStepAssumption('targetCapital', -5000)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Subtract $5,000"
                    >
                      -
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[10px] font-mono">
                  <span className="text-slate-500">Presets:</span>
                  {[25000, 50000, 100000, 250000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleApplyPreset('targetCapital', val)}
                      className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                        accountData.assumptions.targetCapital === val
                          ? 'bg-slate-700 text-white font-bold border-slate-600'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      ${val / 1000}k
                    </button>
                  ))}
                </div>

                <p className="text-[11px] text-slate-400">
                  The $50,000 cumulative portfolio capital baseline to reach.
                </p>
              </div>
            </div>

            {/* REAL-TIME MATHEMATICAL IMPACT BOX */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Real-Time Recovery & Target Math</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Daily Loss Recovery Rate:</span>
                  <span className="text-white font-bold text-sm">
                    {accountData.assumptions.plannedDailyProfit > 0
                      ? `${(Math.abs(accountData.oneOffLosses.combinedDailyReturn) / accountData.assumptions.plannedDailyProfit).toFixed(1)} Days`
                      : 'N/A'}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Days to recover -${Math.abs(accountData.oneOffLosses.combinedDailyReturn).toLocaleString()} at ${accountData.assumptions.plannedDailyProfit}/day
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Target Capital Deficit:</span>
                  <span className="text-amber-400 font-bold text-sm">
                    ${(accountData.assumptions.targetCapital - (accountData.assumptions.startingCapital + accountData.oneOffLosses.combinedDailyReturn)).toLocaleString()}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Target $50k minus Day 1 capital
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Days to $50,000 Baseline:</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    {accountData.assumptions.plannedDailyProfit > 0
                      ? `${Math.ceil((accountData.assumptions.targetCapital - (accountData.assumptions.startingCapital + accountData.oneOffLosses.combinedDailyReturn)) / accountData.assumptions.plannedDailyProfit)} Days`
                      : 'N/A'}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    At planned daily profit of ${accountData.assumptions.plannedDailyProfit}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 5: 2-YEAR SCHEDULE (26-Page PDF Model & Page 26 Final Reconciliation) */}
      {/* ========================================================= */}
      {activeSubTab === 'schedule2yr' && (
        <div className="space-y-6">
          {/* GREEN HEADER WITH PAGINATION MIRRORING 26-PAGE USER SPREADSHEET */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-emerald-700 px-6 py-3 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <span className="font-extrabold tracking-widest text-lg font-mono">
                  {accountData.name.toUpperCase()}
                </span>
                <span className="text-xs bg-emerald-800/80 px-2 py-0.5 rounded font-mono">
                  734 Recorded Days (Starting 2026/01/01)
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span>Page {schedulePage} of {totalSchedulePages}</span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={schedulePage === 1}
                    onClick={() => setSchedulePage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded bg-emerald-800 hover:bg-emerald-900 disabled:opacity-40 cursor-pointer"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={schedulePage === totalSchedulePages}
                    onClick={() => setSchedulePage((p) => Math.min(totalSchedulePages, p + 1))}
                    className="p-1 rounded bg-emerald-800 hover:bg-emerald-900 disabled:opacity-40 cursor-pointer"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                    <th className="py-3 px-4 font-bold">DAYS</th>
                    <th className="py-3 px-4 font-bold">AMOUNT</th>
                    <th className="py-3 px-4 font-bold text-fuchsia-400">DAILY RETREN</th>
                    <th className="py-3 px-4 font-bold">TOTAL</th>
                    <th className="py-3 px-4 font-bold text-right">RATE(%)</th>
                    <th className="py-3 px-4 font-bold">NOTES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono">
                  {paginatedSchedule.map((row) => {
                    const hasDeduction = row.dailyReturn !== 0;
                    return (
                      <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-slate-200">
                          {row.day ? (
                            <span>{row.day}</span>
                          ) : (
                            <span className="text-slate-600 font-mono text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-slate-300">
                          ${accountData.assumptions.startingCapital.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-4">
                          {hasDeduction ? (
                            <span
                              className={`px-2 py-0.5 rounded font-bold ${
                                row.dailyReturn < 0
                                  ? 'bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-500/50'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                              }`}
                            >
                              {row.dailyReturn > 0 ? '+' : ''}
                              ${row.dailyReturn.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-white">
                          ${row.endingCapital.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-300">
                          {row.ratePct.toFixed(2)}%
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 text-[11px] truncate max-w-xs">
                          {row.notes || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Pagination Footer */}
            <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>
                Showing rows {(schedulePage - 1) * SCHEDULE_ROWS_PER_PAGE + 1} to{' '}
                {Math.min(schedulePage * SCHEDULE_ROWS_PER_PAGE, accountData.dailyLog.length)} of {accountData.dailyLog.length} total days
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={schedulePage === 1}
                  onClick={() => setSchedulePage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-white font-bold">
                  Page {schedulePage} / {totalSchedulePages}
                </span>
                <button
                  disabled={schedulePage === totalSchedulePages}
                  onClick={() => setSchedulePage((p) => Math.min(totalSchedulePages, p + 1))}
                  className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* PAGE 26 FINAL RECONCILIATION CARD (Yellow Box $48,720 + Red Box $50,000) */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                  Page 26 Final Reconciliation
                </span>
                <h3 className="text-base font-bold text-white">
                  Cumulative Capital & Deficit Balance ({accountData.name})
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                ${(accountData.assumptions.targetCapital - (accountData.assumptions.startingCapital + accountData.oneOffLosses.combinedDailyReturn)).toLocaleString(undefined, { minimumFractionDigits: 2 })} + ${(accountData.assumptions.startingCapital + accountData.oneOffLosses.combinedDailyReturn).toLocaleString(undefined, { minimumFractionDigits: 2 })} = ${accountData.assumptions.targetCapital.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Yellow Box: $48,720.00 Deficit */}
              <div className="p-5 rounded-2xl bg-amber-500/15 border-2 border-amber-400 flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wide text-amber-300 block mb-1">
                    Net Drawdown / Shortfall Deficit
                  </span>
                  <span className="text-2xl font-black font-mono text-amber-300">
                    ${(accountData.assumptions.targetCapital - (accountData.assumptions.startingCapital + accountData.oneOffLosses.combinedDailyReturn)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <p className="text-[11px] text-amber-200/80 mt-1">
                    Total deficit to recover to achieve the ${accountData.assumptions.targetCapital.toLocaleString()} target baseline
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-400/20 flex items-center justify-center text-amber-300 font-black text-xl">
                  ∑
                </div>
              </div>

              {/* Red Box: $50,000.00 Target */}
              <div className="p-5 rounded-2xl bg-rose-600/20 border-2 border-rose-500 flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wide text-rose-300 block mb-1">
                    Target Operating Capital Baseline
                  </span>
                  <span className="text-2xl font-black font-mono text-rose-300">
                    ${accountData.assumptions.targetCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <p className="text-[11px] text-rose-200/80 mt-1">
                    10x ${accountData.assumptions.startingCapital.toLocaleString()} allocations across the 2-year trading period
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-300 font-black text-xl">
                  🎯
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD ACCOUNT MODAL (With Gas Fees & Money in Question Inputs) */}
      <AddAccountModal
        isOpen={newAccountModalOpen}
        onClose={() => setNewAccountModalOpen(false)}
        onAccountCreated={(newAcc, newAccData) => {
          setAccounts(getStoredAccountsList());
          setAccountData(newAccData);
          setActiveAccountId(newAcc.id);
          if (externalSelectAccount) {
            externalSelectAccount(newAcc.id);
          }
          if (typeof window !== 'undefined') {
            localStorage.setItem('greenharvest_active_account_id_v3', newAcc.id);
            localStorage.setItem('greenharvest_active_account_id_v2', newAcc.id);
          }
        }}
      />

      {/* RENAME ACCOUNT MODAL */}
      <RenameAccountModal
        isOpen={renameModalOpen}
        accountId={renameTargetId}
        currentName={renameTargetName}
        onClose={() => setRenameModalOpen(false)}
        onRenamed={(accId, newName) => {
          setAccounts(getStoredAccountsList());
          if (accountData.id === accId) {
            setAccountData((prev) => ({ ...prev, name: newName }));
          }
        }}
      />

      {/* Account Operating Settings Modal */}
      <AccountSettingsModal
        isOpen={isSettingsModalOpen}
        accountId={accountData.id}
        accountName={accountData.name}
        initialStartingCapital={accountData.assumptions.startingCapital}
        initialTargetDailyRatePct={accountData.assumptions.targetDailyRatePct}
        initialPlannedDailyProfit={accountData.assumptions.plannedDailyProfit}
        initialTargetCapital={accountData.assumptions.targetCapital}
        onClose={() => setIsSettingsModalOpen(false)}
        onSave={(data) => {
          setAccountData((prev) => {
            const recalculated = recalculateDailyLog(
              prev.dailyLog,
              data.assumptions.startingCapital,
              data.assumptions.targetDailyRatePct
            );
            return {
              ...prev,
              assumptions: data.assumptions,
              dailyLog: recalculated,
            };
          });
        }}
      />
    </div>
  );
}
