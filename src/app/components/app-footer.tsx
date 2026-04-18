'use client';

import Link from "next/link";
import { ConnectionStatus } from "./connection-status";

export function AppFooter() {
    return (
        <footer className="text-center text-sm text-muted-foreground mt-8 mb-16">
            <p className="text-sm font-bold">v1.10.1 🔥 Ignition</p>
            <p className="mt-1">&copy; {new Date().getFullYear()} seQRets. All rights reserved.</p>
            <div className="flex justify-center items-center gap-3 mt-2">
                <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
                <span className="text-muted-foreground">·</span>
                <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
                <span className="text-muted-foreground">·</span>
                <Link href="/contact" className="hover:text-primary transition-colors">Contact Us</Link>
            </div>
            <p className="mt-3"><ConnectionStatus /></p>
        </footer>
    );
}
