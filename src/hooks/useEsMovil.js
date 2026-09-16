import { useCallback, useSyncExternalStore } from 'react';

/**
 * Ancho por debajo del cual se conmuta a las vistas pensadas para el pulgar.
 * 768px es el breakpoint `md` de Tailwind: por debajo solo cabe una columna
 * cómoda, que es justo la premisa de las vistas móviles.
 */
export const BREAKPOINT_MOVIL = 768;

/**
 * `true` mientras la ventana sea de ancho de celular. Reacciona al giro del
 * dispositivo y al redimensionado sin recargar, de modo que el componente que
 * lo usa puede alternar entre su árbol de escritorio y el de móvil
 * conservando todo su estado (una venta a medio armar no se pierde).
 *
 * Se apoya en `useSyncExternalStore` —la media query es, literalmente, un
 * estado externo— para leer siempre el valor vigente en el momento del render,
 * sin el parpadeo de un efecto que corrige el estado después de pintar.
 */
export default function useEsMovil(maxAncho = BREAKPOINT_MOVIL) {
  // Segunda condición, para el celular en horizontal: ahí el ancho supera el
  // breakpoint (844px en un teléfono corriente) pero solo quedan ~390px de
  // alto, donde una tabla es inservible. `pointer: coarse` acota la regla a
  // pantallas que se manejan con el dedo, así una laptop no entra por alto.
  const query = `(max-width: ${maxAncho - 0.02}px), (max-height: 480px) and (pointer: coarse)`;

  const suscribir = useCallback((notificar) => {
    const mql = window.matchMedia(query);
    mql.addEventListener('change', notificar);
    return () => mql.removeEventListener('change', notificar);
  }, [query]);

  const leer = useCallback(() => window.matchMedia(query).matches, [query]);

  // El tercer argumento solo se usa si algún día se renderiza en servidor:
  // sin ventana, se asume escritorio.
  return useSyncExternalStore(suscribir, leer, () => false);
}
