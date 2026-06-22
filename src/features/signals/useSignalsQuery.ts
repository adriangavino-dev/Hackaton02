import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  SEVERITIES,
  SIGNAL_STATUSES,
  SIGNAL_TYPES,
  type Severity,
  type SignalStatus,
  type SignalType,
} from '../../lib/types';

export interface SignalFilters {
  signalType: SignalType | '';
  severity: Severity | '';
  status: SignalStatus | '';
  q: string;
}

function parseEnum<T extends string>(raw: string | null, allowed: readonly T[]): T | '' {
  return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : '';
}

// Filtros del feed persistidos en la URL. Clave estable para invalidar el feed
// cuando cambian (y rechazar cursores de filtros distintos).
export function useSignalsQuery(): {
  filters: SignalFilters;
  filterKey: string;
  patchFilters: (patch: Partial<SignalFilters>) => void;
} {
  const [params, setParams] = useSearchParams();

  const filters = useMemo<SignalFilters>(
    () => ({
      signalType: parseEnum(params.get('signalType'), SIGNAL_TYPES),
      severity: parseEnum(params.get('severity'), SEVERITIES),
      status: parseEnum(params.get('status'), SIGNAL_STATUSES),
      q: params.get('q') ?? '',
    }),
    [params],
  );

  const filterKey = `${filters.signalType}|${filters.severity}|${filters.status}|${filters.q.toLowerCase()}`;

  const patchFilters = useCallback(
    (patch: Partial<SignalFilters>) => {
      const next = { ...filters, ...patch };
      const sp = new URLSearchParams();
      if (next.signalType) sp.set('signalType', next.signalType);
      if (next.severity) sp.set('severity', next.severity);
      if (next.status) sp.set('status', next.status);
      if (next.q) sp.set('q', next.q.slice(0, 80));
      setParams(sp, { replace: true });
    },
    [filters, setParams],
  );

  return { filters, filterKey, patchFilters };
}
