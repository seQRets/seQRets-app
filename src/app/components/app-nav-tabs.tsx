'use client';

import { Lock, FileText, Combine } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type ActivePage = "create" | "plan" | "restore";

interface AppNavTabsProps {
  activePage: ActivePage;
  onHomeTabChange?: (tab: "create" | "restore") => void;
}

export function AppNavTabs({ activePage, onHomeTabChange }: AppNavTabsProps) {
  const pathname = usePathname();

  const tabs: { value: ActivePage; label: string; shortLabel: string; icon: typeof Lock }[] = [
    { value: "create", label: "Secure Secret", shortLabel: "Secure", icon: Lock },
    { value: "plan", label: "Inheritance Plan", shortLabel: "Inherit", icon: FileText },
    { value: "restore", label: "Restore Secret", shortLabel: "Restore", icon: Combine },
  ];

  const handleClick = (value: ActivePage) => {
    if (value === "plan") {
      // Navigation handled by Link
      return;
    }
    if (pathname === "/inheritance") {
      // Navigation handled by Link
      return;
    }
    // On home page, just switch tabs
    onHomeTabChange?.(value);
  };

  const getHref = (value: ActivePage) => {
    if (value === "plan") return "/inheritance";
    return `/?tab=${value}`;
  };

  const needsLink = (value: ActivePage) => {
    if (value === "plan") return activePage !== "plan";
    return pathname === "/inheritance";
  };

  return (
    <div className="grid w-full grid-cols-3 h-10 sm:h-12 items-center justify-center rounded-lg bg-accent p-1.5 text-muted-foreground">
      {tabs.map((tab) => {
        const isActive = activePage === tab.value;
        const Icon = tab.icon;
        const className = `inline-flex items-center justify-center whitespace-nowrap rounded-sm px-1 sm:px-3 py-1.5 text-xs sm:text-base font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "hover:text-black"
        }`;
        const content = (
          <>
            <Icon className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.shortLabel}</span>
          </>
        );

        if (needsLink(tab.value)) {
          return (
            <Link key={tab.value} href={getHref(tab.value)} className={className}>
              {content}
            </Link>
          );
        }

        return (
          <button
            key={tab.value}
            onClick={() => handleClick(tab.value)}
            className={className}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
