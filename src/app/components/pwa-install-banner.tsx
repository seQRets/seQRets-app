'use client';

import { useState, useEffect, useRef } from 'react';
import { Download, X, Monitor, Share } from 'lucide-react';

const DISMISSED_KEY = 'seQRets_pwaInstallDismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type BannerMode = 'native' | 'safari-mac' | 'safari-ios' | 'firefox' | null;

function detectBannerMode(): BannerMode {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;

  // iOS Safari (not Chrome on iOS)
  if (/iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua)) {
    // Don't show if already running as standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return null;
    return 'safari-ios';
  }

  // macOS Safari
  if (/Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg|Firefox/.test(ua)) {
    if (window.matchMedia('(display-mode: standalone)').matches) return null;
    return 'safari-mac';
  }

  // Firefox (desktop)
  if (/Firefox/.test(ua) && !/Seamonkey/.test(ua)) {
    return 'firefox';
  }

  // Chrome/Edge — will use beforeinstallprompt
  return null;
}

export function PwaInstallBanner() {
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState<BannerMode>(null);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISSED_KEY) === 'true') return;
    } catch { /* show by default */ }

    // Check for Safari/Firefox first
    const detected = detectBannerMode();
    if (detected) {
      setMode(detected);
      setShow(true);
      return;
    }

    // Chrome/Edge: wait for native install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setMode('native');
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    const prompt = deferredPrompt.current;
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      dismiss();
    }
  };

  const dismiss = () => {
    setShow(false);
    try { localStorage.setItem(DISMISSED_KEY, 'true'); } catch { /* ignore */ }
  };

  if (!show || !mode) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-[#827b6f]/40 bg-[#cbc5ba] dark:bg-[#d3cdc1] px-4 py-2 text-sm animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-2 text-[#4a4540] dark:text-[#3a3530]">
        {mode === 'native' && (
          <>
            <Download className="h-4 w-4 shrink-0 text-[#6b645a] dark:text-[#524c44]" />
            <span>
              <strong className="text-[#231f20]">Install seQRets</strong> as an app for offline use
            </span>
          </>
        )}
        {mode === 'safari-mac' && (
          <>
            <Monitor className="h-4 w-4 shrink-0 text-[#6b645a] dark:text-[#524c44]" />
            <span>
              <strong className="text-[#231f20]">Add seQRets to your Dock</strong> — go to File &rarr; Add to Dock for offline use
            </span>
          </>
        )}
        {mode === 'safari-ios' && (
          <>
            <Share className="h-4 w-4 shrink-0 text-[#6b645a] dark:text-[#524c44]" />
            <span>
              <strong className="text-[#231f20]">Install seQRets</strong> — tap the Share button &rarr; Add to Home Screen
            </span>
          </>
        )}
        {mode === 'firefox' && (
          <>
            <Download className="h-4 w-4 shrink-0 text-[#6b645a] dark:text-[#524c44]" />
            <span>
              Want offline access? Try the{' '}
              <a
                href="https://seqrets.app"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-[#231f20] hover:text-black"
              >
                seQRets desktop app
              </a>
              {' '}for full data sovereignty.
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {mode === 'native' && (
          <button
            onClick={handleInstall}
            className="rounded-md bg-[#231f20] px-3 py-1 text-xs font-semibold text-[#d3cdc1] hover:bg-black transition-colors"
          >
            Install
          </button>
        )}
        <button
          onClick={dismiss}
          className="rounded-md p-1 text-[#6b645a] dark:text-[#524c44] hover:text-[#231f20] hover:bg-[#b5ada3]/30 transition-colors"
          aria-label="Dismiss install banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
