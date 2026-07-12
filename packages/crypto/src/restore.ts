/**
 * Pure restore-flow helpers shared by the web and desktop restore forms (G5).
 * No DOM, no React — everything here is deterministic data transformation,
 * which keeps the inheritance-critical restore logic in one tested place.
 */

import { parseShare } from './crypto';
import { mnemonicToEntropy } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

export interface ShareMeta {
  /** 8-char base64 prefix of the salt — null only on parse failure. */
  setId: string | null;
  /** K, if the share was generated with embedRecoveryInfo. */
  threshold: number | null;
  /** N, if the share was generated with embedRecoveryInfo. */
  total: number | null;
  /** 1-based card index, if embedRecoveryInfo. */
  index: number | null;
  /** Integrity hash: true=valid, false=mismatch, null=absent (legacy Qard). */
  hashValid: boolean | null;
}

/**
 * Extract display metadata from a share string. Returns all-null on parse
 * failure — callers that need to REJECT invalid shares should call
 * parseShare directly first (both restore forms do, with a
 * "not a seQRets Qard" message).
 */
export function parseShareMeta(data: string): ShareMeta {
  try {
    const parsed = parseShare(data);
    return {
      setId: parsed.salt.substring(0, 8),
      threshold: parsed.threshold,
      total: parsed.total,
      index: parsed.index,
      hashValid: parsed.hashValid,
    };
  } catch {
    return { setId: null, threshold: null, total: null, index: null, hashValid: null };
  }
}

/** Encode a single BIP-39 phrase as a SeedQR numeric string (4-digit zero-padded word indices). */
export function toSeedQR(phrase: string): string {
  return phrase.split(/\s+/).map(word => wordlist.indexOf(word).toString().padStart(4, '0')).join('');
}

/** Encode a BIP-39 phrase as CompactSeedQR raw entropy bytes (for a byte-mode QR). */
export function toCompactEntropy(phrase: string): Uint8Array {
  return new Uint8Array(mnemonicToEntropy(phrase.trim(), wordlist));
}

/** The subset of a decoded-share row that set summaries are computed from. */
export interface ShareSetInput {
  data: string;
  success: boolean;
  setId: string | null;
  threshold: number | null;
  total: number | null;
}

export interface ShareSetSummary {
  setId: string;
  droppedCount: number;
  threshold: number | null;
  total: number | null;
}

/**
 * Per-set summary used for the recovery countdown UI. Groups successful
 * shares by setId, then reads threshold/total from any share in the group
 * that carries the optional recovery metadata. Produces messages like
 * "Set ABC12345 — 2 of 3 added (1 more required)" or, for legacy/non-embed
 * shares without metadata, just "Set ABC12345 — 2 added".
 */
export function summarizeShareSets(shares: ShareSetInput[]): ShareSetSummary[] {
  const successful = shares.filter(s => s.success);
  if (successful.length === 0) return [];

  const bySet = new Map<string, ShareSetInput[]>();
  for (const s of successful) {
    const key = s.setId ?? '(unrecognized)';
    const list = bySet.get(key) ?? [];
    list.push(s);
    bySet.set(key, list);
  }

  return Array.from(bySet.entries()).map(([setId, list]) => {
    // Count by unique share data so duplicate drops aren't double-counted.
    const droppedCount = new Set(list.map(s => s.data)).size;
    const ref = list.find(s => s.threshold !== null);
    return {
      setId,
      droppedCount,
      threshold: ref?.threshold ?? null,
      total: ref?.total ?? null,
    };
  });
}
