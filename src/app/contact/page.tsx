

'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, ShieldCheck, Bot, ExternalLink, Copy, Check } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Header } from "../components/header";
import { AppFooter } from "../components/app-footer";
import { useToast } from "@/hooks/use-toast";

export default function ContactPage() {
    const { toast } = useToast();
    const [copied, setCopied] = React.useState<string | null>(null);

    const copyToClipboard = (email: string) => {
        navigator.clipboard.writeText(email);
        setCopied(email);
        toast({ description: "Email address copied to clipboard" });
        setTimeout(() => setCopied(null), 2000);
    };

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
                    <h2 className="text-2xl font-bold text-foreground mb-2">Contact Support</h2>
                    <p className="text-muted-foreground max-w-xl mx-auto">
                        Need help from a human? Reach out to the seQRets team directly via email.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Mail className="h-6 w-6 text-[#34d399]" />
                                <CardTitle>Send Email</CardTitle>
                            </div>
                            <CardDescription>General questions, feedback, and support</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-muted-foreground">
                            <p>
                                For general inquiries, feature requests, or support questions, email us at:
                            </p>
                            <div className="flex items-center gap-2">
                                <a
                                    href="mailto:hello@seqrets.app?subject=seQRets Support Request"
                                    className="inline-flex items-center gap-2 rounded-md px-4 py-2 font-medium bg-primary text-primary-foreground transition-all hover:bg-primary/80 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <Mail className="h-4 w-4" />
                                    hello@seqrets.app
                                </a>
                                <button
                                    onClick={() => copyToClipboard('hello@seqrets.app')}
                                    className="inline-flex items-center justify-center rounded-md border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                    aria-label="Copy email address"
                                >
                                    {copied === 'hello@seqrets.app' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="h-6 w-6 text-[#fbbf24]" />
                                <CardTitle>Send Encrypted Email</CardTitle>
                            </div>
                            <CardDescription>PGP-encrypted for sensitive inquiries</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-muted-foreground">
                            <p>
                                For sensitive inquiries, email us at the address below and encrypt with our PGP public key.
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                                <a
                                    href="mailto:seqrets@proton.me?subject=seQRets Support Request (Encrypted)"
                                    className="inline-flex items-center gap-2 rounded-md px-4 py-2 font-medium bg-primary text-primary-foreground transition-all hover:bg-primary/80 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <ShieldCheck className="h-4 w-4" />
                                    seqrets@proton.me
                                </a>
                                <button
                                    onClick={() => copyToClipboard('seqrets@proton.me')}
                                    className="inline-flex items-center justify-center rounded-md border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                    aria-label="Copy encrypted email address"
                                >
                                    {copied === 'seqrets@proton.me' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </button>
                                <a
                                    href="https://seqrets.app/pgp"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-md px-4 py-2 font-medium bg-primary text-primary-foreground transition-all hover:bg-primary/80 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    PGP Key
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Before You Email</CardTitle>
                        <CardDescription>You might find your answer faster with Bob AI</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-muted-foreground text-center">
                        <p>
                            Our AI assistant Bob is an expert on seQRets and can help with most questions about encryption, Qard management, inheritance planning, smart cards, and more.
                        </p>
                        <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/80 hover:shadow-md">
                            <Link href="/support">
                                <Bot className="mr-2 h-4 w-4" />
                                Ask Bob AI
                            </Link>
                        </Button>
                        <p className="pt-3 border-t text-xs">
                            For security vulnerabilities, please email <a href="mailto:security@seqrets.app" className="underline hover:text-foreground">security@seqrets.app</a> directly.
                        </p>
                    </CardContent>
                </Card>

                <AppFooter />
            </div>
        </main>
    );
}
