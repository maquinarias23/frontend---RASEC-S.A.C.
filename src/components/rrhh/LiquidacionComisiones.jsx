// =============================================================================
// LIQUIDACIÓN DE COMISIONES (esquema V5)
// -----------------------------------------------------------------------------
// Lo que RRHH paga cada semana, calculado con el esquema activo del Constructor
// de Comisiones. No hay reglas escritas en esta pantalla: todo lo que se ve
// (el candado, los conceptos, los montos) sale del esquema vigente, así que
// cambiar la política se hace en el Constructor y aquí se refleja solo.
//
// Reemplaza al tablero de rangos escalonados sobre utilidad, que fue retirado.
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineChevronDown,
  HiOutlineRefresh, HiOutlineSave, HiOutlineDownload, HiOutlineCheckCircle,
  HiOutlineExclamation, HiOutlineLockClosed, HiOutlineSparkles,
} from 'react-icons/hi';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { formatearMoneda, formatearFecha, formatearFechaHoraPrecisa } from '../../utils/formato';
import { MESES } from '../../config/constants';

// Nombres técnicos -> lenguaje del negocio (mismo diccionario que usa el
// Constructor, para que RRHH lea lo mismo en las dos pantallas).
const METRICA_LABEL = {
  venta_bruta: 'venta bruta',
  num_operaciones: 'operaciones',
  utilidad: 'utilidad',
  margen: 'margen',
  cantidad_productos: 'productos vendidos',
};

const OPERADOR_LABEL = {
  mayor_igual: 'al menos',
  mayor: 'más de',
  menor_igual: 'como máximo',
  menor: 'menos de',
  igual: 'exactamente',
};

const ESTADO_VENTA_LABEL = {
  activa: 'activas',
  cerrada: 'cerradas',
  pendiente_aprobacion: 'pendientes de aprobación',
};

const esDinero = (nombreMetrica) => nombreMetrica === 'venta_bruta' || nombreMetrica === 'utilidad';

/** "al menos S/ 8,501 de venta bruta" */
const describirCondicion = (c) => {
  if (c.etiqueta) return c.etiqueta;
  const valor = esDinero(c.metrica)
    ? formatearMoneda(c.valor)
    : Number(c.valor).toLocaleString('es-PE');
  return `${OPERADOR_LABEL[c.operador] || c.operador} ${valor} de ${METRICA_LABEL[c.metrica] || c.metrica}`;
};

export default function LiquidacionComisiones() {
  const hoy = new Date();
  const [mes, setMes] = useState({ mes: hoy.getMonth() + 1, anio: hoy.getFullYear() });
  const [tipo, setTipo] = useState('semanal');
  const [semanas, setSemanas] = useState([]);
  const [semana, setSemana] = useState(1);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [liquidando, setLiquidando] = useState(false);
  const [expandidos, setExpandidos] = useState({});
  const [historial, setHistorial] = useState([]);
  const [error, setError] = useState(null);

  const cambiarMes = (dir) => {
    setMes((prev) => {
      const fecha = new Date(prev.anio, prev.mes - 1 + dir, 1);
      return { mes: fecha.getMonth() + 1, anio: fecha.getFullYear() };
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
    setError(null);
    try {
      const params = { mes: mes.mes, anio: mes.anio, tipo };
      if (tipo === 'semanal') params.semana = semana;
      const { data } = await api.get('/rrhh/comisiones/periodo/preview', { params });
      setDatos(data);
    } catch (err) {
      // El caso típico es no tener todavía un esquema activo: se muestra fijo
      // en pantalla con la salida concreta, en vez de un toast que se va solo.
      setError(err.response?.data?.error || 'No se pudo calcular el periodo.');
      setDatos(null);
    } finally {
      setCargando(false);
    }
  }, [mes, tipo, semana]);

  const cargarHistorial = useCallback(async () => {
    try {
      const { data } = await api.get('/rrhh/comisiones/periodo');
      setHistorial(Array.isArray(data) ? data : []);
    } catch {
      setHistorial([]);
    }
  }, []);

  useEffect(() => { cargarSemanas(); }, [cargarSemanas]);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { cargarHistorial(); }, [cargarHistorial]);

  const liquidar = async () => {
    if (!datos?.detalles?.length) return;
    setLiquidando(true);
    try {
      const payload = { mes: mes.mes, anio: mes.anio, tipo };
      if (tipo === 'semanal') payload.semana = semana;
      const { data } = await api.post('/rrhh/comisiones/periodo/guardar', payload);
      toast.success(data.mensaje || 'Periodo liquidado');
      cargar();
      cargarHistorial();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al liquidar el periodo');
    } finally {
      setLiquidando(false);
    }
  };

  // Una fila por concepto pagado: el mismo recibo de la pantalla, en Excel.
  const exportar = () => {
    if (!datos?.detalles?.length) return;
    import('xlsx').then((XLSX) => {
      const etiqueta = tipo === 'semanal'
        ? `Semana ${datos.periodo.semana} (${datos.periodo.etiqueta}) - ${MESES[mes.mes - 1]} ${mes.anio}`
        : `${MESES[mes.mes - 1]} ${mes.anio}`;

      const filas = [];
      for (const d of datos.detalles) {
        filas.push({
          Vendedor: d.vendedor_nombre,
          Concepto: '',
          'Cómo se calculó': '',
          'Venta bruta': Number(d.totales.venta_bruta) || 0,
          Operaciones: d.totales.num_operaciones,
          Utilidad: Number(d.totales.utilidad_total) || 0,
          Candado: d.cumple_candado ? 'Cumple' : 'No cumple',
          Monto: '',
        });
        for (const c of d.componentes) {
          filas.push({
            Vendedor: '',
            Concepto: c.nombre,
            'Cómo se calculó': c.tramo_etiqueta || c.detalle || '',
            'Venta bruta': '', Operaciones: '', Utilidad: '', Candado: '',
            Monto: Number(c.monto) || 0,
          });
        }
        if (d.rampup?.aplica && d.rampup.monto) {
          filas.push({
            Vendedor: '',
            Concepto: 'Ramp-Up (vendedor nuevo)',
            'Cómo se calculó': `Semana ${d.semana_del_vendedor} de arranque`,
            'Venta bruta': '', Operaciones: '', Utilidad: '', Candado: '',
            Monto: Number(d.rampup.monto) || 0,
          });
        }
        for (const a of d.ajustes || []) {
          filas.push({
            Vendedor: '',
            Concepto: 'Ajuste',
            'Cómo se calculó': a.motivo,
            'Venta bruta': '', Operaciones: '', Utilidad: '', Candado: '',
            Monto: Number(a.monto) || 0,
          });
        }
        filas.push({
          Vendedor: '',
          Concepto: 'TOTAL DEL VENDEDOR',
          'Cómo se calculó': '',
          'Venta bruta': '', Operaciones: '', Utilidad: '', Candado: '',
          Monto: Number(d.total_periodo) || 0,
        });
        filas.push({});
      }

      filas.push({
        Vendedor: 'TOTAL A PAGAR',
        Concepto: '',
        'Cómo se calculó': '',
        'Venta bruta': Number(datos.totales.venta_bruta) || 0,
        Operaciones: '',
        Utilidad: Number(datos.totales.utilidad) || 0,
        Candado: '',
        Monto: Number(datos.totales.pagado) || 0,
      });

      const hoja = XLSX.utils.json_to_sheet(filas);
      hoja['!cols'] = [
        { wch: 28 }, { wch: 32 }, { wch: 38 }, { wch: 14 },
        { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
      ];
      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, 'Liquidacion');
      XLSX.writeFile(libro, `Comisiones_${etiqueta.replace(/[ /()]/g, '_')}.xlsx`);
    });
  };

  const esquema = datos?.esquema;
  const totales = datos?.totales;

  return (
    <div className="space-y-4">
      {/* Esquema vigente y su candado */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <HiOutlineLockClosed className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <h4 className="font-semibold text-blue-600 mb-2">
              {esquema ? `Esquema vigente: ${esquema.nombre}` : 'Esquema de comisiones'}
            </h4>
            {!esquema ? (
              <p className="text-steel-400">
                Configúralo en la pestaña <span className="font-semibold text-steel-200">Constructor de Comisiones</span>.
              </p>
            ) : (
              <ul className="space-y-1.5 text-steel-300 list-disc list-inside">
                <li>
                  Cuentan las ventas{' '}
                  <span className="font-semibold text-steel-100">
                    {(esquema.estados_venta_computables || []).map((e) => ESTADO_VENTA_LABEL[e] || e).join(' y ')}
                  </span>
                  {esquema.requiere_pago_completo
                    ? ' con pago completo.'
                    : ', aunque todavía no estén pagadas por completo.'}
                </li>
                {esquema.condiciones?.length > 0 ? (
                  <li>
                    Para cobrar comisiones y bonos, el vendedor debe alcanzar{' '}
                    <span className="font-semibold text-steel-100">
                      {esquema.condiciones.map(describirCondicion).join(' y ')}
                    </span>.
                  </li>
                ) : (
                  <li>No hay condiciones de acceso: todos los conceptos se pagan sin mínimo.</li>
                )}
                <li>El básico se paga aunque no se alcance el mínimo; el resto de conceptos, no.</li>
                <li>
                  Para cambiar montos, porcentajes o tramos, edita el esquema en{' '}
                  <span className="font-semibold text-steel-100">Constructor de Comisiones</span>.
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Selector de periodo y acciones */}
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

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden border border-steel-700">
              <button
                onClick={() => setTipo('semanal')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${tipo === 'semanal' ? 'bg-primary-600 text-white' : 'bg-steel-800 text-steel-400 hover:text-steel-200'}`}
              >
                Semanal
              </button>
              <button
                onClick={() => setTipo('mensual')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${tipo === 'mensual' ? 'bg-primary-600 text-white' : 'bg-steel-800 text-steel-400 hover:text-steel-200'}`}
              >
                Mensual
              </button>
            </div>
            <button onClick={cargar} className="text-xs bg-steel-800 text-steel-300 px-2 py-1.5 rounded hover:bg-steel-700 flex items-center gap-1">
              <HiOutlineRefresh className="w-3.5 h-3.5" /> Recalcular
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={liquidar}
              disabled={liquidando || !datos?.detalles?.length}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {liquidando
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <HiOutlineSave className="w-4 h-4" />}
              Liquidar periodo
            </button>
            <button
              onClick={exportar}
              disabled={!datos?.detalles?.length}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <HiOutlineDownload className="w-4 h-4" /> Exportar Excel
            </button>
          </div>
        </div>

        {tipo === 'semanal' && semanas.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {semanas.map((s) => (
              <button
                key={s.numero}
                onClick={() => setSemana(s.numero)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  semana === s.numero ? 'bg-primary-600 text-white' : 'bg-steel-800 text-steel-400 hover:text-steel-200'
                }`}
              >
                Sem {s.numero} · {s.etiqueta}
              </button>
            ))}
          </div>
        )}

        {datos?.guardado && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mt-3 text-sm">
            <span className="text-blue-600 font-medium">Este periodo ya fue liquidado</span>
            <span className="text-blue-400 ml-2">
              por {datos.guardado.tbl_usuarios?.nombres || '?'} el {formatearFechaHoraPrecisa(datos.guardado.guardado_en)}
            </span>
            <span className="text-blue-400 ml-1">— Al liquidar otra vez se reemplaza.</span>
          </div>
        )}
      </div>

      {error && (
        <div className="card border border-amber-500/30 text-sm text-amber-600 flex items-start gap-3">
          <HiOutlineExclamation className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {cargando && <div className="card text-center text-steel-400 py-8">Calculando la liquidación…</div>}

      {!cargando && !error && totales && (
        <>
          {/* Totales del periodo */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
            {[
              { label: 'Básicos', valor: formatearMoneda(totales.basico) },
              { label: 'Variable', valor: formatearMoneda(totales.variable) },
              { label: 'Ajustes', valor: formatearMoneda(totales.ajustes), rojo: totales.ajustes < 0 },
              { label: 'Total a pagar', valor: formatearMoneda(totales.pagado), destacado: true },
              { label: 'Cumplen el mínimo', valor: `${totales.vendedores_con_candado} de ${totales.vendedores}` },
            ].map((t) => (
              <div key={t.label} className={`card ${t.destacado ? 'border border-primary-500/40' : ''}`}>
                <p className="text-xs text-steel-400">{t.label}</p>
                <p className={`text-xl font-semibold mt-1 ${
                  t.destacado ? 'text-primary-500' : t.rojo ? 'text-red-500' : 'text-steel-100'
                }`}>
                  {t.valor}
                </p>
              </div>
            ))}
          </div>

          {totales.rampup_pendientes > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-600">
              {totales.rampup_pendientes} vendedor(es) nuevo(s) con ramp-up sugerido pendiente de confirmar. Hasta que
              se confirme no se les suma al pago.
            </div>
          )}

          {/* Recibo por vendedor */}
          <div className="space-y-3">
            {datos.detalles.map((d) => (
              <div key={d.vendedor_user_id} className="border border-steel-700/50 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandidos((prev) => ({ ...prev, [d.vendedor_user_id]: !prev[d.vendedor_user_id] }))}
                  className="w-full bg-steel-800/60 px-4 py-3 flex items-center justify-between gap-3 hover:bg-steel-700/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <HiOutlineChevronDown className={`w-4 h-4 text-steel-400 transition-transform flex-shrink-0 ${expandidos[d.vendedor_user_id] ? '' : '-rotate-90'}`} />
                    <span className="text-sm font-bold text-steel-100 truncate">{d.vendedor_nombre}</span>
                    {d.cumple_candado ? (
                      <HiOutlineCheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" title="Cumple el mínimo" />
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 font-bold uppercase tracking-wider whitespace-nowrap">
                        Sin mínimo
                      </span>
                    )}
                    {d.es_nuevo && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-500 font-bold uppercase tracking-wider whitespace-nowrap flex items-center gap-1">
                        <HiOutlineSparkles className="w-3 h-3" /> Sem {d.semana_del_vendedor}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-steel-400 flex-shrink-0">
                    <span className="hidden sm:inline">{d.totales.num_operaciones} ops</span>
                    <span className="hidden sm:inline">{formatearMoneda(d.totales.venta_bruta)}</span>
                    <span className="text-sm font-bold text-primary-500">{formatearMoneda(d.total_periodo)}</span>
                  </div>
                </button>

                {expandidos[d.vendedor_user_id] && (
                  <div className="p-4 space-y-4">
                    {!d.cumple_candado && d.detalle_candado && (
                      <p className="text-xs text-amber-600">{d.detalle_candado}</p>
                    )}

                    <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 text-center">
                      {[
                        { label: 'Venta bruta', valor: formatearMoneda(d.totales.venta_bruta) },
                        { label: 'Operaciones', valor: d.totales.num_operaciones },
                        { label: 'Utilidad', valor: formatearMoneda(d.totales.utilidad_total) },
                        { label: 'Margen', valor: `${(d.totales.margen * 100).toFixed(1)}%` },
                      ].map((m) => (
                        <div key={m.label} className="bg-steel-900/50 rounded-lg p-2.5">
                          <div className="text-xs text-steel-400">{m.label}</div>
                          <div className="text-sm font-bold text-steel-100 mt-0.5">{m.valor}</div>
                        </div>
                      ))}
                    </div>

                    {d.totales.costos_pendientes > 0 && (
                      <p className="text-xs text-amber-600">
                        {d.totales.costos_pendientes} venta(s) sin unidades asignadas: la utilidad y el margen aún
                        pueden cambiar. La comisión no se ve afectada porque se calcula sobre la venta bruta.
                      </p>
                    )}

                    {/* Recibo */}
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
                          {d.componentes.map((c, i) => (
                            <tr key={i} className="border-b border-steel-800">
                              <td className="py-2 text-steel-200">
                                {c.nombre}
                                {c.bloqueado_por_candado && (
                                  <span className="block text-xs text-amber-600">No alcanzó el mínimo requerido</span>
                                )}
                                {c.suprimido_por_rampup && (
                                  <span className="block text-xs text-blue-500">No aplica durante el arranque</span>
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

                          {d.rampup?.aplica && d.rampup.porcentaje > 0 && (
                            <tr className="border-b border-steel-800 bg-blue-500/5">
                              <td className="py-2 text-steel-200">Comisión Ramp-Up</td>
                              <td className="py-2 text-steel-400 text-xs">
                                Semana {d.semana_del_vendedor} · {d.rampup.porcentaje}% de {formatearMoneda(d.rampup.base_aplicada)}
                              </td>
                              <td className="py-2 text-right text-steel-100">
                                {formatearMoneda(d.rampup.modo === 'manual' ? d.rampup.monto_porcentaje_sugerido : d.rampup.monto_porcentaje)}
                              </td>
                            </tr>
                          )}

                          {d.rampup?.bono?.aplica && (
                            <tr className="border-b border-steel-800 bg-blue-500/5">
                              <td className="py-2 text-steel-200">Bono de productividad (arranque)</td>
                              <td className="py-2 text-steel-400 text-xs">
                                Semana {d.semana_del_vendedor} · {d.rampup.bono.tramo_etiqueta || `${d.rampup.bono.valor_alcanzado} ops`}
                              </td>
                              <td className="py-2 text-right text-steel-100">
                                {formatearMoneda(d.rampup.modo === 'manual' ? d.rampup.bono.monto_sugerido : d.rampup.monto_bono)}
                              </td>
                            </tr>
                          )}

                          {d.rampup?.aplica && d.rampup.modo === 'manual' && (
                            <tr className="border-b border-steel-800 bg-blue-500/5">
                              <td className="py-2 text-steel-200">
                                Ramp-Up confirmado
                                {!d.rampup.confirmado && (
                                  <span className="block text-xs text-amber-600">Pendiente de confirmación</span>
                                )}
                              </td>
                              <td className="py-2 text-steel-400 text-xs">
                                Reemplaza lo sugerido arriba ({formatearMoneda(d.rampup.monto_sugerido)})
                              </td>
                              <td className="py-2 text-right text-steel-100">{formatearMoneda(d.rampup.monto)}</td>
                            </tr>
                          )}

                          {(d.ajustes || []).map((a) => (
                            <tr key={a.id} className="border-b border-steel-800 bg-red-500/5">
                              <td className="py-2 text-steel-200">Ajuste</td>
                              <td className="py-2 text-steel-400 text-xs">{a.motivo}</td>
                              <td className="py-2 text-right text-red-500">{formatearMoneda(a.monto)}</td>
                            </tr>
                          ))}

                          <tr className="border-b border-steel-700">
                            <td className="py-2 font-medium text-steel-200" colSpan={2}>Total variable</td>
                            <td className="py-2 text-right font-medium text-steel-100">{formatearMoneda(d.total_variable)}</td>
                          </tr>
                          <tr>
                            <td className="py-3 font-semibold text-emerald-600" colSpan={2}>TOTAL DEL PERIODO</td>
                            <td className="py-3 text-right font-semibold text-emerald-600 text-lg">
                              {formatearMoneda(d.total_periodo)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Operaciones que contaron */}
                    {d.ventas.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-steel-300 mb-2">
                          Operaciones que contaron ({d.ventas.length})
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-steel-400 border-b border-steel-800">
                                <th className="text-left py-1.5">Fecha</th>
                                <th className="text-left py-1.5">Cliente</th>
                                <th className="text-left py-1.5">Productos</th>
                                <th className="text-right py-1.5">Venta</th>
                                <th className="text-right py-1.5">Pagado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {d.ventas.map((v) => (
                                <tr key={v.venta_id} className="border-b border-steel-800/30">
                                  <td className="py-1.5 text-steel-400 whitespace-nowrap">{formatearFecha(v.fecha)}</td>
                                  <td className="py-1.5 text-steel-200 max-w-[140px] truncate" title={v.cliente}>{v.cliente}</td>
                                  <td className="py-1.5 text-steel-400 max-w-[200px] truncate" title={v.productos}>{v.productos}</td>
                                  <td className="py-1.5 text-right text-steel-100">{formatearMoneda(v.monto_venta)}</td>
                                  <td className={`py-1.5 text-right ${v.pago_completo ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    {formatearMoneda(v.total_pagado)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Historial de periodos liquidados */}
      <div className="card">
        <h3 className="text-sm font-semibold text-steel-100 mb-3">Periodos liquidados</h3>
        {historial.length === 0 ? (
          <p className="text-sm text-steel-500">Todavía no se ha liquidado ningún periodo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-steel-800 text-steel-400">
                  <th className="text-left py-2 px-3">Periodo</th>
                  <th className="text-left py-2 px-3">Esquema</th>
                  <th className="text-right py-2 px-3">Venta bruta</th>
                  <th className="text-right py-2 px-3">Básicos</th>
                  <th className="text-right py-2 px-3">Variable</th>
                  <th className="text-right py-2 px-3">Pagado</th>
                  <th className="text-center py-2 px-3">Vendedores</th>
                  <th className="text-left py-2 px-3">Liquidado por</th>
                  <th className="text-left py-2 px-3">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((h) => (
                  <tr key={h.id} className="border-b border-steel-800/30">
                    <td className="py-2 px-3 text-steel-100 font-medium whitespace-nowrap">
                      {h.semana ? `Sem ${h.semana} · ` : ''}{MESES[h.mes - 1]} {h.anio}
                    </td>
                    <td className="py-2 px-3 text-steel-400 max-w-[180px] truncate" title={h.esquema?.nombre}>
                      {h.esquema?.nombre || '-'}
                    </td>
                    <td className="py-2 px-3 text-right text-steel-200">{formatearMoneda(h.total_venta_bruta)}</td>
                    <td className="py-2 px-3 text-right text-steel-300">{formatearMoneda(h.total_basico)}</td>
                    <td className="py-2 px-3 text-right text-steel-300">{formatearMoneda(h.total_variable)}</td>
                    <td className="py-2 px-3 text-right text-primary-600 font-bold">{formatearMoneda(h.total_pagado)}</td>
                    <td className="py-2 px-3 text-center text-steel-300">{h._count?.detalles ?? 0}</td>
                    <td className="py-2 px-3 text-steel-300">{h.tbl_usuarios?.nombres || '-'}</td>
                    <td className="py-2 px-3 text-steel-400 whitespace-nowrap">{formatearFechaHoraPrecisa(h.guardado_en)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
