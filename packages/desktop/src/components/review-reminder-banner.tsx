// ── Review Reminder Banner ─────────────────────────────────────────
// Rendered on the home page. Checks the sidecar on mount and, if the
// reminder is due (and not session-dismissed), shows a dismissible card
// that deep-links to the Locker tab. Also offers a 7-day snooze
// that persists across launches.

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CalendarClock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getReminderState, snoozeReminder, type ReminderState } from '@/lib/review-reminder';

const SESSION_DISMISS_KEY = 'seQRets_reminderBannerDismissed';

export function ReviewReminderBanner() {
  const navigate = useNavigate();
  const [state, setState] = useState<ReminderState | null>(null);
  const [sessionDismissed, setSessionDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SESSION_DISMISS_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s = await getReminderState();
        if (!cancelled) setState(s);
      } catch {
        /* ignore — banner is best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (sessionDismissed) return null;
  if (!state || state.kind !== 'active' || !state.due) return null;

  const overdueDays = state.daysUntilDue;
  const message =
    overdueDays > 0
      ? `Your Locker review is overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'}.`
      : 'Your Locker review is due today.';

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(SESSION_DISMISS_KEY, 'true');
    } catch {
      /* ignore */
    }
    setSessionDismissed(true);
  };

  const handleSnooze = async () => {
    try {
      await snoozeReminder(7);
    } finally {
      handleDismiss();
    }
  };

  return (
    <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-amber-100">Inheritance plan review due</h3>
          <p className="text-xs text-amber-200/80">
            {message} Open it to verify beneficiaries, Qard locations, and asset details are
            still accurate.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              size="sm"
              variant="default"
              onClick={() => navigate('/locker')}
            >
              <CalendarClock className="h-4 w-4 mr-1.5" />
              Open Locker
            </Button>
            <Button size="sm" variant="outline" onClick={() => void handleSnooze()}>
              Snooze 7 days
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              Dismiss
            </Button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          className="text-amber-200/60 hover:text-amber-100"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
