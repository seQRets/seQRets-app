import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ShieldCheck, EyeOff, Database, Bot, Globe, HardDrive } from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/header";
import { ConnectionStatus } from "@/components/connection-status";

export default function PrivacyPage() {
    return (
        <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12">
            <div className="w-full max-w-4xl mx-auto relative">
                <div className="absolute top-4 left-4 z-50">
                    <Button asChild variant="outline" size="sm">
                        <Link to="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to App
                        </Link>
                    </Button>
                </div>
                <Header />

                <div className="text-center mb-10 pt-16 sm:pt-0">
                    <h1 className="font-body text-4xl md:text-5xl font-black text-foreground tracking-tighter mb-2">
                        Privacy Policy
                    </h1>
                    <p className="text-sm text-muted-foreground">Last updated: February 27, 2026</p>
                </div>

                <Card className="mb-6">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="h-6 w-6 text-primary" />
                            <CardTitle>The Short Version</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2">
                        <p className="text-foreground font-semibold">
                            seQRets does not collect, store, transmit, or sell your data. Period.
                        </p>
                        <p>
                            All encryption, decryption, and secret splitting happens entirely on your machine.
                            Your secrets, passwords, keyfiles, and Qards never leave your device. There are no
                            user accounts, no cloud storage, no servers processing your data, and no telemetry
                            of any kind.
                        </p>
                    </CardContent>
                </Card>

                <div className="space-y-6 mb-8">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <EyeOff className="h-5 w-5 text-primary" />
                                <CardTitle className="text-base">No Tracking or Analytics</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-2">
                            <p>seQRets does not use any analytics, tracking, fingerprinting, or telemetry services. There is:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>No usage tracking</li>
                                <li>No error reporting services</li>
                                <li>No crash analytics</li>
                                <li>No ad networks</li>
                                <li>No user behavior monitoring</li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <HardDrive className="h-5 w-5 text-primary" />
                                <CardTitle className="text-base">Local Storage</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-2">
                            <p>seQRets stores a small amount of data locally on your machine solely for app preferences:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><span className="text-foreground font-medium">Theme preference</span> &mdash; remembering your light/dark mode choice</li>
                                <li><span className="text-foreground font-medium">Welcome guide</span> &mdash; remembering that you dismissed the onboarding guide</li>
                                <li><span className="text-foreground font-medium">Bob AI disclaimer</span> &mdash; remembering that you acknowledged the AI disclaimer</li>
                                <li><span className="text-foreground font-medium">Bob AI API key</span> &mdash; your Gemini API key, if you choose to provide one (stored locally, never transmitted to seQRets)</li>
                                <li><span className="text-foreground font-medium">Bob AI chat history</span> &mdash; your conversation with Bob, stored locally for session continuity</li>
                            </ul>
                            <p>This data never leaves your machine and is never sent anywhere.</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Database className="h-5 w-5 text-primary" />
                                <CardTitle className="text-base">Data Processing</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-2">
                            <p>All cryptographic operations are performed natively on your machine:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Key derivation (<span className="text-foreground font-medium">Argon2id</span>) runs natively in Rust via Tauri IPC</li>
                                <li>Encryption and decryption (<span className="text-foreground font-medium">XChaCha20-Poly1305</span>) runs natively in Rust</li>
                                <li>Derived keys exist only inside the Rust process and are <span className="text-foreground font-medium">zeroized</span> immediately after use (compiler-fence guaranteed via the Rust <code className="text-xs bg-muted px-1 py-0.5 rounded">zeroize</code> crate)</li>
                                <li>QR codes are generated locally</li>
                                <li>Secret restoration happens locally</li>
                                <li>Inheritance plans are encrypted and decrypted locally</li>
                                <li>Smart card operations communicate only with a physically connected reader</li>
                            </ul>
                            <p>No data is sent to any seQRets server because <span className="text-foreground font-medium">there are no seQRets servers</span>.</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Bot className="h-5 w-5 text-primary" />
                                <CardTitle className="text-base">Bob AI Assistant (Optional)</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-2">
                            <p>
                                Bob is an optional AI assistant powered by <span className="text-foreground font-medium">Google's Gemini API</span>.
                                If you choose to use Bob, your chat messages are sent directly from the app to Google's servers for processing.
                            </p>
                            <p>When using Bob:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Messages are sent to Google's Gemini API using <span className="text-foreground font-medium">your own API key</span></li>
                                <li>seQRets never sees, stores, or relays these messages</li>
                                <li>Google's <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer" className="underline text-foreground hover:text-primary">Gemini API Terms of Service</a> and privacy policies apply to those interactions</li>
                                <li>You are warned about this before your first use of Bob</li>
                            </ul>
                            <p className="font-semibold text-foreground">Do not share secrets, passwords, seed phrases, or private keys with Bob.</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Globe className="h-5 w-5 text-primary" />
                                <CardTitle className="text-base">External Network Requests</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-2">
                            <p>The seQRets desktop app makes only three optional external network requests:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><span className="text-foreground font-medium">Update checker</span> &mdash; checks for new versions of seQRets via the Tauri updater. No user data is sent. This is a read-only request that compares your version against the latest release.</li>
                                <li><span className="text-foreground font-medium">Bitcoin price ticker</span> &mdash; fetches the current BTC/USD price from the Coinbase public API. No user data is sent. This is a read-only, unauthenticated request.</li>
                                <li><span className="text-foreground font-medium">Bob AI</span> &mdash; if you choose to use it, chat messages are sent to Google's Gemini API (see above).</li>
                            </ul>
                            <p>All core functionality (encryption, splitting, QR generation, restoration, smart card operations) works fully offline with no network access required.</p>
                        </CardContent>
                    </Card>
                </div>

                <Card className="mb-8 border-primary/20">
                    <CardContent className="pt-6 text-sm text-muted-foreground space-y-2">
                        <p className="text-foreground font-semibold">Contact</p>
                        <p>
                            If you have questions about this privacy policy, contact us at{' '}
                            <a href="mailto:security@seqrets.app" className="underline text-foreground hover:text-primary" target="_blank" rel="noopener noreferrer">
                                security@seqrets.app
                            </a>.
                        </p>
                        <p className="text-xs pt-2 border-t">
                            This policy applies to the seQRets desktop app. The source code is available on{' '}
                            <a href="https://github.com/seQRets/seQRets-app" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
                                GitHub
                            </a>{' '}for independent verification.
                        </p>
                    </CardContent>
                </Card>

                <footer className="text-center text-sm text-muted-foreground pb-8">
                    <p>&copy; {new Date().getFullYear()} seQRets. All rights reserved.</p>
                    <p className="mt-1">All data is processed locally. Your security is your responsibility.</p>
                    <p className="mt-1"><ConnectionStatus /></p>
                </footer>
            </div>
        </main>
    );
}
