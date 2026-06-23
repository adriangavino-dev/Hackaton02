import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, el dev server hace proxy de /api hacia el backend (VITE_PROXY_TARGET).
// Usar el proxy evita CORS en local (mismo origen) y permite PATCH aunque el backend
// solo habilite GET/HEAD/POST por CORS. En produccion el frontend usa la URL completa
// definida en VITE_API_BASE_URL.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target =
    env.VITE_PROXY_TARGET ?? 'https://hackaton-20261-front-587720740455.us-east1.run.app';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});
