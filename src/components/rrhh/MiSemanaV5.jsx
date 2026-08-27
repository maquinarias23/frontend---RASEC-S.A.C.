// =============================================================================
// MI SEMANA (esquema V5)
// -----------------------------------------------------------------------------
// Recibo semanal del vendedor: qué cobró, por qué concepto y qué tramo se le
// aplicó. Consume el mismo cálculo que ve RRHH, así que no puede mostrar
// números distintos a los que se liquidan.
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineRefresh,
  HiOutlineCheckCircle, HiOutlineExclamation,
} from 'react-icons/hi';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { formatearMoneda, formatearFecha } from '../../utils/formato';
import { MESES } from '../../config/constants';

export default function MiSemanaV5() {
  const hoy = new Date();
  const [mes, setMes] = useState({ mes: hoy.getMonth() + 1, anio: hoy.getFullYear() });
  const [semanas, setSemanas] = useState([]);
  const [semana, setSemana] = useState(1);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);

  const cambiarMes = (dir) => {
    setMes((prev) => {
      let m = prev.mes + dir;
      let a = prev.anio;
      if (m > 12) { m = 1; a += 1; }
      if (m < 1) { m = 12; a -= 1; }
      return { mes: m, anio: a };
    });
    setSemana(1);
  };

  const cargarSemanas = useCallback(async () => {
    try {
      const { data } = await api.get('/rrhh/comisiones/periodo/semanas', {
        params: { mes: mes.mes, anio: mes.anio },
      });
      setSemanas(Array.isArray(data) ? data : []);
    } catch {
      setSemanas([]);
    }
  }, [mes]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await api.get('/rrhh/mis-comisiones/periodo', {
        params: { mes: mes.mes, anio: mes.anio, tipo: 'semanal', semana },
      });
      setDatos(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cargar tu semana');
      setDatos(null);
    } finally {
      setCargando(false);
    }
  }, [mes, semana]);

  useEffect(() => { cargarSemanas(); }, [cargarSemanas]);
  useEffect(() => { cargar(); }, [cargar]);

  const detalle = datos?.detalle;

  return (
    <div className="space-y-4">
      {/* Selector de mes y semana */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => cambiarMes(-1)} className="p-2 rounded-lg bg-steel-800 hover:bg-steel-700 text-steel-300">
              <HiOutlineChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-steel-100 min-w-[180px] text-center">
              {MESES[mes.mes - 1]} {mes.anio}
            </h2>
            <button onClick={() => cambiarMes(1)} className="p-2 rounded-lg bg-steel-800 hover:bg-steel-700 text-steel-300">
              <HiOutlineChevronRight className="w-5 h-5" />
            </button>
          </div>
          <button onClick={cargar} className="text-xs text-steel-400 hover:text-steel-200 flex items-center gap-1">
            <HiOutlineRefresh className="w-4 h-4" /> Actualizar
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {semanas.map((s) => (
            <button key={s.numero} onClick={() => setSemana(s.numero)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                semana === s.numero ? 'bg-primary-600 text-white' : 'bg-steel-800 text-steel-400 hover:text-steel-200'
              }`}>
              Sem {s.numero} · {s.etiqueta}
            </button>
          ))}
        </div>
      </div>

      {cargando && <div className="card text-center text-steel-400 py-6">Calculando…</div>}

      {!cargando && !detalle && (
        <div className="card text-center text-steel-400 py-6">
          {datos?.mensaje || 'Sin datos para esta semana.'}
        </div>
      )}

      {!cargando && detalle && (
        <>
          {/* Estado del candado */}
          <div className={`card border ${detalle.cumple_candado ? 'border-emerald-500/30' : 'border-amber-500/30'}`}>
            <div className="flex items-start gap-3">
              {detalle.cumple_candado
                ? <HiOutlineCheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                : <HiOutlineExclamation className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />}
              <div className="text-sm">
                <p className={detalle.cumple_candado ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                  {detalle.cumple_candado
                    ? 'Cumples el piso y la valla: generas comisiones y bonos.'
                    : 'Todavía no generas comisiones ni bonos esta semana.'}
                </p>
                {!detalle.cumple_candado && detalle.detalle_candado && (
                  <p className="text-steel-400 text-xs mt-1">{detalle.detalle_candado}</p>
                )}
                {detalle.es_nuevo && (
                  <p className="text-blue-500 text-xs mt-1">
                    Estás en tu semana {detalle.semana_del_vendedor} de arranque.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Métricas de la semana */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Venta bruta', valor: formatearMoneda(detalle.totales.venta_bruta) },
              { label: 'Operaciones', valor: detalle.totales.num_operaciones },
              { label: 'Utilidad', valor: formatearMoneda(detalle.totales.utilidad_total) },
              { label: 'Margen', valor: `${(detalle.totales.margen * 100).toFixed(1)}%` },
            ].map((m) => (
              <div key={m.label} className="card">
                <p className="text-xs text-steel-400">{m.label}</p>
                <p className="text-xl font-semibold text-steel-100 mt-1">{m.valor}</p>
              </div>
            ))}
          </div>

          {detalle.totales.costos_pendientes > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-600">
              {detalle.totales.costos_pendientes} venta(s) todavía sin unidades asignadas: la utilidad y el margen
              aún pueden cambiar. Tu comisión no se ve afectada porque se calcula sobre la venta bruta.
            </div>
          )}

          {/* Recibo */}
          <div className="card">
            <h3 className="text-sm font-semibold text-steel-100 mb-3">
              Detalle del pago — semana {datos.periodo.semana} ({datos.periodo.etiqueta})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-steel-400 text-xs border-b border-steel-700">
                    <th className="text-left py-2">Concepto</th>
                    <th className="text-left py-2">Cómo se calculó</th>
                    <th className="text-right py-2">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {detalle.componentes.map((c, i) => (
                    <tr key={i} className="border-b border-steel-800">
                      <td className="py-2 text-steel-200">
                        {c.nombre}
                        {c.bloqueado_por_candado && (
                          <span className="block text-xs text-amber-600">No alcanzaste el mínimo requerido</span>
                        )}
                        {c.suprimido_por_rampup && (
                          <span className="block text-xs text-blue-500">No aplica durante tu periodo de arranque</span>
                        )}
                      </td>
                      <td className="py-2 text-steel-400 text-xs">
                        {c.tramo_etiqueta || c.detalle || '—'}
                        {c.tipo_valor === 'porcentaje' && c.valor_aplicado > 0 && (
                          <span className="block">{c.valor_aplicado}% de {formatearMoneda(c.base_aplicada)}</span>
                        )}
                      </td>
                      <td className="py-2 text-right text-steel-100">{formatearMoneda(c.monto)}</td>
                    </tr>
                  ))}

                  {/* El arranque se desglosa en sus dos partes: el porcentaje
                      reconocido y el bono de productividad de esa semana. En
                      modo manual ambas son la sugerencia y lo que se paga es el
                      monto único que confirma RRHH. */}
                  {detalle.rampup?.aplica && detalle.rampup.porcentaje > 0 && (
                    <tr className="border-b border-steel-800 bg-blue-500/5">
                      <td className="py-2 text-steel-200">Comisión Ramp-Up</td>
                      <td className="py-2 text-steel-400 text-xs">
                        Semana {detalle.semana_del_vendedor} · {detalle.rampup.porcentaje}% de{' '}
                        {formatearMoneda(detalle.rampup.base_aplicada)}
                      </td>
                      <td className="py-2 text-right text-steel-100">
                        {formatearMoneda(detalle.rampup.modo === 'manual'
                          ? detalle.rampup.monto_porcentaje_sugerido
                          : detalle.rampup.monto_porcentaje)}
                      </td>
                    </tr>
                  )}

                  {detalle.rampup?.bono?.aplica && (
                    <tr className="border-b border-steel-800 bg-blue-500/5">
                      <td className="py-2 text-steel-200">Bono de Productividad (arranque)</td>
                      <td className="py-2 text-steel-400 text-xs">
                        Semana {detalle.semana_del_vendedor} · {detalle.rampup.bono.tramo_etiqueta
                          || `${detalle.rampup.bono.valor_alcanzado} ops: no llegaste al mínimo de la semana`}
                      </td>
                      <td className="py-2 text-right text-steel-100">
                        {formatearMoneda(detalle.rampup.modo === 'manual'
                          ? detalle.rampup.bono.monto_sugerido
                          : detalle.rampup.monto_bono)}
                      </td>
                    </tr>
                  )}

                  {detalle.rampup?.aplica && detalle.rampup.modo === 'manual' && (
                    <tr className="border-b border-steel-800 bg-blue-500/5">
                      <td className="py-2 text-steel-200">
                        Ramp-Up confirmado
                        {!detalle.rampup.confirmado && (
                          <span className="block text-xs text-amber-600">Pendiente de confirmación por RRHH</span>
                        )}
                      </td>
                      <td className="py-2 text-steel-400 text-xs">
                        Reemplaza lo sugerido arriba ({formatearMoneda(detalle.rampup.monto_sugerido)})
                      </td>
                      <td className="py-2 text-right text-steel-100">{formatearMoneda(detalle.rampup.monto)}</td>
                    </tr>
                  )}

                  {detalle.ajustes?.length > 0 && detalle.ajustes.map((a) => (
                    <tr key={a.id} className="border-b border-steel-800 bg-red-500/5">
                      <td className="py-2 text-steel-200">Ajuste</td>
                      <td className="py-2 text-steel-400 text-xs">{a.motivo}</td>
                      <td className="py-2 text-right text-red-500">{formatearMoneda(a.monto)}</td>
                    </tr>
                  ))}

                  <tr className="border-b border-steel-700">
                    <td className="py-2 font-medium text-steel-200" colSpan={2}>Total variable</td>
                    <td className="py-2 text-right font-medium text-steel-100">{formatearMoneda(detalle.total_variable)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-semibold text-emerald-600" colSpan={2}>TOTAL DE LA SEMANA</td>
                    <td className="py-3 text-right font-semibold text-emerald-600 text-lg">
                      {formatearMoneda(detalle.total_periodo)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Operaciones que contaron */}
          {detalle.ventas.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold text-steel-100 mb-3">
                Operaciones que contaron ({detalle.ventas.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-steel-400 text-xs border-b border-steel-700">
                      <th className="text-left py-2">Fecha</th>
                      <th className="text-left py-2">Cliente</th>
                      <th className="text-left py-2">Productos</th>
                      <th className="text-right py-2">Venta</th>
                      <th className="text-right py-2">Pagado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalle.ventas.map((v) => (
                      <tr key={v.venta_id} className="border-b border-steel-800">
                        <td className="py-1.5 text-steel-400 text-xs">{formatearFecha(v.fecha)}</td>
                        <td className="py-1.5 text-steel-200">{v.cliente}</td>
                        <td className="py-1.5 text-steel-400 text-xs">{v.productos}</td>
                        <td className="py-1.5 text-right text-steel-100">{formatearMoneda(v.monto_venta)}</td>
                        <td className="py-1.5 text-right text-xs">
                          <span className={v.pago_completo ? 'text-emerald-600' : 'text-amber-600'}>
                            {formatearMoneda(v.total_pagado)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
