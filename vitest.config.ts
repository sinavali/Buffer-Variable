import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    dir: "tests",
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/types/**', 'src/**/*.test.ts'],
      all: true,
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95
      }
    },
    ui: true,
    watch: false,
    globals: true
  }
});