import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-amber-500/95 text-slate-950 font-semibold px-4 py-2 text-xs shadow-2xl border border-amber-300 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <WifiOff className="w-4 h-4 text-slate-950 shrink-0 animate-pulse" />
      <span>Offline Mode — Cached ledger data and local calculations are active.</span>
    </div>
  );
};
