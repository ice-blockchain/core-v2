import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.{test,bench}.ts'],
  },
  resolve: {
    dedupe: ['yjs'],
  },
});
