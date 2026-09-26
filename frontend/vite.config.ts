import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // The npm polyfill, not Node's built-in (which Vite externalises in the browser).
      buffer: 'buffer/',
    },
  },
  // @solana/web3.js expects Node's `global`.
  define: { global: 'globalThis' },
  build: {
    rollupOptions: {
      output: {
        // Long-lived vendor chunks: app deploys don't bust the Solana/React caches.
        manualChunks: {
          solana: ['@solana/web3.js', '@solana/wallet-adapter-react', '@solana/wallet-adapter-base', 'bs58', 'buffer'],
          react: ['react', 'react-dom', 'react-router', '@tanstack/react-query', 'zustand'],
          ui: ['@base-ui/react', 'motion', 'sonner', 'cmdk', '@number-flow/react', 'torph'],
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', rewrite: (path) => path.replace(/^\/api/, '') },
    },
  },
});
