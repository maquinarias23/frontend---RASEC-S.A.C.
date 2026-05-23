import {
  LAYOUT_COMPLETO,
  LAYOUT_REDUCIDO,
  LAYOUT_MINIMO,
} from '../../../config/constants';
import { concatBytes } from '../shared/bytes';
import { canvasA1bppMSB, wrapTextoCanvas } from '../shared/canvas';
import { construirEtiquetasProducto } from '../shared/sanitize';
import {
  TSPL_DENSITY,
  TSPL_SPEED,
  TSPL_DIRECTION,
  resolverFormatoTSPL,
} from './formatos';

const NOMBRE_EMPRESA = 'Maquinarias RASEC S.A.C.';

function dibujarEtiquetaProductoCompleto(ctx, e, widthDots, margenX) {
  const usableWidth = widthDots - margenX * 2;
  let y = 4;
  const escribir = (texto, alto) => {
    const lineas = wrapTextoCanvas(ctx, texto, usableWidth);
    for (const ln of lineas) { ctx.fillText(ln, margenX, y); y += alto; }
  };

  ctx.font = 'bold 18px sans-serif';
  const ew = ctx.measureText(NOMBRE_EMPRESA).width;
  ctx.fillText(NOMBRE_EMPRESA, (widthDots - ew) / 2, y);
  y += 22;
  ctx.fillRect(margenX, y, usableWidth, 1);
  y += 6;

  ctx.font = 'bold 24px sans-serif';
  escribir(e.nombre, 28);

  if (e.categoria) {
    ctx.font = '16px sans-serif';
    escribir(e.categoria, 20);
  }

  ctx.font = 'bold 18px sans-serif';
  escribir(`SN: ${e.serial}`, 22);
  return y + 4;
}

function dibujarEtiquetaProductoReducido(ctx, e, widthDots, margenX) {
  const usableWidth = widthDots - margenX * 2;
  let y = 2;
  const escribir = (texto, alto) => {
    const lineas = wrapTextoCanvas(ctx, texto, usableWidth);
    for (const ln of lineas) { ctx.fillText(ln, margenX, y); y += alto; }
  };

  ctx.font = 'bold 18px sans-serif';
  escribir(e.nombre, 22);
  ctx.font = '14px sans-serif';
  escribir(`SN: ${e.serial}`, 18);
  return y + 2;
}

function dibujarEtiquetaProductoMinimo(ctx, e, widthDots) {
  let y = 2;
  ctx.font = 'bold 16px sans-serif';
  const t = `SN ${e.serial}`;
  const tw = ctx.measureText(t).width;
  ctx.fillText(t, (widthDots - tw) / 2, y);
  y += 20;
  return y;
}

function generarUnRotuloProductoTSPL(etiqueta, formato) {
  const widthDots = formato.widthDots;
  const margenX = 8;

  const canvas = document.createElement('canvas');
  canvas.width = widthDots;
  canvas.height = formato.heightMm ? formato.heightMm * 8 : 800;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'top';

  let bitmapHeight;
  switch (formato.layout) {
    case LAYOUT_MINIMO:
      bitmapHeight = dibujarEtiquetaProductoMinimo(ctx, etiqueta, widthDots);
      break;
    case LAYOUT_REDUCIDO:
      bitmapHeight = dibujarEtiquetaProductoReducido(ctx, etiqueta, widthDots, margenX);
      break;
    case LAYOUT_COMPLETO:
    default:
      bitmapHeight = dibujarEtiquetaProductoCompleto(ctx, etiqueta, widthDots, margenX);
      break;
  }

  const { bitmap, widthBytes } = canvasA1bppMSB(canvas, widthDots, bitmapHeight);

  const barcodeHeight = formato.layout === LAYOUT_MINIMO
    ? 50
    : formato.layout === LAYOUT_REDUCIDO ? 60 : 70;
  const hriHeight = formato.layout === LAYOUT_MINIMO ? 18 : 24;
  const barcodeY = bitmapHeight + 4;
  const barcodeX = margenX;

  const totalDotsContent = barcodeY + barcodeHeight + hriHeight + 4;
  const sizeHeightMm = formato.heightMm
    ? formato.heightMm
    : Math.ceil(totalDotsContent / 8);

  const codigoBarras = etiqueta.codigoBarras || etiqueta.serial;

  const headerCmd = new TextEncoder().encode(
    `SIZE ${formato.widthMm} mm,${sizeHeightMm} mm\r\n` +
    `GAP ${formato.gap}\r\n` +
    `DIRECTION ${TSPL_DIRECTION}\r\n` +
    'REFERENCE 0,0\r\n' +
    `DENSITY ${formato.density ?? TSPL_DENSITY}\r\n` +
    `SPEED ${formato.speed ?? TSPL_SPEED}\r\n` +
    'OFFSET 0 mm\r\n' +
    'SET TEAR OFF\r\n' +
    'CLS\r\n',
  );
  const bitmapHeader = new TextEncoder().encode(
    `BITMAP 0,0,${widthBytes},${bitmapHeight},0,`,
  );
  const bitmapTail = new TextEncoder().encode('\r\n');
  const tail = new TextEncoder().encode(
    `BARCODE ${barcodeX},${barcodeY},"128",${barcodeHeight},1,0,2,2,"${codigoBarras}"\r\n` +
    'PRINT 1\r\n',
  );
  return concatBytes(headerCmd, bitmapHeader, bitmap, bitmapTail, tail);
}

/**
 * Genera el payload TSPL para imprimir TODAS las etiquetas de una compra o
 * importación. Una etiqueta por unidad física registrada.
 */
export function generarRotulosProductosTSPL(compra, opts = {}) {
  const formato = resolverFormatoTSPL(opts);
  const etiquetas = construirEtiquetasProducto(compra);
  if (etiquetas.length === 0) {
    return { data: new Uint8Array(), count: 0 };
  }
  const partes = etiquetas.map((e) => generarUnRotuloProductoTSPL(e, formato));
  return { data: concatBytes(...partes), count: etiquetas.length };
}
