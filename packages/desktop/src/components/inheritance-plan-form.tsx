import React, { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DragDropZone } from '@/components/ui/drag-drop-zone';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Plus, Trash2, AlertTriangle, Info, KeyRound, Eye, EyeOff, Wifi, WifiOff, FileText, Download, Paperclip } from 'lucide-react';
import { useConnectionStatus } from '@/components/connection-status';
import { useToast } from '@/hooks/use-toast';
import { saveFileNative, base64ToUint8Array, savedFileName } from '@/lib/native-save';
import type {
  InheritancePlan,
  PlanInfo,
  Beneficiary,
  SecretSet,
  QardLocation,
  DeviceAccount,
  DigitalAsset,
  MultisigKey,
  OtherSecret,
  PlanDocument,
  ProfessionalContact,
  EmergencyAccess,
} from '@seqrets/crypto';
import {
  createBlankSecretSet,
  createBlankDigitalAsset,
  createBlankMultisigKey,
  createBlankOtherSecret,
  createPlanDocument,
  checkDocumentFits,
  planDocumentsBytes,
  WALLET_KINDS,
  PLAN_DOCUMENTS_MAX_TOTAL_BYTES,
} from '@seqrets/crypto';

interface InheritancePlanFormProps {
  plan: InheritancePlan;
  onChange: (plan: InheritancePlan) => void;
  readOnly?: boolean;
}

// ── Three-state yes/no select ───────────────────────────────────────
// '' = not specified (the legacy/default state — the plan makes no claim).
// Radix Select can't represent an empty-string item value, so 'unspecified'
// is mapped back to '' on change.
function YesNoSelect({ value, onChange, disabled, yesLabel, noLabel }: {
  value: string;
  onChange: (v: '' | 'yes' | 'no') => void;
  disabled?: boolean;
  yesLabel: string;
  noLabel: string;
}) {
  return (
    <Select
      value={value === '' ? 'unspecified' : value}
      onValueChange={(v) => onChange(v === 'unspecified' ? '' : (v as 'yes' | 'no'))}
      disabled={disabled}
    >
      <SelectTrigger className="text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unspecified">Not specified</SelectItem>
        <SelectItem value="yes">{yesLabel}</SelectItem>
        <SelectItem value="no">{noLabel}</SelectItem>
      </SelectContent>
    </Select>
  );
}

// ── Collapsible section wrapper ─────────────────────────────────────

function Section({
  id,
  number,
  title,
  description,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  number: number;
  title: string;
  description: string;
  expanded: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card dark:bg-[hsl(28,7%,21%)]">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
          {number}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-3 space-y-4 animate-in fade-in duration-300">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Sensitive field wrappers ────────────────────────────────────────
// Each instance holds its own visibility state, so entries rendered inside
// .map() (multiple Secret Sets, Devices, Assets) get independent toggles.

interface SensitiveFieldProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/** Single-line input that renders as dots (type="password") until toggled. */
function SensitiveInput({ value, onChange, disabled, placeholder, className }: SensitiveFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={cn('pr-10', className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label={visible ? 'Hide value' : 'Show value'}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

/**
 * Single-line input whose text (not the border or placeholder) blurs once
 * there's a value to hide. Implemented with `color: transparent` +
 * `text-shadow` so only the characters are obscured — the input chrome and
 * the placeholder stay crisp. Blur auto-activates the moment the user types
 * or pastes; the eye button reveals for a quick accuracy check.
 */
function BlurInput({ value, onChange, disabled, placeholder, className }: SensitiveFieldProps) {
  const [visible, setVisible] = useState(false);
  const shouldBlur = !visible && value.length > 0;
  return (
    <div className="relative">
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={cn('pr-10', className)}
        style={
          shouldBlur
            ? {
                color: 'transparent',
                textShadow: '0 0 8px hsl(var(--foreground) / 0.6)',
                caretColor: 'hsl(var(--foreground))',
              }
            : undefined
        }
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label={visible ? 'Hide value' : 'Show value'}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

/** Multi-line version of BlurInput, for secrets that span lines (recovery codes). */
function BlurTextarea({ value, onChange, disabled, placeholder, className }: SensitiveFieldProps) {
  const [visible, setVisible] = useState(false);
  const shouldBlur = !visible && value.length > 0;
  return (
    <div className="relative">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={cn('pr-10', className)}
        style={
          shouldBlur
            ? {
                color: 'transparent',
                textShadow: '0 0 8px hsl(var(--foreground) / 0.6)',
                caretColor: 'hsl(var(--foreground))',
              }
            : undefined
        }
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-2 h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label={visible ? 'Hide value' : 'Show value'}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${+(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Main form component ─────────────────────────────────────────────

export function InheritancePlanForm({ plan, onChange, readOnly = false }: InheritancePlanFormProps) {
  const { isOnline } = useConnectionStatus();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['planInfo']));
  // Reading attached files is async; build on the latest plan, not the one
  // from the render where the files were dropped.
  const planRef = useRef(plan);
  planRef.current = plan;

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Helpers for updating nested state ──

  const updatePlanInfo = (field: keyof PlanInfo, value: string) => {
    onChange({ ...plan, planInfo: { ...plan.planInfo, [field]: value } });
  };

  const updateBeneficiary = (id: string, field: keyof Omit<Beneficiary, 'id'>, value: string) => {
    onChange({
      ...plan,
      beneficiaries: plan.beneficiaries.map((b) => (b.id === id ? { ...b, [field]: value } : b)),
    });
  };

  const addBeneficiary = () => {
    onChange({
      ...plan,
      beneficiaries: [
        ...plan.beneficiaries,
        { id: crypto.randomUUID(), name: '', relationship: '', contactInfo: '', assignedAssets: '' },
      ],
    });
  };

  const removeBeneficiary = (id: string) => {
    onChange({ ...plan, beneficiaries: plan.beneficiaries.filter((b) => b.id !== id) });
  };

  // ── Secret Set helpers ──

  const updateSecretSet = <K extends keyof Omit<SecretSet, 'id' | 'qardLocations'>>(id: string, field: K, value: SecretSet[K]) => {
    onChange({
      ...plan,
      secretSets: plan.secretSets.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    });
  };

  const addSecretSet = () => {
    onChange({ ...plan, secretSets: [...plan.secretSets, createBlankSecretSet()] });
  };

  const removeSecretSet = (id: string) => {
    onChange({ ...plan, secretSets: plan.secretSets.filter((s) => s.id !== id) });
  };

  const updateQardLocation = (setId: string, locId: string, field: keyof Omit<QardLocation, 'id' | 'qardNumber'>, value: string) => {
    onChange({
      ...plan,
      secretSets: plan.secretSets.map((s) =>
        s.id === setId
          ? { ...s, qardLocations: s.qardLocations.map((loc) => (loc.id === locId ? { ...loc, [field]: value } : loc)) }
          : s,
      ),
    });
  };

  const addQardLocation = (setId: string) => {
    onChange({
      ...plan,
      secretSets: plan.secretSets.map((s) =>
        s.id === setId
          ? {
              ...s,
              qardLocations: [
                ...s.qardLocations,
                { id: crypto.randomUUID(), qardNumber: s.qardLocations.length + 1, location: '', heldBy: '', accessNotes: '' },
              ],
            }
          : s,
      ),
    });
  };

  const removeQardLocation = (setId: string, locId: string) => {
    onChange({
      ...plan,
      secretSets: plan.secretSets.map((s) =>
        s.id === setId
          ? {
              ...s,
              qardLocations: s.qardLocations
                .filter((loc) => loc.id !== locId)
                .map((loc, i) => ({ ...loc, qardNumber: i + 1 })),
            }
          : s,
      ),
    });
  };

  // ── Device, Asset, Contact helpers ──

  const updateDeviceAccount = (id: string, field: keyof Omit<DeviceAccount, 'id'>, value: string) => {
    onChange({
      ...plan,
      deviceAccounts: plan.deviceAccounts.map((d) => (d.id === id ? { ...d, [field]: value } : d)),
    });
  };

  const addDeviceAccount = () => {
    onChange({
      ...plan,
      deviceAccounts: [
        ...plan.deviceAccounts,
        { id: crypto.randomUUID(), label: '', type: '', location: '', username: '', password: '', notes: '' },
      ],
    });
  };

  const removeDeviceAccount = (id: string) => {
    onChange({ ...plan, deviceAccounts: plan.deviceAccounts.filter((d) => d.id !== id) });
  };

  const updateAsset = <K extends keyof Omit<DigitalAsset, 'id'>>(id: string, field: K, value: DigitalAsset[K]) => {
    onChange({
      ...plan,
      digitalAssets: plan.digitalAssets.map((a) => (a.id === id ? { ...a, [field]: value } : a)),
    });
  };

  const addAsset = () => {
    onChange({
      ...plan,
      digitalAssets: [
        ...plan.digitalAssets,
        createBlankDigitalAsset(),
      ],
    });
  };

  const removeAsset = (id: string) => {
    onChange({ ...plan, digitalAssets: plan.digitalAssets.filter((a) => a.id !== id) });
  };

  const updateMultisigKey = (assetId: string, keyId: string, field: keyof Omit<MultisigKey, 'id'>, value: string) => {
    const asset = plan.digitalAssets.find((a) => a.id === assetId);
    if (!asset) return;
    updateAsset(assetId, 'multisigKeys', asset.multisigKeys.map((k) => (k.id === keyId ? { ...k, [field]: value } : k)));
  };

  const addMultisigKey = (assetId: string) => {
    const asset = plan.digitalAssets.find((a) => a.id === assetId);
    if (!asset) return;
    updateAsset(assetId, 'multisigKeys', [...asset.multisigKeys, createBlankMultisigKey()]);
  };

  const removeMultisigKey = (assetId: string, keyId: string) => {
    const asset = plan.digitalAssets.find((a) => a.id === assetId);
    if (!asset) return;
    updateAsset(assetId, 'multisigKeys', asset.multisigKeys.filter((k) => k.id !== keyId));
  };

  // ── Other secrets ──

  const updateOtherSecret = (id: string, field: keyof Omit<OtherSecret, 'id'>, value: string) => {
    onChange({ ...plan, otherSecrets: plan.otherSecrets.map((o) => (o.id === id ? { ...o, [field]: value } : o)) });
  };

  const addOtherSecret = () => {
    onChange({ ...plan, otherSecrets: [...plan.otherSecrets, createBlankOtherSecret()] });
  };

  const removeOtherSecret = (id: string) => {
    onChange({ ...plan, otherSecrets: plan.otherSecrets.filter((o) => o.id !== id) });
  };

  // ── Documents ──

  const addDocuments = async (files: File[]) => {
    const added: PlanDocument[] = [];
    for (const file of files) {
      // Check the size before reading, against what's already attached plus
      // the files accepted earlier in this same drop.
      const fits = checkDocumentFits({ documents: [...planRef.current.documents, ...added] }, file.size);
      if (!fits.ok) {
        toast({ variant: 'destructive', title: `Couldn't add "${file.name}"`, description: fits.reason });
        continue;
      }
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        added.push(createPlanDocument({ fileName: file.name, fileType: file.type, bytes }));
      } catch (e) {
        toast({ variant: 'destructive', title: `Couldn't read "${file.name}"`, description: String(e) });
      }
    }
    if (added.length > 0) {
      const latest = planRef.current;
      onChange({ ...latest, documents: [...latest.documents, ...added] });
    }
  };

  const updateDocument = (id: string, field: 'name' | 'notes', value: string) => {
    onChange({ ...plan, documents: plan.documents.map((d) => (d.id === id ? { ...d, [field]: value } : d)) });
  };

  const removeDocument = (id: string) => {
    onChange({ ...plan, documents: plan.documents.filter((d) => d.id !== id) });
  };

  const saveDocumentCopy = async (d: PlanDocument) => {
    try {
      const ext = d.fileName.includes('.') ? d.fileName.split('.').pop()! : '';
      const filters = ext ? [{ name: 'Document', extensions: [ext] }] : [];
      const path = await saveFileNative(d.fileName, filters, base64ToUint8Array(d.fileContent));
      if (path) toast({ title: 'Copy saved', description: `Saved "${savedFileName(path)}". This copy is not encrypted.` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not save the document', description: String(e) });
    }
  };

  const updateContact = (id: string, field: keyof Omit<ProfessionalContact, 'id'>, value: string) => {
    onChange({
      ...plan,
      professionalContacts: plan.professionalContacts.map((c) =>
        c.id === id ? { ...c, [field]: value } : c,
      ),
    });
  };

  const addContact = () => {
    onChange({
      ...plan,
      professionalContacts: [
        ...plan.professionalContacts,
        { id: crypto.randomUUID(), role: '', name: '', phone: '', email: '' },
      ],
    });
  };

  const removeContact = (id: string) => {
    onChange({ ...plan, professionalContacts: plan.professionalContacts.filter((c) => c.id !== id) });
  };

  const updateEmergencyAccess = (field: keyof EmergencyAccess, value: string) => {
    onChange({ ...plan, emergencyAccess: { ...plan.emergencyAccess, [field]: value } });
  };

  return (
    <div className="space-y-3">
      {!readOnly && (
        isOnline ? (
          <div className="flex items-start gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-300">
            <Wifi className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              You&apos;re online. Anything typed on this computer can be read by malware on it. For the most care, disconnect from the internet while you fill your Locker.
            </span>
          </div>
        ) : (
          <div className="flex items-start gap-2 p-3 rounded-md bg-green-500/10 border border-green-500/20 text-xs text-green-700 dark:text-green-400">
            <WifiOff className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              You&apos;re offline. Your Locker is encrypted on this computer when you save it. seQRets can&apos;t protect against malware already on this computer.
            </span>
          </div>
        )
      )}

      {/* ── 1. Plan Information ── */}
      <Section id="planInfo" number={1} title="Plan Information" description="Who created this plan, version tracking, and review schedule" expanded={expanded.has('planInfo')} onToggle={toggle}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label>Prepared by</Label>
            <Input value={plan.planInfo.preparedBy} onChange={(e) => updatePlanInfo('preparedBy', e.target.value)} disabled={readOnly} placeholder="Your full legal name" />
          </div>
          <div className="space-y-1.5">
            <Label>Date created</Label>
            <Input value={plan.planInfo.dateCreated} onChange={(e) => updatePlanInfo('dateCreated', e.target.value)} disabled={readOnly} type="date" />
          </div>
          <div className="space-y-1.5">
            <Label>Last updated</Label>
            <Input value={plan.planInfo.lastUpdated} onChange={(e) => updatePlanInfo('lastUpdated', e.target.value)} disabled={readOnly} type="date" />
          </div>
          <div className="space-y-1.5">
            <Label>Review schedule</Label>
            <Input value={plan.planInfo.reviewSchedule} onChange={(e) => updatePlanInfo('reviewSchedule', e.target.value)} disabled={readOnly} placeholder="e.g., Every 6 months" />
          </div>
          <div className="space-y-1.5">
            <Label>Plan version</Label>
            <Input value={plan.planInfo.planVersion} onChange={(e) => updatePlanInfo('planVersion', e.target.value)} disabled={readOnly} placeholder="e.g., 1.0, 2.0" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Change log</Label>
            <Textarea value={plan.planInfo.changeLog} onChange={(e) => updatePlanInfo('changeLog', e.target.value)} disabled={readOnly} placeholder="Track what changed between versions, e.g.:&#10;v2.0 — Added new Bitcoin wallet, updated Qard locations&#10;v1.0 — Initial plan" className="text-sm min-h-[60px]" />
          </div>
        </div>
      </Section>

      {/* ── 2. Beneficiaries ── */}
      <Section id="beneficiaries" number={2} title="Beneficiaries" description="Who should receive your digital assets" expanded={expanded.has('beneficiaries')} onToggle={toggle}>
        <div className="flex items-start gap-2 p-3 rounded-md bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>This documents your wishes for digital asset distribution. It does not replace a legal will.</span>
        </div>
        <div className="space-y-4">
          {plan.beneficiaries.map((beneficiary, idx) => (
            <div key={beneficiary.id} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-muted-foreground">Beneficiary {idx + 1}</h4>
                {!readOnly && plan.beneficiaries.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeBeneficiary(beneficiary.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input value={beneficiary.name} onChange={(e) => updateBeneficiary(beneficiary.id, 'name', e.target.value)} disabled={readOnly} placeholder="Full legal name" className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Relationship</Label>
                  <Input value={beneficiary.relationship} onChange={(e) => updateBeneficiary(beneficiary.id, 'relationship', e.target.value)} disabled={readOnly} placeholder="e.g., Spouse, Son, Daughter" className="text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Contact info</Label>
                <Input value={beneficiary.contactInfo} onChange={(e) => updateBeneficiary(beneficiary.id, 'contactInfo', e.target.value)} disabled={readOnly} placeholder="Phone, email, or address" className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Assigned assets</Label>
                <Textarea value={beneficiary.assignedAssets} onChange={(e) => updateBeneficiary(beneficiary.id, 'assignedAssets', e.target.value)} disabled={readOnly} placeholder="Which digital assets should this person receive?" className="text-sm min-h-[60px]" />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label>Distribution instructions</Label>
          <Textarea value={plan.distributionInstructions} onChange={(e) => onChange({ ...plan, distributionInstructions: e.target.value })} disabled={readOnly} placeholder="Any conditions, timing, or special instructions for distribution (optional)" className="text-sm min-h-[60px]" />
        </div>

        {!readOnly && (
          <Button variant="outline" size="sm" onClick={addBeneficiary} className="w-full">
            <Plus className="h-4 w-4 mr-1" /> Add Beneficiary
          </Button>
        )}
      </Section>

      {/* ── 3. Secret Sets (Recovery Credentials + Qard Locations) ── */}
      <Section id="secretSets" number={3} title="seQRet Sets" description="Credentials, Qard locations, and smart card info for each secret protected by seQRets" expanded={expanded.has('secretSets')} onToggle={toggle}>
        <div className="space-y-6">
          {plan.secretSets.map((secret, idx) => (
            <div key={secret.id} className="border-2 border-border rounded-xl p-4 space-y-4 bg-card/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-bold">seQRet {idx + 1}</h4>
                </div>
                {!readOnly && plan.secretSets.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeSecretSet(secret.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label>What does this secret protect?</Label>
                <Input value={secret.description} onChange={(e) => updateSecretSet(secret.id, 'description', e.target.value)} disabled={readOnly} placeholder="e.g., Bitcoin wallet seed phrase, Master password, Exchange recovery key" />
              </div>

              {/* Credentials */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>{secret.passwordIsHint ? 'seQRets Password Hint' : 'seQRets Password'}</Label>
                  <SensitiveInput value={secret.password} onChange={(v) => updateSecretSet(secret.id, 'password', v)} disabled={readOnly} placeholder={secret.passwordIsHint ? 'A hint your heirs will understand — not the password itself' : 'The exact password used when encrypting this secret'} />
                  <p className="text-xs text-muted-foreground">Every character matters. Copy-paste recommended.</p>
                  <div className="flex items-center gap-2 pt-1">
                    <Switch id={`pw-hint-${secret.id}`} checked={secret.passwordIsHint} onCheckedChange={(on) => updateSecretSet(secret.id, 'passwordIsHint', on)} disabled={readOnly} />
                    <Label htmlFor={`pw-hint-${secret.id}`} className="text-xs font-normal text-muted-foreground">This is a hint, not the actual password</Label>
                  </div>
                  {secret.passwordIsHint && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">The plan will clearly mark this as a hint — an heir who types a hint as the password gets an error identical to a wrong password.</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Was a keyfile used for this secret?</Label>
                  <YesNoSelect
                    value={secret.keyfileUsed}
                    onChange={(v) => updateSecretSet(secret.id, 'keyfileUsed', v)}
                    disabled={readOnly}
                    yesLabel="Yes — required to decrypt"
                    noLabel="No — password and Qards only"
                  />
                  <p className="text-xs text-muted-foreground">Say so explicitly. If a keyfile was used but your heirs don't know, decryption fails with what looks like a wrong-password error.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Keyfile location (primary)</Label>
                    <Input value={secret.keyfilePrimaryLocation} onChange={(e) => updateSecretSet(secret.id, 'keyfilePrimaryLocation', e.target.value)} disabled={readOnly} placeholder="e.g., Smart card, USB drive in lockbox" className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Keyfile location (backup)</Label>
                    <Input value={secret.keyfileBackupLocation} onChange={(e) => updateSecretSet(secret.id, 'keyfileBackupLocation', e.target.value)} disabled={readOnly} placeholder="Backup copy location" className="text-sm" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Qard config + locations */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Configuration</Label>
                  <Input value={secret.configuration} onChange={(e) => updateSecretSet(secret.id, 'configuration', e.target.value)} disabled={readOnly} placeholder="e.g., 2-of-3, 3-of-5" className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Qard set label</Label>
                  <Input value={secret.label} onChange={(e) => updateSecretSet(secret.id, 'label', e.target.value)} disabled={readOnly} placeholder="The label you set in seQRets" className="text-sm" />
                </div>
              </div>

              <div className="space-y-3">
                {secret.qardLocations.map((loc) => (
                  <div key={loc.id} className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 items-start">
                    <div className="flex items-center justify-center h-9 w-9 rounded-md bg-muted text-sm font-semibold shrink-0">
                      {loc.qardNumber}
                    </div>
                    <Input value={loc.location} onChange={(e) => updateQardLocation(secret.id, loc.id, 'location', e.target.value)} disabled={readOnly} placeholder="Location" className="text-sm" />
                    <Input value={loc.heldBy} onChange={(e) => updateQardLocation(secret.id, loc.id, 'heldBy', e.target.value)} disabled={readOnly} placeholder="Held by" className="text-sm" />
                    <Input value={loc.accessNotes} onChange={(e) => updateQardLocation(secret.id, loc.id, 'accessNotes', e.target.value)} disabled={readOnly} placeholder="Access notes" className="text-sm" />
                    {!readOnly && secret.qardLocations.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => removeQardLocation(secret.id, loc.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {!readOnly && (
                <Button variant="outline" size="sm" onClick={() => addQardLocation(secret.id)} className="w-full">
                  <Plus className="h-4 w-4 mr-1" /> Add Qard
                </Button>
              )}

              <Separator />

              {/* Smart card & vault file */}
              <div className="space-y-3">
                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Smart Card & Vault Backup</h5>
                <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-500/30 dark:border-yellow-500/20 text-xs text-yellow-800 dark:text-yellow-300">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-yellow-600 dark:text-yellow-400" />
                  <span><strong>PIN lockout.</strong> After 5 wrong attempts the card locks permanently and its data can no longer be read &mdash; record the PIN above and make sure whoever needs it can actually reach it. With wipe protection on (the default) the card cannot be erased either, so a lost PIN turns it into a paperweight. With wipe protection off, anyone who holds the card can erase it &mdash; losing that Qard without warning and raising the number your heirs must still find.</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Smart card PIN</Label>
                    <SensitiveInput value={secret.smartCardPin} onChange={(v) => updateSecretSet(secret.id, 'smartCardPin', v)} disabled={readOnly} placeholder="Card PIN" className="text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Card reader model</Label>
                    <Input value={secret.smartCardReaderModel} onChange={(e) => updateSecretSet(secret.id, 'smartCardReaderModel', e.target.value)} disabled={readOnly} placeholder="e.g., Identiv SCR3310 v2.0" className="text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Vault file location</Label>
                    <Input value={secret.vaultFileLocation} onChange={(e) => updateSecretSet(secret.id, 'vaultFileLocation', e.target.value)} disabled={readOnly} placeholder="e.g., USB drive, cloud folder" className="text-sm" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!readOnly && (
          <Button variant="outline" size="sm" onClick={addSecretSet} className="w-full">
            <Plus className="h-4 w-4 mr-1" /> Add Another seQRet Set
          </Button>
        )}
      </Section>

      {/* ── 4. Device & Account Access ── */}
      <Section id="devices" number={4} title="Device &amp; Account Access" description="Computers, password managers, backup drives, and other access your heirs will need" expanded={expanded.has('devices')} onToggle={toggle}>
        <div className="flex items-start gap-2 p-3 rounded-md bg-muted border border-border text-xs text-muted-foreground">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-foreground" />
          <div className="space-y-1">
            <span>List every device and account your heirs will need — computers, password managers, 2FA apps, backup drives, email, cloud storage, VPN, phone PINs, and subscriptions to cancel. <strong className="text-foreground">Tip:</strong> If your 2FA app requires your password manager and vice versa, list the 2FA recovery codes separately to break the deadlock.</span>
          </div>
        </div>
        <div className="space-y-4">
          {plan.deviceAccounts.map((device, idx) => (
            <div key={device.id} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-muted-foreground">Device / Account {idx + 1}</h4>
                {!readOnly && plan.deviceAccounts.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeDeviceAccount(device.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Label</Label>
                  <Input value={device.label} onChange={(e) => updateDeviceAccount(device.id, 'label', e.target.value)} disabled={readOnly} placeholder="e.g., MacBook Pro, 1Password" className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Input value={device.type} onChange={(e) => updateDeviceAccount(device.id, 'type', e.target.value)} disabled={readOnly} placeholder="Computer, Password Manager, Backup Drive" className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Location</Label>
                  <Input value={device.location} onChange={(e) => updateDeviceAccount(device.id, 'location', e.target.value)} disabled={readOnly} placeholder="e.g., Home office, fireproof safe" className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Username / login</Label>
                  <Input value={device.username} onChange={(e) => updateDeviceAccount(device.id, 'username', e.target.value)} disabled={readOnly} placeholder="e.g., john@email.com" className="text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Password / PIN / encryption key</Label>
                <SensitiveInput value={device.password} onChange={(v) => updateDeviceAccount(device.id, 'password', v)} disabled={readOnly} placeholder="The exact password or PIN needed to unlock" className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Input value={device.notes} onChange={(e) => updateDeviceAccount(device.id, 'notes', e.target.value)} disabled={readOnly} placeholder="e.g., FileVault enabled, recovery key in 1Password" className="text-sm" />
              </div>
            </div>
          ))}
        </div>

        {!readOnly && (
          <Button variant="outline" size="sm" onClick={addDeviceAccount} className="w-full">
            <Plus className="h-4 w-4 mr-1" /> Add Device / Account
          </Button>
        )}
      </Section>

      {/* ── 5. Digital Asset Inventory ── */}
      <Section id="assets" number={5} title="Digital Asset Inventory" description="Every digital asset your heirs need to know about" expanded={expanded.has('assets')} onToggle={toggle}>
        <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-500/30 dark:border-yellow-500/20 text-xs text-yellow-800 dark:text-yellow-300">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-yellow-600 dark:text-yellow-400" />
          <span><strong>Multisig wallet?</strong> Choose &ldquo;Multisig&rdquo; as the wallet kind and paste the wallet&apos;s descriptor / config file (Sparrow, Electrum and Specter all export it). The descriptor can&apos;t spend on its own, but without it your heirs may be unable to rebuild the wallet at all, even with enough seed phrases.</span>
        </div>
        <div className="space-y-4">
          {plan.digitalAssets.map((asset, idx) => (
            <div key={asset.id} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-muted-foreground">Asset {idx + 1}</h4>
                {!readOnly && plan.digitalAssets.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeAsset(asset.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input value={asset.name} onChange={(e) => updateAsset(asset.id, 'name', e.target.value)} disabled={readOnly} placeholder="e.g., Bitcoin Wallet" className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Input value={asset.type} onChange={(e) => updateAsset(asset.id, 'type', e.target.value)} disabled={readOnly} placeholder="Wallet, exchange, etc." className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Platform / software</Label>
                  <Input value={asset.platform} onChange={(e) => updateAsset(asset.id, 'platform', e.target.value)} disabled={readOnly} placeholder="e.g., Electrum, Coinbase" className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Login email</Label>
                  <Input value={asset.loginEmail} onChange={(e) => updateAsset(asset.id, 'loginEmail', e.target.value)} disabled={readOnly} placeholder="account@email.com" className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Approx. value</Label>
                  <Input value={asset.approxValue} onChange={(e) => updateAsset(asset.id, 'approxValue', e.target.value)} disabled={readOnly} placeholder="e.g., $50,000" className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">2FA method & backup codes</Label>
                  <Input value={asset.twoFactorMethod} onChange={(e) => updateAsset(asset.id, 'twoFactorMethod', e.target.value)} disabled={readOnly} placeholder="Authenticator, SMS, etc." className="text-sm" />
                </div>
              </div>
              {(() => {
                const isMultisig = asset.walletKind === 'Multisig';
                // Never hide a field that already holds something, even if the
                // wallet kind changed later — it still prints in the PDF.
                const showSingle = !isMultisig || !!asset.recoverySeed || !!asset.passphrase || asset.usesPassphrase !== '';
                const showMultisig = isMultisig || !!asset.multisigDescriptor || !!asset.multisigDescriptorLocation || asset.multisigKeys.length > 0;
                return (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Wallet kind</Label>
                      <Select
                        value={asset.walletKind === '' ? 'unspecified' : asset.walletKind}
                        onValueChange={(v) => updateAsset(asset.id, 'walletKind', v === 'unspecified' ? '' : v)}
                        disabled={readOnly}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unspecified">Not specified</SelectItem>
                          {WALLET_KINDS.map((k) => (
                            <SelectItem key={k} value={k}>{k}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {showSingle && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs">Recovery seed / key</Label>
                          <BlurInput value={asset.recoverySeed} onChange={(v) => updateAsset(asset.id, 'recoverySeed', v)} disabled={readOnly} placeholder="The seed phrase (12 or 24 words) or private key" className="text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Uses an added passphrase ("25th word")?</Label>
                          <YesNoSelect
                            value={asset.usesPassphrase}
                            onChange={(v) => updateAsset(asset.id, 'usesPassphrase', v)}
                            disabled={readOnly}
                            yesLabel="Yes — seed alone opens an empty wallet"
                            noLabel="No — seed phrase is sufficient"
                          />
                        </div>
                        {(asset.usesPassphrase === 'yes' || !!asset.passphrase) && (
                          <div className="space-y-1">
                            <Label className="text-xs">Passphrase</Label>
                            <SensitiveInput value={asset.passphrase} onChange={(v) => updateAsset(asset.id, 'passphrase', v)} disabled={readOnly} placeholder="The exact passphrase — every character, space and capital matters" className="text-sm" />
                            <p className="text-xs text-yellow-600 dark:text-yellow-400">Without the passphrase the seed opens an empty wallet. Store it here so your heirs have both.</p>
                          </div>
                        )}
                      </>
                    )}
                    <div className="space-y-1">
                      <Label className="text-xs">Derivation path / script type</Label>
                      <Input value={asset.derivationPath} onChange={(e) => updateAsset(asset.id, 'derivationPath', e.target.value)} disabled={readOnly} placeholder={'e.g., Native SegWit (BIP84), m/84\'/0\'/0\' — or "wallet default" if unsure'} className="text-sm" />
                    </div>
                    {showMultisig && (
                      <div className="space-y-3 rounded-md border border-border p-3">
                        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Multisig</h5>
                        <div className="space-y-1">
                          <Label className="text-xs">Wallet descriptor / config file</Label>
                          <Textarea value={asset.multisigDescriptor} onChange={(e) => updateAsset(asset.id, 'multisigDescriptor', e.target.value)} disabled={readOnly} placeholder="Paste the descriptor exported from Sparrow, Electrum, Specter, etc." className="text-xs font-mono min-h-[80px]" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Other copies of the descriptor (optional)</Label>
                          <Input value={asset.multisigDescriptorLocation} onChange={(e) => updateAsset(asset.id, 'multisigDescriptorLocation', e.target.value)} disabled={readOnly} placeholder="e.g., USB in safe, printed with each key" className="text-sm" />
                        </div>
                        {asset.multisigKeys.map((key, kIdx) => (
                          <div key={key.id} className="border border-border rounded-md p-3 space-y-2 bg-card/50">
                            <div className="flex items-center justify-between">
                              <h6 className="text-xs font-semibold">Key {kIdx + 1}</h6>
                              {!readOnly && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeMultisigKey(asset.id, key.id)} aria-label={`Remove key ${kIdx + 1}`}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Name</Label>
                                <Input value={key.label} onChange={(e) => updateMultisigKey(asset.id, key.id, 'label', e.target.value)} disabled={readOnly} placeholder="e.g., Coldcard, Trezor" className="text-sm" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Held by</Label>
                                <Input value={key.heldBy} onChange={(e) => updateMultisigKey(asset.id, key.id, 'heldBy', e.target.value)} disabled={readOnly} placeholder="Person or place" className="text-sm" />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Seed</Label>
                              <BlurInput value={key.seed} onChange={(v) => updateMultisigKey(asset.id, key.id, 'seed', v)} disabled={readOnly} placeholder="This key's seed phrase" className="text-sm" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Passphrase (if this key has one)</Label>
                              <SensitiveInput value={key.passphrase} onChange={(v) => updateMultisigKey(asset.id, key.id, 'passphrase', v)} disabled={readOnly} placeholder="Leave empty if none" className="text-sm" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Notes</Label>
                              <Input value={key.notes} onChange={(e) => updateMultisigKey(asset.id, key.id, 'notes', e.target.value)} disabled={readOnly} placeholder="Anything else about this key" className="text-sm" />
                            </div>
                          </div>
                        ))}
                        {!readOnly && (
                          <Button variant="outline" size="sm" onClick={() => addMultisigKey(asset.id)} className="w-full">
                            <Plus className="h-4 w-4 mr-1" /> Add Key
                          </Button>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
              <div className="space-y-1">
                <Label className="text-xs">Special instructions</Label>
                <Textarea value={asset.specialInstructions} onChange={(e) => updateAsset(asset.id, 'specialInstructions', e.target.value)} disabled={readOnly} placeholder="Any special steps needed to access this asset" className="text-sm min-h-[60px]" />
              </div>
            </div>
          ))}
        </div>

        {!readOnly && (
          <Button variant="outline" size="sm" onClick={addAsset} className="w-full">
            <Plus className="h-4 w-4 mr-1" /> Add Asset
          </Button>
        )}
      </Section>

      {/* ── 6. Other Secrets ── */}
      <Section id="otherSecrets" number={6} title="Other Secrets" description="PINs, safe combinations, recovery codes — anything that isn't a wallet or an account" expanded={expanded.has('otherSecrets')} onToggle={toggle}>
        {plan.otherSecrets.length === 0 && (
          <p className="text-xs text-muted-foreground">Nothing here yet.</p>
        )}
        <div className="space-y-4">
          {plan.otherSecrets.map((o, idx) => (
            <div key={o.id} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-muted-foreground">Secret {idx + 1}</h4>
                {!readOnly && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeOtherSecret(o.id)} aria-label={`Remove secret ${idx + 1}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">What is it?</Label>
                <Input value={o.title} onChange={(e) => updateOtherSecret(o.id, 'title', e.target.value)} disabled={readOnly} placeholder="e.g., Home safe combination, Email recovery codes" className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">The secret</Label>
                <BlurTextarea value={o.secret} onChange={(v) => updateOtherSecret(o.id, 'secret', v)} disabled={readOnly} placeholder="The PIN, combination or codes themselves" className="text-sm min-h-[60px]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Input value={o.notes} onChange={(e) => updateOtherSecret(o.id, 'notes', e.target.value)} disabled={readOnly} placeholder="Where it's used, anything your heirs should know" className="text-sm" />
              </div>
            </div>
          ))}
        </div>
        {!readOnly && (
          <Button variant="outline" size="sm" onClick={addOtherSecret} className="w-full">
            <Plus className="h-4 w-4 mr-1" /> Add Secret
          </Button>
        )}
      </Section>

      {/* ── 7. Documents ── */}
      <Section id="documents" number={7} title="Documents" description="Files kept inside your Locker — a will, a deed, a wallet backup file" expanded={expanded.has('documents')} onToggle={toggle}>
        {plan.documents.length === 0 && readOnly && (
          <p className="text-xs text-muted-foreground">No documents in this Locker.</p>
        )}
        <div className="space-y-3">
          {plan.documents.map((d) => (
            <div key={d.id} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs text-muted-foreground truncate flex-1" title={d.fileName}>
                  {d.fileName} · {formatSize(planDocumentsBytes({ documents: [d] }))}
                </span>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => saveDocumentCopy(d)}>
                  <Download className="h-3.5 w-3.5 mr-1" /> Save a Copy
                </Button>
                {!readOnly && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeDocument(d.id)} aria-label={`Remove ${d.fileName}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input value={d.name} onChange={(e) => updateDocument(d.id, 'name', e.target.value)} disabled={readOnly} placeholder="e.g., My will (2026)" className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Notes</Label>
                  <Input value={d.notes} onChange={(e) => updateDocument(d.id, 'notes', e.target.value)} disabled={readOnly} placeholder="What it is, where the original is" className="text-sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
        {!readOnly && (
          <>
            <DragDropZone
              onFiles={addDocuments}
              multiple
              label="Drag & drop files here"
              hint="or click to choose files · up to 10 MB each, 50 MB in total"
              icon={<Paperclip className="w-8 h-8 text-muted-foreground mb-2" />}
              paddingClassName="p-5"
              inputAriaLabel="Attach documents"
            />
            <p className="text-xs text-muted-foreground">
              {formatSize(planDocumentsBytes(plan))} of {formatSize(PLAN_DOCUMENTS_MAX_TOTAL_BYTES)} used. Files are encrypted inside your Locker when you save it. A copy you save out is not encrypted.
            </p>
          </>
        )}
      </Section>

      {/* ── 8. How to Restore ── */}
      <Section id="restore" number={8} title="How to Restore Your Secret" description="Step-by-step instructions for your heirs" expanded={expanded.has('restore')} onToggle={toggle}>
        <p className="text-xs text-muted-foreground">Pre-filled with default steps. Edit freely to match your setup.</p>
        <Textarea
          value={plan.howToRestore}
          onChange={(e) => onChange({ ...plan, howToRestore: e.target.value })}
          disabled={readOnly}
          rows={12}
          className="text-sm font-mono"
        />
      </Section>

      {/* ── 9. Professional Contacts ── */}
      <Section id="contacts" number={9} title="Professional Contacts" description="People who can help your heirs execute this plan" expanded={expanded.has('contacts')} onToggle={toggle}>
        <div className="space-y-3">
          {plan.professionalContacts.map((contact) => (
            <div key={contact.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-start">
              <div className="space-y-1">
                <Input value={contact.role} onChange={(e) => updateContact(contact.id, 'role', e.target.value)} disabled={readOnly} placeholder="Role" className="text-sm" />
              </div>
              <div className="space-y-1">
                <Input value={contact.name} onChange={(e) => updateContact(contact.id, 'name', e.target.value)} disabled={readOnly} placeholder="Name" className="text-sm" />
              </div>
              <div className="space-y-1">
                <Input value={contact.phone} onChange={(e) => updateContact(contact.id, 'phone', e.target.value)} disabled={readOnly} placeholder="Phone" className="text-sm" />
              </div>
              <div className="space-y-1">
                <Input value={contact.email} onChange={(e) => updateContact(contact.id, 'email', e.target.value)} disabled={readOnly} placeholder="Email" className="text-sm" />
              </div>
              {!readOnly && plan.professionalContacts.length > 1 && (
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => removeContact(contact.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {!readOnly && (
          <Button variant="outline" size="sm" onClick={addContact} className="w-full">
            <Plus className="h-4 w-4 mr-1" /> Add Contact
          </Button>
        )}
      </Section>

      {/* ── 10. Emergency Access ── */}
      <Section id="emergency" number={10} title="Emergency Access" description="What happens if you are incapacitated but still alive" expanded={expanded.has('emergency')} onToggle={toggle}>
        <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-500/30 dark:border-yellow-500/20 text-xs text-yellow-800 dark:text-yellow-300">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-yellow-600 dark:text-yellow-400" />
          <span><strong>Not just for death.</strong> If you are hospitalized, in a coma, or otherwise unable to act, someone may need access to pay bills, meet margin calls, or handle time-sensitive obligations.</span>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Emergency contact (decision maker)</Label>
            <Input value={plan.emergencyAccess.emergencyContact} onChange={(e) => updateEmergencyAccess('emergencyContact', e.target.value)} disabled={readOnly} placeholder="Name, relationship, phone, email" />
          </div>
          <div className="space-y-1.5">
            <Label>Trigger conditions</Label>
            <Textarea value={plan.emergencyAccess.triggerConditions} onChange={(e) => updateEmergencyAccess('triggerConditions', e.target.value)} disabled={readOnly} placeholder='e.g., "If I am hospitalized for more than 7 days"' className="text-sm min-h-[60px]" />
          </div>
          <div className="space-y-1.5">
            <Label>Emergency access procedure</Label>
            <Textarea value={plan.emergencyAccess.accessProcedure} onChange={(e) => updateEmergencyAccess('accessProcedure', e.target.value)} disabled={readOnly} placeholder="Step-by-step instructions for accessing assets during an emergency" className="text-sm min-h-[60px]" />
          </div>
          <div className="space-y-1.5">
            <Label>Immediate actions required</Label>
            <Textarea value={plan.emergencyAccess.immediateActions} onChange={(e) => updateEmergencyAccess('immediateActions', e.target.value)} disabled={readOnly} placeholder="Time-sensitive obligations: bills, mortgage, insurance, margin calls, etc." className="text-sm min-h-[60px]" />
          </div>
          <div className="space-y-1.5">
            <Label>Scope limitations</Label>
            <Textarea value={plan.emergencyAccess.scopeLimitations} onChange={(e) => updateEmergencyAccess('scopeLimitations', e.target.value)} disabled={readOnly} placeholder='e.g., "Do not sell any Bitcoin unless absolutely necessary for medical bills"' className="text-sm min-h-[60px]" />
          </div>
        </div>
      </Section>

      {/* ── 11. Personal Message ── */}
      <Section id="message" number={11} title="Personal Message to Your Heirs" description="Optional — anything else you want your family to know" expanded={expanded.has('message')} onToggle={toggle}>
        <Textarea
          value={plan.personalMessage}
          onChange={(e) => onChange({ ...plan, personalMessage: e.target.value })}
          disabled={readOnly}
          rows={5}
          placeholder="Write a personal message to your heirs..."
          className="text-sm"
        />
      </Section>
    </div>
  );
}
