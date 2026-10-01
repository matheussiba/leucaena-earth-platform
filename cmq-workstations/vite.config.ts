import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/cmq/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, '../deleteme_cmq'),
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    proxy: {
      '/cmq/api': 'http://localhost:3000',
    },
  },
});
