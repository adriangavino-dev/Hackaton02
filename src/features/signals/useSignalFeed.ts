import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchSignalFeed } from '../../lib/api';
import { ApiError, isAbortError } from '../../lib/apiClient';
import type { Signal } from '../../lib/types';
import type { SignalFilters } from './useSignalsQuery';
import { readFeed, writeFeed } from './feedStore';

interface FeedState {
  // filterKey al que pertenecen estos datos. Evita que datos de un filtro se
  // confundan/persistan como si fueran de otro al cambiar de filtro.
  key: string;
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

function makeState(key: string): FeedState {
  const cached = readFeed(key);
  if (cached) {
    return {
      key,
      items: cached.items,
      cursor: cached.cursor,
      hasMore: cached.hasMore,
      totalEstimate: cached.totalEstimate,
    };
  }
  return { key, items: [], cursor: null, hasMore: true, totalEstimate: 0 };
}

// Feed infinito cursor-based con:
// - una sola carga en vuelo (loadingRef);
// - descarte de respuestas obsoletas por generacion (generationRef);
// - deduplicacion por ID;
// - cancelacion de la request al cambiar filtros o desmontar;
// - restauracion desde cache al volver del detalle.
export function useSignalFeed(filters: SignalFilters, filterKey: string): UseFeedResult {
  const [state, setState] = useState<FeedState>(() => makeState(filterKey));
  const [loadingInitial, setLoadingInitial] = useState(() => !readFeed(filterKey));
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generationRef = useRef(0);
  const loadingRef = useRef(false);
  const stateRef = useRef<FeedState>(state);
  stateRef.current = state;

  // Persistir en cache solo cuando el estado corresponde al filtro actual. El
  // guard `state.key === filterKey` evita escribir datos viejos en la cache del
  // filtro nuevo durante el render en que cambia filterKey.
  useEffect(() => {
    if (state.key !== filterKey) return;
    const prev = readFeed(filterKey);
    writeFeed(filterKey, {
      items: state.items,
      cursor: state.cursor,
      hasMore: state.hasMore,
      totalEstimate: state.totalEstimate,
      scrollY: prev?.scrollY ?? 0,
    });
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
              key: filterKey,
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
    [filterKey, filters.signalType, filters.severity, filters.status, filters.q],
  );

  // Al cambiar filtros: invalidar generacion, restaurar cache (si hay) o resetear
  // y cargar la primera pagina del nuevo filtro.
  useEffect(() => {
    generationRef.current += 1;
    loadingRef.current = false;
    const fromCache = readFeed(filterKey);
    if (fromCache && fromCache.items.length > 0) {
      // Restaurar sin recargar (volver del detalle o re-montaje con mismo filtro).
      setState({
        key: filterKey,
        items: fromCache.items,
        cursor: fromCache.cursor,
        hasMore: fromCache.hasMore,
        totalEstimate: fromCache.totalEstimate,
      });
      setLoadingInitial(false);
      setError(null);
      return;
    }
    setState({ key: filterKey, items: [], cursor: null, hasMore: true, totalEstimate: 0 });
    setError(null);
    fetchPage('initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  const loadMore = useCallback(() => fetchPage('more'), [fetchPage]);
  const retry = useCallback(() => {
    // Reintenta sin borrar lo ya cargado.
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
