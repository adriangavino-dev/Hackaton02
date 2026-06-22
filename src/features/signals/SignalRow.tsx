import type { ReactNode } from 'react';
import type { Signal } from '../../lib/types';
import { SeverityBadge, StatusBadge } from './signalBadges';

// Cada senal es un boton accesible para abrir el detalle por teclado o mouse.
export function SignalRow({
  signal,
  onOpen,
}: {
  signal: Signal;
  onOpen: () => void;
}): ReactNode {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-lg border border-edge bg-panel p-3 text-left transition hover:border-blue-500/60 hover:bg-panel/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{signal.signalType}</span>
            <SeverityBadge severity={signal.severity} />
          </div>
          <p className="mt-1 truncate text-sm text-muted">{signal.rawContent}</p>
          <p className="mt-1 text-xs text-muted/80">
            {signal.tropel.name} · {signal.tropel.species} ·{' '}
            {new Date(signal.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="shrink-0">
          <StatusBadge status={signal.status} />
        </div>
        <span className="shrink-0 font-mono text-[10px] text-muted/60">{signal.id}</span>
      </button>
    </li>
  );
}
