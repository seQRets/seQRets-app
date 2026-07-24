/**
 * SLIP-39 share detection & validation (SatoshiLabs SLIP-0039).
 *
 * Trezor Suite's default backup is now a single 20-word SLIP-39 share, and
 * advanced setups produce 20- or 33-word shares in K-of-N groups. This module
 * lets seQRets RECOGNIZE and CHECKSUM-VALIDATE those phrases — it deliberately
 * does NOT implement SLIP-39 secret splitting/combining. A validated phrase is
 * stored as plain text in the encrypted payload (no format change, so the
 * seQRets-Recover lifeboat needs no update).
 *
 * Validation follows the reference implementation (trezor/python-shamir-mnemonic
 * share.py::from_mnemonic) exactly:
 *   1. every word must be in the 1024-word SLIP-39 wordlist (distinct from BIP-39)
 *   2. length ≥ 20 words, and value-section padding (10·valueWords mod 16) ≤ 8
 *   3. RS1024 checksum over ALL word indices, customization string "shamir"
 *      (or "shamir_extendable" when the extendable backup flag bit is set)
 *   4. padding bits must be zero
 *   5. group threshold ≤ group count
 *
 * The wordlist below is embedded verbatim from the official source
 * (trezor/python-shamir-mnemonic wordlist.txt, cross-checked byte-identical
 * against satoshilabs/slips slip-0039/wordlist.txt).
 *
 * Word counts never collide with BIP-39 (12/15/18/21/24 vs 20/33), so callers
 * should try BIP-39 first (tryGetEntropy) and fall back to detectSlip39.
 */

const SLIP39_WORDS_RAW = 'academic acid acne acquire acrobat activity actress adapt adequate adjust admit adorn adult advance advocate afraid again agency agree aide aircraft airline airport ajar alarm album alcohol alien alive alpha already alto aluminum always amazing ambition amount amuse analysis anatomy ancestor ancient angel angry animal answer antenna anxiety apart aquatic arcade arena argue armed artist artwork aspect auction august aunt average aviation avoid award away axis axle beam beard beaver become bedroom behavior being believe belong benefit best beyond bike biology birthday bishop black blanket blessing blimp blind blue body bolt boring born both boundary bracelet branch brave breathe briefing broken brother browser bucket budget building bulb bulge bumpy bundle burden burning busy buyer cage calcium camera campus canyon capacity capital capture carbon cards careful cargo carpet carve category cause ceiling center ceramic champion change charity check chemical chest chew chubby cinema civil class clay cleanup client climate clinic clock clogs closet clothes club cluster coal coastal coding column company corner costume counter course cover cowboy cradle craft crazy credit cricket criminal crisis critical crowd crucial crunch crush crystal cubic cultural curious curly custody cylinder daisy damage dance darkness database daughter deadline deal debris debut decent decision declare decorate decrease deliver demand density deny depart depend depict deploy describe desert desire desktop destroy detailed detect device devote diagnose dictate diet dilemma diminish dining diploma disaster discuss disease dish dismiss display distance dive divorce document domain domestic dominant dough downtown dragon dramatic dream dress drift drink drove drug dryer duckling duke duration dwarf dynamic early earth easel easy echo eclipse ecology edge editor educate either elbow elder election elegant element elephant elevator elite else email emerald emission emperor emphasis employer empty ending endless endorse enemy energy enforce engage enjoy enlarge entrance envelope envy epidemic episode equation equip eraser erode escape estate estimate evaluate evening evidence evil evoke exact example exceed exchange exclude excuse execute exercise exhaust exotic expand expect explain express extend extra eyebrow facility fact failure faint fake false family famous fancy fangs fantasy fatal fatigue favorite fawn fiber fiction filter finance findings finger firefly firm fiscal fishing fitness flame flash flavor flea flexible flip float floral fluff focus forbid force forecast forget formal fortune forward founder fraction fragment frequent freshman friar fridge friendly frost froth frozen fumes funding furl fused galaxy game garbage garden garlic gasoline gather general genius genre genuine geology gesture glad glance glasses glen glimpse goat golden graduate grant grasp gravity gray greatest grief grill grin grocery gross group grownup grumpy guard guest guilt guitar gums hairy hamster hand hanger harvest have havoc hawk hazard headset health hearing heat helpful herald herd hesitate hobo holiday holy home hormone hospital hour huge human humidity hunting husband hush husky hybrid idea identify idle image impact imply improve impulse include income increase index indicate industry infant inform inherit injury inmate insect inside install intend intimate invasion involve iris island isolate item ivory jacket jerky jewelry join judicial juice jump junction junior junk jury justice kernel keyboard kidney kind kitchen knife knit laden ladle ladybug lair lamp language large laser laundry lawsuit leader leaf learn leaves lecture legal legend legs lend length level liberty library license lift likely lilac lily lips liquid listen literary living lizard loan lobe location losing loud loyalty luck lunar lunch lungs luxury lying lyrics machine magazine maiden mailman main makeup making mama manager mandate mansion manual marathon march market marvel mason material math maximum mayor meaning medal medical member memory mental merchant merit method metric midst mild military mineral minister miracle mixed mixture mobile modern modify moisture moment morning mortgage mother mountain mouse move much mule multiple muscle museum music mustang nail national necklace negative nervous network news nuclear numb numerous nylon oasis obesity object observe obtain ocean often olympic omit oral orange orbit order ordinary organize ounce oven overall owner paces pacific package paid painting pajamas pancake pants papa paper parcel parking party patent patrol payment payroll peaceful peanut peasant pecan penalty pencil percent perfect permit petition phantom pharmacy photo phrase physics pickup picture piece pile pink pipeline pistol pitch plains plan plastic platform playoff pleasure plot plunge practice prayer preach predator pregnant premium prepare presence prevent priest primary priority prisoner privacy prize problem process profile program promise prospect provide prune public pulse pumps punish puny pupal purchase purple python quantity quarter quick quiet race racism radar railroad rainbow raisin random ranked rapids raspy reaction realize rebound rebuild recall receiver recover regret regular reject relate remember remind remove render repair repeat replace require rescue research resident response result retailer retreat reunion revenue review reward rhyme rhythm rich rival river robin rocky romantic romp roster round royal ruin ruler rumor sack safari salary salon salt satisfy satoshi saver says scandal scared scatter scene scholar science scout scramble screw script scroll seafood season secret security segment senior shadow shaft shame shaped sharp shelter sheriff short should shrimp sidewalk silent silver similar simple single sister skin skunk slap slavery sled slice slim slow slush smart smear smell smirk smith smoking smug snake snapshot sniff society software soldier solution soul source space spark speak species spelling spend spew spider spill spine spirit spit spray sprinkle square squeeze stadium staff standard starting station stay steady step stick stilt story strategy strike style subject submit sugar suitable sunlight superior surface surprise survive sweater swimming swing switch symbolic sympathy syndrome system tackle tactics tadpole talent task taste taught taxi teacher teammate teaspoon temple tenant tendency tension terminal testify texture thank that theater theory therapy thorn threaten thumb thunder ticket tidy timber timely ting tofu together tolerate total toxic tracks traffic training transfer trash traveler treat trend trial tricycle trip triumph trouble true trust twice twin type typical ugly ultimate umbrella uncover undergo unfair unfold unhappy union universe unkind unknown unusual unwrap upgrade upstairs username usher usual valid valuable vampire vanish various vegan velvet venture verdict verify very veteran vexed victim video view vintage violence viral visitor visual vitamins vocal voice volume voter voting walnut warmth warn watch wavy wealthy weapon webcam welcome welfare western width wildlife window wine wireless wisdom withdraw wits wolf woman work worthy wrap wrist writing wrote year yelp yield yoga zero';

/** The official 1024-word SLIP-39 wordlist. */
export const SLIP39_WORDLIST: readonly string[] = SLIP39_WORDS_RAW.split(' ');

const WORD_INDEX = new Map<string, number>(SLIP39_WORDLIST.map((w, i) => [w, i]));

// ── Layout constants (share.py / constants.py) ─────────────────────
const ID_EXP_LENGTH_WORDS = 2;      // 15-bit id + 1-bit extendable flag + 4-bit iteration exponent
const CHECKSUM_LENGTH_WORDS = 3;
const METADATA_LENGTH_WORDS = ID_EXP_LENGTH_WORDS + 2 + CHECKSUM_LENGTH_WORDS; // 7
const MIN_MNEMONIC_LENGTH_WORDS = 20;

// Real-world SLIP-39 share lengths (128-bit and 256-bit master secrets — the
// only sizes Trezor produces). Used to decide whether failing input "looks
// like" SLIP-39 so the UI can warn about a typo instead of a format mismatch.
const COMMON_WORD_COUNTS = [33, 20]; // longest first for greedy chunking

// ── RS1024 checksum (rs1024.py, verbatim constants) ────────────────
const GEN = [
  0xe0e040, 0x1c1c080, 0x3838100, 0x7070200, 0xe0e0009,
  0x1c0c2412, 0x38086c24, 0x3090fc48, 0x21b1f890, 0x3f3f120,
];

function rs1024Polymod(values: number[]): number {
  let chk = 1;
  for (const v of values) {
    const b = chk >> 20;
    chk = ((chk & 0xfffff) << 10) ^ v;
    for (let i = 0; i < 10; i++) {
      if ((b >> i) & 1) chk ^= GEN[i];
    }
  }
  return chk;
}

function customizationValues(extendable: boolean): number[] {
  const cs = extendable ? 'shamir_extendable' : 'shamir';
  return Array.from(cs, c => c.charCodeAt(0));
}

function rs1024VerifyChecksum(indices: number[], extendable: boolean): boolean {
  return rs1024Polymod([...customizationValues(extendable), ...indices]) === 1;
}

// ── Share validation ───────────────────────────────────────────────

export interface Slip39Share {
  /** The normalized words of the share, in order. */
  words: string[];
  /** 15-bit random identifier shared by all shares of a set. */
  identifier: number;
  /** Extendable-backup flag (Trezor default since 2024). */
  extendable: boolean;
  iterationExponent: number;
  groupIndex: number;
  /** 1-based: how many groups must contribute (1 for simple backups). */
  groupThreshold: number;
  /** 1-based: total number of groups. */
  groupCount: number;
  memberIndex: number;
  /** 1-based: shares needed within this group (1 = single-share backup). */
  memberThreshold: number;
}

/**
 * Validate a single SLIP-39 share mnemonic. Returns the parsed share on
 * success, or null on any failure (unknown word, bad length, bad padding,
 * bad checksum, inconsistent group parameters).
 */
export function validateSlip39Share(mnemonic: string): Slip39Share | null {
  const words = mnemonic.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length < MIN_MNEMONIC_LENGTH_WORDS) return null;

  const indices: number[] = [];
  for (const w of words) {
    const idx = WORD_INDEX.get(w);
    if (idx === undefined) return null;
    indices.push(idx);
  }

  const valueWordCount = words.length - METADATA_LENGTH_WORDS;
  const paddingLen = (10 * valueWordCount) % 16;
  if (paddingLen > 8) return null;

  // id (15 bits) | extendable flag (1 bit) | iteration exponent (4 bits)
  const idExpInt = indices[0] * 1024 + indices[1];
  const identifier = idExpInt >> 5;
  const extendable = ((idExpInt >> 4) & 1) === 1;
  const iterationExponent = idExpInt & 0xf;

  if (!rs1024VerifyChecksum(indices, extendable)) return null;

  // group index | group threshold-1 | group count-1 | member index | member threshold-1
  const shareParamsInt = indices[2] * 1024 + indices[3];
  const groupIndex = (shareParamsInt >> 16) & 0xf;
  const groupThreshold = ((shareParamsInt >> 12) & 0xf) + 1;
  const groupCount = ((shareParamsInt >> 8) & 0xf) + 1;
  const memberIndex = (shareParamsInt >> 4) & 0xf;
  const memberThreshold = (shareParamsInt & 0xf) + 1;

  if (groupCount < groupThreshold) return null;

  // Padding bits (the top `paddingLen` bits of the first value word) must be
  // zero — equivalent to the reference implementation's OverflowError check.
  if (paddingLen > 0) {
    const firstValueWord = indices[ID_EXP_LENGTH_WORDS + 2];
    if (firstValueWord >> (10 - paddingLen) !== 0) return null;
  }

  return {
    words,
    identifier,
    extendable,
    iterationExponent,
    groupIndex,
    groupThreshold,
    groupCount,
    memberIndex,
    memberThreshold,
  };
}

// ── Multi-share detection over free text ───────────────────────────

export type Slip39Detection =
  /** Every phrase validated — `shares` holds one entry per share found. */
  | { status: 'valid'; shares: Slip39Share[] }
  /** Input is SLIP-39-shaped (20/33 words, all from the SLIP-39 wordlist) but fails validation — almost certainly a typo. */
  | { status: 'checksum-fail' }
  /** Input does not look like SLIP-39 at all. */
  | { status: 'not-slip39' };

/** Greedily partition a flat word stream into consecutive valid SLIP-39 shares (longest first). */
function greedyChunkShares(words: string[]): Slip39Share[] | null {
  const shares: Slip39Share[] = [];
  let i = 0;
  while (i < words.length) {
    let found = false;
    for (const count of COMMON_WORD_COUNTS) {
      if (i + count <= words.length) {
        const share = validateSlip39Share(words.slice(i, i + count).join(' '));
        if (share) {
          shares.push(share);
          i += count;
          found = true;
          break;
        }
      }
    }
    if (!found) return null;
  }
  return shares.length > 0 ? shares : null;
}

/**
 * Detect SLIP-39 share(s) in free text. Mirrors tryGetEntropy's philosophy:
 * honor the user's line grouping first (one share per line), then fall back
 * to a greedy scan over the whole word stream.
 */
export function detectSlip39(text: string): Slip39Detection {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { status: 'not-slip39' };

  // 1) Prefer per-line: every non-empty line must be a valid share.
  const perLine: Slip39Share[] = [];
  let allLinesValid = true;
  for (const line of lines) {
    const share = validateSlip39Share(line);
    if (share) perLine.push(share);
    else { allLinesValid = false; break; }
  }
  if (allLinesValid && perLine.length > 0) return { status: 'valid', shares: perLine };

  // 2) Greedy scan over the whole stream (shares wrapped across lines, or
  //    several shares on one line).
  const allWords = text.toLowerCase().split(/\s+/).filter(Boolean);
  const greedy = greedyChunkShares(allWords);
  if (greedy) return { status: 'valid', shares: greedy };

  // 3) Not valid — but does it LOOK like SLIP-39? If every line has a
  //    real-world share length and every word is from the SLIP-39 wordlist,
  //    the most likely explanation is a mistyped word.
  const looksShaped = lines.every(line => {
    const ws = line.toLowerCase().split(/\s+/).filter(Boolean);
    return (COMMON_WORD_COUNTS as number[]).includes(ws.length) && ws.every(w => WORD_INDEX.has(w));
  });
  return looksShaped ? { status: 'checksum-fail' } : { status: 'not-slip39' };
}
