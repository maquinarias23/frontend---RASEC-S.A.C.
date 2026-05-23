import { useState, useEffect, useCallback } from 'react';
import {
  HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineChevronDown,
  HiOutlineRefresh, HiOutlineCash,
} from 'react-icons/hi';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { formatearFecha, formatearMoneda } from '../../utils/formato';
import { MESES } from '../../config/constants';

export default function ComisionesVendedor() {
  const hoy = new Date();
  const [mesComision, setMesComision] = useState({ mes: hoy.getMonth() + 1, anio: hoy.getFullYear() });
  const [tipoComision, setTipoComision] = useState('mensual');
  const [semanaComision, setSemanaComision] = useState(1);
  const [preview, setPreview] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [ventasExpandidas, setVentasExpandidas] = useState(false);
  const [tab, setTab] = useState('actual');

  const cambiarMes = (dir) => {
    setMesComision(prev => {
      let m = prev.mes + dir;
      let a = prev.anio;
      if (m > 12) { m = 1; a++; }
      if (m < 1) { m = 12; a--; }
      return { mes: m, anio: a };
    });
  };

  const cargarPreview = useCallback(async () => {
    setCargando(true);
    try {
      const params = { mes: mesComision.mes, anio: mesComision.anio, tipo: tipoComision };
      if (tipoComision === 'semanal') params.semana = semanaComision;
      const { data } = await api.get('/rrhh/mis-comisiones/preview', { params });
      setPreview(data);
    } catch {
      toast.error('Error al cargar comisiones');
    } finally {
      setCargando(false);
    }
  }, [mesComision, tipoComision, semanaComision]);

  const cargarHistorial = useCallback(async () => {
    try {
      const { data } = await api.get('/rrhh/mis-comisiones');
      setHistorial(data);
    } catch {
      toast.error('Error al cargar historial');
    }
  }, []);

  useEffect(() => {
    cargarPreview();
  }, [cargarPreview]);

  useEffect(() => {
    if (tab === 'historial') cargarHistorial();
  }, [tab, cargarHistorial]);

  const detalle = preview?.detalle;
  const totales = detalle?.totales;
  const ventas = detalle?.ventas || [];
  const semanasDisp = preview?.semanas_disponibles || [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-steel-100 font-display tracking-wider mb-6 flex items-center gap-2">
        <HiOutlineCash className="w-7 h-7 text-primary-500" /> Mis Comisiones
      </h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('actual')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'actual' ? 'bg-primary-600 text-white' : 'bg-steel-800 text-steel-400 hover:text-steel-200'}`}
        >
          Periodo Actual
        </button>
        <button
          onClick={() => setTab('historial')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'historial' ? 'bg-primary-600 text-white' : 'bg-steel-800 text-steel-400 hover:text-steel-200'}`}
        >
          Historial Guardado
        </button>
      </div>

      {tab === 'actual' && (
        <div className="space-y-4">
          {/* Selector de mes + tipo */}
          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <button onClick={() => cambiarMes(-1)} className="p-2 rounded-lg bg-steel-800 hover:bg-steel-700 text-steel-300">
                  <HiOutlineChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-semibold text-steel-100 min-w-[180px] text-center">
                  {MESES[mesComision.mes - 1]} {mesComision.anio}
                </h2>
                <button onClick={() => cambiarMes(1)} className="p-2 rounded-lg bg-steel-800 hover:bg-steel-700 text-steel-300">
                  <HiOutlineChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex rounded-lg overflow-hidden border border-steel-700">
                  <button onClick={() => setTipoComision('mensual')} className={`px-3 py-1.5 text-xs font-medium transition-colors ${tipoComision === 'mensual' ? 'bg-primary-600 text-white' : 'bg-steel-800 text-steel-400 hover:text-steel-200'}`}>
                    Mensual
                  </button>
                  <button onClick={() => setTipoComision('semanal')} className={`px-3 py-1.5 text-xs font-medium transition-colors ${tipoComision === 'semanal' ? 'bg-primary-600 text-white' : 'bg-steel-800 text-steel-400 hover:text-steel-200'}`}>
                    Semanal
                  </button>
                </div>
                {tipoComision === 'semanal' && semanasDisp.length > 0 && (
                  <select className="input-field text-xs py-1.5 w-auto" value={semanaComision} onChange={e => setSemanaComision(parseInt(e.target.value))}>
                    {semanasDisp.map(s => (
                      <option key={s.numero} value={s.numero}>
                        Sem {s.numero} ({formatearFecha(s.inicio)} - {formatearFecha(s.fin)})
                      </option>
                    ))}
                  </select>
                )}
                <button onClick={cargarPreview} className="text-xs bg-steel-800 text-steel-300 px-2 py-1.5 rounded hover:bg-steel-700 flex items-center gap-1">
                  <HiOutlineRefresh className="w-3.5 h-3.5" /> Recalcular
                </button>
              </div>
            </div>

            {cargando ? (
              <div className="text-center py-8 text-steel-400">Calculando comisiones...</div>
            ) : !totales ? (
              <div className="text-center py-8 text-steel-500">
                No hay ventas pagadas completamente para {tipoComision === 'semanal' ? `Semana ${semanaComision} de ` : ''}{MESES[mesComision.mes - 1]} {mesComision.anio}.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Alerta mínimo de ventas */}
                {!totales.cumple_minimo_ventas && (
                  <div className="bg-primary-600 border border-primary-700 rounded-lg p-3 text-sm text-white font-bold">
                    No alcanzas el minimo de ventas requerido para comisionar en este periodo. Tienes <strong>{totales.cantidad_ventas}</strong> venta{totales.cantidad_ventas !== 1 ? 's' : ''} pagada{totales.cantidad_ventas !== 1 ? 's' : ''}.
                  </div>
                )}

                {/* Resumen de comisión */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-steel-800/40 border border-steel-700/50 rounded-lg p-3 text-center">
                    <div className="text-xs text-steel-400 mb-1">Venta Bruta</div>
                    <div className="text-lg font-bold text-steel-100">{formatearMoneda(totales.venta_bruta)}</div>
                  </div>
                  <div className="bg-steel-800/40 border border-steel-700/50 rounded-lg p-3 text-center">
                    <div className="text-xs text-steel-400 mb-1">Costo Total</div>
                    <div className="text-lg font-bold text-steel-300">{formatearMoneda(totales.costo_total)}</div>
                  </div>
                  <div className="bg-steel-800/40 border border-steel-700/50 rounded-lg p-3 text-center">
                    <div className="text-xs text-steel-400 mb-1">Utilidad</div>
                    <div className={`text-lg font-bold ${totales.ganancia_total >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{formatearMoneda(totales.ganancia_total)}</div>
                  </div>
                  <div className="bg-primary-600/10 border border-primary-500/30 rounded-lg p-3 text-center">
                    <div className="text-xs text-primary-400 mb-1">Comision ({totales.porcentaje_aplicado}%)</div>
                    <div className="text-xl font-bold text-primary-500">{formatearMoneda(totales.comision_total)}</div>
                  </div>
                </div>

                {/* Métricas adicionales */}
                <div className="flex flex-wrap gap-4 text-xs text-steel-400">
                  <span>Ventas: <strong className="text-steel-200">{totales.cantidad_ventas}</strong></span>
                  <span>Productos: <strong className="text-steel-200">{totales.cantidad_productos}</strong></span>
                  <span>Margen: <strong className="text-steel-200">{(totales.margen_total * 100).toFixed(1)}%</strong></span>
                </div>

                {/* Tabla de ventas expandible */}
                <div className="border border-steel-700/50 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setVentasExpandidas(!ventasExpandidas)}
                    className="w-full bg-steel-800/60 px-4 py-2.5 flex items-center justify-between hover:bg-steel-700/60 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <HiOutlineChevronDown className={`w-4 h-4 text-steel-400 transition-transform ${ventasExpandidas ? '' : '-rotate-90'}`} />
                      <span className="text-sm font-medium text-steel-100">Desglose de Ventas</span>
                    </div>
                    <span className="text-xs text-steel-400">{ventas.length} venta{ventas.length !== 1 ? 's' : ''}</span>
                  </button>

                  {ventasExpandidas && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-steel-800 bg-steel-900/40">
                            <th className="text-left py-2 px-2 text-steel-400 font-medium">Fecha</th>
                            <th className="text-left py-2 px-2 text-steel-400 font-medium">Cliente</th>
                            <th className="text-left py-2 px-2 text-steel-400 font-medium">Producto</th>
                            <th className="text-left py-2 px-2 text-steel-400 font-medium">Destino</th>
                            <th className="text-right py-2 px-2 text-steel-400 font-medium">Venta</th>
                            <th className="text-right py-2 px-2 text-steel-400 font-medium">Costo</th>
                            <th className="text-right py-2 px-2 text-steel-400 font-medium">Flete</th>
                            <th className="text-right py-2 px-2 text-steel-400 font-medium">Parihuela</th>
                            <th className="text-right py-2 px-2 text-steel-400 font-medium">Regalos</th>
                            <th className="text-right py-2 px-2 text-steel-400 font-medium">Costo Total</th>
                            <th className="text-right py-2 px-2 text-steel-400 font-medium">Ganancia</th>
                            <th className="text-right py-2 px-2 text-steel-400 font-medium">% Margen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ventas.map((v, i) => (
                            <tr key={i} className="border-b border-steel-800/30 hover:bg-steel-800/20">
                              <td className="py-1.5 px-2 text-steel-300 whitespace-nowrap">{formatearFecha(v.fecha)}</td>
                              <td className="py-1.5 px-2 text-steel-200 max-w-[120px] truncate" title={v.cliente}>{v.cliente}</td>
                              <td className="py-1.5 px-2 text-steel-200 max-w-[160px] truncate" title={v.productos}>{v.productos}</td>
                              <td className="py-1.5 px-2 text-steel-300 max-w-[100px] truncate" title={v.destino}>{v.destino}</td>
                              <td className="py-1.5 px-2 text-right text-steel-200">{formatearMoneda(v.monto_venta)}</td>
                              <td className="py-1.5 px-2 text-right text-steel-400">{formatearMoneda(v.costo_productos)}</td>
                              <td className="py-1.5 px-2 text-right text-steel-400">{formatearMoneda(v.costo_flete)}</td>
                              <td className="py-1.5 px-2 text-right text-steel-400">{formatearMoneda(v.costo_parihuela)}</td>
                              <td className="py-1.5 px-2 text-right text-steel-400">{formatearMoneda(v.costo_regalos)}</td>
                              <td className="py-1.5 px-2 text-right text-steel-300">{formatearMoneda(v.costo_total)}</td>
                              <td className={`py-1.5 px-2 text-right font-medium ${v.ganancia >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatearMoneda(v.ganancia)}</td>
                              <td className="py-1.5 px-2 text-right text-steel-300">{(v.margen * 100).toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-steel-600 bg-steel-900/60">
                            <td colSpan={4} className="py-2 px-2 font-bold text-steel-100 text-xs">TOTALES</td>
                            <td className="py-2 px-2 text-right font-bold text-steel-100">{formatearMoneda(totales.venta_bruta)}</td>
                            <td className="py-2 px-2 text-right font-medium text-steel-300">{formatearMoneda(totales.costo_productos)}</td>
                            <td className="py-2 px-2 text-right font-medium text-steel-300">{formatearMoneda(totales.costo_flete_total)}</td>
                            <td className="py-2 px-2 text-right font-medium text-steel-300">{formatearMoneda(totales.costo_parihuela_total)}</td>
                            <td className="py-2 px-2 text-right font-medium text-steel-300">{formatearMoneda(totales.costo_regalos_total)}</td>
                            <td className="py-2 px-2 text-right font-bold text-steel-200">{formatearMoneda(totales.costo_total)}</td>
                            <td className={`py-2 px-2 text-right font-bold ${totales.ganancia_total >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatearMoneda(totales.ganancia_total)}</td>
                            <td className="py-2 px-2 text-right font-medium text-steel-300">{(totales.margen_total * 100).toFixed(1)}%</td>
                          </tr>
                          <tr className="bg-steel-900/60">
                            <td colSpan={10} className="py-2 px-2 text-right text-xs font-semibold text-steel-300">
                              UTILIDAD: <span className="text-emerald-600">{formatearMoneda(totales.ganancia_total)}</span>
                              <span className="mx-3 text-steel-600">|</span>
                              Comision ({totales.porcentaje_aplicado}%):
                            </td>
                            <td colSpan={2} className="py-2 px-2 text-right font-bold text-primary-500 text-sm">
                              {formatearMoneda(totales.comision_total)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'historial' && (
        <div className="card">
          <h2 className="text-lg font-semibold text-steel-100 mb-4">Comisiones Guardadas</h2>
          {historial.length === 0 ? (
            <div className="text-center py-8 text-steel-500">No hay comisiones guardadas aun.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-steel-800">
                    <th className="text-left py-2 px-3 text-steel-400">Periodo</th>
                    <th className="text-right py-2 px-3 text-steel-400">Venta Bruta</th>
                    <th className="text-right py-2 px-3 text-steel-400">Utilidad</th>
                    <th className="text-right py-2 px-3 text-steel-400">%</th>
                    <th className="text-right py-2 px-3 text-steel-400">Comision</th>
                    <th className="text-right py-2 px-3 text-steel-400">Ventas</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map(com => {
                    const miDetalle = com.detalles[0];
                    if (!miDetalle) return null;
                    return (
                      <tr key={com.id} className="border-b border-steel-800/30 hover:bg-steel-800/20">
                        <td className="py-2 px-3 text-steel-100 font-medium">{MESES[com.mes - 1]} {com.anio}</td>
                        <td className="py-2 px-3 text-right text-steel-200">{formatearMoneda(miDetalle.venta_bruta)}</td>
                        <td className={`py-2 px-3 text-right font-medium ${parseFloat(miDetalle.utilidad_total) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatearMoneda(miDetalle.utilidad_total)}
                        </td>
                        <td className="py-2 px-3 text-right text-primary-600 font-bold">{miDetalle.porcentaje_aplicado}%</td>
                        <td className="py-2 px-3 text-right font-bold text-primary-500">{formatearMoneda(miDetalle.comision_total)}</td>
                        <td className="py-2 px-3 text-right text-steel-300">{miDetalle.cantidad_ventas}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
