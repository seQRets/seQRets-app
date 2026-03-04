import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, Shield, Scale, AlertTriangle, Gavel, Code, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/header";
import { AppFooter } from "@/components/app-footer";

export default function TermsPage() {
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
                        Terms of Service
                    </h1>
                    <p className="text-sm text-muted-foreground">Last updated: March 3, 2026</p>
                </div>

                <Card className="mb-6">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <FileText className="h-6 w-6 text-primary" />
                            <CardTitle>Agreement to Terms</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2">
                        <p className="text-foreground font-semibold">
                            By using seQRets, you agree to these terms. If you don't agree, don't use it.
                        </p>
                        <p>
                            These Terms of Service ("Terms") govern your access to and use of the seQRets website at <span className="text-foreground font-medium">seqrets.app</span>, the web application at <span className="text-foreground font-medium">app.seqrets.app</span>, and the seQRets desktop application (collectively, the "Services"), operated by seQRets ("we," "us," or "our"). By accessing or using any of our Services, you agree to be bound by these Terms. If you do not agree, you must discontinue use immediately.
                        </p>
                    </CardContent>
                </Card>

                <div className="space-y-6 mb-8">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Shield className="h-5 w-5 text-primary" />
                                <CardTitle className="text-base">What seQRets Does</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-2">
                            <p>
                                seQRets provides client-side cryptographic tools for encrypting sensitive information and splitting it into threshold shares using Shamir's Secret Sharing, rendered as QR codes ("Qards"). The Services operate entirely on your device.
                            </p>
                            <p>
                                We do not operate servers that process, store, or have access to your secrets, passwords, shares, or any cryptographic material. <span className="text-foreground font-medium">We have no ability to recover lost data.</span>
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Scale className="h-5 w-5 text-primary" />
                                <CardTitle className="text-base">Your Responsibilities</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-2">
                            <p>You're responsible for your own secrets, passwords, and Qard shares. If you lose them, they're gone. We can't help you recover anything — that's a feature, not a limitation.</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><span className="text-foreground font-medium">Password management</span> — You are solely responsible for remembering or securely storing the passwords used to encrypt your secrets. There is no password recovery mechanism.</li>
                                <li><span className="text-foreground font-medium">Share custody</span> — You are responsible for the safekeeping and distribution of your Qard shares. If you lose enough shares to fall below your chosen threshold, your secret is irrecoverable.</li>
                                <li><span className="text-foreground font-medium">Device security</span> — You are responsible for ensuring the device on which you run seQRets is free from malware, unauthorized browser extensions, and other threats.</li>
                                <li><span className="text-foreground font-medium">Lawful use</span> — You agree to use the Services only for lawful purposes and in compliance with all applicable laws and regulations in your jurisdiction.</li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="border-destructive/20">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                                <CardTitle className="text-base">Disclaimer of Warranties</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-2">
                            <p>seQRets is provided "as is." It's beta software that hasn't been independently audited yet. We believe the cryptography is sound — the code is open source and uses well-audited primitives — but we make no guarantees. Use it at your own risk.</p>
                            <p className="uppercase text-xs font-semibold">
                                The Services are provided "as is" and "as available," without warranty of any kind, express or implied, including but not limited to the implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Services will be uninterrupted, error-free, or free of vulnerabilities. seQRets has not undergone an independent third-party security audit. You acknowledge that you use the Services at your own risk.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Gavel className="h-5 w-5 text-primary" />
                                <CardTitle className="text-base">Limitation of Liability</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-2">
                            <p>We are not liable if you lose access to your secrets, lose cryptocurrency, or suffer any other loss from using seQRets. Because we have zero access to your data, we have zero ability to help recover it.</p>
                            <p>
                                To the maximum extent permitted by applicable law, in no event shall seQRets, its contributors, maintainers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, cryptocurrency, digital assets, or other intangible losses, resulting from (a) your use of or inability to use the Services; (b) loss of access to encrypted secrets, shares, passwords, or Qards; (c) unauthorized access to or alteration of your device or data; (d) any bugs, errors, or vulnerabilities in the software; or (e) any other matter relating to the Services.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Code className="h-5 w-5 text-primary" />
                                <CardTitle className="text-base">Open Source License</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-2">
                            <p>
                                The seQRets source code is released under the <span className="text-foreground font-medium">GNU Affero General Public License, version 3 (AGPLv3)</span>. You may use, copy, modify, and distribute the source code in accordance with that license. The full license text is available in the project's{' '}
                                <a href="https://github.com/seQRets/seQRets-app" target="_blank" rel="noopener noreferrer" className="underline text-foreground hover:text-primary">GitHub repository</a>.
                            </p>
                            <p>
                                For commercial licensing inquiries, contact{' '}
                                <a href="mailto:licensing@seqrets.app" className="underline text-foreground hover:text-primary" target="_blank" rel="noopener noreferrer">licensing@seqrets.app</a>.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <ShoppingBag className="h-5 w-5 text-primary" />
                                <CardTitle className="text-base">Purchases</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-2">
                            <p>
                                Certain products, including the seQRets desktop application and physical accessories, may be offered for purchase. All payment processing is handled by third-party providers. We do not directly collect or store payment information. Specific purchase terms, including refund policies and delivery terms, will be provided at the point of sale.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <Card className="mb-6">
                    <CardContent className="pt-6 text-sm text-muted-foreground space-y-4">
                        <div>
                            <p className="text-foreground font-semibold mb-1">Intellectual Property</p>
                            <p>The seQRets name, logo, and branding are the property of seQRets. The source code is licensed under AGPLv3 as described above. Third-party libraries retain their respective licenses.</p>
                        </div>
                        <div>
                            <p className="text-foreground font-semibold mb-1">Termination</p>
                            <p>Since seQRets has no accounts, there is nothing to "terminate." You may stop using the Services at any time. Because the software is open source, the cryptographic tools remain available regardless of the status of our hosted Services.</p>
                        </div>
                        <div>
                            <p className="text-foreground font-semibold mb-1">Changes to These Terms</p>
                            <p>We may update these Terms from time to time. The revised version will be posted here with an updated date. Your continued use constitutes acceptance. Material changes will also be noted in our{' '}
                                <a href="https://github.com/seQRets/seQRets-app" target="_blank" rel="noopener noreferrer" className="underline text-foreground hover:text-primary">GitHub repository</a>.
                            </p>
                        </div>
                        <div>
                            <p className="text-foreground font-semibold mb-1">Governing Law</p>
                            <p>These Terms shall be governed by and construed in accordance with applicable law, without regard to conflict of law principles.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="mb-8 border-primary/20">
                    <CardContent className="pt-6 text-sm text-muted-foreground space-y-2">
                        <p className="text-foreground font-semibold">Contact</p>
                        <p>
                            If you have questions about these Terms, contact us at{' '}
                            <a href="mailto:hello@seqrets.app" className="underline text-foreground hover:text-primary" target="_blank" rel="noopener noreferrer">
                                hello@seqrets.app
                            </a>.
                        </p>
                    </CardContent>
                </Card>

                <AppFooter />
            </div>
        </main>
    );
}
