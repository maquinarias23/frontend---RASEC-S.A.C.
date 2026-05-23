import {
  ESTADO_VENTA, ESTADO_TRACKING, ESTADO_UNIDAD, ESTADO_IMPORTACION,
  ESTADO_COMPRA, ESTADO_COTIZACION, ESTADO_ACCESO, ESTADO_DISPLAY,
} from '../../config/constants';

const coloresEstado = {
  // Ventas
  [ESTADO_VENTA.PENDIENTE_APROBACION]: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  [ESTADO_VENTA.ACTIVA]: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  [ESTADO_VENTA.CANCELADA]: 'bg-red-500/15 text-red-600 border-red-500/30',
  [ESTADO_VENTA.CERRADA]: 'bg-steel-600/30 text-steel-300 border-steel-500/30',
  [ESTADO_VENTA.RECHAZADA]: 'bg-red-500/15 text-red-600 border-red-500/30',
  // Acceso
  [ESTADO_ACCESO.ACTIVO]: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  [ESTADO_ACCESO.INACTIVO]: 'bg-red-500/15 text-red-600 border-red-500/30',
  // Unidades
  [ESTADO_UNIDAD.DISPONIBLE]: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  [ESTADO_UNIDAD.ASIGNADA_A_VENTA]: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  [ESTADO_UNIDAD.EMPAQUETADA]: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  [ESTADO_UNIDAD.ROTULADA]: 'bg-purple-500/15 text-purple-600 border-purple-500/30',
  [ESTADO_UNIDAD.DEJADO_EN_AGENCIA]: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30',
  [ESTADO_UNIDAD.RETIRADO_EN_TIENDA]: 'bg-teal-500/15 text-teal-600 border-teal-500/30',
  [ESTADO_UNIDAD.RETIRADO_EN_AGENCIA]: 'bg-teal-500/15 text-teal-600 border-teal-500/30',
  [ESTADO_UNIDAD.CANCELADA_REVERTIDA]: 'bg-red-500/15 text-red-600 border-red-500/30',
  // Tracking
  [ESTADO_TRACKING.PEDIDO_REGISTRADO]: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  [ESTADO_TRACKING.ALMACEN]: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  [ESTADO_TRACKING.EN_RUTA_A_AGENCIA]: 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30',
  [ESTADO_TRACKING.DEJADO_EN_AGENCIA]: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  // Importacion
  [ESTADO_IMPORTACION.PROGRAMADA]: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  [ESTADO_IMPORTACION.RETRASADA]: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  [ESTADO_IMPORTACION.INGRESADA]: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  // Compra
  [ESTADO_COMPRA.REGISTRADA]: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  [ESTADO_COMPRA.INGRESADA]: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  [ESTADO_COMPRA.ASIGNADA_A_ENVIO]: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  // Display (solo UI)
  [ESTADO_DISPLAY.PROCESANDO_EN_ALMACEN]: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  // Cotizacion
  [ESTADO_COTIZACION.PENDIENTE_WHATSAPP]: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  [ESTADO_COTIZACION.CONVERTIDA_A_VENTA]: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
};

export default function EstadoBadge({ estado }) {
  const clase = coloresEstado[estado] || 'bg-steel-600/30 text-steel-300 border-steel-500/30';
  const texto = estado?.replace(/_/g, ' ').toUpperCase() || 'N/A';

  return (
    <span className={`badge border ${clase}`}>
      {texto}
    </span>
  );
}
