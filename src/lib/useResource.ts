import { useCallback, useEffect, useState } from 'react';
import { ApiError, isAbortError } from './apiClient';

type Status = 'loading' | 'success' | 'error';

interface ResourceState<T> {
  data: T | null;
  status: Status;
  error: string | null;
  reload: () => void;
}

// Hook para una carga puntual con loading/error y reintento. Cancela la request
// previa al recargar o desmontar para evitar respuestas obsoletas.
export function useResource<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: ReadonlyArray<unknown>,
): ResourceState<T> {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    setError(null);

    fetcher(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);
        setStatus('success');
      })
      .catch((err: unknown) => {
        if (isAbortError(err) || controller.signal.aborted) return;
        setError(err instanceof ApiError ? err.message : 'Error inesperado.');
        setStatus('error');
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, status, error, reload };
}
