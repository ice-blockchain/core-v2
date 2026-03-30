import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/remote-config/**/*.test.ts'],
    environment: 'node',
    globals: true,
  },
});
