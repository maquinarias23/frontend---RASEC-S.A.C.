// =============================================================================
// Helper client-side para verificar cobertura de asignación de unidades.
// Usado por Despacho, EscanerSalida y Entregas para deshabilitar acciones
// cuando la venta está incompleta y mostrar chips de estado.
//
// Espera recibir una venta con items_venta y, dentro de cada item,
// asignaciones_unidad (array). Si el include no las trae, asume 0 asignadas.
//
// NOTA: Los items cuyas unidades provienen de compra externa_envio ya están
// registrados en asignaciones_unidad (según diagnóstico Agent 08). No se
// necesita lógica extra — basta con contar filas por item.
// =============================================================================

export function calcularCobertura(venta) {
  const items = venta?.items_venta || [];
  let totalRequerido = 0;
  let totalAsignado = 0;
  const faltantes = [];

  for (const item of items) {
    const requeridos = item.cantidad || 0;
    const asignados = (item.asignaciones_unidad?.length) || 0;
    totalRequerido += requeridos;
    totalAsignado += asignados;

    if (asignados < requeridos) {
      faltantes.push({
        item_venta_id: item.id,
        producto_nombre: item.tbl_productos?.nombre || `Producto #${item.product_id}`,
        requeridos,
        asignados,
        faltan: requeridos - asignados,
      });
    }
  }

  return {
    completa: faltantes.length === 0,
    totalRequerido,
    totalAsignado,
    faltantes,
  };
}

// Formato compacto: "Cable HDMI (1/2), Control (0/1)"
export function formatearFaltantesCorto(cobertura) {
  if (!cobertura || !Array.isArray(cobertura.faltantes)) return '';
  return cobertura.faltantes
    .map((f) => `${f.producto_nombre} (${f.asignados}/${f.requeridos})`)
    .join(', ');
}
