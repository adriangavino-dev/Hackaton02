import { useEffect, useRef, useState } from 'react';
import { fetchTropels, type TropelQuery } from '../../lib/api';
import { ApiError, isAbortError } from '../../lib/apiClient';
import type { TropelPage } from '../../lib/types';

interface PagedState {
  page: TropelPage | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

// Carga paginada con proteccion contra respuestas obsoletas: cada request lleva
// un id incremental y solo se aplica la respuesta del request mas reciente.
// Ademas aborta la request anterior al cambiar la query.
export function usePagedTropels(query: TropelQuery): PagedState {
  const [page, setPage] = useState<TropelPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const latestRequestId = useRef(0);

  // key estable para disparar el efecto solo cuando cambia algo relevante.
  const key = JSON.stringify(query);

  useEffect(() => {
    const requestId = ++latestRequestId.current;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchTropels(query, controller.signal)
      .then((result) => {
        // Descartar si llego una request mas nueva (respuesta tardia).
        if (requestId !== latestRequestId.current) return;
        setPage(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (isAbortError(err) || requestId !== latestRequestId.current) return;
        setError(err instanceof ApiError ? err.message : 'Error al cargar Tropeles.');
        setLoading(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce]);

  return { page, loading, error, reload: () => setNonce((n) => n + 1) };
}
