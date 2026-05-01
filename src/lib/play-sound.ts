/**
 * Centralized audio playback for the web app.
 *
 * Two distinct sounds, two helpers — call sites just pick the right one.
 * Volume and source are configured here so future audio tweaks are a
 * single edit instead of having to update every component that plays a
 * sound.
 *
 * The mp3 files live in packages/desktop/src/assets/ as the canonical
 * source and are synced into public/ at build time by
 * scripts/sync-web-assets.mjs.
 *
 * The desktop app has a parallel src/lib/play-sound.ts with the same
 * exported API; the only difference is desktop loads sounds via
 * Vite-bundled asset imports rather than public-folder URLs.
 */

const ALT_SOUND_VOLUME = 0.5; // 50% softer than the QR Qard sound (~ -6 dB perceived)

function playSound(src: string, volume = 1.0) {
  try {
    // Fresh Audio instance per call — avoids browser autoplay issues
    // and stale-reference quirks when sounds fire in quick succession.
    const audio = new Audio(src);
    if (volume !== 1.0) audio.volume = volume;
    audio.play().catch((e) => console.error('Audio playback failed:', e));
  } catch (error) {
    console.error('Error playing sound:', error);
  }
}

/** Plays when a QR Qard is successfully dropped or scanned during restore. */
export function playQardDropSound() {
  playSound('/sound.mp3');
}

/**
 * Plays when a non-QR file is dropped (keyfile, instructions JSON,
 * inheritance plan, smart-card keyfile). Quieter than the QR Qard sound
 * because users encounter it more often during a single session.
 */
export function playFileDropSound() {
  playSound('/Alternate_sound.mp3', ALT_SOUND_VOLUME);
}
