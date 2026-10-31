import { defineConfig } from 'vitest/config';

/**
 * Starting many jsdom workers at once can exceed Vitest's start timeout on a busy machine
 * ("Timeout starting forks runner"). Fewer workers start reliably.
 */
export default defineConfig({
  test: {
    maxWorkers: 2,
  },
});
