import {
  PROTOCOLO_DEFAULT_ID,
  PROTOCOLOS_DISPONIBLES,
  PROTOCOLO_TSPL,
  PROTOCOLO_ESCPOS,
  PROTOCOLO_ZPL,
  PROTOCOLO_PPLB_EZPL,
} from '../../config/constants';
import driverTSPL from './tspl';
import driverESCPOS from './escpos';
import driverZPL from './zpl';
import driverPPLB from './pplb-ezpl';
import { detectarProtocoloPorNombre, esProtocoloValido } from './detect';

/**
 * Registro central de drivers de impresión.
 * Cada driver expone la misma interfaz:
 *   {
 *     id, label, formatos, formatoDefaultId,
 *     generarRotuloVenta(data, { formato }),
 *     generarRotulosProductos(compra, { formato }) -> { data, count },
 *     generarPrueba(),
 *   }
 */
const REGISTRY = {
  [PROTOCOLO_TSPL]: driverTSPL,
  [PROTOCOLO_ESCPOS]: driverESCPOS,
  [PROTOCOLO_ZPL]: driverZPL,
  [PROTOCOLO_PPLB_EZPL]: driverPPLB,
};

/**
 * Devuelve el driver correspondiente al id de protocolo. Si el id es
 * inválido o no está registrado, cae al default global (TSPL).
 */
export function getDriver(protocoloId) {
  if (esProtocoloValido(protocoloId) && REGISTRY[protocoloId]) {
    return REGISTRY[protocoloId];
  }
  return REGISTRY[PROTOCOLO_DEFAULT_ID];
}

/**
 * Catálogo público de protocolos (id + label). Útil para selectores en UI.
 */
export const PROTOCOLOS = PROTOCOLOS_DISPONIBLES;

export { detectarProtocoloPorNombre, esProtocoloValido };
