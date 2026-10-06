// seQRets — Locker file helpers.
//
// Runs against the BUILT @seqrets/crypto package (dist/). Every open costs one
// Argon2id derivation (~2s), so the Locker is sealed ONCE in a `before` hook
// and the expensive cases are kept to the ones that need a real decryption.

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  createShares,
  restoreSecret,
  decryptInstructions,
  encryptInstructions,
  generateLockerKey,
  isLockerKey,
  lockerFileName,
  sealLocker,
  serializeLockerFile,
  parseLockerFile,
  isLockerFile,
  openLocker,
  LockerError,
  LOCKER_FORMAT,
  LOCKER_VERSION,
  LOCKER_KEY_PREFIX,
  LOCKER_INNER_FILENAME,
  LOCKER_INNER_FILETYPE,
} from '@seqrets/crypto';

// Throwaway test values — never a real secret.
const PASSWORD = 'a throwaway test password, not a real one';
const CONTENT = {
  letter: 'Hello from the test suite — ünïcödé ✓',
  secrets: [{ name: 'Test wallet', seed: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about' }],
};
const SET_ID = 'c6Dr/xF+';
const SAVED_AT = '2026-10-06T12:00:00.000Z';

let key;
let file;   // LockerFile object
let text;   // serialized file

before(async () => {
  key = generateLockerKey();
  file = await sealLocker({ content: CONTENT, key, setId: SET_ID, seq: 1, savedAt: SAVED_AT });
  text = serializeLockerFile(file);
});

const expectLockerError = (code) => (err) => {
  assert.ok(err instanceof LockerError, `expected LockerError, got ${err}`);
  assert.equal(err.code, code);
  return true;
};

// ── internal key ─────────────────────────────────────────────────────

describe('internal key', () => {
  it('is the labelled prefix plus 64 lowercase hex characters (32 bytes)', () => {
    assert.match(key, /^seQRets-Locker-Key:[0-9a-f]{64}$/);
    assert.ok(key.startsWith(LOCKER_KEY_PREFIX));
    assert.ok(isLockerKey(key));
  });

  it('is fresh every time', () => {
    const keys = new Set(Array.from({ length: 50 }, () => generateLockerKey()));
    assert.equal(keys.size, 50);
  });

  it('rejects anything that is not exactly a key', () => {
    const hex = key.slice(LOCKER_KEY_PREFIX.length);
    for (const bad of [
      hex,                                   // no prefix
      LOCKER_KEY_PREFIX + hex.toUpperCase(), // uppercase hex
      LOCKER_KEY_PREFIX + hex.slice(1),      // 63 chars
      key + ' ',                             // trailing space
      ' ' + key,
      'correct horse battery staple',
      '',
    ]) {
      assert.equal(isLockerKey(bad), false, `should reject ${JSON.stringify(bad)}`);
    }
  });

  it('survives an ordinary Qard set unchanged (no seed-phrase compaction)', async () => {
    const set = await createShares({ secret: key, password: PASSWORD, totalShares: 3, requiredShares: 2 });
    const restored = await restoreSecret({ shares: [set.shares[0], set.shares[2]], password: PASSWORD });
    assert.equal(restored.secret, key);
    assert.ok(isLockerKey(restored.secret));
  });
});

// ── file name ────────────────────────────────────────────────────────

describe('lockerFileName', () => {
  it('uses the set ID, dropping characters unsafe in file names', () => {
    assert.equal(lockerFileName('c6DrIxFm'), 'seQRets-Locker-c6DrIxFm.json');
    assert.equal(lockerFileName(SET_ID), 'seQRets-Locker-c6DrxF.json');
  });
});

// ── file format (no key needed) ──────────────────────────────────────

describe('Locker file format', () => {
  it('serializes the clear-text fields in a fixed order, then salt and data', () => {
    const obj = JSON.parse(text);
    assert.deepEqual(Object.keys(obj), ['format', 'v', 'setId', 'seq', 'savedAt', 'salt', 'data']);
    assert.equal(obj.format, LOCKER_FORMAT);
    assert.equal(obj.v, LOCKER_VERSION);
    assert.equal(obj.setId, SET_ID);
    assert.equal(obj.seq, 1);
    assert.equal(obj.savedAt, SAVED_AT);
  });

  it('keeps the encrypted-plan { salt, data } shape that Recover accepts', () => {
    // Recover's tryParsePlan: any JSON object with string salt and data.
    const obj = JSON.parse(text);
    assert.equal(typeof obj.salt, 'string');
    assert.equal(typeof obj.data, 'string');
    assert.equal(Buffer.from(obj.salt, 'base64').length, 16);
  });

  it('parses and is detected as a Locker', () => {
    assert.deepEqual(parseLockerFile(text), file);
    assert.equal(isLockerFile(text), true);
  });

  it('refuses things that are not Locker files', () => {
    const plan = JSON.stringify({ salt: file.salt, data: file.data }); // a plain encrypted plan
    for (const bad of ['not json', '[]', 'null', plan, JSON.stringify({ ...file, format: 'other' })]) {
      assert.throws(() => parseLockerFile(bad), expectLockerError('not-a-locker'));
      assert.equal(isLockerFile(bad), false);
    }
  });

  it('refuses damaged clear-text fields', () => {
    for (const patch of [{ salt: 1 }, { data: null }, { seq: 0 }, { seq: 1.5 }, { setId: 'short' }, { savedAt: 'yesterday' }, { v: 0 }]) {
      assert.throws(() => parseLockerFile(JSON.stringify({ ...file, ...patch })), expectLockerError('not-a-locker'));
    }
  });

  it('says "update the app" for a newer Locker version, never misreads it', () => {
    const newer = JSON.stringify({ ...file, v: LOCKER_VERSION + 1 });
    assert.throws(() => parseLockerFile(newer), expectLockerError('newer-version'));
    assert.equal(isLockerFile(newer), true, 'a newer Locker is still a Locker');
  });
});

// ── sealing ──────────────────────────────────────────────────────────

describe('sealLocker', () => {
  it('validates its inputs before encrypting', async () => {
    const ok = { content: {}, key, setId: SET_ID, seq: 1 };
    await assert.rejects(sealLocker({ ...ok, key: 'not a key' }), /Locker key/);
    await assert.rejects(sealLocker({ ...ok, setId: 'bad' }), /set ID/);
    await assert.rejects(sealLocker({ ...ok, seq: 0 }), /save counter/);
    await assert.rejects(sealLocker({ ...ok, savedAt: 'nope' }), /save date/);
  });

  it('uses the encrypt function it is given (the desktop passes its Rust path)', async () => {
    let calls = 0;
    const spy = (envelope, password) => {
      calls++;
      assert.equal(envelope.fileName, LOCKER_INNER_FILENAME);
      assert.equal(envelope.fileType, LOCKER_INNER_FILETYPE);
      assert.equal(password, key);
      return Promise.resolve({ salt: 'AAAAAAAAAAAAAAAAAAAAAA==', data: 'AA==' });
    };
    const sealed = await sealLocker({ content: {}, key, setId: SET_ID, seq: 2, savedAt: SAVED_AT }, spy);
    assert.equal(calls, 1);
    assert.equal(sealed.seq, 2);
  });
});

// ── opening (each case costs one Argon2id derivation) ────────────────

describe('openLocker', () => {
  it('round-trips the contents and metadata', async () => {
    const opened = await openLocker(text, key, { expectedSetId: SET_ID });
    assert.deepEqual(opened.content, CONTENT);
    assert.equal(opened.setId, SET_ID);
    assert.equal(opened.seq, 1);
    assert.equal(opened.savedAt, SAVED_AT);
    assert.equal(opened.editedOutsideApp, false);
  });

  it('decrypts through the plain-plan path exactly as Recover does', async () => {
    // Recover: decryptPlan({ salt, data }, password) → file envelope → JSON text.
    const envelope = await decryptInstructions({
      encryptedData: JSON.stringify({ salt: file.salt, data: file.data }),
      password: key,
    });
    assert.equal(envelope.fileName, LOCKER_INNER_FILENAME);
    assert.equal(envelope.fileType, LOCKER_INNER_FILETYPE);
    const inner = JSON.parse(Buffer.from(envelope.fileContent, 'base64').toString('utf8'));
    assert.equal(inner.format, LOCKER_FORMAT);
    assert.deepEqual(inner.content, CONTENT);
  });

  it('flags a file whose clear-text save counter was edited, trusting the inside copy', async () => {
    const edited = JSON.stringify({ ...JSON.parse(text), seq: 99 });
    const opened = await openLocker(edited, key);
    assert.equal(opened.editedOutsideApp, true);
    assert.equal(opened.seq, 1);
    assert.deepEqual(opened.content, CONTENT);
  });

  it('still opens the right file when only its clear-text set ID was edited', async () => {
    const edited = JSON.stringify({ ...JSON.parse(text), setId: 'ZZZZZZZZ' });
    const opened = await openLocker(edited, key, { expectedSetId: SET_ID });
    assert.equal(opened.editedOutsideApp, true);
    assert.equal(opened.setId, SET_ID);
  });

  it('says "different Locker" when the Qards come from another set', async () => {
    await assert.rejects(
      openLocker(text, generateLockerKey(), { expectedSetId: 'Other123' }),
      expectLockerError('wrong-set'),
    );
  });

  it('says it cannot open the file when the key is wrong for a matching set ID', async () => {
    await assert.rejects(
      openLocker(text, generateLockerKey(), { expectedSetId: SET_ID }),
      expectLockerError('cannot-open'),
    );
  });

  it('recognizes Qards that hold a single secret instead of a Locker key (no decryption)', async () => {
    await assert.rejects(openLocker(text, 'correct horse battery staple'), expectLockerError('not-a-locker-key'));
  });

  it('refuses a correctly encrypted payload that is not a Locker inside', async () => {
    const notLocker = await encryptInstructions(
      { fileName: 'notes.txt', fileContent: Buffer.from('hi').toString('base64'), fileType: 'text/plain' },
      key,
    );
    const disguised = serializeLockerFile({ ...file, salt: notLocker.salt, data: notLocker.data });
    await assert.rejects(openLocker(disguised, key), expectLockerError('not-a-locker'));
  });
});

// ── Rust → TS: a Locker sealed by the desktop app's Rust path ────────

describe('Rust-sealed Locker vector', () => {
  // Produced by crypto.rs write_rust_locker_vector (crypto_encrypt_blob,
  // unpadded) — the exact path the desktop app uses to seal a Locker.
  const vector = JSON.parse(readFileSync(
    new URL('../packages/desktop/src-tauri/tests/fixtures/rust-locker-vector.json', import.meta.url),
    'utf8',
  ));

  it('opens with the TypeScript openLocker', async () => {
    const opened = await openLocker(vector.locker_file, vector.key, { expectedSetId: vector.setId });
    assert.deepEqual(opened.content, vector.expect_content);
    assert.equal(opened.seq, 1);
    assert.equal(opened.editedOutsideApp, false);
  });
});
