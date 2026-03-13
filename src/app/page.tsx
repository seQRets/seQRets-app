'use client';

import { CreateSharesForm } from "@/app/components/create-shares-form";
import { RestoreSecretForm } from "@/app/components/restore-secret-form";
import { Bot } from "lucide-react";
import { AppNavTabs } from "./components/app-nav-tabs";
import Image from "next/image";
import React, { useEffect } from "react";
import { Header } from "./components/header";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BobChatInterface } from "./components/bob-chat-interface";
import { BitcoinTicker } from "./components/bitcoin-ticker";
import { AppFooter } from "./components/app-footer";
import { WelcomeGuide } from "./components/welcome-guide";


function App() {
  const [activeTab, setActiveTab] = React.useState<'create' | 'restore'>('create');

  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'create' || tab === 'restore') {
      setActiveTab(tab);
    }
  }, [searchParams]);


  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12">
      <WelcomeGuide activeTab={activeTab} />
      <div className="w-full max-w-4xl mx-auto relative">
        <div className="absolute top-4 left-4 z-50">
            <Popover>
              <PopoverTrigger asChild>
                 <Button variant="outline" className="hidden md:inline-flex hover:bg-accent text-foreground" >
                    <Bot className="mr-2 h-5 w-5" />
                    Ask Bob
                </Button>
              </PopoverTrigger>
               <PopoverContent align="start" className="w-96 h-[32rem] dark:bg-[#2b2728]">
                  <BobChatInterface
                    initialMessage="Hi! I'm Bob, your AI assistant. How can I help you with seQRets today?"
                    showLinkToFullPage={true}
                  />
               </PopoverContent>
            </Popover>
             <Button asChild size="icon" variant="outline" className="md:hidden inline-flex">
                <Link href="/support">
                    <Bot className="h-5 w-5" />
                    <span className="sr-only">Ask Bob</span>
                </Link>
            </Button>
        </div>
        <Header activeTab={activeTab} onTabChange={setActiveTab}/>
        <header className="text-center mb-6 pt-16 sm:pt-0">
          <div className="flex justify-center items-center gap-2.5">
            <Image src="/icons/logo-light.webp" alt="seQRets Logo" width={144} height={144} className="self-start -mt-2 dark:hidden" data-ai-hint="logo" priority />
            <Image src="/icons/logo-dark.webp" alt="seQRets Logo" width={144} height={144} className="self-start -mt-2 hidden dark:block" data-ai-hint="logo" priority />
            <div>
              <h1 className="font-body text-5xl md:text-7xl font-black text-foreground tracking-tighter">
                seQRets
              </h1>
              <p className="text-right text-base font-bold text-foreground tracking-wide">
                Secure. Split. Share.
              </p>
            </div>
          </div>
        </header>

        <div className="mb-10">
          <BitcoinTicker />
        </div>

        <AppNavTabs activePage={activeTab} onHomeTabChange={setActiveTab} />

        <div className="mt-6">
          {activeTab === 'create' ? <CreateSharesForm /> : <RestoreSecretForm />}
        </div>

        <AppFooter />
      </div>
    </main>
  );
}

function AppSkeleton() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8">
      <div className="w-full max-w-2xl">
        <header className="text-center mb-6 pt-16 sm:pt-0">
          <div className="flex justify-center items-center gap-2.5">
            <div className="w-[144px] h-[144px] rounded-lg bg-muted animate-pulse" />
            <div>
              <div className="h-12 w-48 bg-muted rounded animate-pulse mb-2" />
              <div className="h-4 w-36 bg-muted rounded animate-pulse ml-auto" />
            </div>
          </div>
        </header>
        <div className="flex justify-center mb-10">
          <div className="h-14 w-64 bg-muted rounded-full animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-1 h-12 bg-muted rounded-lg animate-pulse mb-6" />
        <div className="space-y-4 p-6 border rounded-lg border-border">
          <div className="h-6 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-full bg-muted rounded animate-pulse" />
          <div className="h-32 w-full bg-muted rounded animate-pulse" />
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <React.Suspense fallback={<AppSkeleton />}>
      <App />
    </React.Suspense>
  );
}
