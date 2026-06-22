import { useEffect, useState, type ReactNode } from 'react';
import { usePagedTropels } from './usePagedTropels';
import { useTropelsQuery } from './useTropelsQuery';
import { useSectors } from '../sectors/useSectors';
import { useDebouncedCallback } from '../../lib/useDebouncedCallback';
import { ErrorState, Spinner } from '../../components/states';
import {
  PAGE_SIZES,
  SPECIES,
  TROPEL_SORTS,
  VITAL_STATES,
  type Tropel,
  type TropelSort,
} from '../../lib/types';

const SORT_LABEL: Record<TropelSort, string> = {
  'name,asc': 'Nombre (A-Z)',
  'updatedAt,desc': 'Actualizado (reciente)',
  'chaosIndex,desc': 'Caos (mayor)',
};

export function TropelsPage(): ReactNode {
  const { filters, setPage, patchFilters } = useTropelsQuery();
  const { page, loading, error, reload } = usePagedTropels(filters);
  const sectors = useSectors();

  // Busqueda: estado local sincronizado con la URL + escritura debounced.
  const [searchText, setSearchText] = useState(filters.q);
  useEffect(() => {
    setSearchText(filters.q);
  }, [filters.q]);

  const debouncedSetQuery = useDebouncedCallback((value: string) => {
    patchFilters({ q: value.slice(0, 80) });
  }, 350);

  const hasResults = !!page && page.content.length > 0;

  return (
    <section>
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-white">Atlas de Tropeles</h1>
        <p className="text-sm text-muted">
          Paginacion del servidor con filtros combinables sincronizados con la URL.
        </p>
      </header>

      {/* Filtros */}
      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-edge bg-panel p-4 sm:grid-cols-2 lg:grid-cols-3">
        <LabeledControl label="Busqueda">
          <input
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              debouncedSetQuery(e.target.value);
            }}
            placeholder="Nombre del Tropel..."
            maxLength={80}
            className={controlCls}
          />
        </LabeledControl>

        <LabeledControl label="Especie">
          <select
            value={filters.species}
            onChange={(e) => patchFilters({ species: e.target.value as typeof filters.species })}
            className={controlCls}
          >
            <option value="">Todas</option>
            {SPECIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </LabeledControl>

        <LabeledControl label="Estado vital">
          <select
            value={filters.vitalState}
            onChange={(e) =>
              patchFilters({ vitalState: e.target.value as typeof filters.vitalState })
            }
            className={controlCls}
          >
            <option value="">Todos</option>
            {VITAL_STATES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </LabeledControl>

        <LabeledControl label="Sector">
          <select
            value={filters.sectorId}
            onChange={(e) => patchFilters({ sectorId: e.target.value })}
            className={controlCls}
            disabled={sectors.status !== 'success'}
          >
            <option value="">Todos</option>
            {sectors.data?.items.map((s) => (
              <option key={s.id} value={s.id}>
                {s.sectorCode} · {s.name}
              </option>
            ))}
          </select>
        </LabeledControl>

        <LabeledControl label="Orden">
          <select
            value={filters.sort}
            onChange={(e) => patchFilters({ sort: e.target.value as TropelSort })}
            className={controlCls}
          >
            {TROPEL_SORTS.map((s) => (
              <option key={s} value={s}>
                {SORT_LABEL[s]}
              </option>
            ))}
          </select>
        </LabeledControl>

        <LabeledControl label="Por pagina">
          <select
            value={filters.size}
            onChange={(e) => patchFilters({ size: Number(e.target.value) as typeof filters.size })}
            className={controlCls}
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </LabeledControl>
      </div>

      {/* Resultados: altura minima estable para no mover el layout */}
      <div className="relative min-h-[420px]">
        {error && !page && (
          <div className="grid min-h-[420px] place-items-center rounded-xl border border-edge bg-panel/60">
            <ErrorState message={error} onRetry={reload} />
          </div>
        )}

        {!error && page && !hasResults && (
          <div className="grid min-h-[420px] place-items-center rounded-xl border border-edge bg-panel/60">
            <p className="text-muted">No hay Tropeles que coincidan con estos filtros.</p>
          </div>
        )}

        {hasResults && (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {page.content.map((t) => (
              <TropelCard key={t.id} tropel={t} />
            ))}
          </ul>
        )}

        {/* Overlay de carga sin desmontar el contenido previo */}
        {loading && (
          <div className="absolute inset-0 grid place-items-center rounded-xl bg-ink/50 backdrop-blur-[1px]">
            <Spinner label="Actualizando..." />
          </div>
        )}
      </div>

      {/* Paginacion */}
      {page && (
        <Pagination
          currentPage={page.currentPage}
          totalPages={page.totalPages}
          totalElements={page.totalElements}
          disabled={loading}
          onChange={setPage}
        />
      )}
    </section>
  );
}

const controlCls =
  'w-full rounded-md border border-edge bg-ink px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';

function LabeledControl({ label, children }: { label: string; children: ReactNode }): ReactNode {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function TropelCard({ tropel }: { tropel: Tropel }): ReactNode {
  return (
    <li className="rounded-lg border border-edge bg-panel p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-white">{tropel.name}</p>
          <p className="text-xs text-muted">
            {tropel.species} · {tropel.sector.sectorCode}
          </p>
        </div>
        <VitalBadge state={tropel.vitalState} />
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <Stat label="Energia" value={tropel.energyLevel} />
        <Stat label="Caos" value={tropel.chaosIndex} />
        <Stat label="Mut." value={tropel.mutationStage} />
      </dl>
      <p className="mt-3 text-xs text-muted">Guardian: {tropel.guardianName}</p>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: number }): ReactNode {
  return (
    <div className="rounded-md bg-ink/60 py-1.5">
      <p className="text-sm font-semibold text-white">{value}</p>
      <p className="text-[10px] uppercase text-muted">{label}</p>
    </div>
  );
}

const VITAL_COLOR: Record<string, string> = {
  ESTABLE: 'bg-emerald-500/20 text-emerald-300',
  HAMBRIENTO: 'bg-amber-500/20 text-amber-300',
  AGITADO: 'bg-orange-500/20 text-orange-300',
  MUTANDO: 'bg-violet-500/20 text-violet-300',
  CRITICO: 'bg-rose-500/20 text-rose-300',
};

function VitalBadge({ state }: { state: string }): ReactNode {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${VITAL_COLOR[state] ?? ''}`}>
      {state}
    </span>
  );
}

function Pagination({
  currentPage,
  totalPages,
  totalElements,
  disabled,
  onChange,
}: {
  currentPage: number;
  totalPages: number;
  totalElements: number;
  disabled: boolean;
  onChange: (page: number) => void;
}): ReactNode {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted">
        {totalElements} Tropeles · pagina {currentPage + 1} de {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(currentPage - 1)}
          disabled={disabled || currentPage <= 0}
          className={pagerBtnCls}
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onChange(currentPage + 1)}
          disabled={disabled || currentPage >= totalPages - 1}
          className={pagerBtnCls}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

const pagerBtnCls =
  'rounded-md border border-edge bg-edge/50 px-4 py-2 text-sm font-medium text-white transition hover:bg-edge disabled:cursor-not-allowed disabled:opacity-40';
