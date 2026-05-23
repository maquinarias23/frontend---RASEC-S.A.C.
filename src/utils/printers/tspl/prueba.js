import { concatBytes } from '../shared/bytes';
import { comandoBitmapTexto } from '../shared/canvas';
import {
  TSPL_DENSITY,
  TSPL_SPEED,
  TSPL_DIRECTION,
} from './formatos';

/**
 * Payload de prueba TSPL — emite tres primitivos gráficos para confirmar:
 *   - BAR (línea horizontal): cabezal calienta correctamente
 *   - BARCODE: motor nativo CODE128 responde
 *   - BITMAP rasterizado: pipeline canvas→bitmap funciona
 *
 * Probado en EX58C-4EE7 con DENSITY 10.
 */
export function generarPruebaTSPL() {
  const header = new TextEncoder().encode(
    'SIZE 58 mm,25 mm\r\n' +
    'GAP 0,0\r\n' +
    `DIRECTION ${TSPL_DIRECTION}\r\n` +
    'REFERENCE 0,0\r\n' +
    `DENSITY ${TSPL_DENSITY}\r\n` +
    `SPEED ${TSPL_SPEED}\r\n` +
    'OFFSET 0 mm\r\n' +
    'SET TEAR OFF\r\n' +
    'CLS\r\n' +
    'BAR 10,5,300,3\r\n' +
    'BARCODE 20,20,"128",50,1,0,2,2,"RSK-TEST"\r\n' +
    'BAR 10,110,300,3\r\n',
  );
  const bitmapTexto = comandoBitmapTexto('RASEC TSPL OK', 10, 125, 24);
  const print = new TextEncoder().encode('PRINT 1\r\n');
  return concatBytes(header, bitmapTexto, print);
}
