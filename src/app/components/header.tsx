
'use client';

import React from 'react';
import {
  Lock,
  Menu,
  Moon,
  Sun,
  Combine,
  Bot,
  Info,
  Home,
  FileText,
  Rocket,
  Mail,
} from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePathname } from 'next/navigation';
import { ConnectionDot } from '@/app/components/connection-status';

interface HeaderProps {
    activeTab?: 'create' | 'restore';
    onTabChange?: (tab: 'create' | 'restore') => void;
}

function MobileMenu({ activeTab, onTabChange }: HeaderProps) {
  const { setTheme } = useTheme();
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  const handleLinkClick = (tab?: 'create' | 'restore') => {
    if (isHomePage && tab && onTabChange) {
        onTabChange(tab);
    }
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <div className="relative md:hidden">
          <Button variant="outline" size="icon">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open main menu</span>
          </Button>
          <span className="absolute -top-0.5 -right-0.5 pointer-events-none">
            <ConnectionDot />
          </span>
        </div>
      </SheetTrigger>
      <SheetContent side="right" className="w-64 p-0 flex flex-col">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription className="sr-only">Main navigation menu</SheetDescription>
          </SheetHeader>
        <div className="flex flex-col flex-grow">
            <nav className="flex-grow p-4 space-y-2">
                {isHomePage ? (
                     activeTab === 'create' ? (
                        <>
                        <Link href="/inheritance" className="flex items-center gap-3 p-2 rounded-md hover:bg-muted" onClick={() => handleLinkClick()}>
                            <FileText className="h-5 w-5" />
                            <span>Inheritance Plan</span>
                        </Link>
                        <Button variant="ghost" className="w-full justify-start gap-3 p-2 text-base font-normal" onClick={() => handleLinkClick('restore')}>
                            <Combine className="h-5 w-5" />
                            <span>Restore Secret</span>
                        </Button>
                        </>
                    ) : (
                        <>
                        <Button variant="ghost" className="w-full justify-start gap-3 p-2 text-base font-normal" onClick={() => handleLinkClick('create')}>
                            <Lock className="h-5 w-5" />
                            <span>Secure Secret</span>
                        </Button>
                        <Link href="/inheritance" className="flex items-center gap-3 p-2 rounded-md hover:bg-muted" onClick={() => handleLinkClick()}>
                            <FileText className="h-5 w-5" />
                            <span>Inheritance Plan</span>
                        </Link>
                        </>
                    )
                ) : (
                    <>
                        <Link href="/" className="flex items-center gap-3 p-2 rounded-md hover:bg-muted" onClick={() => handleLinkClick()}>
                            <Home className="h-5 w-5" />
                            <span>Home</span>
                        </Link>
                        <Link href="/?tab=create" className="flex items-center gap-3 p-2 rounded-md hover:bg-muted" onClick={() => handleLinkClick()}>
                            <Lock className="h-5 w-5" />
                            <span>Secure Secret</span>
                        </Link>
                        {pathname !== '/inheritance' && (
                        <Link href="/inheritance" className="flex items-center gap-3 p-2 rounded-md hover:bg-muted" onClick={() => handleLinkClick()}>
                            <FileText className="h-5 w-5" />
                            <span>Inheritance Plan</span>
                        </Link>
                        )}
                        <Link href="/?tab=restore" className="flex items-center gap-3 p-2 rounded-md hover:bg-muted" onClick={() => handleLinkClick()}>
                            <Combine className="h-5 w-5" />
                            <span>Restore Secret</span>
                        </Link>
                    </>
                )}
                <div className="border-t mt-2 pt-2">
                {pathname !== '/support' && (
                 <Link href="/support" className="flex items-center gap-3 p-2 rounded-md hover:bg-muted" onClick={() => handleLinkClick()}>
                    <Bot className="h-5 w-5" />
                    <span>Ask Bob AI</span>
                </Link>
                )}
                {pathname !== '/about' && (
                <Link href="/about" className="flex items-center gap-3 p-2 rounded-md hover:bg-muted" onClick={() => handleLinkClick()}>
                    <Info className="h-5 w-5" />
                    <span>About</span>
                </Link>
                )}
                {pathname !== '/contact' && (
                <Link href="/contact" className="flex items-center gap-3 p-2 rounded-md hover:bg-muted" onClick={() => handleLinkClick()}>
                    <Mail className="h-5 w-5" />
                    <span>Contact Us</span>
                </Link>
                )}
                </div>
                <div className="border-t mt-2 pt-2">
                    <Link href="/go-pro" className="flex items-center gap-3 p-2 rounded-md hover:bg-muted text-primary font-medium" onClick={() => handleLinkClick()}>
                        <Rocket className="h-5 w-5" />
                        <span>Go Pro</span>
                    </Link>
                </div>
            </nav>
            <div className="mt-auto p-4 border-t space-y-2">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-start gap-3">
                            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                            <span>Toggle Theme</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setTheme("light")}>
                            Light
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("dark")}>
                            Dark
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("system")}>
                            System
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DesktopMenu({ activeTab, onTabChange }: HeaderProps) {
  const { setTheme } = useTheme();
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  const handleLinkClick = (tab?: 'create' | 'restore') => {
    if (isHomePage && tab && onTabChange) {
        onTabChange(tab);
    }
  };

  return (
    <div className="hidden md:flex items-center gap-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="relative">
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
            <span className="absolute -top-0.5 -right-0.5 pointer-events-none">
              <ConnectionDot />
            </span>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isHomePage ? (
                activeTab === 'create' ? (
                    <>
                    <DropdownMenuItem asChild>
                        <Link href="/inheritance">
                            <FileText className="mr-2 h-4 w-4" />
                            <span>Inheritance Plan</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleLinkClick('restore')}>
                        <Combine className="mr-2 h-4 w-4" />
                        <span>Restore Secret</span>
                    </DropdownMenuItem>
                    </>
                ) : (
                    <>
                    <DropdownMenuItem onClick={() => handleLinkClick('create')}>
                        <Lock className="mr-2 h-4 w-4" />
                        <span>Secure Secret</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/inheritance">
                            <FileText className="mr-2 h-4 w-4" />
                            <span>Inheritance Plan</span>
                        </Link>
                    </DropdownMenuItem>
                    </>
                )
            ) : (
                <>
                    <DropdownMenuItem asChild>
                        <Link href="/">
                            <Home className="mr-2 h-4 w-4" />
                            <span>Home</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/?tab=create">
                            <Lock className="mr-2 h-4 w-4" />
                            <span>Secure Secret</span>
                        </Link>
                    </DropdownMenuItem>
                    {pathname !== '/inheritance' && (
                    <DropdownMenuItem asChild>
                        <Link href="/inheritance">
                            <FileText className="mr-2 h-4 w-4" />
                            <span>Inheritance Plan</span>
                        </Link>
                    </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                        <Link href="/?tab=restore">
                            <Combine className="mr-2 h-4 w-4" />
                            <span>Restore Secret</span>
                        </Link>
                    </DropdownMenuItem>
                </>
            )}
          <DropdownMenuSeparator />
          {pathname !== '/support' && (
          <DropdownMenuItem asChild>
            <Link href="/support">
              <Bot className="mr-2 h-4 w-4" />
              <span>Ask Bob AI</span>
            </Link>
          </DropdownMenuItem>
          )}
          {pathname !== '/about' && (
          <DropdownMenuItem asChild>
            <Link href="/about">
              <Info className="mr-2 h-4 w-4" />
              <span>About</span>
            </Link>
          </DropdownMenuItem>
          )}
          {pathname !== '/contact' && (
          <DropdownMenuItem asChild>
            <Link href="/contact">
              <Mail className="mr-2 h-4 w-4" />
              <span>Contact Us</span>
            </Link>
          </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/go-pro" className="text-primary font-medium">
              <Rocket className="mr-2 h-4 w-4" />
              <span>Go Pro</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Sun className="h-4 w-4 mr-2 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 mr-2 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span>Toggle Theme</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => setTheme('light')}>Light</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')}>System</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}


function HeaderContent(props: HeaderProps) {
  const isMobile = useIsMobile();

  if (isMobile === undefined) {
    return null;
  }

  return isMobile ? <MobileMenu {...props}/> : <DesktopMenu {...props}/>;
}


export function Header(props: HeaderProps) {
    const [isClient, setIsClient] = React.useState(false);

    React.useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return <div className="absolute top-4 right-4 z-50 h-10 w-10 md:h-auto md:w-auto" />;
    }

    return (
        <header className="absolute top-4 right-4 z-50">
            <HeaderContent {...props} />
        </header>
    );
}
