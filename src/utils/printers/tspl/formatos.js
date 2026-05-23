import {
  LAYOUT_COMPLETO,
  LAYOUT_REDUCIDO,
  LAYOUT_MINIMO,
} from '../../../config/constants';

// Parámetros TSPL globales (fallback si el formato no los define).
export const TSPL_DENSITY = 10;     // 0-15, calor del cabezal
export const TSPL_SPEED = 4;        // pulgadas/seg
export const TSPL_DIRECTION = 1;    // 0=normal, 1=180° (mayoría de portátiles BT)

/**
 * Catálogo de formatos soportados por el driver TSPL (TSC + clones).
 * Orden = prioridad en el selector de UI.
 *
 * Campos:
 *   id        — identificador estable (no traducir, usado en localStorage)
 *   label     — texto visible
 *   widthMm   — ancho del rollo / etiqueta (referencia para SIZE en TSPL)
 *   heightMm  — alto fijo si es etiqueta · null si es papel continuo
 *   widthDots — ancho útil del bitmap (múltiplo de 8 ≤ widthMm × 8 dpi)
 *   gap       — string que va al comando GAP de TSPL
 *   density   — 0-15, calor del cabezal recomendado
 *   speed     — pulgadas/seg recomendados
 *   layout    — completo · reducido · minimo
 */
export const TSPL_FORMATOS = [
  {
    id: '58_continuo',
    label: '58 mm continuo — Ticket POS / rótulo corto',
    widthMm: 58, heightMm: null, widthDots: 384,
    gap: '0,0', density: 10, speed: 4, layout: LAYOUT_COMPLETO,
  },
  {
    id: '80_continuo',
    label: '80 mm continuo — Ticket POS estándar',
    widthMm: 80, heightMm: null, widthDots: 576,
    gap: '0,0', density: 10, speed: 4, layout: LAYOUT_COMPLETO,
  },
  {
    id: '100x150',
    label: '100 × 150 mm — Envío Mercado Libre / Olva',
    widthMm: 100, heightMm: 150, widthDots: 760,
    gap: '2 mm,0', density: 8, speed: 4, layout: LAYOUT_COMPLETO,
  },
  {
    id: '100x100',
    label: '100 × 100 mm — Envío corto',
    widthMm: 100, heightMm: 100, widthDots: 760,
    gap: '2 mm,0', density: 8, speed: 4, layout: LAYOUT_COMPLETO,
  },
  {
    id: '76x38',
    label: '76 × 38 mm — Textil / industrial',
    widthMm: 76, heightMm: 38, widthDots: 568,
    gap: '2 mm,0', density: 9, speed: 4, layout: LAYOUT_REDUCIDO,
  },
  {
    id: '60x40',
    label: '60 × 40 mm — Producto retail',
    widthMm: 60, heightMm: 40, widthDots: 456,
    gap: '2 mm,0', density: 8, speed: 4, layout: LAYOUT_REDUCIDO,
  },
  {
    id: '50x30',
    label: '50 × 30 mm — Farmacia / cosmética',
    widthMm: 50, heightMm: 30, widthDots: 376,
    gap: '2 mm,0', density: 8, speed: 3, layout: LAYOUT_REDUCIDO,
  },
  {
    id: '50x25',
    label: '50 × 25 mm — Código de barras',
    widthMm: 50, heightMm: 25, widthDots: 376,
    gap: '2 mm,0', density: 8, speed: 3, layout: LAYOUT_MINIMO,
  },
  {
    id: '40x25',
    label: '40 × 25 mm — Joyería / pequeños',
    widthMm: 40, heightMm: 25, widthDots: 304,
    gap: '2 mm,0', density: 7, speed: 3, layout: LAYOUT_MINIMO,
  },
  {
    id: '32x25',
    label: '32 × 25 mm — Precio supermercado',
    widthMm: 32, heightMm: 25, widthDots: 240,
    gap: '2 mm,0', density: 7, speed: 3, layout: LAYOUT_MINIMO,
  },
];

// Default del driver TSPL (preserva la EX58C ya validada).
export const TSPL_FORMATO_DEFAULT_ID = '58_continuo';

/**
 * Resuelve el formato a partir de las opciones (compatibilidad con llamadas
 * antiguas).
 *   - opts.formato: objeto del catálogo (preferido)
 *   - opts.formatoId: id string del catálogo
 *   - opts.anchoMm: legacy. 58 → '58_continuo', 80 → '80_continuo'
 */
export function resolverFormatoTSPL(opts = {}) {
  if (opts.formato && opts.formato.id) return opts.formato;
  if (opts.formatoId) {
    const f = TSPL_FORMATOS.find((x) => x.id === opts.formatoId);
    if (f) return f;
  }
  if (opts.anchoMm === 58) return TSPL_FORMATOS.find((x) => x.id === '58_continuo');
  if (opts.anchoMm === 80) return TSPL_FORMATOS.find((x) => x.id === '80_continuo');
  return (
    TSPL_FORMATOS.find((x) => x.id === TSPL_FORMATO_DEFAULT_ID) || TSPL_FORMATOS[0]
  );
}
