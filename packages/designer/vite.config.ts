import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { copySamples } from './scripts/copy-samples';

function copySamplesPlugin() {
  return {
    name: 'copy-samples',
    closeBundle() {
      const samplesSrc = path.resolve(__dirname, '../../samples/v1-metadata');
      const samplesDest = path.resolve(__dirname, './dist/samples/v1-metadata');
      if (!fs.existsSync(samplesSrc)) return;
      copySamples(samplesSrc, samplesDest);
    },
  };
}

export default defineConfig({
  plugins: [react(), copySamplesPlugin()],
  base: process.env.DESIGNER_BASE_URL ?? '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
});