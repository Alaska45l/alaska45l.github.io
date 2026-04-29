import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 150,
    rollupOptions: {
      output: {
        manualChunks: {
          core: ['./src/js/router.js', './src/js/i18n.js']
        }
      }
    }
  },
  plugins: [ visualizer({ filename: 'dist/stats.html' }) ]
});
