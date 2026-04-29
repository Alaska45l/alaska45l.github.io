import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    exclude: ['node_modules', '.opencode', 'e2e', 'dist'],
  },
});
