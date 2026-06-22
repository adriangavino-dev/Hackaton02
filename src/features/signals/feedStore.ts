import type { Signal } from '../../lib/types';

// Cache a nivel de modulo del feed por combinacion de filtros. Permite restaurar
// items, cursor y posicion de scroll al volver desde el detalle de una Senal,
// sin recargar ni perder las paginas ya cargadas.

export interface CachedFeed {
  items: Signal[];
  cursor: string | null;
  hasMore: boolean;
  totalEstimate: number;
  scrollY: number;
}

const cache = new Map<string, CachedFeed>();

export function readFeed(key: string): CachedFeed | undefined {
  return cache.get(key);
}

export function writeFeed(key: string, feed: CachedFeed): void {
  cache.set(key, feed);
}

export function saveScroll(key: string, scrollY: number): void {
  const existing = cache.get(key);
  if (existing) existing.scrollY = scrollY;
}

// Refleja un cambio de estado de una Senal en todos los feeds cacheados, para que
// al volver al feed se vea el estado actualizado (requisito de CP4).
export function patchSignalEverywhere(updated: Signal): void {
  for (const feed of cache.values()) {
    const idx = feed.items.findIndex((s) => s.id === updated.id);
    if (idx !== -1) feed.items[idx] = updated;
  }
}

export function clearFeedCache(): void {
  cache.clear();
}
