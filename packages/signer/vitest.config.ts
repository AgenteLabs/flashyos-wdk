import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@flashynetwork/wallet-wdk': path.resolve(__dirname, '../wallet-wdk/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
  },
});
