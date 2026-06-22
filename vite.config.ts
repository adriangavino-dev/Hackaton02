import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El dev server hace proxy de /api hacia el mock local (o el backend real si
// configuras VITE_API_BASE_URL). En produccion el frontend usa VITE_API_BASE_URL.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.MOCK_TARGET ?? 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
});
