// @ts-check
import { defineConfig } from 'vite';

export default defineConfig({
  root:      'src',
  publicDir: '../public',
  build: {
    outDir:        '../dist',
    emptyOutDir:   true,
    rollupOptions: {
      input: 'src/index.html',
    },
  },
  server: {
    port: 5173,
  },
});