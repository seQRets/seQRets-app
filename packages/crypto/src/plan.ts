// ── Inheritance Plan ────────────────────────────────────────────────
// The data model for the in-app inheritance plan builder, plus the
// serializer and the v1→current migration chain. Plans are serialized to
// JSON, encrypted via the existing encryptInstructions pipeline, and stored
// on smart card or file.
//
// Lives in @seqrets/crypto (not the desktop app) so the migration chain —
// which decides whether an heir's years-old plan still opens — is covered
// by `npm test`. Pure: no DOM, no React.

import { Buffer } from 'buffer';
import type { RawInstruction } from './types';

export const INHERITANCE_PLAN_VERSION = 7;
export const INHERITANCE_PLAN_FILENAME = 'inheritance-plan.json';
export const INHERITANCE_PLAN_FILETYPE = 'application/json';

export interface PlanInfo {
  preparedBy: string;
  dateCreated: string;
  lastUpdated: string;
  /**
   * ISO date (YYYY-MM-DD) of the last time the user explicitly confirmed
   * the plan was reviewed. Distinct from `lastUpdated`, which tracks the
   * last edit. This is the authoritative "cold storage" copy of the review
   * timestamp — the sidecar in app data is a cache that can be rebuilt
   * from this field when missing. Introduced in plan schema v5.
   */
  lastReviewedAt: string;
  reviewSchedule: string;
  planVersion: string;
  changeLog: string;
}

export interface Beneficiary {
  id: string;
  name: string;
  relationship: string;
  contactInfo: string;
  assignedAssets: string;
}

export interface QardLocation {
  id: string;
  qardNumber: number;
  location: string;
  heldBy: string;
  accessNotes: string;
}

/** A single secret protected by seQRets — password, keyfile, Qard locations, and smart card info. */
export interface SecretSet {
  id: string;
  description: string;
  password: string;
  /**
   * v6: true when the `password` field holds a hint rather than the actual
   * password. Disambiguates for heirs — typing a hint verbatim as the
   * password fails with an error indistinguishable from a wrong password.
   */
  passwordIsHint: boolean;
  /**
   * v6: explicit keyfile usage — '' = not specified (legacy plans),
   * 'yes' / 'no'. Removes the blank-field ambiguity: without this, a
   * missing keyfile fails decryption with what looks like a wrong-password
   * error, and heirs cannot tell whether a keyfile was ever involved.
   */
  keyfileUsed: '' | 'yes' | 'no';
  keyfilePrimaryLocation: string;
  keyfileBackupLocation: string;
  configuration: string;
  label: string;
  qardLocations: QardLocation[];
  vaultFileLocation: string;
  smartCardPin: string;
  smartCardReaderModel: string;
}

export interface DigitalAsset {
  id: string;
  name: string;
  type: string;
  platform: string;
  loginEmail: string;
  approxValue: string;
  twoFactorMethod: string;
  recoverySeed: string;
  /** v6: single-sig / multisig / hardware wallet / custodial exchange / other. */
  walletKind: string;
  /**
   * v6: whether the wallet uses an added BIP-39 passphrase ("25th word").
   * '' = not specified, 'yes' / 'no'. A seed restored without its
   * passphrase opens an EMPTY wallet — the most common self-inflicted
   * inheritance loss in self-custody. The question itself is the guard.
   */
  usesPassphrase: '' | 'yes' | 'no';
  /** v6: derivation path / script type (e.g. Native SegWit, m/84'/0'/0'). */
  derivationPath: string;
  /** v6: where the multisig wallet descriptor / config file is stored. */
  multisigDescriptorLocation: string;
  /** v6: who holds which key in a multisig setup (free text, kept for older plans). */
  multisigCosigners: string;
  /**
   * v7: the BIP-39 passphrase itself (single-sig). A Locker holds secrets,
   * not just pointers to them; `usesPassphrase` still records yes/no.
   */
  passphrase: string;
  /** v7: the multisig wallet descriptor text itself. */
  multisigDescriptor: string;
  /** v7: one entry per multisig key — any key may have its own passphrase. */
  multisigKeys: MultisigKey[];
  specialInstructions: string;
}

/** v7: one key of a multisig wallet. */
export interface MultisigKey {
  id: string;
  label: string;
  heldBy: string;
  seed: string;
  passphrase: string;
  notes: string;
}

/** v7: a generic secret that is neither a wallet nor an account (PIN, safe combination, recovery code). */
export interface OtherSecret {
  id: string;
  title: string;
  secret: string;
  notes: string;
}

/** v7: a file kept inside the plan (will, deed, wallet backup file). */
export interface PlanDocument {
  id: string;
  name: string;
  fileName: string;
  fileType: string;
  /** base64 of the file bytes */
  fileContent: string;
  notes: string;
}

export interface DeviceAccount {
  id: string;
  label: string;
  type: string;
  location: string;
  username: string;
  password: string;
  notes: string;
}

export interface ProfessionalContact {
  id: string;
  role: string;
  name: string;
  phone: string;
  email: string;
}

export interface EmergencyAccess {
  emergencyContact: string;
  triggerConditions: string;
  accessProcedure: string;
  immediateActions: string;
  scopeLimitations: string;
}

export interface InheritancePlan {
  version: number;
  planInfo: PlanInfo;
  beneficiaries: Beneficiary[];
  distributionInstructions: string;
  secretSets: SecretSet[];
  deviceAccounts: DeviceAccount[];
  digitalAssets: DigitalAsset[];
  /** v7 */
  otherSecrets: OtherSecret[];
  /** v7 */
  documents: PlanDocument[];
  howToRestore: string;
  professionalContacts: ProfessionalContact[];
  emergencyAccess: EmergencyAccess;
  personalMessage: string;
}

const DEFAULT_RESTORE_STEPS = `1. Download the free seQRets desktop app from seqrets.app.
   Fallback: if seQRets is unavailable, use the standalone recovery tool — a single offline HTML file that performs the same restore in any browser. Download recover.html from https://github.com/seQRets/seQRets-Recover/releases/latest/download/recover.html, or use the hosted version at https://seqrets.github.io/seQRets-Recover/
2. Open the app (or recover.html) and click "Restore Secret".
3. Gather the required Qards from the locations listed in the seQRet Sets section above.
4. Import the Qards (scan QR, drag & drop, smart card, vault file, or paste text).
5. Enter the password from the matching seQRet Set in this plan.
6. If a keyfile was used, toggle "Was a Keyfile used?" and load it from the location listed.
7. Click "Restore Secret".
8. Write down the restored secret on paper immediately. Do not save it digitally.
9. Use the restored secret to access your assets per the Digital Asset Inventory. For crypto wallets, follow the "Recreating the Wallets" appendix — restoring a seed phrase is NOT the last step, and a wallet that shows an empty balance does not mean the funds are gone.
10. After securing all assets, delete all unencrypted copies of this document.`;

const DEFAULT_IMMEDIATE_ACTIONS = `1. Keep my phone line active — do not cancel the phone plan. Text-message (SMS) verification codes and account-recovery calls go to that number, and once it is cancelled the number may be given to a stranger.
2. Secure my primary email account before anything else. Almost every "Forgot password" flow ends at that inbox — whoever controls the email controls most other accounts. Check that its own recovery options don't point at a phone or account you can't reach.
3. [Add your own time-sensitive obligations: bills, mortgage, insurance, margin calls, subscriptions, etc.]`;

const DEFAULT_EMERGENCY_ACCESS_PROCEDURE = `1. Follow the steps in "How to Restore Your Secret" above to recover the encrypted secrets needed for this emergency.
2. If the seQRets app cannot be installed on the available computer, use the standalone recovery tool (recover.html) described in the "How to Restore — Read This First" section of this plan — it runs offline in any browser.
3. [Add any emergency-specific steps: where hardware is kept, who to contact first, which assets to access in what order, etc.]`;

/**
 * Last word of "Prepared by", stripped to filename-safe characters.
 * Shared by the JSON and PDF export-name builders so both suggest the same
 * base name ("Sam Sample (Test Run)" → "Run", never "Run)").
 */
export function planFileLastName(preparedBy: string | undefined): string {
  const trimmed = (preparedBy ?? '').trim();
  if (!trimmed) return '';
  const last = trimmed.split(/\s+/).pop() ?? '';
  return last.replace(/[^a-zA-Z0-9-]/g, '');
}

export function createBlankSecretSet(): SecretSet {
  return {
    id: crypto.randomUUID(),
    description: '',
    password: '',
    passwordIsHint: false,
    keyfileUsed: '',
    keyfilePrimaryLocation: '',
    keyfileBackupLocation: '',
    configuration: '2-of-3',
    label: '',
    qardLocations: [
      { id: crypto.randomUUID(), qardNumber: 1, location: '', heldBy: '', accessNotes: '' },
      { id: crypto.randomUUID(), qardNumber: 2, location: '', heldBy: '', accessNotes: '' },
      { id: crypto.randomUUID(), qardNumber: 3, location: '', heldBy: '', accessNotes: '' },
    ],
    vaultFileLocation: '',
    smartCardPin: '',
    smartCardReaderModel: '',
  };
}

export function createBlankPlan(): InheritancePlan {
  const today = new Date().toISOString().split('T')[0];
  return {
    version: INHERITANCE_PLAN_VERSION,
    planInfo: {
      preparedBy: '',
      dateCreated: today,
      lastUpdated: today,
      lastReviewedAt: today,
      reviewSchedule: 'Every 12 months',
      planVersion: '',
      changeLog: '',
    },
    beneficiaries: [
      { id: crypto.randomUUID(), name: '', relationship: '', contactInfo: '', assignedAssets: '' },
    ],
    distributionInstructions: '',
    secretSets: [createBlankSecretSet()],
    deviceAccounts: [
      { id: crypto.randomUUID(), label: '', type: 'Computer', location: '', username: '', password: '', notes: '' },
      { id: crypto.randomUUID(), label: '', type: 'Password Manager', location: '', username: '', password: '', notes: '' },
      { id: crypto.randomUUID(), label: '', type: '2FA / Authenticator App', location: '', username: '', password: '', notes: '' },
    ],
    digitalAssets: [
      createBlankDigitalAsset(),
    ],
    otherSecrets: [],
    documents: [],
    howToRestore: DEFAULT_RESTORE_STEPS,
    professionalContacts: [
      { id: crypto.randomUUID(), role: 'Estate Attorney', name: '', phone: '', email: '' },
      { id: crypto.randomUUID(), role: 'Financial Advisor', name: '', phone: '', email: '' },
      { id: crypto.randomUUID(), role: 'Accountant / CPA', name: '', phone: '', email: '' },
      { id: crypto.randomUUID(), role: 'Technical Contact', name: '', phone: '', email: '' },
      { id: crypto.randomUUID(), role: 'Trusted Friend / Advisor', name: '', phone: '', email: '' },
    ],
    emergencyAccess: {
      emergencyContact: '',
      triggerConditions: '',
      accessProcedure: DEFAULT_EMERGENCY_ACCESS_PROCEDURE,
      immediateActions: DEFAULT_IMMEDIATE_ACTIONS,
      scopeLimitations: '',
    },
    personalMessage: '',
  };
}

/**
 * Serialize an InheritancePlan into a RawInstruction that feeds directly
 * into the existing encryptInstructions crypto pipeline.
 */
export function planToRawInstruction(plan: InheritancePlan): RawInstruction {
  const base64Content = Buffer.from(JSON.stringify(plan), 'utf8').toString('base64');
  return {
    fileName: INHERITANCE_PLAN_FILENAME,
    fileContent: base64Content,
    fileType: INHERITANCE_PLAN_FILETYPE,
  };
}

/**
 * Check whether a decrypted RawInstruction is an in-app inheritance plan
 * (as opposed to a user-uploaded file).
 */
export function isInheritancePlan(instruction: RawInstruction): boolean {
  return (
    instruction.fileName === INHERITANCE_PLAN_FILENAME &&
    instruction.fileType === INHERITANCE_PLAN_FILETYPE
  );
}

/**
 * Parse the base64 fileContent of a RawInstruction back into an
 * InheritancePlan object. Returns null if parsing or validation fails.
 * Handles migrations from v1/v2/v3/v4/v5/v6 → v7.
 */
export function rawInstructionToPlan(instruction: RawInstruction): InheritancePlan | null {
  try {
    const jsonString = Buffer.from(instruction.fileContent, 'base64').toString('utf8');
    return migratePlan(JSON.parse(jsonString));
  } catch {
    return null;
  }
}

/**
 * Upgrade a parsed plan object of any schema version to the current one,
 * in place. Returns null if the object is not an inheritance plan. Used for
 * plan files (via rawInstructionToPlan) and for the plan inside a Locker.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migratePlan(parsed: any): InheritancePlan | null {
  if (parsed && typeof parsed.version === 'number' && parsed.planInfo && parsed.digitalAssets) {
    // v1 → v2 migration: add deviceAccounts if missing
    if (!Array.isArray(parsed.deviceAccounts)) {
      parsed.deviceAccounts = [];
    }
    // v2/v3 → v4 migration: add beneficiaries, emergency access, plan version
    if (!Array.isArray(parsed.beneficiaries)) {
      parsed.beneficiaries = [];
      parsed.distributionInstructions = parsed.distributionInstructions ?? '';
    }
    if (!parsed.emergencyAccess) {
      parsed.emergencyAccess = { emergencyContact: '', triggerConditions: '', accessProcedure: '', immediateActions: '', scopeLimitations: '' };
    }
    if (parsed.planInfo && !('planVersion' in parsed.planInfo)) {
      parsed.planInfo.planVersion = '';
      parsed.planInfo.changeLog = '';
    }

    // v4 → v5 migration: add lastReviewedAt, defaulting to the most
    // reasonable existing timestamp on the plan so reconciliation with
    // the sidecar has something to anchor against.
    if (parsed.planInfo && !('lastReviewedAt' in parsed.planInfo)) {
      const today = new Date().toISOString().split('T')[0];
      parsed.planInfo.lastReviewedAt =
        parsed.planInfo.lastUpdated || parsed.planInfo.dateCreated || today;
    }

    // v2/v3 → v4 migration: merge recoveryCredentials + qardConfig into secretSets
    if (!Array.isArray(parsed.secretSets)) {
      const creds = parsed.recoveryCredentials ?? {};
      const qards = parsed.qardConfig ?? {};
      const migratedSet: SecretSet = {
        id: crypto.randomUUID(),
        description: '',
        password: creds.password ?? '',
        passwordIsHint: false,
        keyfileUsed: '',
        keyfilePrimaryLocation: creds.keyfilePrimaryLocation ?? '',
        keyfileBackupLocation: creds.keyfileBackupLocation ?? '',
        configuration: qards.configuration ?? '2-of-3',
        label: qards.label ?? '',
        qardLocations: Array.isArray(qards.locations) ? qards.locations : [],
        vaultFileLocation: qards.vaultFileLocation ?? '',
        smartCardPin: qards.smartCardPin ?? '',
        smartCardReaderModel: qards.smartCardReaderModel ?? '',
      };
      parsed.secretSets = [migratedSet];
      // Clean up old fields
      delete parsed.recoveryCredentials;
      delete parsed.qardConfig;
    }

    // v5 → v6 migration: password-hint flag, explicit keyfile usage, and
    // per-asset wallet-recovery fields. All default to "not specified" —
    // a legacy plan makes no claim either way.
    if (Array.isArray(parsed.secretSets)) {
      for (const set of parsed.secretSets) {
        if (typeof set.passwordIsHint !== 'boolean') set.passwordIsHint = false;
        if (typeof set.keyfileUsed !== 'string') set.keyfileUsed = '';
      }
    }
    if (Array.isArray(parsed.digitalAssets)) {
      for (const asset of parsed.digitalAssets) {
        if (typeof asset.walletKind !== 'string') asset.walletKind = '';
        if (typeof asset.usesPassphrase !== 'string') asset.usesPassphrase = '';
        if (typeof asset.derivationPath !== 'string') asset.derivationPath = '';
        if (typeof asset.multisigDescriptorLocation !== 'string') asset.multisigDescriptorLocation = '';
        if (typeof asset.multisigCosigners !== 'string') asset.multisigCosigners = '';
        // v6 → v7: the secrets themselves, next to where they're kept.
        if (typeof asset.passphrase !== 'string') asset.passphrase = '';
        if (typeof asset.multisigDescriptor !== 'string') asset.multisigDescriptor = '';
        if (!Array.isArray(asset.multisigKeys)) asset.multisigKeys = [];
      }
    }

    // v6 → v7 migration: generic secrets and attached documents.
    if (!Array.isArray(parsed.otherSecrets)) parsed.otherSecrets = [];
    if (!Array.isArray(parsed.documents)) parsed.documents = [];

    parsed.version = INHERITANCE_PLAN_VERSION;
    return parsed as InheritancePlan;
  }
  return null;
}

// ── v7 helpers ───────────────────────────────────────────────────────

export function createBlankDigitalAsset(): DigitalAsset {
  return {
    id: crypto.randomUUID(), name: '', type: '', platform: '', loginEmail: '', approxValue: '',
    twoFactorMethod: '', recoverySeed: '', walletKind: '', usesPassphrase: '', derivationPath: '',
    multisigDescriptorLocation: '', multisigCosigners: '', passphrase: '', multisigDescriptor: '',
    multisigKeys: [], specialInstructions: '',
  };
}

export function createBlankMultisigKey(): MultisigKey {
  return { id: crypto.randomUUID(), label: '', heldBy: '', seed: '', passphrase: '', notes: '' };
}

export function createBlankOtherSecret(): OtherSecret {
  return { id: crypto.randomUUID(), title: '', secret: '', notes: '' };
}

/**
 * Document size limits. The whole Locker is decrypted and re-encrypted on
 * every save, so large attachments make every save slow. 50 MB total matches
 * the existing limit for encrypting a single file.
 */
export const PLAN_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
export const PLAN_DOCUMENTS_MAX_TOTAL_BYTES = 50 * 1024 * 1024;

/** Decoded size in bytes of a base64 string (no decoding needed). */
export function base64DecodedBytes(b64: string): number {
  const len = b64.length;
  if (len === 0) return 0;
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((len * 3) / 4) - padding;
}

/** Total size in bytes of all documents in a plan. */
export function planDocumentsBytes(plan: Pick<InheritancePlan, 'documents'>): number {
  return (plan.documents ?? []).reduce((sum, d) => sum + base64DecodedBytes(d.fileContent), 0);
}

/**
 * Whether a file of `sizeBytes` may be added to the plan. Returns a
 * plain-language reason when it may not.
 */
export function checkDocumentFits(
  plan: Pick<InheritancePlan, 'documents'>,
  sizeBytes: number,
): { ok: true } | { ok: false; reason: string } {
  if (sizeBytes > PLAN_DOCUMENT_MAX_BYTES) {
    return { ok: false, reason: 'This file is larger than 10 MB. Documents in a Locker can be up to 10 MB each.' };
  }
  if (planDocumentsBytes(plan) + sizeBytes > PLAN_DOCUMENTS_MAX_TOTAL_BYTES) {
    return { ok: false, reason: 'Adding this file would take the documents in this Locker past 50 MB in total.' };
  }
  return { ok: true };
}

/** Build a document entry from a file's bytes. */
export function createPlanDocument(
  args: { name?: string; fileName: string; fileType: string; bytes: Uint8Array; notes?: string },
): PlanDocument {
  return {
    id: crypto.randomUUID(),
    name: args.name ?? args.fileName,
    fileName: args.fileName,
    fileType: args.fileType || 'application/octet-stream',
    fileContent: Buffer.from(args.bytes).toString('base64'),
    notes: args.notes ?? '',
  };
}
