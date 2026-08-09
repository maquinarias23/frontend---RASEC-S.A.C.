import {
  LAYOUT_COMPLETO,
  LAYOUT_REDUCIDO,
  LAYOUT_MINIMO,
} from '../../../config/constants';
import { sanitizarRotuloVenta } from '../shared/sanitize';
import { resolverFormatoZPL } from './formatos';


/**
 * Escapa caracteres reservados de ZPL en un string a imprimir.
 * ZPL usa ^ y ~ como introductores de comando — un texto que los contenga
 * literal puede confundir al parser. Los reemplazamos por placeholder seguro.
 */
function safeZPLText(str) {
  return String(str ?? '')
    .replace(/\^/g, '/')
    .replace(/~/g, '-');
}

/**
 * Acumulador de comandos ZPL. Devuelve string final que se serializa a bytes.
 */
class ZPLBuilder {
  constructor() { this.parts = []; }
  raw(s) { this.parts.push(s); return this; }
  // ^FO x,y ^A0N,h,h ^FB w,maxLines,0,L,0 ^FD<txt>^FS
  field(x, y, fontH, text, opts = {}) {
    const { fbWidth, fbLines = 4, fbAlign = 'L' } = opts;
    let cmd = `^FO${x},${y}^A0N,${fontH},${fontH}`;
    if (fbWidth) cmd += `^FB${fbWidth},${fbLines},0,${fbAlign},0`;
    cmd += `^FD${safeZPLText(text)}^FS`;
    return this.raw(cmd);
  }
  bar(x, y, h, codigo) {
    return this.raw(
      `^FO${x},${y}^BY2,2,${h}^BCN,${h},Y,N,N^FD${safeZPLText(codigo)}^FS`,
    );
  }
  graphicLine(x, y, w, h) {
    return this.raw(`^FO${x},${y}^GB${w},${h},${h}^FS`);
  }
  toBytes() {
    const txt = this.parts.join('');
    return new TextEncoder().encode(txt);
  }
}

function header(formato) {
  return (
    '^XA' +
    `^PW${formato.widthDots}` +
    `^LL${formato.heightDots}` +
    '^LH0,0' +
    '^CI28' // UTF-8
  );
}

function generarCompleto(formato, d) {
  const m = 12; // margen lateral
  const usable = formato.widthDots - m * 2;
  const fT = formato.fontTitulo;
  const fN = formato.fontNormal;
  const fP = formato.fontPeq;
  const bcH = formato.barcodeHeight;

  const b = new ZPLBuilder();
  b.raw(header(formato));

  let y = 10;
  b.field(m, y, fT, d.empresaRazon, { fbWidth: usable, fbLines: 2, fbAlign: 'C' });
  y += fT * 2 + 6;
  if (d.empresaRuc) {
    b.field(m, y, fP, `RUC: ${d.empresaRuc}`, { fbWidth: usable, fbLines: 1, fbAlign: 'C' });
    y += fP + 2;
  }
  if (d.empresaDireccion) {
    b.field(m, y, fP, d.empresaDireccion, { fbWidth: usable, fbLines: 2, fbAlign: 'C' });
    y += fP * 2 + 2;
  }
  b.graphicLine(m, y, usable, 3); y += 12;

  b.field(m, y, fP, 'Codigo de Venta'); y += fP + 4;
  b.field(m, y, fN, d.codigo, { fbWidth: usable, fbLines: 2, fbAlign: 'L' });
  y += fN * 2 + 6;
  b.graphicLine(m, y, usable, 2); y += 10;

  b.field(m, y, fN, 'REMITENTE'); y += fN + 4;
  b.field(m, y, fP, `Nombre: ${d.remNombre}`, { fbWidth: usable, fbLines: 2 }); y += fP * 2 + 2;
  b.field(m, y, fP, `DNI: ${d.remDni}`); y += fP + 2;
  b.field(m, y, fP, `Tel: ${d.remTel}`); y += fP + 6;
  b.graphicLine(m, y, usable, 1); y += 8;

  b.field(m, y, fN, 'DESTINATARIO'); y += fN + 4;
  b.field(m, y, fP, `Nombre: ${d.destNombre}`, { fbWidth: usable, fbLines: 2 }); y += fP * 2 + 2;
  b.field(m, y, fP, `DNI: ${d.destDni}`); y += fP + 2;
  if (d.destRazon) {
    b.field(m, y, fP, `Razon: ${d.destRazon}`, { fbWidth: usable, fbLines: 2 });
    y += fP * 2 + 2;
  }
  if (d.destDoc) {
    b.field(m, y, fP, `Doc: ${d.destDoc}`); y += fP + 2;
  }
  b.field(m, y, fP, `Tel: ${d.destTel}`); y += fP + 2;
  if (d.destObs) {
    b.field(m, y, fP, `Obs: ${d.destObs}`, { fbWidth: usable, fbLines: 2 });
    y += fP * 2 + 2;
  }
  y += 4;
  b.graphicLine(m, y, usable, 1); y += 8;

  b.field(m, y, fN, 'DESTINO'); y += fN + 4;
  b.field(m, y, fP, `Dir: ${d.dirCompleta}`, { fbWidth: usable, fbLines: 3 }); y += fP * 3 + 2;
  if (d.depto.trim()) {
    b.field(m, y, fP, `Depto: ${d.depto.trim()}`, { fbWidth: usable, fbLines: 2 });
    y += fP * 2 + 2;
  }
  if (d.agencia) {
    b.field(m, y, fP, `Agencia: ${d.agencia}`, { fbWidth: usable, fbLines: 2 });
    y += fP * 2 + 2;
  }
  if (d.referencia) {
    b.field(m, y, fP, `Ref: ${d.referencia}`, { fbWidth: usable, fbLines: 2 });
    y += fP * 2 + 2;
  }
  y += 6;
  b.graphicLine(m, y, usable, 2); y += 10;

  b.field(m, y, fN, `Venta #${d.ventaId}`, { fbWidth: usable, fbLines: 1, fbAlign: 'C' });
  y += fN + 8;

  b.bar(m, y, bcH, d.codigoBarcode);

  b.raw('^XZ');
  return b.toBytes();
}

function generarReducido(formato, d) {
  const m = 8;
  const usable = formato.widthDots - m * 2;
  const fT = formato.fontTitulo;
  const fN = formato.fontNormal;
  const fP = formato.fontPeq;
  const bcH = formato.barcodeHeight;

  const b = new ZPLBuilder();
  b.raw(header(formato));

  let y = 4;
  b.field(m, y, fP, d.empresaRazon, { fbWidth: usable, fbLines: 1, fbAlign: 'C' });
  y += fP + 2;
  // En etiqueta reducida solo cabe el RUC junto a la razón social.
  if (d.empresaRuc) {
    b.field(m, y, fP, `RUC: ${d.empresaRuc}`, { fbWidth: usable, fbLines: 1, fbAlign: 'C' });
    y += fP + 2;
  }
  y += 2;

  b.field(m, y, fT, d.codigo, { fbWidth: usable, fbLines: 2 });
  y += fT * 2 + 4;

  b.field(m, y, fN, `Venta #${d.ventaId}`); y += fN + 6;

  b.bar(m, y, bcH, d.codigoBarcode);

  b.raw('^XZ');
  return b.toBytes();
}

function generarMinimo(formato, d) {
  const m = 4;
  const usable = formato.widthDots - m * 2;
  const fT = formato.fontTitulo;
  const bcH = formato.barcodeHeight;

  const b = new ZPLBuilder();
  b.raw(header(formato));

  let y = 4;
  b.field(m, y, fT, `#${d.ventaId}`, { fbWidth: usable, fbLines: 1, fbAlign: 'C' });
  y += fT + 6;

  b.bar(m, y, bcH, d.codigoBarcode);

  b.raw('^XZ');
  return b.toBytes();
}

export function generarRotuloVentaZPL(data, opts = {}) {
  const formato = resolverFormatoZPL(opts);
  const d = sanitizarRotuloVenta(data);

  switch (formato.layout) {
    case LAYOUT_MINIMO: return generarMinimo(formato, d);
    case LAYOUT_REDUCIDO: return generarReducido(formato, d);
    case LAYOUT_COMPLETO:
    default: return generarCompleto(formato, d);
  }
}
