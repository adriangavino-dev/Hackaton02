import { useCallback, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { fetchSignal, updateSignalStatus } from '../../lib/api';
import { useResource } from '../../lib/useResource';
import { ApiError } from '../../lib/apiClient';
import { ErrorState, Spinner, StatePanel } from '../../components/states';
import { SeverityBadge, StatusBadge } from './signalBadges';
import { patchSignalEverywhere } from './feedStore';
import { PATCHABLE_STATUSES, type PatchableStatus, type Signal } from '../../lib/types';

export function SignalDetailPage(): ReactNode {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const fetcher = useCallback((signal: AbortSignal) => fetchSignal(id, signal), [id]);
  const { data, status, error, reload } = useResource<Signal>(fetcher, [id]);

  // Estado local de la mutacion, separado de la carga del detalle.
  const [signal, setSignal] = useState<Signal | null>(null);
  const [updating, setUpdating] = useState<PatchableStatus | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  // Sincroniza el estado local con la carga inicial.
  const current = signal ?? data;

  function goBack() {
    // navigate(-1) preserva la URL previa del feed (filtros + posicion en cache).
    if (location.key !== 'default') navigate(-1);
    else navigate('/signals');
  }

  async function applyStatus(next: PatchableStatus) {
    if (!current) return;
    const previous = current;
    setUpdating(next);
    setUpdateError(null);
    setConfirmation(null);
    try {
      const updated = await updateSignalStatus(current.id, next);
      setSignal(updated);
      patchSignalEverywhere(updated); // reflejar en el feed al volver
      setConfirmation(`Estado actualizado a ${updated.status}.`);
    } catch (err) {
      // Conservar el estado anterior y mostrar error accionable.
      setSignal(previous);
      setUpdateError(
        err instanceof ApiError ? err.message : 'No se pudo actualizar el estado.',
      );
    } finally {
      setUpdating(null);
    }
  }

  return (
    <section className="mx-auto max-w-2xl">
      <button
        type="button"
        onClick={goBack}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition hover:text-white"
      >
        ← Volver al feed
      </button>

      {status === 'loading' && (
        <StatePanel>
          <Spinner label="Cargando senal..." />
        </StatePanel>
      )}

      {status === 'error' && (
        <StatePanel>
          <ErrorState message={error ?? 'Error al cargar la senal.'} onRetry={reload} />
        </StatePanel>
      )}

      {status === 'success' && current && (
        <article className="space-y-5 rounded-xl border border-edge bg-panel p-6">
          <header className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-xl font-bold text-white">{current.signalType}</h1>
              <StatusBadge status={current.status} />
            </div>
            <div className="flex items-center gap-2">
              <SeverityBadge severity={current.severity} />
              <span className="font-mono text-xs text-muted">{current.id}</span>
            </div>
          </header>

          <p className="rounded-lg bg-ink/60 p-4 text-sm text-white">{current.rawContent}</p>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Tropel" value={current.tropel.name} />
            <Info label="Especie" value={current.tropel.species} />
            <Info label="Creada" value={new Date(current.createdAt).toLocaleString()} />
            <Info label="Actualizada" value={new Date(current.updatedAt).toLocaleString()} />
          </dl>

          <div className="border-t border-edge pt-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              Atender senal
            </h2>
            <div className="flex flex-wrap gap-3">
              {PATCHABLE_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => applyStatus(s)}
                  disabled={updating !== null || current.status === s}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {updating === s ? 'Actualizando...' : `Marcar ${s}`}
                </button>
              ))}
            </div>

            {confirmation && (
              <p
                className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300"
                role="status"
              >
                ✓ {confirmation}
              </p>
            )}

            {updateError && (
              <div
                className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
                role="alert"
              >
                <p>⚠ {updateError}</p>
                <p className="mt-1 text-xs text-rose-300/80">
                  El estado se mantuvo en {current.status}. Puedes reintentar.
                </p>
              </div>
            )}
          </div>
        </article>
      )}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-white">{value}</dd>
    </div>
  );
}
