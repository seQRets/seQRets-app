// seQRets — inheritance plan model: serializer and the v1 → current
// migration chain.
//
// The migration chain decides whether an heir's years-old encrypted plan
// still opens, so every historical shape is replayed here. The fixtures
// below are the plan shapes the app actually wrote at each version, taken
// from createBlankPlan() in git history (v1 a470740, v2 386c97f, v4 2f3802d,
// v5 b1096e5, v6 5df7015), filled with throwaway values. v3 never shipped its own
// version number; its shape is covered by the v2 → v4 step.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  INHERITANCE_PLAN_VERSION,
  INHERITANCE_PLAN_FILENAME,
  INHERITANCE_PLAN_FILETYPE,
  createBlankPlan,
  createBlankSecretSet,
  createBlankDigitalAsset,
  createBlankMultisigKey,
  createBlankOtherSecret,
  createPlanDocument,
  checkDocumentFits,
  base64DecodedBytes,
  planDocumentsBytes,
  PLAN_DOCUMENT_MAX_BYTES,
  PLAN_DOCUMENTS_MAX_TOTAL_BYTES,
  planFileLastName,
  planToRawInstruction,
  isInheritancePlan,
  rawInstructionToPlan,
  encryptInstructions,
  decryptInstructions,
} from '@seqrets/crypto';

const PASSWORD = 'a throwaway test password, not a real one';

/** Wrap a raw plan object the way the app stores it (envelope + base64 JSON). */
const wrap = (obj) => ({
  fileName: INHERITANCE_PLAN_FILENAME,
  fileContent: Buffer.from(JSON.stringify(obj), 'utf8').toString('base64'),
  fileType: INHERITANCE_PLAN_FILETYPE,
});

const asset = (extra = {}) => ({
  id: 'asset-1', name: 'Fixture wallet', type: 'Bitcoin', platform: 'Hardware wallet',
  loginEmail: '', approxValue: '1 BTC', twoFactorMethod: '', recoverySeed: 'abandon … about',
  specialInstructions: 'Native SegWit', ...extra,
});

const qardLocations = [
  { id: 'q1', qardNumber: 1, location: 'Home safe', heldBy: 'Me', accessNotes: '' },
  { id: 'q2', qardNumber: 2, location: 'Bank box', heldBy: 'Sister', accessNotes: 'Key in drawer' },
];

const contacts = [{ id: 'c1', role: 'Estate Attorney', name: 'Pat Fixture', phone: '555-0100', email: '' }];

// ── historical shapes ────────────────────────────────────────────────

const V1 = {
  version: 1,
  planInfo: { preparedBy: 'Sam Fixture', dateCreated: '2025-01-02', lastUpdated: '2025-03-04', reviewSchedule: 'Every 6 months' },
  recoveryCredentials: { password: 'v1-password', keyfilePrimaryLocation: 'USB in safe', keyfileBackupLocation: 'Bank box' },
  qardConfig: { configuration: '2-of-3', label: 'Main', locations: qardLocations },
  digitalAssets: [asset()],
  howToRestore: 'v1 steps',
  professionalContacts: contacts,
  personalMessage: 'Hello from v1 — ünïcode ✓',
};

const V2 = {
  ...V1,
  version: 2,
  deviceAccounts: [{ id: 'd1', label: 'Laptop', type: 'Computer', location: 'Desk', username: 'sam', password: 'pw', notes: '' }],
};

const V4 = {
  version: 4,
  planInfo: { preparedBy: 'Sam Fixture', dateCreated: '2025-05-06', lastUpdated: '', reviewSchedule: 'Every 6 months', planVersion: '1.0', changeLog: 'first' },
  beneficiaries: [{ id: 'b1', name: 'Alex', relationship: 'Child', contactInfo: '', assignedAssets: 'All' }],
  distributionInstructions: 'Split evenly',
  secretSets: [{
    id: 's1', description: 'Main seed', password: 'v4-password',
    keyfilePrimaryLocation: '', keyfileBackupLocation: '', configuration: '2-of-3', label: 'Main',
    qardLocations, vaultFileLocation: '', smartCardPin: '', smartCardReaderModel: '',
  }],
  deviceAccounts: [],
  digitalAssets: [asset()],
  howToRestore: 'v4 steps',
  professionalContacts: contacts,
  emergencyAccess: { emergencyContact: 'Alex', triggerConditions: '', accessProcedure: '', immediateActions: '', scopeLimitations: '' },
  personalMessage: '',
};

const V5 = {
  ...V4,
  version: 5,
  planInfo: { ...V4.planInfo, lastUpdated: '2025-07-08', lastReviewedAt: '2025-07-01' },
};

const V6 = {
  ...V5,
  version: 6,
  secretSets: [{ ...V5.secretSets[0], passwordIsHint: true, keyfileUsed: 'no' }],
  digitalAssets: [asset({
    walletKind: 'Multisig', usesPassphrase: 'yes', derivationPath: "m/48'/0'/0'/2'",
    multisigDescriptorLocation: 'USB in safe', multisigCosigners: 'Me, sister, attorney',
  })],
};

// ── tests ────────────────────────────────────────────────────────────

describe('blank plan', () => {
  it('is the current version with unique ids', () => {
    const plan = createBlankPlan();
    assert.equal(plan.version, INHERITANCE_PLAN_VERSION);
    const ids = JSON.stringify(plan).match(/"id":"[^"]+"/g);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(createBlankSecretSet().qardLocations.length, 3);
  });
});

describe('planFileLastName', () => {
  it('takes the last word of "Prepared by", file-name safe', () => {
    assert.equal(planFileLastName('Sam Sample (Test Run)'), 'Run');
    assert.equal(planFileLastName('  Jo   Smith-Jones '), 'Smith-Jones');
    assert.equal(planFileLastName(''), '');
    assert.equal(planFileLastName(undefined), '');
  });
});

describe('serializer', () => {
  it('round-trips a current plan unchanged', () => {
    const plan = createBlankPlan();
    plan.personalMessage = 'Ünïcode and emoji survive 🔑 — “quotes”';
    const raw = planToRawInstruction(plan);
    assert.equal(isInheritancePlan(raw), true);
    assert.deepEqual(rawInstructionToPlan(raw), plan);
  });

  it('writes byte-identical base64 to the old desktop btoa encoder', () => {
    // The desktop used btoa over UTF-8 bytes; already-saved plans must
    // decode, and new ones must encode, exactly as before.
    const plan = createBlankPlan();
    plan.personalMessage = 'مفتاح · ключ · 鍵 · 🔐';
    const bytes = new TextEncoder().encode(JSON.stringify(plan));
    const legacy = btoa(bytes.reduce((s, b) => s + String.fromCharCode(b), ''));
    assert.equal(planToRawInstruction(plan).fileContent, legacy);
  });

  it('opens after real encryption and decryption', async () => {
    const plan = createBlankPlan();
    const enc = await encryptInstructions(planToRawInstruction(plan), PASSWORD);
    const raw = await decryptInstructions({ encryptedData: JSON.stringify(enc), password: PASSWORD });
    assert.deepEqual(rawInstructionToPlan(raw), plan);
  });

  it('is not fooled by other files or damaged content', () => {
    assert.equal(isInheritancePlan({ ...wrap(V5), fileName: 'notes.json' }), false);
    assert.equal(isInheritancePlan({ ...wrap(V5), fileType: 'text/plain' }), false);
    assert.equal(rawInstructionToPlan({ ...wrap(V5), fileContent: Buffer.from('not json').toString('base64') }), null);
    assert.equal(rawInstructionToPlan(wrap({ version: 6, planInfo: {} })), null, 'missing digitalAssets');
    assert.equal(rawInstructionToPlan(wrap({ planInfo: {}, digitalAssets: [] })), null, 'missing version');
  });
});

describe('migration chain', () => {
  const current = (raw) => {
    const plan = rawInstructionToPlan(wrap(raw));
    assert.ok(plan, 'plan should open');
    assert.equal(plan.version, INHERITANCE_PLAN_VERSION);
    return plan;
  };

  const assertV7Defaults = (plan) => {
    for (const a of plan.digitalAssets) {
      assert.equal(a.passphrase, '', 'asset.passphrase');
      assert.equal(a.multisigDescriptor, '', 'asset.multisigDescriptor');
      assert.deepEqual(a.multisigKeys, [], 'asset.multisigKeys');
    }
    assert.deepEqual(plan.otherSecrets, []);
    assert.deepEqual(plan.documents, []);
  };

  const assertV6Defaults = (plan) => {
    for (const set of plan.secretSets) {
      assert.equal(set.passwordIsHint, false);
      assert.equal(set.keyfileUsed, '');
    }
    for (const a of plan.digitalAssets) {
      for (const k of ['walletKind', 'usesPassphrase', 'derivationPath', 'multisigDescriptorLocation', 'multisigCosigners']) {
        assert.equal(a[k], '', `asset.${k}`);
      }
    }
    assertV7Defaults(plan);
  };

  it('v1: moves recovery credentials + Qard config into a secret set', () => {
    const plan = current(structuredClone(V1));
    assert.equal(plan.secretSets.length, 1);
    const set = plan.secretSets[0];
    assert.equal(set.password, 'v1-password');
    assert.equal(set.keyfilePrimaryLocation, 'USB in safe');
    assert.equal(set.keyfileBackupLocation, 'Bank box');
    assert.equal(set.configuration, '2-of-3');
    assert.equal(set.label, 'Main');
    assert.deepEqual(set.qardLocations, qardLocations);
    assert.ok(!('recoveryCredentials' in plan) && !('qardConfig' in plan), 'old fields removed');
    assert.deepEqual(plan.deviceAccounts, []);
    assert.deepEqual(plan.beneficiaries, []);
    assert.equal(plan.distributionInstructions, '');
    assert.deepEqual(plan.emergencyAccess, { emergencyContact: '', triggerConditions: '', accessProcedure: '', immediateActions: '', scopeLimitations: '' });
    assert.equal(plan.planInfo.planVersion, '');
    assert.equal(plan.planInfo.changeLog, '');
    assert.equal(plan.planInfo.lastReviewedAt, '2025-03-04', 'falls back to lastUpdated');
    assert.equal(plan.personalMessage, V1.personalMessage);
    assert.equal(plan.digitalAssets[0].recoverySeed, V1.digitalAssets[0].recoverySeed);
    assertV6Defaults(plan);
  });

  it('v2: keeps its device accounts', () => {
    const plan = current(structuredClone(V2));
    assert.deepEqual(plan.deviceAccounts, V2.deviceAccounts);
    assert.equal(plan.secretSets[0].password, 'v1-password');
    assertV6Defaults(plan);
  });

  it('v4: keeps secret sets, adds the review date (dateCreated when never updated)', () => {
    const plan = current(structuredClone(V4));
    assert.equal(plan.secretSets.length, 1);
    assert.equal(plan.secretSets[0].password, 'v4-password');
    assert.deepEqual(plan.beneficiaries, V4.beneficiaries);
    assert.equal(plan.planInfo.lastReviewedAt, '2025-05-06');
    assertV6Defaults(plan);
  });

  it('v5: keeps its review date, gains the v6 wallet fields', () => {
    const plan = current(structuredClone(V5));
    assert.equal(plan.planInfo.lastReviewedAt, '2025-07-01');
    assertV6Defaults(plan);
  });

  it('v6: keeps every v6 field, gains the empty v7 sections', () => {
    const plan = current(structuredClone(V6));
    assert.equal(plan.secretSets[0].passwordIsHint, true);
    assert.equal(plan.secretSets[0].keyfileUsed, 'no');
    const a = plan.digitalAssets[0];
    assert.equal(a.usesPassphrase, 'yes');
    assert.equal(a.multisigDescriptorLocation, 'USB in safe');
    assert.equal(a.multisigCosigners, 'Me, sister, attorney');
    assert.equal(a.derivationPath, "m/48'/0'/0'/2'");
    assertV7Defaults(plan);
    const { version, otherSecrets, documents, digitalAssets, ...rest } = plan;
    const { version: _v, digitalAssets: _d, ...v6Rest } = V6;
    assert.deepEqual(rest, v6Rest, 'nothing else changes');
  });

  it('v7: opens unchanged, with secrets, multisig keys and documents', () => {
    const plan = createBlankPlan();
    const wallet = createBlankDigitalAsset();
    wallet.passphrase = 'fixture passphrase';
    wallet.multisigDescriptor = "wsh(sortedmulti(2,[aaaaaaaa/48'/0'/0'/2']xpub…/0/*,…))";
    wallet.multisigKeys = [
      { ...createBlankMultisigKey(), label: 'Key A', heldBy: 'Me', seed: 'abandon … about', passphrase: 'key A passphrase' },
      { ...createBlankMultisigKey(), label: 'Key B', heldBy: 'Sister', seed: 'zoo … wrong', passphrase: '' },
    ];
    plan.digitalAssets = [wallet];
    plan.otherSecrets = [{ ...createBlankOtherSecret(), title: 'Safe combination', secret: '12-34-56' }];
    plan.documents = [createPlanDocument({ fileName: 'will.pdf', fileType: 'application/pdf', bytes: new Uint8Array([37, 80, 68, 70]) })];
    assert.deepEqual(current(structuredClone(plan)), plan);
  });
});

describe('documents', () => {
  it('stores the file bytes exactly', () => {
    const bytes = Uint8Array.from({ length: 1000 }, (_, i) => (i * 37) & 0xff);
    const doc = createPlanDocument({ name: 'Deed', fileName: 'deed.pdf', fileType: 'application/pdf', bytes });
    assert.equal(doc.name, 'Deed');
    assert.deepEqual(new Uint8Array(Buffer.from(doc.fileContent, 'base64')), bytes);
    assert.equal(createPlanDocument({ fileName: 'x.bin', fileType: '', bytes }).fileType, 'application/octet-stream');
  });

  it('measures base64 sizes without decoding', () => {
    for (const n of [0, 1, 2, 3, 4, 5, 1000, 1001, 1002]) {
      assert.equal(base64DecodedBytes(Buffer.alloc(n).toString('base64')), n, `${n} bytes`);
    }
  });

  it('enforces 10 MB per document and 50 MB in total', () => {
    const MB = 1024 * 1024;
    assert.equal(PLAN_DOCUMENT_MAX_BYTES, 10 * MB);
    assert.equal(PLAN_DOCUMENTS_MAX_TOTAL_BYTES, 50 * MB);
    const empty = { documents: [] };
    assert.deepEqual(checkDocumentFits(empty, 10 * MB), { ok: true });
    assert.equal(checkDocumentFits(empty, 10 * MB + 1).ok, false);
    // Fake 4 × 10 MB of documents by length only (sizes are read from base64 length).
    const tenMbB64 = 'A'.repeat((10 * MB / 3) * 4 + 4); // ≥ 10 MB
    const full = { documents: Array.from({ length: 4 }, () => ({ fileContent: tenMbB64 })) };
    assert.ok(planDocumentsBytes(full) >= 40 * MB);
    assert.equal(checkDocumentFits(full, 9 * MB).ok, true);
    const r = checkDocumentFits(full, 10 * MB);
    assert.equal(r.ok, false);
    assert.match(r.reason, /50 MB/);
  });
});
