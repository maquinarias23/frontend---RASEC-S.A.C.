import {
  LAYOUT_COMPLETO,
  LAYOUT_REDUCIDO,
  LAYOUT_MINIMO,
} from '../../../config/constants';
import { concatBytes } from '../shared/bytes';
import { construirEtiquetasProducto } from '../shared/sanitize';
import { resolverFormatoZPL } from './formatos';

const NOMBRE_EMPRESA = 'Maquinarias RASEC S.A.C.';

function safeZPLText(str) {
  return String(str ?? '').replace(/\^/g, '/').replace(/~/g, '-');
}

function header(formato) {
  return (
    '^XA' +
    `^PW${formato.widthDots}` +
    `^LL${formato.heightDots}` +
    '^LH0,0' +
    '^CI28'
  );
}

function field(x, y, fontH, text, opts = {}) {
  const { fbWidth, fbLines = 4, fbAlign = 'L' } = opts;
  let cmd = `^FO${x},${y}^A0N,${fontH},${fontH}`;
  if (fbWidth) cmd += `^FB${fbWidth},${fbLines},0,${fbAlign},0`;
  cmd += `^FD${safeZPLText(text)}^FS`;
  return cmd;
}

function bar(x, y, h, codigo) {
  return `^FO${x},${y}^BY2,2,${h}^BCN,${h},Y,N,N^FD${safeZPLText(codigo)}^FS`;
}

function graphicLine(x, y, w, h) {
  return `^FO${x},${y}^GB${w},${h},${h}^FS`;
}

function generarCompleto(formato, e) {
  const m = 12;
  const usable = formato.widthDots - m * 2;
  const fT = formato.fontTitulo;
  const fN = formato.fontNormal;
  const fP = formato.fontPeq;
  const bcH = formato.barcodeHeight;

  let cmd = header(formato);
  let y = 8;
  cmd += field(m, y, fP, NOMBRE_EMPRESA, { fbWidth: usable, fbLines: 1, fbAlign: 'C' });
  y += fP + 4;
  cmd += graphicLine(m, y, usable, 2); y += 8;

  cmd += field(m, y, fT, e.nombre, { fbWidth: usable, fbLines: 3 });
  y += fT * 2 + 6;

  if (e.categoria) {
    cmd += field(m, y, fP, e.categoria, { fbWidth: usable, fbLines: 2 });
    y += fP * 2 + 4;
  }

  cmd += field(m, y, fN, `SN: ${e.serial}`, { fbWidth: usable, fbLines: 1 });
  y += fN + 8;

  cmd += bar(m, y, bcH, e.codigoBarras || e.serial);

  cmd += '^XZ';
  return new TextEncoder().encode(cmd);
}

function generarReducido(formato, e) {
  const m = 8;
  const usable = formato.widthDots - m * 2;
  const fN = formato.fontNormal;
  const fP = formato.fontPeq;
  const bcH = formato.barcodeHeight;

  let cmd = header(formato);
  let y = 4;
  cmd += field(m, y, fN, e.nombre, { fbWidth: usable, fbLines: 2 });
  y += fN * 2 + 4;
  cmd += field(m, y, fP, `SN: ${e.serial}`, { fbWidth: usable, fbLines: 1 });
  y += fP + 6;
  cmd += bar(m, y, bcH, e.codigoBarras || e.serial);
  cmd += '^XZ';
  return new TextEncoder().encode(cmd);
}

function generarMinimo(formato, e) {
  const m = 4;
  const usable = formato.widthDots - m * 2;
  const fN = formato.fontNormal;
  const bcH = formato.barcodeHeight;

  let cmd = header(formato);
  let y = 4;
  cmd += field(m, y, fN, `SN ${e.serial}`, { fbWidth: usable, fbLines: 1, fbAlign: 'C' });
  y += fN + 6;
  cmd += bar(m, y, bcH, e.codigoBarras || e.serial);
  cmd += '^XZ';
  return new TextEncoder().encode(cmd);
}

function generarUna(formato, e) {
  switch (formato.layout) {
    case LAYOUT_MINIMO: return generarMinimo(formato, e);
    case LAYOUT_REDUCIDO: return generarReducido(formato, e);
    case LAYOUT_COMPLETO:
    default: return generarCompleto(formato, e);
  }
}

export function generarRotulosProductosZPL(compra, opts = {}) {
  const formato = resolverFormatoZPL(opts);
  const etiquetas = construirEtiquetasProducto(compra);
  if (etiquetas.length === 0) {
    return { data: new Uint8Array(), count: 0 };
  }
  const partes = etiquetas.map((e) => generarUna(formato, e));
  return { data: concatBytes(...partes), count: etiquetas.length };
}
