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

  const tabs: { value: ActivePage; label: string; icon: React.ReactNode }[] = [
    { value: "create", label: "Secure Secret", icon: <Lock className="mr-2 h-5 w-5" /> },
    { value: "plan", label: "Inheritance Plan", icon: <FileText className="mr-2 h-5 w-5" /> },
    { value: "restore", label: "Restore Secret", icon: <Combine className="mr-2 h-5 w-5" /> },
  ];

  const handleClick = (value: ActivePage) => {
    if (value === "plan") {
      // Navigation handled by Link
      return;
    }
    if (pathname === "/instructions") {
      // Navigation handled by Link
      return;
    }
    // On home page, just switch tabs
    onHomeTabChange?.(value);
  };

  const getHref = (value: ActivePage) => {
    if (value === "plan") return "/instructions";
    return `/?tab=${value}`;
  };

  const needsLink = (value: ActivePage) => {
    if (value === "plan") return activePage !== "plan";
    return pathname === "/instructions";
  };

  return (
    <div className="grid w-full grid-cols-3 h-12 items-center justify-center rounded-md bg-accent p-1 text-muted-foreground">
      {tabs.map((tab) => {
        const isActive = activePage === tab.value;
        const className = `inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-base font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "hover:text-black"
        }`;

        if (needsLink(tab.value)) {
          return (
            <Link key={tab.value} href={getHref(tab.value)} className={className}>
              {tab.icon}
              {tab.label}
            </Link>
          );
        }

        return (
          <button
            key={tab.value}
            onClick={() => handleClick(tab.value)}
            className={className}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
