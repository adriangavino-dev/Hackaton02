import { useCallback, type ReactNode } from 'react';
import { fetchDashboard } from '../../lib/api';
import { useResource } from '../../lib/useResource';
import { ErrorState, Spinner, StatePanel } from '../../components/states';
import type { DashboardSummary, Severity } from '../../lib/types';

const SEVERITY_ORDER: Severity[] = ['LEVE', 'MODERADO', 'GRAVE', 'CRITICO'];
const SEVERITY_COLOR: Record<Severity, string> = {
  LEVE: 'bg-emerald-500',
  MODERADO: 'bg-amber-500',
  GRAVE: 'bg-orange-500',
  CRITICO: 'bg-rose-500',
};

export function DashboardPage(): ReactNode {
  const fetcher = useCallback((signal: AbortSignal) => fetchDashboard(signal), []);
  const { data, status, error, reload } = useResource<DashboardSummary>(fetcher, []);

  return (
    <section>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Centro de control</h1>
        <p className="text-sm text-muted">Indicadores globales del workspace.</p>
      </header>

      {status === 'loading' && (
        <StatePanel>
          <Spinner label="Cargando indicadores..." />
        </StatePanel>
      )}

      {status === 'error' && (
        <StatePanel>
          <ErrorState message={error ?? 'Error al cargar el dashboard.'} onRetry={reload} />
        </StatePanel>
      )}

      {status === 'success' && data && <DashboardContent data={data} />}
    </section>
  );
}

function DashboardContent({ data }: { data: DashboardSummary }): ReactNode {
  const totalSignals = SEVERITY_ORDER.reduce((acc, s) => acc + data.signalsBySeverity[s], 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Tropeles totales" value={data.totalTropels} />
        <Kpi label="Tropeles criticos" value={data.criticalTropels} accent="text-rose-300" />
        <Kpi label="Senales abiertas" value={data.openSignals} accent="text-amber-300" />
        <Kpi label="Estabilidad media" value={`${data.sectorStabilityAvg}%`} accent="text-emerald-300" />
      </div>

      <div className="rounded-xl border border-edge bg-panel p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          Senales por severidad
        </h2>
        <div className="space-y-3">
          {SEVERITY_ORDER.map((sev) => {
            const value = data.signalsBySeverity[sev];
            const pct = totalSignals > 0 ? Math.round((value / totalSignals) * 100) : 0;
            return (
              <div key={sev}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-white">{sev}</span>
                  <span className="text-muted">
                    {value} · {pct}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-edge">
                  <div
                    className={`h-full rounded-full ${SEVERITY_COLOR[sev]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-muted">
        Generado: {new Date(data.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}

function Kpi({
  label,
  value,
  accent = 'text-white',
}: {
  label: string;
  value: string | number;
  accent?: string;
}): ReactNode {
  return (
    <div className="rounded-xl border border-edge bg-panel p-5">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}
