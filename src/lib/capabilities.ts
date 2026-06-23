import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

// Deteccion de soporte de APIs avanzadas. Se evalua de forma segura (puede correr
// en entornos sin esas APIs) para decidir entre la version mejorada y el fallback.

export function supportsScrollDrivenAnimations(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('animation-timeline: scroll()') &&
    CSS.supports('animation-timeline: view()')
  );
}

export function supportsViewTransitions(): boolean {
  return typeof document !== 'undefined' && typeof document.startViewTransition === 'function';
}

// Ejecuta un cambio de vista usando View Transition API si existe; si no (o si
// falla), aplica el cambio directamente (fallback funcional, sin animacion).
// Importante: el update se envuelve en flushSync para que el DOM cambie de forma
// sincrona dentro del callback de la transicion (React 18 batchea por defecto, lo
// que dejaria la transicion sin capturar el nuevo estado). El try/catch garantiza
// que el cambio de vista ocurra aunque startViewTransition lance.
export function runViewTransition(update: () => void): void {
  const apply = () => flushSync(update);
  if (supportsViewTransitions() && !prefersReducedMotion()) {
    try {
      document.startViewTransition?.(apply);
      return;
    } catch {
      // cae al fallback
    }
  }
  apply();
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// Hook reactivo: se actualiza si el usuario cambia la preferencia del sistema.
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}
