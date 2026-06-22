import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  PAGE_SIZES,
  SPECIES,
  TROPEL_SORTS,
  VITAL_STATES,
  type PageSize,
  type Species,
  type TropelSort,
  type VitalState,
} from '../../lib/types';
import type { TropelQuery } from '../../lib/api';

// Estado completo de la vista derivado de la URL (fuente de verdad). Asi recargar
// o compartir la URL restaura exactamente filtros, busqueda, orden y pagina.

function parseSize(raw: string | null): PageSize {
  const n = Number(raw);
  return (PAGE_SIZES as readonly number[]).includes(n) ? (n as PageSize) : 20;
}
function parseSort(raw: string | null): TropelSort {
  return (TROPEL_SORTS as readonly string[]).includes(raw ?? '')
    ? (raw as TropelSort)
    : 'updatedAt,desc';
}
function parseEnum<T extends string>(raw: string | null, allowed: readonly T[]): T | '' {
  return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : '';
}

export interface TropelsFilters extends TropelQuery {
  species: Species | '';
  vitalState: VitalState | '';
  sectorId: string;
  q: string;
}

export function useTropelsQuery(): {
  filters: TropelsFilters;
  setPage: (page: number) => void;
  // patch de filtros: cualquier cambio de filtro/busqueda/orden resetea page a 0.
  patchFilters: (patch: Partial<Omit<TropelsFilters, 'page'>>) => void;
  reset: () => void;
} {
  const [params, setParams] = useSearchParams();

  const filters = useMemo<TropelsFilters>(() => {
    const pageNum = Number(params.get('page'));
    return {
      page: Number.isInteger(pageNum) && pageNum >= 0 ? pageNum : 0,
      size: parseSize(params.get('size')),
      sort: parseSort(params.get('sort')),
      species: parseEnum(params.get('species'), SPECIES),
      vitalState: parseEnum(params.get('vitalState'), VITAL_STATES),
      sectorId: params.get('sectorId') ?? '',
      q: params.get('q') ?? '',
    };
  }, [params]);

  const writeParams = useCallback(
    (next: TropelsFilters) => {
      const sp = new URLSearchParams();
      if (next.page > 0) sp.set('page', String(next.page));
      if (next.size !== 20) sp.set('size', String(next.size));
      if (next.sort !== 'updatedAt,desc') sp.set('sort', next.sort);
      if (next.species) sp.set('species', next.species);
      if (next.vitalState) sp.set('vitalState', next.vitalState);
      if (next.sectorId) sp.set('sectorId', next.sectorId);
      if (next.q) sp.set('q', next.q);
      setParams(sp, { replace: true });
    },
    [setParams],
  );

  const setPage = useCallback(
    (page: number) => writeParams({ ...filters, page: Math.max(0, page) }),
    [filters, writeParams],
  );

  const patchFilters = useCallback(
    (patch: Partial<Omit<TropelsFilters, 'page'>>) =>
      writeParams({ ...filters, ...patch, page: 0 }),
    [filters, writeParams],
  );

  const reset = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams]);

  return { filters, setPage, patchFilters, reset };
}
