import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from './components/theme-provider';
import React from 'react';

export const metadata: Metadata = {
  title: 'seQRets — Secure. Split. Share.',
  description: 'Encrypt, split, and secure your secrets with QR codes using Shamir\'s Secret Sharing. Zero-knowledge crypto inheritance for Bitcoin seed phrases.',
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,700;0,800;0,900;1,800&family=Poppins:wght@700&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
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
