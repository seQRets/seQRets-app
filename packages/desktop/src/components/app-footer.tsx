import { Link } from "react-router-dom";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useToast } from "@/hooks/use-toast";
import { ConnectionPill } from "./connection-status";
import { VERSION_STRING } from "@/generated/version";

export function AppFooter() {
    const { toast } = useToast();

    const openLegal = (path: string, label: string) => {
        if (navigator.onLine) {
            void openUrl(`https://seqrets.app${path}`);
        } else {
            toast({
                title: "You're offline",
                description: `Our ${label.toLowerCase()} lives at seqrets.app${path}. Reconnect and try again.`,
            });
        }
    };

    return (
        <footer className="text-center text-sm text-muted-foreground mt-8 mb-16">
            <p className="text-sm font-bold">{VERSION_STRING}</p>
            <p className="mt-1">&copy; {new Date().getFullYear()} seQRets. All rights reserved.</p>
            <div className="flex justify-center items-center gap-3 mt-2">
                <button
                    type="button"
                    onClick={() => openLegal('/privacy', 'Privacy Policy')}
                    className="hover:text-primary transition-colors cursor-pointer"
                >
                    Privacy Policy
                </button>
                <span className="text-muted-foreground">·</span>
                <button
                    type="button"
                    onClick={() => openLegal('/terms', 'Terms of Service')}
                    className="hover:text-primary transition-colors cursor-pointer"
                >
                    Terms of Service
                </button>
                <span className="text-muted-foreground">·</span>
                <Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link>
            </div>
            <p className="mt-3"><ConnectionPill /></p>
        </footer>
    );
}
