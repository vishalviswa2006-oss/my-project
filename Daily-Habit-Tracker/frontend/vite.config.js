import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: resolve(frontendDir, 'vite-app'),
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: resolve(frontendDir, 'dist'),
    emptyOutDir: true
  }
});
