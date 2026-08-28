// ---------------------------------------------------------------------------
// Estado de facturación de una venta.
//
// Vive fuera del componente BadgeFacturacion porque también lo usan el buscador
// y el filtro del listado, y porque un archivo de componentes no debe exportar
// funciones sueltas (rompe el fast refresh de Vite).
// ---------------------------------------------------------------------------

/**
 * Comprobante vigente de una venta: el primero no anulado.
 * Devuelve null si la venta no tiene comprobantes o si todos fueron anulados
 * —una venta cuya única factura se anuló NO está facturada.
 */
export function comprobanteVigente(venta) {
  const lista = venta?.comprobantes || [];
  if (lista.length === 0) return null;
  return lista.find((c) => !c.anulado) || null;
}

/** true si la venta cuenta como facturada. */
export function estaFacturada(venta) {
  return comprobanteVigente(venta) !== null;
}
