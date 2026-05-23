import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { formatearFechaHora, formatearMoneda } from '../../utils/formato';
import { TIPO_PUNTO } from '../../config/constants';
import usePuntosStore from '../../store/puntosStore';

const ETIQUETA_TIPO = {
  [TIPO_PUNTO.GANADO]: 'GANADO',
  [TIPO_PUNTO.USADO]: 'USADO',
  [TIPO_PUNTO.REVERTIDO]: 'REVERTIDO',
  [TIPO_PUNTO.RESERVADO]: 'RESERVADO',
  [TIPO_PUNTO.LIBERADO]: 'LIBERADO',
};

const COLOR_TIPO = {
  [TIPO_PUNTO.GANADO]: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
  [TIPO_PUNTO.USADO]: 'bg-red-500/10 text-red-500 border border-red-500/20',
  [TIPO_PUNTO.REVERTIDO]: 'bg-orange-500/10 text-orange-500 border border-orange-500/20',
  [TIPO_PUNTO.RESERVADO]: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
  [TIPO_PUNTO.LIBERADO]: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
};

function buildReferencia(mov) {
  const venta = mov.tbl_ventas;
  if (!venta) return null;
  const items = venta.items_venta || [];
  const nombres = items
    .filter(i => !i.es_regalo)
    .map(i => `${i.tbl_productos?.nombre || 'Producto'}${i.cantidad > 1 ? ` x${i.cantidad}` : ''}`)
    .join(', ');
  const regalos = items.filter(i => i.es_regalo);

  switch (mov.tipo) {
    case TIPO_PUNTO.GANADO:
      return { label: `Compra #${venta.id}`, detalle: nombres, total: venta.total };
    case TIPO_PUNTO.USADO:
      return { label: `Descuento en Compra #${venta.id}`, detalle: nombres, descuento: venta.descuento_puntos };
    case TIPO_PUNTO.REVERTIDO:
      return { label: `Cancelación de Compra #${venta.id}`, detalle: nombres };
    case TIPO_PUNTO.LIBERADO:
      return { label: `Devolución — Compra #${venta.id}`, detalle: nombres };
    default:
      return { label: `Compra #${venta.id}` };
  }
}

export default function MisPuntos() {
  const { saldo, refrescar: refrescarPuntos } = usePuntosStore();
  const [movimientos, setMovimientos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    refrescarPuntos();
    api.get('/puntos/mi-saldo').then(r => {
      setMovimientos(r.data.historial || []);
    }).catch(() => {}).finally(() => setCargando(false));
  }, [refrescarPuntos]);

  const TIPOS_POSITIVOS = [TIPO_PUNTO.GANADO, TIPO_PUNTO.LIBERADO];

  const totalGanado = movimientos
    .filter(m => m.tipo === TIPO_PUNTO.GANADO)
    .reduce((sum, m) => sum + Math.abs(parseFloat(m.puntos || 0)), 0);
  const totalUsado = movimientos
    .filter(m => m.tipo === TIPO_PUNTO.USADO)
    .reduce((sum, m) => sum + Math.abs(parseFloat(m.puntos || 0)), 0);

  return (
    <div>
      <h1 className="section-title-chromium mb-6">Mis Puntos</h1>

      {/* Saldo principal */}
      <div className="card-chromium text-center py-10 mb-6">
        <p className="label-chromium">Tu saldo actual</p>
        <p className="text-6xl font-bold text-primary-500 num-chromium animate-count-up my-3">
          {parseFloat(saldo).toFixed(1)}
        </p>
        <p className="text-sm text-steel-400">puntos disponibles</p>
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card-chromium text-center py-5">
          <p className="label-chromium mb-1">Total ganado</p>
          <p className="num-chromium text-xl font-bold text-emerald-500">+{totalGanado.toFixed(1)}</p>
        </div>
        <div className="card-chromium text-center py-5">
          <p className="label-chromium mb-1">Total usado</p>
          <p className="num-chromium text-xl font-bold text-red-500">-{totalUsado.toFixed(1)}</p>
        </div>
      </div>

      {/* Historial */}
      <div className="card-chromium">
        <h2 className="section-title-chromium text-lg mb-4">Historial de Movimientos</h2>

        {cargando ? (
          <p className="text-steel-400 text-sm py-4 text-center">Cargando...</p>
        ) : movimientos.length === 0 ? (
          <p className="text-steel-500 text-sm py-4 text-center">Aún no tienes movimientos de puntos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-steel-700/50">
                  <th className="label-chromium text-left py-3 px-2">Tipo</th>
                  <th className="label-chromium text-left py-3 px-2">Referencia</th>
                  <th className="label-chromium text-right py-3 px-2">Puntos</th>
                  <th className="label-chromium text-right py-3 px-2">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((mov) => {
                  const ptsAbs = Math.abs(parseFloat(mov.puntos || 0));
                  const esPositivo = TIPOS_POSITIVOS.includes(mov.tipo);
                  const valorDisplay = ptsAbs % 1 === 0 ? ptsAbs.toFixed(0) : ptsAbs.toFixed(1);
                  const ref = buildReferencia(mov);

                  return (
                    <tr key={mov.id} className="border-b border-steel-800/30 hover:bg-steel-800/20 transition-colors">
                      <td className="py-3 px-2">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${COLOR_TIPO[mov.tipo] || 'bg-steel-700/50 text-steel-300 border border-steel-600/30'}`}>
                          {ETIQUETA_TIPO[mov.tipo] || mov.tipo}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        {ref ? (
                          <div>
                            <p className="text-steel-200 text-sm">{ref.label}</p>
                            {ref.detalle && (
                              <p className="text-steel-500 text-xs mt-0.5 truncate max-w-xs" title={ref.detalle}>
                                {ref.detalle}
                              </p>
                            )}
                            {ref.total && (
                              <p className="text-steel-500 text-xs">Total compra: {formatearMoneda(ref.total)}</p>
                            )}
                            {ref.descuento && parseFloat(ref.descuento) > 0 && (
                              <p className="text-steel-500 text-xs">Descuento aplicado: {formatearMoneda(ref.descuento)}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-steel-500 text-xs">&mdash;</span>
                        )}
                      </td>
                      <td className={`text-right py-3 px-2 font-semibold num-chromium tabular-nums ${esPositivo ? 'text-emerald-500' : 'text-red-500'}`}>
                        {esPositivo ? '+' : '-'}{valorDisplay}
                      </td>
                      <td className="text-right py-3 px-2 text-steel-400 whitespace-nowrap">
                        {formatearFechaHora(mov.fecha_hora)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
