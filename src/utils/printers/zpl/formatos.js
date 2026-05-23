import {
  LAYOUT_COMPLETO,
  LAYOUT_REDUCIDO,
  LAYOUT_MINIMO,
} from '../../../config/constants';

/**
 * Formatos soportados por ZPL.
 *
 * Zebra trabaja con etiquetas die-cut (no continuo). Los anchos en dots se
 * calculan a 203 dpi (8 dots/mm) — resolución estándar de la familia ZD220 /
 * ZD230 / GK420 / ZD500. Si se conecta una de 300 dpi habría que duplicar.
 *
 * Sólo formatos `widthDots = mm × 8` y `heightDots = mm × 8`.
 */
export const ZPL_FORMATOS = [
  {
    id: '100x150',
    label: '100 × 150 mm — Envío Mercado Libre / Olva',
    widthMm: 100, heightMm: 150,
    widthDots: 800, heightDots: 1200,
    fontTitulo: 60, fontNormal: 30, fontPeq: 24,
    barcodeHeight: 90,
    layout: LAYOUT_COMPLETO,
  },
  {
    id: '100x100',
    label: '100 × 100 mm — Envío corto',
    widthMm: 100, heightMm: 100,
    widthDots: 800, heightDots: 800,
    fontTitulo: 50, fontNormal: 28, fontPeq: 22,
    barcodeHeight: 80,
    layout: LAYOUT_COMPLETO,
  },
  {
    id: '76x38',
    label: '76 × 38 mm — Textil / industrial',
    widthMm: 76, heightMm: 38,
    widthDots: 608, heightDots: 304,
    fontTitulo: 28, fontNormal: 20, fontPeq: 18,
    barcodeHeight: 50,
    layout: LAYOUT_REDUCIDO,
  },
  {
    id: '60x40',
    label: '60 × 40 mm — Producto retail',
    widthMm: 60, heightMm: 40,
    widthDots: 480, heightDots: 320,
    fontTitulo: 28, fontNormal: 20, fontPeq: 18,
    barcodeHeight: 50,
    layout: LAYOUT_REDUCIDO,
  },
  {
    id: '50x30',
    label: '50 × 30 mm — Farmacia / cosmética',
    widthMm: 50, heightMm: 30,
    widthDots: 400, heightDots: 240,
    fontTitulo: 26, fontNormal: 20, fontPeq: 18,
    barcodeHeight: 50,
    layout: LAYOUT_REDUCIDO,
  },
  {
    id: '50x25',
    label: '50 × 25 mm — Código de barras',
    widthMm: 50, heightMm: 25,
    widthDots: 400, heightDots: 200,
    fontTitulo: 24, fontNormal: 18, fontPeq: 16,
    barcodeHeight: 45,
    layout: LAYOUT_MINIMO,
  },
  {
    id: '40x25',
    label: '40 × 25 mm — Joyería / pequeños',
    widthMm: 40, heightMm: 25,
    widthDots: 320, heightDots: 200,
    fontTitulo: 22, fontNormal: 18, fontPeq: 14,
    barcodeHeight: 40,
    layout: LAYOUT_MINIMO,
  },
  {
    id: '32x25',
    label: '32 × 25 mm — Precio supermercado',
    widthMm: 32, heightMm: 25,
    widthDots: 256, heightDots: 200,
    fontTitulo: 20, fontNormal: 16, fontPeq: 14,
    barcodeHeight: 40,
    layout: LAYOUT_MINIMO,
  },
];

export const ZPL_FORMATO_DEFAULT_ID = '100x150';

export function resolverFormatoZPL(opts = {}) {
  if (opts.formato && opts.formato.id) {
    const f = ZPL_FORMATOS.find((x) => x.id === opts.formato.id);
    if (f) return f;
  }
  if (opts.formatoId) {
    const f = ZPL_FORMATOS.find((x) => x.id === opts.formatoId);
    if (f) return f;
  }
  return (
    ZPL_FORMATOS.find((x) => x.id === ZPL_FORMATO_DEFAULT_ID) || ZPL_FORMATOS[0]
  );
}
