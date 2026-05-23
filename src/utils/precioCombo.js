import { TIPO_DESCUENTO_COMBO } from '../config/constants';

/**
 * Calcula el precio final de un producto con descuento aplicado.
 * Reutilizado en CombosVendedor, CombosSuperAdmin y LandingPage.
 */
export function calcularPrecioCombo(precioOriginal, tipoDescuento, valorDescuento) {
  const precio = parseFloat(precioOriginal);
  const descuento = parseFloat(valorDescuento);
  if (!tipoDescuento || !descuento || descuento <= 0) return precio;
  if (tipoDescuento === TIPO_DESCUENTO_COMBO.PORCENTAJE) return precio * (1 - descuento / 100);
  return precio - descuento;
}

/**
 * Calcula el total estimado de un combo sumando los precios finales de los items.
 * Items de regalo no se suman al total.
 */
export function calcularTotalCombo(items) {
  if (!items || items.length === 0) return 0;
  return items.reduce((acc, item) => {
    if (item.es_regalo) return acc;
    const precio = parseFloat(item.tbl_productos?.precio_catalogo || item.tbl_productos?.precio_venta_base || 0);
    const precioFinal = calcularPrecioCombo(precio, item.tipo_descuento, item.valor_descuento);
    return acc + precioFinal * (item.cantidad || 1);
  }, 0);
}
