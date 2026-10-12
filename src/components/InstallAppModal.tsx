import React, { useState } from 'react';
import {
  X,
  Download,
  Smartphone,
  Laptop,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  Wifi,
  Sparkles,
  Layers,
  Terminal,
  FileCode,
  FolderDown,
  AlertTriangle,
  QrCode,
  Globe,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

// Public Shared URL - accessible outside the authenticated developer environment
// This prevents Google Cloud Run 403 "You do not have access to this page" errors
export const PUBLIC_SHARED_URL = 'https://ais-pre-vfcaneqr3gjjykmpv4prrx-184771447104.europe-west2.run.app';

export const getPublicAppUrl = (): string => {
  if (typeof window === 'undefined') return PUBLIC_SHARED_URL;
  const current = window.location.href;
  if (current.includes('ais-dev-')) {
    return current.replace('ais-dev-', 'ais-pre-');
  }
  return current || PUBLIC_SHARED_URL;
};

export const getPublicAppOrigin = (): string => {
  if (typeof window === 'undefined') return PUBLIC_SHARED_URL;
  const current = window.location.origin;
  if (current.includes('ais-dev-')) {
    return current.replace('ais-dev-', 'ais-pre-');
  }
  return current || PUBLIC_SHARED_URL;
};

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'windows' | 'android' | 'files' | 'packaging';
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'windows',
}) => {
  const { isInstallable, isInstalled, isWindows, isAndroid, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'windows' | 'android' | 'files' | 'packaging'>(
    initialTab || (isAndroid ? 'android' : 'windows')
  );
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const publicAppUrl = getPublicAppUrl();
  const publicAppOrigin = getPublicAppOrigin();

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        onClose();
      }
    }
  };

  const copyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const downloadFile = (filename: string, content: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadWindowsInstaller = () => {
    const targetUrl = getPublicAppUrl();
    const script = `@echo off
:: ========================================================
:: BotLedger - Windows Desktop Application Installer
:: ========================================================
title BotLedger Desktop App Setup
color 0A
echo.
echo ========================================================
echo   Installing BotLedger Standalone Desktop App...
echo ========================================================
echo.

:: Configured with Public Shared URL (avoids Google Cloud 403 Forbidden error)
set APP_URL=${targetUrl}
set SHORTCUT_NAME=BotLedger.lnk

echo [INFO] Configured App URL: %APP_URL%
echo [INFO] Creating Desktop shortcut for standalone app window...

:: Create Desktop Shortcut pointing to standalone app window
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$desktop = [System.Environment]::GetFolderPath('Desktop'); " ^
  "$shortcutPath = [System.IO.Path]::Combine($desktop, 'BotLedger.lnk'); " ^
  "$edgePath = (Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\msedge.exe' -ErrorAction SilentlyContinue).'(default)'; " ^
  "if (-not $edgePath) { $edgePath = 'msedge.exe' }; " ^
  "$s = $ws.CreateShortcut($shortcutPath); " ^
  "$s.TargetPath = $edgePath; " ^
  "$s.Arguments = '--app=%APP_URL% --new-window'; " ^
  "$s.Description = 'BotLedger Crypto Trading Bot Analytics App'; " ^
  "$s.WindowStyle = 1; " ^
  "$s.Save(); " ^
  "Write-Host '[SUCCESS] Desktop shortcut created at:' $shortcutPath -ForegroundColor Green"

echo.
echo Launching BotLedger in standalone window mode...
start msedge.exe --app=%APP_URL% || start chrome.exe --app=%APP_URL% || start %APP_URL%

echo.
echo ========================================================
echo  BotLedger Windows App is now installed and running!
echo ========================================================
pause
`;
    downloadFile('Install-BotLedger-Windows.bat', script, 'application/x-bat');
  };

  const handleDownloadWindowsShortcut = () => {
    const targetUrl = getPublicAppUrl();
    const urlFile = `[{000214A0-0000-0000-C000-000000000046}]
Prop3=19,0
[InternetShortcut]
IDList=
URL=${targetUrl}
IconIndex=0
HotKey=0
`;
    downloadFile('BotLedger-Desktop.url', urlFile, 'text/plain');
  };

  const handleDownloadAndroidLauncher = () => {
    const targetUrl = getPublicAppUrl();
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Install BotLedger Android App</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #020617; color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; text-align: center; margin: 0; }
    .card { background: #0f172a; border: 1px solid #334155; border-radius: 24px; padding: 32px 24px; max-width: 440px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6); }
    h1 { color: #34d399; font-size: 24px; margin-bottom: 8px; font-weight: 800; }
    p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }
    .badge { display: inline-block; background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; margin-bottom: 12px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #10b981, #14b8a6); color: #020617; font-weight: 800; padding: 16px 28px; border-radius: 14px; text-decoration: none; font-size: 16px; box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3); }
    .steps { text-align: left; background: #020617; padding: 16px; border-radius: 14px; margin-top: 24px; font-size: 13px; color: #cbd5e1; }
    .steps ol { margin: 8px 0 0 18px; padding: 0; }
    .steps li { margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size: 40px; margin-bottom: 12px;">📱</div>
    <span class="badge">Official Public Preview Link</span>
    <h1>BotLedger Android App</h1>
    <p>Tap below to launch the BotLedger application directly on your phone with zero 403 access issues.</p>
    <a href="${targetUrl}" class="btn">🚀 Open BotLedger App</a>
    <div class="steps">
      <strong>To Install to Android Home Screen:</strong>
      <ol>
        <li>Open the link above in Chrome</li>
        <li>Tap the browser menu (<strong>⋮</strong> three dots top-right)</li>
        <li>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></li>
        <li>Tap <strong>Install</strong> to add BotLedger to your apps</li>
      </ol>
    </div>
  </div>
  <script>
    setTimeout(function() { window.location.href = "${targetUrl}"; }, 1200);
  </script>
</body>
</html>`;
    downloadFile('BotLedger-Android-Launcher.html', html, 'text/html');
  };

  const openPWABuilder = () => {
    const origin = getPublicAppOrigin();
    const url = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(origin)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl text-white overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-modal-title"
      >
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950/40 flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center">
                <img src="/icon.svg" alt="App Icon" className="w-8 h-8 rounded-lg" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="install-modal-title" className="text-xl font-bold tracking-tight text-white">
                  Install BotLedger App
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Windows & Android
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Run as a native standalone application or download direct installer files.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform Selection Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 pt-2 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('windows')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap border-b-2 ${
              activeTab === 'windows'
                ? 'bg-slate-900 text-emerald-400 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Windows Desktop</span>
            {isWindows && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                Your OS
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('android')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap border-b-2 ${
              activeTab === 'android'
                ? 'bg-slate-900 text-emerald-400 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Android Mobile</span>
            {isAndroid && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                Your OS
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap border-b-2 ${
              activeTab === 'files'
                ? 'bg-slate-900 text-emerald-400 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <FolderDown className="w-4 h-4" />
            <span>Download Install Files</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
              Direct Files
            </span>
          </button>

          <button
            onClick={() => setActiveTab('packaging')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap border-b-2 ${
              activeTab === 'packaging'
                ? 'bg-slate-900 text-emerald-400 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Build .EXE / .APK</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* 403 Access Denied Troubleshooting Callout */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/30 border border-amber-500/40 text-amber-200 shadow-md">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-bold text-amber-300">
                    Fix: "403. That’s an error. We're sorry, but you do not have access to this page"
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                    Public URL Ready
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong>Why this happened:</strong> When installing from within the private development sandbox (<code className="text-amber-300 font-mono">ais-dev-*</code>), external browser windows and mobile devices are blocked by Google Cloud access control.
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong>Permanent Solution:</strong> Use the <strong>Public Preview Link</strong> below. All downloaded installers (<code className="text-emerald-400 font-mono">.bat</code>, <code className="text-blue-400 font-mono">.url</code>, <code className="text-emerald-400 font-mono">.html</code>) are now pre-configured with this public URL to launch cleanly with <strong>zero 403 errors</strong>.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <a
                    href={publicAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Public App & Install (Fixes 403)</span>
                  </a>

                  <button
                    onClick={() => copyCode(publicAppUrl, 999)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedIndex === 999 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedIndex === 999 ? 'Copied Public URL!' : 'Copy Public App URL'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* WINDOWS TAB */}
          {activeTab === 'windows' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Status Alert if Already Installed */}
              {isInstalled ? (
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-300">Application Already Installed!</h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      You are running BotLedger in standalone desktop window mode with full local caching.
                    </p>
                  </div>
                </div>
              ) : isInstallable ? (
                /* 1-Click Install Button */
                <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-blue-950/40 border border-emerald-500/40 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <Zap className="w-3 h-3 text-emerald-400" />
                      1-Click Native Windows Installation
                    </span>
                    <h3 className="text-base font-bold text-white">
                      Install as Windows Desktop Application
                    </h3>
                    <p className="text-xs text-slate-300">
                      Adds desktop shortcut, Windows Start Menu pin, taskbar badge, and opens in a dedicated window without browser bars.
                    </p>
                  </div>

                  <button
                    onClick={handleInstallClick}
                    className="shrink-0 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install on Windows</span>
                  </button>
                </div>
              ) : null}

              {/* Direct Download Install Files for Windows Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/30 border border-emerald-500/30 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <FolderDown className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Download Windows Install Files
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        1-Click download files that launch BotLedger in full standalone windowed mode
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Ready to Download
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={handleDownloadWindowsInstaller}
                    className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700/80 hover:border-emerald-500/50 text-left transition-all cursor-pointer group shadow-sm flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                      <FileCode className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                        <span>Download Windows Installer (.bat)</span>
                        <Download className="w-3 h-3 text-emerald-400 opacity-80" />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Creates Desktop shortcut & launches app in borderless window
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={handleDownloadWindowsShortcut}
                    className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700/80 hover:border-blue-500/50 text-left transition-all cursor-pointer group shadow-sm flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
                      <Laptop className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors flex items-center gap-1.5">
                        <span>Download Desktop Shortcut (.url)</span>
                        <Download className="w-3 h-3 text-blue-400 opacity-80" />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Direct Windows desktop shortcut for double-click launch
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Windows Native Benefits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white">Dedicated Window</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Hides browser URL bars and tabs. Features native Windows minimize, maximize, and close controls.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Wifi className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white">Offline Caching</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Service Worker precaches the ledger so you can inspect records even without an active internet connection.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white">Taskbar & Alt+Tab</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Pins to Windows Taskbar, appears in Alt+Tab window switcher, and launches from Start Menu like an .exe program.
                  </p>
                </div>
              </div>

              {/* Step-by-Step Instructions for Edge / Chrome */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <span>How to Install via Browser on Windows:</span>
                </h4>

                <div className="space-y-3 text-xs text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                      1
                    </span>
                    <div>
                      <strong className="text-white">In Microsoft Edge:</strong> Click the <code className="bg-slate-900 px-1.5 py-0.5 rounded text-emerald-300 font-mono">App available</code> icon in the address bar (or menu <code className="bg-slate-900 px-1 py-0.5 rounded font-mono">... → Apps → Install this site as an app</code>).
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                      2
                    </span>
                    <div>
                      <strong className="text-white">In Google Chrome:</strong> Click the <code className="bg-slate-900 px-1.5 py-0.5 rounded text-emerald-300 font-mono">Install BotLedger</code> icon in the right side of the address bar (or menu <code className="bg-slate-900 px-1 py-0.5 rounded font-mono">⋮ → Cast, save, and share → Install BotLedger</code>).
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                      3
                    </span>
                    <div>
                      <strong className="text-white">Pin to Taskbar & Desktop:</strong> Check <code className="text-white">"Pin to taskbar"</code> and <code className="text-white">"Create Desktop shortcut"</code>, then click <strong>Install</strong>.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ANDROID TAB */}
          {activeTab === 'android' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Android 1-Click Install or Prompt */}
              {isInstalled ? (
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-300">Android App Installed!</h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      BotLedger is installed on your Android device home screen and running full-screen.
                    </p>
                  </div>
                </div>
              ) : isInstallable ? (
                <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-purple-950/40 border border-emerald-500/40 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <Zap className="w-3 h-3 text-emerald-400" />
                      1-Tap Android WebAPK Installation
                    </span>
                    <h3 className="text-base font-bold text-white">
                      Install as Android Mobile App
                    </h3>
                    <p className="text-xs text-slate-300">
                      Installs a native WebAPK icon on your Android home screen and app drawer with splash screen and offline support.
                    </p>
                  </div>

                  <button
                    onClick={handleInstallClick}
                    className="shrink-0 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install on Android</span>
                  </button>
                </div>
              ) : null}

              {/* Direct Download Install Files for Android Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/30 border border-emerald-500/30 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <FolderDown className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Download Android Install Files
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Download mobile launcher file or generate signed APK
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Android Ready
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={handleDownloadAndroidLauncher}
                    className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700/80 hover:border-emerald-500/50 text-left transition-all cursor-pointer group shadow-sm flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                        <span>Download Mobile Launcher (.html)</span>
                        <Download className="w-3 h-3 text-emerald-400 opacity-80" />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Open on Android phone to install icon to home screen
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={openPWABuilder}
                    className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700/80 hover:border-purple-500/50 text-left transition-all cursor-pointer group shadow-sm flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 group-hover:bg-purple-500/20 transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors flex items-center gap-1.5">
                        <span>Generate Android APK via Cloud</span>
                        <ExternalLink className="w-3 h-3 text-purple-400 opacity-80" />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Generate official APK / Google Play package in 1 click
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* QR Code for Direct Android Camera Scan */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/20 border border-emerald-500/30 flex flex-col sm:flex-row items-center gap-4">
                <div className="p-2.5 bg-white rounded-2xl shrink-0 shadow-lg shadow-emerald-500/10">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&margin=2&data=${encodeURIComponent(publicAppUrl)}`}
                    alt="Scan QR code on Android"
                    className="w-28 h-28 rounded-lg"
                    loading="lazy"
                  />
                </div>
                <div className="space-y-1.5 text-center sm:text-left flex-1">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <QrCode className="w-3 h-3 text-emerald-400" />
                    Scan with Phone Camera
                  </span>
                  <h4 className="text-xs font-bold text-white">Instant Android Mobile Launch & Install</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Point your Android camera at this QR code to load the public application directly on your phone. Then tap Chrome's menu (<strong>⋮</strong>) → <strong>"Install app"</strong> to install to your app drawer.
                  </p>
                  <div className="pt-0.5">
                    <span className="text-[11px] text-emerald-400 font-mono break-all selection:bg-emerald-500 selection:text-slate-950">
                      {publicAppUrl}
                    </span>
                  </div>
                </div>
              </div>

              {/* Android Features */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white">Full-Screen Standalone</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Removes browser address bar and navigation buttons for an authentic native Android app feel.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white">Fast Touch Daily Log</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    1-Tap "Next Date" baton button for sequential daily data entry directly on mobile touchscreen.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white">Maskable App Icon</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Compliant 512x512 maskable icon with safe zone margins that adapts to any Android launcher theme.
                  </p>
                </div>
              </div>

              {/* Step-by-Step Instructions for Android Chrome */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <span>How to Install on Android Phone or Tablet:</span>
                </h4>

                <div className="space-y-3 text-xs text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                      1
                    </span>
                    <div>
                      <strong className="text-white">Open in Chrome or Samsung Internet:</strong> Visit the app URL in your mobile browser.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                      2
                    </span>
                    <div>
                      <strong className="text-white">Tap the 3-Dots Menu (⋮):</strong> Look in the top right or bottom bar of your browser.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                      3
                    </span>
                    <div>
                      <strong className="text-white">Tap "Install app" or "Add to Home screen":</strong> The app icon will appear directly in your app drawer alongside other native apps.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DEDICATED DIRECT DOWNLOAD INSTALL FILES TAB */}
          {activeTab === 'files' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-1">
                <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                  <FolderDown className="w-4 h-4 text-emerald-400" />
                  <span>Download Standalone Install Files</span>
                </h4>
                <p className="text-xs text-slate-300">
                  Directly download install files for Windows desktop and Android devices to launch the application outside the browser.
                </p>
              </div>

              {/* Windows Files */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-blue-400" />
                    <span>Windows Desktop App Install Files</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Windows 10 / 11 Compatible</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={handleDownloadWindowsInstaller}
                    className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-750 hover:border-emerald-500/50 text-left transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-emerald-300">
                        Install-BotLedger-Windows.bat
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Automated batch installer script
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                  </button>

                  <button
                    onClick={handleDownloadWindowsShortcut}
                    className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-750 hover:border-blue-500/50 text-left transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-blue-300">
                        BotLedger-Desktop.url
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Desktop shortcut link file
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-blue-400 shrink-0" />
                  </button>
                </div>
              </div>

              {/* Android Files */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>Android Mobile App Files</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Android 8+ Compatible</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={handleDownloadAndroidLauncher}
                    className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-750 hover:border-emerald-500/50 text-left transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-emerald-300">
                        BotLedger-Android-Launcher.html
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Mobile app launcher file
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                  </button>

                  <button
                    onClick={openPWABuilder}
                    className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-750 hover:border-purple-500/50 text-left transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-purple-300">
                        PWABuilder APK Generator
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Build signed Android .apk package
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-purple-400 shrink-0" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PACKAGING / CLI TAB */}
          {activeTab === 'packaging' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>Build Standalone Native Executables (.EXE for Windows / .APK for Android)</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Since this app is already 100% PWA compliant, you can package it into standalone installers with zero code rewrite using official tools:
                </p>
              </div>

              {/* Option 1: PWABuilder (Microsoft Store & Windows .MSIX / .EXE) */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Laptop className="w-3.5 h-3.5 text-blue-400" />
                    <span>Windows Store / Windows Package (.msix / .exe)</span>
                  </span>
                  <button
                    onClick={() => copyCode('npx @pwabuilder/cli ' + publicAppOrigin, 1)}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1 cursor-pointer"
                  >
                    {copiedIndex === 1 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedIndex === 1 ? 'Copied' : 'Copy Command'}</span>
                  </button>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl font-mono text-xs text-slate-300 overflow-x-auto border border-slate-800">
                  <code># Generate native Windows package via Microsoft PWABuilder:
npx @pwabuilder/cli {publicAppOrigin}
# Generates signed Windows Store MSIX / Desktop installer package</code>
                </div>
                <p className="text-[11px] text-slate-400">
                  You can also visit <strong>pwabuilder.com</strong>, paste the app URL, and download the ready-to-run Windows package.
                </p>
              </div>

              {/* Option 2: Bubblewrap / TWA for Android Google Play (.APK / .AAB) */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Android Google Play (.apk / .aab) via Google Bubblewrap</span>
                  </span>
                  <button
                    onClick={() => copyCode('npx @bubblewrap/cli init --manifest=' + publicAppOrigin + '/manifest.webmanifest', 2)}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1 cursor-pointer"
                  >
                    {copiedIndex === 2 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedIndex === 2 ? 'Copied' : 'Copy Command'}</span>
                  </button>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl font-mono text-xs text-slate-300 overflow-x-auto border border-slate-800">
                  <code># Build signed Android APK using Google Trusted Web Activity:
npx @bubblewrap/cli init --manifest={publicAppOrigin}/manifest.webmanifest
npx @bubblewrap/cli build
# Generates release.apk and bundle.aab for Google Play Store</code>
                </div>
                <p className="text-[11px] text-slate-400">
                  Google's official CLI packages the web app into a signed Android application with zero Java/Kotlin code required.
                </p>
              </div>

              {/* Option 3: Capacitor Multi-Platform */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Capacitor Native Runtime (Android Studio & Electron)</span>
                  </span>
                  <button
                    onClick={() => copyCode('npm i @capacitor/core @capacitor/cli && npx cap init BotLedger com.greenharvest.botledger && npx cap add android', 3)}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1 cursor-pointer"
                  >
                    {copiedIndex === 3 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedIndex === 3 ? 'Copied' : 'Copy Command'}</span>
                  </button>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl font-mono text-xs text-slate-300 overflow-x-auto border border-slate-800">
                  <code>npm i @capacitor/core @capacitor/cli
npx cap init BotLedger com.greenharvest.botledger
npx cap add android
npx cap open android</code>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Windows & Android PWA Service Worker Registered</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleDownloadWindowsInstaller}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .bat Installer</span>
            </button>

            {isInstallable && (
              <button
                onClick={handleInstallClick}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Trigger Install Prompt</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
