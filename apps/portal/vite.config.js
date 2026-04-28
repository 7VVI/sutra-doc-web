import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5175,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5555',
        changeOrigin: true,
      },
    },
  },
});
