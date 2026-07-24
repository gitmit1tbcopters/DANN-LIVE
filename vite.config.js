import { defineConfig } from 'vite';

const usePolling = process.env.CHOKIDAR_USEPOLLING === 'true';

export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/DANN-LIVE/' : '/',
  // WebGPU-capable browsers are all evergreen; target esnext so top-level
  // await (used to select the tfjs backend) doesn't need to be transpiled.
  build: {
    target: 'esnext',
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    watch: usePolling ? { usePolling: true } : undefined,
  },
});
