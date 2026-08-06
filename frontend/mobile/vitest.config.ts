import { defineConfig } from 'vitest/config';
import path from 'path';

// Unit tests for pure TS modules (schemas, derivations, resolvers) — no
// React Native runtime involved, so plain node environment is enough.
export default defineConfig({
  // React Native's compile-time global, absent under node.
  define: { __DEV__: true },
  resolve: {
    alias: { '@': path.resolve(__dirname) },
  },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
