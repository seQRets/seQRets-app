'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Rocket, Shield, ShieldAlert, ShieldCheck, Check, Minus, ExternalLink } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Header } from "../components/header";
import { AppFooter } from "../components/app-footer";

const features = [
    { name: 'XChaCha20-Poly1305 encryption', web: true, desktop: true },
    { name: "Shamir's Secret Sharing", web: true, desktop: true },
    { name: 'Argon2id key derivation (64MB, 3 iter)', web: true, desktop: true },
    { name: 'BIP-39 seed phrase support', web: true, desktop: true },
    { name: 'Inheritance Plan (file upload)', web: true, desktop: true },
    { name: 'Camera QR scanning', web: true, desktop: true },
    { name: 'Works offline after load', web: true, desktop: true },
    { name: 'Inheritance Plan (in-app builder)', web: false, desktop: true },
    { name: 'JavaCard smart card support', web: false, desktop: true },
    { name: 'Native Rust crypto backend', web: false, desktop: true },
    { name: 'Compiler-fence key zeroization', web: false, desktop: true },
    { name: 'Browser extension immune', web: false, desktop: true },
    { name: 'Code-signed binary', web: false, desktop: true },
    { name: 'Automatic updates', web: false, desktop: true },
];

export default function GoProPage() {
    return (
        <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12">
            <div className="w-full max-w-4xl mx-auto relative">
                <div className="absolute top-4 left-4 z-50">
                    <Button asChild variant="outline" size="sm">
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to App
                        </Link>
                    </Button>
                </div>
                <Header />

                {/* Hero */}
                <div className="text-center mb-10 pt-16 sm:pt-0">
                    <div className="flex justify-center items-center gap-2.5 mb-6">
                        <Image src="/icons/logo-light.webp" alt="seQRets Logo" width={144} height={144} className="self-start -mt-2 dark:hidden" priority />
                        <Image src="/icons/logo-dark.webp" alt="seQRets Logo" width={144} height={144} className="self-start -mt-2 hidden dark:block" priority />
                        <div>
                            <h1 className="font-body text-5xl md:text-7xl font-black text-foreground tracking-tighter">
                                seQRets
                            </h1>
                            <p className="text-right text-base font-bold text-foreground tracking-wide">
                                Secure. Split. Share.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Rocket className="h-6 w-6 text-primary" />
                        <h2 className="text-2xl font-bold">Go Pro</h2>
                    </div>
                    <p className="text-muted-foreground max-w-xl mx-auto">
                        Maximum security for your most valuable secrets.
                    </p>
                    <a href="https://seqrets.app/shop" target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1.5 mt-4 text-sm text-primary hover:text-primary/80 underline underline-offset-4 transition-colors">
                        Browse the shop <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                </div>

                {/* Why Upgrade */}
                <Card className="mb-6">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <ShieldAlert className="h-6 w-6 text-destructive" />
                            <CardTitle>Why the Desktop App?</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-4">
                        <p>
                            The seQRets web app uses the same battle-tested cryptography as the desktop version &mdash; your secrets are encrypted with <span className="font-semibold text-foreground">XChaCha20-Poly1305</span> and never leave your browser. But browsers have inherent limitations that no web app can fully overcome:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 rounded-lg border bg-muted/30">
                                <p className="font-semibold text-foreground mb-1">Browser Extensions</p>
                                <p className="text-xs">Malicious extensions can read DOM values, intercept keystrokes, and access clipboard data &mdash; regardless of what the page does. This is the most serious, unmitigated web app threat.</p>
                            </div>
                            <div className="p-4 rounded-lg border bg-muted/30">
                                <p className="font-semibold text-foreground mb-1">JS Memory</p>
                                <p className="text-xs">JavaScript strings are immutable. Passwords live in the V8 heap until garbage collected, which may never happen within a session. Derived keys are zeroed via fill(0), but the password string cannot be.</p>
                            </div>
                            <div className="p-4 rounded-lg border bg-muted/30">
                                <p className="font-semibold text-foreground mb-1">Supply Chain</p>
                                <p className="text-xs">The JavaScript served at load time could theoretically be tampered with at the CDN or build level. Going offline after load mitigates mid-session swaps but not pre-load compromises.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 pt-2 border-t">
                            <ShieldCheck className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                            <p>
                                The <span className="font-semibold text-foreground">seQRets Desktop App</span> eliminates all three threats. Tauri&apos;s WebView doesn&apos;t load browser extensions, the Rust crypto backend keeps derived keys out of the JS heap entirely with compiler-fence zeroization, and the code-signed binary verifies integrity at install time.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Feature Comparison */}
                <Card className="mb-6">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Shield className="h-6 w-6 text-primary" />
                            <CardTitle>Feature Comparison</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 sm:p-6">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-3 font-semibold">Feature</th>
                                        <th className="text-center p-3 font-semibold w-24">Web</th>
                                        <th className="text-center p-3 font-semibold w-24 text-primary">Desktop</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {features.map((f, i) => (
                                        <tr key={i} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                                            <td className="p-3 text-muted-foreground">{f.name}</td>
                                            <td className="p-3 text-center">
                                                {f.web
                                                    ? <Check className="h-4 w-4 text-green-600 mx-auto" strokeWidth={3} />
                                                    : <Minus className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                                                }
                                            </td>
                                            <td className="p-3 text-center">
                                                {f.desktop
                                                    ? <Check className="h-4 w-4 text-green-600 mx-auto" strokeWidth={3} />
                                                    : <Minus className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Desktop-Only Highlights */}
                <Card className="mb-8">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Rocket className="h-6 w-6 text-primary" />
                            <CardTitle>Desktop Exclusives</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" strokeWidth={3} />
                                <p><span className="font-semibold text-foreground">In-app Inheritance Plan builder</span> &mdash; structured 8-section form for creating detailed recovery instructions. Encrypts as compact JSON that fits on a smart card.</p>
                            </div>
                            <div className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" strokeWidth={3} />
                                <p><span className="font-semibold text-foreground">JavaCard smart card support</span> &mdash; store shares, vaults, keyfiles, and inheritance plans on JCOP3 hardware with optional PIN protection.</p>
                            </div>
                            <div className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" strokeWidth={3} />
                                <p><span className="font-semibold text-foreground">Native Rust crypto</span> &mdash; all key derivation and encryption runs in Rust via Tauri IPC. Keys never enter the JS heap and are zeroized with compiler-fence guarantees.</p>
                            </div>
                            <div className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" strokeWidth={3} />
                                <p><span className="font-semibold text-foreground">Clone card &amp; Smart Card Manager</span> &mdash; manage PINs, clone cards between readers, delete individual items, and factory reset from a dedicated management page.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* CTA */}
                <div className="text-center mb-8">
                    <a href="https://seqrets.app/shop" target="_blank" rel="noopener noreferrer">
                        <Button size="lg" className="text-lg px-8 py-6 bg-primary text-primary-foreground hover:bg-primary/80 hover:shadow-lg transition-all">
                            Get seQRets Desktop
                            <ExternalLink className="ml-2 h-5 w-5" />
                        </Button>
                    </a>
                    <p className="text-xs text-muted-foreground mt-3">
                        Available for macOS, Windows, and Linux.
                    </p>
                </div>

                <AppFooter />
            </div>
        </main>
    );
}
