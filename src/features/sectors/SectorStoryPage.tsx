import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchSectorStory } from '../../lib/api';
import { useResource } from '../../lib/useResource';
import { ErrorState, Spinner, StatePanel } from '../../components/states';
import {
  runViewTransition,
  supportsScrollDrivenAnimations,
  supportsViewTransitions,
  useReducedMotion,
} from '../../lib/capabilities';
import { useActiveStage } from './useActiveStage';
import type { SectorStoryResponse, StoryStage } from '../../lib/types';
import './story.css';

// Gradientes derivados del colorToken (data del backend), construidos con CSS.
const COLOR_GRADIENT: Record<string, [string, string]> = {
  emerald: ['#064e3b', '#10b981'],
  cyan: ['#164e63', '#22d3ee'],
  violet: ['#3b0764', '#a78bfa'],
  amber: ['#78350f', '#fbbf24'],
  rose: ['#4c0519', '#fb7185'],
  sky: ['#0c4a6e', '#38bdf8'],
  lime: ['#365314', '#a3e635'],
  fuchsia: ['#4a044e', '#e879f9'],
};

function gradientFor(token: string): string {
  const [from, to] = COLOR_GRADIENT[token] ?? ['#1e2940', '#6ea8fe'];
  return `radial-gradient(120% 120% at 30% 20%, ${to}33 0%, transparent 55%), linear-gradient(150deg, ${from} 0%, ${to} 100%)`;
}

export function SectorStoryPage(): ReactNode {
  const { id = '' } = useParams();
  const fetcher = useCallback((signal: AbortSignal) => fetchSectorStory(id, signal), [id]);
  const { data, status, error, reload } = useResource<SectorStoryResponse>(fetcher, [id]);

  if (status === 'loading') {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <StatePanel>
          <Spinner label="Cargando historia del sector..." />
        </StatePanel>
      </div>
    );
  }
  if (status === 'error' || !data) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <StatePanel>
          <ErrorState message={error ?? 'No se pudo cargar la historia.'} onRetry={reload} />
        </StatePanel>
      </div>
    );
  }

  return <StoryExperience story={data} />;
}

function StoryExperience({ story }: { story: SectorStoryResponse }): ReactNode {
  const [mode, setMode] = useState<'summary' | 'story'>('summary');
  const reducedMotion = useReducedMotion();
  const scrollDriven = supportsScrollDrivenAnimations() && !reducedMotion;

  const enterStory = useCallback(() => {
    runViewTransition(() => setMode('story'));
  }, []);
  const backToSummary = useCallback(() => {
    runViewTransition(() => {
      setMode('summary');
      window.scrollTo(0, 0);
    });
  }, []);

  return (
    <div style={{ viewTransitionName: 'story-root' }}>
      {mode === 'summary' ? (
        <SummaryView story={story} onEnter={enterStory} />
      ) : (
        <ScrollytellingView story={story} scrollDriven={scrollDriven} onBack={backToSummary} />
      )}
    </div>
  );
}

function SummaryView({
  story,
  onEnter,
}: {
  story: SectorStoryResponse;
  onEnter: () => void;
}): ReactNode {
  const first = story.stages[0];
  return (
    <section className="mx-auto max-w-3xl py-8">
      <Link to="/sectors" className="text-sm text-muted transition hover:text-white">
        ← Sectores
      </Link>
      <div
        className="story-visual mt-4 overflow-hidden rounded-2xl border border-edge p-8"
        style={{ background: first ? gradientFor(first.colorToken) : undefined }}
      >
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/70">
          {story.sector.climate}
        </p>
        <h1 className="mt-2 text-4xl font-bold text-white">{story.sector.name}</h1>
        <p className="mt-3 max-w-prose text-white/80">
          Una historia en {story.stages.length} etapas. Recorre la evolucion del sector y observa
          como cambian sus metricas en cada momento.
        </p>
        <button
          type="button"
          onClick={onEnter}
          className="mt-6 rounded-lg bg-white px-5 py-2.5 font-semibold text-ink transition hover:bg-white/90"
        >
          Iniciar recorrido →
        </button>
      </div>

      <ul className="mt-6 grid grid-cols-2 gap-2 text-sm text-muted sm:grid-cols-4">
        {story.stages.map((s) => (
          <li key={s.id} className="rounded-lg border border-edge bg-panel px-3 py-2">
            <span className="font-mono text-xs text-muted">#{s.order + 1}</span>
            <p className="truncate text-white">{s.title}</p>
          </li>
        ))}
      </ul>

      <CapabilityNote />
    </section>
  );
}

function ScrollytellingView({
  story,
  scrollDriven,
  onBack,
}: {
  story: SectorStoryResponse;
  scrollDriven: boolean;
  onBack: () => void;
}): ReactNode {
  const stages = story.stages;
  const { activeIndex, progress, registerStage } = useActiveStage(stages.length);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRefs = useRef<(HTMLElement | null)[]>([]);

  const goToStage = useCallback((index: number) => {
    const clamped = Math.min(stages.length - 1, Math.max(0, index));
    const el = stageRefs.current[clamped];
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Mover el foco al encabezado de la etapa para navegacion por teclado.
    el?.querySelector<HTMLElement>('[data-stage-heading]')?.focus();
  }, [stages.length]);

  // Navegacion por teclado entre etapas.
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      goToStage(activeIndex + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      goToStage(activeIndex - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      goToStage(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      goToStage(stages.length - 1);
    }
  }

  const active = stages[activeIndex] ?? stages[0];

  return (
    <div
      ref={containerRef}
      className={scrollDriven ? 'scroll-driven' : undefined}
      onKeyDown={onKeyDown}
    >
      {/* Barra de progreso superior */}
      <div className="sticky top-[57px] z-10 -mx-4 mb-2 bg-ink/80 px-4 py-2 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 text-sm text-muted transition hover:text-white"
          >
            ← Resumen
          </button>
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-edge"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round((scrollDriven ? progress : progress) * 100)}
            aria-label="Progreso del recorrido"
          >
            {scrollDriven ? (
              <div className="story-progress__fill story-progress__fill--css h-full w-full rounded-full bg-blue-500" />
            ) : (
              <div
                className="story-progress__fill h-full rounded-full bg-blue-500"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            )}
          </div>
          <span className="shrink-0 font-mono text-xs text-muted">
            {activeIndex + 1}/{stages.length}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Visual persistente (sticky) que cambia con la etapa activa */}
        <aside className="lg:sticky lg:top-28 lg:h-[70vh]">
          {active && <PersistentVisual stage={active} sectorName={story.sector.name} />}
        </aside>

        {/* Columna de narrativa por etapas */}
        <div>
          {stages.map((stage, index) => (
            <StageSection
              key={stage.id}
              stage={stage}
              index={index}
              isActive={index === activeIndex}
              register={(el) => {
                stageRefs.current[index] = el;
                registerStage(index, el);
              }}
            />
          ))}

          {/* Indicador de etapas / navegacion por teclado y click */}
          <nav className="mt-6 flex flex-wrap gap-2" aria-label="Navegacion de etapas">
            {stages.map((stage, index) => (
              <button
                key={stage.id}
                type="button"
                onClick={() => goToStage(index)}
                aria-current={index === activeIndex}
                aria-label={`Ir a etapa ${index + 1}: ${stage.title}`}
                className={`h-2.5 w-2.5 rounded-full transition ${
                  index === activeIndex ? 'scale-125 bg-blue-400' : 'bg-edge hover:bg-muted'
                }`}
              />
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

function PersistentVisual({
  stage,
  sectorName,
}: {
  stage: StoryStage;
  sectorName: string;
}): ReactNode {
  return (
    <div
      className="story-visual flex h-full min-h-[280px] flex-col justify-between overflow-hidden rounded-2xl border border-edge p-6"
      style={{ background: gradientFor(stage.colorToken) }}
    >
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/70">{sectorName}</p>
        <p className="mt-1 font-mono text-xs text-white/60">{stage.assetKey}</p>
        <h2 className="mt-4 text-3xl font-bold text-white">{stage.title}</h2>
        <span className="mt-3 inline-block rounded-full bg-black/30 px-3 py-1 text-xs font-semibold text-white">
          Evento: {stage.dominantEvent}
        </span>
      </div>
      <dl className="grid grid-cols-3 gap-3" aria-live="polite">
        <Metric label="Estabilidad" value={`${stage.metrics.stability}%`} />
        <Metric label="Energia" value={`${stage.metrics.energy}%`} />
        <Metric label="Alertas" value={stage.metrics.alerts} />
      </dl>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }): ReactNode {
  return (
    <div className="rounded-lg bg-black/30 p-3 text-center">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-white/70">{label}</p>
    </div>
  );
}

function StageSection({
  stage,
  index,
  isActive,
  register,
}: {
  stage: StoryStage;
  index: number;
  isActive: boolean;
  register: (el: HTMLElement | null) => void;
}): ReactNode {
  return (
    <section
      ref={register}
      data-stage-index={index}
      className="flex min-h-[80vh] flex-col justify-center py-8"
      aria-label={`Etapa ${index + 1} de ${stage.order + 1}`}
    >
      <div className="story-stage__inner">
        <div
          className={`rounded-2xl border bg-panel p-6 transition ${
            isActive ? 'border-blue-500/60' : 'border-edge'
          }`}
        >
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-sm text-blue-300">
              {String(stage.order + 1).padStart(2, '0')}
            </span>
            <h3
              data-stage-heading
              tabIndex={-1}
              className="text-2xl font-bold text-white focus-visible:outline-none"
            >
              {stage.title}
            </h3>
          </div>
          <p className="mt-4 text-lg leading-relaxed text-white/90">{stage.narrative}</p>

          {/* Metricas tambien en el flujo (visibles sin depender del sticky en mobile) */}
          <dl className="mt-5 flex flex-wrap gap-4 text-sm text-muted lg:hidden">
            <span>Estabilidad: {stage.metrics.stability}%</span>
            <span>Energia: {stage.metrics.energy}%</span>
            <span>Alertas: {stage.metrics.alerts}</span>
          </dl>
        </div>
      </div>
    </section>
  );
}

function CapabilityNote(): ReactNode {
  const sd = supportsScrollDrivenAnimations();
  const vt = supportsViewTransitions();
  return (
    <p className="mt-6 text-xs text-muted">
      Mejoras activas en este navegador: Scroll-driven animations{' '}
      <Badge on={sd} /> · View Transitions <Badge on={vt} />. Si no hay soporte, el recorrido
      funciona igual con fallback.
    </p>
  );
}

function Badge({ on }: { on: boolean }): ReactNode {
  return (
    <span className={on ? 'text-emerald-300' : 'text-amber-300'}>{on ? 'si' : 'fallback'}</span>
  );
}
