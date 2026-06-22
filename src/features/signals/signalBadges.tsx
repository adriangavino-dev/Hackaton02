import type { ReactNode } from 'react';
import type { Severity, SignalStatus } from '../../lib/types';

const SEVERITY_COLOR: Record<Severity, string> = {
  LEVE: 'bg-emerald-500/20 text-emerald-300',
  MODERADO: 'bg-amber-500/20 text-amber-300',
  GRAVE: 'bg-orange-500/20 text-orange-300',
  CRITICO: 'bg-rose-500/20 text-rose-300',
};

const STATUS_COLOR: Record<SignalStatus, string> = {
  RECIBIDA: 'bg-sky-500/20 text-sky-300',
  PROCESANDO: 'bg-violet-500/20 text-violet-300',
  ATENDIDA: 'bg-emerald-500/20 text-emerald-300',
};

export function SeverityBadge({ severity }: { severity: Severity }): ReactNode {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${SEVERITY_COLOR[severity]}`}>
      {severity}
    </span>
  );
}

export function StatusBadge({ status }: { status: SignalStatus }): ReactNode {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[status]}`}>
      {status}
    </span>
  );
}
