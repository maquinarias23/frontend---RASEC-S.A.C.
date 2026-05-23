import { PROTOCOLO_ESCPOS, PROTOCOLOS_DISPONIBLES } from '../../../config/constants';
import { ESCPOS_FORMATOS, ESCPOS_FORMATO_DEFAULT_ID } from './formatos';
import { generarRotuloVentaESCPOS } from './rotuloVenta';
import { generarRotulosProductosESCPOS } from './rotuloProducto';
import { generarPruebaESCPOS } from './prueba';

const meta = PROTOCOLOS_DISPONIBLES.find((p) => p.id === PROTOCOLO_ESCPOS);

const driverESCPOS = {
  id: PROTOCOLO_ESCPOS,
  label: meta?.label || 'ESC/POS',
  formatos: ESCPOS_FORMATOS,
  formatoDefaultId: ESCPOS_FORMATO_DEFAULT_ID,
  generarRotuloVenta: (data, opts) => generarRotuloVentaESCPOS(data, opts),
  generarRotulosProductos: (compra, opts) => generarRotulosProductosESCPOS(compra, opts),
  generarPrueba: () => generarPruebaESCPOS(),
};

export default driverESCPOS;
