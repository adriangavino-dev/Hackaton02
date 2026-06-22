import type { ReactNode } from 'react';

// Estados compartidos de loading/error/empty. Mantienen una altura minima para
// no mover el layout al alternar entre ellos (requisito de CP2/CP3).

export function Spinner({ label }: { label?: string }): ReactNode {
  return (
    <div className="flex items-center gap-3 text-muted" role="status" aria-live="polite">
      <span
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        aria-hidden="true"
      />
      <span>{label ?? 'Cargando...'}</span>
    </div>
  );
}

export function StatePanel({
  children,
  minH = true,
}: {
  children: ReactNode;
  minH?: boolean;
}): ReactNode {
  return (
    <div
      className={`flex items-center justify-center rounded-lg border border-edge bg-panel/60 p-6 ${
        minH ? 'min-h-[160px]' : ''
      }`}
    >
      {children}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}): ReactNode {
  return (
    <div className="flex flex-col items-center gap-3 text-center" role="alert">
      <p className="text-rose-300">⚠ {message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-edge bg-edge/60 px-4 py-2 text-sm font-medium text-white transition hover:bg-edge focus-visible:outline-none"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message: string }): ReactNode {
  return <p className="text-muted">{message}</p>;
}
