'use client';

/**
 * Smooth-scroll an end-of-flow marker into view after an action reveals new
 * content (file selected, step advanced, rows added).
 *
 * The revealed content often keeps growing for a few frames after the state
 * flips (entry animations, async file decoding), so a single scrollIntoView
 * can land where the bottom USED to be. This keeps re-targeting for a short
 * window and re-issues the scroll only when the needed target actually
 * changes, so an in-flight smooth scroll is never restarted for nothing.
 * Respects prefers-reduced-motion.
 */
export function scrollToReveal(el: HTMLElement | null, settleMs = 800) {
  if (!el) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const behavior: ScrollBehavior = reduce ? 'auto' : 'smooth';
  const started = performance.now();
  let lastTarget = -1;

  let prevY = -1;
  const tick = () => {
    if (!el.isConnected) return;
    // scrollY needed to put the marker's bottom at the viewport bottom
    // (what scrollIntoView block:'end' aims for), clamped to the page.
    const raw = window.scrollY + el.getBoundingClientRect().bottom - window.innerHeight;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const target = Math.round(Math.min(Math.max(raw, 0), Math.max(max, 0)));
    const y = Math.round(window.scrollY);
    // Re-issue when the target moved (content grew), or when scrolling has
    // STALLED short of the target — e.g. a closing dialog's body-scroll lock
    // swallowed the first attempt. A smooth scroll in flight moves every
    // frame, so the stall check never restarts a working animation.
    const targetMoved = Math.abs(target - lastTarget) > 2;
    const stalled = y === prevY && Math.abs(y - target) > 2;
    if (targetMoved || stalled) {
      lastTarget = target;
      el.scrollIntoView({ behavior, block: 'end' });
    }
    prevY = y;
    if (performance.now() - started < settleMs) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}
