import React, { useState } from 'react';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  CheckCircle,
  AlertCircle,
  FolderPlus,
  Link2,
  Table,
  Sparkles,
  Shield,
  Layers,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { GoogleSheetMeta, Transaction, DailySnapshot } from '../types';
import { ConfirmationModal } from './ConfirmationModal';

interface GoogleSheetsViewProps {
  user: User | null;
  accessToken: string | null;
  sheetMeta: GoogleSheetMeta | null;
  transactions: Transaction[];
  snapshots: DailySnapshot[];
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onCreateSpreadsheet: (title?: string) => Promise<void>;
  onConnectExistingSheet: (idOrUrl: string) => Promise<void>;
  onPushToSheet: () => Promise<void>;
  onPullFromSheet: () => Promise<void>;
  isSyncing: boolean;
}

export function GoogleSheetsView({
  user,
  accessToken,
  sheetMeta,
  transactions,
  snapshots,
  onSignIn,
  onSignOut,
  onCreateSpreadsheet,
  onConnectExistingSheet,
  onPushToSheet,
  onPullFromSheet,
  isSyncing,
}: GoogleSheetsViewProps) {
  const [customTitle, setCustomTitle] = useState('Crypto Trading Bot Master Ledger (10-Year)');
  const [existingInput, setExistingInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Confirmation dialogs
  const [confirmPushOpen, setConfirmPushOpen] = useState(false);
  const [confirmPullOpen, setConfirmPullOpen] = useState(false);

  const handleCreate = async () => {
    setStatusMessage(null);
    try {
      await onCreateSpreadsheet(customTitle);
      setStatusMessage({ text: 'Spreadsheet created and synced successfully in Google Drive!', type: 'success' });
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to create spreadsheet', type: 'error' });
    }
  };

  const handleConnectExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingInput.trim()) return;
    setStatusMessage(null);
    try {
      await onConnectExistingSheet(existingInput.trim());
      setStatusMessage({ text: 'Successfully linked existing Google Sheet!', type: 'success' });
      setExistingInput('');
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to link spreadsheet', type: 'error' });
    }
  };

  const handlePushConfirmed = async () => {
    setConfirmPushOpen(false);
    setStatusMessage(null);
    try {
      await onPushToSheet();
      setStatusMessage({ text: 'Local ledger records successfully written to Google Sheets!', type: 'success' });
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to push records', type: 'error' });
    }
  };

  const handlePullConfirmed = async () => {
    setConfirmPullOpen(false);
    setStatusMessage(null);
    try {
      await onPullFromSheet();
      setStatusMessage({ text: 'Transactions pulled from Google Sheets into local ledger!', type: 'success' });
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to pull records', type: 'error' });
    }
  };

  return (
    <div id="google-sheets-view" className="space-y-6">
      {/* Status banner if any */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-medium border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Auth Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Google Sheets 10-Year Integration Hub
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {user ? `Connected as ${user.email || user.displayName || 'Authorized User'}` : 'Connect your Google account to auto-generate and sync your 3-sheet trading ledger.'}
              </p>
            </div>
          </div>

          <div>
            {!user ? (
              <button
                id="sheets-google-signin-btn"
                onClick={onSignIn}
                className="gsi-material-button inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-white text-slate-800 text-xs font-semibold hover:bg-slate-100 transition-colors shadow-sm cursor-pointer"
              >
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <span>Sign in with Google</span>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active Google Session
                </span>
                <button
                  onClick={onSignOut}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Connection & Sync Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Create New or Connect Existing */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-emerald-400" />
              1. Provision Master 3-Sheet Workbook
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Creates a Google Sheet directly in your Google Drive with the 3 tabs requested for 10-year durability:
              <strong> Transactions</strong>, <strong>Daily Snapshot</strong>, and <strong>Dashboard</strong>.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Spreadsheet Title
              </label>
              <input
                type="text"
                disabled={!user || isSyncing}
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500 disabled:opacity-50"
              />
            </div>

            <button
              id="create-sheets-btn"
              disabled={!user || isSyncing}
              onClick={handleCreate}
              className="w-full py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Provisioning Spreadsheet...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Create 3-Sheet Workbook in Google Drive
                </>
              )}
            </button>
            {!user && (
              <p className="text-[11px] text-amber-400/90 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Sign in with Google above to create or sync your Google Sheet.
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" />
              Or Link Existing Google Spreadsheet
            </h4>
            <form onSubmit={handleConnectExisting} className="flex gap-2">
              <input
                type="text"
                disabled={!user || isSyncing}
                placeholder="Paste Spreadsheet ID or full Google Sheets URL"
                value={existingInput}
                onChange={(e) => setExistingInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-emerald-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!user || isSyncing || !existingInput.trim()}
                className="px-4 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg transition-colors border border-slate-700"
              >
                Connect
              </button>
            </form>
          </div>
        </div>

        {/* Right: Connected Status & 2-Way Sync Controls */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-400" />
                2. Active Spreadsheet & Sync
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Perform verified updates between this application and your Google Sheets cloud file.
              </p>
            </div>
            {sheetMeta && (
              <a
                id="open-google-sheets-link"
                href={sheetMeta.url}
                target="_blank"
                rel="noreferrer noopener"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-1.5 transition-colors"
              >
                <span>Open in Sheets</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {sheetMeta ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Spreadsheet Name:</span>
                  <span className="text-xs font-bold text-white font-mono">{sheetMeta.title}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Google Sheet ID:</span>
                  <span className="text-[11px] text-slate-400 font-mono truncate max-w-[200px]" title={sheetMeta.spreadsheetId}>
                    {sheetMeta.spreadsheetId}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Tabs Synced:</span>
                  <span className="text-[11px] font-mono text-emerald-400">
                    Transactions, Daily Snapshot, Dashboard
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                  <span className="text-xs text-slate-400">Last Synced:</span>
                  <span className="text-xs font-mono text-slate-200">
                    {sheetMeta.lastSyncedAt ? new Date(sheetMeta.lastSyncedAt).toLocaleString() : 'Not yet synced'}
                  </span>
                </div>
              </div>

              {/* Sync Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  id="push-to-sheet-btn"
                  disabled={!user || isSyncing}
                  onClick={() => setConfirmPushOpen(true)}
                  className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-colors group disabled:opacity-50"
                >
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1">
                    <UploadCloud className="w-4 h-4" />
                    Push to Sheets
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Overwrites the 3 sheets with your current {transactions.length} transactions, snapshots, and KPI formulas.
                  </p>
                </button>

                <button
                  id="pull-from-sheet-btn"
                  disabled={!user || isSyncing}
                  onClick={() => setConfirmPullOpen(true)}
                  className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-colors group disabled:opacity-50"
                >
                  <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs mb-1">
                    <DownloadCloud className="w-4 h-4" />
                    Pull from Sheets
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Imports rows from the Google Sheet Transactions tab directly into this app's ledger.
                  </p>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800/60 text-slate-400 space-y-2">
              <FileSpreadsheet className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs font-medium">No Google Spreadsheet linked yet.</p>
              <p className="text-[11px] text-slate-500">
                Use the provision button on the left to create your 3-sheet trading bot ledger in one click.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Visual Blueprint of the 3 Sheets */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Table className="w-5 h-5 text-emerald-400" />
          The 3-Sheet Ledger Architecture (Specification Mapping)
        </h3>
        <p className="text-xs text-slate-400">
          How data and formulas are organized inside your Google Spreadsheet:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Sheet 1 Card */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-emerald-400">Sheet 1: Transactions</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">Raw Ledger</span>
            </div>
            <p className="text-[11px] text-slate-300">
              The single source of truth. Every movement of money or value is logged here.
            </p>
            <div className="font-mono text-[10px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800/80 space-y-1">
              <div>• Date (YYYY-MM-DD)</div>
              <div>• Type (Trade PnL, Deposit, Loan...)</div>
              <div>• Amount & Asset (e.g. USDT)</div>
              <div>• Gas / Fees</div>
              <div>• Running Capital & Loan Balance</div>
            </div>
          </div>

          {/* Sheet 2 Card */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-blue-400">Sheet 2: Daily Snapshot</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">Aggregated</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Aggregated daily records calculating true return without deposit/withdrawal distortion.
            </p>
            <div className="font-mono text-[10px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800/80 space-y-1">
              <div>• Start Capital & End Capital</div>
              <div>• Net Inflows (Deposits - Withdrawals)</div>
              <div>• Realized PnL & Gas Totals</div>
              <div>• Daily Return % Calculation</div>
              <div>• EOD Loan Balance & Cumulative PnL</div>
            </div>
          </div>

          {/* Sheet 3 Card */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-purple-400">Sheet 3: Dashboard</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">Formulas</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Executive business metrics calculated dynamically via Google Sheets formulas.
            </p>
            <div className="font-mono text-[10px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800/80 space-y-1">
              <div>• =INDEX(Transactions!H:H, ...)</div>
              <div>• =SUMIF(Transactions!B:B, ...)</div>
              <div>• =AVERAGE('Daily Snapshot'!H:H)</div>
              <div>• Loan vs Capital Ratio</div>
              <div>• Total Gas as % of Profit</div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modals for Destructive/Mutating Operations */}
      <ConfirmationModal
        isOpen={confirmPushOpen}
        title="Sync Ledger to Google Sheets?"
        message={`This will overwrite the contents of the "Transactions", "Daily Snapshot", and "Dashboard" sheets in "${sheetMeta?.title || 'your Google Sheet'}" with ${transactions.length} records. Are you sure you want to proceed?`}
        confirmLabel="Push to Google Sheets"
        onConfirm={handlePushConfirmed}
        onCancel={() => setConfirmPushOpen(false)}
      />

      <ConfirmationModal
        isOpen={confirmPullOpen}
        title="Pull Transactions from Google Sheets?"
        message={`This will read transaction rows from "${sheetMeta?.title || 'your Google Sheet'}" and merge/replace your local transactions. Are you sure?`}
        confirmLabel="Pull from Google Sheets"
        onConfirm={handlePullConfirmed}
        onCancel={() => setConfirmPullOpen(false)}
      />
    </div>
  );
}
