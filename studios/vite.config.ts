import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:8787' },
  },
  build: {
    // three.js (~220 Ko gzip) n'est chargé qu'à l'affichage d'une scène 3D.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      input: {
        main: 'index.html',
      },
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber'],
          motion: ['framer-motion', 'gsap'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.{ts,tsx}', 'server/**/*.spec.ts'],
  },
} as never);
