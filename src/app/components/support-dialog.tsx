'use client';

/**
 * Bitcoin donation prompt for the free web app.
 *
 * Mirrors the pattern in IttyBitz: "♡ Enjoying seQRets? Support this
 * project" in the lower-left of the footer, opening a dialog with a
 * QR code and a clickable URL pointing at the project's coinos.io
 * receive page. Web-only — the desktop app has its own monetization
 * path and does not surface this prompt.
 *
 * The QR is generated lazily on first dialog open (so users who never
 * click the link don't pay the QR-generation cost). Visual styling
 * matches IttyBitz: tiny red heart, text-xs muted, brand-colored
 * "Support this project" link, and a white card around the QR for
 * scanning contrast against dark themes.
 */

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import QRCode from 'qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const DONATE_URL = 'https://coinos.io/SVRN_Money/receive';

export function SupportButton() {
  const [open, setOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || qrDataUrl) return;
    QRCode.toDataURL(DONATE_URL, { width: 512, margin: 1, errorCorrectionLevel: 'M' })
      .then(setQrDataUrl)
      .catch((err) => console.error('Donate QR generation failed:', err));
  }, [open, qrDataUrl]);

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Heart className="h-3 w-3 text-red-500" aria-hidden />
      <span>Enjoying seQRets?</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="link" className="h-auto p-0 text-xs text-primary">
            Support this project
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Support seQRets</DialogTitle>
            <DialogDescription>
              If you find this tool useful, please consider supporting its development. Your donation helps keep the project alive and ad-free.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="rounded-lg bg-white p-4">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- generated data URL, next/image not needed
                <img
                  src={qrDataUrl}
                  alt={`Bitcoin donation QR linking to ${DONATE_URL}`}
                  className="w-32 h-32"
                />
              ) : (
                <div className="w-32 h-32 bg-muted animate-pulse rounded" aria-label="Loading QR code" />
              )}
            </div>
            <a
              href={DONATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline break-all"
            >
              {DONATE_URL}
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
