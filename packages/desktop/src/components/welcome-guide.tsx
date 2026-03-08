import { useState, useEffect } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import logoDark from '@/assets/icons/logo-dark.png';

const WELCOME_GUIDE_KEY = 'seQRets_welcomeGuideShown_v2';

interface WelcomeGuideProps {
  activeTab: 'create' | 'restore';
}

export function WelcomeGuide({ activeTab }: WelcomeGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      const hasSeenGuide = localStorage.getItem(WELCOME_GUIDE_KEY);
      if (!hasSeenGuide) {
        setIsOpen(true);
      }
    } catch {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    try {
      localStorage.setItem(WELCOME_GUIDE_KEY, 'true');
    } catch { /* ignore */ }
    setIsOpen(false);
    setStep(0);
  };

  const steps = [
    // ── Card 1: Welcome ──────────────────────────────────────────
    {
      icon: null,
      title: '',
      body: (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <img src={logoDark} alt="" className="h-16 w-16" />
            <div>
              <div className="text-3xl font-bold text-[hsl(37,10%,89%)]">seQRets</div>
              <div className="text-sm tracking-wide text-[hsl(37,10%,60%)]">Secure. Split. Share.</div>
            </div>
          </div>
          <p className="text-base text-center leading-relaxed text-[hsl(37,10%,75%)]">
            Protect your secrets today — ensure the right people
            can access them tomorrow.
          </p>
          <p className="text-base text-center text-amber-300 font-medium">
            Zero knowledge. No accounts. Nothing stored online.
          </p>
        </div>
      ),
      button: 'Next',
    },
    // ── Card 2: Features ─────────────────────────────────────────
    {
      icon: <Sparkles className="h-10 w-10 text-amber-400" />,
      title: 'What Can You Do?',
      body: (
        <ul className="space-y-2.5 text-base text-[hsl(37,10%,75%)]">
          <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">&bull;</span>Encrypt and split secrets into QR &ldquo;Qards&rdquo;</li>
          <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">&bull;</span>Store shares on EAL6+ JavaCard smart cards</li>
          <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">&bull;</span>View restored secrets as a Data QR or SeedQR</li>
          <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">&bull;</span>Create encrypted inheritance plans</li>
          <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">&bull;</span>Generate secure passwords and BIP-39 seed phrases</li>
        </ul>
      ),
      button: 'Next',
    },
    // ── Card 3: Security ─────────────────────────────────────────
    {
      icon: <AlertTriangle className="h-10 w-10 text-amber-400" />,
      title: 'Before You Begin',
      body: (
        <>
          <div className="rounded-md border border-green-500/30 bg-green-950/20 p-3">
            <p className="text-base text-center text-green-300">
              Native Rust crypto, fully offline, no browser attack surface.
            </p>
          </div>
          <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-950/20 p-3 space-y-2">
            <p className="text-base text-center text-amber-300">
              <strong>Your security is your responsibility.</strong> Lose your
              password or the required Qards, and your data is unrecoverable.
            </p>
            <p className="text-base text-center text-amber-300">
              Go offline before handling secrets for maximum security.
            </p>
          </div>
        </>
      ),
      button: 'I Understand & Accept',
    },
  ];

  const current = steps[step];

  return (
    <DialogPrimitive.Root open={isOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          aria-describedby={undefined}
          className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-lg border border-[hsl(340,4%,20%)] bg-[hsl(0,5%,8%)] text-[hsl(37,10%,89%)] p-6 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
        >
          {/* Step indicator */}
          <div className="flex justify-center gap-2 mb-4">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-2 w-2 rounded-full transition-colors',
                  i <= step ? 'bg-amber-400' : 'bg-[hsl(340,4%,30%)]'
                )}
              />
            ))}
          </div>

          {/* Header */}
          {current.title ? (
            <div className="flex items-center justify-center gap-3 mb-3">
              {current.icon}
              <DialogPrimitive.Title className="text-2xl font-bold">{current.title}</DialogPrimitive.Title>
            </div>
          ) : (
            <DialogPrimitive.Title className="sr-only">Welcome to seQRets</DialogPrimitive.Title>
          )}

          {/* Body */}
          <div className="mb-6 min-h-[180px]">{current.body}</div>

          {/* Action */}
          <Button
            onClick={step < steps.length - 1 ? () => setStep(step + 1) : handleClose}
            className="w-full bg-[hsl(340,4%,23%)] text-[hsl(37,10%,89%)] border-0 ring-1 ring-[hsl(340,4%,30%)] hover:bg-black font-semibold outline-none focus-visible:ring-1 focus-visible:ring-[hsl(340,4%,30%)] focus-visible:ring-offset-0"
          >
            {current.button}
            {step < steps.length - 1 && <ChevronRight className="ml-1 h-4 w-4" />}
          </Button>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
