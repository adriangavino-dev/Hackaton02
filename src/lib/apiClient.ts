import { API_BASE_URL } from './env';
import type { ApiErrorBody } from './types';

const TOKEN_KEY = 'tropelcare.token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Error normalizado que la UI puede mostrar de forma accionable.
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly body: ApiErrorBody | null;

  constructor(status: number, code: string, message: string, body: ApiErrorBody | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

// Lanzado cuando un fetch es abortado (cambio de filtros, unmount, etc.).
// Permite que los callers ignoren respuestas obsoletas sin tratarlas como error.
export class AbortError extends Error {
  constructor() {
    super('aborted');
    this.name = 'AbortError';
  }
}

export function isAbortError(err: unknown): boolean {
  return (
    err instanceof AbortError ||
    (err instanceof DOMException && err.name === 'AbortError') ||
    (err instanceof Error && err.name === 'AbortError')
  );
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  signal?: AbortSignal;
  // Si es false, no adjunta el header Authorization (ej. login).
  auth?: boolean;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, auth = true } = opts;

  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (isAbortError(err)) {
      throw new AbortError();
    }
    // Error de red (sin respuesta del servidor).
    throw new ApiError(0, 'NETWORK_ERROR', 'No se pudo conectar con el servidor.', null);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  const data: unknown = text ? safeParse(text) : null;

  if (!res.ok) {
    const errBody = isApiErrorBody(data) ? data : null;
    const code = errBody?.error ?? `HTTP_${res.status}`;
    const message = errBody?.message ?? defaultMessage(res.status);
    throw new ApiError(res.status, code, message, errBody);
  }

  return data as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function isApiErrorBody(data: unknown): data is ApiErrorBody {
  return (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof (data as { error: unknown }).error === 'string'
  );
}

function defaultMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Solicitud invalida.';
    case 401:
      return 'Sesion expirada o credenciales invalidas.';
    case 404:
      return 'Recurso no encontrado.';
    case 429:
      return 'Demasiadas solicitudes. Intenta de nuevo en unos segundos.';
    default:
      return 'Ocurrio un error en el servidor.';
  }
}

export const apiClient = {
  get: <T>(path: string, signal?: AbortSignal): Promise<T> =>
    request<T>(path, { method: 'GET', signal }),
  post: <T>(path: string, body: unknown, opts?: { signal?: AbortSignal; auth?: boolean }): Promise<T> =>
    request<T>(path, { method: 'POST', body, signal: opts?.signal, auth: opts?.auth }),
  patch: <T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> =>
    request<T>(path, { method: 'PATCH', body, signal }),
};
