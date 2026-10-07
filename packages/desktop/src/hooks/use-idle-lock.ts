import { useCallback, useEffect, useRef, useState } from 'react';

/** How long an open Locker may sit untouched before it locks itself. */
export const LOCKER_IDLE_LOCK_MS = 15 * 60 * 1000;
/** How long before locking the warning appears. */
export const LOCKER_IDLE_WARNING_MS = 60 * 1000;

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;

/**
 * Locks an open Locker after a period without keyboard/mouse activity.
 *
 * Returns `secondsLeft` (non-null while the warning is showing) and
 * `stayOpen()` to dismiss it. Any activity resets the timer: the lock is for
 * a computer left unattended, not for someone at the keyboard.
 */
export function useIdleLock(active: boolean, onLock: () => void) {
  const lastActivity = useRef(Date.now());
  const onLockRef = useRef(onLock);
  onLockRef.current = onLock;
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const stayOpen = useCallback(() => {
    lastActivity.current = Date.now();
    setSecondsLeft(null);
  }, []);

  useEffect(() => {
    if (!active) {
      setSecondsLeft(null);
      return;
    }
    lastActivity.current = Date.now();

    const markActive = () => {
      lastActivity.current = Date.now();
    };
    for (const ev of ACTIVITY_EVENTS) window.addEventListener(ev, markActive, { passive: true, capture: true });

    const timer = window.setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      if (idle >= LOCKER_IDLE_LOCK_MS) {
        setSecondsLeft(null);
        onLockRef.current();
      } else if (idle >= LOCKER_IDLE_LOCK_MS - LOCKER_IDLE_WARNING_MS) {
        setSecondsLeft(Math.ceil((LOCKER_IDLE_LOCK_MS - idle) / 1000));
      } else {
        setSecondsLeft(null);
      }
    }, 1000);

    return () => {
      window.clearInterval(timer);
      for (const ev of ACTIVITY_EVENTS) window.removeEventListener(ev, markActive, { capture: true });
    };
  }, [active]);

  return { secondsLeft, stayOpen };
}
