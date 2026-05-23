import { useState, useEffect, useCallback } from 'react';
import {
  HiOutlineChartBar,
  HiOutlineCash,
  HiOutlineUsers,
  HiOutlineShoppingCart,
  HiOutlineClock,
  HiOutlineFilter,
  HiOutlineRefresh,
  HiOutlineExclamationCircle,
} from 'react-icons/hi';
import api from '../../api/axios';
import { ROLES } from '../../config/roles';
import { TIPO_DESTINO } from '../../config/constants';
import TarjetaResumen from '../../components/ui/TarjetaResumen';
import TablaGenerica from '../../components/ui/TablaGenerica';
import GraficaBarras from '../../components/ui/GraficaBarras';
import DateRangePicker from '../../components/ui/DateRangePicker';
import Tabs from '../../components/ui/Tabs';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatearMoneda, formatearFecha } from '../../utils/formato';

/* ───────────── TABS ───────────── */
const TABS = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'productos', label: 'Productos' },
  { key: 'rotacion', label: 'Rotacion' },
  { key: 'vendedores', label: 'Vendedores' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'ventas-dia', label: 'Ventas por Dia' },
  { key: 'horas-dias', label: 'Horas/Dias Pico' },
  { key: 'distritos', label: 'Distritos' },
  { key: 'utilidad', label: 'Utilidad' },
  { key: 'sin-rotacion', label: 'Sin Rotacion' },
];

/* ───────────── COLUMNAS DE TABLAS ───────────── */
const colProductos = [
  { key: 'idx', label: '#', render: (_f, _c, i) => i + 1 },
  { key: 'nombre', label: 'Producto' },
  {
    key: 'total_vendido',
    label: 'Cant. Vendida',
    render: (f) => Number(f.total_vendido || 0).toLocaleString('es-PE'),
  },
  {
    key: 'monto_total',
    label: 'Monto Total',
    render: (f) => formatearMoneda(f.monto_total),
  },
];

const colRotacion = [
  { key: 'idx', label: '#', render: (_f, _c, i) => i + 1 },
  { key: 'nombre', label: 'Producto' },
  {
    key: 'total_vendido',
    label: 'Frecuencia de Venta',
    render: (f) => Number(f.total_vendido || 0).toLocaleString('es-PE'),
  },
  {
    key: 'monto_total',
    label: 'Monto Total',
    render: (f) => formatearMoneda(f.monto_total),
  },
];

const colVendedores = [
  { key: 'idx', label: '#', render: (_f, _c, i) => i + 1 },
  { key: 'nombres', label: 'Vendedor' },
  {
    key: 'total_ventas',
    label: 'N. Ventas',
    render: (f) => Number(f.total_ventas || 0).toLocaleString('es-PE'),
  },
  {
    key: 'monto_total',
    label: 'Monto Total',
    render: (f) => formatearMoneda(f.monto_total),
  },
];

const colClientes = [
  { key: 'idx', label: '#', render: (_f, _c, i) => i + 1 },
  { key: 'nombre', label: 'Cliente' },
  { key: 'dni', label: 'DNI' },
  {
    key: 'numero_compras',
    label: 'N. Compras',
    render: (f) => Number(f.numero_compras || 0).toLocaleString('es-PE'),
  },
  {
    key: 'monto_total',
    label: 'Monto Total',
    render: (f) => formatearMoneda(f.monto_total),
  },
];

const colDistritos = [
  { key: 'idx', label: '#', render: (_f, _c, i) => i + 1 },
  { key: 'distrito', label: 'Distrito' },
  {
    key: 'cantidad_ventas',
    label: 'Cant. Ventas',
    render: (f) => Number(f.cantidad_ventas || 0).toLocaleString('es-PE'),
  },
  {
    key: 'monto_total',
    label: 'Monto Total',
    render: (f) => formatearMoneda(f.monto_total),
  },
];

const colUtilidad = [
  { key: 'idx', label: '#', render: (_f, _c, i) => i + 1 },
  { key: 'nombre', label: 'Producto' },
  {
    key: 'utilidad',
    label: 'Utilidad',
    render: (f) => formatearMoneda(f.utilidad),
  },
  {
    key: 'unidades_vendidas',
    label: 'Unidades Vendidas',
    render: (f) => Number(f.unidades_vendidas || 0).toLocaleString('es-PE'),
  },
];

const colSinRotacion = [
  { key: 'idx', label: '#', render: (_f, _c, i) => i + 1 },
  { key: 'id', label: 'ID Producto' },
  { key: 'nombre', label: 'Producto' },
];

/* ───────────── FILTROS INICIALES ───────────── */
const filtrosIniciales = {
  fechaInicio: '',
  fechaFin: '',
  vendedor_user_id: '',
  product_id: '',
  distrito: '',
  tipo_destino: '',
  con_promocion: '',
  con_puntos: '',
};

/* ═══════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════ */
export default function Reportes() {
  const [tab, setTab] = useState('resumen');
  const [filtros, setFiltros] = useState({ ...filtrosIniciales });
  const [cargando, setCargando] = useState(false);

  /* ---------- Datos de API ---------- */
  const [dashboard, setDashboard] = useState({});
  const [general, setGeneral] = useState({});

  /* ---------- Catálogos para selects ---------- */
  const [listaVendedores, setListaVendedores] = useState([]);
  const [listaProductos, setListaProductos] = useState([]);

  /* Cargar catálogos una sola vez */
  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const [vendRes, prodRes] = await Promise.all([
          api.get('/usuarios', { params: { rol: ROLES.VENDEDOR } }).catch(() => ({ data: [] })),
          api.get('/productos').catch(() => ({ data: [] })),
        ]);
        const vArr = Array.isArray(vendRes.data)
          ? vendRes.data
          : Array.isArray(vendRes.data?.data)
            ? vendRes.data.data
            : [];
        const pArr = Array.isArray(prodRes.data)
          ? prodRes.data
          : Array.isArray(prodRes.data?.data)
            ? prodRes.data.data
            : [];
        setListaVendedores(vArr);
        setListaProductos(pArr);
      } catch {
        /* silencio */
      }
    };
    cargarCatalogos();
  }, []);

  /* ---------- Carga de datos principal ---------- */
  const cargarDatos = useCallback(async (filtrosOverride) => {
    setCargando(true);

    // Usar filtros override si se proporcionan (para limpiar)
    const f = filtrosOverride || filtros;

    // Construir params para /reportes/general
    const params = {};
    if (f.fechaInicio) params.fecha_desde = f.fechaInicio;
    if (f.fechaFin) params.fecha_hasta = f.fechaFin;
    if (f.vendedor_user_id) params.vendedor_user_id = f.vendedor_user_id;
    if (f.product_id) params.product_id = f.product_id;
    if (f.distrito) params.distrito = f.distrito;
    if (f.tipo_destino) params.tipo_destino = f.tipo_destino;
    if (f.con_promocion) params.con_promocion = f.con_promocion;
    if (f.con_puntos) params.con_puntos = f.con_puntos;

    try {
      const [dashRes, genRes] = await Promise.all([
        api.get('/reportes/resumen-dashboard').catch(() => ({ data: {} })),
        api.get('/reportes/general', { params }).catch(() => ({ data: {} })),
      ]);
      setDashboard(dashRes.data || {});
      setGeneral(genRes.data || {});
    } catch {
      /* errores individuales ya manejados */
    }
    setCargando(false);
  }, [filtros]);

  useEffect(() => {
    cargarDatos();
  }, []);

  /* ---------- Helpers de filtros ---------- */
  const handleFiltro = (campo, valor) => {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  };

  const aplicarFiltro = () => cargarDatos();

  const limpiarFiltros = () => {
    const limpios = { ...filtrosIniciales };
    setFiltros(limpios);
    cargarDatos(limpios);
  };

  /* ---------- Extraer datos de general ---------- */
  const productosMasVendidos = Array.isArray(general.productos_mas_vendidos)
    ? general.productos_mas_vendidos
    : [];
  const rankingVendedores = Array.isArray(general.ranking_vendedores)
    ? general.ranking_vendedores
    : [];
  const horasPico = Array.isArray(general.horas_pico) ? general.horas_pico : [];
  const diasPico = Array.isArray(general.dias_pico) ? general.dias_pico : [];
  const ventasPorDia = Array.isArray(general.ventas_por_dia)
    ? general.ventas_por_dia
    : [];
  const distritos = Array.isArray(general.distritos) ? general.distritos : [];
  const clientesFrecuentes = Array.isArray(general.clientes_frecuentes)
    ? general.clientes_frecuentes
    : [];
  const utilidadPorProducto = Array.isArray(general.utilidad_por_producto)
    ? [...general.utilidad_por_producto].sort(
        (a, b) => Number(b.utilidad || 0) - Number(a.utilidad || 0)
      )
    : [];
  const productosSinRotacion = Array.isArray(general.productos_sin_rotacion)
    ? general.productos_sin_rotacion
    : [];

  // Rotacion = productos ordenados por total_vendido (frecuencia)
  const productosRotacion = [...productosMasVendidos].sort(
    (a, b) => Number(b.total_vendido || 0) - Number(a.total_vendido || 0)
  );

  /* ═══════════ RENDER ═══════════ */
  return (
    <div>
      <h1 className="text-2xl font-bold font-display tracking-wider text-steel-100 mb-6">Reportes</h1>

      {/* ════════════ PANEL DE FILTROS ════════════ */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <HiOutlineFilter className="w-5 h-5 text-steel-400" />
          <h2 className="text-base font-semibold text-steel-200">Filtros</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Rango de fechas */}
          <div className="sm:col-span-2 lg:col-span-2">
            <DateRangePicker
              fechaInicio={filtros.fechaInicio}
              fechaFin={filtros.fechaFin}
              onChange={({ fechaInicio, fechaFin }) => {
                setFiltros((prev) => ({ ...prev, fechaInicio, fechaFin }));
              }}
            />
          </div>

          {/* Vendedor */}
          <div>
            <label className="block text-xs font-medium text-steel-300 mb-1">
              Vendedor
            </label>
            <select
              className="input-field text-sm w-full"
              value={filtros.vendedor_user_id}
              onChange={(e) => handleFiltro('vendedor_user_id', e.target.value)}
            >
              <option value="">Todos</option>
              {listaVendedores.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nombres || v.nombre || `ID ${v.id}`}
                </option>
              ))}
            </select>
          </div>

          {/* Producto */}
          <div>
            <label className="block text-xs font-medium text-steel-300 mb-1">
              Producto
            </label>
            <select
              className="input-field text-sm w-full"
              value={filtros.product_id}
              onChange={(e) => handleFiltro('product_id', e.target.value)}
            >
              <option value="">Todos</option>
              {listaProductos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Distrito */}
          <div>
            <label className="block text-xs font-medium text-steel-300 mb-1">
              Distrito
            </label>
            <input
              type="text"
              className="input-field text-sm w-full"
              placeholder="Ej: San Isidro"
              value={filtros.distrito}
              onChange={(e) => handleFiltro('distrito', e.target.value)}
            />
          </div>

          {/* Tipo destino */}
          <div>
            <label className="block text-xs font-medium text-steel-300 mb-1">
              Destino
            </label>
            <select
              className="input-field text-sm w-full"
              value={filtros.tipo_destino}
              onChange={(e) => handleFiltro('tipo_destino', e.target.value)}
            >
              <option value="">Todos</option>
              <option value={TIPO_DESTINO.LIMA}>Lima</option>
              <option value={TIPO_DESTINO.PROVINCIA}>Provincia</option>
            </select>
          </div>

          {/* Con promocion */}
          <div>
            <label className="block text-xs font-medium text-steel-300 mb-1">
              Con Promocion
            </label>
            <select
              className="input-field text-sm w-full"
              value={filtros.con_promocion}
              onChange={(e) => handleFiltro('con_promocion', e.target.value)}
            >
              <option value="">Todos</option>
              <option value="si">Si</option>
              <option value="no">No</option>
            </select>
          </div>

          {/* Con puntos */}
          <div>
            <label className="block text-xs font-medium text-steel-300 mb-1">
              Con Puntos
            </label>
            <select
              className="input-field text-sm w-full"
              value={filtros.con_puntos}
              onChange={(e) => handleFiltro('con_puntos', e.target.value)}
            >
              <option value="">Todos</option>
              <option value="si">Si</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>

        {/* Botones */}
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-steel-700/50">
          <button
            onClick={aplicarFiltro}
            className="btn-primary h-10 px-6 flex items-center gap-2"
          >
            <HiOutlineFilter className="w-4 h-4" />
            Aplicar
          </button>
          <button
            onClick={limpiarFiltros}
            className="btn-secondary h-10 px-6 flex items-center gap-2"
          >
            <HiOutlineRefresh className="w-4 h-4" />
            Limpiar
          </button>
        </div>
      </div>

      {/* ════════════ TABS ════════════ */}
      <Tabs tabs={TABS} tabActual={tab} onChange={setTab} />

      {cargando ? (
        <LoadingSpinner texto="Cargando reportes..." />
      ) : (
        <>
          {/* ==================== TAB RESUMEN ==================== */}
          {tab === 'resumen' && (
            <div>
              {/* Cards del dashboard */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <TarjetaResumen
                  titulo="Ventas del Mes"
                  valor={dashboard.ventas_mes || 0}
                  icono={HiOutlineShoppingCart}
                  color="blue"
                />
                <TarjetaResumen
                  titulo="Monto del Mes"
                  valor={formatearMoneda(dashboard.monto_mes || 0)}
                  icono={HiOutlineCash}
                  color="green"
                />
                <TarjetaResumen
                  titulo="Total Clientes"
                  valor={dashboard.total_clientes || 0}
                  icono={HiOutlineUsers}
                  color="purple"
                />
                <TarjetaResumen
                  titulo="Total Productos"
                  valor={dashboard.total_productos || 0}
                  icono={HiOutlineChartBar}
                  color="yellow"
                />
                <TarjetaResumen
                  titulo="Ventas Pendientes"
                  valor={dashboard.ventas_pendientes || 0}
                  icono={HiOutlineClock}
                  color="red"
                />
              </div>

              {/* Resumen numerico rapido de general */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="card text-center">
                  <p className="text-sm text-steel-400">Productos Vendidos</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {productosMasVendidos.length}
                  </p>
                </div>
                <div className="card text-center">
                  <p className="text-sm text-steel-400">Vendedores Activos</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {rankingVendedores.length}
                  </p>
                </div>
                <div className="card text-center">
                  <p className="text-sm text-steel-400">Clientes Frecuentes</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {clientesFrecuentes.length}
                  </p>
                </div>
                <div className="card text-center">
                  <p className="text-sm text-steel-400">Productos Sin Rotacion</p>
                  <p className="text-2xl font-bold text-red-600">
                    {productosSinRotacion.length}
                  </p>
                </div>
              </div>

              {/* Tabla resumen distritos top 5 */}
              {distritos.length > 0 && (
                <div className="card">
                  <h3 className="text-lg font-semibold mb-3">Top 5 Distritos</h3>
                  <TablaGenerica
                    columnas={colDistritos}
                    datos={distritos.slice(0, 5)}
                    cargando={false}
                    vacio="Sin datos de distritos."
                  />
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB PRODUCTOS ==================== */}
          {tab === 'productos' && (
            <div className="space-y-6">
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">
                  Productos Mas Vendidos
                </h3>
                <TablaGenerica
                  columnas={colProductos}
                  datos={productosMasVendidos}
                  cargando={false}
                  vacio="Sin datos de productos."
                />
              </div>
              <div className="card">
                <GraficaBarras
                  datos={productosMasVendidos.slice(0, 10).map((p) => ({
                    nombre: p.nombre,
                    total_vendido: Number(p.total_vendido || 0),
                  }))}
                  campoLabel="nombre"
                  campoValor="total_vendido"
                  titulo="Top 10 Productos por Cantidad Vendida"
                  color="bg-blue-500"
                />
              </div>
            </div>
          )}

          {/* ==================== TAB ROTACION ==================== */}
          {tab === 'rotacion' && (
            <div className="space-y-6">
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">
                  Rotacion de Productos (por Frecuencia de Venta)
                </h3>
                <TablaGenerica
                  columnas={colRotacion}
                  datos={productosRotacion}
                  cargando={false}
                  vacio="Sin datos de rotacion."
                />
              </div>
              <div className="card">
                <GraficaBarras
                  datos={productosRotacion.slice(0, 10).map((p) => ({
                    nombre: p.nombre,
                    total_vendido: Number(p.total_vendido || 0),
                  }))}
                  campoLabel="nombre"
                  campoValor="total_vendido"
                  titulo="Top 10 por Frecuencia de Rotacion"
                  color="bg-teal-500"
                />
              </div>
            </div>
          )}

          {/* ==================== TAB VENDEDORES ==================== */}
          {tab === 'vendedores' && (
            <div className="space-y-6">
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">
                  Ranking de Vendedores
                </h3>
                <TablaGenerica
                  columnas={colVendedores}
                  datos={rankingVendedores}
                  cargando={false}
                  vacio="Sin datos de vendedores."
                />
              </div>
              <div className="card">
                <GraficaBarras
                  datos={rankingVendedores.slice(0, 10).map((v) => ({
                    nombres: v.nombres,
                    monto_total: Number(v.monto_total || 0),
                  }))}
                  campoLabel="nombres"
                  campoValor="monto_total"
                  titulo="Top Vendedores por Monto"
                  color="bg-emerald-500"
                />
              </div>
            </div>
          )}

          {/* ==================== TAB CLIENTES ==================== */}
          {tab === 'clientes' && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">
                Clientes Mas Frecuentes
              </h3>
              <TablaGenerica
                columnas={colClientes}
                datos={clientesFrecuentes}
                cargando={false}
                vacio="Sin datos de clientes."
              />
            </div>
          )}

          {/* ==================== TAB VENTAS POR DIA ==================== */}
          {tab === 'ventas-dia' && (
            <div className="space-y-6">
              <div className="card">
                <GraficaBarras
                  datos={ventasPorDia.map((v) => ({
                    label: `Dia ${v.dia_mes}`,
                    valor: Number(v.cantidad || 0),
                  }))}
                  campoLabel="label"
                  campoValor="valor"
                  titulo="Cantidad de Ventas por Dia del Mes"
                  color="bg-primary-500"
                />
              </div>
              <div className="card">
                <GraficaBarras
                  datos={ventasPorDia.map((v) => ({
                    label: `Dia ${v.dia_mes}`,
                    valor: Number(v.monto || 0),
                  }))}
                  campoLabel="label"
                  campoValor="valor"
                  titulo="Monto de Ventas por Dia del Mes"
                  color="bg-indigo-500"
                />
              </div>
            </div>
          )}

          {/* ==================== TAB HORAS / DIAS PICO ==================== */}
          {tab === 'horas-dias' && (
            <div className="space-y-6">
              {/* Horas Pico */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Horas Pico</h3>
                <GraficaBarras
                  datos={[...horasPico]
                    .sort((a, b) => Number(a.hora) - Number(b.hora))
                    .map((h) => ({
                      label: `${String(h.hora).padStart(2, '0')}:00`,
                      valor: Number(h.cantidad || 0),
                    }))}
                  campoLabel="label"
                  campoValor="valor"
                  titulo="Ventas por Hora del Dia"
                  color="bg-orange-500"
                />
              </div>

              {/* Dias Pico */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Dias Pico</h3>
                <GraficaBarras
                  datos={[...diasPico]
                    .sort(
                      (a, b) => Number(b.cantidad || 0) - Number(a.cantidad || 0)
                    )
                    .slice(0, 15)
                    .map((d) => ({
                      label: formatearFecha(d.dia),
                      valor: Number(d.cantidad || 0),
                    }))}
                  campoLabel="label"
                  campoValor="valor"
                  titulo="Top 15 Dias con Mayor Cantidad de Ventas"
                  color="bg-rose-500"
                />
              </div>
            </div>
          )}

          {/* ==================== TAB DISTRITOS ==================== */}
          {tab === 'distritos' && (
            <div className="space-y-6">
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">
                  Ventas por Distrito
                </h3>
                <TablaGenerica
                  columnas={colDistritos}
                  datos={distritos}
                  cargando={false}
                  vacio="Sin datos de distritos."
                />
              </div>
              <div className="card">
                <GraficaBarras
                  datos={distritos.slice(0, 10).map((d) => ({
                    distrito: d.distrito || 'Sin distrito',
                    cantidad_ventas: Number(d.cantidad_ventas || 0),
                  }))}
                  campoLabel="distrito"
                  campoValor="cantidad_ventas"
                  titulo="Top 10 Distritos por Cantidad de Ventas"
                  color="bg-cyan-500"
                />
              </div>
            </div>
          )}

          {/* ==================== TAB UTILIDAD ==================== */}
          {tab === 'utilidad' && (
            <div className="space-y-6">
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">
                  Utilidad por Producto
                </h3>
                <TablaGenerica
                  columnas={colUtilidad}
                  datos={utilidadPorProducto}
                  cargando={false}
                  vacio="Sin datos de utilidad."
                />
              </div>
              <div className="card">
                <GraficaBarras
                  datos={utilidadPorProducto.slice(0, 10).map((u) => ({
                    nombre: u.nombre,
                    utilidad: Number(u.utilidad || 0),
                  }))}
                  campoLabel="nombre"
                  campoValor="utilidad"
                  titulo="Top 10 Productos por Utilidad"
                  color="bg-emerald-500"
                />
              </div>
            </div>
          )}

          {/* ==================== TAB SIN ROTACION ==================== */}
          {tab === 'sin-rotacion' && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <HiOutlineExclamationCircle className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-semibold">
                  Productos Sin Rotacion
                </h3>
                <span className="ml-auto text-sm text-steel-400">
                  {productosSinRotacion.length} producto(s)
                </span>
              </div>
              <TablaGenerica
                columnas={colSinRotacion}
                datos={productosSinRotacion}
                cargando={false}
                vacio="Todos los productos tienen ventas registradas en el periodo."
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
