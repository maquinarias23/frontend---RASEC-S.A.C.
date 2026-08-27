import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import BotonesExportar from '../../components/ui/BotonesExportar';
import { formatearMoneda, formatearFecha, formatearNumero } from '../../utils/formato';

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

/* ───────────── COLUMNAS DE EXPORTACION ─────────────
   Las tablas de pantalla usan `render` (JSX); Excel necesita el valor crudo
   para poder sumar y filtrar. Por eso la exportacion declara sus columnas
   aparte: `valor` devuelve el dato en bruto y `formato` solo se aplica al PDF.
   `tipo` decide la alineacion y el formato numerico del .xlsx.            */
const num = (valor) => Number(valor || 0);

const COL_INDICE = { header: '#', valor: (_f, i) => i + 1, tipo: 'numero', sinTotal: true, ancho: 6 };
const colMonto = (header, campo = 'monto_total') => ({
  header, valor: (f) => num(f[campo]), tipo: 'moneda', formato: formatearMoneda, ancho: 16,
});
const colCantidad = (header, campo) => ({
  header, valor: (f) => num(f[campo]), tipo: 'numero', formato: formatearNumero, ancho: 15,
});

const expProductos = [
  COL_INDICE,
  { header: 'Producto', valor: 'nombre', ancho: 45 },
  colCantidad('Cant. Vendida', 'total_vendido'),
  colMonto('Monto Total'),
];

const expRotacion = [
  COL_INDICE,
  { header: 'Producto', valor: 'nombre', ancho: 45 },
  colCantidad('Frecuencia de Venta', 'total_vendido'),
  colMonto('Monto Total'),
];

const expVendedores = [
  COL_INDICE,
  { header: 'Vendedor', valor: 'nombres', ancho: 32 },
  colCantidad('N. Ventas', 'total_ventas'),
  colMonto('Monto Total'),
];

const expClientes = [
  COL_INDICE,
  { header: 'Cliente', valor: 'nombre', ancho: 32 },
  { header: 'DNI', valor: 'dni', ancho: 14 },
  colCantidad('N. Compras', 'numero_compras'),
  colMonto('Monto Total'),
];

const expDistritos = [
  COL_INDICE,
  { header: 'Distrito', valor: (f) => f.distrito || 'Sin distrito', ancho: 28 },
  colCantidad('Cant. Ventas', 'cantidad_ventas'),
  colMonto('Monto Total'),
];

const expUtilidad = [
  COL_INDICE,
  { header: 'Producto', valor: 'nombre', ancho: 45 },
  colMonto('Utilidad', 'utilidad'),
  colCantidad('Unidades Vendidas', 'unidades_vendidas'),
];

const expSinRotacion = [
  COL_INDICE,
  { header: 'ID Producto', valor: (f) => f.id, tipo: 'numero', sinTotal: true, ancho: 12 },
  { header: 'Producto', valor: 'nombre', ancho: 45 },
];

const expVentasDia = [
  { header: 'Dia del Mes', valor: (f) => `Dia ${f.dia_mes}`, ancho: 14 },
  colCantidad('Cant. Ventas', 'cantidad'),
  colMonto('Monto', 'monto'),
];

const expHorasPico = [
  { header: 'Hora', valor: (f) => `${String(f.hora).padStart(2, '0')}:00`, ancho: 10 },
  colCantidad('Cant. Ventas', 'cantidad'),
];

const expDiasPico = [
  { header: 'Fecha', valor: (f) => formatearFecha(f.dia), ancho: 14 },
  colCantidad('Cant. Ventas', 'cantidad'),
];

const expIndicadores = [
  { header: 'Indicador', valor: 'indicador', ancho: 28 },
  { header: 'Valor', valor: 'valor', ancho: 18 },
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
  const navegar = useNavigate();
  const { pathname } = useLocation();
  const refContenido = useRef(null);

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

  // Mismo orden que muestran las graficas de Horas/Dias Pico.
  const horasPicoOrdenadas = [...horasPico].sort((a, b) => Number(a.hora) - Number(b.hora));
  const diasPicoOrdenados = [...diasPico].sort(
    (a, b) => Number(b.cantidad || 0) - Number(a.cantidad || 0)
  );

  /* ---------- Navegacion desde las tarjetas ---------- */
  /* Cada tarjeta lleva al reporte que la explica. Las de la izquierda del menu
     (Ventas Pendientes) salen del modulo: el prefijo se toma de la ruta actual
     porque esta misma pantalla la usan administrador, secretaria y supervision,
     y cada rol tiene su propio listado de ventas. */
  const irATab = (destino) => {
    setTab(destino);
    refContenido.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const irAVentas = () => {
    const prefijo = pathname.split('/')[1] || 'administrador';
    navegar(`/${prefijo}/ventas`);
  };

  /* ---------- Filtros aplicados, para el encabezado de los documentos ---------- */
  const nombreVendedor = listaVendedores.find(
    (v) => String(v.id) === String(filtros.vendedor_user_id)
  );
  const nombreProducto = listaProductos.find(
    (p) => String(p.id) === String(filtros.product_id)
  );
  const etiquetaDestino = {
    [TIPO_DESTINO.LIMA]: 'Lima',
    [TIPO_DESTINO.PROVINCIA]: 'Provincia',
  }[filtros.tipo_destino];

  const filtrosAplicados = [
    { etiqueta: 'Desde', valor: filtros.fechaInicio ? formatearFecha(filtros.fechaInicio) : '' },
    { etiqueta: 'Hasta', valor: filtros.fechaFin ? formatearFecha(filtros.fechaFin) : '' },
    { etiqueta: 'Vendedor', valor: nombreVendedor?.nombres || nombreVendedor?.nombre || '' },
    { etiqueta: 'Producto', valor: nombreProducto?.nombre || '' },
    { etiqueta: 'Distrito', valor: filtros.distrito },
    { etiqueta: 'Destino', valor: etiquetaDestino || '' },
    { etiqueta: 'Con promocion', valor: filtros.con_promocion ? (filtros.con_promocion === 'si' ? 'Si' : 'No') : '' },
    { etiqueta: 'Con puntos', valor: filtros.con_puntos ? (filtros.con_puntos === 'si' ? 'Si' : 'No') : '' },
  ].filter((f) => f.valor);

  /* ---------- Reporte exportable del tab activo ---------- */
  const REPORTES_EXPORTABLES = {
    resumen: {
      archivo: 'Reporte_Resumen',
      titulo: 'Resumen General',
      secciones: [
        {
          titulo: 'Indicadores',
          columnas: expIndicadores,
          filas: [
            { indicador: 'Ventas del mes', valor: formatearNumero(dashboard.ventas_mes || 0) },
            { indicador: 'Monto del mes', valor: formatearMoneda(dashboard.monto_mes || 0) },
            { indicador: 'Total clientes', valor: formatearNumero(dashboard.total_clientes || 0) },
            { indicador: 'Total productos', valor: formatearNumero(dashboard.total_productos || 0) },
            { indicador: 'Ventas pendientes', valor: formatearNumero(dashboard.ventas_pendientes || 0) },
            { indicador: 'Productos vendidos', valor: formatearNumero(productosMasVendidos.length) },
            { indicador: 'Vendedores activos', valor: formatearNumero(rankingVendedores.length) },
            { indicador: 'Clientes frecuentes', valor: formatearNumero(clientesFrecuentes.length) },
            { indicador: 'Productos sin rotacion', valor: formatearNumero(productosSinRotacion.length) },
          ],
        },
        {
          titulo: 'Top 5 Distritos',
          columnas: expDistritos,
          filas: distritos.slice(0, 5),
          totales: true,
        },
      ],
    },
    productos: {
      archivo: 'Reporte_Productos',
      titulo: 'Productos Mas Vendidos',
      secciones: [
        { titulo: 'Productos Mas Vendidos', columnas: expProductos, filas: productosMasVendidos, totales: true },
      ],
    },
    rotacion: {
      archivo: 'Reporte_Rotacion',
      titulo: 'Rotacion de Productos',
      secciones: [
        { titulo: 'Rotacion por Frecuencia de Venta', columnas: expRotacion, filas: productosRotacion, totales: true },
      ],
    },
    vendedores: {
      archivo: 'Reporte_Vendedores',
      titulo: 'Ranking de Vendedores',
      secciones: [
        { titulo: 'Ranking de Vendedores', columnas: expVendedores, filas: rankingVendedores, totales: true },
      ],
    },
    clientes: {
      archivo: 'Reporte_Clientes',
      titulo: 'Clientes Mas Frecuentes',
      secciones: [
        { titulo: 'Clientes Mas Frecuentes', columnas: expClientes, filas: clientesFrecuentes, totales: true },
      ],
    },
    'ventas-dia': {
      archivo: 'Reporte_Ventas_Por_Dia',
      titulo: 'Ventas por Dia del Mes',
      secciones: [
        { titulo: 'Ventas por Dia del Mes', columnas: expVentasDia, filas: ventasPorDia, totales: true },
      ],
    },
    'horas-dias': {
      archivo: 'Reporte_Horas_Dias_Pico',
      titulo: 'Horas y Dias Pico',
      secciones: [
        { titulo: 'Horas Pico', columnas: expHorasPico, filas: horasPicoOrdenadas, totales: true },
        { titulo: 'Dias Pico', columnas: expDiasPico, filas: diasPicoOrdenados, totales: true },
      ],
    },
    distritos: {
      archivo: 'Reporte_Distritos',
      titulo: 'Ventas por Distrito',
      secciones: [
        { titulo: 'Ventas por Distrito', columnas: expDistritos, filas: distritos, totales: true },
      ],
    },
    utilidad: {
      archivo: 'Reporte_Utilidad',
      titulo: 'Utilidad por Producto',
      secciones: [
        { titulo: 'Utilidad por Producto', columnas: expUtilidad, filas: utilidadPorProducto, totales: true },
      ],
    },
    'sin-rotacion': {
      archivo: 'Reporte_Sin_Rotacion',
      titulo: 'Productos Sin Rotacion',
      secciones: [
        { titulo: 'Productos Sin Rotacion', columnas: expSinRotacion, filas: productosSinRotacion },
      ],
    },
  };

  const reporteActivo = REPORTES_EXPORTABLES[tab];
  const registrosExportables = (reporteActivo?.secciones || []).reduce(
    (acc, s) => acc + (s.filas?.length || 0),
    0
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
      <div ref={refContenido} className="scroll-mt-4">
        <Tabs tabs={TABS} tabActual={tab} onChange={setTab} />
      </div>

      {/* ════════════ CABECERA DEL REPORTE ACTIVO ════════════ */}
      {reporteActivo && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-steel-100 truncate">
              {reporteActivo.titulo}
            </h2>
            <p className="text-xs text-steel-400">
              {registrosExportables} registro(s)
              {filtrosAplicados.length > 0
                ? ` · ${filtrosAplicados.length} filtro(s) aplicado(s)`
                : ' · sin filtros aplicados'}
            </p>
          </div>
          <BotonesExportar
            deshabilitado={cargando || registrosExportables === 0}
            reporte={() => ({ ...reporteActivo, filtros: filtrosAplicados })}
          />
        </div>
      )}

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
                  ayuda="Ver el reporte de ventas por dia"
                  onClick={() => irATab('ventas-dia')}
                />
                <TarjetaResumen
                  titulo="Monto del Mes"
                  valor={formatearMoneda(dashboard.monto_mes || 0)}
                  icono={HiOutlineCash}
                  color="green"
                  ayuda="Ver el reporte de ventas por dia"
                  onClick={() => irATab('ventas-dia')}
                />
                <TarjetaResumen
                  titulo="Total Clientes"
                  valor={dashboard.total_clientes || 0}
                  icono={HiOutlineUsers}
                  color="purple"
                  ayuda="Ver el reporte de clientes"
                  onClick={() => irATab('clientes')}
                />
                <TarjetaResumen
                  titulo="Total Productos"
                  valor={dashboard.total_productos || 0}
                  icono={HiOutlineChartBar}
                  color="yellow"
                  ayuda="Ver el reporte de productos"
                  onClick={() => irATab('productos')}
                />
                <TarjetaResumen
                  titulo="Ventas Pendientes"
                  valor={dashboard.ventas_pendientes || 0}
                  icono={HiOutlineClock}
                  color="red"
                  ayuda="Ir al listado de ventas"
                  onClick={irAVentas}
                />
              </div>

              {/* Resumen numerico rapido de general */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                  { titulo: 'Productos Vendidos', valor: productosMasVendidos.length, color: 'text-blue-600', destino: 'productos' },
                  { titulo: 'Vendedores Activos', valor: rankingVendedores.length, color: 'text-emerald-600', destino: 'vendedores' },
                  { titulo: 'Clientes Frecuentes', valor: clientesFrecuentes.length, color: 'text-purple-600', destino: 'clientes' },
                  { titulo: 'Productos Sin Rotacion', valor: productosSinRotacion.length, color: 'text-red-600', destino: 'sin-rotacion' },
                ].map((c) => (
                  <button
                    key={c.destino}
                    type="button"
                    onClick={() => irATab(c.destino)}
                    title={`Ver el reporte de ${c.titulo.toLowerCase()}`}
                    className="card text-center cursor-pointer hover:border-primary-500/50 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 transition-all duration-300"
                  >
                    <p className="text-sm text-steel-400">{c.titulo}</p>
                    <p className={`text-2xl font-bold ${c.color}`}>{c.valor}</p>
                  </button>
                ))}
              </div>

              {/* Tabla resumen distritos top 5 */}
              {distritos.length > 0 && (
                <div className="card">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="text-lg font-semibold">Top 5 Distritos</h3>
                    <button
                      type="button"
                      onClick={() => irATab('distritos')}
                      className="text-sm text-primary-600 hover:text-primary-500 transition-colors"
                    >
                      Ver reporte completo
                    </button>
                  </div>
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
