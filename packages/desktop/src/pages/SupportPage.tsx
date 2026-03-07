import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Bot } from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/header";
import { useTheme } from "@/components/theme-provider";
import logoLight from "@/assets/icons/logo-light.png";
import logoDark from "@/assets/icons/logo-dark.png";
import { BobChatInterface } from '@/components/bob-chat-interface';
import { AppFooter } from "@/components/app-footer";

export default function SupportPage() {
    const { theme } = useTheme();
    const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const appIcon = isDark ? logoDark : logoLight;

    return (
        <main className="flex min-h-screen flex-col items-center p-4 sm:p-6 md:p-8">
            <div className="w-full max-w-4xl mx-auto relative flex flex-col h-[calc(100vh-4rem)]">
                <div className="absolute top-2 left-2 z-50">
                    <Button asChild variant="outline" size="sm">
                        <Link to="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to App
                        </Link>
                    </Button>
                </div>
                <Header />

                <header className="text-center mb-3 pt-12 sm:pt-0">
                    <div className="flex justify-center items-center gap-2">
                        <img src={appIcon} alt="seQRets Logo" width={80} height={80} className="self-start -mt-1" />
                        <div>
                            <h1 className="font-body text-4xl md:text-5xl font-black text-foreground tracking-tighter">
                                seQRets
                            </h1>
                            <p className="text-right text-sm font-bold text-foreground tracking-wide">
                                Secure. Split. Share.
                            </p>
                        </div>
                    </div>
                </header>

                <Card className="flex flex-col flex-grow min-h-0 dark:bg-[#2b2728]">
                    <CardHeader className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            <Bot className="h-6 w-6" />
                            <div>
                                <CardTitle className="text-xl">Ask Bob AI</CardTitle>
                                <CardDescription className="text-sm">Your AI-powered expert on seQRets. Ask me anything about the app.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow flex flex-col px-6 pb-6 pt-0 min-h-0">
                       <BobChatInterface initialMessage="How can I help you with seQRets today?" />
                    </CardContent>
                </Card>
                <AppFooter />
            </div>
        </main>
    );
}
