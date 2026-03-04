'use client';

import Link from "next/link";
import { ConnectionStatus } from "./connection-status";

export function AppFooter() {
    return (
        <footer className="text-center text-sm text-muted-foreground mt-8 mb-16">
            <p>&copy; {new Date().getFullYear()} seQRets. All rights reserved.</p>
            <p className="mt-1">All data is processed locally. Your security is your responsibility.</p>
            <div className="flex justify-center items-center gap-3 mt-2">
                <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
                <span className="text-muted-foreground/40">·</span>
                <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
            </div>
            <p className="mt-1"><ConnectionStatus /></p>
        </footer>
    );
}
