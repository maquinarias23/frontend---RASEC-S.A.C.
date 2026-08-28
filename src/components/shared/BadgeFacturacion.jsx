// ---------------------------------------------------------------------------
// Badge de facturación de una venta.
//
// Responde de un vistazo tres preguntas que antes obligaban a abrir el detalle:
// si la venta ya tiene comprobante, quién lo emitió y cuándo.
//
// Se toma el último comprobante NO anulado; si todos están anulados se muestra
// ese estado, porque una venta con su única factura anulada no está facturada
// aunque tenga comprobantes asociados.
// ---------------------------------------------------------------------------

import { HiOutlineDocumentText, HiOutlineBan, HiOutlineClock } from 'react-icons/hi';
import { TIPO_COMPROBANTE_LABEL, COMPROBANTE_NUMERO, ESTADO_COMPROBANTE } from '../../config/constants';
import { formatearFechaHora } from '../../utils/formato';
import { comprobanteVigente } from '../../utils/facturacionVenta';

export default function BadgeFacturacion({ venta, compacto = false }) {
  const comprobantes = venta?.comprobantes || [];
  const vigente = comprobanteVigente(venta);

  // Sin comprobantes: la venta no pasó por facturación.
  if (comprobantes.length === 0) {
    return (
      <span className="badge border bg-steel-600/25 text-steel-400 border-steel-500/30 whitespace-nowrap">
        <HiOutlineClock className="w-3.5 h-3.5 mr-1" /> Sin facturar
      </span>
    );
  }

  // Tuvo comprobantes pero todos fueron anulados.
  if (!vigente) {
    const anulado = comprobantes[0];
    return (
      <div className="leading-tight">
        <span className="badge border bg-red-500/15 text-red-600 border-red-500/30 whitespace-nowrap">
          <HiOutlineBan className="w-3.5 h-3.5 mr-1" /> Anulado
        </span>
        <span className="block text-[11px] text-steel-400 mt-1 font-mono">
          {COMPROBANTE_NUMERO.formatear(anulado.serie, anulado.numero)}
        </span>
      </div>
    );
  }

  // El comprobante existe pero SUNAT aún no lo aceptó: se distingue en color
  // para que nadie lo dé por cerrado antes de tiempo.
  const aceptado = vigente.estado === ESTADO_COMPROBANTE.ACEPTADO_SUNAT;
  const conError = vigente.estado === ESTADO_COMPROBANTE.ERROR
    || vigente.estado === ESTADO_COMPROBANTE.RECHAZADO_SUNAT;

  const clase = conError
    ? 'bg-red-500/15 text-red-600 border-red-500/30'
    : aceptado
      ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
      : 'bg-amber-500/15 text-amber-600 border-amber-500/30';

  const etiqueta = conError ? 'Con error' : aceptado ? 'Facturado' : 'En proceso';
  const numero = COMPROBANTE_NUMERO.formatear(vigente.serie, vigente.numero);
  const emisor = vigente.tbl_usuarios?.nombres || '—';
  const cuando = formatearFechaHora(vigente.fecha_emision);
  const tipo = TIPO_COMPROBANTE_LABEL[vigente.tipo_comprobante] || vigente.tipo_comprobante;

  if (compacto) {
    return (
      <span
        className={`badge border ${clase} whitespace-nowrap`}
        title={`${tipo} ${numero}\nEmitido por: ${emisor}\n${cuando}`}
      >
        <HiOutlineDocumentText className="w-3.5 h-3.5 mr-1" /> {etiqueta}
      </span>
    );
  }

  return (
    <div className="leading-tight">
      <span className={`badge border ${clase} whitespace-nowrap`}>
        <HiOutlineDocumentText className="w-3.5 h-3.5 mr-1" /> {etiqueta}
      </span>
      <span className="block text-[11px] font-mono text-steel-300 mt-1">{numero}</span>
      <span className="block text-[11px] text-steel-400">
        Por <span className="text-steel-300">{emisor}</span>
      </span>
      <span className="block text-[11px] text-steel-400">{cuando}</span>
    </div>
  );
}
