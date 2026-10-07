// ── First-save review reminder prompt ──────────────────────────────
// Shown once, after the user creates and encrypts a new plan, asking
// if they want local review reminders. Answers (either way) write to
// the sidecar so we don't re-ask on this machine.

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  DEFAULT_INTERVAL_MONTHS,
  INTERVAL_OPTIONS,
  declineReminder,
  enableReminder,
  todayIso,
} from '@/lib/review-reminder';

interface ReviewReminderPromptProps {
  open: boolean;
  onClose: () => void;
}

export function ReviewReminderPrompt({ open, onClose }: ReviewReminderPromptProps) {
  const { toast } = useToast();
  const [interval, setInterval] = useState(DEFAULT_INTERVAL_MONTHS);
  const [osNotifications, setOsNotifications] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleEnable = async () => {
    setBusy(true);
    try {
      await enableReminder({
        intervalMonths: interval,
        osNotifications,
        lastReviewedAt: todayIso(),
      });
      toast({ title: 'Review reminder enabled', description: `Next nudge in ${interval} months.` });
      onClose();
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not enable reminder',
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    setBusy(true);
    try {
      await declineReminder();
      onClose();
    } catch {
      // Decline failure is non-fatal; just close.
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) void handleDecline(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set up review reminders?</DialogTitle>
          <DialogDescription>
            An out-of-date Locker is a common way inheritance plans fail. seQRets can nudge you
            locally to open and check your Locker on a schedule. No server, no network — a plaintext reminder
            file in your app data directory.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Review interval</Label>
            <Select value={String(interval)} onValueChange={(v) => setInterval(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVAL_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    Every {n} months{n === DEFAULT_INTERVAL_MONTHS ? ' (recommended)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start gap-3 pt-1">
            <Switch checked={osNotifications} onCheckedChange={setOsNotifications} />
            <div className="space-y-0.5">
              <Label className="text-sm">Also show a system notification when due</Label>
              <p className="text-xs text-muted-foreground">
                Off by default. Notification text is generic — it won't mention your plan by
                name on a lock screen.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={handleDecline} disabled={busy}>
            No thanks
          </Button>
          <Button onClick={handleEnable} disabled={busy}>
            Enable reminders
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
