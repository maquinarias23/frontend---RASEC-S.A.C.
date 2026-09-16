import {
  HiOutlineCash,
  HiOutlineX,
  HiOutlineEye,
  HiOutlineExclamationCircle,
  HiOutlineTruck,
  HiOutlineOfficeBuilding,
} from 'react-icons/hi';
import EstadoBadge from '../../../components/ui/EstadoBadge';
import { formatearMoneda, formatearFechaHora } from '../../../utils/formato';
import { ESTADO_VENTA, TIPO_ENTREGA } from '../../../config/constants';

// Franja de color al costado: identifica el estado de un vistazo, antes de
// leer el badge.
const FRANJA_ESTADO = {
  [ESTADO_VENTA.ACTIVA]: 'bg-emerald-500',
  [ESTADO_VENTA.PENDIENTE_APROBACION]: 'bg-orange-500',
  [ESTADO_VENTA.CERRADA]: 'bg-steel-500',
  [ESTADO_VENTA.CANCELADA]: 'bg-red-500',
  [ESTADO_VENTA.RECHAZADA]: 'bg-red-500',
};

/**
 * Una venta como tarjeta táctil. Sustituye a la fila de tabla en celular:
 * mismos datos (n.º, cliente, total, inicial, saldo, entrega, estado, tracking
 * y fecha) y mismas acciones, pero apilados y con áreas de toque grandes.
 */
export default function TarjetaVentaMovil({
  venta,
  voucherRechazado,
  permitePago,
  permiteCancelacion,
  onVer,
  onPagar,
  onCancelar,
}) {
  const saldo = parseFloat(venta.saldo_pendiente || 0);
  const inicial = venta.pagos?.[0];
  const esAgencia = venta.tipo_entrega === TIPO_ENTREGA.ENVIO_POR_AGENCIA;
  const IconoEntrega = esAgencia ? HiOutlineTruck : HiOutlineOfficeBuilding;

  return (
    <article className="relative overflow-hidden rounded-2xl border border-steel-700/70 bg-steel-950 shadow-steel">
      <span
        className={`absolute inset-y-0 left-0 w-1 ${FRANJA_ESTADO[venta.estado_venta] || 'bg-steel-600'}`}
        aria-hidden="true"
      />

      {/* Cabecera: número, fecha y estado */}
      <button
        type="button"
        onClick={onVer}
        className="w-full text-left pl-4 pr-3 pt-3 pb-2 active:bg-steel-900/60 transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-display text-xl leading-none tracking-wider text-steel-100">
              Venta #{venta.id}
            </p>
            <p className="text-[11px] text-steel-500 mt-1">
              {formatearFechaHora(venta.fecha_hora_registro)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <EstadoBadge estado={venta.estado_venta} />
            <EstadoBadge estado={venta.estado_tracking} />
          </div>
        </div>

        {/* Cliente */}
        <p className="mt-2.5 text-sm font-medium text-steel-100 truncate">
          {venta.tbl_clientes?.nombre || 'Sin cliente'}
        </p>
        {venta.tbl_clientes?.dni && (
          <p className="text-[11px] text-steel-500">DNI/RUC: {venta.tbl_clientes.dni}</p>
        )}

        {/* Cifras */}
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-steel-900/70 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-steel-500">Total</p>
            <p className="text-sm font-bold text-steel-100 truncate">{formatearMoneda(venta.total)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-steel-500">Inicial</p>
            <p className="text-sm font-medium text-steel-200 truncate">
              {inicial ? formatearMoneda(inicial.monto) : '—'}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-steel-500">Saldo</p>
            <p className={`text-sm font-bold truncate ${saldo > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {formatearMoneda(saldo)}
            </p>
          </div>
        </div>

        {/* Entrega + alerta de voucher */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] text-steel-400">
            <IconoEntrega className="w-3.5 h-3.5" />
            <span className="capitalize">{venta.tipo_entrega?.replace(/_/g, ' ') || '—'}</span>
          </span>
          {voucherRechazado && saldo > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-600">
              <HiOutlineExclamationCircle className="w-3.5 h-3.5" />
              Voucher rechazado
            </span>
          )}
        </div>
      </button>

      {/* Acciones: las mismas de la tabla, en botones a tamaño de pulgar */}
      <div className="flex items-stretch gap-2 border-t border-steel-800 px-3 py-2.5">
        <button
          type="button"
          onClick={onVer}
          className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl bg-steel-800 text-sm font-semibold text-steel-200 active:scale-[0.97] transition-transform"
        >
          <HiOutlineEye className="w-5 h-5" /> Ver
        </button>

        {permitePago && (
          <button
            type="button"
            onClick={onPagar}
            className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-sm font-semibold text-white active:scale-[0.97] transition-transform"
          >
            <HiOutlineCash className="w-5 h-5" /> Pagar
          </button>
        )}

        {permiteCancelacion && (
          <button
            type="button"
            onClick={onCancelar}
            aria-label="Cancelar venta"
            className="w-12 min-h-[44px] flex items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 active:scale-[0.97] transition-transform"
          >
            <HiOutlineX className="w-5 h-5" />
          </button>
        )}
      </div>
    </article>
  );
}
