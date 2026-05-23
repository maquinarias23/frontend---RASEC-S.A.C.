import { TELEFONO_INPUT } from '../../../config/constants';

/**
 * Sanitiza el contenido del código de barras a ASCII imprimible (32-126).
 * CODE128 code set B sólo soporta ese rango.
 */
export function sanitizarBarcode(codigo) {
  if (!codigo) return '';
  let out = '';
  for (const ch of String(codigo)) {
    const code = ch.charCodeAt(0);
    out += code >= 32 && code <= 126 ? ch : '-';
  }
  return out;
}

/**
 * Sanitiza datos del rótulo de venta a primitivos string seguros para Canvas
 * y comandos de impresión. Compartido por todos los drivers (TSPL/ESC-POS/ZPL/
 * PPLB-EZPL) — la salida es estructuralmente idéntica.
 */
export function sanitizarRotuloVenta(data) {
  return {
    codigo: data.codigo || '-',
    codigoBarcode: sanitizarBarcode(data.codigo || ''),
    ventaId: data.ventaId ?? '-',
    remNombre: data.remitente_nombre || '-',
    remDni: data.remitente_dni || '-',
    remTel: TELEFONO_INPUT.format(data.remitente_telefono) || '-',
    destNombre: data.destinatario_nombre || '-',
    destDni: data.destinatario_dni || '-',
    destTel: TELEFONO_INPUT.format(data.destinatario_telefono) || '-',
    dirCompleta:
      (data.direccion_manual || data.direccion || '-') +
      (data.distrito ? `, ${data.distrito}` : ''),
    depto: (data.departamento || '') + (data.provincia ? ` - ${data.provincia}` : ''),
    agencia: data.agencia_shalom || '',
    referencia: data.referencia || '',
  };
}

/**
 * Construye la lista de etiquetas a imprimir a partir de una compra/importación.
 * Una etiqueta por cada unidad física registrada (no por cantidad de items).
 * Compartido por todos los drivers (las etiquetas tienen el mismo shape).
 */
export function construirEtiquetasProducto(compra) {
  const items = compra?.items || [];
  const unidades = compra?.unidades_producto || [];
  if (items.length === 0 || unidades.length === 0) return [];

  const unidadesPorProducto = {};
  for (const u of unidades) {
    if (!unidadesPorProducto[u.product_id]) unidadesPorProducto[u.product_id] = [];
    unidadesPorProducto[u.product_id].push(u);
  }

  const etiquetas = [];
  for (const item of items) {
    const nombre = item.tbl_productos?.nombre || `Producto #${item.product_id}`;
    const categoria = item.tbl_productos?.tbl_categorias_producto?.nombre || '';
    const unidadesItem = unidadesPorProducto[item.product_id] || [];
    for (const u of unidadesItem) {
      etiquetas.push({
        nombre,
        categoria,
        serial: u.serial || '-',
        codigoBarras: sanitizarBarcode(u.codigo_barras || u.serial || ''),
      });
    }
  }
  return etiquetas;
}
