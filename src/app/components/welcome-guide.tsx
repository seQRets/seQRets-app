
'use client';

import { useState, useEffect } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ChevronRight } from 'lucide-react';

const WELCOME_GUIDE_KEY = 'seQRets_welcomeGuideShown_v3';

interface WelcomeGuideProps {
  activeTab: 'create' | 'restore';
}

/* ──────────────────────────────────────────────────────────────────────────
 *  Shared dialog wrapper — identical size & chrome for both modals
 * ────────────────────────────────────────────────────────────────────────── */
function ModalShell({
  open,
  stepLabel,
  children,
}: {
  open: boolean;
  stepLabel: string;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          aria-describedby={undefined}
          className="fixed left-[50%] top-[50%] z-50 w-[calc(100%-2rem)] max-w-2xl translate-x-[-50%] translate-y-[-50%] rounded-xl border border-stone-600 bg-stone-800 text-stone-100 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
        >
          {/* Step label */}
          <div className="px-6 pt-5 pb-0">
            <span className="text-xs font-medium tracking-widest uppercase text-stone-500">
              {stepLabel}
            </span>
          </div>

          <div className="px-6 pt-3 pb-6">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 *  Modal 1 — Security Warning (web-specific)
 * ────────────────────────────────────────────────────────────────────────── */
function SecurityModal({
  open,
  onAccept,
}: {
  open: boolean;
  onAccept: () => void;
}) {
  return (
    <ModalShell open={open} stepLabel="Step 1 of 2">
      <DialogPrimitive.Title className="sr-only">
        Security Warning
      </DialogPrimitive.Title>

      {/* Header */}
      <div className="flex items-center justify-center gap-3 mb-5">
        <ShieldAlert className="h-9 w-9 text-amber-400 shrink-0" />
        <h2 className="text-2xl font-bold text-stone-100">Before You Begin</h2>
      </div>

      {/* Browser warning */}
      <div className="rounded-lg border border-amber-600/40 bg-amber-900/20 p-4 mb-4">
        <p className="text-[15px] leading-relaxed text-amber-200">
          <strong className="text-amber-300">This is a web app.</strong> All
          encryption runs locally in your browser, but web environments carry
          inherent risks — browser extensions, shared devices, and CDN delivery
          can potentially expose data.
        </p>
      </div>

      {/* Go offline callout */}
      <div className="rounded-lg border border-green-600/40 bg-green-900/20 p-4 mb-4">
        <p className="text-[15px] leading-relaxed text-green-200">
          <strong className="text-green-300">Go offline before handling
          secrets.</strong> Once loaded, the app works fully offline. Disconnect
          Wi-Fi or enable airplane mode for maximum security.
        </p>
      </div>

      {/* Responsibility warning */}
      <div className="rounded-lg border border-stone-600 bg-stone-700/40 p-4 mb-6">
        <p className="text-[15px] leading-relaxed text-stone-300">
          <strong className="text-stone-200">Your security is your
          responsibility.</strong> If you lose your password or the minimum
          required Qards, your data is permanently unrecoverable. There are no
          backdoors.
        </p>
      </div>

      {/* Desktop upsell */}
      <p className="text-sm text-center text-stone-400 mb-6">
        For maximum security, consider the{' '}
        <a
          href="https://seqrets.app"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-semibold text-amber-400 hover:text-amber-300"
        >
          seQRets desktop app
        </a>{' '}
        — native Rust crypto, fully offline, no browser attack surface.
      </p>

      <Button
        onClick={onAccept}
        className="w-full bg-stone-700 text-stone-100 border-0 ring-1 ring-stone-500 hover:bg-stone-600 font-semibold text-base py-5"
      >
        I Understand
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </ModalShell>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 *  SVG Wireframe — annotated schematic of the Secure Secret tab
 *  SYNC: This component is shared between web and desktop welcome guides.
 *        Copy verbatim when updating.
 * ────────────────────────────────────────────────────────────────────────── */
function WireframeSvg() {
  const bg = '#141214';
  const card = '#1c1a1c';
  const border = '#2e2b2e';
  const text1 = '#d4cfc8';
  const text2 = '#6b6568';
  const amber = '#fbbf24';
  const font = 'system-ui, -apple-system, sans-serif';

  return (
    <svg
      viewBox="0 0 560 360"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
      role="img"
      aria-label="Schematic of the seQRets Secure Secret interface"
    >
      {/* ── Outer frame ──────────────────────────────────────── */}
      <rect width="560" height="360" rx="8" fill={bg} />
      <rect x="0.5" y="0.5" width="559" height="359" rx="8" fill="none" stroke={border} />

      {/* ── Header bar ───────────────────────────────────────── */}
      <rect x="1" y="1" width="558" height="38" rx="7" fill={card} />
      <line x1="1" y1="39" x2="559" y2="39" stroke={border} />

      {/* Ask Bob — bot icon (circle + eyes) */}
      <circle cx="28" cy="20" r="8" fill="none" stroke={amber} strokeWidth="1.5" />
      <circle cx="25" cy="18" r="1.2" fill={amber} />
      <circle cx="31" cy="18" r="1.2" fill={amber} />
      <line x1="25" y1="23" x2="31" y2="23" stroke={amber} strokeWidth="1" strokeLinecap="round" />
      <text x="42" y="24" fill={amber} fontSize="10" fontWeight="600" fontFamily={font}>Ask Bob</text>

      {/* Center title */}
      <text x="280" y="24" fill={text1} fontSize="12" fontWeight="700" fontFamily={font} textAnchor="middle">seQRets</text>

      {/* Hamburger menu */}
      <line x1="520" y1="14" x2="536" y2="14" stroke={text2} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="520" y1="20" x2="536" y2="20" stroke={text2} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="520" y1="26" x2="536" y2="26" stroke={text2} strokeWidth="1.8" strokeLinecap="round" />

      {/* ── Nav tabs ─────────────────────────────────────────── */}
      <rect x="1" y="39" width="558" height="34" fill={bg} />
      <line x1="1" y1="73" x2="559" y2="73" stroke={border} />

      {/* Active tab highlight */}
      <line x1="16" y1="71" x2="170" y2="71" stroke={amber} strokeWidth="2.5" />

      {/* Tab 1: Secure (active) */}
      <rect x="60" y="48" width="8" height="7" rx="1.5" fill="none" stroke={amber} strokeWidth="1.3" />
      <path d="M62,48 L62,45 A2.5,2.5 0 0,1 67,45 L67,48" fill="none" stroke={amber} strokeWidth="1.3" />
      <text x="74" y="58" fill={amber} fontSize="10" fontWeight="600" fontFamily={font}>Secure</text>

      {/* Tab 2: Inherit */}
      <rect x="238" y="46" width="7" height="9" rx="1" fill="none" stroke={text2} strokeWidth="1.2" />
      <line x1="240" y1="50" x2="243" y2="50" stroke={text2} strokeWidth="0.8" />
      <line x1="240" y1="52" x2="243" y2="52" stroke={text2} strokeWidth="0.8" />
      <text x="250" y="58" fill={text2} fontSize="10" fontWeight="500" fontFamily={font}>Inherit</text>

      {/* Tab 3: Restore */}
      <circle cx="418" cy="52" r="4.5" fill="none" stroke={text2} strokeWidth="1.2" />
      <circle cx="424" cy="52" r="4.5" fill="none" stroke={text2} strokeWidth="1.2" />
      <text x="433" y="58" fill={text2} fontSize="10" fontWeight="500" fontFamily={font}>Restore</text>

      {/* ── Content area ─────────────────────────────────────── */}
      <rect x="24" y="85" width="512" height="260" rx="6" fill={card} stroke={border} />

      {/* Card title */}
      <text x="44" y="108" fill={text1} fontSize="13" fontWeight="700" fontFamily={font}>Secure Your Secret</text>
      <text x="44" y="122" fill={text2} fontSize="8.5" fontFamily={font}>Follow the steps below to encrypt and split your secret.</text>

      {/* ── Step 1: Secret input ──────────────────────────── */}
      <text x="44" y="140" fill={text1} fontSize="10" fontWeight="600" fontFamily={font}>Enter Your Secret</text>

      {/* Generate Seed button */}
      <rect x="406" y="129" width="100" height="16" rx="3" fill={bg} stroke={border} />
      <line x1="414" y1="137" x2="420" y2="131" stroke={text2} strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="421" cy="130" r="1.5" fill={text2} />
      <text x="428" y="140" fill={text2} fontSize="7.5" fontFamily={font}>Generate Seed</text>

      {/* Textarea */}
      <rect x="44" y="148" width="462" height="42" rx="4" fill={bg} stroke={border} />
      <text x="56" y="165" fill={text2} fontSize="9" fontFamily={font}>Enter your seed phrase or private key...</text>
      <text x="56" y="178" fill={text2} fontSize="9" fontFamily={font} opacity="0.5">│</text>

      {/* ── Step 2: Password ──────────────────────────────── */}
      <text x="44" y="210" fill={text1} fontSize="10" fontWeight="600" fontFamily={font}>Secure Your Secret</text>

      {/* Password field */}
      <rect x="44" y="218" width="240" height="24" rx="4" fill={bg} stroke={border} />
      <text x="56" y="234" fill={text2} fontSize="10" fontFamily={font} letterSpacing="3">••••••••••</text>

      {/* Eye toggle button */}
      <rect x="290" y="218" width="24" height="24" rx="4" fill={bg} stroke={border} />
      <ellipse cx="302" cy="230" rx="6" ry="4" fill="none" stroke={text2} strokeWidth="1" />
      <circle cx="302" cy="230" r="2" fill={text2} />

      {/* Copy button */}
      <rect x="320" y="218" width="24" height="24" rx="4" fill={bg} stroke={border} />
      <rect x="326" y="223" width="7" height="7" rx="1" fill="none" stroke={text2} strokeWidth="0.8" />
      <rect x="330" y="227" width="7" height="7" rx="1" fill="none" stroke={text2} strokeWidth="0.8" />

      {/* Generate PW button */}
      <rect x="350" y="218" width="76" height="24" rx="4" fill={bg} stroke={border} />
      <line x1="360" y1="230" x2="366" y2="224" stroke={text2} strokeWidth="1" strokeLinecap="round" />
      <circle cx="367" cy="223" r="1.3" fill={text2} />
      <text x="374" y="234" fill={text2} fontSize="8" fontFamily={font}>Generate</text>

      {/* ── Step 3: Split config ──────────────────────────── */}
      <text x="44" y="262" fill={text1} fontSize="10" fontWeight="600" fontFamily={font}>Split into Qards</text>

      {/* Slider 1: Total Qards */}
      <text x="44" y="282" fill={text2} fontSize="8" fontFamily={font}>Total Qards</text>
      <rect x="116" y="276" width="100" height="4" rx="2" fill={border} />
      <rect x="116" y="276" width="60" height="4" rx="2" fill={amber} />
      <circle cx="176" cy="278" r="5" fill={amber} />
      <text x="228" y="282" fill={text1} fontSize="9" fontWeight="600" fontFamily={font}>3</text>

      {/* Slider 2: Required */}
      <text x="280" y="282" fill={text2} fontSize="8" fontFamily={font}>Required</text>
      <rect x="336" y="276" width="100" height="4" rx="2" fill={border} />
      <rect x="336" y="276" width="40" height="4" rx="2" fill={amber} />
      <circle cx="376" cy="278" r="5" fill={amber} />
      <text x="448" y="282" fill={text1} fontSize="9" fontWeight="600" fontFamily={font}>2</text>

      {/* ── CTA Button ────────────────────────────────────── */}
      <rect x="44" y="304" width="472" height="24" rx="5" fill={amber} />
      <text x="280" y="320" fill={bg} fontSize="10" fontWeight="700" fontFamily={font} textAnchor="middle">Encrypt &amp; Generate QR Qards</text>

      {/* ── Annotation circles + leader lines ─────────────── */}

      {/* Annotation ① — Ask Bob */}
      <line x1="80" y1="20" x2="95" y2="20" stroke={amber} strokeWidth="1" strokeDasharray="3,2" opacity="0.6" />
      <circle cx="105" cy="20" r="9" fill={amber} />
      <text x="105" y="24" fill={bg} fontSize="10" fontWeight="700" fontFamily={font} textAnchor="middle">1</text>

      {/* Annotation ② — Nav tabs */}
      <line x1="480" y1="56" x2="540" y2="56" stroke={amber} strokeWidth="1" strokeDasharray="3,2" opacity="0.6" />
      <circle cx="550" cy="56" r="9" fill={amber} />
      <text x="550" y="60" fill={bg} fontSize="10" fontWeight="700" fontFamily={font} textAnchor="middle">2</text>

      {/* Annotation ③ — Secret input */}
      <line x1="510" y1="168" x2="540" y2="168" stroke={amber} strokeWidth="1" strokeDasharray="3,2" opacity="0.6" />
      <circle cx="550" cy="168" r="9" fill={amber} />
      <text x="550" y="172" fill={bg} fontSize="10" fontWeight="700" fontFamily={font} textAnchor="middle">3</text>

      {/* Annotation ④ — Password & tools */}
      <line x1="430" y1="230" x2="540" y2="230" stroke={amber} strokeWidth="1" strokeDasharray="3,2" opacity="0.6" />
      <circle cx="550" cy="230" r="9" fill={amber} />
      <text x="550" y="234" fill={bg} fontSize="10" fontWeight="700" fontFamily={font} textAnchor="middle">4</text>

      {/* Annotation ⑤ — CTA button */}
      <line x1="520" y1="316" x2="540" y2="316" stroke={amber} strokeWidth="1" strokeDasharray="3,2" opacity="0.6" />
      <circle cx="550" cy="316" r="9" fill={amber} />
      <text x="550" y="320" fill={bg} fontSize="10" fontWeight="700" fontFamily={font} textAnchor="middle">5</text>

      {/* Annotation ⑥ — Menu */}
      <line x1="540" y1="20" x2="548" y2="20" stroke={amber} strokeWidth="1" strokeDasharray="3,2" opacity="0.6" />
      <circle cx="550" cy="20" r="9" fill={amber} />
      <text x="550" y="24" fill={bg} fontSize="10" fontWeight="700" fontFamily={font} textAnchor="middle">6</text>
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 *  Modal 2 — Welcome + App Wireframe Tour
 * ────────────────────────────────────────────────────────────────────────── */
function WelcomeModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <ModalShell open={open} stepLabel="Step 2 of 2">
      <DialogPrimitive.Title className="sr-only">
        Welcome to seQRets
      </DialogPrimitive.Title>

      {/* Logo & tagline */}
      <div className="flex items-center justify-center gap-3 mb-5">
        <img
          src="/icons/logo-dark.webp"
          alt="seQRets logo"
          className="h-14 w-14"
        />
        <div>
          <div className="text-3xl font-bold text-stone-100">seQRets</div>
          <div className="text-sm tracking-wide text-stone-400">
            Secure. Split. Share.
          </div>
        </div>
      </div>

      <p className="text-center text-[15px] leading-relaxed text-stone-300 mb-6">
        Protect your secrets today — ensure the right people can access them
        tomorrow. Here&rsquo;s a quick look at the interface:
      </p>

      {/* ── SVG Wireframe ────────────────────────────────────── */}
      <div className="rounded-lg overflow-hidden mb-6">
        <WireframeSvg />
      </div>

      {/* ── Numbered legend ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-6 text-[13px]">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-bold">①</span>
          <span className="text-stone-300">
            <strong className="text-stone-200">Ask Bob</strong> — AI assistant
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-bold">②</span>
          <span className="text-stone-300">
            <strong className="text-stone-200">Tabs</strong> — Secure Secret, Inheritance, Restore Secret
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-bold">③</span>
          <span className="text-stone-300">
            <strong className="text-stone-200">Secret</strong> — Enter or generate a seed phrase
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-bold">④</span>
          <span className="text-stone-300">
            <strong className="text-stone-200">Password</strong> — Generate, copy, or enter your own
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-bold">⑤</span>
          <span className="text-stone-300">
            <strong className="text-stone-200">Encrypt</strong> — Generate QR Qards
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-bold">⑥</span>
          <span className="text-stone-300">
            <strong className="text-stone-200">Menu</strong> — Settings & theme
          </span>
        </div>
      </div>

      <Button
        onClick={onClose}
        className="w-full bg-stone-700 text-stone-100 border-0 ring-1 ring-stone-500 hover:bg-stone-600 font-semibold text-base py-5"
      >
        Let&rsquo;s Go
      </Button>
    </ModalShell>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 *  Orchestrator
 * ────────────────────────────────────────────────────────────────────────── */
export function WelcomeGuide({ activeTab }: WelcomeGuideProps) {
  const [modal, setModal] = useState<'closed' | 'security' | 'welcome'>(
    'closed'
  );

  useEffect(() => {
    try {
      const hasSeenGuide = localStorage.getItem(WELCOME_GUIDE_KEY);
      if (!hasSeenGuide) {
        setModal('security');
      }
    } catch {
      setModal('security');
    }
  }, []);

  const handleSecurityAccept = () => setModal('welcome');

  const handleClose = () => {
    try {
      localStorage.setItem(WELCOME_GUIDE_KEY, 'true');
    } catch {
      /* ignore */
    }
    setModal('closed');
  };

  return (
    <>
      <SecurityModal
        open={modal === 'security'}
        onAccept={handleSecurityAccept}
      />
      <WelcomeModal open={modal === 'welcome'} onClose={handleClose} />
    </>
  );
}
