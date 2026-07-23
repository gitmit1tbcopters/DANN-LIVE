import { defineConfig } from 'vite';

const usePolling = process.env.CHOKIDAR_USEPOLLING === 'true';

export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/DANN-LIVE/' : '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    watch: usePolling ? { usePolling: true } : undefined,
  },
});
