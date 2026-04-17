'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const PING_INTERVAL = 5_000; // 5 seconds
const PING_TIMEOUT = 4_000; // 4 second fetch timeout

export function ConnectionStatus() {
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const checkConnectivity = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT);

    try {
      await fetch('/ping', {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    } finally {
      clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    setMounted(true);

    const handleOnline = () => { setIsOnline(true); checkConnectivity(); };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkConnectivity();
    const interval = setInterval(checkConnectivity, PING_INTERVAL);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [checkConnectivity]);

  const online = mounted ? isOnline : true;

  return (
    <span
      suppressHydrationWarning
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
        online
          ? 'bg-red-500/10 border-red-500/30 text-red-500'
          : 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-500'
      }`}
    >
      <span className="relative inline-flex h-2 w-2" suppressHydrationWarning>
        {online && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
        )}
        <span
          suppressHydrationWarning
          className={`relative inline-flex h-2 w-2 rounded-full ${
            online ? 'bg-red-500' : 'bg-green-500'
          }`}
        />
      </span>
      <span suppressHydrationWarning>
        {online ? 'Online — disconnect for safety' : 'Offline — safe to proceed'}
      </span>
    </span>
  );
}
