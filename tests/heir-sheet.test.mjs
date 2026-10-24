// seQRets — heir sheets and the password letter.
//
// A sheet opens nothing on its own. It never names the other people who
// hold Qards, never says where any Qard is, and never prints a password,
// seed, PIN, Qard or the Locker's key. These tests hold those rules against
// a real Locker.

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

import {
  createLocker,
  createBlankPlan,
  createHeirSheetRecipient,
  lockerFileName,
  heirSheetPage,
  passwordLetterPage,
  heirSheetsPdfFileName,
  RECOVER_HOSTED_URL,
} from '@seqrets/crypto';

const PASSWORD = 'correct horse battery staple 42!';

const pageText = (page) => [
  page.title, page.subtitle,
  ...page.blocks.flatMap((b) => [b.heading, ...b.items]),
  ...(page.fields ?? []).map((f) => f.label),
  ...(page.closing ?? []),
].join('\n');

describe('heir sheets', () => {
  let created;
  let sam;
  let pat;
  let lee;
  const SEED = 'abandon ability able about above absent absorb abstract absurd abuse access accident';

  before(async () => {
    const plan = createBlankPlan();
    plan.planInfo.preparedBy = 'Alex Doe';
    plan.digitalAssets[0].recoverySeed = SEED;
    created = await createLocker({ plan, password: PASSWORD, totalShares: 3, requiredShares: 2 });
    sam = { ...createHeirSheetRecipient('Sam Doe'), qardNumber: 1 };
    pat = { ...createHeirSheetRecipient('Pat Doe'), qardNumber: 2 };
    lee = createHeirSheetRecipient('Lee Doe');
  });

  const sheetFor = (recipient, over = {}) => heirSheetPage({
    recipient,
    sheets: { lockerLocation: 'In my iCloud Drive, in the "seQRets" folder.', passwordLetterLocation: 'With our attorney.' },
    ownerName: 'Alex Doe',
    requiredShares: 2,
    totalShares: 3,
    lockerFileName: lockerFileName(created.qards.setId),
    keyfileUsed: false,
    date: '2026-10-24',
    ...over,
  });

  it('tells the reader which Qard they hold, what is needed and where things are', () => {
    const text = pageText(sheetFor(pat));
    assert.match(text, /Heir Sheet for Pat Doe/);
    assert.match(text, /From Alex Doe · 2026-10-24/);
    assert.match(text, /You hold Qard #2\./);
    assert.match(text, /Any 2 of the 3 Qards/);
    assert.match(text, /In my iCloud Drive, in the "seQRets" folder\./);
    assert.match(text, /With our attorney\./);
    assert.ok(text.includes(lockerFileName(created.qards.setId)));
    assert.ok(text.includes(RECOVER_HOSTED_URL));
    assert.doesNotMatch(text, /keyfile/i);
  });

  it('never names the other people on the list', () => {
    for (const [reader, others] of [[sam, [pat, lee]], [pat, [sam, lee]], [lee, [sam, pat]]]) {
      const text = pageText(sheetFor(reader));
      for (const other of others) assert.ok(!text.includes(other.name), `${reader.name}'s sheet names ${other.name}`);
    }
  });

  it('never prints the password, a Qard, the key or anything from inside the Locker', () => {
    for (const r of [sam, pat, lee]) {
      const text = pageText(sheetFor(r));
      assert.ok(!text.includes(PASSWORD));
      assert.ok(!text.includes(created.key));
      assert.ok(!text.includes(SEED.split(' ').slice(0, 3).join(' ')));
      for (const qard of created.qards.shares) assert.ok(!text.includes(qard.slice(0, 40)));
      assert.doesNotMatch(text, /seQRets\|/);
    }
  });

  it('covers someone without a Qard, an all-Qards set, a keyfile and blank details', () => {
    const text = pageText(sheetFor({ ...lee, name: '' }, {
      ownerName: '', requiredShares: 3, keyfileUsed: true,
      sheets: { lockerLocation: '', passwordLetterLocation: '' },
    }));
    assert.match(text, /^Heir Sheet\n2026-10-24/);
    assert.match(text, /You don't hold a Qard/);
    assert.match(text, /All 3 Qards/);
    assert.match(text, /The keyfile\. The password letter says where it is\./);
    assert.match(text, /The Locker file: Not written down\./);
    assert.match(text, /Someone close to you used seQRets/);
  });
});

describe('password letter', () => {
  it('is blank: lines to write on, never the password itself', () => {
    const page = passwordLetterPage({ lockerFileName: 'seQRets-Locker-c6DrIxFm.json', keyfileUsed: false });
    assert.equal(page.subtitle, 'For the Locker file seQRets-Locker-c6DrIxFm.json');
    assert.deepEqual(page.fields.map((f) => f.label), ['Password', 'Smart card PINs, if you use smart cards']);
    assert.ok(page.fields.every((f) => f.lines > 0));
    assert.match(pageText(page), /by hand/);
  });

  it('asks where the keyfile is when the Qards need one', () => {
    const page = passwordLetterPage({ lockerFileName: 'x.json', keyfileUsed: true });
    assert.ok(page.fields.some((f) => f.label === 'Where the keyfile is'));
  });

  it('suggests a PDF name from the set ID', () => {
    assert.equal(heirSheetsPdfFileName('c6Dr/IxFm'), 'seQRets-Heir-Sheets-c6DrIxFm.pdf');
  });
});
