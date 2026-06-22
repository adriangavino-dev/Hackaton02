import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useSectors } from './useSectors';
import { ErrorState, Spinner, StatePanel } from '../../components/states';
import type { Climate, SectorListItem } from '../../lib/types';

const CLIMATE_LABEL: Record<Climate, string> = {
  PIXEL_FOREST: 'Bosque de pixeles',
  NEON_CAVE: 'Caverna neon',
  CLOUD_AQUARIUM: 'Acuario nube',
  RETRO_ARCADE: 'Arcade retro',
};

export function SectorsPage(): ReactNode {
  const { data, status, error, reload } = useSectors();

  return (
    <section>
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-white">Sectores</h1>
        <p className="text-sm text-muted">
          Abre la historia de un sector para recorrer su scrollytelling.
        </p>
      </header>

      {status === 'loading' && (
        <StatePanel>
          <Spinner label="Cargando sectores..." />
        </StatePanel>
      )}
      {status === 'error' && (
        <StatePanel>
          <ErrorState message={error ?? 'Error al cargar sectores.'} onRetry={reload} />
        </StatePanel>
      )}
      {status === 'success' && data && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((sector) => (
            <SectorCard key={sector.id} sector={sector} climateLabel={CLIMATE_LABEL[sector.climate]} />
          ))}
        </ul>
      )}
    </section>
  );
}

function SectorCard({
  sector,
  climateLabel,
}: {
  sector: SectorListItem;
  climateLabel: string;
}): ReactNode {
  const loadPct = sector.capacity > 0 ? Math.round((sector.currentLoad / sector.capacity) * 100) : 0;
  return (
    <li className="rounded-xl border border-edge bg-panel p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-white">{sector.name}</p>
          <p className="text-xs text-muted">
            {sector.sectorCode} · {climateLabel}
          </p>
        </div>
        <span className="rounded-md bg-ink/60 px-2 py-1 text-xs text-emerald-300">
          {sector.stabilityLevel}% est.
        </span>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>Carga</span>
          <span>
            {sector.currentLoad}/{sector.capacity}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-edge">
          <div className="h-full rounded-full bg-blue-500" style={{ width: `${loadPct}%` }} />
        </div>
      </div>

      <Link
        to={`/sectors/${sector.id}/story`}
        className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
        style={{ viewTransitionName: `sector-cta-${sector.id}` }}
      >
        Ver historia →
      </Link>
    </li>
  );
}
