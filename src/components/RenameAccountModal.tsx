import React, { useState, useEffect } from 'react';
import { X, Edit2, Check, AlertCircle } from 'lucide-react';
import { renameAccountInStorage, AccountMeta } from '../data/accountsData';

export interface RenameAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  currentName: string;
  onRenamed?: (accountId: string, newName: string) => void;
}

export function RenameAccountModal({
  isOpen,
  onClose,
  accountId,
  currentName,
  onRenamed,
}: RenameAccountModalProps) {
  const [name, setName] = useState(currentName);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setName(currentName);
    setErrorMsg(null);
  }, [currentName, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg('Account name cannot be empty.');
      return;
    }

    try {
      renameAccountInStorage(accountId, trimmed);
      if (onRenamed) {
        onRenamed(accountId, trimmed);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to rename account.');
    }
  };

  return (
    <div
      id="rename-account-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="rename-account-modal-container"
        className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4 text-slate-100 relative"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Rename Account
              </h3>
              <p className="text-xs text-slate-400">
                Update the display name across all sheets, header tabs, and ledger views.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/60 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-300 font-semibold">
              <label htmlFor="rename-input">New Account Name</label>
              <span className="text-[10px] font-mono text-slate-500">ID: {accountId}</span>
            </div>
            <input
              id="rename-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Farmland or Firmly or Alpha Strategy"
              autoFocus
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 shadow-inner"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold flex items-center gap-1.5 shadow-md shadow-amber-950/40 cursor-pointer transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Save Name</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
