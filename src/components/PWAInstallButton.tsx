import React, { useState } from 'react';
import { Download, Laptop, Smartphone, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { InstallAppModal } from './InstallAppModal';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isWindows, isAndroid, install } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <button
        id="btn-install-pwa-app"
        onClick={handleClick}
        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 border ${
          isInstalled
            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/50'
            : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white border-emerald-400/50 shadow-emerald-950/40 hover:shadow-md'
        }`}
        title="Install BotLedger as a native Windows desktop app or Android mobile app"
      >
        {isInstalled ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Installed (App Mode)</span>
            <span className="sm:hidden">App</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              Install App {isWindows ? '(Windows)' : isAndroid ? '(Android)' : '(Win/Android)'}
            </span>
            <span className="md:hidden">Install</span>
            <div className="flex items-center gap-0.5 opacity-90">
              <Laptop className="w-3 h-3" />
              <Smartphone className="w-3 h-3" />
            </div>
          </>
        )}
      </button>

      <InstallAppModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
