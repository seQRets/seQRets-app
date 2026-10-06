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
  LOCKER_CONTENT_VERSION,
  createLocker,
  unlockLocker,
  saveLocker,
  createBlankPlan,
  INHERITANCE_PLAN_VERSION,
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

// ── create → unlock → save (the steps the Locker tab runs) ───────────

describe('Locker create / unlock / save', () => {
  const NOW = '2026-10-06T15:00:00.000Z';
  let created;
  let plan;

  before(async () => {
    plan = createBlankPlan();
    plan.personalMessage = 'Hello from inside a Locker 🔐';
    created = await createLocker({ plan, password: PASSWORD, totalShares: 3, requiredShares: 2, now: NOW });
  });

  it('creates a 2-of-3 set whose secret is the Locker key, and a matching file', () => {
    assert.ok(isLockerKey(created.key));
    assert.equal(created.qards.shares.length, 3);
    assert.equal(created.file.setId, created.qards.setId);
    assert.equal(created.file.seq, 1);
    assert.equal(created.file.savedAt, NOW);
    assert.equal(parseLockerFile(created.text).setId, created.qards.setId);
  });

  it('keeps a copy of its own Qards and records inside', () => {
    const c = created.content;
    assert.equal(c.contentVersion, LOCKER_CONTENT_VERSION);
    assert.deepEqual(c.qards.shares, created.qards.shares);
    assert.equal(c.qards.requiredShares, 2);
    assert.equal(c.qards.totalShares, 3);
    assert.equal(c.qards.keyfileUsed, false);
    assert.equal(c.qards.createdAt, NOW);
    assert.deepEqual(c.previousKeys, []);
  });

  it('unlocks with any 2 Qards and the password, then saves as the next version', async () => {
    const unlocked = await unlockLocker({ fileText: created.text, shares: [created.qards.shares[2], created.qards.shares[0]], password: PASSWORD });
    assert.equal(unlocked.key, created.key);
    assert.equal(unlocked.seq, 1);
    assert.equal(unlocked.editedOutsideApp, false);
    assert.deepEqual(unlocked.content.plan, plan);
    assert.deepEqual(unlocked.content.qards.shares, created.qards.shares);

    unlocked.content.plan.personalMessage = 'Edited';
    const saved = await saveLocker({ key: unlocked.key, content: unlocked.content, setId: unlocked.setId, previousSeq: unlocked.seq });
    assert.equal(saved.file.seq, 2);
    assert.equal(saved.file.setId, created.qards.setId);

    // The same Qards open the new version — the key never changes on save.
    const reopened = await openLocker(saved.text, created.key, { expectedSetId: created.qards.setId });
    assert.equal(reopened.seq, 2);
    assert.equal(reopened.content.plan.personalMessage, 'Edited');
  });

  it('upgrades an older plan stored inside a Locker', async () => {
    const old = createBlankPlan();
    old.version = 6;
    delete old.otherSecrets;
    delete old.documents;
    const content = { ...created.content, plan: old };
    const saved = await saveLocker({ key: created.key, content, setId: created.qards.setId, previousSeq: 1 });
    const unlocked = await unlockLocker({ fileText: saved.text, shares: created.qards.shares.slice(0, 2), password: PASSWORD });
    assert.equal(unlocked.content.plan.version, INHERITANCE_PLAN_VERSION);
    assert.deepEqual(unlocked.content.plan.documents, []);
  });

  it('fails on a wrong password without opening anything', async () => {
    await assert.rejects(unlockLocker({ fileText: created.text, shares: created.qards.shares.slice(0, 2), password: 'wrong password' }));
  });

  it('says "different Locker" for Qards from another Locker', async () => {
    const other = await createShares({ secret: generateLockerKey(), password: PASSWORD, totalShares: 2, requiredShares: 2 });
    await assert.rejects(
      unlockLocker({ fileText: created.text, shares: other.shares, password: PASSWORD }),
      expectLockerError('wrong-set'),
    );
  });

  it('recognizes Qards that hold a single secret', async () => {
    const single = await createShares({ secret: 'just one secret', password: PASSWORD, totalShares: 2, requiredShares: 2 });
    await assert.rejects(
      unlockLocker({ fileText: created.text, shares: single.shares, password: PASSWORD }),
      expectLockerError('not-a-locker-key'),
    );
  });

  it('refuses a non-Locker file before spending any key derivation', async () => {
    await assert.rejects(
      unlockLocker({ fileText: '{"salt":"x","data":"y"}', shares: created.qards.shares, password: PASSWORD }),
      expectLockerError('not-a-locker'),
    );
  });
});
