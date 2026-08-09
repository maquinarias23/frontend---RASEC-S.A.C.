import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  HiOutlineCurrencyDollar, HiOutlineUserAdd, HiOutlineCalculator,
  HiOutlineTrendingUp, HiOutlineFilm, HiOutlinePhotograph,
  HiOutlineSpeakerphone, HiOutlineChartBar, HiOutlineExclamation,
} from 'react-icons/hi';
import api from '../../api/axios';
import TarjetaResumen from '../../components/ui/TarjetaResumen';
import { PLATAFORMA_MKT_LABEL, PLATAFORMA_MKT_COLOR } from '../../config/constants';
import { formatearMoneda } from '../../utils/formato';

const aISO = (d) => d.toISOString().slice(0, 10);
const hoy = () => aISO(new Date());

const PERIODOS = [
  {
    key: 'mes',
    label: 'Este mes',
    getFechas: () => {
      const d = new Date();
      return { desde: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`, hasta: hoy() };
    },
  },
  {
    key: '7d',
    label: '7 días',
    getFechas: () => {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return { desde: aISO(d), hasta: hoy() };
    },
  },
  {
    key: '30d',
    label: '30 días',
    getFechas: () => {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      return { desde: aISO(d), hasta: hoy() };
    },
  },
];

// Umbral de consumo de presupuesto a partir del cual la campaña se marca en rojo.
const ALERTA_PRESUPUESTO = 0.9;

const tooltipStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '0.5rem',
  color: '#e2e8f0',
};

const formatearDiaMes = (f) =>
  new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });

const ACCESOS = [
  { tab: 'gasto_vendedor', label: 'Gasto por Vendedor', descripcion: 'Tabla diaria y semáforo de efectividad' },
  { tab: 'campanas', label: 'Campañas', descripcion: 'Crear y administrar campañas por plataforma' },
  { tab: 'metricas', label: 'Métricas', descripcion: 'Registro diario de gasto, leads y contenido' },
  { tab: 'metricas_custom', label: 'Métricas Personalizadas', descripcion: 'Indicadores propios del área' },
];

export default function DashboardMarketing() {
  const [periodo, setPeriodo] = useState('mes');
  const [resumen, setResumen] = useState(null);
  const [campanas, setCampanas] = useState([]);
  const [cargando, setCargando] = useState(true);

  const rango = useMemo(
    () => PERIODOS.find(p => p.key === periodo).getFechas(),
    [periodo],
  );

  useEffect(() => {
    // Evita que una respuesta lenta de un periodo anterior pise a la actual.
    let vigente = true;
    (async () => {
      const [resResumen, resCampanas] = await Promise.all([
        api.get('/analisis-marketing/resumen', {
          params: { fecha_desde: rango.desde, fecha_hasta: rango.hasta },
        }).catch(() => ({ data: null })),
        api.get('/analisis-marketing/campanas').catch(() => ({ data: [] })),
      ]);
      if (!vigente) return;
      setResumen(resResumen.data);
      setCampanas(Array.isArray(resCampanas.data) ? resCampanas.data : []);
      setCargando(false);
    })();
    return () => { vigente = false; };
  }, [rango]);

  const cambiarPeriodo = (key) => {
    setCargando(true);
    setPeriodo(key);
  };

  const kpis = resumen?.kpis;

  const datosEvolucion = useMemo(() => (resumen?.evolucion_diaria || []).map(d => ({
    fecha: formatearDiaMes(d.fecha),
    Gasto: Number(d.gasto),
    Leads: Number(d.leads),
  })), [resumen]);

  const datosPlataforma = useMemo(() => (resumen?.por_plataforma || []).map(p => ({
    name: PLATAFORMA_MKT_LABEL[p.plataforma] || p.plataforma,
    value: Number(p.gasto),
    fill: PLATAFORMA_MKT_COLOR[p.plataforma] || '#64748b',
  })), [resumen]);

  // Campañas activas ordenadas por porcentaje de presupuesto consumido.
  // gasto_acumulado es histórico de la campaña, no del periodo filtrado.
  const consumoCampanas = useMemo(() => campanas
    .filter(c => c.activa)
    .map(c => {
      const presupuesto = Number(c.presupuesto) || 0;
      const gastado = Number(c.gasto_acumulado) || 0;
      return {
        id: c.id,
        nombre: c.nombre,
        plataforma: c.plataforma,
        presupuesto,
        gastado,
        porcentaje: presupuesto > 0 ? gastado / presupuesto : 0,
      };
    })
    .sort((a, b) => b.porcentaje - a.porcentaje),
    [campanas]);

  const campanasEnRiesgo = consumoCampanas.filter(c => c.porcentaje >= ALERTA_PRESUPUESTO).length;

  const topCampanas = useMemo(
    () => (resumen?.por_campana || []).slice(0, 5),
    [resumen],
  );

  if (cargando) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-steel-700 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado + selector de periodo */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-steel-100 font-display tracking-wider">
            Dashboard Marketing e Innovación
          </h1>
          <p className="text-sm text-steel-400 mt-1">
            Periodo: {formatearDiaMes(rango.desde)} — {formatearDiaMes(rango.hasta)}
            {kpis?.dias_registrados > 0 && ` · ${kpis.dias_registrados} días con registro`}
          </p>
        </div>
        <div className="flex gap-1">
          {PERIODOS.map(p => (
            <button
              key={p.key}
              onClick={() => cambiarPeriodo(p.key)}
              className={`px-3 py-2 text-xs rounded-lg transition-colors ${
                periodo === p.key
                  ? 'bg-primary-500/15 text-primary-600 border border-primary-500/30'
                  : 'bg-steel-800 text-steel-300 border border-transparent hover:bg-steel-700 hover:text-steel-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs principales */}
      {/* 3 columnas hasta 2xl: con 6 en fila los títulos y montos se truncan. */}
      <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-4">
        <TarjetaResumen titulo="Gasto del Periodo" valor={formatearMoneda(kpis?.gasto_total || 0)} icono={HiOutlineCurrencyDollar} color="red" />
        <TarjetaResumen titulo="Leads Captados" valor={Number(kpis?.leads_total || 0).toLocaleString('es-PE')} icono={HiOutlineUserAdd} color="green" />
        <TarjetaResumen titulo="Costo / Lead" valor={formatearMoneda(kpis?.costo_por_lead || 0)} icono={HiOutlineCalculator} color="yellow" />
        <TarjetaResumen titulo="Gasto / Día" valor={formatearMoneda(kpis?.gasto_promedio_diario || 0)} icono={HiOutlineTrendingUp} color="primary" />
        <TarjetaResumen titulo="Videos Creados" valor={Number(kpis?.videos_total || 0).toLocaleString('es-PE')} icono={HiOutlineFilm} color="blue" />
        <TarjetaResumen titulo="Contenido Subido" valor={Number(kpis?.contenido_total || 0).toLocaleString('es-PE')} icono={HiOutlinePhotograph} color="purple" />
      </div>

      {/* Aviso de presupuesto */}
      {campanasEnRiesgo > 0 && (
        <div className="card border-amber-500/30 bg-amber-500/5 flex items-start gap-3">
          <HiOutlineExclamation className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-steel-200">
            {campanasEnRiesgo === 1
              ? '1 campaña activa superó el 90% de su presupuesto.'
              : `${campanasEnRiesgo} campañas activas superaron el 90% de su presupuesto.`}
            {' '}Revísalas antes de que se agoten.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolución diaria */}
        <div className="card">
          <h2 className="text-sm font-semibold text-steel-300 mb-4">Evolución Diaria — Gasto y Leads</h2>
          {datosEvolucion.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={datosEvolucion}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="fecha" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="gasto" stroke="#ef4444" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="leads" orientation="right" stroke="#10b981" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Area yAxisId="gasto" type="monotone" dataKey="Gasto" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} strokeWidth={2} />
                <Area yAxisId="leads" type="monotone" dataKey="Leads" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-steel-500 text-center py-12 text-sm">Sin registros en el periodo seleccionado</p>
          )}
        </div>

        {/* Gasto por plataforma */}
        <div className="card">
          <h2 className="text-sm font-semibold text-steel-300 mb-4">Gasto por Plataforma</h2>
          {datosPlataforma.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={datosPlataforma} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {datosPlataforma.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatearMoneda(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-steel-500 text-center py-12 text-sm">Sin registros en el periodo seleccionado</p>
          )}
        </div>

        {/* Consumo de presupuesto por campaña activa */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-steel-300">Presupuesto de Campañas Activas</h2>
            <span className="inline-flex items-center gap-1 text-xs text-steel-400">
              <HiOutlineSpeakerphone className="w-4 h-4" />
              {consumoCampanas.length} activa{consumoCampanas.length === 1 ? '' : 's'}
            </span>
          </div>
          {consumoCampanas.length > 0 ? (
            <div className="space-y-4">
              {consumoCampanas.slice(0, 6).map(c => {
                const pct = Math.min(c.porcentaje, 1);
                const excedido = c.porcentaje >= ALERTA_PRESUPUESTO;
                return (
                  <div key={c.id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-steel-200 truncate mr-2" title={c.nombre}>
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle"
                          style={{ backgroundColor: PLATAFORMA_MKT_COLOR[c.plataforma] || '#64748b' }}
                        />
                        {c.nombre}
                      </span>
                      <span className={`flex-shrink-0 tabular-nums ${excedido ? 'text-red-500' : 'text-steel-400'}`}>
                        {formatearMoneda(c.gastado)} / {formatearMoneda(c.presupuesto)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-steel-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${excedido ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{ width: `${pct * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-steel-500 text-center py-12 text-sm">No hay campañas activas registradas</p>
          )}
        </div>

        {/* Top campañas del periodo */}
        <div className="card">
          <h2 className="text-sm font-semibold text-steel-300 mb-4">Campañas con Mayor Gasto del Periodo</h2>
          {topCampanas.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-steel-700">
                    <th className="text-left py-2 px-3 text-steel-400 font-medium">Campaña</th>
                    <th className="text-right py-2 px-3 text-steel-400 font-medium">Gasto</th>
                    <th className="text-right py-2 px-3 text-steel-400 font-medium">Leads</th>
                    <th className="text-right py-2 px-3 text-steel-400 font-medium">Costo/Lead</th>
                  </tr>
                </thead>
                <tbody>
                  {topCampanas.map(c => (
                    <tr key={c.campana} className="border-b border-steel-800 hover:bg-steel-800/30">
                      <td className="py-2 px-3 text-steel-200">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle"
                          style={{ backgroundColor: PLATAFORMA_MKT_COLOR[c.plataforma] || '#64748b' }}
                        />
                        {c.campana}
                      </td>
                      <td className="py-2 px-3 text-right text-steel-300 tabular-nums">{formatearMoneda(c.gasto)}</td>
                      <td className="py-2 px-3 text-right text-steel-300 tabular-nums">{Number(c.leads).toLocaleString('es-PE')}</td>
                      <td className="py-2 px-3 text-right text-steel-300 tabular-nums">{formatearMoneda(c.costo_por_lead)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-steel-500 text-center py-12 text-sm">Sin registros en el periodo seleccionado</p>
          )}
        </div>
      </div>

      {/* Accesos directos al módulo */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-steel-300">Accesos Directos</h2>
          <Link
            to="/administrador/analisis-marketing"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium transition-colors"
          >
            Abrir Análisis Mkt &rarr;
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ACCESOS.map(a => (
            <Link
              key={a.tab}
              to={`/administrador/analisis-marketing?tab=${a.tab}`}
              className="p-4 rounded-lg border border-steel-700 hover:border-primary-500/40 hover:bg-steel-800/40 transition-all duration-200 group"
            >
              <div className="flex items-center gap-2 mb-1">
                <HiOutlineChartBar className="w-4 h-4 text-primary-600" />
                <span className="text-sm font-medium text-steel-100 group-hover:text-primary-600 transition-colors">
                  {a.label}
                </span>
              </div>
              <p className="text-xs text-steel-400">{a.descripcion}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
