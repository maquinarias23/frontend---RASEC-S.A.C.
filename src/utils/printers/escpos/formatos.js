import { LAYOUT_COMPLETO } from '../../../config/constants';

/**
 * Formatos soportados por ESC/POS.
 *
 * ESC/POS sólo imprime tickets de papel térmico continuo en bobina, no
 * etiquetas die-cut. Los anchos estándar son 58 mm y 80 mm. El campo
 * `widthChars` indica cuántos caracteres caben por línea con la fuente A
 * (12×24 dots) — es lo que usan los formateadores para alinear y partir
 * texto sin medir pixeles.
 */
export const ESCPOS_FORMATOS = [
  {
    id: '58_continuo',
    label: '58 mm continuo — Ticket POS',
    widthMm: 58, heightMm: null,
    widthChars: 32,
    barcodeHeight: 60, barcodeWidth: 2,
    layout: LAYOUT_COMPLETO,
  },
  {
    id: '80_continuo',
    label: '80 mm continuo — Ticket POS estándar',
    widthMm: 80, heightMm: null,
    widthChars: 48,
    barcodeHeight: 80, barcodeWidth: 2,
    layout: LAYOUT_COMPLETO,
  },
];

export const ESCPOS_FORMATO_DEFAULT_ID = '58_continuo';

export function resolverFormatoESCPOS(opts = {}) {
  if (opts.formato && opts.formato.id) {
    const f = ESCPOS_FORMATOS.find((x) => x.id === opts.formato.id);
    if (f) return f;
  }
  if (opts.formatoId) {
    const f = ESCPOS_FORMATOS.find((x) => x.id === opts.formatoId);
    if (f) return f;
  }
  return (
    ESCPOS_FORMATOS.find((x) => x.id === ESCPOS_FORMATO_DEFAULT_ID) || ESCPOS_FORMATOS[0]
  );
}
