'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';

// Clickwrap acceptance gate. Blocks the entire app on first visit until the
// user affirmatively accepts the Terms of Service and Privacy Policy. This is
// independent of the welcome-cards flow (which is skippable) — a legal gate
// must not be bypassable via a "don't show again" preference or a deep link.
//
// Versioned key: bumping ACCEPTANCE_VERSION re-prompts all users after a
// material change to the Terms, so prior acceptance of older terms doesn't
// silently carry forward.
const ACCEPTANCE_VERSION = '1';
const ACCEPTANCE_KEY = `seQRets_termsAccepted_v${ACCEPTANCE_VERSION}`;

export function TermsGate({ children }: { children: React.ReactNode }) {
  // null = still reading localStorage (avoid flicker / SSR mismatch)
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    try {
      setAccepted(localStorage.getItem(ACCEPTANCE_KEY) === 'true');
    } catch {
      // localStorage blocked (private mode, etc.) — fail closed: show the gate.
      setAccepted(false);
    }
  }, []);

  const handleAccept = () => {
    if (!checked) return;
    try { localStorage.setItem(ACCEPTANCE_KEY, 'true'); } catch { /* ignore */ }
    setAccepted(true);
  };

  // Until we know, render children behind nothing — the overlay (if needed)
  // mounts once we've read storage, so accepted users never see a flash.
  if (accepted === null || accepted) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-gate-title"
      >
        <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
              <ShieldAlert className="h-6 w-6 text-primary" />
            </div>
            <h2 id="terms-gate-title" className="text-2xl font-bold text-card-foreground">
              Before you begin
            </h2>
          </div>

          <div className="mt-5 space-y-4 text-sm text-muted-foreground">
            <p>
              seQRets is a <strong className="text-card-foreground">zero-knowledge</strong> tool.
              Everything is encrypted on your own device. We never see, store, or transmit your
              secrets, passwords, keyfiles, or Qards — and we cannot recover them for you.
            </p>
            <div className="rounded-lg bg-[#cbc5ba] dark:bg-muted p-4">
              <p className="text-card-foreground font-medium">
                If you lose your Qards, password, or keyfile, your secret is gone forever.
              </p>
              <p className="mt-1">
                No one — including Toothjockey LLC — can restore it. You are solely responsible
                for safely storing and backing up everything you create.
              </p>
            </div>
          </div>

          <label className="mt-6 flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-border accent-primary"
            />
            <span className="text-sm text-card-foreground">
              I have read and accept the{' '}
              <a href="https://seqrets.app/terms" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:opacity-80">Terms of Service</a>
              {' '}and{' '}
              <a href="https://seqrets.app/privacy" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:opacity-80">Privacy Policy</a>,
              and I understand I am solely responsible for my secrets and their backups.
            </span>
          </label>

          <button
            type="button"
            onClick={handleAccept}
            disabled={!checked}
            className="mt-6 w-full rounded-md bg-primary px-4 py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Accept &amp; Continue
          </button>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} seQRets — a product of Toothjockey LLC.
          </p>
        </div>
      </div>
    </>
  );
}
