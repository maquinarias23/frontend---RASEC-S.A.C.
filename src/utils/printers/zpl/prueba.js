/**
 * Payload de prueba ZPL — etiqueta 50×25 mm @ 203 dpi.
 * Compatible con Zebra ZD220 / ZD230 / GK420 / ZD500.
 */
export function generarPruebaZPL() {
  const cmd =
    '^XA' +
    '^PW400' +
    '^LL200' +
    '^LH0,0' +
    '^CI28' +
    '^FO20,20^A0N,40,40^FB360,1,0,C,0^FDRASEC ZPL OK^FS' +
    '^FO20,80^BY2,2,60^BCN,60,Y,N,N^FDRSK-TEST^FS' +
    '^XZ';
  return new TextEncoder().encode(cmd);
}
