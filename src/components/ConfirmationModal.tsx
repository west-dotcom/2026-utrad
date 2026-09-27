import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div
      id="confirmation-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      onClick={onCancel}
    >
      <div
        id="confirmation-modal-container"
        className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-6 space-y-4 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-lg ${
                isDestructive ? 'bg-rose-500/15 text-rose-400' : 'bg-amber-500/15 text-amber-400'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-white">{title}</h3>
          </div>
          <button
            id="confirmation-close-btn"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">{message}</p>

        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            id="confirmation-cancel-btn"
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
          >
            {cancelLabel}
          </button>
          <button
            id="confirmation-confirm-btn"
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-500'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
