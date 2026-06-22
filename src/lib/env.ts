// Configuracion derivada de variables de entorno Vite.
// En dev, si no se define VITE_API_BASE_URL, usamos /api/v1 y el dev server
// hace proxy hacia el mock (o el backend real con MOCK_TARGET).

export const API_BASE_URL: string = (
  import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
).replace(/\/$/, '');

// Solo para autocompletar el formulario de login en desarrollo. Nunca se usa
// como fuente de verdad de sesion.
export const DEV_CREDENTIALS = {
  teamCode: import.meta.env.VITE_TEAM_CODE ?? '',
  email: import.meta.env.VITE_EMAIL ?? '',
  password: import.meta.env.VITE_PASSWORD ?? '',
} as const;
