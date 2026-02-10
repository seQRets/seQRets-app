import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import HomePage from '@/pages/HomePage';
import AboutPage from '@/pages/AboutPage';
import SupportPage from '@/pages/SupportPage';
import SmartCardPage from '@/pages/SmartCardPage';

export default function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/smartcard" element={<SmartCardPage />} />
      </Routes>
      <Toaster />
    </ThemeProvider>
  );
}
