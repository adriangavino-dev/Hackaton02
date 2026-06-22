import { useCallback } from 'react';
import { fetchSectors } from '../../lib/api';
import { useResource } from '../../lib/useResource';
import type { SectorsResponse } from '../../lib/types';

export function useSectors() {
  const fetcher = useCallback((signal: AbortSignal) => fetchSectors(signal), []);
  return useResource<SectorsResponse>(fetcher, []);
}
