import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from './components/theme-provider';
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
        url: 'https://app.seqrets.app/icons/og-image.png',
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
    images: ['https://app.seqrets.app/icons/og-image.png'],
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
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob:",
            "connect-src 'self' https://api.coinbase.com https://generativelanguage.googleapis.com",
            "worker-src 'self' blob:",
            "frame-src 'none'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; ')}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,700;0,800;0,900;1,800&family=Poppins:wght@700&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `
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
            {children}
            <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
