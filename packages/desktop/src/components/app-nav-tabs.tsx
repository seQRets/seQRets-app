import { Lock, FileText, Combine } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getReminderState } from "@/lib/review-reminder";

type ActivePage = "create" | "plan" | "restore";

interface AppNavTabsProps {
  activePage: ActivePage;
  onHomeTabChange?: (tab: "create" | "restore") => void;
}

export function AppNavTabs({ activePage, onHomeTabChange }: AppNavTabsProps) {
  const navigate = useNavigate();
  const [reminderDue, setReminderDue] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const state = await getReminderState();
        if (!cancelled) setReminderDue(state.kind === "active" && state.due);
      } catch {
        /* ignore — badge is best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activePage]);

  const tabs: { value: ActivePage; label: string; icon: React.ReactNode }[] = [
    { value: "create", label: "Secure Secret", icon: <Lock className="mr-2 h-5 w-5" /> },
    { value: "plan", label: "Inheritance Plan", icon: <FileText className="mr-2 h-5 w-5" /> },
    { value: "restore", label: "Restore Secret", icon: <Combine className="mr-2 h-5 w-5" /> },
  ];

  const handleClick = (value: ActivePage) => {
    if (value === "plan") {
      if (activePage !== "plan") navigate("/inheritance");
    } else {
      if (activePage === "plan") {
        navigate(`/?tab=${value}`);
      } else {
        onHomeTabChange?.(value);
      }
    }
  };

  return (
    <div className="grid w-full grid-cols-3 h-12 items-center justify-center rounded-lg bg-accent p-1.5 text-muted-foreground">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => handleClick(tab.value)}
          className={`relative inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-base font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            activePage === tab.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "hover:text-black"
          }`}
        >
          {tab.icon}
          {tab.label}
          {tab.value === "plan" && reminderDue && (
            <span
              aria-label="Review reminder due"
              className="absolute top-1.5 right-2 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-accent"
            />
          )}
        </button>
      ))}
    </div>
  );
}
