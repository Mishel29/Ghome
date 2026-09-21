import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: 'coverage/frontend',
      exclude: ['src/**/*.test.{ts,tsx}', 'src/main.tsx', 'src/api/schemaTypes.ts'],
    },
  },
});
