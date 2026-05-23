import { PROTOCOLO_ZPL, PROTOCOLOS_DISPONIBLES } from '../../../config/constants';
import { ZPL_FORMATOS, ZPL_FORMATO_DEFAULT_ID } from './formatos';
import { generarRotuloVentaZPL } from './rotuloVenta';
import { generarRotulosProductosZPL } from './rotuloProducto';
import { generarPruebaZPL } from './prueba';

const meta = PROTOCOLOS_DISPONIBLES.find((p) => p.id === PROTOCOLO_ZPL);

const driverZPL = {
  id: PROTOCOLO_ZPL,
  label: meta?.label || 'ZPL',
  formatos: ZPL_FORMATOS,
  formatoDefaultId: ZPL_FORMATO_DEFAULT_ID,
  generarRotuloVenta: (data, opts) => generarRotuloVentaZPL(data, opts),
  generarRotulosProductos: (compra, opts) => generarRotulosProductosZPL(compra, opts),
  generarPrueba: () => generarPruebaZPL(),
};

export default driverZPL;
