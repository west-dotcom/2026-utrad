import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  Upload,
  PlusCircle,
  Edit2,
  Trash2,
  ArrowUpDown,
  FileSpreadsheet,
  Check,
  X,
  Calendar,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Activity,
  Tag,
} from 'lucide-react';
import { Transaction, TransactionType, MarketCondition } from '../types';

export const MARKET_CONDITIONS_DATA: {
  value: MarketCondition;
  label: string;
  badge: string;
  icon: string;
}[] = [
  { value: 'Bullish', label: 'Bullish (Buying)', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: '📈' },
  { value: 'Bearish', label: 'Bearish (Selling)', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40', icon: '📉' },
  { value: 'Sideways', label: 'Sideways (Grid/Range)', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40', icon: '↔️' },
  { value: 'Volatile', label: 'Volatile (Spikes/Choppy)', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40', icon: '⚡' },
];

export function getConditionBadge(condition?: MarketCondition, notes?: string, amount?: number) {
  let cond = condition;
  if (!cond) {
    const lower = (notes || '').toLowerCase();
    if (lower.includes('bull') || lower.includes('buy') || lower.includes('uptrend')) cond = 'Bullish';
    else if (lower.includes('bear') || lower.includes('short') || lower.includes('downtrend')) cond = 'Bearish';
    else if (lower.includes('side') || lower.includes('range') || lower.includes('grid')) cond = 'Sideways';
    else if (lower.includes('volat') || lower.includes('spike') || lower.includes('breakout')) cond = 'Volatile';
    else if (amount && amount > 0) cond = 'Bullish';
    else if (amount && amount < 0) cond = 'Bearish';
    else cond = 'Sideways';
  }

  const found = MARKET_CONDITIONS_DATA.find((c) => c.value === cond);
  return found || {
    value: cond || 'Sideways',
    label: cond || 'Sideways',
    badge: 'bg-slate-800 text-slate-300 border-slate-700',
    icon: '📊',
  };
}

interface TransactionsViewProps {
  transactions: Transaction[];
  onAddTransaction: () => void;
  onQuickAddTransaction?: (tx: Omit<Transaction, 'id' | 'runningCapital' | 'loanBalance'>) => void;
  onInlineUpdateTransaction?: (id: string, updated: Partial<Transaction>) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (tx: Transaction) => void;
  onImportCsv: (csvContent: string) => void;
  onDeleteAllInterest?: () => void;
  onClearAllHistory?: () => void;
}

const TRANSACTION_TYPES: TransactionType[] = [
  'Trade PnL',
  'Deposit',
  'Withdrawal',
  'Loan In',
  'Loan Out',
  'Gas',
  'Interest',
];

export function TransactionsView({
  transactions,
  onAddTransaction,
  onQuickAddTransaction,
  onInlineUpdateTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onImportCsv,
  onDeleteAllInterest,
  onClearAllHistory,
}: TransactionsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [assetFilter, setAssetFilter] = useState<string>('ALL');
  const [conditionFilter, setConditionFilter] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Inline Quick Daily Entry State
  const [quickDate, setQuickDate] = useState(new Date().toISOString().split('T')[0]);
  const [quickType, setQuickType] = useState<TransactionType>('Trade PnL');
  const [quickAmount, setQuickAmount] = useState<string>('350');
  const [quickAsset, setQuickAsset] = useState<string>('USDT');
  const [quickCondition, setQuickCondition] = useState<MarketCondition>('Bullish');
  const [quickNotes, setQuickNotes] = useState<string>('');

  // Shift Quick Date helper (+1 day, -1 day, etc.)
  const shiftQuickDate = (days: number) => {
    try {
      const parts = quickDate.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const dateObj = new Date(year, month, day);
        dateObj.setDate(dateObj.getDate() + days);
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        setQuickDate(`${y}-${m}-${d}`);
        return;
      }
      const fallback = new Date();
      fallback.setDate(fallback.getDate() + days);
      setQuickDate(fallback.toISOString().split('T')[0]);
    } catch {
      setQuickDate(new Date().toISOString().split('T')[0]);
    }
  };

  // Inline Row Editing State
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [rowEditDate, setRowEditDate] = useState<string>('');
  const [rowEditType, setRowEditType] = useState<TransactionType>('Trade PnL');
  const [rowEditAmount, setRowEditAmount] = useState<string>('');
  const [rowEditAsset, setRowEditAsset] = useState<string>('USDT');
  const [rowEditCondition, setRowEditCondition] = useState<MarketCondition>('Bullish');
  const [rowEditNotes, setRowEditNotes] = useState<string>('');

  // Shift row edit date (+1d, -1d)
  const shiftRowEditDate = (days: number) => {
    try {
      const parts = rowEditDate.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const dateObj = new Date(year, month, day);
        dateObj.setDate(dateObj.getDate() + days);
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        setRowEditDate(`${y}-${m}-${d}`);
        return;
      }
      const fallback = new Date();
      fallback.setDate(fallback.getDate() + days);
      setRowEditDate(fallback.toISOString().split('T')[0]);
    } catch {
      setRowEditDate(new Date().toISOString().split('T')[0]);
    }
  };

  // Unique Assets
  const assetOptions = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => t.asset && set.add(t.asset));
    return Array.from(set).sort();
  }, [transactions]);

  // Filtered and sorted transactions
  const filtered = useMemo(() => {
    return transactions
      .filter((tx) => {
        if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;
        if (assetFilter !== 'ALL' && tx.asset !== assetFilter) return false;
        if (conditionFilter !== 'ALL') {
          const badge = getConditionBadge(tx.marketCondition, tx.notes, tx.amount);
          if (badge.value !== conditionFilter) return false;
        }
        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          const matchDate = tx.date.toLowerCase().includes(q);
          const matchType = tx.type.toLowerCase().includes(q);
          const matchAmount = String(tx.amount).includes(q);
          const matchAsset = (tx.asset || '').toLowerCase().includes(q);
          const matchNotes = (tx.notes || '').toLowerCase().includes(q);
          const matchCond = (tx.marketCondition || '').toLowerCase().includes(q);
          if (!matchDate && !matchType && !matchAmount && !matchAsset && !matchNotes && !matchCond) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        return sortOrder === 'desc'
          ? b.date.localeCompare(a.date)
          : a.date.localeCompare(b.date);
      });
  }, [transactions, typeFilter, assetFilter, conditionFilter, searchTerm, sortOrder]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Summary stats based on the filtered set of transactions
  const { totalInflow, totalOutflow, netFlow, inflowCount, outflowCount } = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    let inCount = 0;
    let outCount = 0;

    for (const tx of filtered) {
      const amt = Number(tx.amount) || 0;
      const gas = Number(tx.gasFee) || 0;

      switch (tx.type) {
        case 'Deposit':
        case 'Loan In':
          inflow += Math.abs(amt);
          inCount++;
          break;
        case 'Withdrawal':
        case 'Loan Out':
        case 'Gas':
        case 'Interest':
          outflow += Math.abs(amt);
          outCount++;
          break;
        case 'Trade PnL':
          if (amt >= 0) {
            inflow += amt;
            inCount++;
          } else {
            outflow += Math.abs(amt);
            outCount++;
          }
          break;
        default:
          if (amt >= 0) {
            inflow += amt;
            inCount++;
          } else {
            outflow += Math.abs(amt);
            outCount++;
          }
      }

      if (gas > 0) {
        outflow += gas;
      }
    }

    return {
      totalInflow: inflow,
      totalOutflow: outflow,
      netFlow: inflow - outflow,
      inflowCount: inCount,
      outflowCount: outCount,
    };
  }, [filtered]);

  // Handle Quick Add Submit
  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(quickAmount) || 0;

    if (onQuickAddTransaction) {
      onQuickAddTransaction({
        date: quickDate,
        type: quickType,
        amount: amountVal,
        asset: quickAsset.toUpperCase(),
        gasFee: 0,
        marketCondition: quickCondition,
        notes: quickNotes.trim(),
      });
      // Automatically advance date to next day for rapid day-by-day logging
      shiftQuickDate(1);
      setQuickNotes('');
    }
  };

  // Start Inline Editing for a Row
  const startInlineEdit = (tx: Transaction) => {
    setEditingRowId(tx.id);
    setRowEditDate(tx.date);
    setRowEditType(tx.type);
    setRowEditAmount(String(tx.amount));
    setRowEditAsset(tx.asset);
    setRowEditCondition(tx.marketCondition || 'Bullish');
    setRowEditNotes(tx.notes || '');
  };

  // Save Inline Row Edit
  const saveInlineEdit = (id: string) => {
    const parsedAmt = parseFloat(rowEditAmount) || 0;

    if (onInlineUpdateTransaction) {
      onInlineUpdateTransaction(id, {
        date: rowEditDate,
        type: rowEditType,
        amount: parsedAmt,
        asset: rowEditAsset.toUpperCase(),
        gasFee: 0,
        marketCondition: rowEditCondition,
        notes: rowEditNotes.trim(),
      });
    }
    setEditingRowId(null);
  };

  // Cancel Inline Row Edit
  const cancelInlineEdit = () => {
    setEditingRowId(null);
  };

  // Export current transaction ledger as formatted CSV file
  const handleExportCsv = () => {
    if (!transactions || transactions.length === 0) {
      alert('No transactions available to export.');
      return;
    }

    const headers = [
      'Date',
      'Type',
      'Amount',
      'Asset',
      'Market Condition',
      'Running Capital',
      'Loan Balance',
      'Gas Fee',
      'Source / Dest',
      'Bot ID',
      'Notes',
    ];

    // Export current filtered dataset if filters applied, else all transactions
    const exportDataset = filtered.length > 0 ? filtered : transactions;

    const csvRows = exportDataset.map((tx) => [
      `"${tx.date || ''}"`,
      `"${tx.type || ''}"`,
      tx.amount !== undefined ? tx.amount.toFixed(2) : '0.00',
      `"${tx.asset || 'USDT'}"`,
      `"${tx.marketCondition || ''}"`,
      tx.runningCapital !== undefined && tx.runningCapital !== null ? tx.runningCapital.toFixed(2) : '',
      tx.loanBalance !== undefined && tx.loanBalance !== null ? tx.loanBalance.toFixed(2) : '',
      tx.gasFee !== undefined && tx.gasFee !== null ? tx.gasFee.toFixed(2) : '0.00',
      `"${(tx.sourceDest || '').replace(/"/g, '""')}"`,
      `"${(tx.botId || '').replace(/"/g, '""')}"`,
      `"${(tx.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...csvRows.map((e) => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `transactions_ledger_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // CSV File Upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        onImportCsv(text);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Badge styling for transaction types
  const getTypeBadge = (type: TransactionType) => {
    switch (type) {
      case 'Trade PnL':
        return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      case 'Deposit':
        return 'bg-blue-500/15 text-blue-400 border border-blue-500/30';
      case 'Withdrawal':
        return 'bg-purple-500/15 text-purple-400 border border-purple-500/30';
      case 'Loan In':
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
      case 'Loan Out':
        return 'bg-teal-500/15 text-teal-400 border border-teal-500/30';
      case 'Gas':
        return 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
      case 'Interest':
        return 'bg-orange-500/15 text-orange-400 border border-orange-500/30';
      default:
        return 'bg-slate-800 text-slate-300';
    }
  };

  return (
    <div id="transactions-view" className="space-y-6">
      {/* Header with Title and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Manual Daily Ledger
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {transactions.length} records logged
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mt-1">
            Daily Transactions & Balances
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Enter and edit daily trading records directly. Running capital and loan balances update automatically.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <label className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            id="transactions-export-csv-btn"
            onClick={handleExportCsv}
            className="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg transition-colors border border-slate-700 flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Download formatted CSV file of your transaction ledger"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export to CSV</span>
          </button>

          {onDeleteAllInterest && (
            <button
              id="transactions-delete-interest-btn"
              onClick={() => {
                if (window.confirm("Delete all Interest events from this ledger?")) {
                  onDeleteAllInterest();
                }
              }}
              className="px-3 py-2 text-xs font-semibold text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 rounded-lg transition-colors border border-rose-500/30 flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Delete all loan interest events from ledger"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Delete Interest Events</span>
            </button>
          )}

          {onClearAllHistory && (
            <button
              id="transactions-clear-history-btn"
              onClick={() => {
                if (
                  window.confirm(
                    "Clear all historical transactions? You can add clean daily return records manually."
                  )
                ) {
                  onClearAllHistory();
                }
              }}
              className="px-3 py-2 text-xs font-semibold text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 rounded-lg transition-colors border border-amber-500/30 flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Clear all past history to start fresh with manual daily return entries"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Clear History (Start Fresh)</span>
            </button>
          )}

          <button
            onClick={onAddTransaction}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm flex items-center gap-1.5 ml-auto sm:ml-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Modal Entry</span>
          </button>
        </div>
      </div>

      {/* QUICK DAILY MANUAL ENTRY BAR */}
      <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-2xl p-4 shadow-md bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Quick Daily Manual Entry
            </h3>
            <span className="text-[11px] text-slate-400">
              (Enter daily numbers directly into the ledger)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setQuickDate(new Date().toISOString().split('T')[0])}
            className="text-[11px] text-emerald-400 hover:underline"
          >
            Set to Today
          </button>
        </div>

        <form onSubmit={handleQuickAddSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 items-end">
          {/* Date */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-300">
              <span className="flex items-center gap-1 font-semibold text-slate-200">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Date (YYYY-MM-DD)</span>
              </span>
              <div className="flex items-center gap-1 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => shiftQuickDate(-1)}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                  title="Previous Day (-1 Day)"
                >
                  ❮ -1d
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(new Date().toISOString().split('T')[0])}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                  title="Reset date to today"
                >
                  Today
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                id="quick-date-input"
                type="date"
                required
                value={quickDate}
                onChange={(e) => setQuickDate(e.target.value)}
                className="w-full bg-slate-950 border-2 border-emerald-500/50 hover:border-emerald-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono font-bold transition-all shadow-inner focus:outline-hidden"
              />
              <button
                type="button"
                id="quick-next-date-btn"
                onClick={() => shiftQuickDate(1)}
                className="shrink-0 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs font-mono flex items-center gap-1 shadow-md hover:shadow-emerald-950/40 border border-emerald-400/40 transition-all cursor-pointer active:scale-95 group"
                title="Advance to Next Date (+1 Day)"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">
              Event Type
            </label>
            <select
              value={quickType}
              onChange={(e) => setQuickType(e.target.value as TransactionType)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-emerald-500"
            >
              {TRANSACTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1 flex items-center justify-between">
              <span>Amount</span>
              <span className="text-[10px] text-slate-500">
                {quickType === 'Trade PnL' ? '+ / -' : '$'}
              </span>
            </label>
            <input
              type="number"
              step="any"
              required
              placeholder={quickType === 'Trade PnL' ? 'e.g. 450 or -150' : 'e.g. 5000'}
              value={quickAmount}
              onChange={(e) => setQuickAmount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Asset */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">
              Asset
            </label>
            <input
              type="text"
              required
              value={quickAsset}
              onChange={(e) => setQuickAsset(e.target.value.toUpperCase())}
              placeholder="USDT"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Market Condition */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1 flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span>Condition</span>
            </label>
            <select
              value={quickCondition}
              onChange={(e) => setQuickCondition(e.target.value as MarketCondition)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium focus:outline-hidden focus:border-emerald-500"
            >
              {MARKET_CONDITIONS_DATA.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Submit Button */}
          <div>
            <button
              id="quick-add-submit-btn"
              type="submit"
              className="w-full px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1.5 h-[34px]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Add Entry</span>
            </button>
          </div>
        </form>

        {/* Quick Note Memo with Market Trading Condition Chips */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 uppercase tracking-wider">
              <Tag className="w-3.5 h-3.5 text-emerald-400" />
              <span>Market Condition Memo:</span>
            </span>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => {
                  setQuickCondition('Sideways');
                  setQuickNotes('Sideways consolidation range');
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono border font-semibold transition-all cursor-pointer ${
                  quickCondition === 'Sideways'
                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/60 shadow-xs'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                ↔️ Sideways
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickCondition('Bullish');
                  setQuickNotes('Buying trend / dip execution');
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono border font-semibold transition-all cursor-pointer ${
                  quickCondition === 'Bullish' && quickNotes.includes('Buying')
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 shadow-xs'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                🟢 Buying
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickCondition('Bearish');
                  setQuickNotes('Selling pressure / short profit');
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono border font-semibold transition-all cursor-pointer ${
                  quickCondition === 'Bearish' && quickNotes.includes('Selling')
                    ? 'bg-rose-950/80 text-rose-300 border-rose-500/60 shadow-xs'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                🔴 Selling
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickCondition('Bullish');
                  setQuickNotes('Bullish momentum breakout');
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono border font-semibold transition-all cursor-pointer ${
                  quickCondition === 'Bullish' && quickNotes.includes('breakout')
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 shadow-xs'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                📈 Bullish
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickCondition('Bearish');
                  setQuickNotes('Bearish drawdown hedge');
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono border font-semibold transition-all cursor-pointer ${
                  quickCondition === 'Bearish' && quickNotes.includes('hedge')
                    ? 'bg-rose-950/80 text-rose-300 border-rose-500/60 shadow-xs'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                📉 Bearish
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickCondition('Volatile');
                  setQuickNotes('High volatility whipsaw cycle');
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono border font-semibold transition-all cursor-pointer ${
                  quickCondition === 'Volatile'
                    ? 'bg-purple-950/80 text-purple-300 border-purple-500/60 shadow-xs'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                ⚡ Volatile
              </button>
            </div>
          </div>

          <div className="flex-1 max-w-sm flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Note memo (e.g. Sideways range, Buying dip)..."
              value={quickNotes}
              onChange={(e) => setQuickNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search date, note, type..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-emerald-500"
            >
              <option value="ALL">All Event Types</option>
              {TRANSACTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Asset Filter */}
          <div>
            <select
              value={assetFilter}
              onChange={(e) => {
                setAssetFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-emerald-500"
            >
              <option value="ALL">All Assets</option>
              {assetOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Market Condition Filter */}
          <div>
            <select
              value={conditionFilter}
              onChange={(e) => {
                setConditionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-emerald-500"
            >
              <option value="ALL">All Market Conditions</option>
              {MARKET_CONDITIONS_DATA.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Order */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="w-full px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-950 hover:bg-slate-800 rounded-lg transition-colors border border-slate-700 flex items-center justify-center gap-1.5"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Date: {sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* FILTERED SUMMARY STATS ROW */}
      <div
        id="transactions-filtered-stats-row"
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        {/* Total Inflow */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Inflow</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 tracking-tight">
            +${totalInflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono pt-1 border-t border-slate-800/80">
            <span>{inflowCount} {inflowCount === 1 ? 'event' : 'events'}</span>
            <span className="text-emerald-400/90 font-medium">Deposits, profits & loans</span>
          </div>
        </div>

        {/* Total Outflow */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Outflow</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-rose-400 tracking-tight">
            -${totalOutflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono pt-1 border-t border-slate-800/80">
            <span>{outflowCount} {outflowCount === 1 ? 'event' : 'events'}</span>
            <span className="text-rose-400/90 font-medium">Withdrawals, losses & fees</span>
          </div>
        </div>

        {/* Net Flow */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Net Flow</span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                netFlow >= 0
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
              }`}
            >
              {netFlow >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div
            className={`text-xl font-bold font-mono tracking-tight ${
              netFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {netFlow >= 0 ? '+' : '-'}$
            {Math.abs(netFlow).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono pt-1 border-t border-slate-800/80">
            <span>Across {filtered.length} filtered {filtered.length === 1 ? 'record' : 'records'}</span>
            <span className={netFlow >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
              {netFlow >= 0 ? 'Net Capital Injected' : 'Net Capital Reduced'}
            </span>
          </div>
        </div>
      </div>

      {/* Table Summary & Export Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-1 text-xs">
        <span className="text-slate-400 font-mono">
          Showing <strong className="text-white">{filtered.length}</strong> of {transactions.length} total entries
          {searchTerm && <span className="text-emerald-400 ml-1.5">(Filtered by "{searchTerm}")</span>}
        </span>
        <button
          id="transactions-table-export-csv-btn"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 hover:text-white rounded-lg border border-slate-700 transition-colors shadow-xs cursor-pointer"
          title="Download current filtered transactions as formatted CSV"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Export to CSV ({filtered.length})</span>
        </button>
      </div>

      {/* Transactions Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3 text-right">Amount</th>
                <th className="py-3 px-3">Asset</th>
                <th className="py-3 px-4 text-right">Running Capital</th>
                <th className="py-3 px-4 text-right">Loan Balance</th>
                <th className="py-3 px-4 text-center">Actions (Inline / Edit)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                    No transactions found matching criteria.
                  </td>
                </tr>
              ) : (
                paginated.map((tx) => {
                  const isEditing = editingRowId === tx.id;
                  const isPnL = tx.type === 'Trade PnL';
                  const isPositivePnL = isPnL && tx.amount >= 0;
                  const isNegativePnL = isPnL && tx.amount < 0;

                  if (isEditing) {
                    // INLINE EDITING ROW
                    return (
                      <tr key={tx.id} className="bg-emerald-950/20 border-y-2 border-emerald-500/50">
                        {/* Edit Date */}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1">
                            <input
                              type="date"
                              value={rowEditDate}
                              onChange={(e) => setRowEditDate(e.target.value)}
                              className="w-full bg-slate-950 border border-emerald-500 rounded px-2 py-1 text-xs text-white font-mono focus:outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => shiftRowEditDate(-1)}
                              className="px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[10px] font-mono font-bold transition-colors cursor-pointer shrink-0"
                              title="Previous Day (-1d)"
                            >
                              -1d
                            </button>
                            <button
                              type="button"
                              onClick={() => shiftRowEditDate(1)}
                              className="px-2 py-1 rounded bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/40 text-[10px] font-mono font-bold transition-all shadow-xs cursor-pointer shrink-0 flex items-center gap-0.5 active:scale-95"
                              title="Advance to Next Day (+1d)"
                            >
                              <span>Next</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        {/* Edit Type */}
                        <td className="py-2 px-2">
                          <select
                            value={rowEditType}
                            onChange={(e) => setRowEditType(e.target.value as TransactionType)}
                            className="w-full bg-slate-950 border border-emerald-500 rounded px-1.5 py-1 text-xs text-white focus:outline-hidden"
                          >
                            {TRANSACTION_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </td>
                        {/* Edit Amount */}
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            step="any"
                            value={rowEditAmount}
                            onChange={(e) => setRowEditAmount(e.target.value)}
                            className="w-24 ml-auto bg-slate-950 border border-emerald-500 rounded px-2 py-1 text-xs text-white font-mono text-right focus:outline-hidden"
                          />
                        </td>
                        {/* Edit Asset */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={rowEditAsset}
                            onChange={(e) => setRowEditAsset(e.target.value.toUpperCase())}
                            className="w-16 bg-slate-950 border border-emerald-500 rounded px-1.5 py-1 text-xs text-white font-mono focus:outline-hidden"
                          />
                        </td>
                        {/* Running Capital (calculated on save) */}
                        <td className="py-2 px-4 text-right text-slate-400 font-sans italic text-[11px]">
                          auto-updates
                        </td>
                        {/* Loan Balance (calculated on save) */}
                        <td className="py-2 px-4 text-right text-slate-400 font-sans italic text-[11px]">
                          auto-updates
                        </td>
                        {/* Action buttons */}
                        <td className="py-2 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => saveInlineEdit(tx.id)}
                              title="Save inline changes"
                              className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={cancelInlineEdit}
                              title="Cancel editing"
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // STANDARD ROW VIEW
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Date */}
                      <td className="py-3 px-4 text-slate-200 whitespace-nowrap font-sans font-medium">
                        {tx.date}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-sans font-medium ${getTypeBadge(
                            tx.type
                          )}`}
                        >
                          {tx.type}
                        </span>
                      </td>

                      {/* Amount */}
                      <td
                        className={`py-3 px-3 text-right font-semibold whitespace-nowrap ${
                          isPositivePnL
                            ? 'text-emerald-400'
                            : isNegativePnL
                            ? 'text-rose-400'
                            : tx.type === 'Withdrawal' || tx.type === 'Loan Out'
                            ? 'text-purple-400'
                            : 'text-slate-200'
                        }`}
                      >
                        {isPositivePnL ? '+' : ''}
                        {tx.amount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      {/* Asset */}
                      <td className="py-3 px-3 text-slate-400 font-sans font-medium">
                        {tx.asset}
                      </td>

                      {/* Running Capital */}
                      <td className="py-3 px-4 text-right font-bold text-white whitespace-nowrap">
                        ${(tx.runningCapital ?? 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      {/* Loan Balance */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {(tx.loanBalance ?? 0) > 0 ? (
                          <span className="text-amber-400 font-semibold">
                            ${(tx.loanBalance ?? 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-600">$0.00</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => startInlineEdit(tx)}
                            title="Edit directly in table"
                            className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditTransaction(tx)}
                            title="Edit in modal"
                            className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 hover:text-white hover:bg-slate-700 font-sans transition-colors"
                          >
                            Modal
                          </button>
                          <button
                            onClick={() => onDeleteTransaction(tx)}
                            title="Delete transaction"
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-950/60 text-xs text-slate-400">
          <div>
            Showing {(page - 1) * pageSize + 1} to{' '}
            {Math.min(page * pageSize, filtered.length)} of {filtered.length}{' '}
            transactions
          </div>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700"
            >
              Previous
            </button>
            <span className="px-2 font-mono">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
