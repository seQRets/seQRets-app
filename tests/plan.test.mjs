// seQRets — inheritance plan model: validator and documents.
//
// The plan lives inside a Locker. There is no migration chain — the app had
// no users before plan schema v7 — so anything that is not a current plan
// must be refused, never half-read.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  INHERITANCE_PLAN_VERSION,
  createBlankPlan,
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
  validatePlan,
} from '@seqrets/crypto';

// ── tests ────────────────────────────────────────────────────────────

describe('blank plan', () => {
  it('is the current version with unique ids', () => {
    const plan = createBlankPlan();
    assert.equal(plan.version, INHERITANCE_PLAN_VERSION);
    const ids = JSON.stringify(plan).match(/"id":"[^"]+"/g);
    assert.equal(new Set(ids).size, ids.length);
    // The Locker records its own Qards; the plan has no per-secret Qard sets.
    assert.equal('secretSets' in plan, false);
    assert.match(plan.nextSteps, /Don't rush/);
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

describe('validatePlan', () => {
  const fullPlan = () => {
    const plan = createBlankPlan();
    const wallet = createBlankDigitalAsset();
    wallet.passphrase = 'fixture passphrase';
    wallet.multisigDescriptor = "wsh(sortedmulti(2,[aaaaaaaa/48'/0'/0'/2']xpub…/0/*,…))";
    wallet.multisigThreshold = '2';
    wallet.multisigTotal = '3';
    wallet.multisigKeys = [
      { ...createBlankMultisigKey(), label: 'Key A', heldBy: 'Me', seed: 'abandon … about', passphrase: 'key A passphrase' },
      { ...createBlankMultisigKey(), label: 'Key B', heldBy: 'Sister', seed: 'zoo … wrong', passphrase: '' },
    ];
    plan.digitalAssets = [wallet];
    plan.otherSecrets = [{ ...createBlankOtherSecret(), title: 'Safe combination', secret: '12-34-56' }];
    plan.documents = [createPlanDocument({ fileName: 'will.pdf', fileType: 'application/pdf', bytes: new Uint8Array([37, 80, 68, 70]) })];
    return plan;
  };

  it('accepts a current plan unchanged, with secrets, multisig keys and documents', () => {
    const plan = fullPlan();
    assert.deepEqual(validatePlan(structuredClone(plan)), plan);
  });

  it('refuses any other schema version — there is nothing to migrate', () => {
    for (const version of [1, 6, INHERITANCE_PLAN_VERSION + 1, '7', undefined]) {
      assert.equal(validatePlan({ ...fullPlan(), version }), null, `version ${version}`);
    }
  });

  it('refuses a plan missing any section', () => {
    for (const field of ['planInfo', 'emergencyAccess', 'beneficiaries', 'deviceAccounts',
      'digitalAssets', 'otherSecrets', 'documents', 'professionalContacts']) {
      const plan = fullPlan();
      delete plan[field];
      assert.equal(validatePlan(plan), null, `missing ${field}`);
    }
    assert.equal(validatePlan(null), null);
    assert.equal(validatePlan('plan'), null);
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
