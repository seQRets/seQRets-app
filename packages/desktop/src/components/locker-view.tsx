import { useMemo, useState } from 'react';
import { Eye, FileDown, FileText, Loader2, Lock, Pencil, Printer, TriangleAlert } from 'lucide-react';
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
import { describeLockerSet, lockerFileName, saveLocker } from '@seqrets/crypto';
import type { CreateSharesResult, InheritancePlan } from '@seqrets/crypto';
import { desktopLockerCrypto, LOCKER_FILE_FILTERS } from '@/lib/locker';
import type { OpenLocker } from '@/lib/locker';
import { generatePlanPdf, getPlanPdfFilename } from '@/lib/generate-plan-pdf';
import { PDF_FILTERS, saveFileNative, saveTextFileNative, savedFileName } from '@/lib/native-save';

interface LockerViewProps {
  locker: OpenLocker;
  /** Called with the updated Locker after edits or a save. */
  onChange: (locker: OpenLocker) => void;
  /** True while there are edits not yet saved to a file. */
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

  const updatePlan = (next: InheritancePlan) => {
    onChange({ ...locker, content: { ...locker.content, plan: next } });
    onDirtyChange(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const content = { ...locker.content, plan: { ...plan, planInfo: { ...plan.planInfo, lastUpdated: today } } };
      const saved = await saveLocker(
        { key: locker.key, content, setId: locker.setId, previousSeq: locker.seq },
        desktopLockerCrypto,
      );
      const path = await saveTextFileNative(locker.fileName ?? lockerFileName(locker.setId), LOCKER_FILE_FILTERS, saved.text);
      if (!path) return; // cancelled — nothing written, keep the unsaved state
      onChange({
        ...locker,
        content,
        seq: saved.file.seq,
        savedAt: saved.file.savedAt,
        editedOutsideApp: false,
        fileName: savedFileName(path),
      });
      onDirtyChange(false);
      toast({
        title: 'Locker saved',
        description: `Saved "${savedFileName(path)}". If you keep other copies, update them too.`,
      });
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

  const requestLock = () => {
    if (dirty) setConfirmLock(true);
    else onLock();
  };

  return (
    <div className="relative space-y-6">
      {isSaving && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/50 rounded-lg backdrop-blur-sm">
          <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
          <p className="mt-3 text-sm text-[hsl(37,10%,75%)]">Sealing your Locker…</p>
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
          <Button onClick={handleSave} disabled={isSaving} variant={dirty ? 'default' : 'outline'}>
            <FileDown className="mr-2 h-4 w-4" />
            {dirty ? 'Save Changes' : 'Save a Copy'}
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
            Its visible details didn&apos;t match the sealed copy inside. Your Locker opened normally using the sealed copy. Saving will write a clean file.
          </AlertDescription>
        </Alert>
      )}

      {dirty && (
        <Alert>
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Unsaved changes</AlertTitle>
          <AlertDescription>Save the Locker to keep them. Locking or leaving now would lose them.</AlertDescription>
        </Alert>
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
