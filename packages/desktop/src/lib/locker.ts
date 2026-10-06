/**
 * Desktop Locker crypto: the shared create / unlock / save steps from
 * @seqrets/crypto, run on the app's native Rust encryption (same wire format
 * as the TypeScript path — proven by the TS↔Rust parity tests and the
 * Rust-sealed Locker vector replayed by `npm test` and Recover).
 */

import type { LockerCrypto } from '@seqrets/crypto';
import { createShares, restoreSecret, encryptInstructions, decryptInstructions } from './desktop-crypto';

export const desktopLockerCrypto: LockerCrypto = {
  createShares,
  restoreSecret,
  encryptInstructions,
  decryptInstructions,
};
