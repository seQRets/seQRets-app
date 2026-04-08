import { Link } from "react-router-dom";
import { ConnectionStatus } from "./connection-status";

export function AppFooter() {
    return (
        <footer className="text-center text-sm text-muted-foreground mt-8 mb-16">
            <p className="text-sm font-bold">v1.7.2 🧨 Ignition</p>
            <p className="mt-1">&copy; {new Date().getFullYear()} seQRets. All rights reserved.</p>
            <div className="flex justify-center items-center gap-3 mt-2">
                <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
                <span className="text-muted-foreground">·</span>
                <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
                <span className="text-muted-foreground">·</span>
                <Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link>
            </div>
            <p className="mt-1"><ConnectionStatus /></p>
        </footer>
    );
}
