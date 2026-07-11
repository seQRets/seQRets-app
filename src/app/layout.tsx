import type { Metadata, Viewport } from 'next';
import './globals.css';
import './fonts.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from './components/theme-provider';
import { PwaInstallBanner } from './components/pwa-install-banner';
import { TermsGate } from './components/terms-gate';
import React from 'react';

export const viewport: Viewport = {
  themeColor: '#231f20',
};

export const metadata: Metadata = {
  title: 'seQRets — Secure. Split. Share.',
  description: 'Encrypt, split, and secure your secrets with QR codes using Shamir\'s Secret Sharing. Zero-knowledge crypto inheritance for Bitcoin seed phrases.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'seQRets',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
  openGraph: {
    title: 'seQRets — Secure. Split. Share.',
    description: 'Encrypt, split, and secure your secrets with QR codes using Shamir\'s Secret Sharing. Zero-knowledge crypto inheritance.',
    url: 'https://app.seqrets.app',
    siteName: 'seQRets',
    type: 'website',
    images: [
      {
        url: 'https://app.seqrets.app/icons/og-image-app.png',
        width: 1200,
        height: 630,
        alt: 'seQRets — Secure. Split. Share.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'seQRets — Secure. Split. Share.',
    description: 'Encrypt, split, and secure your secrets with QR codes using Shamir\'s Secret Sharing.',
    images: ['https://app.seqrets.app/icons/og-image-app.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content={[
            "default-src 'self'",
            // 'unsafe-eval' is added ONLY in development: Next.js dev mode (React
            // server-dom / Turbopack) uses eval() for callstack reconstruction and
            // throws a blocking overlay without it. Production builds are a static
            // export that never use eval(), so the prod policy stays strict.
            `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
            // Fonts are self-hosted (public/fonts + fonts.css) — no Google
            // Fonts origins in the policy, and no third-party ping on load.
            "style-src 'self' 'unsafe-inline'",
            "font-src 'self'",
            "img-src 'self' data: blob:",
            "connect-src 'self' https://api.coinbase.com https://generativelanguage.googleapis.com",
            "worker-src 'self' blob:",
            "frame-src 'none'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; ')}
        />
      </head>
      <body className="font-body antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: process.env.NODE_ENV === 'development' ? `
              // DEV ONLY: never run the service worker against the dev server.
              // Client navigations fetch RSC payloads (?_rsc=...) that the SW's
              // cache-first branch would keep across recompiles; once the chunk
              // graph changes, the stale payload references dead chunk URLs and
              // routes hang or never render. The cache name only rotates on
              // release, so in dev the rot accumulates. Unregister + clear to
              // heal browsers that already have a SW from an earlier session.
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(regs) {
                  regs.forEach(function(r) { r.unregister(); });
                });
                if (window.caches) {
                  caches.keys().then(function(keys) {
                    keys.filter(function(k) { return k.indexOf('seqrets-') === 0; })
                        .forEach(function(k) { caches.delete(k); });
                  });
                }
              }
            ` : `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    reg.addEventListener('updatefound', function() {
                      var newSW = reg.installing;
                      if (!newSW) return;
                      newSW.addEventListener('statechange', function() {
                        if (newSW.state === 'activated' && navigator.serviceWorker.controller) {
                          var d = document.createElement('div');
                          d.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:40;background:#231f20;color:#fff;padding:12px 20px;border-radius:8px;font-size:14px;font-family:system-ui,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.3);display:flex;align-items:center;gap:12px';
                          d.innerHTML = 'A new version is available <button style="background:#f59e0b;color:#231f20;border:none;padding:4px 12px;border-radius:4px;font-weight:600;cursor:pointer;font-size:13px" onclick="window.location.reload()">Refresh</button>';
                          document.body.appendChild(d);
                        }
                      });
                    });
                  }).catch(function() {});
                });
              }
            `,
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
            <PwaInstallBanner />
            <TermsGate>
              {children}
            </TermsGate>
            <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
