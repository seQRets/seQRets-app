import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { UpdateChecker } from '@/components/update-checker';
import { TermsGate } from '@/components/terms-gate';
import HomePage from '@/pages/HomePage';
import AboutPage from '@/pages/AboutPage';
import SupportPage from '@/pages/SupportPage';
import SmartCardPage from '@/pages/SmartCardPage';
import InstructionsPage from '@/pages/InstructionsPage';
import ContactPage from '@/pages/ContactPage';
import { maybeFireLaunchNotification } from '@/lib/review-reminder';

export default function App() {
  useEffect(() => {
    // Fire the OS notification once per session if a review is overdue
    // and the user has opted into notifications on this machine.
    void maybeFireLaunchNotification();
  }, []);

  // Block file drops outside of explicit drop zones. Without this, a file
  // dropped on the window body (missing the drop target) causes the Tauri
  // WebView to attempt navigation to the file:// URL — stranding the app.
  // Legitimate drop zones call stopPropagation(), so they still receive
  // their events before these window-level handlers fire.
  useEffect(() => {
    const blockDefault = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener('dragover', blockDefault);
    window.addEventListener('drop', blockDefault);
    return () => {
      window.removeEventListener('dragover', blockDefault);
      window.removeEventListener('drop', blockDefault);
    };
  }, []);

  return (
    <ThemeProvider defaultTheme="system">
      <TermsGate>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/smartcard" element={<SmartCardPage />} />
          <Route path="/inheritance" element={<InstructionsPage />} />
        </Routes>
      </TermsGate>
      <UpdateChecker checkOnMount />
      <Toaster />
    </ThemeProvider>
  );
}
