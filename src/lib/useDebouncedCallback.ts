import { useEffect, useMemo, useRef } from 'react';

// Devuelve una version debounced de la callback. Util para no escribir en la URL
// (y disparar requests) en cada tecla de la busqueda.
export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delayMs: number,
): (...args: A) => void {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return useMemo(
    () =>
      (...args: A) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => callbackRef.current(...args), delayMs);
      },
    [delayMs],
  );
}
