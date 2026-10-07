import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bot, FolderLock, FolderOpen } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HelpHint } from '@/components/ui/help-hint';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTheme } from '@/components/theme-provider';
import { useToast } from '@/hooks/use-toast';
import { useIdleLock } from '@/hooks/use-idle-lock';
import { Header } from '@/components/header';
import { AppFooter } from '@/components/app-footer';
import { AppNavTabs } from '@/components/app-nav-tabs';
import { BitcoinTicker } from '@/components/bitcoin-ticker';
import { LockerCreate } from '@/components/locker-create';
import { LockerOpen } from '@/components/locker-open';
import { LockerView } from '@/components/locker-view';
import type { OpenLocker } from '@/lib/locker';
import { reconcileWithPlan, SIDECAR_DISAGREEMENT_WARN_DAYS } from '@/lib/review-reminder';
// Lazy: Bob's chunk loads when the popover first opens, not on first paint (item 1.5).
const BobChatInterface = React.lazy(() =>
  import('@/components/bob-chat-interface').then((m) => ({ default: m.BobChatInterface }))
);
import logoLight from '@/assets/icons/logo-light.webp';
import logoDark from '@/assets/icons/logo-dark.webp';

type View = 'home' | 'create' | 'open' | 'locker';

export default function LockerPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const logoSrc = isDark ? logoDark : logoLight;
  const { toast } = useToast();

  const [view, setView] = useState<View>('home');
  const [locker, setLocker] = useState<OpenLocker | null>(null);
  const [dirty, setDirty] = useState(false);
  // A new Locker whose file isn't saved yet must not be abandoned via Back.
  const [createUnsaved, setCreateUnsaved] = useState(false);

  const lock = useCallback((reason?: string) => {
    setLocker(null);
    setDirty(false);
    setView('home');
    toast({ title: 'Locker locked', description: reason ?? 'Open it again with your Qards and password.' });
  }, [toast]);

  const { secondsLeft, stayOpen } = useIdleLock(view === 'locker', () => lock('Locked after 15 minutes without activity.'));

  const handleOpened = async (opened: OpenLocker) => {
    // The plan's lastReviewedAt is the authoritative review date; the
    // reminder sidecar is a cache rebuilt from it (and checked against it).
    // Reconcile BEFORE showing the Locker, so the review panel never reads
    // a stale sidecar.
    try {
      const reconcile = await reconcileWithPlan(opened.content.plan.planInfo.lastReviewedAt ?? null);
      if (reconcile.disagreementWarning) {
        toast({
          variant: 'destructive',
          title: 'Review reminder mismatch',
          description: `The review reminder on this computer and this Locker disagree by ${reconcile.disagreementDays} days (warning threshold: ${SIDECAR_DISAGREEMENT_WARN_DAYS}). Check the Review Reminder panel.`,
        });
      }
    } catch {
      // Non-fatal; the panel surfaces a corrupt sidecar.
    }
    setLocker(opened);
    setDirty(false);
    setView('locker');
    toast({ title: 'Locker opened' });
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12">
      <div className="w-full max-w-4xl mx-auto relative">
        <div className="absolute top-4 left-4 z-50" data-scroll-anchor="page-top">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="hidden md:inline-flex hover:bg-accent text-foreground">
                <Bot className="mr-2 h-5 w-5" />
                Ask Bob
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-96 h-[32rem] dark:bg-[#2b2728]">
              <React.Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-muted-foreground">Waking Bob…</div>}>
                <BobChatInterface
                  initialMessage="Hi! I'm Bob, your AI assistant. How can I help you with seQRets today?"
                  showLinkToFullPage={true}
                />
              </React.Suspense>
            </PopoverContent>
          </Popover>
          <Button asChild size="icon" variant="outline" className="md:hidden inline-flex">
            <Link to="/support">
              <Bot className="h-5 w-5" />
              <span className="sr-only">Ask Bob</span>
            </Link>
          </Button>
        </div>
        <Header />

        <header className="text-center mb-6 pt-16 sm:pt-0">
          <div className="flex justify-center items-center gap-2.5">
            <img src={logoSrc} alt="seQRets Logo" width={144} height={144} className="self-start -mt-2" />
            <div>
              <h1 className="font-body text-5xl md:text-7xl font-black text-foreground tracking-tighter">
                seQRets
              </h1>
              <p className="text-right text-base font-bold text-foreground tracking-wide">
                Secure. Split. Share.
              </p>
            </div>
          </div>
        </header>

        <div className="mb-10">
          <BitcoinTicker />
        </div>

        <AppNavTabs activePage="locker" />

        <Card className="relative mt-6 mb-8 shadow-lg dark:shadow-[0_4px_24px_rgba(0,0,0,0.6)] dark:border-0">
          <CardContent className="p-6 pt-6">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-foreground">Locker</h2>
                <HelpHint label="What is a Locker?">
                  <p className="font-bold mb-2">One set of Qards for every secret</p>
                  <p>A Locker holds all of your secrets and your inheritance plan in one encrypted file. It opens with enough of its Qards plus the password.</p>
                  <p className="mt-2">Adding or changing secrets never changes the Qards.</p>
                </HelpHint>
              </div>
              {(view === 'open' || (view === 'create' && !createUnsaved)) && (
                <Button variant="ghost" size="sm" onClick={() => setView('home')}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
              )}
            </div>
            <p className="text-muted-foreground text-sm mb-6">
              Every secret and your plan in one encrypted file, opened by one set of Qards and a password.
            </p>

            {view === 'home' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setView('create')}
                  className="rounded-lg border p-6 text-left transition hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <FolderLock className="h-8 w-8 mb-3" />
                  <h3 className="text-lg font-semibold">Create a Locker</h3>
                  <p className="text-sm text-muted-foreground mt-1">Fill it with your secrets and plan, choose a password, and make its Qards.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setView('open')}
                  className="rounded-lg border p-6 text-left transition hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <FolderOpen className="h-8 w-8 mb-3" />
                  <h3 className="text-lg font-semibold">Open a Locker</h3>
                  <p className="text-sm text-muted-foreground mt-1">Choose the Locker file, add enough of its Qards and enter the password.</p>
                </button>
              </div>
            )}

            {view === 'create' && <LockerCreate onDone={(l) => { setCreateUnsaved(false); void handleOpened(l); }} onUnsavedChange={setCreateUnsaved} />}
            {view === 'open' && <LockerOpen onOpened={handleOpened} />}
            {view === 'locker' && locker && (
              <LockerView
                locker={locker}
                onChange={setLocker}
                dirty={dirty}
                onDirtyChange={setDirty}
                onLock={() => lock()}
              />
            )}
          </CardContent>
        </Card>

        <AppFooter />
      </div>

      <AlertDialog open={secondsLeft !== null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Locking your Locker in {secondsLeft} seconds</AlertDialogTitle>
            <AlertDialogDescription>
              There has been no activity for a while.{dirty ? ' Your unsaved changes will be lost.' : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={stayOpen}>Stay Open</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
