import { concatBytes } from './bytes';

/**
 * Wrap word-aware: divide texto en líneas que entran en `maxWidth` pixels
 * usando la fuente actual del contexto. Si una palabra sola excede el ancho,
 * la parte por carácter para no perder contenido.
 */
export function wrapTextoCanvas(ctx, texto, maxWidth) {
  const palabras = String(texto).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return [''];
  const lineas = [];
  let actual = '';
  for (const p of palabras) {
    const propuesta = actual ? `${actual} ${p}` : p;
    if (ctx.measureText(propuesta).width <= maxWidth) {
      actual = propuesta;
      continue;
    }
    if (actual) lineas.push(actual);
    if (ctx.measureText(p).width > maxWidth) {
      let resto = p;
      while (ctx.measureText(resto).width > maxWidth) {
        let i = 1;
        while (i < resto.length && ctx.measureText(resto.slice(0, i + 1)).width <= maxWidth) i++;
        lineas.push(resto.slice(0, i));
        resto = resto.slice(i);
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
 * Convierte un canvas RGBA a Uint8Array 1bpp, **MSB-first byte-aligned por
 * fila**, con bit=1 en pixel claro y bit=0 en pixel oscuro (formato esperado
 * por TSPL BITMAP y PPLB BITMAP, equivalente al "white as 1" de TSC).
 *
 * Para drivers que esperan la convención inversa (ESC/POS GS v 0, ZPL ^GFA,
 * Brother raster), envolvé esta función con un XOR sobre el array final.
 */
export function canvasA1bppMSB(canvas, w, h, { invertido = false } = {}) {
  const ctx = canvas.getContext('2d');
  const img = ctx.getImageData(0, 0, w, h);
  const widthBytes = Math.ceil(w / 8);
  const fill = invertido ? 0x00 : 0xFF;
  const bitmap = new Uint8Array(widthBytes * h).fill(fill);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 4;
      const luma = (img.data[i] + img.data[i + 1] + img.data[i + 2]) / 3;
      const oscuro = luma < 128;
      const byteIdx = py * widthBytes + (px >> 3);
      const bitIdx = 7 - (px & 7);
      if (invertido) {
        if (oscuro) bitmap[byteIdx] |= 1 << bitIdx;
      } else {
        if (oscuro) bitmap[byteIdx] &= ~(1 << bitIdx);
      }
    }
  }
  return { bitmap, widthBytes };
}

/**
 * Renderiza una línea de texto en un canvas off-screen y devuelve el bitmap
 * 1bpp listo para concatenar a un comando BITMAP (TSPL/PPLB).
 *
 * @param {string} texto
 * @param {number} fontSize  tamaño en pixeles
 * @param {Object} opts  { bold, fontFamily, invertido }
 * @returns {{ bitmap: Uint8Array, widthBytes: number, w: number, h: number }}
 */
export function rasterizarTexto(texto, fontSize = 24, opts = {}) {
  const { bold = true, fontFamily = 'monospace', invertido = false } = opts;
  const fuente = `${bold ? 'bold ' : ''}${fontSize}px ${fontFamily}`;

  const canvas = document.createElement('canvas');
  let ctx = canvas.getContext('2d');
  ctx.font = fuente;
  const metrics = ctx.measureText(texto);
  const w = Math.max(1, Math.ceil(metrics.width) + 4);
  const h = Math.ceil(fontSize * 1.3);

  canvas.width = w;
  canvas.height = h;
  ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#000000';
  ctx.font = fuente;
  ctx.textBaseline = 'top';
  ctx.fillText(texto, 2, 2);

  const { bitmap, widthBytes } = canvasA1bppMSB(canvas, w, h, { invertido });
  return { bitmap, widthBytes, w, h };
}

/**
 * Helper TSPL/PPLB: construye una línea BITMAP completa con sus bytes binarios.
 * Devuelve los bytes listos para concatenar al payload.
 *
 * Estructura emitida (común a TSPL y PPLB compatible):
 *   BITMAP x,y,widthBytes,height,mode,<binary data>\r\n
 *
 * @param {string} texto
 * @param {number} x  posición X (dots)
 * @param {number} y  posición Y (dots)
 * @param {number} fontSize
 * @param {Object} opts  { bold, fontFamily }
 * @returns {Uint8Array}
 */
export function comandoBitmapTexto(texto, x, y, fontSize = 24, opts = {}) {
  const { bitmap, widthBytes, h } = rasterizarTexto(texto, fontSize, opts);
  const header = new TextEncoder().encode(
    `BITMAP ${x},${y},${widthBytes},${h},0,`,
  );
  const tail = new TextEncoder().encode('\r\n');
  return concatBytes(header, bitmap, tail);
}
