// seQRets — inheritance plan model: serializer and the v1 → current
// migration chain.
//
// The migration chain decides whether an heir's years-old encrypted plan
// still opens, so every historical shape is replayed here. The fixtures
// below are the plan shapes the app actually wrote at each version, taken
// from createBlankPlan() in git history (v1 a470740, v2 386c97f, v4 2f3802d,
// v5 b1096e5), filled with throwaway values. v3 never shipped its own
// version number; its shape is covered by the v2 → v4 step.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  INHERITANCE_PLAN_VERSION,
  INHERITANCE_PLAN_FILENAME,
  INHERITANCE_PLAN_FILETYPE,
  createBlankPlan,
  createBlankSecretSet,
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

  it('v6: opens unchanged', () => {
    const plan = createBlankPlan();
    plan.secretSets[0].passwordIsHint = true;
    plan.secretSets[0].keyfileUsed = 'yes';
    plan.digitalAssets[0].usesPassphrase = 'yes';
    assert.deepEqual(current(structuredClone(plan)), plan);
  });
});
