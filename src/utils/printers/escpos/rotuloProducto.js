import ESCPOSEncoder from './encoder';
import { construirEtiquetasProducto } from '../shared/sanitize';
import { resolverFormatoESCPOS } from './formatos';

const NOMBRE_EMPRESA = 'Maquinarias RASEC S.A.C.';

function wrapTextoChars(texto, maxChars) {
  const palabras = String(texto).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return [''];
  const lineas = [];
  let actual = '';
  for (const p of palabras) {
    const propuesta = actual ? `${actual} ${p}` : p;
    if (propuesta.length <= maxChars) {
      actual = propuesta;
      continue;
    }
    if (actual) lineas.push(actual);
    if (p.length > maxChars) {
      let resto = p;
      while (resto.length > maxChars) {
        lineas.push(resto.slice(0, maxChars));
        resto = resto.slice(maxChars);
      }
      actual = resto;
    } else {
      actual = p;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

function dibujarEtiquetaUna(enc, e, w, formato) {
  enc.align('center').bold(true).text(NOMBRE_EMPRESA);
  enc.bold(false).line('-', w);

  enc.align('left').size('double-height').bold(true);
  for (const ln of wrapTextoChars(e.nombre, Math.floor(w / 2))) enc.text(ln);
  enc.size('normal').bold(false);

  if (e.categoria) {
    for (const ln of wrapTextoChars(e.categoria, w)) enc.text(ln);
  }

  enc.bold(true);
  for (const ln of wrapTextoChars(`SN: ${e.serial}`, w)) enc.text(ln);
  enc.bold(false);

  enc.feed(1);
  enc.align('center').barcode(e.codigoBarras || e.serial, {
    height: formato.barcodeHeight,
    width: formato.barcodeWidth,
    hri: 'below',
  });
  enc.feed(1);
  enc.line('-', w);
  enc.feed(1);
}

/**
 * Genera el payload ESC/POS para imprimir TODAS las etiquetas de una compra
 * o importación en un único job (separadas por línea horizontal). Una
 * etiqueta por unidad física registrada.
 */
export function generarRotulosProductosESCPOS(compra, opts = {}) {
  const formato = resolverFormatoESCPOS(opts);
  const w = formato.widthChars;
  const etiquetas = construirEtiquetasProducto(compra);
  if (etiquetas.length === 0) {
    return { data: new Uint8Array(), count: 0 };
  }

  const enc = new ESCPOSEncoder();
  for (const e of etiquetas) {
    dibujarEtiquetaUna(enc, e, w, formato);
  }
  enc.feedOnly(4);
  return { data: enc.encode(), count: etiquetas.length };
}
