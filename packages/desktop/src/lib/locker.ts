/**
 * Desktop Locker crypto: the shared create / unlock / save steps from
 * @seqrets/crypto, run on the app's native Rust encryption (same wire format
 * as the TypeScript path — proven by the TS↔Rust parity tests and the
 * Rust-sealed Locker vector replayed by `npm test` and Recover).
 */

import type { LockerCrypto, UnlockedLocker } from '@seqrets/crypto';
import type { FileFilter } from './native-save';
import { createShares, restoreSecret, encryptInstructions, decryptInstructions } from './desktop-crypto';

export const desktopLockerCrypto: LockerCrypto = {
  createShares,
  restoreSecret,
  encryptInstructions,
  decryptInstructions,
};

/** An open Locker as the Locker tab holds it in memory. */
export interface OpenLocker extends UnlockedLocker {
  /** Name of the file it was opened from / last saved to, if known. */
  fileName?: string;
}

/** Save-dialog filter for Locker files (.json keeps them openable in Recover). */
export const LOCKER_FILE_FILTERS: FileFilter[] = [
  { name: 'seQRets Locker', extensions: ['json'] },
];
