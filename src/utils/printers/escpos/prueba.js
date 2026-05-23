import ESCPOSEncoder from './encoder';

/**
 * Payload de prueba ESC/POS — texto, barcode y feed.
 * Compatible con todas las impresoras ESC/POS POS (Epson, Bixolon, Xprinter,
 * Goojprt, MHT, Munbyn, 3nStar, Phomemo, Pos-D PR82).
 */
export function generarPruebaESCPOS() {
  const enc = new ESCPOSEncoder();
  enc.align('center').size('double').bold(true).text('RASEC ESC/POS OK');
  enc.size('normal').bold(false);
  enc.feed(1);
  enc.line('=', 32);
  enc.text('Prueba de impresion BLE');
  enc.line('=', 32);
  enc.feed(1);
  enc.barcode('RSK-TEST', { height: 60, width: 2, hri: 'below' });
  enc.feedOnly(4);
  return enc.encode();
}
