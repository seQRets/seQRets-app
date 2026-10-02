'use client';

/**
 * Keep smooth-scrolling toward a target that may still be moving.
 *
 * Freshly revealed or freshly navigated-to content keeps changing for a few
 * frames (entry animations, async file decoding, a route still rendering),
 * so a single scroll lands where the target USED to be. This re-targets every
 * frame for `settleMs` and re-issues the scroll only when the target moved or
 * scrolling STALLED short of it (e.g. a closing dialog's body-scroll lock, or
 * the router resetting scroll on navigation, swallowed the first attempt). A
 * smooth scroll in flight moves every frame, so the stall check never
 * restarts a working animation. Respects prefers-reduced-motion.
 *
 * `getTarget` returns the desired scrollY, `null` to wait a frame (nothing to
 * aim at yet), or `false` to stop for good.
 */
function settleScroll(getTarget: () => number | null | false, settleMs: number) {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const behavior: ScrollBehavior = reduce ? 'auto' : 'smooth';
  const started = performance.now();
  let lastTarget = -1;
  let prevY = -1;

  const tick = () => {
    const raw = getTarget();
    if (raw === false) return;
    if (raw !== null) {
      const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
      const target = Math.round(Math.min(Math.max(raw, 0), max));
      const y = Math.round(window.scrollY);
      const targetMoved = Math.abs(target - lastTarget) > 2;
      const stalled = y === prevY && Math.abs(y - target) > 2;
      if (targetMoved || stalled) {
        lastTarget = target;
        window.scrollTo({ top: target, behavior });
      }
      prevY = y;
    }
    if (performance.now() - started < settleMs) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

/**
 * Smooth-scroll to the very bottom of the page after an action reveals new
 * content (Next Step, file selected, keyfile switched on, rows added).
 *
 * App-wide rule (user ruling 2026-10-02): every reveal ends with the page
 * scrolled all the way down, footer included, so the working area sits
 * centred above it, not with the card's bottom edge at the window edge.
 * Every step reveal is shorter than a window, so its top stays in view.
 *
 * `el` is the flow's end marker; the scroll stops if it leaves the DOM
 * (e.g. the user navigated away mid-scroll).
 */
export function scrollToReveal(el: HTMLElement | null, settleMs = 800) {
  if (!el) return;
  settleScroll(
    () => (el.isConnected ? document.documentElement.scrollHeight : false),
    settleMs,
  );
}

/** Gap between the window's top edge and the page's top row after a tab switch. */
const WORK_AREA_TOP_GAP = 16;

/**
 * Main-tab switch (Secure Secret / Inheritance Plan / Restore Secret): scroll
 * so the page's top row (Ask Bob · logo · menu) sits just below the window's
 * top edge, bringing the tab bar and the working area into view without
 * pushing Ask Bob off the top (user ruling 2026-10-02).
 *
 * The row is found by `data-scroll-anchor="page-top"` on every page that shows
 * the tabs. Looked up each frame, because a tab can navigate to a different
 * page whose row only exists once that page has rendered.
 */
export function scrollToWorkArea(settleMs = 1200) {
  settleScroll(() => {
    const anchor = document.querySelector<HTMLElement>('[data-scroll-anchor="page-top"]');
    if (!anchor) return null;
    return window.scrollY + anchor.getBoundingClientRect().top - WORK_AREA_TOP_GAP;
  }, settleMs);
}
