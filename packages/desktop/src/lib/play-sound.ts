/**
 * Centralized audio playback for the desktop app.
 *
 * Mirror of src/lib/play-sound.ts in the web app. Same exported API; the
 * only difference is that desktop loads audio via Vite-bundled asset
 * imports (so the mp3 binaries are baked into the Tauri bundle), whereas
 * web loads from URL strings served out of the public folder.
 *
 * Both files derive their sounds from packages/desktop/src/assets/ as
 * the canonical source of truth.
 */

import qardDropSound from '@/assets/sound.mp3';
import fileDropSound from '@/assets/Alternate_sound.mp3';

const ALT_SOUND_VOLUME = 0.5; // 50% softer than the QR Qard sound (~ -6 dB perceived)

function playSound(src: string, volume = 1.0) {
  try {
    // Fresh Audio instance per call — avoids browser/webview autoplay
    // restrictions and stale-reference quirks when sounds fire in quick
    // succession.
    const audio = new Audio(src);
    if (volume !== 1.0) audio.volume = volume;
    audio.play().catch((e) => console.error('Audio playback failed:', e));
  } catch (error) {
    console.error('Error playing sound:', error);
  }
}

/** Plays when a QR Qard is successfully dropped or scanned during restore. */
export function playQardDropSound() {
  playSound(qardDropSound);
}

/**
 * Plays when a non-QR file is dropped (keyfile, instructions JSON,
 * inheritance plan, smart-card keyfile). Quieter than the QR Qard sound
 * because users encounter it more often during a single session.
 */
export function playFileDropSound() {
  playSound(fileDropSound, ALT_SOUND_VOLUME);
}
