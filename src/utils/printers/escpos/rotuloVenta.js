import ESCPOSEncoder from './encoder';
import { sanitizarRotuloVenta } from '../shared/sanitize';
import { resolverFormatoESCPOS } from './formatos';

const NOMBRE_EMPRESA = 'RASEC S.A.C.';

/**
 * Wrap manual por longitud de caracteres (ESC/POS no tiene "canvas").
 */
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

/**
 * Genera el rótulo de venta en ESC/POS.
 * Usa comandos de texto nativos (más universal y rápido que rasterizar).
 */
export function generarRotuloVentaESCPOS(data, opts = {}) {
  const formato = resolverFormatoESCPOS(opts);
  const w = formato.widthChars;
  const d = sanitizarRotuloVenta(data);

  const enc = new ESCPOSEncoder();

  enc.align('center').size('double').bold(true).text(NOMBRE_EMPRESA);
  enc.size('normal').bold(false);
  enc.line('=', w);

  enc.align('center').text('Codigo de Venta');
  enc.size('double-height').bold(true).text(d.codigo);
  enc.size('normal').bold(false);
  enc.line('=', w);

  enc.align('left').bold(true).text('REMITENTE');
  enc.bold(false);
  for (const ln of wrapTextoChars(`Nombre: ${d.remNombre}`, w)) enc.text(ln);
  for (const ln of wrapTextoChars(`DNI:    ${d.remDni}`, w)) enc.text(ln);
  for (const ln of wrapTextoChars(`Tel:    ${d.remTel}`, w)) enc.text(ln);
  enc.line('-', w);

  enc.bold(true).text('DESTINATARIO');
  enc.bold(false);
  for (const ln of wrapTextoChars(`Nombre: ${d.destNombre}`, w)) enc.text(ln);
  for (const ln of wrapTextoChars(`DNI:    ${d.destDni}`, w)) enc.text(ln);
  for (const ln of wrapTextoChars(`Tel:    ${d.destTel}`, w)) enc.text(ln);
  enc.line('-', w);

  enc.bold(true).text('DESTINO');
  enc.bold(false);
  for (const ln of wrapTextoChars(`Dir: ${d.dirCompleta}`, w)) enc.text(ln);
  if (d.depto.trim()) {
    for (const ln of wrapTextoChars(`Depto: ${d.depto.trim()}`, w)) enc.text(ln);
  }
  if (d.agencia) {
    enc.bold(true);
    for (const ln of wrapTextoChars(`Agencia: ${d.agencia}`, w)) enc.text(ln);
    enc.bold(false);
  }
  if (d.referencia) {
    for (const ln of wrapTextoChars(`Ref: ${d.referencia}`, w)) enc.text(ln);
  }
  enc.line('=', w);

  enc.align('center').size('double-height').bold(true).text(`Venta #${d.ventaId}`);
  enc.size('normal').bold(false);
  enc.feed(1);

  enc.barcode(d.codigoBarcode, {
    height: formato.barcodeHeight,
    width: formato.barcodeWidth,
    hri: 'below',
  });

  enc.feedOnly(4);
  return enc.encode();
}
