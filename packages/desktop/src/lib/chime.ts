// Tiny Web Audio chime for successful interactions (e.g. dropping a valid
// encrypted file). Synthesized at runtime — no asset, no network.
// Kept in sync with src/lib/chime.ts.

let audioCtx: AudioContext | undefined;

function getCtx(): AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  if (audioCtx) return audioCtx;
  const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
    || (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return undefined;
  audioCtx = new AC();
  return audioCtx;
}

export function playChime() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  const notes: Array<[number, number, number]> = [
    [659.25, 0, 0.18],
    [987.77, 0.09, 0.26],
  ];

  for (const [freq, start, dur] of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, now + start);
    gain.gain.linearRampToValueAtTime(0.12, now + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + start);
    osc.stop(now + start + dur + 0.02);
  }
}
