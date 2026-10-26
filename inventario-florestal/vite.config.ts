import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: '/inventario/',
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      '@': rootDir,
    },
  },
  build: {
    outDir: path.resolve(rootDir, '../deleteme_inventario'),
    emptyOutDir: true,
  },
  server: {
    port: 5175,
    proxy: {
      '/inventario/api': 'http://localhost:3000',
    },
  },
});
