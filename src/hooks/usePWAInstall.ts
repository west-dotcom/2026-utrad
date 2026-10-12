import { useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isWindows, setIsWindows] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    // Detect standalone mode (already installed on Windows desktop, Android, or iOS)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Platform detection
    const userAgent = (window.navigator.userAgent || '').toLowerCase();
    setIsWindows(/windows|win32|win64/i.test(userAgent));
    setIsAndroid(/android/i.test(userAgent));
    setIsIOS(/iphone|ipad|ipod/i.test(userAgent));
    setIsMac(/macintosh|mac os x/i.test(userAgent) && !/iphone|ipad|ipod/i.test(userAgent));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Install prompt error:', err);
      return false;
    }
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isWindows,
    isAndroid,
    isIOS,
    isMac,
    install,
    deferredPrompt,
  };
}
