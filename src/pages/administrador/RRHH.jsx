import { useState, useEffect } from 'react';
import {
  HiOutlinePlus, HiOutlineUserGroup, HiOutlineClock, HiOutlineCash,
  HiOutlineGift, HiOutlineChevronLeft, HiOutlineChevronRight,
  HiOutlineRefresh, HiOutlineChartBar, HiOutlineAdjustments,
} from 'react-icons/hi';
import useCrud from '../../hooks/useCrud';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import TablaGenerica from '../../components/ui/TablaGenerica';
import Modal from '../../components/ui/Modal';
import Tabs from '../../components/ui/Tabs';
import ConstructorComisiones from '../../components/rrhh/ConstructorComisiones';
import LiquidacionComisiones from '../../components/rrhh/LiquidacionComisiones';
import { formatearFecha, formatearFechaHora, formatearMoneda } from '../../utils/formato';
import { ESTADO_ASISTENCIA, MESES } from '../../config/constants';

const TABS_RRHH = [
  { key: 'empleados', label: 'Empleados', icono: <HiOutlineUserGroup className="w-4 h-4 inline" /> },
  { key: 'asistencia', label: 'Asistencia', icono: <HiOutlineClock className="w-4 h-4 inline" /> },
  { key: 'tardanzas', label: 'Tardanzas / Bonos', icono: <HiOutlineGift className="w-4 h-4 inline" /> },
  { key: 'comisiones', label: 'Comisiones', icono: <HiOutlineCash className="w-4 h-4 inline" /> },
  { key: 'constructor', label: 'Constructor de Comisiones', icono: <HiOutlineAdjustments className="w-4 h-4 inline" /> },
  { key: 'ranking', label: 'Ranking', icono: <HiOutlineChartBar className="w-4 h-4 inline" /> },
];

// Las dos métricas del ranking. Deben coincidir con METRICA_RANKING del
// backend: el backend rechaza cualquier otra.
const METRICAS_RANKING = [
  { key: 'venta_bruta', label: 'Venta bruta', peso_defecto: 50 },
  { key: 'clientes', label: 'Clientes atendidos', peso_defecto: 50 },
];

const etiquetaMetricaRanking = (key) =>
  METRICAS_RANKING.find((m) => m.key === key)?.label || key.replace(/_/g, ' ');

const colEmpleados = [
  { key: 'id', label: 'ID' },
  { key: 'empleado', label: 'Empleado', render: (f) => f.tbl_usuarios?.nombres || '-' },
  { key: 'correo', label: 'Correo', render: (f) => f.tbl_usuarios?.correo || '-' },
  { key: 'rol_sistema', label: 'Rol Sistema', render: (f) => (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
      {f.tbl_usuarios?.tbl_roles?.nombre?.replace(/_/g, ' ') || '-'}
    </span>
  )},
  { key: 'rol_laboral', label: 'Rol Laboral' },
  { key: 'fecha_ingreso', label: 'Fecha Ingreso', render: (f) => formatearFecha(f.fecha_ingreso) },
];

const badgeEstado = (estado) => {
  const estilos = {
    [ESTADO_ASISTENCIA.PRESENTE]: 'bg-emerald-500/20 text-emerald-600',
    [ESTADO_ASISTENCIA.AUSENTE]: 'bg-red-500/20 text-red-600',
    [ESTADO_ASISTENCIA.TARDANZA]: 'bg-yellow-500/20 text-yellow-600',
    [ESTADO_ASISTENCIA.PERMISO]: 'bg-blue-500/20 text-blue-600',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estilos[estado] || 'bg-steel-700 text-steel-300'}`}>
      {estado?.toUpperCase()}
    </span>
  );
};

export default function RRHH() {
  const { datos: empleados, cargando: cargandoEmpleados } = useCrud('/rrhh/empleados');
  const [tab, setTab] = useState('empleados');

  // Asistencia state
  const [mesActual, setMesActual] = useState(() => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  });
  const [resumenAsistencia, setResumenAsistencia] = useState([]);
  const [cargandoResumen, setCargandoResumen] = useState(false);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [detalleEmpleado, setDetalleEmpleado] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [modalAsistencia, setModalAsistencia] = useState(false);
  const [formAsistencia, setFormAsistencia] = useState({ empleado_id: '', fecha: '', estado: ESTADO_ASISTENCIA.PRESENTE });

  // Tardanza/Bono state
  const [modalTardanza, setModalTardanza] = useState(false);
  const [modalBono, setModalBono] = useState(false);
  const [formTardanza, setFormTardanza] = useState({ empleado_id: '', fecha: '', minutos: '', motivo: '' });
  const [formBono, setFormBono] = useState({ empleado_id: '', monto: '', descripcion: '', fecha: '' });

  // === RANKING STATE ===
  const [configRanking, setConfigRanking] = useState([]);
  const [editandoRanking, setEditandoRanking] = useState(false);
  const [rankingEditado, setRankingEditado] = useState([]);
  const [metaVentas, setMetaVentas] = useState({ monto_meta: '' });
  const [mesRanking, setMesRanking] = useState(() => {
    const hoy = new Date();
    return { mes: hoy.getMonth() + 1, anio: hoy.getFullYear() };
  });
  const [rankingData, setRankingData] = useState(null);
  const [cargandoRanking, setCargandoRanking] = useState(false);
  const [errorRanking, setErrorRanking] = useState(null);

  // ===========================================================================
  // Asistencia functions
  // ===========================================================================
  const cargarResumen = async (mes) => {
    setCargandoResumen(true);
    try {
      const { data } = await api.get('/rrhh/asistencia/resumen', { params: { mes } });
      setResumenAsistencia(Array.isArray(data) ? data : []);
    } catch { setResumenAsistencia([]); }
    finally { setCargandoResumen(false); }
  };

  const cargarDetalle = async (empId, mes) => {
    setCargandoDetalle(true);
    try {
      const { data } = await api.get(`/rrhh/asistencia/${empId}/detalle`, { params: { mes } });
      setDetalleEmpleado(data);
    } catch { setDetalleEmpleado(null); toast.error('Error al cargar detalle'); }
    finally { setCargandoDetalle(false); }
  };

  // ===========================================================================
  // Ranking functions
  // ===========================================================================
  const cargarConfigRanking = async () => {
    try {
      const { data } = await api.get('/rrhh/ranking/configuracion');
      setConfigRanking(Array.isArray(data) ? data : []);
    } catch { setConfigRanking([]); }
  };

  const guardarConfigRankingSubmit = async () => {
    try {
      const metricas = rankingEditado.map(r => ({ metrica: r.metrica, peso: parseFloat(r.peso) }));
      await api.post('/rrhh/ranking/configuracion', { metricas });
      toast.success('Configuracion de ranking guardada');
      setEditandoRanking(false);
      cargarConfigRanking();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const cargarMetaVentas = async (mes, anio) => {
    try {
      const { data } = await api.get('/rrhh/meta-ventas', { params: { mes, anio } });
      setMetaVentas({ monto_meta: data?.monto_meta || '' });
    } catch { setMetaVentas({ monto_meta: '' }); }
  };

  const guardarMeta = async () => {
    try {
      await api.post('/rrhh/meta-ventas', { mes: mesRanking.mes, anio: mesRanking.anio, monto_meta: parseFloat(metaVentas.monto_meta) });
      toast.success('Meta de ventas guardada');
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const cargarRankingData = async (mes, anio) => {
    setCargandoRanking(true);
    setErrorRanking(null);
    try {
      const { data } = await api.get('/rrhh/ranking', { params: { mes, anio } });
      setRankingData(data);
    } catch (err) {
      // El motivo habitual es no tener esquema de comisiones activo: el ranking
      // se apoya en el mismo filtro de ventas, así que sin esquema no hay base.
      setErrorRanking(err.response?.data?.error || 'No se pudo calcular el ranking.');
      setRankingData(null);
    } finally { setCargandoRanking(false); }
  };

  // ===========================================================================
  // Effects
  // ===========================================================================
  useEffect(() => {
    if (tab === 'asistencia') {
      cargarResumen(mesActual);
      setEmpleadoSeleccionado(null);
      setDetalleEmpleado(null);
    }
    if (tab === 'ranking') {
      cargarConfigRanking();
      cargarMetaVentas(mesRanking.mes, mesRanking.anio);
      cargarRankingData(mesRanking.mes, mesRanking.anio);
    }
  }, [tab]);

  useEffect(() => {
    if (tab === 'asistencia') {
      cargarResumen(mesActual);
      setEmpleadoSeleccionado(null);
      setDetalleEmpleado(null);
    }
  }, [mesActual]);

  useEffect(() => {
    if (tab === 'ranking') {
      cargarMetaVentas(mesRanking.mes, mesRanking.anio);
      cargarRankingData(mesRanking.mes, mesRanking.anio);
    }
  }, [mesRanking]);

  // ===========================================================================
  // Helpers
  // ===========================================================================
  const cambiarMes = (delta) => {
    const [anio, mes] = mesActual.split('-').map(Number);
    const fecha = new Date(anio, mes - 1 + delta, 1);
    setMesActual(`${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`);
    setEmpleadoSeleccionado(null);
    setDetalleEmpleado(null);
  };

  const mesLabel = () => {
    const [anio, mes] = mesActual.split('-').map(Number);
    return `${MESES[mes - 1]} ${anio}`;
  };

  const cambiarMesRanking = (delta) => {
    setMesRanking(prev => {
      const fecha = new Date(prev.anio, prev.mes - 1 + delta, 1);
      return { mes: fecha.getMonth() + 1, anio: fecha.getFullYear() };
    });
  };

  const seleccionarEmpleado = (emp) => {
    if (empleadoSeleccionado === emp.id) {
      setEmpleadoSeleccionado(null);
      setDetalleEmpleado(null);
      return;
    }
    setEmpleadoSeleccionado(emp.id);
    cargarDetalle(emp.id, mesActual);
  };

  const registrarAsistenciaSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/rrhh/asistencia', {
        empleado_id: parseInt(formAsistencia.empleado_id),
        fecha: formAsistencia.fecha,
        estado: formAsistencia.estado,
      });
      toast.success('Asistencia registrada');
      setModalAsistencia(false);
      cargarResumen(mesActual);
      if (empleadoSeleccionado) cargarDetalle(empleadoSeleccionado, mesActual);
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const registrarTardanza = async (e) => {
    e.preventDefault();
    try {
      await api.post('/rrhh/tardanza', {
        employee_id: parseInt(formTardanza.empleado_id),
        fecha: formTardanza.fecha,
        minutos_tarde: parseInt(formTardanza.minutos),
      });
      toast.success('Tardanza registrada');
      setModalTardanza(false);
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const registrarBono = async (e) => {
    e.preventDefault();
    try {
      await api.post('/rrhh/bono', {
        employee_id: parseInt(formBono.empleado_id),
        fecha: formBono.fecha,
        monto: parseFloat(formBono.monto),
        descripcion: formBono.descripcion,
      });
      toast.success('Bono registrado');
      setModalBono(false);
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  // ===========================================================================
  // Render
  // ===========================================================================
  return (
    <div>
      <h1 className="text-2xl font-bold font-display tracking-wider text-steel-100 mb-6">Recursos Humanos</h1>
      <Tabs tabs={TABS_RRHH} tabActual={tab} onChange={setTab} />

      {/* ================================================================= */}
      {/* EMPLEADOS TAB                                                     */}
      {/* ================================================================= */}
      {tab === 'empleados' && (
        <div>
          <div className="bg-steel-900/30 border border-steel-700/50 rounded-lg p-3 mb-4">
            <p className="text-sm text-steel-400">
              Los empleados se registran automaticamente al crear un usuario con rol distinto a Cliente desde la seccion de Usuarios.
            </p>
          </div>
          <div className="card">
            <TablaGenerica columnas={colEmpleados} datos={empleados} cargando={cargandoEmpleados} vacio="No hay empleados registrados." />
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* ASISTENCIA TAB                                                    */}
      {/* ================================================================= */}
      {tab === 'asistencia' && (
        <div>
          <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
            <div className="flex items-center gap-3">
              <button onClick={() => cambiarMes(-1)} className="p-2 rounded-lg bg-steel-800 hover:bg-steel-700 text-steel-300 transition-colors">
                <HiOutlineChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold text-steel-100 min-w-[180px] text-center">{mesLabel()}</h2>
              <button onClick={() => cambiarMes(1)} className="p-2 rounded-lg bg-steel-800 hover:bg-steel-700 text-steel-300 transition-colors">
                <HiOutlineChevronRight className="w-5 h-5" />
              </button>
            </div>
            <button onClick={() => { setFormAsistencia({ empleado_id: '', fecha: '', estado: ESTADO_ASISTENCIA.PRESENTE }); setModalAsistencia(true); }} className="btn-primary flex items-center gap-2">
              <HiOutlinePlus className="w-4 h-4" /> Registrar Asistencia
            </button>
          </div>

          <div className="card">
            {cargandoResumen ? (
              <div className="text-center py-8 text-steel-400">Cargando...</div>
            ) : resumenAsistencia.length === 0 ? (
              <div className="text-center py-8 text-steel-500">No hay empleados registrados.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-steel-800">
                      <th className="text-left py-3 px-4 text-steel-400 font-medium">Empleado</th>
                      <th className="text-left py-3 px-4 text-steel-400 font-medium">Rol</th>
                      <th className="text-center py-3 px-2 text-emerald-600 font-medium">Presente</th>
                      <th className="text-center py-3 px-2 text-red-600 font-medium">Ausente</th>
                      <th className="text-center py-3 px-2 text-yellow-600 font-medium">Tardanza</th>
                      <th className="text-center py-3 px-2 text-blue-600 font-medium">Permiso</th>
                      <th className="text-center py-3 px-2 text-steel-400 font-medium">Total Dias</th>
                      <th className="text-center py-3 px-2 text-orange-600 font-medium">Min. Tard.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumenAsistencia.map(emp => (
                      <tr key={emp.id} onClick={() => seleccionarEmpleado(emp)}
                        className={`border-b border-steel-800/50 cursor-pointer transition-colors ${empleadoSeleccionado === emp.id ? 'bg-primary-500/10' : 'hover:bg-steel-800/50'}`}>
                        <td className="py-3 px-4 text-steel-100 font-medium">{emp.nombre}</td>
                        <td className="py-3 px-4 text-steel-400">{emp.rol_laboral}</td>
                        <td className="py-3 px-2 text-center"><span className="text-emerald-600 font-bold">{emp.dias_presente}</span></td>
                        <td className="py-3 px-2 text-center"><span className={`font-bold ${emp.dias_ausente > 0 ? 'text-red-600' : 'text-steel-500'}`}>{emp.dias_ausente}</span></td>
                        <td className="py-3 px-2 text-center"><span className={`font-bold ${emp.dias_tardanza > 0 ? 'text-yellow-600' : 'text-steel-500'}`}>{emp.dias_tardanza}</span></td>
                        <td className="py-3 px-2 text-center"><span className={`font-bold ${emp.dias_permiso > 0 ? 'text-blue-600' : 'text-steel-500'}`}>{emp.dias_permiso}</span></td>
                        <td className="py-3 px-2 text-center text-steel-300 font-medium">{emp.total_registros}</td>
                        <td className="py-3 px-2 text-center"><span className={`font-bold ${emp.minutos_tardanza_acumulados > 0 ? 'text-orange-600' : 'text-steel-500'}`}>{emp.minutos_tardanza_acumulados}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {empleadoSeleccionado && (
            <div className="card mt-4">
              {cargandoDetalle ? (
                <div className="text-center py-6 text-steel-400">Cargando detalle...</div>
              ) : detalleEmpleado ? (
                <div>
                  <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                    <h3 className="text-lg font-semibold text-steel-100">{detalleEmpleado.empleado.nombre} — {mesLabel()}</h3>
                    <button onClick={() => { setEmpleadoSeleccionado(null); setDetalleEmpleado(null); }} className="text-sm text-steel-400 hover:text-steel-200">Cerrar</button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-emerald-600">{detalleEmpleado.resumen.dias_presente}</div>
                      <div className="text-xs text-emerald-600/70">Presente</div>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-red-600">{detalleEmpleado.resumen.dias_ausente}</div>
                      <div className="text-xs text-red-600/70">Ausente</div>
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-yellow-600">{detalleEmpleado.resumen.dias_tardanza}</div>
                      <div className="text-xs text-yellow-600/70">Tardanza</div>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600">{detalleEmpleado.resumen.dias_permiso}</div>
                      <div className="text-xs text-blue-600/70">Permiso</div>
                    </div>
                    <div className="bg-steel-800 border border-steel-700 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-steel-200">{detalleEmpleado.resumen.total_registros}</div>
                      <div className="text-xs text-steel-400">Total Dias</div>
                    </div>
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-orange-600">{detalleEmpleado.resumen.minutos_tardanza_acumulados}</div>
                      <div className="text-xs text-orange-600/70">Min. Tardanza</div>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-emerald-600">{formatearMoneda(detalleEmpleado.resumen.total_bonos)}</div>
                      <div className="text-xs text-emerald-600/70">Bonos</div>
                    </div>
                  </div>

                  <h4 className="text-sm font-medium text-steel-300 mb-2">Registros Diarios</h4>
                  {detalleEmpleado.asistencias.length === 0 ? (
                    <p className="text-sm text-steel-500 py-2">Sin registros de asistencia este mes.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-steel-800"><th className="text-left py-2 px-3 text-steel-400">Fecha</th><th className="text-left py-2 px-3 text-steel-400">Estado</th></tr></thead>
                        <tbody>{detalleEmpleado.asistencias.map(a => (
                          <tr key={a.id} className="border-b border-steel-800/30"><td className="py-2 px-3 text-steel-200">{formatearFecha(a.fecha)}</td><td className="py-2 px-3">{badgeEstado(a.estado)}</td></tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}

                  {detalleEmpleado.marcaciones && detalleEmpleado.marcaciones.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-steel-300 mb-2">Marcaciones QR (Ingreso / Salida)</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b border-steel-800"><th className="text-left py-2 px-3 text-steel-400">Fecha y Hora</th><th className="text-left py-2 px-3 text-steel-400">Tipo</th></tr></thead>
                          <tbody>{detalleEmpleado.marcaciones.map(m => (
                            <tr key={m.id} className="border-b border-steel-800/30">
                              <td className="py-2 px-3 text-steel-200">{formatearFechaHora(m.fecha_hora)}</td>
                              <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.tipo === 'ingreso' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-amber-500/20 text-amber-600'}`}>{m.tipo === 'ingreso' ? 'INGRESO' : 'SALIDA'}</span></td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {detalleEmpleado.tardanzas.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-steel-300 mb-2">Tardanzas del Mes</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b border-steel-800"><th className="text-left py-2 px-3 text-steel-400">Fecha</th><th className="text-left py-2 px-3 text-steel-400">Minutos</th></tr></thead>
                          <tbody>{detalleEmpleado.tardanzas.map(t => (
                            <tr key={t.id} className="border-b border-steel-800/30"><td className="py-2 px-3 text-steel-200">{formatearFecha(t.fecha)}</td><td className="py-2 px-3 text-orange-600 font-medium">{t.minutos_tarde} min</td></tr>
                          ))}</tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {detalleEmpleado.bonos.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-steel-300 mb-2">Bonos del Mes</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b border-steel-800"><th className="text-left py-2 px-3 text-steel-400">Fecha</th><th className="text-left py-2 px-3 text-steel-400">Monto</th><th className="text-left py-2 px-3 text-steel-400">Descripcion</th></tr></thead>
                          <tbody>{detalleEmpleado.bonos.map(b => (
                            <tr key={b.id} className="border-b border-steel-800/30"><td className="py-2 px-3 text-steel-200">{formatearFecha(b.fecha)}</td><td className="py-2 px-3 text-emerald-600 font-medium">{formatearMoneda(b.monto)}</td><td className="py-2 px-3 text-steel-300">{b.descripcion || '-'}</td></tr>
                          ))}</tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TARDANZAS / BONOS TAB                                             */}
      {/* ================================================================= */}
      {tab === 'tardanzas' && (
        <div>
          <div className="flex justify-end gap-2 mb-4">
            <button onClick={() => { setFormTardanza({ empleado_id: '', fecha: '', minutos: '', motivo: '' }); setModalTardanza(true); }} className="btn-secondary flex items-center gap-2">
              <HiOutlineClock className="w-4 h-4" /> Registrar Tardanza
            </button>
            <button onClick={() => { setFormBono({ empleado_id: '', monto: '', descripcion: '', fecha: '' }); setModalBono(true); }} className="btn-primary flex items-center gap-2">
              <HiOutlineGift className="w-4 h-4" /> Registrar Bono
            </button>
          </div>
          <div className="card">
            <p className="text-sm text-steel-400">Selecciona un empleado en la pestana de Asistencia para ver sus tardanzas y bonos registrados.</p>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* COMISIONES TAB — liquidación con el esquema del Constructor       */}
      {/* ================================================================= */}
      {tab === 'comisiones' && <LiquidacionComisiones />}

      {/* ================================================================= */}
      {/* RANKING TAB                                                       */}
      {/* ================================================================= */}
      {tab === 'constructor' && <ConstructorComisiones />}

      {tab === 'ranking' && (
        <div className="space-y-4">
          {/* Configuracion de pesos */}
          <div className="card">
            <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
              <div>
                <h3 className="text-sm font-semibold text-steel-100">Pesos del Ranking (deben sumar 100%)</h3>
                <p className="text-xs text-steel-400 mt-0.5">
                  Cuánto vendió y a cuántos clientes distintos le vendió, mitad y mitad.
                </p>
              </div>
              {!editandoRanking ? (
                <button onClick={() => {
                  setRankingEditado(configRanking.length > 0
                    ? configRanking.map(r => ({ metrica: r.metrica, peso: parseFloat(r.peso) }))
                    : METRICAS_RANKING.map(m => ({ metrica: m.key, peso: m.peso_defecto })));
                  setEditandoRanking(true);
                }} className="text-xs text-blue-600 hover:text-blue-700">Editar</button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={guardarConfigRankingSubmit} className="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded hover:bg-emerald-200">Guardar</button>
                  <button onClick={() => setEditandoRanking(false)} className="text-xs text-steel-400 hover:text-steel-200">Cancelar</button>
                </div>
              )}
            </div>

            {editandoRanking ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {rankingEditado.map((r, i) => (
                  <div key={r.metrica} className="bg-steel-900/50 rounded-lg p-3">
                    <label className="block text-xs text-steel-400 mb-1">{etiquetaMetricaRanking(r.metrica)}</label>
                    <div className="flex items-center gap-1">
                      <input type="number" step="1" min="0" max="100" className="input-field w-20 text-sm" value={r.peso} onChange={e => { const arr = [...rankingEditado]; arr[i].peso = e.target.value; setRankingEditado(arr); }} />
                      <span className="text-sm text-steel-400">%</span>
                    </div>
                  </div>
                ))}
                <div className="flex items-end pb-3">
                  <span className={`text-sm font-bold ${rankingEditado.reduce((s, r) => s + (parseFloat(r.peso) || 0), 0) === 100 ? 'text-emerald-600' : 'text-red-600'}`}>
                    Total: {rankingEditado.reduce((s, r) => s + (parseFloat(r.peso) || 0), 0)}%
                  </span>
                </div>
              </div>
            ) : configRanking.length === 0 ? (
              <p className="text-sm text-steel-500">No hay configuracion de ranking. Haz clic en Editar.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {configRanking.map(r => (
                  <div key={r.metrica} className="bg-steel-900/50 rounded-lg p-3 text-center">
                    <div className="text-xs text-steel-400">{etiquetaMetricaRanking(r.metrica)}</div>
                    <div className="text-xl font-bold text-primary-600">{r.peso}%</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Meta de ventas */}
          <div className="card">
            <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
              <h3 className="text-sm font-semibold text-steel-100">Meta de Ventas - {MESES[mesRanking.mes - 1]} {mesRanking.anio}</h3>
            </div>
            <div className="flex items-center gap-3">
              <input type="number" step="0.01" min="0" className="input-field w-48" placeholder="Meta en soles" value={metaVentas.monto_meta} onChange={e => setMetaVentas({ monto_meta: e.target.value })} />
              <button onClick={guardarMeta} className="text-xs bg-emerald-100 text-emerald-600 px-3 py-1.5 rounded hover:bg-emerald-200">Guardar Meta</button>
              {metaVentas.monto_meta && <span className="text-sm text-steel-400">Meta: {formatearMoneda(metaVentas.monto_meta)}</span>}
            </div>
          </div>

          {/* Ranking mensual */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => cambiarMesRanking(-1)} className="p-2 rounded-lg bg-steel-800 hover:bg-steel-700 text-steel-300">
                <HiOutlineChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold text-steel-100 min-w-[180px] text-center">
                {MESES[mesRanking.mes - 1]} {mesRanking.anio}
              </h2>
              <button onClick={() => cambiarMesRanking(1)} className="p-2 rounded-lg bg-steel-800 hover:bg-steel-700 text-steel-300">
                <HiOutlineChevronRight className="w-5 h-5" />
              </button>
              <button onClick={() => cargarRankingData(mesRanking.mes, mesRanking.anio)} className="text-xs bg-steel-800 text-steel-300 px-2 py-1 rounded hover:bg-steel-700 flex items-center gap-1">
                <HiOutlineRefresh className="w-3.5 h-3.5" /> Actualizar
              </button>
            </div>

            {cargandoRanking ? (
              <div className="text-center py-8 text-steel-400">Calculando ranking...</div>
            ) : errorRanking ? (
              <div className="text-center py-8 text-amber-600 text-sm">{errorRanking}</div>
            ) : !rankingData?.ranking?.length ? (
              <div className="text-center py-8 text-steel-500">No hay datos de ranking para este mes.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-steel-800">
                      <th className="text-center py-2 px-2 text-steel-400 w-12">#</th>
                      <th className="text-left py-2 px-2 text-steel-400">Vendedor</th>
                      <th className="text-right py-2 px-2 text-steel-400">Venta Bruta</th>
                      <th className="text-center py-2 px-2 text-steel-400">Clientes</th>
                      <th className="text-center py-2 px-2 text-steel-400">Operaciones</th>
                      <th className="text-right py-2 px-2 text-primary-600 font-semibold">Puntaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankingData.ranking.map((r, i) => (
                      <tr key={i} className={`border-b border-steel-800/30 ${i === 0 ? 'bg-yellow-500/5' : i === 1 ? 'bg-steel-500/5' : i === 2 ? 'bg-amber-500/5' : ''}`}>
                        <td className="py-2 px-2 text-center">
                          <span className={`font-bold text-lg ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-steel-300' : i === 2 ? 'text-amber-600' : 'text-steel-500'}`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-steel-100 font-medium">{r.vendedor_nombre}</td>
                        <td className="py-2 px-2 text-right text-steel-200">{formatearMoneda(r.venta_bruta)}</td>
                        <td className="py-2 px-2 text-center text-steel-200">{r.clientes}</td>
                        <td className="py-2 px-2 text-center text-steel-400">{r.num_operaciones}</td>
                        <td className="py-2 px-2 text-right text-primary-600 font-bold">{parseFloat(r.puntaje_total).toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rankingData.meta_ventas && (
                  <div className="mt-3 text-sm text-steel-400">
                    Meta del mes: <span className="text-primary-600 font-medium">{formatearMoneda(rankingData.meta_ventas)}</span>
                  </div>
                )}
                <p className="mt-3 text-xs text-steel-500">
                  El puntaje es la participación del vendedor sobre el total del equipo, ponderada con los pesos de
                  arriba. Cuentan las mismas ventas que usa la liquidación de comisiones
                  {rankingData.esquema?.nombre ? ` (esquema ${rankingData.esquema.nombre})` : ''}.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODALES                                                           */}
      {/* ================================================================= */}
      <Modal abierto={modalAsistencia} cerrar={() => setModalAsistencia(false)} titulo="Registrar Asistencia">
        <form onSubmit={registrarAsistenciaSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-steel-200 mb-1">Empleado</label>
            <select className="input-field" value={formAsistencia.empleado_id} onChange={e => setFormAsistencia({ ...formAsistencia, empleado_id: e.target.value })} required>
              <option value="">Seleccionar</option>
              {empleados.map(emp => <option key={emp.id} value={emp.id}>{emp.tbl_usuarios?.nombres || emp.id}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium text-steel-200 mb-1">Fecha</label>
            <input type="date" className="input-field" value={formAsistencia.fecha} onChange={e => setFormAsistencia({ ...formAsistencia, fecha: e.target.value })} required />
          </div>
          <div><label className="block text-sm font-medium text-steel-200 mb-1">Estado</label>
            <select className="input-field" value={formAsistencia.estado} onChange={e => setFormAsistencia({ ...formAsistencia, estado: e.target.value })}>
              <option value={ESTADO_ASISTENCIA.PRESENTE}>Presente</option>
              <option value={ESTADO_ASISTENCIA.AUSENTE}>Ausente</option>
              <option value={ESTADO_ASISTENCIA.TARDANZA}>Tardanza</option>
              <option value={ESTADO_ASISTENCIA.PERMISO}>Permiso</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalAsistencia(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Registrar</button>
          </div>
        </form>
      </Modal>

      <Modal abierto={modalTardanza} cerrar={() => setModalTardanza(false)} titulo="Registrar Tardanza">
        <form onSubmit={registrarTardanza} className="space-y-4">
          <div><label className="block text-sm font-medium text-steel-200 mb-1">Empleado</label>
            <select className="input-field" value={formTardanza.empleado_id} onChange={e => setFormTardanza({ ...formTardanza, empleado_id: e.target.value })} required>
              <option value="">Seleccionar</option>
              {empleados.map(emp => <option key={emp.id} value={emp.id}>{emp.tbl_usuarios?.nombres || emp.id}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium text-steel-200 mb-1">Fecha</label>
            <input type="date" className="input-field" value={formTardanza.fecha} onChange={e => setFormTardanza({ ...formTardanza, fecha: e.target.value })} required />
          </div>
          <div><label className="block text-sm font-medium text-steel-200 mb-1">Minutos</label>
            <input type="number" className="input-field" value={formTardanza.minutos} onChange={e => setFormTardanza({ ...formTardanza, minutos: e.target.value })} required min="1" />
          </div>
          <div><label className="block text-sm font-medium text-steel-200 mb-1">Motivo</label>
            <input className="input-field" value={formTardanza.motivo} onChange={e => setFormTardanza({ ...formTardanza, motivo: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalTardanza(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Registrar</button>
          </div>
        </form>
      </Modal>

      <Modal abierto={modalBono} cerrar={() => setModalBono(false)} titulo="Registrar Bono">
        <form onSubmit={registrarBono} className="space-y-4">
          <div><label className="block text-sm font-medium text-steel-200 mb-1">Empleado</label>
            <select className="input-field" value={formBono.empleado_id} onChange={e => setFormBono({ ...formBono, empleado_id: e.target.value })} required>
              <option value="">Seleccionar</option>
              {empleados.map(emp => <option key={emp.id} value={emp.id}>{emp.tbl_usuarios?.nombres || emp.id}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium text-steel-200 mb-1">Monto</label>
            <input type="number" step="0.01" className="input-field" value={formBono.monto} onChange={e => setFormBono({ ...formBono, monto: e.target.value })} required min="0.01" />
          </div>
          <div><label className="block text-sm font-medium text-steel-200 mb-1">Descripcion</label>
            <input className="input-field" value={formBono.descripcion} onChange={e => setFormBono({ ...formBono, descripcion: e.target.value })} required />
          </div>
          <div><label className="block text-sm font-medium text-steel-200 mb-1">Fecha</label>
            <input type="date" className="input-field" value={formBono.fecha} onChange={e => setFormBono({ ...formBono, fecha: e.target.value })} required />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalBono(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Registrar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
