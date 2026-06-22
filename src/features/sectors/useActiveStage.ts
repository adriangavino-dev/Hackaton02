import { useEffect, useRef, useState } from 'react';

// Determina la etapa activa segun el scroll usando IntersectionObserver. Esto
// funciona en todos los navegadores y es la base "siempre funcional": el visual
// persistente y las metricas cambian con la etapa activa aunque no exista soporte
// de CSS scroll-driven animations. Tambien expone el progreso continuo (0..1).
export function useActiveStage(count: number): {
  activeIndex: number;
  progress: number;
  registerStage: (index: number, el: HTMLElement | null) => void;
} {
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const stageEls = useRef<(HTMLElement | null)[]>([]);
  const ratios = useRef<number[]>([]);

  function registerStage(index: number, el: HTMLElement | null) {
    stageEls.current[index] = el;
  }

  useEffect(() => {
    ratios.current = new Array(count).fill(0);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const idx = Number((entry.target as HTMLElement).dataset.stageIndex);
          if (!Number.isNaN(idx)) ratios.current[idx] = entry.intersectionRatio;
        }
        // La etapa con mayor visibilidad es la activa.
        let best = 0;
        let bestRatio = -1;
        for (let i = 0; i < ratios.current.length; i++) {
          const r = ratios.current[i] ?? 0;
          if (r > bestRatio) {
            bestRatio = r;
            best = i;
          }
        }
        setActiveIndex(best);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    for (const el of stageEls.current) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [count]);

  // Progreso continuo basado en la posicion del bloque de historia en el viewport.
  useEffect(() => {
    function onScroll() {
      const first = stageEls.current[0];
      const last = stageEls.current[count - 1];
      if (!first || !last) return;
      const start = first.offsetTop;
      const end = last.offsetTop + last.offsetHeight;
      const span = end - start - window.innerHeight;
      const scrolled = window.scrollY - start;
      const p = span > 0 ? scrolled / span : 0;
      setProgress(Math.min(1, Math.max(0, p)));
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [count]);

  return { activeIndex, progress, registerStage };
}
