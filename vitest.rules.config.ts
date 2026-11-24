import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['rules-tests/**/*.rules.ts'], testTimeout: 20000, hookTimeout: 30000, fileParallelism: false } });
