import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Cloud, CloudOff, Eye, FileDown, FileText, FolderOpen, HardDrive, Loader2, Lock, Pencil, Printer, RefreshCw, TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { InheritancePlanForm } from '@/components/inheritance-plan-form';
import { QrCodeDisplay } from '@/components/qr-code-display';
import { ReviewReminderPanel } from '@/components/review-reminder-panel';
import { describeLockerSet, lockerFileName, saveLocker, sealLocker, serializeLockerFile } from '@seqrets/crypto';
import type { CreateSharesResult, InheritancePlan } from '@seqrets/crypto';
import { desktopLockerCrypto } from '@/lib/locker';
import type { OpenLocker } from '@/lib/locker';
import {
  chooseLockerSavePath, describeLockerLocation, fileNameOf, findCloudFolders, writeLockerFile, NO_CLOUD_NOTICE,
} from '@/lib/locker-files';
import type { CloudFolder } from '@/lib/locker-files';
import { useLockerAutosave } from '@/hooks/use-locker-autosave';
import { generatePlanPdf, getPlanPdfFilename } from '@/lib/generate-plan-pdf';
import { PDF_FILTERS, saveFileNative, savedFileName } from '@/lib/native-save';

interface LockerViewProps {
  locker: OpenLocker;
  /** Applies an update to the open Locker (edits, saves). */
  onChange: (update: (prev: OpenLocker) => OpenLocker) => void;
  /** True while there are edits not yet written to the Locker file. */
  dirty: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onLock: () => void;
}

function formatSavedAt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export function LockerView({ locker, onChange, dirty, onDirtyChange, onLock }: LockerViewProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [showQards, setShowQards] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmPdf, setConfirmPdf] = useState(false);
  const [confirmLock, setConfirmLock] = useState(false);

  const { plan, qards } = locker.content;
  const setText = useMemo(() => describeLockerSet(qards.requiredShares, qards.totalShares).survives, [qards]);
  const qardData: CreateSharesResult = useMemo(() => ({
    shares: qards.shares,
    totalShares: qards.totalShares,
    requiredShares: qards.requiredShares,
    setId: qards.setId,
  }), [qards]);

  const [cloudFolders, setCloudFolders] = useState<CloudFolder[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    findCloudFolders().then((found) => { if (!cancelled) setCloudFolders(found); });
    return () => { cancelled = true; };
  }, []);
  const location = locker.filePath && cloudFolders ? describeLockerLocation(locker.filePath, cloudFolders) : null;

  const autosave = useLockerAutosave({
    locker,
    update: onChange,
    setDirty: onDirtyChange,
    onFirstSave: () => toast({ title: 'Saved', description: "Your changes save automatically. If you've made other copies of this Locker, update them." }),
  });
  const { status } = autosave;

  const updatePlan = (next: InheritancePlan) => {
    // Any edit marks the plan as updated today, unless the edit was to that date itself.
    const today = new Date().toISOString().split('T')[0];
    const plan2 = next.planInfo.lastUpdated === plan.planInfo.lastUpdated
      ? { ...next, planInfo: { ...next.planInfo, lastUpdated: today } }
      : next;
    onChange((prev) => ({ ...prev, content: { ...prev.content, plan: plan2 } }));
    onDirtyChange(true);
    autosave.markEdited();
  };

  /** Seal the Locker as it is now: the next version if there are unsaved edits, else the same one. */
  const sealCurrent = async () => {
    const current = autosave.latest();
    if (autosave.hasUnsaved()) {
      return saveLocker({ key: current.key, content: current.content, setId: current.setId, previousSeq: current.seq }, desktopLockerCrypto);
    }
    const file = await sealLocker(
      { content: current.content, key: current.key, setId: current.setId, seq: current.seq, savedAt: current.savedAt },
      desktopLockerCrypto.encryptInstructions,
    );
    return { file, text: serializeLockerFile(file) };
  };

  // Write the current version to another place. Bumping the version for
  // identical contents would make copies impossible to tell apart, so
  // pending edits are saved to the Locker's own file first.
  const handleSaveCopy = async () => {
    if (autosave.hasUnsaved() && !(await autosave.flush())) {
      toast({ variant: 'destructive', title: 'Save your changes first', description: 'The changes here could not be saved to the Locker file yet, so a copy would not match it.' });
      return;
    }
    const path = await chooseLockerSavePath(locker.fileName ?? lockerFileName(locker.setId));
    if (!path) return;
    setIsSaving(true);
    try {
      const { file, text } = await sealCurrent();
      await writeLockerFile(path, text, null);
      toast({ title: 'Copy saved', description: `Saved "${savedFileName(path)}" — version ${file.seq}, the same as your Locker file.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could not save the copy', description: e?.message || String(e) });
    } finally {
      setIsSaving(false);
    }
  };

  // Choose the file that automatic saves go to: for a Locker whose location
  // isn't known (it was dragged in), or to keep edits after a conflict.
  const handleChooseWhere = async (separate: boolean) => {
    const base = locker.fileName ?? lockerFileName(locker.setId);
    const path = await chooseLockerSavePath(separate ? base.replace(/\.json$/i, ' (my changes).json') : base);
    if (!path) return;
    setIsSaving(true);
    try {
      const { file, text } = await sealCurrent();
      await writeLockerFile(path, text, null);
      onChange((prev) => ({
        ...prev, filePath: path, fileName: fileNameOf(path), seq: file.seq, savedAt: file.savedAt, editedOutsideApp: false,
      }));
      autosave.savedElsewhere(file.savedAt);
      onDirtyChange(false);
      toast({ title: 'Locker saved', description: `Saved "${fileNameOf(path)}". Changes now save there automatically.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could not save the Locker', description: e?.message || String(e) });
    } finally {
      setIsSaving(false);
    }
  };

  const doExportPdf = async () => {
    setConfirmPdf(false);
    try {
      const pdf = await generatePlanPdf(plan);
      const data = new Uint8Array(pdf.output('arraybuffer'));
      const path = await saveFileNative(getPlanPdfFilename(plan), PDF_FILTERS, data);
      if (path) toast({ title: 'PDF exported', description: `Saved "${savedFileName(path)}".` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'PDF export failed', description: String(e) });
    }
  };

  const requestLock = async () => {
    if (await autosave.flush()) onLock();
    else setConfirmLock(true);
  };

  return (
    <div className="relative space-y-6">
      {isSaving && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/50 rounded-lg backdrop-blur-sm">
          <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
          <p className="mt-3 text-sm text-[hsl(37,10%,75%)]">Saving your Locker…</p>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold">Your Locker{locker.fileName ? ` — ${locker.fileName}` : ''}</h3>
          <p className="text-sm text-muted-foreground">
            Qard set {locker.setId} · version {locker.seq} · saved {formatSavedAt(locker.savedAt)}
          </p>
          <p className="text-sm text-muted-foreground">{setText}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleSaveCopy}
            disabled={isSaving || status.kind === 'conflict' || (!locker.filePath && dirty)}
            variant="outline"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Save a Copy
          </Button>
          <Button variant="outline" onClick={requestLock}>
            <Lock className="mr-2 h-4 w-4" />
            Lock
          </Button>
        </div>
      </div>

      {locker.editedOutsideApp && (
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>This file was edited outside seQRets</AlertTitle>
          <AlertDescription>
            Its visible details didn&apos;t match the sealed copy inside. Your Locker opened normally using the sealed copy. The next save will write a clean file.
          </AlertDescription>
        </Alert>
      )}

      {!locker.filePath ? (
        <Alert>
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Changes can&apos;t save automatically yet</AlertTitle>
          <AlertDescription className="space-y-3">
            <span className="block">
              seQRets doesn&apos;t know where this Locker file is kept, because it was dragged in. Choose where to save it once, and every change after that saves automatically.
              {dirty ? ' Your changes are not saved yet.' : ''}
            </span>
            <Button size="sm" onClick={() => handleChooseWhere(false)} disabled={isSaving}>
              <FolderOpen className="mr-2 h-4 w-4" /> Choose Where to Save…
            </Button>
          </AlertDescription>
        </Alert>
      ) : status.kind === 'conflict' ? (
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>This Locker was changed somewhere else</AlertTitle>
          <AlertDescription className="space-y-3">
            <span className="block">
              {status.message} To avoid losing anything, seQRets stopped saving to it. Save your changes as a separate file, then lock and reopen the Locker to see the other version.
            </span>
            <Button size="sm" variant="outline" onClick={() => handleChooseWhere(true)} disabled={isSaving}>
              <FolderOpen className="mr-2 h-4 w-4" /> Save My Changes as a Separate File…
            </Button>
          </AlertDescription>
        </Alert>
      ) : status.kind === 'error' ? (
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Couldn&apos;t save your changes</AlertTitle>
          <AlertDescription className="space-y-3">
            <span className="block">{status.message} Your changes are still here and will be saved when this works again.</span>
            <Button size="sm" variant="outline" onClick={() => void autosave.flush()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Try Again
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            {status.kind === 'saving' || dirty
              ? <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              : location?.inCloud ? <Cloud className="h-4 w-4 shrink-0" /> : <HardDrive className="h-4 w-4 shrink-0" />}
            <span>
              {status.kind === 'saving' || dirty ? 'Saving' : 'Changes save automatically'}
              {location ? ` to ${location.text}` : ''}
              {status.kind === 'saving' || dirty ? '…' : ''}
            </span>
            {status.kind === 'saved' && !dirty && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />}
          </p>
          {cloudFolders?.length === 0 && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-muted border border-border text-xs text-muted-foreground">
              <CloudOff className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{NO_CLOUD_NOTICE}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant={mode === 'view' ? 'default' : 'outline'} size="sm" onClick={() => setMode('view')}>
          <Eye className="mr-2 h-4 w-4" /> View
        </Button>
        <Button variant={mode === 'edit' ? 'default' : 'outline'} size="sm" onClick={() => setMode('edit')}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowQards(v => !v)}>
          <Printer className="mr-2 h-4 w-4" /> {showQards ? 'Hide Qards' : 'Reprint Qards'}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setConfirmPdf(true)}>
          <FileText className="mr-2 h-4 w-4" /> Export PDF
        </Button>
      </div>

      {showQards && (
        <div className="space-y-3 rounded-md border p-4">
          <p className="text-sm text-muted-foreground">
            Exact copies of this Locker&apos;s Qards. Reprint a damaged Qard here; destroy the damaged one. If a Qard may be in someone else&apos;s hands, make a new set instead.
          </p>
          <QrCodeDisplay qrCodeData={qardData} keyfileUsed={qards.keyfileUsed} showLabelOnExports={false} allowVaultExport={false} />
        </div>
      )}

      <ReviewReminderPanel
        canMarkReviewed
        onMarkedReviewed={(iso) => updatePlan({ ...plan, planInfo: { ...plan.planInfo, lastReviewedAt: iso } })}
      />

      <Separator />

      <InheritancePlanForm plan={plan} onChange={updatePlan} readOnly={mode === 'view'} />

      <AlertDialog open={confirmPdf} onOpenChange={setConfirmPdf}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>This PDF is not encrypted</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                The PDF contains everything in this Locker&apos;s plan in plain text — every password, seed, passphrase and PIN. Attached documents are listed by name only.
              </span>
              <span className="block font-medium text-foreground">
                Treat it like cash: print it, store the paper somewhere safe, then delete the PDF file — don&apos;t leave it in Downloads or a cloud-synced folder.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doExportPdf}>Export PDF</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmLock} onOpenChange={setConfirmLock}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lock without saving?</AlertDialogTitle>
            <AlertDialogDescription>
              Your changes have not been saved and will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmLock(false); onLock(); }}>Lock Anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
