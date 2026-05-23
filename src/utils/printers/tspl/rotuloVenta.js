import {
  LAYOUT_COMPLETO,
  LAYOUT_REDUCIDO,
  LAYOUT_MINIMO,
} from '../../../config/constants';
import { concatBytes } from '../shared/bytes';
import { canvasA1bppMSB, wrapTextoCanvas } from '../shared/canvas';
import { sanitizarRotuloVenta } from '../shared/sanitize';
import {
  TSPL_DENSITY,
  TSPL_SPEED,
  TSPL_DIRECTION,
  resolverFormatoTSPL,
} from './formatos';

/**
 * Layout COMPLETO — para 58c, 80c, 100×150, 100×100.
 * Header + código + remitente + destinatario + destino + venta#.
 * Devuelve la altura consumida en dots.
 */
function dibujarLayoutCompleto(ctx, d, widthDots, margenX) {
  const usableWidth = widthDots - margenX * 2;
  let y = 4;
  const linea = (alto = 2) => { ctx.fillRect(margenX, y, usableWidth, alto); y += alto + 4; };
  const escribir = (texto, alto) => {
    const lineas = wrapTextoCanvas(ctx, texto, usableWidth);
    for (const ln of lineas) { ctx.fillText(ln, margenX, y); y += alto; }
  };

  ctx.font = 'bold 30px sans-serif';
  const tituloW = ctx.measureText('RASEC S.A.C.').width;
  ctx.fillText('RASEC S.A.C.', (widthDots - tituloW) / 2, y);
  y += 36;
  linea(2);

  ctx.font = '18px sans-serif';
  escribir('Codigo de Venta', 22);
  ctx.font = 'bold 26px sans-serif';
  escribir(d.codigo, 32);
  linea(2);

  ctx.font = 'bold 20px sans-serif'; escribir('REMITENTE', 24);
  ctx.font = '18px sans-serif';
  escribir(`Nombre: ${d.remNombre}`, 22);
  escribir(`DNI:    ${d.remDni}`, 22);
  escribir(`Tel:    ${d.remTel}`, 22);
  linea(1);

  ctx.font = 'bold 20px sans-serif'; escribir('DESTINATARIO', 24);
  ctx.font = '18px sans-serif';
  escribir(`Nombre: ${d.destNombre}`, 22);
  escribir(`DNI:    ${d.destDni}`, 22);
  escribir(`Tel:    ${d.destTel}`, 22);
  linea(1);

  ctx.font = 'bold 20px sans-serif'; escribir('DESTINO', 24);
  ctx.font = '18px sans-serif';
  escribir(`Dir: ${d.dirCompleta}`, 22);
  if (d.depto.trim()) escribir(`Depto: ${d.depto.trim()}`, 22);
  if (d.agencia) {
    ctx.font = 'bold 18px sans-serif';
    escribir(`Agencia: ${d.agencia}`, 22);
    ctx.font = '18px sans-serif';
  }
  if (d.referencia) escribir(`Ref: ${d.referencia}`, 22);
  linea(2);

  ctx.font = 'bold 26px sans-serif';
  const ventaText = `Venta #${d.ventaId}`;
  const ventaW = ctx.measureText(ventaText).width;
  ctx.fillText(ventaText, (widthDots - ventaW) / 2, y);
  y += 32;
  return y + 4;
}

/**
 * Layout REDUCIDO — para 76×38, 60×40, 50×30.
 * Header chico + código + venta#. Los datos remitente/destinatario no caben.
 */
function dibujarLayoutReducido(ctx, d, widthDots, margenX) {
  const usableWidth = widthDots - margenX * 2;
  let y = 2;
  const escribir = (texto, alto) => {
    const lineas = wrapTextoCanvas(ctx, texto, usableWidth);
    for (const ln of lineas) { ctx.fillText(ln, margenX, y); y += alto; }
  };

  ctx.font = 'bold 18px sans-serif';
  const tw = ctx.measureText('RASEC S.A.C.').width;
  ctx.fillText('RASEC S.A.C.', (widthDots - tw) / 2, y);
  y += 22;

  ctx.font = 'bold 22px sans-serif';
  escribir(d.codigo, 26);

  ctx.font = '16px sans-serif';
  escribir(`Venta #${d.ventaId}`, 18);
  return y + 2;
}

/**
 * Layout MÍNIMO — para 50×25, 40×25, 32×25. Sólo venta# encima del barcode.
 */
function dibujarLayoutMinimo(ctx, d, widthDots) {
  let y = 2;
  ctx.font = 'bold 18px sans-serif';
  const ventaText = `#${d.ventaId}`;
  const ventaW = ctx.measureText(ventaText).width;
  ctx.fillText(ventaText, (widthDots - ventaW) / 2, y);
  y += 22;
  return y;
}

/**
 * Genera el rótulo de venta en TSPL.
 * El layout y dimensiones se derivan del formato elegido.
 */
export function generarRotuloVentaTSPL(data, opts = {}) {
  const formato = resolverFormatoTSPL(opts);
  const widthDots = formato.widthDots;
  const margenX = 8;

  const d = sanitizarRotuloVenta(data);

  const canvas = document.createElement('canvas');
  canvas.width = widthDots;
  canvas.height = formato.heightMm ? formato.heightMm * 8 : 2000;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'top';

  let bitmapHeight;
  switch (formato.layout) {
    case LAYOUT_MINIMO:
      bitmapHeight = dibujarLayoutMinimo(ctx, d, widthDots);
      break;
    case LAYOUT_REDUCIDO:
      bitmapHeight = dibujarLayoutReducido(ctx, d, widthDots, margenX);
      break;
    case LAYOUT_COMPLETO:
    default:
      bitmapHeight = dibujarLayoutCompleto(ctx, d, widthDots, margenX);
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
    `BARCODE ${barcodeX},${barcodeY},"128",${barcodeHeight},1,0,2,2,"${d.codigoBarcode}"\r\n` +
    'PRINT 1\r\n',
  );

  return concatBytes(headerCmd, bitmapHeader, bitmap, bitmapTail, tail);
}
