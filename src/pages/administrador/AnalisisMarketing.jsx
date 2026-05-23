import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  HiOutlineCurrencyDollar, HiOutlineUserAdd, HiOutlineFilm,
  HiOutlinePhotograph, HiOutlineCalculator, HiOutlineCalendar,
  HiOutlinePencil, HiOutlineTrash, HiOutlinePlus, HiOutlineTrendingUp,
  HiOutlineChartBar,
} from 'react-icons/hi';
import Tabs from '../../components/ui/Tabs';
import TarjetaResumen from '../../components/ui/TarjetaResumen';
import DateRangePicker from '../../components/ui/DateRangePicker';
import TablaGenerica from '../../components/ui/TablaGenerica';
import Paginacion from '../../components/ui/Paginacion';
import Modal from '../../components/ui/Modal';
import DialogConfirmacion from '../../components/ui/DialogConfirmacion';
import {
  PLATAFORMA_MKT, PLATAFORMA_MKT_LABEL, PLATAFORMA_MKT_COLOR,
  DEFAULT_PARAMETROS_MKT, DIAS_SEMANA_ES,
} from '../../config/constants';

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'gasto_vendedor', label: 'Gasto por Vendedor' },
  { key: 'campanas', label: 'Campañas' },
  { key: 'metricas', label: 'Métricas' },
  { key: 'metricas_custom', label: 'Métricas Personalizadas' },
];

const COLORES_METRICA = [
  { value: '#3b82f6', label: 'Azul' },
  { value: '#10b981', label: 'Verde' },
  { value: '#f59e0b', label: 'Amarillo' },
  { value: '#ef4444', label: 'Rojo' },
  { value: '#8b5cf6', label: 'Violeta' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#f97316', label: 'Naranja' },
];

const PLATAFORMAS = Object.entries(PLATAFORMA_MKT).map(([, valor]) => ({
  value: valor,
  label: PLATAFORMA_MKT_LABEL[valor],
}));

const hoy = () => new Date().toISOString().slice(0, 10);
const hace30 = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
};

const formatearFecha = (f) => {
  if (!f) return '-';
  const d = new Date(f);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatearMoneda = (v) => `S/ ${Number(v || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

const formatearPorcentaje = (v, decimales = 2) => `${(Number(v || 0) * 100).toFixed(decimales)}%`;

// Rango de años disponibles (dinámico: 2 anteriores + actual + 1 siguiente)
const getAniosDisponibles = () => {
  const actual = new Date().getFullYear();
  return [actual - 2, actual - 1, actual, actual + 1];
};

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const ATAJOS_FECHA = [
  { label: 'Hoy', getFechas: () => ({ fechaInicio: hoy(), fechaFin: hoy() }) },
  { label: '7 días', getFechas: () => { const d = new Date(); d.setDate(d.getDate() - 7); return { fechaInicio: d.toISOString().slice(0, 10), fechaFin: hoy() }; } },
  { label: '30 días', getFechas: () => ({ fechaInicio: hace30(), fechaFin: hoy() }) },
  { label: 'Este mes', getFechas: () => { const d = new Date(); return { fechaInicio: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`, fechaFin: hoy() }; } },
];

const POR_PAGINA = 15;

export default function AnalisisMarketing() {
  const [tab, setTab] = useState('dashboard');

  // ── Estado compartido ──
  const [campanas, setCampanas] = useState([]);
  const [cargandoCampanas, setCargandoCampanas] = useState(false);

  // ── Dashboard ──
  const [filtros, setFiltros] = useState({ fechaInicio: hace30(), fechaFin: hoy() });
  const [filtroCampana, setFiltroCampana] = useState('');
  const [resumen, setResumen] = useState(null);
  const [cargandoResumen, setCargandoResumen] = useState(false);

  // ── Campañas CRUD ──
  const [modalCampana, setModalCampana] = useState(false);
  const [editandoCampana, setEditandoCampana] = useState(null);
  const [formCampana, setFormCampana] = useState({ nombre: '', plataforma: '', presupuesto: '', fecha_inicio: '', fecha_fin: '', vendedor_user_id: '' });
  const [confirmElimCampana, setConfirmElimCampana] = useState(null);

  // ── Métricas CRUD ──
  const [metricas, setMetricas] = useState([]);
  const [cargandoMetricas, setCargandoMetricas] = useState(false);
  const [modalMetrica, setModalMetrica] = useState(false);
  const [editandoMetrica, setEditandoMetrica] = useState(null);
  const [formMetrica, setFormMetrica] = useState({ fecha: hoy(), campana_id: '', gasto: '', leads: '', videos_creados: '', contenido_subido: '', notas: '' });
  const [confirmElimMetrica, setConfirmElimMetrica] = useState(null);
  const [filtroMetCampana, setFiltroMetCampana] = useState('');
  const [paginaMetricas, setPaginaMetricas] = useState(1);

  // ── Métricas Personalizadas ──
  const [metricasCustom, setMetricasCustom] = useState([]);
  const [cargandoCustom, setCargandoCustom] = useState(false);
  const [modalMetricaCustom, setModalMetricaCustom] = useState(false);
  const [editandoMetricaCustom, setEditandoMetricaCustom] = useState(null);
  const [formMetricaCustom, setFormMetricaCustom] = useState({ nombre: '', unidad: '', descripcion: '', color: '#3b82f6' });
  const [confirmElimCustom, setConfirmElimCustom] = useState(null);

  // ── Registros de métricas personalizadas ──
  const [registrosCustom, setRegistrosCustom] = useState([]);
  const [cargandoRegistros, setCargandoRegistros] = useState(false);
  const [filtroMetricaCustom, setFiltroMetricaCustom] = useState('');
  const [modalRegistroCustom, setModalRegistroCustom] = useState(false);
  const [editandoRegistroCustom, setEditandoRegistroCustom] = useState(null);
  const [formRegistroCustom, setFormRegistroCustom] = useState({ metrica_id: '', fecha: hoy(), valor: '', notas: '' });
  const [confirmElimRegistro, setConfirmElimRegistro] = useState(null);
  const [paginaRegistros, setPaginaRegistros] = useState(1);

  // ── Gasto por Vendedor (nuevo tab) ──
  const [vendedores, setVendedores] = useState([]);
  const [filtroVendedor, setFiltroVendedor] = useState('');
  const hoyDate = new Date();
  const [filtroAnio, setFiltroAnio] = useState(hoyDate.getFullYear());
  const [filtroMes, setFiltroMes] = useState(hoyDate.getMonth() + 1);
  const [dashboardVendedor, setDashboardVendedor] = useState(null);
  const [cargandoDashVend, setCargandoDashVend] = useState(false);
  const [parametrosMinimos, setParametrosMinimos] = useState(null);
  const [modalParametros, setModalParametros] = useState(false);
  const [formParametros, setFormParametros] = useState({
    efectividad_ventas_min: '', efectividad_utilidad_min: '', tasa_conversion_min: '',
  });
  // Estado de celda en edición inline: { fecha, campo }
  const [celdaEditando, setCeldaEditando] = useState(null);
  const [valorEdicion, setValorEdicion] = useState('');

  // ═══════════════════════════════════════
  // CARGAR DATOS
  // ═══════════════════════════════════════

  const cargarCampanas = useCallback(async () => {
    setCargandoCampanas(true);
    try {
      const { data } = await api.get('/analisis-marketing/campanas');
      setCampanas(data);
    } catch { toast.error('Error al cargar campañas'); }
    finally { setCargandoCampanas(false); }
  }, []);

  const cargarResumen = useCallback(async () => {
    setCargandoResumen(true);
    try {
      const params = {};
      if (filtros.fechaInicio) params.fecha_desde = filtros.fechaInicio;
      if (filtros.fechaFin) params.fecha_hasta = filtros.fechaFin;
      if (filtroCampana) params.campana_id = filtroCampana;
      const { data } = await api.get('/analisis-marketing/resumen', { params });
      setResumen(data);
    } catch { toast.error('Error al cargar resumen'); }
    finally { setCargandoResumen(false); }
  }, [filtros, filtroCampana]);

  const cargarMetricas = useCallback(async () => {
    setCargandoMetricas(true);
    try {
      const params = {};
      if (filtros.fechaInicio) params.fecha_desde = filtros.fechaInicio;
      if (filtros.fechaFin) params.fecha_hasta = filtros.fechaFin;
      if (filtroMetCampana) params.campana_id = filtroMetCampana;
      const { data } = await api.get('/analisis-marketing/metricas', { params });
      setMetricas(data);
    } catch { toast.error('Error al cargar métricas'); }
    finally { setCargandoMetricas(false); }
  }, [filtros, filtroMetCampana]);

  const cargarMetricasCustom = useCallback(async () => {
    setCargandoCustom(true);
    try {
      const { data } = await api.get('/analisis-marketing/metricas-custom');
      setMetricasCustom(data);
    } catch { toast.error('Error al cargar métricas personalizadas'); }
    finally { setCargandoCustom(false); }
  }, []);

  const cargarRegistrosCustom = useCallback(async () => {
    setCargandoRegistros(true);
    try {
      const params = {};
      if (filtros.fechaInicio) params.fecha_desde = filtros.fechaInicio;
      if (filtros.fechaFin) params.fecha_hasta = filtros.fechaFin;
      if (filtroMetricaCustom) params.metrica_id = filtroMetricaCustom;
      const { data } = await api.get('/analisis-marketing/registros-custom', { params });
      setRegistrosCustom(data);
    } catch { toast.error('Error al cargar registros'); }
    finally { setCargandoRegistros(false); }
  }, [filtros, filtroMetricaCustom]);

  const cargarVendedores = useCallback(async () => {
    try {
      const { data } = await api.get('/ventas/vendedores-activos');
      setVendedores(data);
    } catch { toast.error('Error al cargar vendedores'); }
  }, []);

  const cargarParametrosMinimos = useCallback(async () => {
    try {
      const { data } = await api.get('/analisis-marketing/parametros-minimos');
      setParametrosMinimos(data);
    } catch { toast.error('Error al cargar parámetros mínimos'); }
  }, []);

  const cargarDashboardVendedor = useCallback(async () => {
    setCargandoDashVend(true);
    try {
      const params = { anio: filtroAnio, mes: filtroMes };
      if (filtroVendedor) params.vendedor_user_id = filtroVendedor;
      const { data } = await api.get('/analisis-marketing/dashboard-vendedor', { params });
      setDashboardVendedor(data);
    } catch { toast.error('Error al cargar dashboard vendedor'); }
    finally { setCargandoDashVend(false); }
  }, [filtroAnio, filtroMes, filtroVendedor]);

  useEffect(() => { cargarCampanas(); cargarVendedores(); }, [cargarCampanas, cargarVendedores]);
  useEffect(() => { if (tab === 'dashboard') cargarResumen(); }, [tab, cargarResumen]);
  useEffect(() => { if (tab === 'metricas') cargarMetricas(); }, [tab, cargarMetricas]);
  useEffect(() => { if (tab === 'metricas_custom') { cargarMetricasCustom(); cargarRegistrosCustom(); } }, [tab, cargarMetricasCustom, cargarRegistrosCustom]);
  useEffect(() => {
    if (tab === 'gasto_vendedor') {
      cargarDashboardVendedor();
      cargarParametrosMinimos();
    }
  }, [tab, cargarDashboardVendedor, cargarParametrosMinimos]);

  // ═══════════════════════════════════════
  // CAMPAÑAS CRUD
  // ═══════════════════════════════════════

  const abrirCrearCampana = () => {
    setEditandoCampana(null);
    setFormCampana({ nombre: '', plataforma: '', presupuesto: '', fecha_inicio: '', fecha_fin: '', vendedor_user_id: '' });
    setModalCampana(true);
  };

  const abrirEditarCampana = (c) => {
    setEditandoCampana(c);
    setFormCampana({
      nombre: c.nombre,
      plataforma: c.plataforma,
      presupuesto: c.presupuesto,
      fecha_inicio: c.fecha_inicio?.slice(0, 10) || '',
      fecha_fin: c.fecha_fin?.slice(0, 10) || '',
      vendedor_user_id: c.vendedor_user_id || '',
    });
    setModalCampana(true);
  };

  const guardarCampana = async (e) => {
    e.preventDefault();
    try {
      if (editandoCampana) {
        await api.put(`/analisis-marketing/campanas/${editandoCampana.id}`, formCampana);
        toast.success('Campaña actualizada');
      } else {
        await api.post('/analisis-marketing/campanas', formCampana);
        toast.success('Campaña creada');
      }
      setModalCampana(false);
      cargarCampanas();
    } catch (err) { toast.error(err.response?.data?.error || 'Error al guardar'); }
  };

  const toggleActivaCampana = async (c) => {
    try {
      await api.put(`/analisis-marketing/campanas/${c.id}`, { activa: !c.activa });
      toast.success(c.activa ? 'Campaña desactivada' : 'Campaña activada');
      cargarCampanas();
    } catch { toast.error('Error al cambiar estado'); }
  };

  const eliminarCampana = async () => {
    try {
      await api.delete(`/analisis-marketing/campanas/${confirmElimCampana.id}`);
      toast.success('Campaña eliminada');
      setConfirmElimCampana(null);
      cargarCampanas();
    } catch { toast.error('Error al eliminar'); }
  };

  // ═══════════════════════════════════════
  // MÉTRICAS CRUD
  // ═══════════════════════════════════════

  const campanasActivas = useMemo(() => campanas.filter(c => c.activa), [campanas]);

  const abrirCrearMetrica = () => {
    setEditandoMetrica(null);
    setFormMetrica({ fecha: hoy(), campana_id: campanasActivas[0]?.id || '', gasto: '', leads: '', videos_creados: '', contenido_subido: '', notas: '' });
    setModalMetrica(true);
  };

  // Campañas activas del vendedor filtrado (o todas si no hay filtro)
  const campanasVendedorFiltrado = useMemo(() => (
    filtroVendedor
      ? campanasActivas.filter(c => String(c.vendedor_user_id) === String(filtroVendedor))
      : campanasActivas
  ), [campanasActivas, filtroVendedor]);

  // Atajo desde el tab "Gasto por Vendedor": abre el modal para un día específico
  const abrirRegistrarGastoDia = async (fecha) => {
    if (campanasVendedorFiltrado.length === 0) {
      toast.error(filtroVendedor
        ? 'Este vendedor no tiene campañas activas. Crea una en el tab "Campañas".'
        : 'Debes crear al menos una campaña activa antes de registrar gasto.');
      return;
    }

    // Si ya existe métrica ese día en alguna campaña del vendedor → edición
    try {
      const { data: existentes } = await api.get('/analisis-marketing/metricas', {
        params: { fecha_desde: fecha, fecha_hasta: fecha },
      });
      const idsCampanasVend = new Set(campanasVendedorFiltrado.map(c => c.id));
      const existente = existentes.find(m => idsCampanasVend.has(m.campana_id));
      if (existente) {
        abrirEditarMetrica(existente);
        return;
      }
    } catch { /* si falla, sigue flujo de creación */ }

    setEditandoMetrica(null);
    setFormMetrica({
      fecha,
      campana_id: campanasVendedorFiltrado[0].id,
      gasto: '', leads: '', videos_creados: 0, contenido_subido: 0, notas: '',
    });
    setModalMetrica(true);
  };

  // Guardado rápido inline: guarda gasto o leads en la única campaña activa del vendedor
  // Si hay múltiples campañas, delega al modal para que el usuario elija
  const guardarInline = async (fecha, campo, valor) => {
    if (campanasVendedorFiltrado.length === 0) {
      toast.error(filtroVendedor
        ? 'Este vendedor no tiene campañas activas asignadas'
        : 'Selecciona un vendedor con campañas activas o crea una campaña');
      return false;
    }
    if (campanasVendedorFiltrado.length > 1) {
      // Múltiples campañas → modal
      abrirRegistrarGastoDia(fecha);
      return false;
    }
    const numero = Number(valor);
    if (isNaN(numero) || numero < 0) {
      toast.error('Valor inválido');
      return false;
    }
    const campana = campanasVendedorFiltrado[0];
    try {
      // Buscar si existe métrica en esa campaña+fecha
      const { data: existentes } = await api.get('/analisis-marketing/metricas', {
        params: { fecha_desde: fecha, fecha_hasta: fecha, campana_id: campana.id },
      });
      const existente = existentes.find(m => m.campana_id === campana.id);
      if (existente) {
        await api.put(`/analisis-marketing/metricas/${existente.id}`, { [campo]: numero });
      } else {
        await api.post('/analisis-marketing/metricas', {
          fecha, campana_id: campana.id,
          gasto: campo === 'gasto' ? numero : 0,
          leads: campo === 'leads' ? numero : 0,
          videos_creados: 0, contenido_subido: 0,
        });
      }
      toast.success('Guardado');
      cargarDashboardVendedor();
      return true;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
      return false;
    }
  };

  const abrirEditarMetrica = (m) => {
    setEditandoMetrica(m);
    setFormMetrica({
      fecha: m.fecha?.slice(0, 10) || '',
      campana_id: m.campana_id,
      gasto: m.gasto,
      leads: m.leads,
      videos_creados: m.videos_creados,
      contenido_subido: m.contenido_subido,
      notas: m.notas || '',
    });
    setModalMetrica(true);
  };

  const guardarMetrica = async (e) => {
    e.preventDefault();
    try {
      if (editandoMetrica) {
        await api.put(`/analisis-marketing/metricas/${editandoMetrica.id}`, formMetrica);
        toast.success('Métrica actualizada');
      } else {
        await api.post('/analisis-marketing/metricas', formMetrica);
        toast.success('Métrica registrada');
      }
      setModalMetrica(false);
      cargarMetricas();
      if (tab === 'dashboard') cargarResumen();
      if (tab === 'gasto_vendedor') cargarDashboardVendedor();
    } catch (err) { toast.error(err.response?.data?.error || 'Error al guardar'); }
  };

  const eliminarMetrica = async () => {
    try {
      await api.delete(`/analisis-marketing/metricas/${confirmElimMetrica.id}`);
      toast.success('Métrica eliminada');
      setConfirmElimMetrica(null);
      cargarMetricas();
      if (tab === 'dashboard') cargarResumen();
      if (tab === 'gasto_vendedor') cargarDashboardVendedor();
    } catch { toast.error('Error al eliminar'); }
  };

  // ═══════════════════════════════════════
  // MÉTRICAS PERSONALIZADAS CRUD
  // ═══════════════════════════════════════

  const abrirCrearMetricaCustom = () => {
    setEditandoMetricaCustom(null);
    setFormMetricaCustom({ nombre: '', unidad: '', descripcion: '', color: '#3b82f6' });
    setModalMetricaCustom(true);
  };

  const abrirEditarMetricaCustom = (m) => {
    setEditandoMetricaCustom(m);
    setFormMetricaCustom({ nombre: m.nombre, unidad: m.unidad || '', descripcion: m.descripcion || '', color: m.color || '#3b82f6' });
    setModalMetricaCustom(true);
  };

  const guardarMetricaCustom = async (e) => {
    e.preventDefault();
    try {
      if (editandoMetricaCustom) {
        await api.put(`/analisis-marketing/metricas-custom/${editandoMetricaCustom.id}`, formMetricaCustom);
        toast.success('Métrica actualizada');
      } else {
        await api.post('/analisis-marketing/metricas-custom', formMetricaCustom);
        toast.success('Métrica creada');
      }
      setModalMetricaCustom(false);
      cargarMetricasCustom();
    } catch (err) { toast.error(err.response?.data?.error || 'Error al guardar'); }
  };

  const toggleActivaCustom = async (m) => {
    try {
      await api.put(`/analisis-marketing/metricas-custom/${m.id}`, { activa: !m.activa });
      toast.success(m.activa ? 'Métrica desactivada' : 'Métrica activada');
      cargarMetricasCustom();
    } catch { toast.error('Error al cambiar estado'); }
  };

  const eliminarMetricaCustom = async () => {
    try {
      await api.delete(`/analisis-marketing/metricas-custom/${confirmElimCustom.id}`);
      toast.success('Métrica eliminada');
      setConfirmElimCustom(null);
      cargarMetricasCustom();
      cargarRegistrosCustom();
    } catch { toast.error('Error al eliminar'); }
  };

  // ═══════════════════════════════════════
  // REGISTROS CUSTOM CRUD
  // ═══════════════════════════════════════

  const abrirCrearRegistroCustom = () => {
    setEditandoRegistroCustom(null);
    setFormRegistroCustom({ metrica_id: filtroMetricaCustom || metricasCustomActivas[0]?.id || '', fecha: hoy(), valor: '', notas: '' });
    setModalRegistroCustom(true);
  };

  const abrirEditarRegistroCustom = (r) => {
    setEditandoRegistroCustom(r);
    setFormRegistroCustom({ metrica_id: r.metrica_id, fecha: r.fecha?.slice(0, 10) || '', valor: r.valor, notas: r.notas || '' });
    setModalRegistroCustom(true);
  };

  const guardarRegistroCustom = async (e) => {
    e.preventDefault();
    try {
      if (editandoRegistroCustom) {
        await api.put(`/analisis-marketing/registros-custom/${editandoRegistroCustom.id}`, formRegistroCustom);
        toast.success('Registro actualizado');
      } else {
        await api.post('/analisis-marketing/registros-custom', formRegistroCustom);
        toast.success('Registro creado');
      }
      setModalRegistroCustom(false);
      cargarRegistrosCustom();
    } catch (err) { toast.error(err.response?.data?.error || 'Error al guardar'); }
  };

  const eliminarRegistroCustom = async () => {
    try {
      await api.delete(`/analisis-marketing/registros-custom/${confirmElimRegistro.id}`);
      toast.success('Registro eliminado');
      setConfirmElimRegistro(null);
      cargarRegistrosCustom();
    } catch { toast.error('Error al eliminar'); }
  };

  const metricasCustomActivas = useMemo(() => metricasCustom.filter(m => m.activa), [metricasCustom]);

  // ═══════════════════════════════════════
  // PARÁMETROS MÍNIMOS (umbrales semáforo) — solo edición (GET ya está arriba)
  // ═══════════════════════════════════════

  const abrirEditarParametros = () => {
    const base = parametrosMinimos || DEFAULT_PARAMETROS_MKT;
    setFormParametros({
      efectividad_ventas_min: Number(base.efectividad_ventas_min ?? base.EFECTIVIDAD_VENTAS_MIN) * 100,
      efectividad_utilidad_min: Number(base.efectividad_utilidad_min ?? base.EFECTIVIDAD_UTILIDAD_MIN) * 100,
      tasa_conversion_min: Number(base.tasa_conversion_min ?? base.TASA_CONVERSION_MIN) * 100,
    });
    setModalParametros(true);
  };

  const guardarParametros = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        efectividad_ventas_min: Number(formParametros.efectividad_ventas_min) / 100,
        efectividad_utilidad_min: Number(formParametros.efectividad_utilidad_min) / 100,
        tasa_conversion_min: Number(formParametros.tasa_conversion_min) / 100,
      };
      await api.put('/analisis-marketing/parametros-minimos', payload);
      toast.success('Parámetros mínimos actualizados');
      setModalParametros(false);
      cargarParametrosMinimos();
    } catch (err) { toast.error(err.response?.data?.error || 'Error al guardar'); }
  };

  // Umbrales efectivos (valor configurado o fallback a constante DEFAULT)
  const umbrales = useMemo(() => ({
    efectividad_ventas_min: Number(parametrosMinimos?.efectividad_ventas_min ?? DEFAULT_PARAMETROS_MKT.EFECTIVIDAD_VENTAS_MIN),
    efectividad_utilidad_min: Number(parametrosMinimos?.efectividad_utilidad_min ?? DEFAULT_PARAMETROS_MKT.EFECTIVIDAD_UTILIDAD_MIN),
    tasa_conversion_min: Number(parametrosMinimos?.tasa_conversion_min ?? DEFAULT_PARAMETROS_MKT.TASA_CONVERSION_MIN),
  }), [parametrosMinimos]);

  // Texto fijo para celdas fórmula (color del header índigo, tono oscuro para mejor distinción)
  const TEXTO_FORMULA = 'text-indigo-500 font-semibold';

  // Borde izquierdo de celda fórmula: indigo si cumple, rojo si no alcanza umbral
  const bordeAlertaFormula = (valor, minimo) => {
    if (valor == null || valor === 0) return 'border-indigo-600';
    return Number(valor) >= Number(minimo) ? 'border-indigo-600' : 'border-red-500';
  };

  // Paginación métricas
  const totalPagMetricas = Math.ceil(metricas.length / POR_PAGINA);
  const metricasPaginadas = metricas.slice((paginaMetricas - 1) * POR_PAGINA, paginaMetricas * POR_PAGINA);

  // Paginación registros custom
  const totalPagRegistros = Math.ceil(registrosCustom.length / POR_PAGINA);
  const registrosPaginados = registrosCustom.slice((paginaRegistros - 1) * POR_PAGINA, paginaRegistros * POR_PAGINA);

  // ═══════════════════════════════════════
  // DATOS PARA GRÁFICAS
  // ═══════════════════════════════════════

  const datosLinea = useMemo(() =>
    (resumen?.evolucion_diaria || []).map(d => ({
      fecha: formatearFecha(d.fecha),
      Gasto: Number(d.gasto),
      Leads: Number(d.leads),
    })),
  [resumen]);

  const datosBarras = useMemo(() =>
    (resumen?.por_campana || []).map(d => ({
      campana: d.campana,
      Gasto: Number(d.gasto),
      Leads: Number(d.leads),
      'Costo/Lead': Number(d.costo_por_lead),
    })),
  [resumen]);

  const datosDona = useMemo(() =>
    (resumen?.por_plataforma || []).map(d => ({
      name: PLATAFORMA_MKT_LABEL[d.plataforma] || d.plataforma,
      value: Number(d.gasto),
      fill: PLATAFORMA_MKT_COLOR[d.plataforma] || '#6b7280',
    })),
  [resumen]);

  const datosArea = useMemo(() =>
    (resumen?.evolucion_diaria || []).map(d => ({
      fecha: formatearFecha(d.fecha),
      Videos: Number(d.videos),
      Contenido: Number(d.contenido),
    })),
  [resumen]);

  const datosCustomDashboard = useMemo(() =>
    (resumen?.metricas_custom || [])
      .filter(m => m.registros.length > 0)
      .map(m => ({
        ...m,
        registros: m.registros.map(r => ({
          fecha: formatearFecha(r.fecha),
          Valor: Number(r.valor),
        })),
        ultimo_valor: Number(m.registros[m.registros.length - 1]?.valor || 0),
      })),
  [resumen]);

  const tooltipStyle = { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' };

  // ═══════════════════════════════════════
  // COLUMNAS TABLAS
  // ═══════════════════════════════════════

  const colsCampanas = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'plataforma', label: 'Plataforma', render: (f) => PLATAFORMA_MKT_LABEL[f.plataforma] || f.plataforma },
    { key: 'vendedor', label: 'Vendedor', render: (f) => f.vendedor?.nombres || <span className="text-steel-500 italic">Sin asignar</span> },
    { key: 'presupuesto', label: 'Presupuesto', render: (f) => formatearMoneda(f.presupuesto) },
    { key: 'gasto_acumulado', label: 'Gasto Real', render: (f) => formatearMoneda(f.gasto_acumulado) },
    { key: 'fecha_inicio', label: 'Inicio', render: (f) => formatearFecha(f.fecha_inicio) },
    { key: 'fecha_fin', label: 'Fin', render: (f) => f.fecha_fin ? formatearFecha(f.fecha_fin) : 'Activa' },
    {
      key: 'activa', label: 'Estado', render: (f) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${f.activa ? 'bg-emerald-500/15 text-emerald-400' : 'bg-steel-700 text-steel-400'}`}>
          {f.activa ? 'Activa' : 'Inactiva'}
        </span>
      ),
    },
  ];

  const colsMetricas = [
    { key: 'fecha', label: 'Fecha', render: (f) => formatearFecha(f.fecha) },
    { key: 'campana', label: 'Campaña', render: (f) => f.campana?.nombre || '-' },
    { key: 'plataforma', label: 'Plataforma', render: (f) => PLATAFORMA_MKT_LABEL[f.campana?.plataforma] || '-' },
    { key: 'gasto', label: 'Gasto', render: (f) => formatearMoneda(f.gasto) },
    { key: 'leads', label: 'Leads' },
    { key: 'videos_creados', label: 'Videos' },
    { key: 'contenido_subido', label: 'Contenido' },
    { key: 'notas', label: 'Notas', render: (f) => f.notas ? <span className="text-steel-400 truncate max-w-[120px] inline-block">{f.notas}</span> : '-' },
  ];

  const colsMetricasCustom = [
    {
      key: 'color', label: '', render: (f) => (
        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: f.color }} />
      ),
    },
    { key: 'nombre', label: 'Nombre' },
    { key: 'unidad', label: 'Unidad', render: (f) => f.unidad || '-' },
    { key: 'descripcion', label: 'Descripción', render: (f) => f.descripcion ? <span className="text-steel-400 truncate max-w-[180px] inline-block">{f.descripcion}</span> : '-' },
    { key: 'total_registros', label: 'Registros' },
    {
      key: 'activa', label: 'Estado', render: (f) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${f.activa ? 'bg-emerald-600 text-white' : 'bg-steel-500 text-white'}`}>
          {f.activa ? 'Activa' : 'Inactiva'}
        </span>
      ),
    },
  ];

  const colsRegistrosCustom = [
    { key: 'fecha', label: 'Fecha', render: (f) => formatearFecha(f.fecha) },
    {
      key: 'metrica', label: 'Métrica', render: (f) => (
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.metrica?.color }} />
          {f.metrica?.nombre || '-'}
        </div>
      ),
    },
    { key: 'valor', label: 'Valor', render: (f) => `${Number(f.valor).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}${f.metrica?.unidad ? ` ${f.metrica.unidad}` : ''}` },
    { key: 'notas', label: 'Notas', render: (f) => f.notas ? <span className="text-steel-400 truncate max-w-[200px] inline-block">{f.notas}</span> : '-' },
  ];

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display tracking-wider text-steel-100">Análisis de Marketing</h1>
      </div>

      <Tabs tabs={TABS} tabActual={tab} onChange={setTab} />

      {/* ─── TAB DASHBOARD ─── */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          {/* Filtros */}
          <div className="card">
            <div className="flex flex-wrap items-end gap-4">
              <DateRangePicker
                fechaInicio={filtros.fechaInicio}
                fechaFin={filtros.fechaFin}
                onChange={setFiltros}
              />
              <select
                className="input-field text-sm w-48"
                value={filtroCampana}
                onChange={e => setFiltroCampana(e.target.value)}
              >
                <option value="">Todas las campañas</option>
                {campanas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <div className="flex gap-1">
                {ATAJOS_FECHA.map(a => (
                  <button key={a.label} onClick={() => setFiltros(a.getFechas())}
                    className="px-3 py-2 text-xs rounded-lg bg-steel-800 text-steel-300 hover:bg-steel-700 hover:text-steel-100 transition-colors">
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* KPIs */}
          {cargandoResumen ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-steel-700 border-t-primary-500 rounded-full animate-spin" />
            </div>
          ) : resumen?.kpis && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <TarjetaResumen titulo="Gasto Total" valor={formatearMoneda(resumen.kpis.gasto_total)} icono={HiOutlineCurrencyDollar} color="red" />
                <TarjetaResumen titulo="Total Leads" valor={Number(resumen.kpis.leads_total).toLocaleString()} icono={HiOutlineUserAdd} color="green" />
                <TarjetaResumen titulo="Costo / Lead" valor={formatearMoneda(resumen.kpis.costo_por_lead)} icono={HiOutlineCalculator} color="yellow" />
                <TarjetaResumen titulo="Videos" valor={Number(resumen.kpis.videos_total).toLocaleString()} icono={HiOutlineFilm} color="blue" />
                <TarjetaResumen titulo="Contenido" valor={Number(resumen.kpis.contenido_total).toLocaleString()} icono={HiOutlinePhotograph} color="purple" />
                <TarjetaResumen titulo="Gasto/Día Prom." valor={formatearMoneda(resumen.kpis.gasto_promedio_diario)} icono={HiOutlineTrendingUp} color="primary" />
              </div>

              {/* Gráficas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Línea temporal: Gasto + Leads */}
                <div className="card">
                  <h3 className="text-sm font-semibold text-steel-300 mb-4">Evolución Diaria — Gasto y Leads</h3>
                  {datosLinea.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={datosLinea}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="fecha" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="gasto" stroke="#ef4444" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="leads" orientation="right" stroke="#10b981" tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend />
                        <Line yAxisId="gasto" type="monotone" dataKey="Gasto" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                        <Line yAxisId="leads" type="monotone" dataKey="Leads" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <p className="text-steel-500 text-center py-8">Sin datos para el periodo seleccionado</p>}
                </div>

                {/* Dona: Distribución por plataforma */}
                <div className="card">
                  <h3 className="text-sm font-semibold text-steel-300 mb-4">Gasto por Plataforma</h3>
                  {datosDona.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={datosDona} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {datosDona.map((d, i) => <Cell key={i} fill={d.fill} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatearMoneda(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-steel-500 text-center py-8">Sin datos</p>}
                </div>

                {/* Barras: Por campaña */}
                <div className="card">
                  <h3 className="text-sm font-semibold text-steel-300 mb-4">Rendimiento por Campaña</h3>
                  {datosBarras.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={datosBarras} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="campana" type="category" width={120} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend />
                        <Bar dataKey="Gasto" fill="#ef4444" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="Leads" fill="#10b981" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-steel-500 text-center py-8">Sin datos</p>}
                </div>

                {/* Área: Videos + Contenido */}
                <div className="card">
                  <h3 className="text-sm font-semibold text-steel-300 mb-4">Producción de Contenido</h3>
                  {datosArea.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={datosArea}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="fecha" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend />
                        <Area type="monotone" dataKey="Videos" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                        <Area type="monotone" dataKey="Contenido" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <p className="text-steel-500 text-center py-8">Sin datos</p>}
                </div>
              </div>

              {/* Métricas Personalizadas */}
              {datosCustomDashboard.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-steel-200 flex items-center gap-2">
                    <HiOutlineChartBar className="w-5 h-5 text-primary-400" />
                    Métricas Personalizadas
                  </h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {datosCustomDashboard.map(m => (
                      <div key={m.id} className="card">
                        <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
                            <h3 className="text-sm font-semibold text-steel-300">{m.nombre}</h3>
                            {m.unidad && <span className="text-xs text-steel-500">({m.unidad})</span>}
                          </div>
                          <span className="text-lg font-bold" style={{ color: m.color }}>
                            {m.ultimo_valor.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            {m.unidad && <span className="text-xs text-steel-400 ml-1">{m.unidad}</span>}
                          </span>
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                          <AreaChart data={m.registros}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="fecha" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                            <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Area type="monotone" dataKey="Valor" stroke={m.color} fill={m.color} fillOpacity={0.15} strokeWidth={2} dot={{ r: 2 }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── TAB GASTO POR VENDEDOR (tabla diaria tipo Excel) ─── */}
      {tab === 'gasto_vendedor' && (
        <div className="space-y-4">
          {/* Banner de instrucciones */}
          <div className="bg-steel-900 border-l-4 border-orange-500 p-4 rounded">
            <h3 className="text-sm font-bold text-orange-400 mb-1">¿Cómo registrar los datos manuales?</h3>
            <ol className="text-xs text-steel-300 space-y-0.5 list-decimal ml-4">
              <li>Filtra por vendedor arriba. Debe tener al menos una <b>campaña activa</b> asignada (tab "Campañas").</li>
              <li>Haz <b>click directo en la celda naranja</b> (Gasto publicidad o Leads) y escribe el valor. Enter para guardar.</li>
              <li>Si el vendedor tiene múltiples campañas activas, se abrirá un modal para elegir cuál.</li>
              <li>Todos los demás campos (Ventas, Utilidad, Clientes, Campañas activas) se calculan automáticos desde la BD.</li>
            </ol>
          </div>

          {/* Filtros */}
          <div className="card">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-steel-400 mb-1">Vendedor</label>
                <select className="input-field text-sm w-56" value={filtroVendedor}
                  onChange={e => setFiltroVendedor(e.target.value)}>
                  <option value="">— Todos (consolidado) —</option>
                  {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombres}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-steel-400 mb-1">Mes</label>
                <select className="input-field text-sm w-40" value={filtroMes}
                  onChange={e => setFiltroMes(Number(e.target.value))}>
                  {MESES.map((nombre, idx) => <option key={idx + 1} value={idx + 1}>{nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-steel-400 mb-1">Año</label>
                <select className="input-field text-sm w-28" value={filtroAnio}
                  onChange={e => setFiltroAnio(Number(e.target.value))}>
                  {getAniosDisponibles().map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <button onClick={abrirEditarParametros} className="btn-secondary flex items-center gap-2">
                <HiOutlinePencil className="w-4 h-4" /> Parámetros mínimos
              </button>
            </div>

            {/* Estado del vendedor: campañas activas */}
            <div className="mt-3 text-xs text-steel-400">
              {filtroVendedor ? (
                campanasVendedorFiltrado.length === 0 ? (
                  <span className="text-red-400 font-semibold">
                    ⚠ Este vendedor no tiene campañas activas. Crea una en el tab "Campañas" antes de registrar gasto.
                  </span>
                ) : (
                  <span>Campañas activas del vendedor: <b className="text-orange-300">{campanasVendedorFiltrado.length}</b></span>
                )
              ) : (
                <span>Mostrando consolidado de todos los vendedores · Para registrar gasto filtra por uno específico.</span>
              )}
            </div>

            {/* Leyenda por tipo de columna */}
            <div className="mt-3 pt-3 border-t border-steel-800 flex flex-wrap gap-4 text-xs">
              <span className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 rounded bg-orange-600"></span>
                <b className="text-steel-100">Manual</b> <span className="text-steel-500">— editable con click</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 rounded bg-steel-600"></span>
                <b className="text-steel-100">Automático</b> <span className="text-steel-500">— de la BD, solo lectura</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 rounded bg-indigo-600"></span>
                <b className="text-steel-100">Fórmula</b> <span className="text-steel-500">— derivada con semáforo</span>
              </span>
            </div>
            {/* Umbrales configurados */}
            <div className="mt-3 flex flex-wrap gap-6 text-xs text-steel-400">
              <span>Efect. Ventas mín: <b className="text-steel-200">{formatearPorcentaje(umbrales.efectividad_ventas_min)}</b></span>
              <span>Efect. Utilidad mín: <b className="text-steel-200">{formatearPorcentaje(umbrales.efectividad_utilidad_min)}</b></span>
              <span>Conversión mín: <b className="text-steel-200">{formatearPorcentaje(umbrales.tasa_conversion_min)}</b></span>
            </div>
          </div>

          {/* Tabla diaria */}
          <div className="card p-0 overflow-hidden">
            {cargandoDashVend ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-steel-700 border-t-primary-500 rounded-full animate-spin" />
              </div>
            ) : !dashboardVendedor || dashboardVendedor.filas.length === 0 ? (
              <div className="text-center text-steel-400 py-10">Sin datos para el periodo seleccionado</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-3 py-3 text-left text-steel-200 bg-steel-800 border-b-2 border-steel-600">Día</th>
                      <th className="px-3 py-3 text-right text-steel-200 bg-steel-800 border-b-2 border-steel-600">#</th>
                      {/* Manual → Naranja corporativo */}
                      <th className="px-3 py-3 text-right text-white bg-orange-600 border-b-2 border-orange-400">Gasto publicidad</th>
                      {/* Automático → Acero neutral */}
                      <th className="px-3 py-3 text-right text-steel-100 bg-steel-700 border-b-2 border-steel-500">Ventas</th>
                      <th className="px-3 py-3 text-right text-steel-100 bg-steel-700 border-b-2 border-steel-500">Utilidad</th>
                      {/* Fórmula → Índigo */}
                      <th className="px-3 py-3 text-right text-white bg-indigo-700 border-b-2 border-indigo-500">Efect. Ventas</th>
                      <th className="px-3 py-3 text-right text-white bg-indigo-700 border-b-2 border-indigo-500">Efect. Utilidad</th>
                      <th className="px-3 py-3 text-right text-steel-100 bg-steel-700 border-b-2 border-steel-500">Clientes</th>
                      <th className="px-3 py-3 text-right text-white bg-orange-600 border-b-2 border-orange-400">Leads</th>
                      <th className="px-3 py-3 text-right text-white bg-indigo-700 border-b-2 border-indigo-500">Conversión</th>
                      <th className="px-3 py-3 text-right text-steel-100 bg-steel-700 border-b-2 border-steel-500">Campañas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardVendedor.filas.map(f => {
                      const d = new Date(f.fecha + 'T12:00:00');
                      const efectVentas = f.ventas > 0 ? f.gasto / f.ventas : 0;
                      const efectUtil = f.utilidad > 0 ? f.gasto / f.utilidad : 0;
                      const conversion = f.leads > 0 ? f.clientes / f.leads : 0;
                      const esDomingo = d.getDay() === 0;
                      const sinGasto = !f.gasto || f.gasto === 0;
                      const editingGasto = celdaEditando?.fecha === f.fecha && celdaEditando?.campo === 'gasto';
                      const editingLeads = celdaEditando?.fecha === f.fecha && celdaEditando?.campo === 'leads';

                      const iniciarEdicion = (campo, valorActual) => {
                        if (campanasVendedorFiltrado.length === 0) {
                          toast.error(filtroVendedor
                            ? 'Este vendedor no tiene campañas activas'
                            : 'Selecciona un vendedor para editar');
                          return;
                        }
                        if (campanasVendedorFiltrado.length > 1) {
                          // Múltiples campañas → modal
                          abrirRegistrarGastoDia(f.fecha);
                          return;
                        }
                        setCeldaEditando({ fecha: f.fecha, campo });
                        setValorEdicion(valorActual > 0 ? String(valorActual) : '');
                      };

                      const confirmarEdicion = async () => {
                        const ok = await guardarInline(f.fecha, celdaEditando.campo, valorEdicion || 0);
                        if (ok) {
                          setCeldaEditando(null);
                          setValorEdicion('');
                        }
                      };

                      const cancelarEdicion = () => {
                        setCeldaEditando(null);
                        setValorEdicion('');
                      };

                      return (
                        <tr key={f.fecha} className={`border-b border-steel-800 ${esDomingo ? 'bg-steel-900/70' : 'bg-steel-950/30'} hover:bg-steel-900/60 transition-colors`}>
                          <td className="px-3 py-2 text-steel-200 font-medium">{DIAS_SEMANA_ES[d.getDay()]}</td>
                          <td className="px-3 py-2 text-right text-steel-500">{d.getDate()}</td>

                          {/* Gasto publicidad (MANUAL, editable inline) */}
                          <td className="px-0 py-0 border-l-4 border-orange-600 bg-steel-900">
                            {editingGasto ? (
                              <input
                                type="number" step="0.01" min="0" autoFocus
                                value={valorEdicion}
                                onChange={e => setValorEdicion(e.target.value)}
                                onBlur={confirmarEdicion}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') confirmarEdicion();
                                  if (e.key === 'Escape') cancelarEdicion();
                                }}
                                className="w-full px-3 py-2 text-right font-mono font-bold text-base border-0 outline-none ring-2 ring-orange-400"
                                style={{ backgroundColor: '#ffffff', color: '#111827' }}
                              />
                            ) : (
                              <button
                                onClick={() => iniciarEdicion('gasto', f.gasto)}
                                className={`w-full text-right font-mono font-bold px-3 py-2 hover:bg-orange-950/50 cursor-pointer transition-colors ${sinGasto ? 'text-steel-600 italic' : 'text-orange-500'}`}
                                title="Click para editar"
                              >
                                {sinGasto ? 'Click para registrar' : formatearMoneda(f.gasto)}
                              </button>
                            )}
                          </td>

                          {/* Ventas (AUTOMÁTICO) */}
                          <td className="px-3 py-2 text-right font-mono text-steel-100 bg-steel-900/60">{formatearMoneda(f.ventas)}</td>
                          <td className="px-3 py-2 text-right font-mono text-steel-100 bg-steel-900/60">{formatearMoneda(f.utilidad)}</td>

                          {/* Efectividad Ventas (FÓRMULA) */}
                          <td className={`px-3 py-2 text-right font-mono border-l-4 ${bordeAlertaFormula(efectVentas, umbrales.efectividad_ventas_min)} bg-steel-900/60 ${TEXTO_FORMULA}`}>
                            {f.ventas > 0 && f.gasto > 0 ? formatearPorcentaje(efectVentas) : '—'}
                          </td>
                          <td className={`px-3 py-2 text-right font-mono bg-steel-900/60 ${TEXTO_FORMULA}`}>
                            {f.utilidad > 0 && f.gasto > 0 ? formatearPorcentaje(efectUtil) : '—'}
                          </td>

                          {/* Clientes (AUTOMÁTICO) */}
                          <td className="px-3 py-2 text-right font-mono text-steel-100 bg-steel-900/60">{f.clientes}</td>

                          {/* Leads (MANUAL, editable inline) */}
                          <td className="px-0 py-0 border-l-4 border-orange-600 bg-steel-900">
                            {editingLeads ? (
                              <input
                                type="number" min="0" autoFocus
                                value={valorEdicion}
                                onChange={e => setValorEdicion(e.target.value)}
                                onBlur={confirmarEdicion}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') confirmarEdicion();
                                  if (e.key === 'Escape') cancelarEdicion();
                                }}
                                className="w-full px-3 py-2 text-right font-mono font-bold text-base border-0 outline-none ring-2 ring-orange-400"
                                style={{ backgroundColor: '#ffffff', color: '#111827' }}
                              />
                            ) : (
                              <button
                                onClick={() => iniciarEdicion('leads', f.leads)}
                                className={`w-full text-right font-mono font-bold px-3 py-2 hover:bg-orange-950/50 cursor-pointer transition-colors ${f.leads === 0 ? 'text-steel-600 italic' : 'text-orange-500'}`}
                                title="Click para editar"
                              >
                                {f.leads === 0 ? 'Click para registrar' : f.leads.toLocaleString()}
                              </button>
                            )}
                          </td>

                          {/* Conversión (FÓRMULA) */}
                          <td className={`px-3 py-2 text-right font-mono border-l-4 ${bordeAlertaFormula(conversion, umbrales.tasa_conversion_min)} bg-steel-900/60 ${TEXTO_FORMULA}`}>
                            {f.leads > 0 ? formatearPorcentaje(conversion) : '—'}
                          </td>

                          {/* Campañas activas (AUTOMÁTICO) */}
                          <td className="px-3 py-2 text-right font-mono text-steel-100 bg-steel-900/60">{f.campanas_activas}</td>
                        </tr>
                      );
                    })}

                    {/* TOTALES */}
                    <tr className="bg-steel-800 font-bold text-steel-50 border-t-4 border-steel-600">
                      <td className="px-3 py-3" colSpan={2}>TOTALES</td>
                      <td className="px-3 py-3 text-right font-mono text-orange-500 border-l-4 border-orange-600 bg-steel-900">{formatearMoneda(dashboardVendedor.totales.gasto)}</td>
                      <td className="px-3 py-3 text-right font-mono">{formatearMoneda(dashboardVendedor.totales.ventas)}</td>
                      <td className="px-3 py-3 text-right font-mono">{formatearMoneda(dashboardVendedor.totales.utilidad)}</td>
                      <td className={`px-3 py-3 text-right font-mono border-l-4 ${bordeAlertaFormula(dashboardVendedor.totales.efectividad_ventas, umbrales.efectividad_ventas_min)} bg-steel-900/60 ${TEXTO_FORMULA}`}>
                        {formatearPorcentaje(dashboardVendedor.totales.efectividad_ventas)}
                      </td>
                      <td className={`px-3 py-3 text-right font-mono bg-steel-900/60 ${TEXTO_FORMULA}`}>
                        {formatearPorcentaje(dashboardVendedor.totales.efectividad_utilidad)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono">{dashboardVendedor.totales.clientes}</td>
                      <td className="px-3 py-3 text-right font-mono text-orange-500 border-l-4 border-orange-600 bg-steel-900">{dashboardVendedor.totales.leads.toLocaleString()}</td>
                      <td className={`px-3 py-3 text-right font-mono border-l-4 ${bordeAlertaFormula(dashboardVendedor.totales.tasa_conversion, umbrales.tasa_conversion_min)} bg-steel-900/60 ${TEXTO_FORMULA}`}>
                        {formatearPorcentaje(dashboardVendedor.totales.tasa_conversion)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono">—</td>
                    </tr>

                    {/* PROMEDIO DIARIO */}
                    <tr className="bg-steel-900 text-steel-400 text-xs">
                      <td className="px-3 py-2" colSpan={2}>Promedio diario gasto</td>
                      <td className="px-3 py-2 text-right font-mono text-orange-500 border-l-4 border-orange-600 bg-steel-900/60">
                        {formatearMoneda(dashboardVendedor.totales.promedio_diario_gasto)}
                      </td>
                      <td className="px-3 py-2 text-right" colSpan={8}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB CAMPAÑAS ─── */}
      {tab === 'campanas' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={abrirCrearCampana} className="btn-primary flex items-center gap-2">
              <HiOutlinePlus className="w-4 h-4" /> Nueva Campaña
            </button>
          </div>
          <div className="card p-0 overflow-hidden">
            <TablaGenerica
              columnas={colsCampanas}
              datos={campanas}
              cargando={cargandoCampanas}
              vacio="No hay campañas registradas"
              acciones={(f) => (
                <>
                  <button onClick={(e) => { e.stopPropagation(); toggleActivaCampana(f); }}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${f.activa ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25' : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'}`}>
                    {f.activa ? 'Desactivar' : 'Activar'}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); abrirEditarCampana(f); }}
                    className="p-1.5 rounded-lg text-steel-400 hover:text-blue-400 hover:bg-steel-800 transition-colors">
                    <HiOutlinePencil className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setConfirmElimCampana(f); }}
                    className="p-1.5 rounded-lg text-steel-400 hover:text-red-400 hover:bg-steel-800 transition-colors">
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                </>
              )}
            />
          </div>
        </div>
      )}

      {/* ─── TAB MÉTRICAS ─── */}
      {tab === 'metricas' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-end gap-4">
              <DateRangePicker fechaInicio={filtros.fechaInicio} fechaFin={filtros.fechaFin} onChange={setFiltros} />
              <select className="input-field text-sm w-48" value={filtroMetCampana} onChange={e => { setFiltroMetCampana(e.target.value); setPaginaMetricas(1); }}>
                <option value="">Todas las campañas</option>
                {campanas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <button onClick={abrirCrearMetrica} className="btn-primary flex items-center gap-2" disabled={campanasActivas.length === 0}>
              <HiOutlinePlus className="w-4 h-4" /> Registrar Métrica
            </button>
          </div>
          {campanasActivas.length === 0 && (
            <div className="card text-center text-steel-400 py-6">
              Debes crear al menos una campaña activa antes de registrar métricas.
            </div>
          )}
          <div className="card p-0 overflow-hidden">
            <TablaGenerica
              columnas={colsMetricas}
              datos={metricasPaginadas}
              cargando={cargandoMetricas}
              vacio="No hay métricas registradas para el periodo"
              acciones={(f) => (
                <>
                  <button onClick={(e) => { e.stopPropagation(); abrirEditarMetrica(f); }}
                    className="p-1.5 rounded-lg text-steel-400 hover:text-blue-400 hover:bg-steel-800 transition-colors">
                    <HiOutlinePencil className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setConfirmElimMetrica(f); }}
                    className="p-1.5 rounded-lg text-steel-400 hover:text-red-400 hover:bg-steel-800 transition-colors">
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                </>
              )}
            />
          </div>
          <Paginacion paginaActual={paginaMetricas} totalPaginas={totalPagMetricas} onChange={setPaginaMetricas} />
        </div>
      )}

      {/* ─── TAB MÉTRICAS PERSONALIZADAS ─── */}
      {tab === 'metricas_custom' && (
        <div className="space-y-6">
          {/* Sección: Definir métricas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-steel-200">Métricas Definidas</h2>
              <button onClick={abrirCrearMetricaCustom} className="btn-primary flex items-center gap-2">
                <HiOutlinePlus className="w-4 h-4" /> Nueva Métrica
              </button>
            </div>
            <div className="card p-0 overflow-hidden">
              <TablaGenerica
                columnas={colsMetricasCustom}
                datos={metricasCustom}
                cargando={cargandoCustom}
                vacio="No hay métricas personalizadas"
                acciones={(f) => (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); toggleActivaCustom(f); }}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${f.activa ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}>
                      {f.activa ? 'Desactivar' : 'Activar'}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); abrirEditarMetricaCustom(f); }}
                      className="p-1.5 rounded-lg text-steel-400 hover:text-blue-400 hover:bg-steel-800 transition-colors">
                      <HiOutlinePencil className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setConfirmElimCustom(f); }}
                      className="p-1.5 rounded-lg text-steel-400 hover:text-red-400 hover:bg-steel-800 transition-colors">
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </>
                )}
              />
            </div>
          </div>

          {/* Sección: Registros (misma lógica que tab Métricas) */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-wrap items-end gap-4">
                <DateRangePicker fechaInicio={filtros.fechaInicio} fechaFin={filtros.fechaFin} onChange={setFiltros} />
                <select className="input-field text-sm w-48" value={filtroMetricaCustom} onChange={e => { setFiltroMetricaCustom(e.target.value); setPaginaRegistros(1); }}>
                  <option value="">Todas las métricas</option>
                  {metricasCustom.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>
              <button onClick={abrirCrearRegistroCustom} className="btn-primary flex items-center gap-2" disabled={metricasCustomActivas.length === 0}>
                <HiOutlinePlus className="w-4 h-4" /> Registrar Valor
              </button>
            </div>
            {metricasCustomActivas.length === 0 && (
              <div className="card text-center text-steel-400 py-6">
                Debes crear al menos una métrica personalizada activa antes de registrar valores.
              </div>
            )}
            <div className="card p-0 overflow-hidden">
              <TablaGenerica
                columnas={colsRegistrosCustom}
                datos={registrosPaginados}
                cargando={cargandoRegistros}
                vacio="No hay registros para el periodo seleccionado"
                acciones={(f) => (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); abrirEditarRegistroCustom(f); }}
                      className="p-1.5 rounded-lg text-steel-400 hover:text-blue-400 hover:bg-steel-800 transition-colors">
                      <HiOutlinePencil className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setConfirmElimRegistro(f); }}
                      className="p-1.5 rounded-lg text-steel-400 hover:text-red-400 hover:bg-steel-800 transition-colors">
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </>
                )}
              />
            </div>
            <Paginacion paginaActual={paginaRegistros} totalPaginas={totalPagRegistros} onChange={setPaginaRegistros} />
          </div>
        </div>
      )}

      {/* ═══ MODAL CAMPAÑA ═══ */}
      <Modal abierto={modalCampana} cerrar={() => setModalCampana(false)} titulo={editandoCampana ? 'Editar Campaña' : 'Nueva Campaña'}>
        <form onSubmit={guardarCampana} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-steel-400 mb-1">Nombre</label>
            <input type="text" className="input-field w-full" required value={formCampana.nombre}
              onChange={e => setFormCampana({ ...formCampana, nombre: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-steel-400 mb-1">Plataforma</label>
            <select className="input-field w-full" required value={formCampana.plataforma}
              onChange={e => setFormCampana({ ...formCampana, plataforma: e.target.value })}>
              <option value="">Seleccionar</option>
              {PLATAFORMAS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-steel-400 mb-1">Presupuesto (S/)</label>
            <input type="number" step="0.01" min="0" className="input-field w-full" required value={formCampana.presupuesto}
              onChange={e => setFormCampana({ ...formCampana, presupuesto: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-steel-400 mb-1">Fecha Inicio</label>
              <input type="date" className="input-field w-full" required value={formCampana.fecha_inicio}
                onChange={e => setFormCampana({ ...formCampana, fecha_inicio: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-steel-400 mb-1">Fecha Fin (opcional)</label>
              <input type="date" className="input-field w-full" value={formCampana.fecha_fin}
                onChange={e => setFormCampana({ ...formCampana, fecha_fin: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-steel-400 mb-1">Vendedor responsable (opcional)</label>
            <select className="input-field w-full" value={formCampana.vendedor_user_id}
              onChange={e => setFormCampana({ ...formCampana, vendedor_user_id: e.target.value })}>
              <option value="">— Sin asignar —</option>
              {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombres}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalCampana(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">{editandoCampana ? 'Actualizar' : 'Crear'}</button>
          </div>
        </form>
      </Modal>

      {/* ═══ MODAL MÉTRICA ═══ */}
      <Modal abierto={modalMetrica} cerrar={() => setModalMetrica(false)} titulo={editandoMetrica ? 'Editar Métrica' : 'Registrar Métrica'} ancho="max-w-xl">
        <form onSubmit={guardarMetrica} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-steel-400 mb-1">Fecha</label>
              <input type="date" className="input-field w-full" required value={formMetrica.fecha}
                disabled={!!editandoMetrica}
                onChange={e => setFormMetrica({ ...formMetrica, fecha: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-steel-400 mb-1">Campaña</label>
              <select className="input-field w-full" required value={formMetrica.campana_id}
                disabled={!!editandoMetrica}
                onChange={e => setFormMetrica({ ...formMetrica, campana_id: e.target.value })}>
                <option value="">Seleccionar</option>
                {campanasActivas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-steel-400 mb-1">Gasto del día (S/)</label>
              <input type="number" step="0.01" min="0" className="input-field w-full" required value={formMetrica.gasto}
                onChange={e => setFormMetrica({ ...formMetrica, gasto: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-steel-400 mb-1">Leads recibidos</label>
              <input type="number" min="0" className="input-field w-full" required value={formMetrica.leads}
                onChange={e => setFormMetrica({ ...formMetrica, leads: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-steel-400 mb-1">Videos creados</label>
              <input type="number" min="0" className="input-field w-full" required value={formMetrica.videos_creados}
                onChange={e => setFormMetrica({ ...formMetrica, videos_creados: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-steel-400 mb-1">Contenido subido</label>
              <input type="number" min="0" className="input-field w-full" required value={formMetrica.contenido_subido}
                onChange={e => setFormMetrica({ ...formMetrica, contenido_subido: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-steel-400 mb-1">Notas (opcional)</label>
            <textarea className="input-field w-full" rows={2} value={formMetrica.notas}
              onChange={e => setFormMetrica({ ...formMetrica, notas: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalMetrica(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">{editandoMetrica ? 'Actualizar' : 'Registrar'}</button>
          </div>
        </form>
      </Modal>

      {/* ═══ DIALOGS CONFIRMACIÓN ═══ */}
      <DialogConfirmacion
        abierto={!!confirmElimCampana}
        titulo="Eliminar campaña"
        mensaje={`¿Eliminar "${confirmElimCampana?.nombre}"? Se eliminarán también todas sus métricas.`}
        onConfirmar={eliminarCampana}
        onCancelar={() => setConfirmElimCampana(null)}
      />
      <DialogConfirmacion
        abierto={!!confirmElimMetrica}
        titulo="Eliminar métrica"
        mensaje={`¿Eliminar la métrica del ${formatearFecha(confirmElimMetrica?.fecha)}?`}
        onConfirmar={eliminarMetrica}
        onCancelar={() => setConfirmElimMetrica(null)}
      />

      {/* ═══ MODAL MÉTRICA PERSONALIZADA ═══ */}
      <Modal abierto={modalMetricaCustom} cerrar={() => setModalMetricaCustom(false)} titulo={editandoMetricaCustom ? 'Editar Métrica' : 'Nueva Métrica Personalizada'}>
        <form onSubmit={guardarMetricaCustom} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-steel-400 mb-1">Nombre</label>
            <input type="text" className="input-field w-full" required value={formMetricaCustom.nombre}
              placeholder="Ej: Alcance orgánico, Interacciones, CTR..."
              onChange={e => setFormMetricaCustom({ ...formMetricaCustom, nombre: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-steel-400 mb-1">Unidad de medida</label>
              <input type="text" className="input-field w-full" value={formMetricaCustom.unidad}
                placeholder="Ej: %, S/, unidades..."
                onChange={e => setFormMetricaCustom({ ...formMetricaCustom, unidad: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-steel-400 mb-1">Color</label>
              <div className="flex items-center gap-2">
                <select className="input-field flex-1" value={formMetricaCustom.color}
                  onChange={e => setFormMetricaCustom({ ...formMetricaCustom, color: e.target.value })}>
                  {COLORES_METRICA.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <span className="w-8 h-8 rounded-lg border border-steel-700" style={{ backgroundColor: formMetricaCustom.color }} />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-steel-400 mb-1">Descripción (opcional)</label>
            <textarea className="input-field w-full" rows={2} value={formMetricaCustom.descripcion}
              placeholder="Describe qué mide esta métrica..."
              onChange={e => setFormMetricaCustom({ ...formMetricaCustom, descripcion: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalMetricaCustom(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">{editandoMetricaCustom ? 'Actualizar' : 'Crear'}</button>
          </div>
        </form>
      </Modal>

      {/* ═══ MODAL REGISTRO CUSTOM ═══ */}
      <Modal abierto={modalRegistroCustom} cerrar={() => setModalRegistroCustom(false)}
        titulo={editandoRegistroCustom ? 'Editar Registro' : 'Registrar Valor'}>
        <form onSubmit={guardarRegistroCustom} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-steel-400 mb-1">Fecha</label>
              <input type="date" className="input-field w-full" required value={formRegistroCustom.fecha}
                disabled={!!editandoRegistroCustom}
                onChange={e => setFormRegistroCustom({ ...formRegistroCustom, fecha: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-steel-400 mb-1">Métrica</label>
              <select className="input-field w-full" required value={formRegistroCustom.metrica_id}
                disabled={!!editandoRegistroCustom}
                onChange={e => setFormRegistroCustom({ ...formRegistroCustom, metrica_id: e.target.value })}>
                <option value="">Seleccionar</option>
                {metricasCustomActivas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-steel-400 mb-1">
                Valor {metricasCustom.find(m => String(m.id) === String(formRegistroCustom.metrica_id))?.unidad &&
                  <span className="text-steel-500">({metricasCustom.find(m => String(m.id) === String(formRegistroCustom.metrica_id)).unidad})</span>}
              </label>
              <input type="number" step="any" className="input-field w-full" required value={formRegistroCustom.valor}
                onChange={e => setFormRegistroCustom({ ...formRegistroCustom, valor: e.target.value })} />
            </div>
            <div />
          </div>
          <div>
            <label className="block text-xs font-medium text-steel-400 mb-1">Notas (opcional)</label>
            <textarea className="input-field w-full" rows={2} value={formRegistroCustom.notas}
              onChange={e => setFormRegistroCustom({ ...formRegistroCustom, notas: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalRegistroCustom(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">{editandoRegistroCustom ? 'Actualizar' : 'Registrar'}</button>
          </div>
        </form>
      </Modal>

      {/* ═══ DIALOGS CONFIRMACIÓN CUSTOM ═══ */}
      <DialogConfirmacion
        abierto={!!confirmElimCustom}
        titulo="Eliminar métrica personalizada"
        mensaje={`¿Eliminar "${confirmElimCustom?.nombre}"? Se eliminarán también todos sus registros.`}
        onConfirmar={eliminarMetricaCustom}
        onCancelar={() => setConfirmElimCustom(null)}
      />
      <DialogConfirmacion
        abierto={!!confirmElimRegistro}
        titulo="Eliminar registro"
        mensaje={`¿Eliminar el registro del ${formatearFecha(confirmElimRegistro?.fecha)}?`}
        onConfirmar={eliminarRegistroCustom}
        onCancelar={() => setConfirmElimRegistro(null)}
      />

      {/* ═══ MODAL PARÁMETROS MÍNIMOS (umbrales semáforo) ═══ */}
      <Modal abierto={modalParametros} cerrar={() => setModalParametros(false)} titulo="Parámetros mínimos (semáforo)">
        <form onSubmit={guardarParametros} className="space-y-4">
          <p className="text-xs text-steel-400">
            Umbrales globales de alerta. Valores por debajo del mínimo se mostrarán en rojo en la tabla diaria.
          </p>
          <div>
            <label className="block text-xs font-medium text-steel-400 mb-1">Efectividad Ventas mínima (%)</label>
            <input type="number" step="0.01" min="0" max="100" className="input-field w-full" required
              value={formParametros.efectividad_ventas_min}
              onChange={e => setFormParametros({ ...formParametros, efectividad_ventas_min: e.target.value })} />
            <span className="text-[11px] text-steel-500">Gasto publicidad / Ventas — por debajo = alerta</span>
          </div>
          <div>
            <label className="block text-xs font-medium text-steel-400 mb-1">Efectividad Utilidad mínima (%)</label>
            <input type="number" step="0.01" min="0" max="100" className="input-field w-full" required
              value={formParametros.efectividad_utilidad_min}
              onChange={e => setFormParametros({ ...formParametros, efectividad_utilidad_min: e.target.value })} />
            <span className="text-[11px] text-steel-500">Gasto publicidad / Utilidad — por debajo = alerta</span>
          </div>
          <div>
            <label className="block text-xs font-medium text-steel-400 mb-1">Tasa de Conversión mínima (%)</label>
            <input type="number" step="0.01" min="0" max="100" className="input-field w-full" required
              value={formParametros.tasa_conversion_min}
              onChange={e => setFormParametros({ ...formParametros, tasa_conversion_min: e.target.value })} />
            <span className="text-[11px] text-steel-500">Clientes / Leads — por encima = conversión aceptable</span>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalParametros(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Guardar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
