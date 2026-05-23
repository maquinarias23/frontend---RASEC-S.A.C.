import { PROTOCOLO_PPLB_EZPL, PROTOCOLOS_DISPONIBLES } from '../../../config/constants';
import { PPLB_FORMATOS, PPLB_FORMATO_DEFAULT_ID } from './formatos';
import { generarRotuloVentaTSPL } from '../tspl/rotuloVenta';
import { generarRotulosProductosTSPL } from '../tspl/rotuloProducto';
import { generarPruebaTSPL } from '../tspl/prueba';

const meta = PROTOCOLOS_DISPONIBLES.find((p) => p.id === PROTOCOLO_PPLB_EZPL);

/**
 * Driver PPLB / EZPL.
 *
 * Argox (PPLB) y Godex (EZPL) son derivaciones cercanas de TSPL — sus
 * firmwares modernos aceptan el mismo subset de comandos (SIZE, GAP, BITMAP,
 * BARCODE, PRINT). Por eso reusamos el pipeline del driver TSPL en lugar de
 * duplicar lógica. Si una variación específica falla en el campo, este
 * archivo es el punto de divergencia.
 */
const driverPPLB = {
  id: PROTOCOLO_PPLB_EZPL,
  label: meta?.label || 'PPLB / EZPL',
  formatos: PPLB_FORMATOS,
  formatoDefaultId: PPLB_FORMATO_DEFAULT_ID,
  generarRotuloVenta: (data, opts) => generarRotuloVentaTSPL(data, opts),
  generarRotulosProductos: (compra, opts) => generarRotulosProductosTSPL(compra, opts),
  generarPrueba: () => generarPruebaTSPL(),
};

export default driverPPLB;
