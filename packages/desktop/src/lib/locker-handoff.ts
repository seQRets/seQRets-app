/**
 * One-shot, in-memory hand-off of an opened Locker from the Restore tab to
 * the Locker tab. Deliberately NOT router/history state: history entries
 * are kept by the webview and could hold the internal key long after the
 * Locker is locked. Here the Locker tab takes it exactly once.
 */
import type { OpenLocker } from './locker';

let pending: OpenLocker | null = null;

export function handOffLocker(locker: OpenLocker): void {
  pending = locker;
}

export function takeHandedOffLocker(): OpenLocker | null {
  const locker = pending;
  pending = null;
  return locker;
}
