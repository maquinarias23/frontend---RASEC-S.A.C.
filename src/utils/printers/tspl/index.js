import { PROTOCOLO_TSPL, PROTOCOLOS_DISPONIBLES } from '../../../config/constants';
import { TSPL_FORMATOS, TSPL_FORMATO_DEFAULT_ID } from './formatos';
import { generarRotuloVentaTSPL } from './rotuloVenta';
import { generarRotulosProductosTSPL } from './rotuloProducto';
import { generarPruebaTSPL } from './prueba';

const meta = PROTOCOLOS_DISPONIBLES.find((p) => p.id === PROTOCOLO_TSPL);

const driverTSPL = {
  id: PROTOCOLO_TSPL,
  label: meta?.label || 'TSPL',
  formatos: TSPL_FORMATOS,
  formatoDefaultId: TSPL_FORMATO_DEFAULT_ID,
  generarRotuloVenta: (data, opts) => generarRotuloVentaTSPL(data, opts),
  generarRotulosProductos: (compra, opts) => generarRotulosProductosTSPL(compra, opts),
  generarPrueba: () => generarPruebaTSPL(),
};

export default driverTSPL;
