import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, CheckCircle2, ChevronDown, ChevronUp, FileDown, Loader2, Lock, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { HelpHint } from '@/components/ui/help-hint';
import { Label } from '@/components/ui/label';
import { PasswordGenerator } from '@/components/ui/password-generator';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { scrollToReveal } from '@/components/ui/scroll-utils';
import { useToast } from '@/hooks/use-toast';
import { InheritancePlanForm } from '@/components/inheritance-plan-form';
import { KeyfileGenerator } from '@/components/keyfile-generator';
import { QrCodeDisplay } from '@/components/qr-code-display';
import { ReviewReminderPrompt } from '@/components/review-reminder-prompt';
import { SmartCardDialog } from '@/components/smartcard-dialog';
import { createBlankPlan, createLocker, describeLockerSet, lockerFileName } from '@seqrets/crypto';
import type { CreatedLocker, InheritancePlan } from '@seqrets/crypto';
import { desktopLockerCrypto, LOCKER_FILE_FILTERS } from '@/lib/locker';
import { saveTextFileNative, savedFileName } from '@/lib/native-save';
import { getReminderState } from '@/lib/review-reminder';
import type { OpenLocker } from '@/lib/locker';

function StepHeader({ n, title, done }: { n: number; title: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={done
        ? 'flex items-center justify-center h-8 w-8 rounded-full bg-green-600 text-white font-bold text-lg'
        : 'flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground font-bold text-lg'}>
        {done ? <CheckCircle2 className="h-5 w-5" /> : n}
      </div>
      <h3 className="text-xl font-semibold">{title}</h3>
    </div>
  );
}

const nextButtonClass = 'bg-primary text-primary-foreground hover:bg-primary/80 hover:shadow-md';

interface LockerCreateProps {
  /** Called when the owner finishes, with the new Locker open. */
  onDone: (locker: OpenLocker) => void;
  /** True while a Locker has been made but its file not yet saved. */
  onUnsavedChange?: (unsaved: boolean) => void;
}

export function LockerCreate({ onDone, onUnsavedChange }: LockerCreateProps) {
  const { toast } = useToast();
  const endRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(1);
  useEffect(() => {
    if (step > 1) scrollToReveal(endRef.current);
  }, [step]);

  // Step 1 — the plan
  const [plan, setPlan] = useState<InheritancePlan>(() => createBlankPlan());

  // Step 2 — password (+ keyfile under Advanced)
  const [password, setPassword] = useState('');
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [useKeyfile, setUseKeyfile] = useState(false);
  const [keyfile, setKeyfile] = useState<string | null>(null);
  const [keyfileWriteLabel, setKeyfileWriteLabel] = useState('');
  const [showKeyfileWriteCard, setShowKeyfileWriteCard] = useState(false);

  // Step 3 — the set
  const [totalShares, setTotalShares] = useState(3);
  const [requiredShares, setRequiredShares] = useState(2);
  const setDescription = useMemo(() => describeLockerSet(requiredShares, totalShares), [requiredShares, totalShares]);

  // Step 4 — make Qards, seal, save the file
  const [isCreating, setIsCreating] = useState(false);
  const [created, setCreated] = useState<CreatedLocker | null>(null);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [showReminderPrompt, setShowReminderPrompt] = useState(false);

  const credentialsReady = isPasswordValid && (!useKeyfile || !!keyfile);

  useEffect(() => {
    onUnsavedChange?.(!!created && !savedPath);
  }, [created, savedPath, onUnsavedChange]);

  const handleTotalChange = (total: number) => {
    setTotalShares(total);
    if (requiredShares > total) setRequiredShares(total);
    if (total > 1 && requiredShares < 2) setRequiredShares(2);
    if (total === 1) setRequiredShares(1);
  };

  const handleCreate = async () => {
    // One Locker per run: a second click must never mint a second key/set.
    if (!credentialsReady || created || isCreating) return;
    setIsCreating(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const finalPlan: InheritancePlan = { ...plan, planInfo: { ...plan.planInfo, lastUpdated: today } };
      const result = await createLocker(
        {
          plan: finalPlan,
          password,
          keyfile: useKeyfile ? keyfile ?? undefined : undefined,
          totalShares,
          requiredShares,
        },
        desktopLockerCrypto,
      );
      setCreated(result);
      setPlan(finalPlan);
      // The password now lives only in the owner's head / sealed letter.
      setPassword('');
      toast({ title: 'Locker created', description: 'Print or save the Qards, then save the Locker file.' });
      try {
        const state = await getReminderState();
        if (state.kind === 'missing') setShowReminderPrompt(true);
      } catch {
        // Optional UX — skip the prompt if the sidecar can't be read.
      }
      scrollToReveal(endRef.current);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could not create the Locker', description: e?.message || String(e) });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveFile = async () => {
    if (!created) return;
    try {
      const path = await saveTextFileNative(lockerFileName(created.qards.setId), LOCKER_FILE_FILTERS, created.text);
      if (path) {
        setSavedPath(path);
        toast({ title: 'Locker saved', description: `Saved "${savedFileName(path)}".` });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could not save the Locker', description: e?.message || String(e) });
    }
  };

  const handleDone = () => {
    if (!created || !savedPath) return;
    onDone({
      key: created.key,
      content: created.content,
      setId: created.file.setId,
      seq: created.file.seq,
      savedAt: created.file.savedAt,
      editedOutsideApp: false,
      fileName: savedFileName(savedPath),
    });
  };

  return (
    <div className="relative space-y-8">
      {isCreating && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/50 rounded-lg backdrop-blur-sm">
          <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
          <p className="mt-3 text-sm text-[hsl(37,10%,75%)]">Making your Qards and sealing your Locker…</p>
        </div>
      )}

      {/* Step 1 — fill the Locker */}
      <div className="space-y-4">
        <StepHeader n={1} title="Fill Your Locker" done={!!created} />
        <div className="pl-11 space-y-4">
          <p className="text-sm text-muted-foreground">
            Everything your family will need: wallets, accounts, people, and a letter. You can change it any time after the Locker is made — the Qards stay the same.
          </p>
          <InheritancePlanForm plan={plan} onChange={setPlan} readOnly={!!created} />
          {step === 1 && (
            <div className="flex justify-end pt-2">
              <Button onClick={() => setStep(2)} className={nextButtonClass}>
                Next Step <ArrowDown className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Step 2 — password */}
      {step >= 2 && (
        <div className="animate-in fade-in duration-500 space-y-8">
          <Separator />
          <div className="space-y-4">
            <StepHeader n={2} title="Choose the Password" done={!!created} />
            <div className="pl-11 space-y-6">
              {!created && (
                <>
                  <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-500/30 dark:border-yellow-500/20 text-xs text-yellow-800 dark:text-yellow-300">
                    <TriangleAlert className="h-4 w-4 mt-0.5 shrink-0 text-yellow-600 dark:text-yellow-400" />
                    <span>
                      <strong>Your family needs this password and enough Qards to open the Locker.</strong> Write it in a sealed letter kept by your attorney or in a safe — apart from the Qards.
                    </span>
                  </div>
                  <PasswordGenerator
                    value={password}
                    onValueChange={setPassword}
                    onValidationChange={setIsPasswordValid}
                    placeholder="Enter a password or generate one"
                  />

                  <div className="rounded-md border">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between p-4 text-left text-sm font-medium"
                      onClick={() => setShowAdvanced(v => !v)}
                      aria-expanded={showAdvanced}
                    >
                      <span>Advanced</span>
                      {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {showAdvanced && (
                      <div className="space-y-4 border-t p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="locker-use-keyfile" className="text-base font-medium">Also require a keyfile</Label>
                            <HelpHint label="What is a keyfile?">
                              <p className="font-bold mb-2">Keyfile</p>
                              <p>A small file that is needed together with the password to open the Qards. It adds protection if the password is ever exposed.</p>
                            </HelpHint>
                          </div>
                          <Switch
                            id="locker-use-keyfile"
                            checked={useKeyfile}
                            onCheckedChange={(on) => { setUseKeyfile(on); if (!on) setKeyfile(null); }}
                          />
                        </div>
                        {useKeyfile && (
                          <>
                            <Alert variant="destructive">
                              <TriangleAlert className="h-4 w-4" />
                              <AlertTitle>A lost keyfile means a lost Locker</AlertTitle>
                              <AlertDescription>
                                Your family will need the keyfile, the password and enough Qards. Save the keyfile in at least two places, such as a USB drive and a smart card, apart from the Qards.
                              </AlertDescription>
                            </Alert>
                            <KeyfileGenerator
                              onKeyfileGenerated={setKeyfile}
                              onSmartCardSave={(label) => { setKeyfileWriteLabel(label); setShowKeyfileWriteCard(true); }}
                            />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
              {created && (
                <p className="text-sm text-muted-foreground">
                  Password set{created.content.qards.keyfileUsed ? ', with a keyfile' : ''}. It is not stored anywhere.
                </p>
              )}
              {step === 2 && (
                <div className="flex justify-end pt-2">
                  <Button onClick={() => setStep(3)} disabled={!credentialsReady} className={nextButtonClass}>
                    Next Step <ArrowDown className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 3 — the set */}
      {step >= 3 && (
        <div className="animate-in fade-in duration-500 space-y-8">
          <Separator />
          <div className="space-y-4">
            <StepHeader n={3} title="Choose Your Qards" done={!!created} />
            <div className="pl-11 space-y-6">
              {!created && (
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-3">
                    <Label htmlFor="locker-total">Total Qards ({totalShares})</Label>
                    <div className="flex h-10 items-center">
                      <Slider id="locker-total" min={1} max={10} step={1} value={[totalShares]} onValueChange={([v]) => handleTotalChange(v)} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="locker-required">Qards needed to open ({requiredShares})</Label>
                    <div className="flex h-10 items-center">
                      <Slider
                        id="locker-required"
                        min={totalShares === 1 ? 1 : 2}
                        max={totalShares}
                        step={1}
                        value={[requiredShares]}
                        onValueChange={([v]) => setRequiredShares(v)}
                        disabled={totalShares === 1}
                      />
                    </div>
                  </div>
                </div>
              )}
              <p className="text-base font-medium">{setDescription.survives}</p>
              {setDescription.tight && setDescription.warning && !created && (
                <Alert>
                  <TriangleAlert className="h-4 w-4" />
                  <AlertTitle>This set leaves little room for loss</AlertTitle>
                  <AlertDescription>{setDescription.warning} You can still go ahead.</AlertDescription>
                </Alert>
              )}
              {step === 3 && !created && (
                <div className="flex justify-end pt-2">
                  <Button size="lg" onClick={handleCreate} disabled={isCreating || !credentialsReady} className={nextButtonClass}>
                    {isCreating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
                    Make Qards &amp; Seal Locker
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 4 — Qards and the Locker file */}
      {created && (
        <div className="animate-in fade-in duration-500 space-y-8">
          <Separator />
          <div className="space-y-4">
            <StepHeader n={4} title="Print the Qards and Save the Locker" done={!!savedPath} />
            <div className="pl-11 space-y-6">
              <QrCodeDisplay qrCodeData={created.qards} keyfileUsed={created.content.qards.keyfileUsed} showLabelOnExports={false} allowVaultExport={false} />

              <div className="space-y-3 rounded-md border p-4">
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  <h4 className="font-semibold">The Locker file</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  The Qards open this file. Without it, they open nothing — save it somewhere your family can reach, such as a cloud drive you share with them.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={handleSaveFile} variant={savedPath ? 'outline' : 'default'}>
                    <FileDown className="mr-2 h-4 w-4" />
                    {savedPath ? 'Save Another Copy' : 'Save Locker File'}
                  </Button>
                  {savedPath && (
                    <span className="text-sm text-muted-foreground">Saved as {savedFileName(savedPath)}</span>
                  )}
                </div>
              </div>

              {!savedPath && (
                <Alert variant="destructive">
                  <TriangleAlert className="h-4 w-4" />
                  <AlertTitle>Save the Locker file before you leave this page</AlertTitle>
                  <AlertDescription>Until it is saved, your Locker exists only on this screen.</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end">
                <Button size="lg" onClick={handleDone} disabled={!savedPath} className={nextButtonClass}>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Done — Open My Locker
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={endRef} aria-hidden="true" />

      <SmartCardDialog
        open={showKeyfileWriteCard}
        onOpenChange={setShowKeyfileWriteCard}
        mode="write-vault"
        writeData={keyfile || undefined}
        writeLabel={keyfileWriteLabel || 'Keyfile'}
        writeItemType="keyfile"
      />
      <ReviewReminderPrompt open={showReminderPrompt} onClose={() => setShowReminderPrompt(false)} />
    </div>
  );
}
