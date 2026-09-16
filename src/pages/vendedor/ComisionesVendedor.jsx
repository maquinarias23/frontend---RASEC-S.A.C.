// =============================================================================
// MIS COMISIONES (vendedor)
// -----------------------------------------------------------------------------
// Dos vistas sobre el mismo esquema vigente: la semana en curso (lo que va
// ganando, aún sin liquidar) y los periodos ya liquidados por RRHH.
//
// El cálculo mensual sobre utilidad con rangos escalonados fue retirado del
// sistema: lo que se paga sale del Constructor de Comisiones.
// =============================================================================

import { useState, useEffect, useCallback, Fragment } from 'react';
import { HiOutlineCash, HiOutlineChevronDown } from 'react-icons/hi';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { formatearMoneda, formatearFecha } from '../../utils/formato';
import { MESES } from '../../config/constants';
import MiSemanaV5 from '../../components/rrhh/MiSemanaV5';

/** "Sem 3 · Septiembre 2026" o "Septiembre 2026" si el periodo fue mensual. */
const etiquetaPeriodo = (p) => {
  if (!p) return '-';
  const mes = `${MESES[p.mes - 1]} ${p.anio}`;
  return p.semana ? `Sem ${p.semana} · ${mes}` : mes;
};

export default function ComisionesVendedor() {
  const [tab, setTab] = useState('semana');
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [expandido, setExpandido] = useState(null);

  const cargarHistorial = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await api.get('/rrhh/mis-comisiones/liquidados');
      setHistorial(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cargar el historial');
      setHistorial([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'historial') cargarHistorial();
  }, [tab, cargarHistorial]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-steel-100 font-display tracking-wider mb-6 flex items-center gap-2">
        <HiOutlineCash className="w-7 h-7 text-primary-500" /> Mis Comisiones
      </h1>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('semana')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'semana' ? 'bg-primary-600 text-white' : 'bg-steel-800 text-steel-400 hover:text-steel-200'}`}
        >
          Mi Semana
        </button>
        <button
          onClick={() => setTab('historial')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'historial' ? 'bg-primary-600 text-white' : 'bg-steel-800 text-steel-400 hover:text-steel-200'}`}
        >
          Periodos Liquidados
        </button>
      </div>

      {tab === 'semana' && <MiSemanaV5 />}

      {tab === 'historial' && (
        <div className="card">
          <h2 className="text-lg font-semibold text-steel-100 mb-1">Periodos liquidados</h2>
          <p className="text-xs text-steel-400 mb-4">
            Lo que RRHH ya cerró y pagó. La semana en curso se ve en <strong className="text-steel-200">Mi Semana</strong>.
          </p>

          {cargando ? (
            <div className="text-center py-8 text-steel-400">Cargando…</div>
          ) : historial.length === 0 ? (
            <div className="text-center py-8 text-steel-500">Todavía no tienes periodos liquidados.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-steel-800 text-steel-400">
                    <th className="text-left py-2 px-3">Periodo</th>
                    <th className="text-right py-2 px-3">Venta bruta</th>
                    <th className="text-center py-2 px-3">Operaciones</th>
                    <th className="text-right py-2 px-3">Básico</th>
                    <th className="text-right py-2 px-3">Variable</th>
                    <th className="text-right py-2 px-3">Total cobrado</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((d) => (
                    <Fragment key={d.id}>
                      <tr
                        onClick={() => setExpandido(expandido === d.id ? null : d.id)}
                        className="border-b border-steel-800/30 hover:bg-steel-800/20 cursor-pointer"
                      >
                        <td className="py-2 px-3 text-steel-100 font-medium whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <HiOutlineChevronDown className={`w-4 h-4 text-steel-400 transition-transform ${expandido === d.id ? '' : '-rotate-90'}`} />
                            {etiquetaPeriodo(d.periodo)}
                          </span>
                          {!d.cumple_candado && (
                            <span className="block text-[10px] text-amber-600 ml-[22px]">No alcanzaste el mínimo</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right text-steel-200">{formatearMoneda(d.venta_bruta)}</td>
                        <td className="py-2 px-3 text-center text-steel-300">{d.num_operaciones}</td>
                        <td className="py-2 px-3 text-right text-steel-300">{formatearMoneda(d.total_basico)}</td>
                        <td className="py-2 px-3 text-right text-steel-300">{formatearMoneda(d.total_variable)}</td>
                        <td className="py-2 px-3 text-right font-bold text-primary-500">{formatearMoneda(d.total_periodo)}</td>
                      </tr>

                      {expandido === d.id && (
                        <tr className="bg-steel-900/40">
                          <td colSpan={6} className="px-3 py-3">
                            <div className="text-xs text-steel-400 mb-2">
                              {d.periodo?.fecha_inicio && (
                                <>Del {formatearFecha(d.periodo.fecha_inicio)} al {formatearFecha(d.periodo.fecha_fin)}</>
                              )}
                              {!d.cumple_candado && d.detalle_candado && (
                                <span className="block text-amber-600 mt-1">{d.detalle_candado}</span>
                              )}
                            </div>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-steel-400 border-b border-steel-800">
                                  <th className="text-left py-1.5">Concepto</th>
                                  <th className="text-left py-1.5">Cómo se calculó</th>
                                  <th className="text-right py-1.5">Monto</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(d.componentes || []).map((c) => (
                                  <tr key={c.id} className="border-b border-steel-800/30">
                                    <td className="py-1.5 text-steel-200">{c.nombre}</td>
                                    <td className="py-1.5 text-steel-400">
                                      {c.tramo_etiqueta || '—'}
                                      {c.tipo_valor === 'porcentaje' && Number(c.valor_aplicado) > 0 && (
                                        <span className="block">{c.valor_aplicado}% de {formatearMoneda(c.base_aplicada)}</span>
                                      )}
                                    </td>
                                    <td className="py-1.5 text-right text-steel-100">{formatearMoneda(c.monto)}</td>
                                  </tr>
                                ))}
                                {Number(d.monto_rampup) > 0 && (
                                  <tr className="border-b border-steel-800/30 bg-blue-500/5">
                                    <td className="py-1.5 text-steel-200">Ramp-Up</td>
                                    <td className="py-1.5 text-steel-400">
                                      Semana {d.semana_del_vendedor} de arranque
                                    </td>
                                    <td className="py-1.5 text-right text-steel-100">{formatearMoneda(d.monto_rampup)}</td>
                                  </tr>
                                )}
                                {Number(d.total_ajustes) !== 0 && (
                                  <tr className="border-b border-steel-800/30 bg-red-500/5">
                                    <td className="py-1.5 text-steel-200">Ajustes</td>
                                    <td className="py-1.5 text-steel-400">Reversiones de ventas canceladas</td>
                                    <td className="py-1.5 text-right text-red-500">{formatearMoneda(d.total_ajustes)}</td>
                                  </tr>
                                )}
                                <tr>
                                  <td className="py-2 font-semibold text-emerald-600" colSpan={2}>TOTAL COBRADO</td>
                                  <td className="py-2 text-right font-semibold text-emerald-600">
                                    {formatearMoneda(d.total_periodo)}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
