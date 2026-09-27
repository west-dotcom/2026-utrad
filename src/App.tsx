import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  LayoutDashboard,
  TableProperties,
  Calendar,
  Cpu,
  FileSpreadsheet,
  Calculator,
  PlusCircle,
  RotateCcw,
  Sparkles,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Wallet,
  Menu,
  X,
  Sprout,
  Building2,
  ChevronDown,
} from 'lucide-react';
import { User } from 'firebase/auth';

import { Transaction, GoogleSheetMeta } from './types';
import { SAMPLE_TRANSACTIONS } from './lib/sampleData';
import {
  recalculateLedger,
  generateDailySnapshots,
  calculateLedgerSummary,
  calculateBotStrategyStats,
} from './lib/ledgerMath';
import {
  initGoogleAuth,
  signInWithGooglePopup,
  signOutGoogle,
  getCachedToken,
} from './lib/googleAuth';
import {
  createCryptoBotSpreadsheet,
  syncAllToSpreadsheet,
  fetchTransactionsFromSpreadsheet,
} from './lib/googleSheetsService';

import { DashboardView } from './components/DashboardView';
import { FarmlandSheetView } from './components/FarmlandSheetView';
import { TransactionsView } from './components/TransactionsView';
import { DailySnapshotView } from './components/DailySnapshotView';
import { BotAnalyticsView } from './components/BotAnalyticsView';
import { GoogleSheetsView } from './components/GoogleSheetsView';
import { FormulaGuideView } from './components/FormulaGuideView';
import { AddTransactionModal } from './components/AddTransactionModal';
import { ConfirmationModal } from './components/ConfirmationModal';

const LOCAL_STORAGE_TX_KEY = 'crypto_bot_ledger_txs_v1';
const LOCAL_STORAGE_SHEET_KEY = 'crypto_bot_sheet_meta_v1';
const LOCAL_STORAGE_PROFIT_TARGET_KEY = 'crypto_bot_daily_profit_target_v1';
const STARTING_CAPITAL = 50000;

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Active Multi-Account selector (farmland, firmly, gadget)
  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    try {
      return localStorage.getItem('greenharvest_active_account_id_v2') || 'farmland';
    } catch {
      return 'farmland';
    }
  });
  const [headerAccountDropdownOpen, setHeaderAccountDropdownOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('greenharvest_active_account_id_v2', selectedAccountId);
    } catch (e) {
      console.warn(e);
    }
  }, [selectedAccountId]);

  // Daily Profit Target
  const [dailyProfitTarget, setDailyProfitTarget] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_PROFIT_TARGET_KEY);
      return saved ? parseFloat(saved) || 250 : 250;
    } catch {
      return 250;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_PROFIT_TARGET_KEY, String(dailyProfitTarget));
    } catch (e) {
      console.warn('Failed to save daily profit target', e);
    }
  }, [dailyProfitTarget]);

  // Authentication & Sheets
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [sheetMeta, setSheetMeta] = useState<GoogleSheetMeta | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SHEET_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // Ledger state
  const [rawTransactions, setRawTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_TX_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load transactions from localStorage', e);
    }
    return SAMPLE_TRANSACTIONS;
  });

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  }, []);

  // Save transactions to local storage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_TX_KEY, JSON.stringify(rawTransactions));
    } catch (err) {
      console.error('Error saving to localStorage', err);
    }
  }, [rawTransactions]);

  // Save sheet meta to local storage
  useEffect(() => {
    if (sheetMeta) {
      localStorage.setItem(LOCAL_STORAGE_SHEET_KEY, JSON.stringify(sheetMeta));
    }
  }, [sheetMeta]);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initGoogleAuth((u) => {
      setUser(u);
      setAccessToken(getCachedToken());
    });
    return () => unsubscribe();
  }, []);

  // Compute calculated ledger
  const transactions = useMemo(() => {
    return recalculateLedger(rawTransactions, STARTING_CAPITAL);
  }, [rawTransactions]);

  // Compute daily snapshots
  const snapshots = useMemo(() => {
    return generateDailySnapshots(transactions, STARTING_CAPITAL, dailyProfitTarget);
  }, [transactions, dailyProfitTarget]);

  // Compute executive ledger summary
  const summary = useMemo(() => {
    return calculateLedgerSummary(transactions, snapshots, dailyProfitTarget);
  }, [transactions, snapshots, dailyProfitTarget]);

  // Compute bot strategy stats
  const botStats = useMemo(() => {
    return calculateBotStrategyStats(transactions);
  }, [transactions]);

  // Transaction mutation handlers
  const handleSaveTransaction = (
    txData: Omit<Transaction, 'id' | 'runningCapital' | 'loanBalance'>,
    editId?: string
  ) => {
    if (editId) {
      setRawTransactions((prev) =>
        prev.map((t) => (t.id === editId ? { ...txData, id: editId } : t))
      );
      showToast(`Updated transaction for ${txData.date}`, 'success');
      setEditingTx(null);
    } else {
      const newTx: Transaction = {
        ...txData,
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      };
      setRawTransactions((prev) => [...prev, newTx]);
      showToast(`Added new ${newTx.type} transaction for ${newTx.date}`, 'success');
    }
    setIsAddModalOpen(false);
  };

  const handleQuickAddTransaction = (
    txData: Omit<Transaction, 'id' | 'runningCapital' | 'loanBalance'>
  ) => {
    const newTx: Transaction = {
      ...txData,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    setRawTransactions((prev) => [...prev, newTx]);
    showToast(`Added ${newTx.type} for ${newTx.date}`, 'success');
  };

  const handleInlineUpdateTransaction = (id: string, updated: Partial<Transaction>) => {
    setRawTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updated } : t))
    );
    showToast('Updated transaction record inline', 'success');
  };

  const handleDeleteConfirmed = () => {
    if (!txToDelete) return;
    setRawTransactions((prev) => prev.filter((t) => t.id !== txToDelete.id));
    showToast(`Deleted ${txToDelete.type} entry (${txToDelete.date})`, 'info');
    setTxToDelete(null);
  };

  const handleResetSampleData = () => {
    setRawTransactions(SAMPLE_TRANSACTIONS);
    setResetConfirmOpen(false);
    showToast('Reset to 60-day historical sample trading dataset', 'info');
  };

  // CSV Import handler
  const handleImportCsv = (csvText: string) => {
    try {
      const lines = csvText.trim().split(/\r?\n/);
      if (lines.length < 2) {
        showToast('CSV is empty or lacks headers', 'error');
        return;
      }

      const newTxs: Transaction[] = [];
      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple CSV splitter handling quotes
        const match = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
        if (parts.length >= 3) {
          const date = parts[0] || new Date().toISOString().split('T')[0];
          const type = (parts[1] as any) || 'Trade PnL';
          const amount = parseFloat(parts[2]) || 0;
          const asset = parts[3] || 'USDT';
          const sourceDest = parts[4] || 'Exchange';
          const gasFee = parseFloat(parts[5]) || 0;
          const notes = parts[6] || '';
          const botId = notes.split(' - ')[0] || 'IMPORTED_BOT';

          newTxs.push({
            id: `imported-${Date.now()}-${i}`,
            date,
            type,
            amount,
            asset,
            sourceDest,
            gasFee,
            botId,
            notes,
          });
        }
      }

      if (newTxs.length > 0) {
        setRawTransactions((prev) => [...prev, ...newTxs]);
        showToast(`Successfully imported ${newTxs.length} transactions from CSV!`, 'success');
      } else {
        showToast('No valid transactions parsed from CSV', 'error');
      }
    } catch (err: any) {
      showToast(`CSV Import error: ${err.message}`, 'error');
    }
  };

  // Google Auth actions
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithGooglePopup();
      setUser(result.user);
      setAccessToken(result.token);
      showToast(`Signed in as ${result.user.email || 'Google User'}`, 'success');
    } catch (err: any) {
      showToast(`Google Sign-In error: ${err.message}`, 'error');
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await signOutGoogle();
      setUser(null);
      setAccessToken(null);
      showToast('Signed out of Google account', 'info');
    } catch (err: any) {
      showToast(`Sign-out error: ${err.message}`, 'error');
    }
  };

  // Google Sheets Actions
  const handleCreateSpreadsheet = async (title?: string) => {
    const token = accessToken || getCachedToken();
    if (!token) {
      showToast('Please sign in with Google first', 'error');
      return;
    }
    setIsSyncing(true);
    try {
      const result = await createCryptoBotSpreadsheet(
        token,
        title || 'Crypto Trading Bot Master Ledger (10-Year)',
        transactions,
        snapshots
      );
      setSheetMeta(result);
      showToast('Created 3-sheet workbook in Google Drive!', 'success');
    } catch (err: any) {
      showToast(`Failed to create spreadsheet: ${err.message}`, 'error');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnectExistingSheet = async (idOrUrl: string) => {
    let sheetId = idOrUrl;
    // Extract ID from URL if provided: /spreadsheets/d/([a-zA-Z0-9-_]+)
    const match = idOrUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      sheetId = match[1];
    }

    const meta: GoogleSheetMeta = {
      spreadsheetId: sheetId,
      title: 'Connected Google Sheet',
      url: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
      sheetNames: ['Transactions', 'Daily Snapshot', 'Dashboard'],
      lastSyncedAt: new Date().toISOString(),
    };
    setSheetMeta(meta);
    showToast(`Linked spreadsheet ID: ${sheetId}`, 'success');
  };

  const handlePushToSheet = async () => {
    if (!sheetMeta) {
      showToast('No spreadsheet linked yet', 'error');
      return;
    }
    const token = accessToken || getCachedToken();
    if (!token) {
      showToast('Please sign in with Google first', 'error');
      return;
    }

    setIsSyncing(true);
    try {
      await syncAllToSpreadsheet(token, sheetMeta.spreadsheetId, transactions, snapshots);
      setSheetMeta((prev) =>
        prev ? { ...prev, lastSyncedAt: new Date().toISOString() } : null
      );
      showToast('Successfully synchronized ledger to Google Sheets!', 'success');
    } catch (err: any) {
      showToast(`Push failed: ${err.message}`, 'error');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromSheet = async () => {
    if (!sheetMeta) {
      showToast('No spreadsheet linked yet', 'error');
      return;
    }
    const token = accessToken || getCachedToken();
    if (!token) {
      showToast('Please sign in with Google first', 'error');
      return;
    }

    setIsSyncing(true);
    try {
      const fetched = await fetchTransactionsFromSpreadsheet(token, sheetMeta.spreadsheetId);
      if (fetched.length > 0) {
        setRawTransactions(fetched);
        setSheetMeta((prev) =>
          prev ? { ...prev, lastSyncedAt: new Date().toISOString() } : null
        );
        showToast(`Pulled ${fetched.length} transactions from Google Sheets!`, 'success');
      } else {
        showToast('No transactions found in Google Sheet Transactions tab', 'info');
      }
    } catch (err: any) {
      showToast(`Pull failed: ${err.message}`, 'error');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    {
      id: 'farmland',
      label:
        selectedAccountId === 'firmly'
          ? '🏢 Firmly Daily Sheet'
          : selectedAccountId === 'gadget'
          ? '⚡ Gadget Daily Sheet'
          : '🌾 Farmland Daily Sheet',
      icon:
        selectedAccountId === 'firmly'
          ? Building2
          : selectedAccountId === 'gadget'
          ? Cpu
          : Sprout,
    },
    { id: 'transactions', label: 'Daily Ledger & Manual Entry', icon: TableProperties },
    { id: 'snapshots', label: 'Daily Snapshots (Sheet 2)', icon: Calendar },
    { id: 'sheets', label: 'Google Sheets Hub', icon: FileSpreadsheet },
    { id: 'formulas', label: 'Formulas & Architecture', icon: Calculator },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-semibold border ${
              toast.type === 'success'
                ? 'bg-emerald-950 text-emerald-200 border-emerald-500/50'
                : toast.type === 'error'
                ? 'bg-rose-950 text-rose-200 border-rose-500/50'
                : 'bg-slate-900 text-slate-200 border-slate-700'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            ) : (
              <Sparkles className="w-4 h-4 text-blue-400" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Top Application Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-md shadow-emerald-900/30">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white">
                  Crypto Bot Ledger
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  10-Year Foundation
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Master Transactions • Daily Returns • Gas Drag • Google Sheets Sync
              </p>
            </div>
          </div>

          {/* Quick Header Indicators & Actions */}
          <div className="flex items-center gap-3">
            {/* Account Switcher Dropdown in Top Header */}
            <div className="relative">
              <button
                id="header-account-selector-btn"
                onClick={() => setHeaderAccountDropdownOpen(!headerAccountDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs font-semibold text-white shadow-xs cursor-pointer transition-colors"
                title="Switch active trading account (Farmland, Firmly, Gadget)"
              >
                {selectedAccountId === 'firmly' ? (
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                ) : selectedAccountId === 'gadget' ? (
                  <Cpu className="w-3.5 h-3.5 text-purple-400" />
                ) : (
                  <Sprout className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span className="font-bold">
                  {selectedAccountId === 'firmly'
                    ? 'Firmly'
                    : selectedAccountId === 'gadget'
                    ? 'Gadget'
                    : 'Farmland'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${headerAccountDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {headerAccountDropdownOpen && (
                <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-56 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800/80">
                  <div className="p-2 bg-slate-900 text-[11px] font-semibold text-slate-400">
                    Switch Active Account
                  </div>
                  <div className="p-1 space-y-0.5">
                    {[
                      { id: 'farmland', name: 'Farmland', sub: 'Agricultural Yield Bot', icon: Sprout, color: 'text-emerald-400' },
                      { id: 'firmly', name: 'Firmly', sub: 'Firm Arbitrage', icon: Building2, color: 'text-blue-400' },
                      { id: 'gadget', name: 'Gadget', sub: 'Grid / Algorithmic Bot', icon: Cpu, color: 'text-purple-400' },
                    ].map((acc) => {
                      const Icon = acc.icon;
                      const isSelected = selectedAccountId === acc.id;
                      return (
                        <button
                          key={acc.id}
                          onClick={() => {
                            setSelectedAccountId(acc.id);
                            setHeaderAccountDropdownOpen(false);
                            setActiveTab('farmland');
                            showToast(`Switched account to ${acc.name}`, 'info');
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-slate-800 text-white font-bold'
                              : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className={`w-3.5 h-3.5 ${acc.color}`} />
                            <div>
                              <div>{acc.name}</div>
                              <div className="text-[10px] text-slate-500">{acc.sub}</div>
                            </div>
                          </div>
                          {isSelected && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Realtime KPI Pill */}
            <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
              <span className="text-slate-400">
                Cap: <strong className="text-white">${summary.currentCapital.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">
                Net PnL:{' '}
                <strong className={summary.cumulativePnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {summary.cumulativePnL >= 0 ? '+' : ''}${summary.cumulativePnL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </strong>
              </span>
            </div>

            {/* Google Account Pill or Sign In Button */}
            {!user ? (
              <button
                id="header-google-signin"
                onClick={handleGoogleSignIn}
                className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white text-slate-800 hover:bg-slate-100 transition-colors shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Link Google</span>
              </button>
            ) : (
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-slate-300 font-mono text-[11px] max-w-[120px] truncate" title={user.email || 'Google User'}>
                  {user.email || 'Google User'}
                </span>
              </div>
            )}

            {/* Quick Action: Record Event */}
            <button
              id="header-record-event-btn"
              onClick={() => {
                setEditingTx(null);
                setIsAddModalOpen(true);
              }}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Record Event</span>
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 text-slate-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <div className="hidden sm:block border-t border-slate-800/80 bg-slate-950/50 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center space-x-1 py-1.5 overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-emerald-400 font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-800 bg-slate-900 p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2.5 text-left ${
                    isActive ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              {!user ? (
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full py-2 text-center bg-white text-slate-800 rounded font-bold"
                >
                  Sign in with Google
                </button>
              ) : (
                <button
                  onClick={handleGoogleSignOut}
                  className="w-full py-2 text-center bg-slate-800 text-slate-300 rounded font-medium"
                >
                  Sign Out ({user.email})
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            summary={summary}
            snapshots={snapshots}
            botStats={botStats}
            selectedAccountId={selectedAccountId}
            onSelectAccount={setSelectedAccountId}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onOpenAddTx={() => {
              setEditingTx(null);
              setIsAddModalOpen(true);
            }}
          />
        )}

        {activeTab === 'farmland' && (
          <FarmlandSheetView
            onSyncToGoogleSheets={() => setActiveTab('sheets')}
            selectedAccountId={selectedAccountId}
            onSelectAccount={setSelectedAccountId}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsView
            transactions={transactions}
            onAddTransaction={() => {
              setEditingTx(null);
              setIsAddModalOpen(true);
            }}
            onQuickAddTransaction={handleQuickAddTransaction}
            onInlineUpdateTransaction={handleInlineUpdateTransaction}
            onEditTransaction={(tx) => {
              setEditingTx(tx);
              setIsAddModalOpen(true);
            }}
            onDeleteTransaction={(tx) => {
              setTxToDelete(tx);
            }}
            onImportCsv={handleImportCsv}
          />
        )}

        {activeTab === 'snapshots' && (
          <DailySnapshotView
            snapshots={snapshots}
            dailyProfitTarget={dailyProfitTarget}
            onUpdateDailyProfitTarget={setDailyProfitTarget}
          />
        )}

        {activeTab === 'sheets' && (
          <GoogleSheetsView
            user={user}
            accessToken={accessToken}
            sheetMeta={sheetMeta}
            transactions={transactions}
            snapshots={snapshots}
            onSignIn={handleGoogleSignIn}
            onSignOut={handleGoogleSignOut}
            onCreateSpreadsheet={handleCreateSpreadsheet}
            onConnectExistingSheet={handleConnectExistingSheet}
            onPushToSheet={handlePushToSheet}
            onPullFromSheet={handlePullFromSheet}
            isSyncing={isSyncing}
          />
        )}

        {activeTab === 'formulas' && <FormulaGuideView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Crypto Bot Ledger</span>
            <span>•</span>
            <span>10-Year Historical Data Foundation & Accounting Engine</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setResetConfirmOpen(true)}
              className="text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1"
              title="Reset data back to the sample 60-day historical trades"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Sample Data</span>
            </button>
            <span>•</span>
            <span>Google Sheets & Drive Workspace Enabled</span>
          </div>
        </div>
      </footer>

      {/* Add / Edit Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        editTransaction={editingTx}
        currentCapital={summary.currentCapital}
        currentLoanBalance={summary.currentLoanBalance}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingTx(null);
        }}
        onSave={handleSaveTransaction}
      />

      {/* Delete Transaction Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!txToDelete}
        title="Delete Transaction Record?"
        message={`Are you sure you want to delete this ${txToDelete?.type} event from ${txToDelete?.date} (${txToDelete?.amount} ${txToDelete?.asset})? Running capital and snapshot metrics will be recalculated automatically.`}
        confirmLabel="Delete Record"
        isDestructive={true}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setTxToDelete(null)}
      />

      {/* Reset Sample Data Confirmation Modal */}
      <ConfirmationModal
        isOpen={resetConfirmOpen}
        title="Restore 60-Day Sample Dataset?"
        message="This will replace current local records with the 60-day sample dataset showcasing multiple bots, loans, withdrawals, deposits, and gas drag calculations. Any un-synced custom edits will be lost."
        confirmLabel="Restore Sample Data"
        isDestructive={false}
        onConfirm={handleResetSampleData}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </div>
  );
}
