import { ESTADO_COMPROBANTE, ESTADO_COMPROBANTE_LABEL } from '../../config/constants';

const coloresComprobante = {
  [ESTADO_COMPROBANTE.PENDIENTE]: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  [ESTADO_COMPROBANTE.EMITIDO]: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  [ESTADO_COMPROBANTE.ACEPTADO_SUNAT]: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  [ESTADO_COMPROBANTE.RECHAZADO_SUNAT]: 'bg-red-700/15 text-red-400 border-red-700/30',
  [ESTADO_COMPROBANTE.ANULADO]: 'bg-steel-600/30 text-steel-300 border-steel-500/30',
  [ESTADO_COMPROBANTE.ERROR]: 'bg-red-500/15 text-red-600 border-red-500/30',
};

export default function ComprobantesBadge({ estado }) {
  const clase = coloresComprobante[estado] || 'bg-steel-600/30 text-steel-300 border-steel-500/30';
  const texto = ESTADO_COMPROBANTE_LABEL[estado] || estado?.replace(/_/g, ' ').toUpperCase() || 'N/A';

  return (
    <span className={`badge border ${clase}`}>
      {texto}
    </span>
  );
}
