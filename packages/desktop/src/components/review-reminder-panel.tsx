// ── Review Reminder Panel ──────────────────────────────────────────
// In-plan-editor control surface for the review reminder sidecar.
// Shows current state (active / declined / missing / corrupt), lets the
// user mark the plan as reviewed, change the interval, toggle OS
// notifications, or disable the reminder entirely.
//
// Safe to render whenever the plan editor is visible; reads sidecar
// state on mount and after every action.

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, BellOff, CalendarCheck, CheckCircle2, Clock, RefreshCcw, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DEFAULT_INTERVAL_MONTHS,
  INTERVAL_OPTIONS,
  disableAndDelete,
  enableReminder,
  getReminderState,
  markReviewed,
  setOsNotifications,
  setReminderInterval,
  todayIso,
  type ReminderState,
} from '@/lib/review-reminder';

interface ReviewReminderPanelProps {
  /**
   * When true, the panel's "Mark as reviewed" button is shown. Use this
   * in contexts where the user has just decrypted / opened a plan and a
   * review action makes sense (viewer, edit mode). When false, the panel
   * is settings-only.
   */
  canMarkReviewed?: boolean;
  /**
   * Called with today's ISO date after "Mark as reviewed" succeeds, so the
   * open Locker can record it in the plan (the authoritative copy) too.
   */
  onMarkedReviewed?: (isoDate: string) => void;
}

export function ReviewReminderPanel({ canMarkReviewed = true, onMarkedReviewed }: ReviewReminderPanelProps) {
  const { toast } = useToast();
  const [state, setState] = useState<ReminderState | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setState(await getReminderState());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const guard = async (action: () => Promise<void>, successTitle?: string) => {
    setBusy(true);
    try {
      await action();
      await refresh();
      if (successTitle) toast({ title: successTitle });
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Reminder update failed',
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setBusy(false);
    }
  };

  if (!state) {
    return (
      <div className="border border-border rounded-lg p-4 text-sm text-muted-foreground">
        Loading review reminder…
      </div>
    );
  }

  // ── Corrupt ──
  if (state.kind === 'corrupt') {
    return (
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Review reminder file is unreadable</AlertTitle>
        <AlertDescription className="space-y-2">
          <p className="text-xs">{state.error}</p>
          <p className="text-xs">
            The reminder sidecar is intentionally not auto-deleted on parse errors. Delete it
            manually to reset, then re-enable reminders below.
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => guard(disableAndDelete, 'Reminder file deleted')}
          >
            Delete reminder file
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // ── Missing or declined: offer enable ──
  if (state.kind === 'missing' || state.kind === 'declined') {
    const isDeclined = state.kind === 'declined';
    return (
      <div className="border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-start gap-3">
          <BellOff className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold">Review reminders are off</h4>
            <p className="text-xs text-muted-foreground">
              {isDeclined
                ? 'You previously declined reminders on this machine. You can turn them back on below.'
                : 'Get a local nudge every 12 months to open and verify this plan.'}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          disabled={busy}
          onClick={() =>
            guard(
              () =>
                enableReminder({
                  intervalMonths: DEFAULT_INTERVAL_MONTHS,
                  osNotifications: false,
                  lastReviewedAt: todayIso(),
                }),
              'Review reminder enabled',
            )
          }
        >
          Enable reminders (every {DEFAULT_INTERVAL_MONTHS} months)
        </Button>
      </div>
    );
  }

  // ── Active ──
  const { sidecar, due, daysUntilDue } = state;
  const intervalMonths = sidecar.intervalMonths ?? DEFAULT_INTERVAL_MONTHS;
  const statusLine = due
    ? daysUntilDue > 0
      ? `Overdue by ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`
      : 'Due today'
    : `Next review in ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? '' : 's'} (${sidecar.nextReviewAt})`;

  return (
    <div className="border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-start gap-3">
        {due ? (
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        ) : (
          <CalendarCheck className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold">Review reminder</h4>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            {statusLine}
          </p>
          {sidecar.lastReviewedAt && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Last reviewed: {sidecar.lastReviewedAt}
            </p>
          )}
        </div>
        {canMarkReviewed && (
          <Button
            size="sm"
            variant={due ? 'default' : 'outline'}
            disabled={busy}
            onClick={() => guard(async () => { await markReviewed(); onMarkedReviewed?.(todayIso()); }, 'Marked as reviewed')}
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Mark as reviewed
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
        <div className="space-y-1.5">
          <Label className="text-xs">Interval</Label>
          <Select
            value={String(intervalMonths)}
            disabled={busy}
            onValueChange={(v) =>
              guard(() => setReminderInterval(Number(v)), 'Interval updated')
            }
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTERVAL_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  Every {n} months
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">System notification</Label>
          <div className="flex items-center gap-2 h-9">
            <Switch
              checked={sidecar.osNotifications}
              disabled={busy}
              onCheckedChange={(checked) =>
                guard(() => setOsNotifications(checked), checked ? 'System notifications on' : 'System notifications off')
              }
            />
            <span className="text-xs text-muted-foreground">
              {sidecar.osNotifications ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => void refresh()}
        >
          <RefreshCcw className="h-3.5 w-3.5 mr-1" />
          Refresh
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          disabled={busy}
          onClick={() => guard(disableAndDelete, 'Review reminder disabled')}
        >
          Disable and delete
        </Button>
      </div>
    </div>
  );
}
