/**
 * Encoder ESC/POS ligero — 100% browser, cero dependencias de Node.js.
 *
 * Genera Uint8Array con comandos ESC/POS para impresoras térmicas POS de
 * ticket. Compatible con Epson, Bixolon, Xprinter, Goojprt, MHT, Munbyn,
 * 3nStar, Phomemo (M02), Pos-D PR82, etc.
 *
 * Referencia: https://reference.epson-biz.com/modules/ref_escpos/
 */

import { ESCPOS_CODEPAGE_WPC1252 } from '../../../config/constants';

const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

const ALIGN = { LEFT: 0x00, CENTER: 0x01, RIGHT: 0x02 };

const SIZE_NORMAL = 0x00;
const SIZE_DOUBLE_WIDTH = 0x10;
const SIZE_DOUBLE_HEIGHT = 0x01;
const SIZE_DOUBLE = 0x11;

// Mapeo manual de caracteres Unicode frecuentes en español a sus bytes
// equivalentes en WPC1252 (Windows-1252 / Latin-1). Evita que acentos y Ñ
// lleguen a la impresora como '?' y provoquen rechazo del job.
const WPC1252_MAP = {
  'Á': 0xC1, 'É': 0xC9, 'Í': 0xCD, 'Ó': 0xD3, 'Ú': 0xDA,
  'á': 0xE1, 'é': 0xE9, 'í': 0xED, 'ó': 0xF3, 'ú': 0xFA,
  'Ñ': 0xD1, 'ñ': 0xF1,
  'Ü': 0xDC, 'ü': 0xFC,
  '°': 0xB0, '¿': 0xBF, '¡': 0xA1,
  '€': 0x80, 'º': 0xBA, 'ª': 0xAA,
};

export default class ESCPOSEncoder {
  constructor(codepage = ESCPOS_CODEPAGE_WPC1252) {
    this._buffer = [];
    this._write([ESC, 0x40]);           // ESC @  → reset
    this._write([ESC, 0x74, codepage]); // ESC t n → seleccionar code page
  }

  /** Texto a bytes respetando el code page WPC1252 para caracteres en español */
  _textToBytes(text) {
    const bytes = [];
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const mapped = WPC1252_MAP[ch];
      if (mapped !== undefined) {
        bytes.push(mapped);
        continue;
      }
      const code = text.charCodeAt(i);
      if (code <= 0x7E || (code >= 0xA0 && code <= 0xFF)) {
        bytes.push(code);
      } else {
        bytes.push(0x3F); // '?' para caracteres fuera de rango
      }
    }
    return bytes;
  }

  _write(bytes) {
    this._buffer.push(...bytes);
    return this;
  }

  /** Establecer alineación: 'left' | 'center' | 'right' */
  align(alignment) {
    const map = { left: ALIGN.LEFT, center: ALIGN.CENTER, right: ALIGN.RIGHT };
    this._write([ESC, 0x61, map[alignment] || ALIGN.LEFT]);
    return this;
  }

  /** Activar/desactivar negrita */
  bold(on = true) {
    this._write([ESC, 0x45, on ? 0x01 : 0x00]);
    return this;
  }

  /** Activar/desactivar subrayado */
  underline(on = true) {
    this._write([ESC, 0x2D, on ? 0x01 : 0x00]);
    return this;
  }

  /** Tamaño de texto: 'normal' | 'double-width' | 'double-height' | 'double' */
  size(s) {
    const map = {
      'normal': SIZE_NORMAL,
      'double-width': SIZE_DOUBLE_WIDTH,
      'double-height': SIZE_DOUBLE_HEIGHT,
      'double': SIZE_DOUBLE,
    };
    this._write([GS, 0x21, map[s] || SIZE_NORMAL]);
    return this;
  }

  /** Imprimir texto y salto de línea */
  text(str) {
    this._write(this._textToBytes(str));
    this._write([LF]);
    return this;
  }

  /** Imprimir texto sin salto de línea */
  textInline(str) {
    this._write(this._textToBytes(str));
    return this;
  }

  /** Línea separadora */
  line(char = '-', width = 42) {
    this.text(char.repeat(width));
    return this;
  }

  /** Líneas vacías */
  feed(lines = 1) {
    for (let i = 0; i < lines; i++) {
      this._write([LF]);
    }
    return this;
  }

  /**
   * Barcode CODE128.
   * Prefija automáticamente el selector de code set "{B" si el contenido no
   * lo incluye. Firmware estricto (Epson) aborta el job sin selector.
   */
  barcode(content, opts = {}) {
    const { height = 80, width = 2, hri = 'below' } = opts;

    const hriMap = { none: 0, above: 1, below: 2, both: 3 };
    this._write([GS, 0x48, hriMap[hri] ?? 2]);
    this._write([GS, 0x68, height]);
    this._write([GS, 0x77, width]);

    const hasCodeSet =
      content.length >= 2 &&
      content[0] === '{' &&
      ['A', 'B', 'C'].includes(content[1]);
    const finalContent = hasCodeSet ? content : `{B${content}`;

    const safeContent = finalContent.length > 72 ? finalContent.substring(0, 72) : finalContent;

    const bytes = this._textToBytes(safeContent);
    this._write([GS, 0x6B, 73, bytes.length, ...bytes]);

    this._write([LF]);
    return this;
  }

  /** Cortar papel (full cut). Impresoras sin cortador ignoran GS V 0. */
  cut() {
    this.feed(4);
    this._write([GS, 0x56, 0x00]);
    return this;
  }

  /** Cortar papel (partial cut) */
  partialCut() {
    this.feed(4);
    this._write([GS, 0x56, 0x01]);
    return this;
  }

  /** Avance final sin corte, para impresoras portátiles sin cortador */
  feedOnly(lines = 5) {
    this.feed(lines);
    return this;
  }

  /** Obtener los datos como Uint8Array */
  encode() {
    return new Uint8Array(this._buffer);
  }
}
