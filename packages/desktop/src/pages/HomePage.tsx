import { CreateSharesForm } from "@/components/create-shares-form";
import { RestoreSecretForm } from "@/components/restore-secret-form";
import { Bot } from "lucide-react";
import React, { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/header";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AppNavTabs } from "@/components/app-nav-tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BobChatInterface } from "@/components/bob-chat-interface";
import { BitcoinTicker } from "@/components/bitcoin-ticker";
import { AppFooter } from "@/components/app-footer";
import { WelcomeCards } from "@/components/welcome-cards";
import { ReviewReminderBanner } from "@/components/review-reminder-banner";
import { useTheme } from "@/components/theme-provider";
import logoLight from "@/assets/icons/logo-light.webp";
import logoDark from "@/assets/icons/logo-dark.webp";
import { AnimatePresence, motion } from "framer-motion";

const SKIP_WELCOME_KEY = 'seQRets_skipWelcome';
const SESSION_DISMISSED_KEY = 'seQRets_welcomeDismissed';

type ActivePage = "create" | "plan" | "restore";

function shouldShowWelcome(): boolean {
  try {
    if (localStorage.getItem(SKIP_WELCOME_KEY) === 'true') return false;
    if (sessionStorage.getItem(SESSION_DISMISSED_KEY) === 'true') return false;
  } catch { /* default to showing */ }
  return true;
}

export default function HomePage() {
  const [activeTab, setActiveTab] = React.useState<'create' | 'restore'>('create');
  const [showWelcomeCards, setShowWelcomeCards] = useState(shouldShowWelcome);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const appIcon = isDark ? logoDark : logoLight;

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'create' || tab === 'restore') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleCardSelect = useCallback((tab: ActivePage) => {
    try { sessionStorage.setItem(SESSION_DISMISSED_KEY, 'true'); } catch { /* ignore */ }

    if (tab === 'plan') {
      setShowWelcomeCards(false);
      navigate('/inheritance');
      return;
    }

    setActiveTab(tab);
    setShowWelcomeCards(false);
  }, [navigate]);

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12">
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
                <Link to="/support">
                    <Bot className="h-5 w-5" />
                    <span className="sr-only">Ask Bob</span>
                </Link>
            </Button>
        </div>
        <Header activeTab={activeTab} onTabChange={setActiveTab}/>
        <header className="text-center mb-6 pt-16 sm:pt-0">
          <div className="flex justify-center items-center gap-2.5">
            <img src={appIcon} alt="seQRets Logo" width={144} height={144} className="self-start -mt-2" />
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

        <AnimatePresence mode="wait">
          {showWelcomeCards ? (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="mt-8 mb-10"
            >
              <h2 className="text-center text-foreground mb-8 text-2xl sm:text-3xl font-bold">
                What would you like to do?
              </h2>
              <WelcomeCards onSelect={handleCardSelect} />
            </motion.div>
          ) : (
            <motion.div
              key="tabs"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div className="mb-10">
                <BitcoinTicker />
              </div>

              <ReviewReminderBanner />

              <AppNavTabs activePage={activeTab} onHomeTabChange={setActiveTab} />

              <div className="mt-6">
                {activeTab === 'create' ? <CreateSharesForm /> : <RestoreSecretForm />}
              </div>

            </motion.div>
          )}
        </AnimatePresence>

        {!showWelcomeCards && <AppFooter />}
      </div>
    </main>
  );
}
