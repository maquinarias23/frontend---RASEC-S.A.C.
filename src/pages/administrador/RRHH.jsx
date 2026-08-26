import { useState, useEffect } from 'react';
import {
  HiOutlinePlus, HiOutlineUserGroup, HiOutlineClock, HiOutlineCash,
  HiOutlineGift, HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineChevronDown,
  HiOutlineSave, HiOutlineRefresh, HiOutlineChartBar, HiOutlineTrash, HiOutlineDownload,
  HiOutlineInformationCircle, HiOutlineAdjustments,
} from 'react-icons/hi';
import useCrud from '../../hooks/useCrud';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import TablaGenerica from '../../components/ui/TablaGenerica';
import Modal from '../../components/ui/Modal';
import Tabs from '../../components/ui/Tabs';
import ConstructorComisiones from '../../components/rrhh/ConstructorComisiones';
import { formatearFecha, formatearFechaHora, formatearMoneda, formatearFechaHoraPrecisa } from '../../utils/formato';
import { ESTADO_ASISTENCIA, MESES } from '../../config/constants';

const TABS_RRHH = [
  { key: 'empleados', label: 'Empleados', icono: <HiOutlineUserGroup className="w-4 h-4 inline" /> },
  { key: 'asistencia', label: 'Asistencia', icono: <HiOutlineClock className="w-4 h-4 inline" /> },
  { key: 'tardanzas', label: 'Tardanzas / Bonos', icono: <HiOutlineGift className="w-4 h-4 inline" /> },
  { key: 'comisiones', label: 'Comisiones', icono: <HiOutlineCash className="w-4 h-4 inline" /> },
  { key: 'constructor', label: 'Constructor de Comisiones', icono: <HiOutlineAdjustments className="w-4 h-4 inline" /> },
  { key: 'ranking', label: 'Ranking', icono: <HiOutlineChartBar className="w-4 h-4 inline" /> },
];

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

  // === COMISIONES STATE ===
  const [mesComision, setMesComision] = useState(() => {
    const hoy = new Date();
    return { mes: hoy.getMonth() + 1, anio: hoy.getFullYear() };
  });
  const [rangosComision, setRangosComision] = useState([]);
  const [cargandoRangos, setCargandoRangos] = useState(false);
  const [editandoRangos, setEditandoRangos] = useState(false);
  const [rangosEditados, setRangosEditados] = useState([]);
  const [tipoComision, setTipoComision] = useState('mensual');
  const [semanaComision, setSemanaComision] = useState(1);
  const [previewComisiones, setPreviewComisiones] = useState(null);
  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [guardandoComisiones, setGuardandoComisiones] = useState(false);
  const [historialComisiones, setHistorialComisiones] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [vendedoresExpandidos, setVendedoresExpandidos] = useState({});

  const exportarComisionesExcel = () => {
    if (!previewComisiones?.detalles?.length) return;
    import('xlsx').then(XLSX => {
      const filas = [];
      const periodo = tipoComision === 'semanal'
        ? `Semana ${semanaComision} - ${MESES[mesComision.mes - 1]} ${mesComision.anio}`
        : `${MESES[mesComision.mes - 1]} ${mesComision.anio}`;

      for (const vendedor of previewComisiones.detalles) {
        // Fila de encabezado del vendedor
        filas.push({ Vendedor: vendedor.vendedor_nombre, Fecha: '', Cliente: '', Producto: '', Destino: '', Venta: '', Costo: '', Flete: '', Parihuela: '', Regalos: '', 'Costo Total': '', Ganancia: '', '% Margen': '' });
        for (const v of vendedor.ventas) {
          filas.push({
            Vendedor: '',
            Fecha: v.fecha ? new Date(v.fecha).toLocaleDateString('es-PE') : '',
            Cliente: v.cliente,
            Producto: v.productos,
            Destino: v.destino,
            Venta: Number(v.monto_venta) || 0,
            Costo: Number(v.costo_productos) || 0,
            Flete: Number(v.costo_flete) || 0,
            Parihuela: Number(v.costo_parihuela) || 0,
            Regalos: Number(v.costo_regalos) || 0,
            'Costo Total': Number(v.costo_total) || 0,
            Ganancia: Number(v.ganancia) || 0,
            '% Margen': `${(v.margen * 100).toFixed(1)}%`,
          });
        }
        // Fila de totales
        filas.push({
          Vendedor: '', Fecha: '', Cliente: '', Producto: '', Destino: 'TOTALES',
          Venta: Number(vendedor.totales.venta_bruta) || 0,
          Costo: Number(vendedor.totales.costo_productos) || 0,
          Flete: Number(vendedor.totales.costo_flete_total) || 0,
          Parihuela: Number(vendedor.totales.costo_parihuela_total) || 0,
          Regalos: Number(vendedor.totales.costo_regalos_total) || 0,
          'Costo Total': Number(vendedor.totales.costo_total) || 0,
          Ganancia: Number(vendedor.totales.ganancia_total) || 0,
          '% Margen': `${(vendedor.totales.margen_total * 100).toFixed(1)}%`,
        });
        // Fila de comisión
        filas.push({
          Vendedor: '', Fecha: '', Cliente: '', Producto: '', Destino: '',
          Venta: '', Costo: '', Flete: '', Parihuela: '', Regalos: '',
          'Costo Total': `Comision (${vendedor.totales.porcentaje_aplicado}%):`,
          Ganancia: Number(vendedor.totales.comision_total) || 0,
          '% Margen': '',
        });
        // Fila vacía separadora
        filas.push({});
      }

      // Resumen general
      filas.push({
        Vendedor: 'RESUMEN GENERAL', Fecha: '', Cliente: '', Producto: '', Destino: '',
        Venta: '', Costo: '', Flete: '', Parihuela: '', Regalos: '',
        'Costo Total': 'Ganancia total:',
        Ganancia: Number(previewComisiones.total_ganancia) || 0,
        '% Margen': '',
      });
      filas.push({
        Vendedor: '', Fecha: '', Cliente: '', Producto: '', Destino: '',
        Venta: '', Costo: '', Flete: '', Parihuela: '', Regalos: '',
        'Costo Total': 'Total comisiones:',
        Ganancia: Number(previewComisiones.total_comisiones) || 0,
        '% Margen': '',
      });

      const ws = XLSX.utils.json_to_sheet(filas);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Comisiones');

      const nombreArchivo = `Comisiones_${periodo.replace(/ /g, '_')}.xlsx`;
      XLSX.writeFile(wb, nombreArchivo);
    });
  };

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
  // Comisiones functions
  // ===========================================================================
  const cargarRangos = async () => {
    setCargandoRangos(true);
    try {
      const { data } = await api.get('/rrhh/rangos-comision');
      setRangosComision(Array.isArray(data) ? data : []);
    } catch { setRangosComision([]); }
    finally { setCargandoRangos(false); }
  };

  const guardarRangos = async () => {
    try {
      const rangosLimpios = rangosEditados.map(r => ({
        rango_desde: parseFloat(r.rango_desde),
        rango_hasta: r.rango_hasta === '' || r.rango_hasta === null ? null : parseFloat(r.rango_hasta),
        porcentaje: parseFloat(r.porcentaje),
      }));
      await api.post('/rrhh/rangos-comision', { rangos: rangosLimpios });
      toast.success('Rangos de comision guardados');
      setEditandoRangos(false);
      cargarRangos();
    } catch (err) { toast.error(err.response?.data?.error || 'Error al guardar rangos'); }
  };

  const cargarPreview = async (mes, anio, tipo, semana) => {
    setCargandoPreview(true);
    try {
      const params = { mes, anio, tipo: tipo || tipoComision };
      if ((tipo || tipoComision) === 'semanal') params.semana = semana || semanaComision;
      const { data } = await api.get('/rrhh/comisiones/preview', { params });
      setPreviewComisiones(data);
    } catch (err) { toast.error(err.response?.data?.error || 'Error al cargar preview'); setPreviewComisiones(null); }
    finally { setCargandoPreview(false); }
  };

  const guardarComisionesMes = async () => {
    setGuardandoComisiones(true);
    try {
      await api.post('/rrhh/comisiones/guardar', { mes: mesComision.mes, anio: mesComision.anio });
      toast.success('Comisiones guardadas exitosamente');
      cargarPreview(mesComision.mes, mesComision.anio);
      cargarHistorial();
    } catch (err) { toast.error(err.response?.data?.error || 'Error al guardar'); }
    finally { setGuardandoComisiones(false); }
  };

  const cargarHistorial = async () => {
    setCargandoHistorial(true);
    try {
      const { data } = await api.get('/rrhh/comisiones');
      setHistorialComisiones(Array.isArray(data) ? data : []);
    } catch { setHistorialComisiones([]); }
    finally { setCargandoHistorial(false); }
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
    try {
      const { data } = await api.get('/rrhh/ranking', { params: { mes, anio } });
      setRankingData(data);
    } catch { setRankingData(null); }
    finally { setCargandoRanking(false); }
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
    if (tab === 'comisiones') {
      cargarRangos();
      cargarPreview(mesComision.mes, mesComision.anio, tipoComision, semanaComision);
      cargarHistorial();
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
    if (tab === 'comisiones') {
      cargarPreview(mesComision.mes, mesComision.anio, tipoComision, semanaComision);
    }
  }, [mesComision, tipoComision, semanaComision]);

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

  const cambiarMesComision = (delta) => {
    setMesComision(prev => {
      const fecha = new Date(prev.anio, prev.mes - 1 + delta, 1);
      return { mes: fecha.getMonth() + 1, anio: fecha.getFullYear() };
    });
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
      {/* COMISIONES TAB                                                    */}
      {/* ================================================================= */}
      {tab === 'comisiones' && (
        <div className="space-y-4">
          {/* Banner informativo: condiciones para que un vendedor reciba comisiones */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <HiOutlineInformationCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <h4 className="font-semibold text-blue-600 mb-2">Condiciones para que un vendedor reciba comisiones</h4>
                <ul className="space-y-1.5 text-steel-300 list-disc list-inside">
                  <li>
                    El vendedor debe registrar como mínimo{' '}
                    <span className="font-semibold text-steel-100">
                      {previewComisiones?.min_ventas_comision ?? '—'} ventas
                    </span>{' '}
                    en el período evaluado (mes o semana).
                  </li>
                  <li>
                    Solo cuentan las ventas con <span className="font-semibold text-steel-100">pago completo</span> y que <span className="font-semibold text-steel-100">no estén canceladas</span>.
                  </li>
                  <li>
                    La comisión se calcula sobre la <span className="font-semibold text-steel-100">Ganancia Total</span> (Venta − Costo de productos − Flete − Parihuela − Regalos).
                  </li>
                  <li>
                    El porcentaje aplicado se determina según el <span className="font-semibold text-steel-100">rango escalonado</span> configurado debajo, en función de la Ganancia Total acumulada del vendedor.
                  </li>
                  <li>
                    Si el vendedor no alcanza el mínimo de ventas, su comisión del período será <span className="font-semibold text-steel-100">0</span> aunque tenga ganancia.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Rangos de comision escalonada */}
          <div className="card">
            <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
              <h3 className="text-sm font-semibold text-steel-100">Rangos de Comision Escalonada</h3>
              {!editandoRangos ? (
                <button onClick={() => { setRangosEditados(rangosComision.length > 0 ? rangosComision.map(r => ({ ...r })) : [{ rango_desde: 0, rango_hasta: 2500, porcentaje: 0 }]); setEditandoRangos(true); }} className="text-xs text-blue-600 hover:text-blue-700">Editar</button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={guardarRangos} className="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded hover:bg-emerald-200">Guardar</button>
                  <button onClick={() => setEditandoRangos(false)} className="text-xs text-steel-400 hover:text-steel-200">Cancelar</button>
                </div>
              )}
            </div>

            {editandoRangos ? (
              <div className="space-y-2">
                {rangosEditados.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-steel-400 w-12">Desde</span>
                    <input type="number" step="0.01" className="input-field w-28" value={r.rango_desde} onChange={e => { const arr = [...rangosEditados]; arr[i].rango_desde = e.target.value; setRangosEditados(arr); }} />
                    <span className="text-steel-400 w-12">Hasta</span>
                    <input type="number" step="0.01" className="input-field w-28" placeholder="Sin limite" value={r.rango_hasta ?? ''} onChange={e => { const arr = [...rangosEditados]; arr[i].rango_hasta = e.target.value; setRangosEditados(arr); }} />
                    <span className="text-steel-400">=</span>
                    <input type="number" step="0.01" className="input-field w-20" value={r.porcentaje} onChange={e => { const arr = [...rangosEditados]; arr[i].porcentaje = e.target.value; setRangosEditados(arr); }} />
                    <span className="text-steel-400">%</span>
                    <button onClick={() => setRangosEditados(rangosEditados.filter((_, idx) => idx !== i))} className="text-red-600 hover:text-red-700" title="Eliminar"><HiOutlineTrash className="w-4 h-4" /></button>
                  </div>
                ))}
                <button onClick={() => setRangosEditados([...rangosEditados, { rango_desde: '', rango_hasta: '', porcentaje: '' }])} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1">
                  <HiOutlinePlus className="w-3 h-3" /> Agregar rango
                </button>
              </div>
            ) : cargandoRangos ? (
              <div className="text-sm text-steel-400">Cargando...</div>
            ) : rangosComision.length === 0 ? (
              <p className="text-sm text-steel-500">No hay rangos configurados. Haz clic en Editar para configurar.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-steel-800"><th className="text-left py-2 px-3 text-steel-400">Desde</th><th className="text-left py-2 px-3 text-steel-400">Hasta</th><th className="text-left py-2 px-3 text-steel-400">%</th></tr></thead>
                  <tbody>{rangosComision.map(r => (
                    <tr key={r.id} className="border-b border-steel-800/30">
                      <td className="py-2 px-3 text-steel-200">{formatearMoneda(r.rango_desde)}</td>
                      <td className="py-2 px-3 text-steel-200">{r.rango_hasta ? formatearMoneda(r.rango_hasta) : 'Sin limite'}</td>
                      <td className="py-2 px-3 text-primary-600 font-bold">{r.porcentaje}%</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>

          {/* Selector de mes + tipo (mensual/semanal) */}
          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <button onClick={() => cambiarMesComision(-1)} className="p-2 rounded-lg bg-steel-800 hover:bg-steel-700 text-steel-300">
                  <HiOutlineChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-semibold text-steel-100 min-w-[180px] text-center">
                  {MESES[mesComision.mes - 1]} {mesComision.anio}
                </h2>
                <button onClick={() => cambiarMesComision(1)} className="p-2 rounded-lg bg-steel-800 hover:bg-steel-700 text-steel-300">
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
                {tipoComision === 'semanal' && previewComisiones?.semanas_disponibles?.length > 0 && (
                  <select className="input-field text-xs py-1.5 w-auto" value={semanaComision} onChange={e => setSemanaComision(parseInt(e.target.value))}>
                    {previewComisiones.semanas_disponibles.map(s => (
                      <option key={s.numero} value={s.numero}>
                        Sem {s.numero} ({formatearFecha(s.inicio)} - {formatearFecha(s.fin)})
                      </option>
                    ))}
                  </select>
                )}
                <button onClick={() => cargarPreview(mesComision.mes, mesComision.anio)} className="text-xs bg-steel-800 text-steel-300 px-2 py-1.5 rounded hover:bg-steel-700 flex items-center gap-1">
                  <HiOutlineRefresh className="w-3.5 h-3.5" /> Recalcular
                </button>
              </div>

              <div className="flex items-center gap-2">
                {tipoComision === 'mensual' && (
                  <button onClick={guardarComisionesMes} disabled={guardandoComisiones || !previewComisiones?.detalles?.length} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                    {guardandoComisiones ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <HiOutlineSave className="w-4 h-4" />}
                    Guardar Comisiones
                  </button>
                )}
                <button onClick={exportarComisionesExcel} disabled={!previewComisiones?.detalles?.length} className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                  <HiOutlineDownload className="w-4 h-4" /> Exportar Excel
                </button>
              </div>
            </div>

            {previewComisiones?.guardado && tipoComision === 'mensual' && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4 text-sm">
                <span className="text-blue-600 font-medium">Este mes ya fue guardado</span>
                <span className="text-blue-400 ml-2">
                  por {previewComisiones.guardado.guardado_por || '?'} el {formatearFechaHoraPrecisa(previewComisiones.guardado.guardado_en)}
                </span>
                <span className="text-blue-400 ml-1">— Al guardar nuevamente se recalculara.</span>
              </div>
            )}

            {cargandoPreview ? (
              <div className="text-center py-8 text-steel-400">Calculando comisiones...</div>
            ) : !previewComisiones?.detalles?.length ? (
              <div className="text-center py-8 text-steel-500">
                No hay ventas para {tipoComision === 'semanal' ? `Semana ${semanaComision} de ` : ''}{MESES[mesComision.mes - 1]} {mesComision.anio}.
              </div>
            ) : (
              <div className="space-y-6">
                {previewComisiones.detalles.map((vendedor, vi) => (
                  <div key={vi} className="border border-steel-700/50 rounded-lg overflow-hidden">
                    {/* Cabecera del vendedor (clickeable para expandir/colapsar) */}
                    <button
                      type="button"
                      onClick={() => setVendedoresExpandidos((prev) => ({ ...prev, [vi]: !prev[vi] }))}
                      className="w-full bg-steel-800/60 px-4 py-2.5 flex items-center justify-between hover:bg-steel-700/60 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <HiOutlineChevronDown className={`w-4 h-4 text-steel-400 transition-transform ${vendedoresExpandidos[vi] ? '' : '-rotate-90'}`} />
                        <h4 className="text-sm font-bold text-steel-100">{vendedor.vendedor_nombre}</h4>
                        {!vendedor.totales.cumple_minimo_ventas && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-600 text-white font-extrabold uppercase tracking-wider">Sin minimo</span>
                        )}
                      </div>
                      <span className="text-xs text-steel-400">{vendedor.totales.cantidad_ventas} venta{vendedor.totales.cantidad_ventas !== 1 ? 's' : ''}</span>
                    </button>

                    {/* Tabla de ventas individuales (colapsable) */}
                    {vendedoresExpandidos[vi] && <div className="overflow-x-auto">
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
                          {vendedor.ventas.map((v, i) => (
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
                        {/* Fila de totales */}
                        <tfoot>
                          <tr className="border-t-2 border-steel-600 bg-steel-900/60">
                            <td colSpan={4} className="py-2 px-2 font-bold text-steel-100 text-xs">TOTALES</td>
                            <td className="py-2 px-2 text-right font-bold text-steel-100">{formatearMoneda(vendedor.totales.venta_bruta)}</td>
                            <td className="py-2 px-2 text-right font-medium text-steel-300">{formatearMoneda(vendedor.totales.costo_productos)}</td>
                            <td className="py-2 px-2 text-right font-medium text-steel-300">{formatearMoneda(vendedor.totales.costo_flete_total)}</td>
                            <td className="py-2 px-2 text-right font-medium text-steel-300">{formatearMoneda(vendedor.totales.costo_parihuela_total)}</td>
                            <td className="py-2 px-2 text-right font-medium text-steel-300">{formatearMoneda(vendedor.totales.costo_regalos_total)}</td>
                            <td className="py-2 px-2 text-right font-bold text-steel-200">{formatearMoneda(vendedor.totales.costo_total)}</td>
                            <td className={`py-2 px-2 text-right font-bold ${vendedor.totales.ganancia_total >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatearMoneda(vendedor.totales.ganancia_total)}</td>
                            <td className="py-2 px-2 text-right font-medium text-steel-300">{(vendedor.totales.margen_total * 100).toFixed(1)}%</td>
                          </tr>
                          <tr className="bg-steel-900/60">
                            <td colSpan={10} className="py-2 px-2 text-right text-xs font-semibold text-steel-300">
                              GANANCIA TOTAL: <span className="text-emerald-600">{formatearMoneda(vendedor.totales.ganancia_total)}</span>
                              <span className="mx-3 text-steel-600">|</span>
                              Comision ({vendedor.totales.porcentaje_aplicado}%):
                            </td>
                            <td colSpan={2} className="py-2 px-2 text-right font-bold text-primary-500 text-sm">
                              {formatearMoneda(vendedor.totales.comision_total)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>}
                  </div>
                ))}

                {/* Resumen general */}
                <div className="bg-steel-800/40 border border-steel-700/50 rounded-lg p-4 flex items-center justify-between">
                  <div className="text-sm text-steel-300">
                    <span className="font-medium text-steel-100">{previewComisiones.detalles.length}</span> vendedor{previewComisiones.detalles.length !== 1 ? 'es' : ''}
                    <span className="mx-2 text-steel-600">|</span>
                    Ganancia total: <span className="font-bold text-emerald-600">{formatearMoneda(previewComisiones.total_ganancia)}</span>
                  </div>
                  <div className="text-sm">
                    Total comisiones: <span className="font-bold text-primary-500 text-lg">{formatearMoneda(previewComisiones.total_comisiones)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Historial de comisiones guardadas */}
          <div className="card">
            <h3 className="text-sm font-semibold text-steel-100 mb-3">Historial de Comisiones Guardadas</h3>
            {cargandoHistorial ? (
              <div className="text-sm text-steel-400">Cargando...</div>
            ) : historialComisiones.length === 0 ? (
              <p className="text-sm text-steel-500">No hay comisiones guardadas aun.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-steel-800">
                      <th className="text-left py-2 px-3 text-steel-400">Periodo</th>
                      <th className="text-right py-2 px-3 text-steel-400">Utilidad Total</th>
                      <th className="text-right py-2 px-3 text-steel-400">Comisiones Total</th>
                      <th className="text-center py-2 px-3 text-steel-400">Vendedores</th>
                      <th className="text-left py-2 px-3 text-steel-400">Guardado por</th>
                      <th className="text-left py-2 px-3 text-steel-400">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialComisiones.map(h => (
                      <tr key={h.id} className="border-b border-steel-800/30">
                        <td className="py-2 px-3 text-steel-100 font-medium">{MESES[h.mes - 1]} {h.anio}</td>
                        <td className="py-2 px-3 text-right text-emerald-600">{formatearMoneda(h.total_utilidad)}</td>
                        <td className="py-2 px-3 text-right text-primary-600 font-bold">{formatearMoneda(h.total_comisiones)}</td>
                        <td className="py-2 px-3 text-center text-steel-300">{h.detalles?.length || 0}</td>
                        <td className="py-2 px-3 text-steel-300">{h.tbl_usuarios?.nombres || '-'}</td>
                        <td className="py-2 px-3 text-steel-400">{formatearFechaHoraPrecisa(h.guardado_en)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* RANKING TAB                                                       */}
      {/* ================================================================= */}
      {tab === 'constructor' && <ConstructorComisiones />}

      {tab === 'ranking' && (
        <div className="space-y-4">
          {/* Configuracion de pesos */}
          <div className="card">
            <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
              <h3 className="text-sm font-semibold text-steel-100">Pesos del Ranking (deben sumar 100%)</h3>
              {!editandoRanking ? (
                <button onClick={() => {
                  const defaultMetricas = [
                    { metrica: 'venta_bruta', peso: 30 },
                    { metrica: 'utilidad', peso: 30 },
                    { metrica: 'unidades', peso: 20 },
                    { metrica: 'margen', peso: 20 },
                  ];
                  setRankingEditado(configRanking.length > 0 ? configRanking.map(r => ({ metrica: r.metrica, peso: parseFloat(r.peso) })) : defaultMetricas);
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {rankingEditado.map((r, i) => (
                  <div key={r.metrica} className="bg-steel-900/50 rounded-lg p-3">
                    <label className="block text-xs text-steel-400 mb-1 capitalize">{r.metrica.replace(/_/g, ' ')}</label>
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {configRanking.map(r => (
                  <div key={r.metrica} className="bg-steel-900/50 rounded-lg p-3 text-center">
                    <div className="text-xs text-steel-400 capitalize">{r.metrica.replace(/_/g, ' ')}</div>
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
                      <th className="text-right py-2 px-2 text-steel-400">Utilidad</th>
                      <th className="text-center py-2 px-2 text-steel-400">Unidades</th>
                      <th className="text-right py-2 px-2 text-steel-400">Margen</th>
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
                        <td className="py-2 px-2 text-right text-emerald-600">{formatearMoneda(r.utilidad_total)}</td>
                        <td className="py-2 px-2 text-center text-steel-300">{r.cantidad_productos}</td>
                        <td className="py-2 px-2 text-right text-steel-300">{(parseFloat(r.margen) * 100).toFixed(1)}%</td>
                        <td className="py-2 px-2 text-right text-primary-600 font-bold">{parseFloat(r.puntaje_total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rankingData.meta_ventas && (
                  <div className="mt-3 text-sm text-steel-400">
                    Meta del mes: <span className="text-primary-600 font-medium">{formatearMoneda(rankingData.meta_ventas)}</span>
                  </div>
                )}
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
