import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineEye,
  HiOutlineSearch,
  HiOutlineX,
  HiOutlineChat,
  HiOutlineSwitchHorizontal,
  HiOutlineTruck,
  HiOutlineFilter,
  HiOutlineCurrencyDollar,
  HiOutlinePhotograph,
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlineCalendar,
  HiOutlinePencil,
  HiOutlineUserGroup,
  HiOutlineExternalLink,
} from 'react-icons/hi';
import { ESTADO_COTIZACION, ORIGEN_COTIZACION, TIPO_ENTREGA, TIPO_DESTINO, TELEFONO_INPUT } from '../../config/constants';
import { obtenerDepartamentos, obtenerProvincias, obtenerDistritos } from '../../services/ubigeoService';
import useCrud from '../../hooks/useCrud';
import usePaginacion from '../../hooks/usePaginacion';
import TablaGenerica from '../../components/ui/TablaGenerica';
import Modal from '../../components/ui/Modal';
import Paginacion from '../../components/ui/Paginacion';
import DialogConfirmacion from '../../components/ui/DialogConfirmacion';
import { formatearMoneda, formatearFechaHora } from '../../utils/formato';
import api from '../../api/axios';
import toast from 'react-hot-toast';

// ---------------------------------------------------------------------------
// Badge de estado con colores especificos para cotizaciones
// ---------------------------------------------------------------------------
const ESTADO_COLORES = {
  [ESTADO_COTIZACION.PENDIENTE_WHATSAPP]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [ESTADO_COTIZACION.CONVERTIDA_A_VENTA]: 'bg-emerald-100 text-emerald-600 border-emerald-200',
  [ESTADO_COTIZACION.CANCELADA]: 'bg-red-100 text-red-800 border-red-200',
};

function CotizacionEstadoBadge({ estado }) {
  const clase = ESTADO_COLORES[estado] || 'bg-steel-800 text-steel-200 border-steel-700';
  const texto = estado?.replace(/_/g, ' ').toUpperCase() || 'N/A';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${clase}`}>
      {texto}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Badge de origen (Web | Prospecto)
// ---------------------------------------------------------------------------
const ORIGEN_COLORES = {
  [ORIGEN_COTIZACION.WEB]: 'bg-blue-100 text-blue-700 border-blue-200',
  [ORIGEN_COTIZACION.PROSPECTO]: 'bg-purple-100 text-purple-700 border-purple-200',
};
const ORIGEN_LABEL = {
  [ORIGEN_COTIZACION.WEB]: 'Web',
  [ORIGEN_COTIZACION.PROSPECTO]: 'Prospecto',
};

function OrigenBadge({ origen }) {
  const o = origen || ORIGEN_COTIZACION.WEB;
  const clase = ORIGEN_COLORES[o] || 'bg-steel-800 text-steel-200 border-steel-700';
  const Icon = o === ORIGEN_COTIZACION.PROSPECTO ? HiOutlineUserGroup : HiOutlineChat;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${clase}`}>
      <Icon className="w-3 h-3" />
      {ORIGEN_LABEL[o] || o}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Buscador de productos inline (para agregar items en conversion)
// ---------------------------------------------------------------------------
function BuscadorProductoInline({ onSeleccionar, disabled }) {
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const ref = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const cerrar = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, []);

  const buscar = (query) => {
    setTexto(query);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!query.trim()) { setResultados([]); setAbierto(false); return; }
    timeoutRef.current = setTimeout(async () => {
      setCargando(true);
      try {
        const { data } = await api.get('/productos');
        const lista = Array.isArray(data) ? data : (data.datos || data.data || []);
        const q = query.toLowerCase();
        const filtrados = lista.filter((p) =>
          p.nombre?.toLowerCase().includes(q) || p.id?.toString().includes(q)
        );
        setResultados(filtrados.slice(0, 10));
        setAbierto(filtrados.length > 0);
      } catch { setResultados([]); }
      setCargando(false);
    }, 300);
  };

  const seleccionar = (producto) => {
    setAbierto(false);
    setTexto('');
    setResultados([]);
    onSeleccionar(producto);
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-steel-500" />
        <input
          type="text"
          className="input-field pl-9 pr-8 text-xs py-1.5"
          placeholder="Buscar producto para agregar..."
          value={texto}
          onChange={(e) => buscar(e.target.value)}
          onFocus={() => resultados.length > 0 && setAbierto(true)}
          disabled={disabled}
        />
        {cargando && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-steel-600 border-t-primary-500 rounded-full animate-spin" />
        )}
      </div>
      {abierto && resultados.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-steel-800 border border-steel-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {resultados.map((p) => (
            <li key={p.id} onClick={() => seleccionar(p)}
              className="px-3 py-2 text-xs hover:bg-primary-50 cursor-pointer border-b border-steel-900/50 last:border-0">
              <span className="font-medium">{p.nombre}</span>
              <span className="text-steel-400 ml-2">{formatearMoneda(p.precio_vendedor || p.precio_venta_base)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Opciones de filtro por estado
// ---------------------------------------------------------------------------
const ESTADOS_FILTRO = [
  { value: '', label: 'Todos los estados' },
  { value: ESTADO_COTIZACION.PENDIENTE_WHATSAPP, label: 'Pendiente WhatsApp' },
  { value: ESTADO_COTIZACION.CONVERTIDA_A_VENTA, label: 'Convertida a Venta' },
  { value: ESTADO_COTIZACION.CANCELADA, label: 'Cancelada' },
];

// ---------------------------------------------------------------------------
// Columnas de la tabla
// ---------------------------------------------------------------------------
const columnas = [
  {
    key: 'id',
    label: 'ID',
    render: (f) => (
      <div className="flex items-center gap-2">
        <span>{f.id}</span>
        <OrigenBadge origen={f._origen} />
      </div>
    ),
  },
  {
    key: 'cliente',
    label: 'Cliente',
    render: (f) => (
      <div>
        <span className="font-medium">{f.tbl_clientes?.nombre || f.nombre_anonimo || '-'}</span>
        {f.tbl_clientes?.dni && (
          <span className="text-xs text-steel-500 ml-1">({f.tbl_clientes.dni})</span>
        )}
      </div>
    ),
  },
  {
    key: 'items_count',
    label: 'Items',
    render: (f) => (
      <span className="text-steel-300">{f.items?.length || 0} producto{(f.items?.length || 0) !== 1 ? 's' : ''}</span>
    ),
  },
  {
    key: 'total',
    label: 'Total',
    render: (f) => <span className="font-semibold">{formatearMoneda(f.total)}</span>,
  },
  {
    key: 'estado',
    label: 'Estado',
    render: (f) => <CotizacionEstadoBadge estado={f.estado} />,
  },
  {
    key: 'fecha',
    label: 'Fecha',
    render: (f) => formatearFechaHora(f.fecha_hora),
  },
];

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function Cotizaciones() {
  const navigate = useNavigate();
  const { datos, cargando, listar } = useCrud('/cotizaciones-web');

  const irAlProspecto = (prospectoId) => {
    navigate('/vendedor/prospectos', { state: { prospectoId } });
  };

  // --- Busqueda y filtros ---
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');

  // --- Modal detalle ---
  const [modalDetalle, setModalDetalle] = useState(false);
  const [cotizacionDetalle, setCotizacionDetalle] = useState(null);

  // --- Modal convertir ---
  const [modalConvertir, setModalConvertir] = useState(false);
  const [cotizacionConvertir, setCotizacionConvertir] = useState(null);
  const [formConvertir, setFormConvertir] = useState({
    tipo_entrega: TIPO_ENTREGA.ENVIO_POR_AGENCIA,
    transportista_id: '',
    tipo_destino: TIPO_DESTINO.LIMA,
    departamento_id: '',
    provincia_id: '',
    distrito_id: '',
    monto_inicial: '',
  });
  const [boucherFile, setBoucherFile] = useState(null);
  const [convirtiendo, setConvirtiendo] = useState(false);
  const [transportistas, setTransportistas] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [distritos, setDistritos] = useState([]);

  // --- Items editables para conversion ---
  const [itemsEditados, setItemsEditados] = useState([]);
  const [descuentoEditado, setDescuentoEditado] = useState('');

  // --- Dialog confirmacion para convertir ---
  const [dialogConfirmar, setDialogConfirmar] = useState(false);

  // --- WhatsApp cargando ---
  const [enviandoWhatsapp, setEnviandoWhatsapp] = useState(null);

  // =========================================================================
  // Calculos del modal de conversion (basados en items editados)
  // =========================================================================

  const subtotalEditado = useMemo(() => {
    return itemsEditados.reduce((sum, item) => {
      return sum + (item.cantidad * parseFloat(item.precio_unitario || 0));
    }, 0);
  }, [itemsEditados]);

  const totalEditado = useMemo(() => {
    const desc = parseFloat(descuentoEditado) || 0;
    return subtotalEditado - desc;
  }, [subtotalEditado, descuentoEditado]);

  // =========================================================================
  // Filtrado y paginacion
  // =========================================================================

  const datosFiltrados = useMemo(() => {
    let resultado = datos;

    // Filtro por estado
    if (filtroEstado) {
      resultado = resultado.filter((c) => c.estado === filtroEstado);
    }

    // Filtro por fecha desde
    if (filtroFechaDesde) {
      const desde = new Date(filtroFechaDesde + 'T00:00:00');
      resultado = resultado.filter((c) => {
        const fecha = new Date(c.fecha_hora);
        return fecha >= desde;
      });
    }

    // Filtro por fecha hasta
    if (filtroFechaHasta) {
      const hasta = new Date(filtroFechaHasta + 'T23:59:59');
      resultado = resultado.filter((c) => {
        const fecha = new Date(c.fecha_hora);
        return fecha <= hasta;
      });
    }

    // Busqueda por nombre de cliente o ID
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      resultado = resultado.filter((c) =>
        c.tbl_clientes?.nombre?.toLowerCase().includes(q) ||
        c.tbl_clientes?.dni?.includes(q) ||
        c.nombre_anonimo?.toLowerCase().includes(q) ||
        c.id?.toString().includes(q)
      );
    }

    return resultado;
  }, [datos, busqueda, filtroEstado, filtroFechaDesde, filtroFechaHasta]);

  const { datosPaginados, paginaActual, totalPaginas, irAPagina, setPaginaActual } =
    usePaginacion(datosFiltrados, 15);

  // Reset pagina cuando cambian filtros
  const cambiarBusqueda = (valor) => {
    setBusqueda(valor);
    setPaginaActual(1);
  };

  const cambiarFiltroEstado = (valor) => {
    setFiltroEstado(valor);
    setPaginaActual(1);
  };

  const cambiarFechaDesde = (valor) => {
    setFiltroFechaDesde(valor);
    setPaginaActual(1);
  };

  const cambiarFechaHasta = (valor) => {
    setFiltroFechaHasta(valor);
    setPaginaActual(1);
  };

  const limpiarFiltrosFecha = () => {
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setPaginaActual(1);
  };

  // =========================================================================
  // Ver detalle
  // =========================================================================

  const verDetalle = (cotizacion) => {
    setCotizacionDetalle(cotizacion);
    setModalDetalle(true);
  };

  // =========================================================================
  // Enviar WhatsApp
  // =========================================================================

  const enviarWhatsapp = async (cotizacion) => {
    setEnviandoWhatsapp(cotizacion.id);
    try {
      const { data } = await api.get(`/cotizaciones-web/${cotizacion.id}/whatsapp`);

      // El backend retorna { mensaje, cotizacion } - construir URL de WhatsApp
      const telefono = cotizacion.tbl_clientes?.telefono_principal || data.cotizacion?.tbl_clientes?.telefono_principal || '';
      const mensaje = data.mensaje || '';

      if (!telefono) {
        toast.error('El cliente no tiene telefono registrado');
        return;
      }

      // Normalizar a solo dígitos y añadir código de país si falta
      const telLimpio = TELEFONO_INPUT.toDigits(telefono);
      const telFinal = telLimpio.startsWith('51') ? telLimpio : `51${telLimpio}`;

      const url = `https://wa.me/${telFinal}?text=${encodeURIComponent(mensaje)}`;
      window.open(url, '_blank');
      toast.success('Enlace de WhatsApp abierto');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al generar mensaje de WhatsApp');
    } finally {
      setEnviandoWhatsapp(null);
    }
  };

  // =========================================================================
  // Abrir modal convertir (inicializa items editables)
  // =========================================================================

  const abrirModalConvertir = async (cotizacion) => {
    setCotizacionConvertir(cotizacion);
    setFormConvertir({
      tipo_entrega: TIPO_ENTREGA.ENVIO_POR_AGENCIA,
      transportista_id: '',
      tipo_destino: TIPO_DESTINO.LIMA,
      departamento_id: '',
      provincia_id: '',
      distrito_id: '',
      monto_inicial: '',
    });
    setBoucherFile(null);
    setProvincias([]);
    setDistritos([]);

    try {
      const [transp, deps] = await Promise.all([
        api.get('/transportistas'),
        obtenerDepartamentos(),
      ]);
      setTransportistas(Array.isArray(transp.data) ? transp.data : []);
      setDepartamentos(Array.isArray(deps.data) ? deps.data : []);
    } catch {
      setTransportistas([]);
      setDepartamentos([]);
    }

    // Inicializar items editables desde la cotizacion
    const itemsIniciales = (cotizacion.items || []).map((item) => ({
      product_id: item.product_id,
      nombre: item.tbl_productos?.nombre || `Producto #${item.product_id}`,
      cantidad: item.cantidad,
      precio_unitario: parseFloat(item.precio_unitario || 0),
    }));
    setItemsEditados(itemsIniciales);
    setDescuentoEditado(parseFloat(cotizacion.descuento || 0) > 0 ? cotizacion.descuento.toString() : '');

    setModalConvertir(true);
  };

  const handleDepartamentoChange = async (depId) => {
    setFormConvertir((prev) => ({ ...prev, departamento_id: depId, provincia_id: '', distrito_id: '' }));
    setProvincias([]);
    setDistritos([]);
    if (!depId) return;
    try {
      const { data } = await obtenerProvincias(depId);
      setProvincias(Array.isArray(data) ? data : []);
    } catch {
      setProvincias([]);
    }
  };

  const handleProvinciaChange = async (provId) => {
    setFormConvertir((prev) => ({ ...prev, provincia_id: provId, distrito_id: '' }));
    setDistritos([]);
    if (!provId) return;
    try {
      const { data } = await obtenerDistritos(provId);
      setDistritos(Array.isArray(data) ? data : []);
    } catch {
      setDistritos([]);
    }
  };

  // =========================================================================
  // Funciones de edicion de items
  // =========================================================================

  const actualizarItem = (idx, campo, valor) => {
    setItemsEditados((prev) => {
      const nuevos = [...prev];
      nuevos[idx] = { ...nuevos[idx], [campo]: valor };
      return nuevos;
    });
  };

  const eliminarItem = (idx) => {
    setItemsEditados((prev) => {
      if (prev.length <= 1) {
        toast.error('La venta debe tener al menos un item');
        return prev;
      }
      return prev.filter((_, i) => i !== idx);
    });
  };

  const agregarProducto = (producto) => {
    // Verificar si ya existe
    const idxExistente = itemsEditados.findIndex((i) => i.product_id === producto.id);
    if (idxExistente >= 0) {
      actualizarItem(idxExistente, 'cantidad', itemsEditados[idxExistente].cantidad + 1);
      toast.success(`Cantidad de "${producto.nombre}" incrementada`);
      return;
    }

    const precio = parseFloat(producto.precio_vendedor || producto.precio_venta_base || 0);
    setItemsEditados((prev) => [
      ...prev,
      {
        product_id: producto.id,
        nombre: producto.nombre,
        cantidad: 1,
        precio_unitario: precio,
      },
    ]);
    toast.success(`"${producto.nombre}" agregado`);
  };

  // =========================================================================
  // Confirmar y ejecutar conversion
  // =========================================================================

  const confirmarConversion = () => {
    if (itemsEditados.length === 0) {
      toast.error('La venta debe tener al menos un item');
      return;
    }
    for (const item of itemsEditados) {
      if (item.cantidad < 1) {
        toast.error(`La cantidad de "${item.nombre}" debe ser mayor a 0`);
        return;
      }
      if (!item.precio_unitario || parseFloat(item.precio_unitario) <= 0) {
        toast.error(`El precio de "${item.nombre}" debe ser mayor a 0`);
        return;
      }
    }
    if (formConvertir.tipo_entrega === TIPO_ENTREGA.ENVIO_POR_AGENCIA) {
      if (!formConvertir.transportista_id) {
        toast.error('Selecciona la agencia transportista');
        return;
      }
      if (!formConvertir.departamento_id || !formConvertir.provincia_id || !formConvertir.distrito_id) {
        toast.error('Selecciona departamento, provincia y distrito');
        return;
      }
    }
    const montoInicial = parseFloat(formConvertir.monto_inicial);
    if (!formConvertir.monto_inicial || isNaN(montoInicial) || montoInicial <= 0) {
      toast.error('Ingresa un monto inicial valido');
      return;
    }
    if (montoInicial > totalEditado) {
      toast.error('El monto inicial no puede superar el total de la venta');
      return;
    }
    if (!boucherFile) {
      toast.error('Debes adjuntar el boucher de pago');
      return;
    }
    setDialogConfirmar(true);
  };

  const ejecutarConversion = async () => {
    if (!cotizacionConvertir) return;

    // Validaciones frontend
    if (itemsEditados.length === 0) {
      toast.error('La venta debe tener al menos un item');
      return;
    }
    const montoInicial = parseFloat(formConvertir.monto_inicial);
    if (!formConvertir.monto_inicial || isNaN(montoInicial) || montoInicial <= 0) {
      toast.error('Ingresa un monto inicial valido');
      return;
    }
    if (montoInicial > totalEditado) {
      toast.error('El monto inicial no puede superar el total de la venta');
      return;
    }
    if (!boucherFile) {
      toast.error('Debes adjuntar el boucher de pago');
      return;
    }

    setDialogConfirmar(false);
    setConvirtiendo(true);

    try {
      const formData = new FormData();
      formData.append('tipo_entrega', formConvertir.tipo_entrega);
      formData.append('tipo_destino', formConvertir.tipo_destino);
      if (formConvertir.tipo_entrega === TIPO_ENTREGA.ENVIO_POR_AGENCIA) {
        formData.append('transportista_id', formConvertir.transportista_id);
        formData.append('departamento_id', formConvertir.departamento_id);
        formData.append('provincia_id', formConvertir.provincia_id);
        formData.append('distrito_id', formConvertir.distrito_id);
      }
      formData.append('monto_inicial', formConvertir.monto_inicial);
      formData.append('boucher', boucherFile);

      // Enviar items editados y descuento
      formData.append('items_editados', JSON.stringify(
        itemsEditados.map((item) => ({
          product_id: item.product_id,
          cantidad: parseInt(item.cantidad),
          precio_unitario: parseFloat(item.precio_unitario),
        }))
      ));
      formData.append('descuento', parseFloat(descuentoEditado) || 0);

      const { data } = await api.post(
        `/cotizaciones-web/${cotizacionConvertir.id}/convertir`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      toast.success(data.mensaje || 'Cotizacion convertida a venta exitosamente');
      setModalConvertir(false);
      setCotizacionConvertir(null);
      setBoucherFile(null);
      setItemsEditados([]);
      setDescuentoEditado('');

      // Si el modal detalle estaba abierto, cerrarlo tambien
      if (modalDetalle) {
        setModalDetalle(false);
        setCotizacionDetalle(null);
      }

      listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al convertir cotizacion a venta');
    } finally {
      setConvirtiendo(false);
    }
  };

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div>
      {/* ENCABEZADO */}
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <div>
          <h1 className="text-2xl font-bold text-steel-100 font-display tracking-wider">Cotizaciones</h1>
          <p className="text-sm text-steel-400 mt-1">
            {datosFiltrados.length} cotizacion{datosFiltrados.length !== 1 ? 'es' : ''} encontrada{datosFiltrados.length !== 1 ? 's' : ''}
            {datos.length !== datosFiltrados.length && (
              <span className="text-steel-500"> de {datos.length} total{datos.length !== 1 ? 'es' : ''}</span>
            )}
            <span className="text-steel-500"> (incluye web y prospectos)</span>
          </p>
        </div>
      </div>

      {/* BARRA DE BUSQUEDA Y FILTROS */}
      <div className="card mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Busqueda */}
          <div className="relative flex-1">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-500" />
            <input
              type="text"
              className="input-field pl-9 pr-8"
              placeholder="Buscar por nombre de cliente, DNI o ID de cotizacion..."
              value={busqueda}
              onChange={(e) => cambiarBusqueda(e.target.value)}
            />
            {busqueda && (
              <button
                onClick={() => cambiarBusqueda('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-steel-500 hover:text-steel-300"
              >
                <HiOutlineX className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filtro estado */}
          <div className="relative sm:w-56">
            <HiOutlineFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-500" />
            <select
              className="input-field pl-9 appearance-none"
              value={filtroEstado}
              onChange={(e) => cambiarFiltroEstado(e.target.value)}
            >
              {ESTADOS_FILTRO.map((op) => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtro por fechas */}
        <div className="flex flex-col sm:flex-row gap-3 mt-3 items-end">
          <div className="flex-1">
            <label className="block text-xs text-steel-400 mb-1">
              <HiOutlineCalendar className="w-3.5 h-3.5 inline mr-1" />
              Desde
            </label>
            <input
              type="date"
              className="input-field text-sm"
              value={filtroFechaDesde}
              onChange={(e) => cambiarFechaDesde(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-steel-400 mb-1">
              <HiOutlineCalendar className="w-3.5 h-3.5 inline mr-1" />
              Hasta
            </label>
            <input
              type="date"
              className="input-field text-sm"
              value={filtroFechaHasta}
              onChange={(e) => cambiarFechaHasta(e.target.value)}
            />
          </div>
          {(filtroFechaDesde || filtroFechaHasta) && (
            <button
              onClick={limpiarFiltrosFecha}
              className="text-xs text-steel-400 hover:text-steel-200 flex items-center gap-1 pb-2"
            >
              <HiOutlineX className="w-3.5 h-3.5" />
              Limpiar fechas
            </button>
          )}
        </div>
      </div>

      {/* TABLA DE COTIZACIONES */}
      <div className="card">
        <TablaGenerica
          columnas={columnas}
          datos={datosPaginados}
          cargando={cargando}
          vacio="No se encontraron cotizaciones."
          acciones={(fila) => {
            const esProspecto = fila._origen === ORIGEN_COTIZACION.PROSPECTO;
            return (
              <div className="flex gap-1">
                {/* Ver detalle (siempre disponible) */}
                <button
                  onClick={() => verDetalle(fila)}
                  className="text-xs bg-steel-800 text-steel-200 px-2 py-1 rounded hover:bg-steel-700 flex items-center gap-1"
                  title="Ver detalle"
                >
                  <HiOutlineEye className="w-3.5 h-3.5" />
                </button>

                {/* Si es de origen Prospecto: redirigir al módulo Prospectos */}
                {esProspecto && (
                  <button
                    onClick={() => irAlProspecto(fila.prospecto_id)}
                    className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 flex items-center gap-1"
                    title="Gestionar en módulo Prospectos"
                  >
                    <HiOutlineExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Prospecto</span>
                  </button>
                )}

                {/* Acciones de cotización Web */}
                {!esProspecto && fila.estado === ESTADO_COTIZACION.PENDIENTE_WHATSAPP && (
                  <button
                    onClick={() => enviarWhatsapp(fila)}
                    disabled={enviandoWhatsapp === fila.id}
                    className="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded hover:bg-emerald-200 flex items-center gap-1 disabled:opacity-50"
                    title="Enviar por WhatsApp"
                  >
                    {enviandoWhatsapp === fila.id ? (
                      <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <HiOutlineChat className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">WhatsApp</span>
                  </button>
                )}

                {!esProspecto && fila.estado === ESTADO_COTIZACION.PENDIENTE_WHATSAPP && (
                  <button
                    onClick={() => abrirModalConvertir(fila)}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 flex items-center gap-1"
                    title="Convertir a venta"
                  >
                    <HiOutlineSwitchHorizontal className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Convertir</span>
                  </button>
                )}
              </div>
            );
          }}
        />
        <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onChange={irAPagina} />
      </div>

      {/* ================================================================= */}
      {/* MODAL: DETALLE DE COTIZACION                                      */}
      {/* ================================================================= */}
      <Modal
        abierto={modalDetalle}
        cerrar={() => { setModalDetalle(false); setCotizacionDetalle(null); }}
        titulo={`Detalle Cotizacion #${cotizacionDetalle?.id || ''}`}
        ancho="max-w-2xl"
      >
        {cotizacionDetalle && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Info general */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-steel-900/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-steel-400 block text-xs">Cliente</span>
                  <OrigenBadge origen={cotizacionDetalle._origen} />
                </div>
                <span className="font-medium">{cotizacionDetalle.tbl_clientes?.nombre || cotizacionDetalle.nombre_anonimo || '-'}</span>
                {cotizacionDetalle.tbl_clientes?.dni && (
                  <span className="text-xs text-steel-500 ml-1">({cotizacionDetalle.tbl_clientes.dni})</span>
                )}
              </div>
              <div className="bg-steel-900/50 rounded-lg p-3">
                <span className="text-steel-400 block text-xs">Telefono</span>
                <span className="font-medium">{TELEFONO_INPUT.format(cotizacionDetalle.tbl_clientes?.telefono_principal) || '-'}</span>
              </div>
              <div className="bg-steel-900/50 rounded-lg p-3">
                <span className="text-steel-400 block text-xs">Estado</span>
                <CotizacionEstadoBadge estado={cotizacionDetalle.estado} />
              </div>
              <div className="bg-steel-900/50 rounded-lg p-3">
                <span className="text-steel-400 block text-xs">Fecha</span>
                <span className="font-medium">{formatearFechaHora(cotizacionDetalle.fecha_hora)}</span>
              </div>
            </div>

            {/* Tabla de items */}
            {cotizacionDetalle.items?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-steel-200 mb-2">Items de la cotizacion</h4>
                <div className="overflow-x-auto border border-steel-700 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-steel-900/50">
                      <tr>
                        <th className="text-left py-2 px-3 font-semibold text-steel-300">Producto</th>
                        <th className="text-center py-2 px-3 font-semibold text-steel-300">Cant.</th>
                        <th className="text-right py-2 px-3 font-semibold text-steel-300">P. Unit.</th>
                        <th className="text-right py-2 px-3 font-semibold text-steel-300">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cotizacionDetalle.items.map((item, idx) => {
                        const subtotalItem = item.cantidad * parseFloat(item.precio_unitario || 0);
                        return (
                          <tr key={item.id || idx} className="border-t border-steel-700/50 hover:bg-steel-800">
                            <td className="py-2 px-3 font-medium">
                              {item.tbl_productos?.nombre || `Producto #${item.product_id}`}
                            </td>
                            <td className="text-center py-2 px-3">{item.cantidad}</td>
                            <td className="text-right py-2 px-3">{formatearMoneda(item.precio_unitario)}</td>
                            <td className="text-right py-2 px-3 font-semibold">{formatearMoneda(subtotalItem)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Totales */}
            <div className="bg-steel-900/50 rounded-lg p-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-steel-400">Subtotal:</span>
                <span className="font-medium">{formatearMoneda(cotizacionDetalle.subtotal)}</span>
              </div>
              {parseFloat(cotizacionDetalle.descuento || 0) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Descuento:</span>
                  <span>-{formatearMoneda(cotizacionDetalle.descuento)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-primary-700 pt-2 border-t border-steel-700">
                <span>Total:</span>
                <span>{formatearMoneda(cotizacionDetalle.total)}</span>
              </div>
            </div>

            {/* Botones de accion dentro del detalle */}
            {cotizacionDetalle._origen === ORIGEN_COTIZACION.PROSPECTO ? (
              <div className="flex justify-end gap-3 pt-3 border-t border-steel-700">
                <button
                  onClick={() => {
                    setModalDetalle(false);
                    irAlProspecto(cotizacionDetalle.prospecto_id);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                >
                  <HiOutlineExternalLink className="w-4 h-4" />
                  Gestionar en Prospectos
                </button>
              </div>
            ) : (
              cotizacionDetalle.estado === ESTADO_COTIZACION.PENDIENTE_WHATSAPP && (
                <div className="flex justify-end gap-3 pt-3 border-t border-steel-700">
                  <button
                    onClick={() => enviarWhatsapp(cotizacionDetalle)}
                    disabled={enviandoWhatsapp === cotizacionDetalle.id}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {enviandoWhatsapp === cotizacionDetalle.id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <HiOutlineChat className="w-4 h-4" />
                    )}
                    Enviar WhatsApp
                  </button>
                  <button
                    onClick={() => {
                      setModalDetalle(false);
                      abrirModalConvertir(cotizacionDetalle);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    <HiOutlineSwitchHorizontal className="w-4 h-4" />
                    Convertir a Venta
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </Modal>

      {/* ================================================================= */}
      {/* MODAL: CONVERTIR A VENTA (con items editables)                    */}
      {/* ================================================================= */}
      <Modal
        abierto={modalConvertir}
        cerrar={() => { if (!convirtiendo) { setModalConvertir(false); setCotizacionConvertir(null); } }}
        titulo={`Convertir Cotizacion #${cotizacionConvertir?.id || ''} a Venta`}
        ancho="max-w-2xl"
      >
        {cotizacionConvertir && (
          <div className="space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Info del cliente */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-600">Cliente:</span>
                <span className="font-medium text-blue-600">{cotizacionConvertir.tbl_clientes?.nombre || '-'}</span>
              </div>
            </div>

            {/* ---- ITEMS EDITABLES ---- */}
            <div>
              <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                <h4 className="text-sm font-semibold text-steel-200 flex items-center gap-1.5">
                  <HiOutlinePencil className="w-4 h-4" />
                  Items de la venta
                </h4>
                <span className="text-xs text-steel-400">{itemsEditados.length} producto{itemsEditados.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Tabla de items editables */}
              <div className="overflow-x-auto border border-steel-700 rounded-lg mb-2">
                <table className="w-full text-xs">
                  <thead className="bg-steel-900/50">
                    <tr>
                      <th className="text-left py-2 px-3 font-semibold text-steel-300">Producto</th>
                      <th className="text-center py-2 px-3 font-semibold text-steel-300 w-20">Cant.</th>
                      <th className="text-right py-2 px-3 font-semibold text-steel-300 w-28">P. Unit.</th>
                      <th className="text-right py-2 px-3 font-semibold text-steel-300 w-24">Subtotal</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsEditados.map((item, idx) => {
                      const subtotalItem = item.cantidad * parseFloat(item.precio_unitario || 0);
                      return (
                        <tr key={`${item.product_id}-${idx}`} className="border-t border-steel-700/50">
                          <td className="py-1.5 px-3 font-medium text-steel-200">
                            {item.nombre}
                          </td>
                          <td className="py-1.5 px-1">
                            <input
                              type="number"
                              min="1"
                              className="input-field text-center text-xs py-1 px-1 w-full"
                              value={item.cantidad}
                              onChange={(e) => actualizarItem(idx, 'cantidad', e.target.value)}
                              onBlur={(e) => {
                                const n = parseInt(e.target.value);
                                actualizarItem(idx, 'cantidad', Number.isFinite(n) && n > 0 ? n : 1);
                              }}
                              disabled={convirtiendo}
                            />
                          </td>
                          <td className="py-1.5 px-1">
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              className="input-field text-right text-xs py-1 px-2 w-full"
                              value={item.precio_unitario}
                              onChange={(e) => actualizarItem(idx, 'precio_unitario', e.target.value)}
                              disabled={convirtiendo}
                            />
                          </td>
                          <td className="text-right py-1.5 px-3 font-semibold text-steel-200">
                            {formatearMoneda(subtotalItem)}
                          </td>
                          <td className="py-1.5 px-1 text-center">
                            <button
                              type="button"
                              onClick={() => eliminarItem(idx)}
                              className="text-red-500 hover:text-red-400 p-1"
                              disabled={convirtiendo}
                              title="Quitar item"
                            >
                              <HiOutlineTrash className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Agregar producto */}
              <BuscadorProductoInline onSeleccionar={agregarProducto} disabled={convirtiendo} />
            </div>

            {/* Descuento editable */}
            <div>
              <label className="block text-xs font-medium text-steel-300 mb-1">
                Descuento (S/)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input-field text-sm"
                placeholder="0.00"
                value={descuentoEditado}
                onChange={(e) => setDescuentoEditado(e.target.value)}
                disabled={convirtiendo}
              />
            </div>

            {/* Totales calculados */}
            <div className="bg-steel-900/50 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-steel-400">Subtotal:</span>
                <span className="font-medium">{formatearMoneda(subtotalEditado)}</span>
              </div>
              {parseFloat(descuentoEditado || 0) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Descuento:</span>
                  <span>-{formatearMoneda(descuentoEditado)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-primary-700 pt-2 border-t border-steel-700">
                <span>Total:</span>
                <span>{formatearMoneda(totalEditado)}</span>
              </div>
            </div>

            <hr className="border-steel-700" />

            {/* Tipo de entrega */}
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1">
                <HiOutlineTruck className="w-4 h-4 inline mr-1" />
                Tipo de Entrega <span className="text-red-600">*</span>
              </label>
              <select
                className="input-field"
                value={formConvertir.tipo_entrega}
                onChange={(e) => setFormConvertir({
                  ...formConvertir,
                  tipo_entrega: e.target.value,
                  transportista_id: '',
                  departamento_id: '',
                  provincia_id: '',
                  distrito_id: '',
                })}
                disabled={convirtiendo}
              >
                <option value={TIPO_ENTREGA.ENVIO_POR_AGENCIA}>Envio por Agencia</option>
                <option value={TIPO_ENTREGA.RETIRO_EN_TIENDA}>Retiro en Tienda</option>
              </select>
            </div>

            {formConvertir.tipo_entrega === TIPO_ENTREGA.ENVIO_POR_AGENCIA && (
              <>
                <div>
                  <label className="block text-sm font-medium text-steel-200 mb-1">
                    Agencia Transportista <span className="text-red-600">*</span>
                  </label>
                  <select
                    className="input-field"
                    value={formConvertir.transportista_id}
                    onChange={(e) => setFormConvertir({ ...formConvertir, transportista_id: e.target.value })}
                    disabled={convirtiendo}
                    required
                  >
                    <option value="">Seleccionar agencia...</option>
                    {transportistas.map((t) => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Tipo de destino */}
                <div>
                  <label className="block text-sm font-medium text-steel-200 mb-1">
                    Tipo de Destino <span className="text-red-600">*</span>
                  </label>
                  <select
                    className="input-field"
                    value={formConvertir.tipo_destino}
                    onChange={(e) => setFormConvertir({ ...formConvertir, tipo_destino: e.target.value })}
                    disabled={convirtiendo}
                  >
                    <option value={TIPO_DESTINO.LIMA}>Lima</option>
                    <option value={TIPO_DESTINO.PROVINCIA}>Provincia</option>
                  </select>
                </div>

                {/* Cascada ubigeo */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-steel-200 mb-1">
                      Departamento <span className="text-red-600">*</span>
                    </label>
                    <select
                      className="input-field"
                      value={formConvertir.departamento_id}
                      onChange={(e) => handleDepartamentoChange(e.target.value)}
                      disabled={convirtiendo}
                      required
                    >
                      <option value="">Seleccionar...</option>
                      {departamentos.map((d) => (
                        <option key={d.id} value={d.id}>{d.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-steel-200 mb-1">
                      Provincia <span className="text-red-600">*</span>
                    </label>
                    <select
                      className="input-field"
                      value={formConvertir.provincia_id}
                      onChange={(e) => handleProvinciaChange(e.target.value)}
                      disabled={convirtiendo || !formConvertir.departamento_id}
                      required
                    >
                      <option value="">{formConvertir.departamento_id ? 'Seleccionar...' : 'Elija depto.'}</option>
                      {provincias.map((p) => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-steel-200 mb-1">
                      Distrito <span className="text-red-600">*</span>
                    </label>
                    <select
                      className="input-field"
                      value={formConvertir.distrito_id}
                      onChange={(e) => setFormConvertir({ ...formConvertir, distrito_id: e.target.value })}
                      disabled={convirtiendo || !formConvertir.provincia_id}
                      required
                    >
                      <option value="">{formConvertir.provincia_id ? 'Seleccionar...' : 'Elija provincia'}</option>
                      {distritos.map((d) => (
                        <option key={d.id} value={d.id}>{d.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Monto inicial */}
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1">
                <HiOutlineCurrencyDollar className="w-4 h-4 inline mr-1" />
                Monto Inicial (pago) <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                className="input-field"
                placeholder="Ej: 150.00"
                min="0.01"
                step="0.01"
                max={totalEditado > 0 ? totalEditado : undefined}
                value={formConvertir.monto_inicial}
                onChange={(e) => setFormConvertir({ ...formConvertir, monto_inicial: e.target.value })}
                disabled={convirtiendo}
              />
              <p className="text-xs text-steel-500 mt-1">
                Total de la venta: {formatearMoneda(totalEditado)}
              </p>
            </div>

            {/* Boucher adjunto */}
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1">
                <HiOutlinePhotograph className="w-4 h-4 inline mr-1" />
                Boucher de pago <span className="text-red-600">*</span>
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                className="block w-full text-sm text-steel-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-600 file:text-white hover:file:bg-primary-700 file:cursor-pointer"
                onChange={(e) => setBoucherFile(e.target.files[0] || null)}
                disabled={convirtiendo}
              />
              {boucherFile && (
                <div className="flex items-center gap-2 mt-2 text-xs text-emerald-600">
                  <HiOutlinePhotograph className="w-4 h-4" />
                  {boucherFile.name}
                  <button
                    type="button"
                    onClick={() => setBoucherFile(null)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <HiOutlineX className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Nota informativa */}
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 text-xs text-yellow-700">
              La venta se creara en estado <strong>Pendiente de Aprobacion</strong>. Un administrador debera confirmar el boucher para activarla.
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-3 border-t border-steel-700">
              <button
                type="button"
                onClick={() => { setModalConvertir(false); setCotizacionConvertir(null); }}
                className="btn-secondary"
                disabled={convirtiendo}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarConversion}
                className="btn-primary flex items-center gap-2"
                disabled={convirtiendo}
              >
                {convirtiendo ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Convirtiendo...
                  </>
                ) : (
                  <>
                    <HiOutlineSwitchHorizontal className="w-4 h-4" />
                    Convertir a Venta
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================================================================= */}
      {/* DIALOG: CONFIRMAR CONVERSION                                      */}
      {/* ================================================================= */}
      <DialogConfirmacion
        abierto={dialogConfirmar}
        titulo="Convertir a Venta"
        mensaje={
          cotizacionConvertir
            ? `Se creara una venta por ${formatearMoneda(totalEditado)} con pago inicial de ${formatearMoneda(formConvertir.monto_inicial)}. La venta quedara pendiente de aprobacion.`
            : 'Confirmar conversion.'
        }
        onConfirmar={ejecutarConversion}
        onCancelar={() => setDialogConfirmar(false)}
        tipo="info"
      />
    </div>
  );
}
