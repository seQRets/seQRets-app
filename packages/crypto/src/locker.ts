/**
 * Locker file helpers.
 *
 * A Locker is a single encrypted file holding many secrets. It is opened by an
 * internal key — 32 random bytes — and that key is protected the ordinary way:
 * it is the "secret" inside a normal Qard set (password + Shamir split, today's
 * createShares path, v=1 Qards, no format change).
 *
 * The Locker file reuses today's encrypted-plan path unchanged
 * (encryptInstructions: gzip → Argon2id → XChaCha20-Poly1305, no padding), with
 * the internal key as the password. Its outer JSON is the plan's { salt, data }
 * plus clear-text fields, so the shipped Recover lifeboat — which accepts any
 * JSON object with string `salt` and `data` — opens it with no changes:
 * restore the Qards (Recover shows the key), then open the file with the key.
 *
 *   {
 *     "format": "seqrets-locker", "v": 1,
 *     "setId": "<set ID of the Qards>",
 *     "seq": <save counter>, "savedAt": "<ISO date>",
 *     "salt": "<base64>", "data": "<base64 nonce||ciphertext>"
 *   }
 *
 * Inside, the decrypted payload is the usual file envelope
 * ({ fileName, fileContent: base64, fileType: application/json }) wrapping
 * { format, v, setId, seq, savedAt, content }. The repeated setId/seq/savedAt
 * are authenticated; a mismatch with the clear-text copies means the file was
 * edited outside the app.
 *
 * Encryption is injectable: the TypeScript implementation is the default, and
 * the desktop app passes its Rust-backed encryptInstructions/decryptInstructions
 * (same wire format, proven by the TS↔Rust parity tests).
 */

import { randomBytes } from '@noble/hashes/utils';
import { Buffer } from 'buffer';
import { encryptInstructions, decryptInstructions, createShares, restoreSecret, parseShare } from './crypto';
import { validatePlan, INHERITANCE_PLAN_VERSION } from './plan';
import type { InheritancePlan } from './plan';
import type {
    RawInstruction,
    EncryptedInstruction,
    DecryptInstructionRequest,
    DecryptInstructionResult,
    CreateSharesRequest,
    CreateSharesResult,
    RestoreSecretRequest,
    RestoreSecretResult,
} from './types';

export const LOCKER_FORMAT = 'seqrets-locker';

/**
 * Locker file format version. Files with a higher `v` are refused with an
 * "update the app" error rather than misread.
 */
export const LOCKER_VERSION = 1;

/**
 * Prefix of the internal key's text form. The key is what an heir sees after
 * restoring the Qards in Recover, so it labels itself; the hex body keeps it
 * from ever being mistaken for (or compacted as) a BIP-39 seed phrase.
 */
export const LOCKER_KEY_PREFIX = 'seQRets-Locker-Key:';

const LOCKER_KEY_PATTERN = /^seQRets-Locker-Key:[0-9a-f]{64}$/;
const LOCKER_KEY_BYTES = 32;
const SET_ID_PATTERN = /^[A-Za-z0-9+/]{8}$/;

/** Name and type of the file envelope inside the encrypted payload. */
export const LOCKER_INNER_FILENAME = 'seQRets-Locker.json';
export const LOCKER_INNER_FILETYPE = 'application/json';

export type LockerErrorCode =
    | 'not-a-locker'      // not a Locker file at all, or malformed
    | 'newer-version'     // made by a newer app
    | 'not-a-locker-key'  // the Qards hold a single secret, not a Locker key
    | 'wrong-set'         // Qards from a different set than the file
    | 'cannot-open';      // decryption failed: wrong key or damaged file

export class LockerError extends Error {
    readonly code: LockerErrorCode;
    constructor(code: LockerErrorCode, message: string) {
        super(message);
        this.name = 'LockerError';
        this.code = code;
    }
}

export interface LockerMeta {
    /** Set ID of the Qards that open this Locker (first 8 chars of their salt). */
    setId: string;
    /** Save counter, +1 on every save. */
    seq: number;
    /** ISO 8601 time of this save. */
    savedAt: string;
}

export interface LockerFile extends LockerMeta {
    format: typeof LOCKER_FORMAT;
    v: number;
    salt: string;
    data: string;
}

export interface OpenedLocker<T> extends LockerMeta {
    /** The decrypted Locker contents. */
    content: T;
    /**
     * True when the clear-text setId/seq/savedAt differ from the authenticated
     * copies inside. The content and the returned meta are the authenticated
     * (inside) values; the app should tell the owner the file was edited.
     */
    editedOutsideApp: boolean;
}

export type LockerEncryptFn = (instructions: RawInstruction, password: string) => Promise<EncryptedInstruction>;
export type LockerDecryptFn = (request: DecryptInstructionRequest) => Promise<DecryptInstructionResult>;

/** Create a new internal key: 32 bytes from the OS CSPRNG, as labelled hex. */
export function generateLockerKey(): string {
    const bytes = randomBytes(LOCKER_KEY_BYTES);
    try {
        return LOCKER_KEY_PREFIX + Buffer.from(bytes).toString('hex');
    } finally {
        bytes.fill(0);
    }
}

/** True if `text` is exactly an internal key in its text form. */
export function isLockerKey(text: string): boolean {
    return LOCKER_KEY_PATTERN.test(text);
}

/**
 * Default file name: `seQRets-Locker-<setId>.json`. Uses the set ID, never a
 * label. Characters unsafe in file names are dropped, as for Qard file names.
 */
export function lockerFileName(setId: string): string {
    return `seQRets-Locker-${setId.replace(/[^a-zA-Z0-9_-]/g, '')}.json`;
}

function assertMeta(meta: LockerMeta): void {
    if (!SET_ID_PATTERN.test(meta.setId)) {
        throw new Error('Invalid Locker set ID.');
    }
    if (!Number.isSafeInteger(meta.seq) || meta.seq < 1) {
        throw new Error('Invalid Locker save counter.');
    }
    if (typeof meta.savedAt !== 'string' || Number.isNaN(Date.parse(meta.savedAt))) {
        throw new Error('Invalid Locker save date.');
    }
}

/**
 * Encrypt Locker contents into a Locker file object.
 * `savedAt` defaults to now. Callers increment `seq` on every save.
 */
export async function sealLocker<T>(
    args: { content: T; key: string; setId: string; seq: number; savedAt?: string },
    encrypt: LockerEncryptFn = encryptInstructions,
): Promise<LockerFile> {
    const { content, key, setId, seq } = args;
    const savedAt = args.savedAt ?? new Date().toISOString();
    if (!isLockerKey(key)) {
        throw new Error('Not a valid Locker key.');
    }
    assertMeta({ setId, seq, savedAt });

    const inner = JSON.stringify({ format: LOCKER_FORMAT, v: LOCKER_VERSION, setId, seq, savedAt, content });
    const envelope: RawInstruction = {
        fileName: LOCKER_INNER_FILENAME,
        fileContent: Buffer.from(inner, 'utf8').toString('base64'),
        fileType: LOCKER_INNER_FILETYPE,
    };
    const { salt, data } = await encrypt(envelope, key);

    return { format: LOCKER_FORMAT, v: LOCKER_VERSION, setId, seq, savedAt, salt, data };
}

/** The file's text, with fields in a fixed, readable order. */
export function serializeLockerFile(file: LockerFile): string {
    const { format, v, setId, seq, savedAt, salt, data } = file;
    return JSON.stringify({ format, v, setId, seq, savedAt, salt, data }, null, 2) + '\n';
}

/**
 * Parse and validate a Locker file's clear-text JSON (no key needed).
 * Throws LockerError('not-a-locker' | 'newer-version').
 */
export function parseLockerFile(text: string): LockerFile {
    let obj: any;
    try {
        obj = JSON.parse(text);
    } catch {
        throw new LockerError('not-a-locker', 'This file is not a seQRets Locker.');
    }
    if (!obj || typeof obj !== 'object' || obj.format !== LOCKER_FORMAT) {
        throw new LockerError('not-a-locker', 'This file is not a seQRets Locker.');
    }
    if (!Number.isSafeInteger(obj.v) || obj.v < 1) {
        throw new LockerError('not-a-locker', 'This Locker file is damaged.');
    }
    if (obj.v > LOCKER_VERSION) {
        throw new LockerError('newer-version', 'This Locker was created by a newer version of seQRets. Please update the app to open it.');
    }
    if (typeof obj.salt !== 'string' || typeof obj.data !== 'string') {
        throw new LockerError('not-a-locker', 'This Locker file is damaged.');
    }
    try {
        assertMeta(obj);
    } catch {
        throw new LockerError('not-a-locker', 'This Locker file is damaged.');
    }
    return {
        format: LOCKER_FORMAT,
        v: obj.v,
        setId: obj.setId,
        seq: obj.seq,
        savedAt: obj.savedAt,
        salt: obj.salt,
        data: obj.data,
    };
}

/** Cheap check for auto-detecting a dropped/selected file. */
export function isLockerFile(text: string): boolean {
    try {
        parseLockerFile(text);
        return true;
    } catch (e) {
        // A newer-version Locker is still a Locker; the open step explains it.
        return e instanceof LockerError && e.code === 'newer-version';
    }
}

/**
 * Open a Locker file with its internal key.
 *
 * Pass `expectedSetId` (the set ID of the Qards the key was restored from) to
 * get the clear "these Qards belong to a different Locker" error instead of a
 * failed decryption when the file and Qards don't match.
 */
export async function openLocker<T = unknown>(
    text: string,
    key: string,
    options: { expectedSetId?: string } = {},
    decrypt: LockerDecryptFn = decryptInstructions,
): Promise<OpenedLocker<T>> {
    const file = parseLockerFile(text);

    if (!isLockerKey(key)) {
        throw new LockerError('not-a-locker-key', 'These Qards hold a single secret, not a Locker key.');
    }
    // The clear-text setId is not authenticated, so a mismatch only shapes the
    // error message: decryption is still attempted, and an edited setId on the
    // right file opens normally (reported via editedOutsideApp).
    const setIdMismatch = options.expectedSetId !== undefined && options.expectedSetId !== file.setId;

    let envelope: DecryptInstructionResult;
    try {
        envelope = await decrypt({
            encryptedData: JSON.stringify({ salt: file.salt, data: file.data }),
            password: key,
        });
    } catch {
        if (setIdMismatch) {
            throw new LockerError('wrong-set', 'These Qards belong to a different Locker.');
        }
        throw new LockerError('cannot-open', 'This Locker file could not be opened. It may be damaged, or it belongs to a different set of Qards.');
    }

    let inner: any;
    try {
        if (envelope.fileName !== LOCKER_INNER_FILENAME || envelope.fileType !== LOCKER_INNER_FILETYPE) {
            throw new Error('unexpected envelope');
        }
        inner = JSON.parse(Buffer.from(envelope.fileContent, 'base64').toString('utf8'));
        if (!inner || inner.format !== LOCKER_FORMAT || !Number.isSafeInteger(inner.v)) {
            throw new Error('unexpected inner format');
        }
    } catch {
        throw new LockerError('not-a-locker', 'This Locker file is damaged.');
    }
    if (inner.v > LOCKER_VERSION) {
        throw new LockerError('newer-version', 'This Locker was created by a newer version of seQRets. Please update the app to open it.');
    }
    try {
        assertMeta(inner);
    } catch {
        throw new LockerError('not-a-locker', 'This Locker file is damaged.');
    }

    const editedOutsideApp =
        inner.setId !== file.setId || inner.seq !== file.seq || inner.savedAt !== file.savedAt;

    return {
        setId: inner.setId,
        seq: inner.seq,
        savedAt: inner.savedAt,
        content: inner.content as T,
        editedOutsideApp,
    };
}

// ── Locker contents and the create / unlock / save steps ─────────────
//
// What a Locker holds: the owner's plan, plus the Locker's own records.
// The records are bookkeeping the app needs later — they are safe inside
// the Locker because anyone who can open it already has everything the
// Qards protect.

export const LOCKER_CONTENT_VERSION = 1;

/** The Qard set that opens this Locker. A copy of each Qard enables exact reprints. */
export interface LockerQardSet {
    setId: string;
    requiredShares: number;
    totalShares: number;
    /** Every Qard of the set, exactly as made (for reprints). */
    shares: string[];
    /** ISO time the Qards were made. */
    createdAt: string;
    /** Whether the Qards need a keyfile as well as the password. */
    keyfileUsed: boolean;
}

/** An internal key from an earlier Qard set (password change / new set), kept so past versions still open. */
export interface RetiredLockerKey {
    key: string;
    setId: string;
    retiredAt: string;
}

export interface LockerContent {
    contentVersion: number;
    plan: InheritancePlan;
    qards: LockerQardSet;
    previousKeys: RetiredLockerKey[];
}

/** The crypto steps a Locker needs. Desktop passes its Rust-backed versions. */
export interface LockerCrypto {
    createShares: (request: CreateSharesRequest) => Promise<CreateSharesResult>;
    restoreSecret: (request: RestoreSecretRequest) => Promise<RestoreSecretResult>;
    encryptInstructions: LockerEncryptFn;
    decryptInstructions: LockerDecryptFn;
}

/** The TypeScript implementation (tests, Recover fixtures). */
export const tsLockerCrypto: LockerCrypto = { createShares, restoreSecret, encryptInstructions, decryptInstructions };

export interface CreatedLocker {
    /** The internal key. Held in memory only while the Locker is open. */
    key: string;
    /** The new Qards, for printing / saving (QrCodeDisplay). */
    qards: CreateSharesResult;
    content: LockerContent;
    file: LockerFile;
    /** The Locker file's text, ready to save. */
    text: string;
}

/**
 * Create a Locker: make a fresh internal key, protect it with an ordinary
 * Qard set (password [+ keyfile], K-of-N), and seal the plan with it.
 */
export async function createLocker(
    args: {
        plan: InheritancePlan;
        password: string;
        keyfile?: string;
        totalShares: number;
        requiredShares: number;
        now?: string;
    },
    crypto: LockerCrypto = tsLockerCrypto,
): Promise<CreatedLocker> {
    const now = args.now ?? new Date().toISOString();
    const key = generateLockerKey();
    const qards = await crypto.createShares({
        secret: key,
        password: args.password,
        keyfile: args.keyfile,
        totalShares: args.totalShares,
        requiredShares: args.requiredShares,
        embedRecoveryInfo: true,
    });
    const content: LockerContent = {
        contentVersion: LOCKER_CONTENT_VERSION,
        plan: args.plan,
        qards: {
            setId: qards.setId,
            requiredShares: qards.requiredShares,
            totalShares: qards.totalShares,
            shares: [...qards.shares],
            createdAt: now,
            keyfileUsed: !!args.keyfile,
        },
        previousKeys: [],
    };
    const file = await sealLocker({ content, key, setId: qards.setId, seq: 1, savedAt: now }, crypto.encryptInstructions);
    return { key, qards, content, file, text: serializeLockerFile(file) };
}

export interface UnlockedLocker extends LockerMeta {
    key: string;
    content: LockerContent;
    /** True when the file's clear-text fields were edited outside the app. */
    editedOutsideApp: boolean;
}

/** Validate decrypted Locker contents. */
function toLockerContent(raw: any): LockerContent {
    if (!raw || typeof raw !== 'object' || !Number.isSafeInteger(raw.contentVersion)) {
        throw new LockerError('not-a-locker', 'This Locker file is damaged.');
    }
    if (raw.contentVersion > LOCKER_CONTENT_VERSION) {
        throw new LockerError('newer-version', 'This Locker was created by a newer version of seQRets. Please update the app to open it.');
    }
    if (raw.plan && Number.isSafeInteger(raw.plan.version) && raw.plan.version > INHERITANCE_PLAN_VERSION) {
        throw new LockerError('newer-version', 'This Locker was created by a newer version of seQRets. Please update the app to open it.');
    }
    const plan: InheritancePlan | null = validatePlan(raw.plan);
    const q = raw.qards;
    if (!plan || !q || typeof q.setId !== 'string' || !Array.isArray(q.shares)) {
        throw new LockerError('not-a-locker', 'This Locker file is damaged.');
    }
    return {
        contentVersion: LOCKER_CONTENT_VERSION,
        plan,
        qards: q,
        previousKeys: Array.isArray(raw.previousKeys) ? raw.previousKeys : [],
    };
}

/**
 * Open a Locker with Qards and the password (+ keyfile): restore the
 * internal key from the Qards, then open the file with it.
 */
export async function unlockLocker(
    args: { fileText: string; shares: string[]; password: string; keyfile?: string },
    crypto: LockerCrypto = tsLockerCrypto,
): Promise<UnlockedLocker> {
    // Cheap checks first: no Argon2id spent on a file that isn't a Locker.
    parseLockerFile(args.fileText);
    if (args.shares.length === 0) {
        throw new Error('Add the Qards that open this Locker.');
    }
    const expectedSetId = parseShare(args.shares[0]).salt.substring(0, 8);

    const restored = await crypto.restoreSecret({ shares: args.shares, password: args.password, keyfile: args.keyfile });
    const key = restored.secret;
    if (!isLockerKey(key)) {
        throw new LockerError('not-a-locker-key', 'These Qards hold a single secret, not a Locker key.');
    }

    const opened = await openLocker<unknown>(args.fileText, key, { expectedSetId }, crypto.decryptInstructions);
    return {
        key,
        setId: opened.setId,
        seq: opened.seq,
        savedAt: opened.savedAt,
        content: toLockerContent(opened.content),
        editedOutsideApp: opened.editedOutsideApp,
    };
}

/** Save edited contents: same key, save counter +1, new date. */
export async function saveLocker(
    args: { key: string; content: LockerContent; setId: string; previousSeq: number; now?: string },
    crypto: LockerCrypto = tsLockerCrypto,
): Promise<{ file: LockerFile; text: string }> {
    const file = await sealLocker(
        { content: args.content, key: args.key, setId: args.setId, seq: args.previousSeq + 1, savedAt: args.now },
        crypto.encryptInstructions,
    );
    return { file, text: serializeLockerFile(file) };
}
