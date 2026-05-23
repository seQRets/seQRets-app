import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // More specific alias must come first; Vite matches in order.
      '@/components/ui': path.resolve(__dirname, '../shared-ui/src'),
      '@': path.resolve(__dirname, './src'),
      buffer: 'buffer/',
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['buffer', '@seqrets/crypto', 'shamir-secret-sharing'],
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  envPrefix: ['VITE_'],
  build: {
    target: ['es2021', 'chrome100', 'safari13'],
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
    rollupOptions: {
      external: ['html2canvas'],
      output: {
        manualChunks(id) {
          // Exclude html2canvas (jsPDF optional dep, unused)
          if (id.includes('html2canvas')) return undefined;
          // PDF generation (lazy-loaded via inheritance page)
          if (id.includes('jspdf') || id.includes('fflate') || id.includes('fast-png')) return 'pdf';
          // Crypto libs
          if (id.includes('@seqrets/crypto') || id.includes('shamir-secret-sharing') || id.includes('@noble/')) return 'crypto';
          // BIP39 wordlists (~100 KB)
          if (id.includes('@scure/bip39')) return 'bip39';
          // React core
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('react-router')) return 'ui';
          // Google Generative AI (Bob chat)
          if (id.includes('@google/generative-ai')) return 'gemini';
          // DOMPurify
          if (id.includes('dompurify')) return 'sanitize';
          // Radix UI primitives (16 packages, large surface)
          if (id.includes('@radix-ui/')) return 'radix';
          // Framer Motion animations
          if (id.includes('framer-motion')) return 'motion';
          // Markdown rendering (Bob chat output)
          if (
            id.includes('react-markdown') ||
            id.includes('rehype-') ||
            id.includes('remark-') ||
            id.includes('/unified/') ||
            id.includes('/mdast') ||
            id.includes('/hast')
          ) return 'markdown';
          // QR encode/decode
          if (id.includes('jsqr') || id.includes('qrcode')) return 'qr';
          // Compression (vault import/export)
          if (id.includes('jszip') || id.includes('pako')) return 'compression';
          // Tauri plugin bridges
          if (id.includes('@tauri-apps/')) return 'tauri';
          // Lucide icons (per-icon imports add up)
          if (id.includes('lucide-react')) return 'icons';
        },
      },
    },
  },
});
