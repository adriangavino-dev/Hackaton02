import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignalFeed } from './useSignalFeed';
import { useSignalsQuery } from './useSignalsQuery';
import { saveScroll, readFeed } from './feedStore';
import { useDebouncedCallback } from '../../lib/useDebouncedCallback';
import { ErrorState, Spinner } from '../../components/states';
import { SignalRow } from './SignalRow';
import {
  SEVERITIES,
  SIGNAL_STATUSES,
  SIGNAL_TYPES,
  type Severity,
  type SignalStatus,
  type SignalType,
} from '../../lib/types';

export function SignalsFeedPage(): ReactNode {
  const { filters, filterKey, patchFilters } = useSignalsQuery();
  const feed = useSignalFeed(filters, filterKey);
  const navigate = useNavigate();

  const [searchText, setSearchText] = useState(filters.q);
  useEffect(() => setSearchText(filters.q), [filters.q]);
  const debouncedSetQuery = useDebouncedCallback((v: string) => patchFilters({ q: v }), 350);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const filterKeyRef = useRef(filterKey);
  filterKeyRef.current = filterKey;

  // Restaurar posicion de scroll al montar (volver del detalle).
  useLayoutEffect(() => {
    const cached = readFeed(filterKey);
    if (cached && cached.scrollY > 0) {
      window.scrollTo(0, cached.scrollY);
    }
    // Guardar scroll al desmontar.
    return () => saveScroll(filterKeyRef.current, window.scrollY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-carga al acercarse al final del feed.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting && feed.hasMore && !feed.loadingMore && !feed.error) {
          feed.loadMore();
        }
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [feed.hasMore, feed.loadingMore, feed.error, feed.loadMore]);

  function openDetail(id: string) {
    saveScroll(filterKey, window.scrollY);
    navigate(`/signals/${id}`);
  }

  return (
    <section>
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-white">Feed de Senales</h1>
        <p className="text-sm text-muted">
          Scroll infinito basado en cursor. {feed.totalEstimate} senales estimadas.
        </p>
      </header>

      {/* Filtros */}
      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-edge bg-panel p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Control label="Busqueda">
          <input
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              debouncedSetQuery(e.target.value);
            }}
            placeholder="Contenido de la senal..."
            maxLength={80}
            className={controlCls}
          />
        </Control>
        <Control label="Tipo">
          <select
            value={filters.signalType}
            onChange={(e) => patchFilters({ signalType: e.target.value as SignalType | '' })}
            className={controlCls}
          >
            <option value="">Todos</option>
            {SIGNAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Control>
        <Control label="Severidad">
          <select
            value={filters.severity}
            onChange={(e) => patchFilters({ severity: e.target.value as Severity | '' })}
            className={controlCls}
          >
            <option value="">Todas</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Control>
        <Control label="Estado">
          <select
            value={filters.status}
            onChange={(e) => patchFilters({ status: e.target.value as SignalStatus | '' })}
            className={controlCls}
          >
            <option value="">Todos</option>
            {SIGNAL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Control>
      </div>

      {/* Lista */}
      {feed.loadingInitial ? (
        <div className="grid min-h-[300px] place-items-center rounded-xl border border-edge bg-panel/60">
          <Spinner label="Cargando feed..." />
        </div>
      ) : feed.items.length === 0 && !feed.error ? (
        <div className="grid min-h-[300px] place-items-center rounded-xl border border-edge bg-panel/60">
          <p className="text-muted">No hay senales que coincidan con estos filtros.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {feed.items.map((signal) => (
            <SignalRow key={signal.id} signal={signal} onOpen={() => openDetail(signal.id)} />
          ))}
        </ul>
      )}

      {/* Estado de carga de pagina / error / fin de lista */}
      <div className="mt-4 min-h-[60px]">
        {feed.loadingMore && (
          <div className="grid place-items-center py-4">
            <Spinner label="Cargando mas senales..." />
          </div>
        )}
        {feed.error && feed.items.length > 0 && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4">
            <ErrorState message={feed.error} onRetry={feed.retry} />
          </div>
        )}
        {feed.error && feed.items.length === 0 && (
          <div className="grid min-h-[200px] place-items-center rounded-xl border border-edge bg-panel/60">
            <ErrorState message={feed.error} onRetry={feed.retry} />
          </div>
        )}
        {!feed.hasMore && feed.items.length > 0 && !feed.error && (
          <p className="py-4 text-center text-sm text-muted">— Fin del feed —</p>
        )}
      </div>

      {/* Sentinela para infinite scroll */}
      <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
    </section>
  );
}

const controlCls =
  'w-full rounded-md border border-edge bg-ink px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';

function Control({ label, children }: { label: string; children: ReactNode }): ReactNode {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
