import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchSignalFeed } from '../../lib/api';
import { ApiError, isAbortError } from '../../lib/apiClient';
import type { Signal } from '../../lib/types';
import type { SignalFilters } from './useSignalsQuery';
import { readFeed, writeFeed } from './feedStore';

interface FeedState {
  items: Signal[];
  cursor: string | null;
  hasMore: boolean;
  totalEstimate: number;
}

interface UseFeedResult {
  items: Signal[];
  hasMore: boolean;
  totalEstimate: number;
  loadingInitial: boolean;
  loadingMore: boolean;
  error: string | null;
  loadMore: () => void;
  retry: () => void;
}

const emptyState: FeedState = { items: [], cursor: null, hasMore: true, totalEstimate: 0 };

// Feed infinito cursor-based con:
// - una sola carga en vuelo (loadingRef);
// - descarte de respuestas obsoletas por generacion (generationRef);
// - deduplicacion por ID;
// - cancelacion de la request al cambiar filtros o desmontar;
// - restauracion desde cache al volver del detalle.
export function useSignalFeed(filters: SignalFilters, filterKey: string): UseFeedResult {
  const cached = readFeed(filterKey);
  const [state, setState] = useState<FeedState>(cached ?? emptyState);
  const [loadingInitial, setLoadingInitial] = useState(!cached);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generationRef = useRef(0);
  const loadingRef = useRef(false);
  const stateRef = useRef<FeedState>(state);
  stateRef.current = state;

  // Persistir en cache en cada cambio de estado para sobrevivir a la navegacion.
  useEffect(() => {
    const prev = readFeed(filterKey);
    writeFeed(filterKey, { ...state, scrollY: prev?.scrollY ?? 0 });
  }, [state, filterKey]);

  const fetchPage = useCallback(
    (mode: 'initial' | 'more') => {
      if (loadingRef.current) return; // una sola carga en vuelo
      const current = stateRef.current;
      if (mode === 'more' && (!current.hasMore || current.cursor === null)) return;

      const generation = generationRef.current;
      const controller = new AbortController();
      loadingRef.current = true;
      setError(null);
      if (mode === 'initial') setLoadingInitial(true);
      else setLoadingMore(true);

      fetchSignalFeed(
        {
          cursor: mode === 'initial' ? null : current.cursor,
          limit: 15,
          signalType: filters.signalType,
          severity: filters.severity,
          status: filters.status,
          q: filters.q,
        },
        controller.signal,
      )
        .then((res) => {
          // Descartar respuesta si los filtros cambiaron mientras tanto.
          if (generation !== generationRef.current) return;
          setState((prev) => {
            const base = mode === 'initial' ? [] : prev.items;
            const seen = new Set(base.map((s) => s.id));
            const merged = base.concat(res.items.filter((s) => !seen.has(s.id)));
            return {
              items: merged,
              cursor: res.nextCursor,
              hasMore: res.hasMore,
              totalEstimate: res.totalEstimate,
            };
          });
        })
        .catch((err: unknown) => {
          if (isAbortError(err) || generation !== generationRef.current) return;
          setError(err instanceof ApiError ? err.message : 'Error al cargar el feed.');
        })
        .finally(() => {
          if (generation !== generationRef.current) return;
          loadingRef.current = false;
          setLoadingInitial(false);
          setLoadingMore(false);
        });

      return () => controller.abort();
    },
    [filters.signalType, filters.severity, filters.status, filters.q],
  );

  // Al cambiar filtros: invalidar generacion, resetear (o restaurar cache) y cargar.
  useEffect(() => {
    generationRef.current += 1;
    loadingRef.current = false;
    const fromCache = readFeed(filterKey);
    if (fromCache && fromCache.items.length > 0) {
      // Restaurar sin recargar (volver del detalle o re-montaje).
      setState({
        items: fromCache.items,
        cursor: fromCache.cursor,
        hasMore: fromCache.hasMore,
        totalEstimate: fromCache.totalEstimate,
      });
      setLoadingInitial(false);
      setError(null);
      return;
    }
    setState(emptyState);
    setError(null);
    fetchPage('initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  const loadMore = useCallback(() => fetchPage('more'), [fetchPage]);
  const retry = useCallback(() => {
    // Reintenta la siguiente pagina sin borrar lo ya cargado.
    if (stateRef.current.items.length === 0) fetchPage('initial');
    else fetchPage('more');
  }, [fetchPage]);

  return {
    items: state.items,
    hasMore: state.hasMore,
    totalEstimate: state.totalEstimate,
    loadingInitial,
    loadingMore,
    error,
    loadMore,
    retry,
  };
}
