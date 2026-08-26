import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  HiOutlinePlus,
  HiOutlineEye,
  HiOutlinePencil,
  HiOutlineChat,
  HiOutlineDocumentText,
  HiOutlineShoppingCart,
  HiOutlineSearch,
  HiOutlineX,
  HiOutlineFilter,
  HiOutlineBan,
  HiOutlineTrash,
  HiOutlineStar,
  HiOutlineClock,
  HiOutlineGift,
  HiOutlineDocumentDownload,
} from 'react-icons/hi';
import useCrud from '../../hooks/useCrud';
import usePaginacion from '../../hooks/usePaginacion';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import TablaGenerica from '../../components/ui/TablaGenerica';
import Modal from '../../components/ui/Modal';
import Paginacion from '../../components/ui/Paginacion';
import DialogConfirmacion from '../../components/ui/DialogConfirmacion';
import ModalEditarCliente from '../../components/shared/ModalEditarCliente';
import { formatearMoneda, formatearFechaHora } from '../../utils/formato';
import { exportarCotizacion } from '../../utils/exportarCotizacion';
import {
  ESTADO_PROSPECTO,
  ESTADO_UNIDAD,
  TIPO_ENTREGA,
  TIPO_DESTINO,
  TIPO_PRECIO,
  TIPO_PROMOCION,
  ORIGEN_PROSPECTO,
  TELEFONO_INPUT,
  DNI_RUC_INPUT,
  ORIGEN_COTIZACION,
  COTIZACION_EXPORT,
} from '../../config/constants';
import useAuthStore from '../../store/authStore';
import { ROLES } from '../../config/roles';
import { obtenerDepartamentos, obtenerProvincias, obtenerDistritos } from '../../services/ubigeoService';

// ---------------------------------------------------------------------------
// Buscador con autocomplete (reusado de VentasVendedor)
// ---------------------------------------------------------------------------
function AutocompleteBusqueda({
  buscarFn,
  placeholder = 'Buscar...',
  renderItem,
  onSeleccionar,
  valorTexto = '',
  onLimpiar,
}) {
  const [texto, setTexto] = useState(valorTexto);
  const [resultados, setResultados] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const ref = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => { setTexto(valorTexto); }, [valorTexto]);

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
        const lista = await buscarFn(query);
        setResultados(lista.slice(0, 10));
        setAbierto(lista.length > 0);
      } catch { setResultados([]); }
      setCargando(false);
    }, 300);
  };

  const seleccionar = (item) => {
    setAbierto(false);
    onSeleccionar(item);
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-500" />
        <input
          type="text"
          className="input-field pl-9 pr-8"
          placeholder={placeholder}
          value={texto}
          onChange={(e) => buscar(e.target.value)}
          onFocus={() => resultados.length > 0 && setAbierto(true)}
        />
        {cargando && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-steel-600 border-t-primary-500 rounded-full animate-spin" />
        )}
        {texto && onLimpiar && (
          <button type="button" onClick={() => { setTexto(''); setResultados([]); onLimpiar(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-steel-500 hover:text-steel-300">
            <HiOutlineX className="w-4 h-4" />
          </button>
        )}
      </div>
      {abierto && resultados.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-steel-800 border border-steel-700 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {resultados.map((item, i) => (
            <li key={item.id || i} onClick={() => seleccionar(item)}
              className="px-3 py-2 text-sm hover:bg-primary-50 cursor-pointer border-b border-steel-900/50 last:border-0">
              {renderItem ? renderItem(item) : item.nombre}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badge de estado con colores por estado de prospecto
// ---------------------------------------------------------------------------
const ESTADO_COLORES = {
  [ESTADO_PROSPECTO.NUEVO]: 'bg-blue-100 text-blue-600 border-blue-200',
  [ESTADO_PROSPECTO.EN_SEGUIMIENTO]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [ESTADO_PROSPECTO.COTIZADO]: 'bg-purple-100 text-purple-600 border-purple-200',
  [ESTADO_PROSPECTO.CONVERTIDO]: 'bg-emerald-100 text-emerald-600 border-emerald-200',
  [ESTADO_PROSPECTO.PERDIDO]: 'bg-red-100 text-red-800 border-red-200',
};

function ProspectoEstadoBadge({ estado }) {
  const clase = ESTADO_COLORES[estado] || 'bg-steel-800 text-steel-200 border-steel-700';
  const texto = estado?.replace(/_/g, ' ').toUpperCase() || 'N/A';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${clase}`}>
      {texto}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Opciones de filtro por estado
// ---------------------------------------------------------------------------
const ESTADOS_FILTRO = [
  { value: '', label: 'Todos los estados' },
  { value: ESTADO_PROSPECTO.NUEVO, label: 'Nuevo' },
  { value: ESTADO_PROSPECTO.EN_SEGUIMIENTO, label: 'En Seguimiento' },
  { value: ESTADO_PROSPECTO.COTIZADO, label: 'Cotizado' },
  { value: ESTADO_PROSPECTO.CONVERTIDO, label: 'Convertido' },
  { value: ESTADO_PROSPECTO.PERDIDO, label: 'Perdido' },
];

const ORIGENES_LISTA = Object.values(ORIGEN_PROSPECTO);

// ---------------------------------------------------------------------------
// Columnas de la tabla principal
// ---------------------------------------------------------------------------
const columnas = [
  { key: 'id', label: 'ID' },
  {
    key: 'nombre',
    label: 'Nombre',
    render: (f) => <span className="font-medium">{f.nombre}</span>,
  },
  {
    key: 'telefono',
    label: 'Teléfono',
    render: (f) => TELEFONO_INPUT.format(f.telefono) || <span className="text-steel-500">-</span>,
  },
  {
    key: 'empresa',
    label: 'Empresa',
    render: (f) => f.empresa || <span className="text-steel-500">-</span>,
  },
  {
    key: 'estado',
    label: 'Estado',
    render: (f) => <ProspectoEstadoBadge estado={f.estado} />,
  },
  {
    key: 'proxima_fecha',
    label: 'Próx. Seguimiento',
    render: (f) => {
      if (!f.proxima_fecha_seguimiento) return <span className="text-steel-500">-</span>;
      const fecha = new Date(f.proxima_fecha_seguimiento);
      const hoy = new Date();
      const vencida = fecha < hoy && f.estado !== ESTADO_PROSPECTO.CONVERTIDO && f.estado !== ESTADO_PROSPECTO.PERDIDO;
      return (
        <span className={vencida ? 'text-red-600 font-medium' : 'text-steel-300'}>
          {formatearFechaHora(f.proxima_fecha_seguimiento)}
        </span>
      );
    },
  },
  {
    key: 'cotizacion',
    label: 'Cotización',
    render: (f) => {
      const count = f.items_cotizacion?.length || 0;
      return count > 0
        ? <span className="text-purple-600 font-medium">{count} items</span>
        : <span className="text-steel-500">-</span>;
    },
  },
  {
    key: 'productos_en_espera',
    label: 'En Espera',
    render: (f) => {
      const count = f.productos_en_espera?.length || 0;
      return count > 0
        ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
            <HiOutlineClock className="w-3 h-3" />
            {count} en espera
          </span>
        )
        : <span className="text-steel-500">-</span>;
    },
  },
  {
    key: 'ultimo_seguimiento',
    label: 'Último Seguimiento',
    render: (f) => {
      const ultimo = f.seguimientos?.[0];
      if (!ultimo) return <span className="text-steel-500">Sin seguimiento</span>;
      return (
        <span className="text-steel-300 text-xs" title={ultimo.nota}>
          {ultimo.nota.length > 30 ? ultimo.nota.substring(0, 30) + '...' : ultimo.nota}
        </span>
      );
    },
  },
  {
    key: 'fecha',
    label: 'Fecha',
    render: (f) => formatearFechaHora(f.fecha_hora_registro),
  },
];

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function Prospectos() {
  const { datos, cargando, listar } = useCrud('/prospectos');
  const location = useLocation();
  const { esRol, usuario } = useAuthStore();
  const puedeUsarMayorista = esRol(ROLES.ADMINISTRADOR, ROLES.SUPER_ADMINISTRADOR);
  const [exportandoCotizacion, setExportandoCotizacion] = useState(false);

  // Exporta la cotizacion del prospecto como documento A4 (Guardar como PDF).
  const exportarCotizacionProspecto = async (prospecto) => {
    setExportandoCotizacion(true);
    try {
      await exportarCotizacion({ ...prospecto, _origen: ORIGEN_COTIZACION.PROSPECTO }, { usuario });
    } catch (err) {
      toast.error(err.message || COTIZACION_EXPORT.MSG_ERROR);
    } finally {
      setExportandoCotizacion(false);
    }
  };
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // Filtrar datos
  const datosFiltrados = useMemo(() => {
    let resultado = datos;
    if (filtroEstado) {
      resultado = resultado.filter((p) => p.estado === filtroEstado);
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      const qDigits = TELEFONO_INPUT.toDigits(busqueda);
      resultado = resultado.filter((p) =>
        p.nombre?.toLowerCase().includes(q) ||
        (qDigits && p.telefono?.includes(qDigits)) ||
        p.empresa?.toLowerCase().includes(q)
      );
    }
    return resultado;
  }, [datos, filtroEstado, busqueda]);

  const { datosPaginados, paginaActual, totalPaginas, irAPagina } = usePaginacion(datosFiltrados);

  // --- Estado: modal crear/editar ---
  const [modalForm, setModalForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [clienteVinculado, setClienteVinculado] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '', telefono: '', correo: '', empresa: '', origen: '', proxima_fecha_seguimiento: '',
  });
  const [guardando, setGuardando] = useState(false);

  // --- Estado: modal detalle ---
  const [modalDetalle, setModalDetalle] = useState(false);
  const [prospectoDetalle, setProspectoDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  // --- Estado: modal seguimiento ---
  const [modalSeguimiento, setModalSeguimiento] = useState(false);
  const [prospectoSeg, setProspectoSeg] = useState(null);
  const [notaSeguimiento, setNotaSeguimiento] = useState('');
  const [proximaFechaSeg, setProximaFechaSeg] = useState('');
  const [guardandoSeg, setGuardandoSeg] = useState(false);

  // --- Estado: modal cotización ---
  const [modalCotizacion, setModalCotizacion] = useState(false);
  const [prospectoCotiz, setProspectoCotiz] = useState(null);
  const [itemsCotizacion, setItemsCotizacion] = useState([]);
  const [productoTemp, setProductoTemp] = useState(null);
  const [cantidadTemp, setCantidadTemp] = useState(1);
  const [precioTemp, setPrecioTemp] = useState('');
  const [tipoPrecio, setTipoPrecio] = useState(TIPO_PRECIO.VENDEDOR);
  const [guardandoCotiz, setGuardandoCotiz] = useState(false);

  // --- Estado: modal convertir a venta ---
  const [modalConvertir, setModalConvertir] = useState(false);
  const [prospectoConvertir, setProspectoConvertir] = useState(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [clientePuntos, setClientePuntos] = useState(0);
  const [itemsVenta, setItemsVenta] = useState([]);
  const [tipoEntrega, setTipoEntrega] = useState(TIPO_ENTREGA.ENVIO_POR_AGENCIA);
  const [transportistaId, setTransportistaId] = useState('');
  const [transportistas, setTransportistas] = useState([]);
  const [tipoDestino, setTipoDestino] = useState(TIPO_DESTINO.LIMA);
  const [departamentos, setDepartamentos] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [departamentoId, setDepartamentoId] = useState('');
  const [provinciaId, setProvinciaId] = useState('');
  const [distritoId, setDistritoId] = useState('');
  const [promocionId, setPromocionId] = useState('');
  const [descuentoPuntos, setDescuentoPuntos] = useState(0);
  const [promociones, setPromociones] = useState([]);
  const [convirtiendoVenta, setConvirtiendoVenta] = useState(false);
  const [productoTempVenta, setProductoTempVenta] = useState(null);
  const [stockDisponible, setStockDisponible] = useState(0);
  const [cantidadTempVenta, setCantidadTempVenta] = useState(1);
  const [precioTempVenta, setPrecioTempVenta] = useState('');
  const [tipoPrecioVenta, setTipoPrecioVenta] = useState(TIPO_PRECIO.VENDEDOR);

  // --- Estado: modal crear cliente nuevo ---
  const [modalCrearCliente, setModalCrearCliente] = useState(false);

  // --- Estado: producto en espera ---
  const [productoEsperaTemp, setProductoEsperaTemp] = useState(null);
  const [guardandoEspera, setGuardandoEspera] = useState(false);
  const [confirmarEspera, setConfirmarEspera] = useState(null); // { prospectoId, productId, stock, nombre }

  // --- Estado: dialog perdido ---
  const [confirmPerdido, setConfirmPerdido] = useState(null);
  const [motivoPerdida, setMotivoPerdida] = useState('');

  // =========================================================================
  // Funciones de búsqueda
  // =========================================================================

  const buscarClientes = useCallback(async (query) => {
    const { data } = await api.get('/clientes/buscar', { params: { q: query } });
    return Array.isArray(data) ? data : (data.datos || data.data || []);
  }, []);

  const buscarProductos = useCallback(async (query) => {
    const { data } = await api.get('/productos');
    const lista = Array.isArray(data) ? data : (data.datos || data.data || []);
    const q = query.toLowerCase();
    return lista.filter((p) =>
      p.nombre?.toLowerCase().includes(q) || p.id?.toString().includes(q)
    );
  }, []);

  // =========================================================================
  // CRUD Prospectos
  // =========================================================================

  const abrirCrear = () => {
    setEditandoId(null);
    setClienteVinculado(null);
    setFormData({ nombre: '', telefono: '', correo: '', empresa: '', origen: '', proxima_fecha_seguimiento: '' });
    setModalForm(true);
  };

  const abrirEditar = (prospecto) => {
    setEditandoId(prospecto.id);
    setClienteVinculado(prospecto.tbl_clientes || null);
    setFormData({
      nombre: prospecto.nombre || '',
      telefono: TELEFONO_INPUT.format(prospecto.telefono || ''),
      correo: prospecto.correo || '',
      empresa: prospecto.empresa || '',
      origen: prospecto.origen || '',
      proxima_fecha_seguimiento: prospecto.proxima_fecha_seguimiento
        ? new Date(prospecto.proxima_fecha_seguimiento).toISOString().slice(0, 16)
        : '',
    });
    setModalForm(true);
  };

  const vincularClienteForm = (cliente) => {
    setClienteVinculado(cliente);
    setFormData((prev) => ({
      ...prev,
      nombre: cliente.nombre || '',
      telefono: TELEFONO_INPUT.format(cliente.telefono_principal || ''),
      correo: cliente.email || cliente.tbl_usuarios?.correo || '',
    }));
  };

  const desvincularClienteForm = () => {
    setClienteVinculado(null);
    setFormData((prev) => ({ ...prev, nombre: '', telefono: '', correo: '' }));
  };

  const guardarProspecto = async (e) => {
    e.preventDefault();
    if (!clienteVinculado && !formData.nombre.trim()) return toast.error('El nombre es obligatorio');

    const telDigits = TELEFONO_INPUT.toDigits(formData.telefono);
    if (telDigits && !TELEFONO_INPUT.esValido(telDigits)) {
      return toast.error(TELEFONO_INPUT.MSG_INVALIDO);
    }

    setGuardando(true);
    try {
      const payload = {
        ...formData,
        telefono: telDigits || null,
        customer_id: clienteVinculado?.id || null,
      };

      if (editandoId) {
        await api.put(`/prospectos/${editandoId}`, payload);
        toast.success('Prospecto actualizado');
      } else {
        await api.post('/prospectos', payload);
        toast.success('Prospecto creado');
      }
      setModalForm(false);
      listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar prospecto');
    } finally {
      setGuardando(false);
    }
  };

  // =========================================================================
  // Ver detalle
  // =========================================================================

  const verDetalle = async (id) => {
    setCargandoDetalle(true);
    setModalDetalle(true);
    try {
      const { data } = await api.get(`/prospectos/${id}`);
      setProspectoDetalle(data);
    } catch {
      toast.error('Error al cargar detalle');
      setModalDetalle(false);
    } finally {
      setCargandoDetalle(false);
    }
  };

  // Abrir detalle automáticamente si se navegó desde Cotizaciones con prospectoId
  useEffect(() => {
    const prospectoIdNav = location.state?.prospectoId;
    if (prospectoIdNav) {
      verDetalle(prospectoIdNav);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  // =========================================================================
  // Agregar seguimiento
  // =========================================================================

  const abrirSeguimiento = async (prospecto) => {
    setProspectoSeg(null);
    setNotaSeguimiento('');
    setProximaFechaSeg('');
    setModalSeguimiento(true);
    try {
      const { data } = await api.get(`/prospectos/${prospecto.id}`);
      setProspectoSeg(data);
    } catch {
      toast.error('Error al cargar prospecto');
      setModalSeguimiento(false);
    }
  };

  const guardarSeguimiento = async (e) => {
    e.preventDefault();
    if (!notaSeguimiento.trim()) return toast.error('La nota es obligatoria');

    setGuardandoSeg(true);
    try {
      await api.post(`/prospectos/${prospectoSeg.id}/seguimiento`, {
        nota: notaSeguimiento.trim(),
        proxima_fecha_seguimiento: proximaFechaSeg || undefined,
      });
      toast.success('Seguimiento registrado');
      setModalSeguimiento(false);
      listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar seguimiento');
    } finally {
      setGuardandoSeg(false);
    }
  };

  // =========================================================================
  // Cotización
  // =========================================================================

  const abrirCotizacion = async (prospecto) => {
    setProspectoCotiz(null);
    setItemsCotizacion([]);
    setProductoTemp(null);
    setCantidadTemp(1);
    setPrecioTemp('');
    setTipoPrecio(TIPO_PRECIO.VENDEDOR);
    setModalCotizacion(true);
    try {
      const { data } = await api.get(`/prospectos/${prospecto.id}`);
      setProspectoCotiz(data);

      const itemsExistentes = data.items_cotizacion || [];
      if (itemsExistentes.length > 0) {
        // Ya tiene cotización: cargar items existentes
        setItemsCotizacion(
          itemsExistentes.map((ic) => {
            const cant = ic.cantidad;
            const precio = parseFloat(ic.precio_unitario);
            const desc = parseFloat(ic.descuento) || 0;
            const regalo = ic.es_regalo || false;
            return {
              product_id: ic.product_id,
              nombre: ic.tbl_productos?.nombre || `Producto #${ic.product_id}`,
              cantidad: cant,
              precio_unitario: precio,
              descuento: desc,
              es_regalo: regalo,
              subtotal: regalo ? 0 : Math.max(0, (cant * precio) - desc),
              stock: ic.tbl_productos?._count?.unidades ?? 0,
              precio_minimo: parseFloat(ic.tbl_productos?.precio_venta_base) || 0,
            };
          })
        );
      } else {
        // Sin cotización: pre-cargar desde productos en espera
        const espera = (data.productos_en_espera || []).filter((pe) => pe.activo && pe.tbl_productos);
        if (espera.length > 0) {
          setItemsCotizacion(
            espera.map((pe) => {
              const prod = pe.tbl_productos;
              const precio = parseFloat(prod.precio_vendedor || prod.precio_venta_base || 0);
              return {
                product_id: prod.id,
                nombre: prod.nombre || `Producto #${prod.id}`,
                cantidad: 1,
                precio_unitario: precio,
                descuento: 0,
                es_regalo: false,
                subtotal: precio,
                stock: prod._count?.unidades ?? 0,
                precio_minimo: parseFloat(prod.precio_venta_base) || 0,
              };
            })
          );
          toast.success(`${espera.length} producto(s) en espera agregados a la cotización`);
        }
      }
    } catch {
      toast.error('Error al cargar cotización');
      setModalCotizacion(false);
    }
  };

  const obtenerPrecioPorTipo = (producto, tipo) => {
    switch (tipo) {
      case TIPO_PRECIO.VENDEDOR: return producto.precio_vendedor || producto.precio_venta_base || '';
      case TIPO_PRECIO.CATALOGO: return producto.precio_catalogo || producto.precio_venta_base || '';
      case TIPO_PRECIO.MAYORISTA: return producto.precio_mayorista || producto.precio_venta_base || '';
      default: return producto.precio_venta_base || '';
    }
  };

  const seleccionarProductoCotiz = (producto) => {
    setProductoTemp(producto);
    setTipoPrecio(TIPO_PRECIO.VENDEDOR);
    setPrecioTemp(obtenerPrecioPorTipo(producto, TIPO_PRECIO.VENDEDOR));
    setCantidadTemp(1);
  };

  const actualizarItemCotizacion = (idx, campo, valor) => {
    setItemsCotizacion((prev) => {
      const nuevos = [...prev];
      const item = { ...nuevos[idx], [campo]: valor };
      // Recalcular subtotal
      const cant = parseInt(item.cantidad) || 0;
      const precio = parseFloat(item.precio_unitario) || 0;
      const desc = parseFloat(item.descuento) || 0;
      item.subtotal = item.es_regalo ? 0 : Math.max(0, (cant * precio) - desc);
      nuevos[idx] = item;
      return nuevos;
    });
  };

  const agregarItemCotizacion = () => {
    if (!productoTemp) return toast.error('Selecciona un producto');
    const precio = parseFloat(precioTemp);
    if (!precio || precio <= 0) return toast.error('Ingresa un precio válido');
    if (cantidadTemp < 1) return toast.error('La cantidad debe ser mayor a 0');

    // Validar que el precio no sea menor al precio mínimo (precio_venta_base)
    const precioMinimo = parseFloat(productoTemp.precio_venta_base);
    if (precio < precioMinimo) {
      return toast.error(`El precio no puede ser menor al precio mínimo (${formatearMoneda(precioMinimo)})`);
    }

    const idxExistente = itemsCotizacion.findIndex((i) => i.product_id === productoTemp.id);
    if (idxExistente >= 0) {
      const actualizado = [...itemsCotizacion];
      const item = actualizado[idxExistente];
      const nuevaCantidad = item.cantidad + cantidadTemp;
      actualizado[idxExistente] = { ...item, cantidad: nuevaCantidad, precio_unitario: precio, subtotal: nuevaCantidad * precio };
      setItemsCotizacion(actualizado);
    } else {
      setItemsCotizacion([
        ...itemsCotizacion,
        { product_id: productoTemp.id, nombre: productoTemp.nombre, cantidad: cantidadTemp, precio_unitario: precio, subtotal: cantidadTemp * precio, stock: productoTemp._count?.unidades ?? 0, descuento: 0, es_regalo: false, precio_minimo: parseFloat(productoTemp.precio_venta_base) || 0 },
      ]);
    }

    setProductoTemp(null);
    setCantidadTemp(1);
    setPrecioTemp('');
  };

  const guardarCotizacion = async () => {
    if (!prospectoCotiz) return;

    // Validar precio mínimo en items no-regalo
    const itemBajo = itemsCotizacion.find((i) => {
      if (i.es_regalo) return false;
      const precioEfectivo = (parseFloat(i.precio_unitario) || 0) - ((parseFloat(i.descuento) || 0) / (parseInt(i.cantidad) || 1));
      return i.precio_minimo > 0 && precioEfectivo < i.precio_minimo;
    });
    if (itemBajo) {
      const precioEf = (parseFloat(itemBajo.precio_unitario) || 0) - ((parseFloat(itemBajo.descuento) || 0) / (parseInt(itemBajo.cantidad) || 1));
      return toast.error(`"${itemBajo.nombre}" tiene precio efectivo (${formatearMoneda(precioEf)}) menor al mínimo (${formatearMoneda(itemBajo.precio_minimo)})`);
    }

    setGuardandoCotiz(true);
    try {
      await api.put(`/prospectos/${prospectoCotiz.id}/cotizacion`, {
        items: itemsCotizacion.map((i) => ({
          product_id: i.product_id,
          cantidad: parseInt(i.cantidad) || 1,
          precio_unitario: parseFloat(i.precio_unitario) || 0,
          descuento: parseFloat(i.descuento) || 0,
          es_regalo: i.es_regalo || false,
        })),
      });
      toast.success('Cotización guardada');
      setModalCotizacion(false);
      listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar cotización');
    } finally {
      setGuardandoCotiz(false);
    }
  };

  // =========================================================================
  // Marcar perdido
  // =========================================================================

  const marcarPerdido = async () => {
    if (!confirmPerdido) return;
    try {
      await api.post(`/prospectos/${confirmPerdido}/perdido`, {
        motivo_perdida: motivoPerdida || 'Sin especificar',
      });
      toast.success('Prospecto marcado como perdido');
      setConfirmPerdido(null);
      setMotivoPerdida('');
      listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al marcar como perdido');
    }
  };

  // =========================================================================
  // Convertir a Venta
  // =========================================================================

  const abrirConvertir = async (prospecto) => {
    setProspectoConvertir(null);
    setClienteSeleccionado(null);
    setClientePuntos(0);
    setItemsVenta([]);
    setTipoEntrega(TIPO_ENTREGA.ENVIO_POR_AGENCIA);
    setTransportistaId('');
    setTipoDestino(TIPO_DESTINO.LIMA);
    setDepartamentoId('');
    setProvinciaId('');
    setDistritoId('');
    setProvincias([]);
    setDistritos([]);
    setPromocionId('');
    setDescuentoPuntos(0);
    setProductoTempVenta(null);
    setStockDisponible(0);
    setCantidadTempVenta(1);
    setPrecioTempVenta('');
    setTipoPrecioVenta(TIPO_PRECIO.VENDEDOR);
    setModalConvertir(true);

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

    try {
      const [prospectoRes, promosRes] = await Promise.all([
        api.get(`/prospectos/${prospecto.id}`),
        api.get('/promociones/activas').catch(() => ({ data: [] })),
      ]);

      const data = prospectoRes.data;
      setProspectoConvertir(data);
      setPromociones(Array.isArray(promosRes.data) ? promosRes.data : (promosRes.data.datos || []));

      // Pre-seleccionar cliente si el prospecto tiene uno vinculado
      if (data.customer_id && data.tbl_clientes) {
        await seleccionarCliente({ id: data.customer_id, nombre: data.tbl_clientes.nombre, dni: data.tbl_clientes.dni });
      }

      // Pre-llenar items desde cotización (respetando descuento y regalo)
      if (data.items_cotizacion && data.items_cotizacion.length > 0) {
        setItemsVenta(
          data.items_cotizacion.map((ic) => {
            const cant = ic.cantidad;
            const precio = parseFloat(ic.precio_unitario);
            const desc = parseFloat(ic.descuento) || 0;
            const regalo = ic.es_regalo || false;
            return {
              product_id: ic.product_id,
              nombre: ic.tbl_productos?.nombre || `Producto #${ic.product_id}`,
              cantidad: cant,
              precio_unitario_vendido: precio,
              precio_minimo: parseFloat(ic.tbl_productos?.precio_venta_base) || 0,
              descuento: desc,
              subtotal: regalo ? 0 : Math.max(0, (cant * precio) - desc),
              es_regalo: regalo,
            };
          })
        );
      }
    } catch {
      toast.error('Error al cargar datos');
      setModalConvertir(false);
    }
  };

  const seleccionarCliente = async (cliente) => {
    setClienteSeleccionado(cliente);
    try {
      const { data } = await api.get(`/clientes/${cliente.id}`);
      setClientePuntos(data.saldo_puntos || 0);
    } catch {
      setClientePuntos(0);
    }
  };

  const handleDepartamentoChangeProspecto = async (depId) => {
    setDepartamentoId(depId);
    setProvinciaId('');
    setDistritoId('');
    setDistritos([]);
    if (!depId) { setProvincias([]); return; }
    try {
      const { data } = await obtenerProvincias(depId);
      setProvincias(Array.isArray(data) ? data : []);
    } catch {
      setProvincias([]);
    }
  };

  const handleProvinciaChangeProspecto = async (provId) => {
    setProvinciaId(provId);
    setDistritoId('');
    if (!provId) { setDistritos([]); return; }
    try {
      const { data } = await obtenerDistritos(provId);
      setDistritos(Array.isArray(data) ? data : []);
    } catch {
      setDistritos([]);
    }
  };

  // Sincroniza el departamento con el tipo de destino para que no se contradigan:
  // - Destino = Lima  → departamento bloqueado a "Lima"
  // - Destino = Provincia → se excluye "Lima" del listado y se limpia si quedó seleccionado
  const limaDeptoId = useMemo(() => {
    const lima = departamentos.find((d) => (d.nombre || '').toLowerCase().trim() === 'lima');
    return lima ? String(lima.id) : '';
  }, [departamentos]);

  const departamentosFiltrados = useMemo(() => {
    if (!limaDeptoId) return departamentos;
    if (tipoDestino === TIPO_DESTINO.LIMA) {
      return departamentos.filter((d) => String(d.id) === limaDeptoId);
    }
    return departamentos.filter((d) => String(d.id) !== limaDeptoId);
  }, [departamentos, tipoDestino, limaDeptoId]);

  useEffect(() => {
    if (!modalConvertir) return;
    if (tipoEntrega !== TIPO_ENTREGA.ENVIO_POR_AGENCIA) return;
    if (!limaDeptoId) return;
    if (tipoDestino === TIPO_DESTINO.LIMA) {
      if (String(departamentoId) !== limaDeptoId) {
        handleDepartamentoChangeProspecto(limaDeptoId);
      }
    } else if (tipoDestino === TIPO_DESTINO.PROVINCIA) {
      if (String(departamentoId) === limaDeptoId) {
        handleDepartamentoChangeProspecto('');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoDestino, limaDeptoId, tipoEntrega, modalConvertir]);

  // Recibe la respuesta de POST /clientes ({ cliente, credenciales }) cuando se
  // crea desde ModalEditarCliente y deja al nuevo cliente seleccionado para la venta.
  const onClienteCreado = async (data) => {
    const nuevo = data?.cliente || data;
    if (nuevo?.id) {
      await seleccionarCliente(nuevo);
    }
    if (data?.credenciales?.usuario) {
      toast.success(
        `Cuenta creada · Usuario: ${data.credenciales.usuario} · Contraseña: ${data.credenciales.contrasena}`,
        { duration: 10000 }
      );
    }
  };

  const seleccionarProductoVenta = async (producto) => {
    setProductoTempVenta(producto);
    setTipoPrecioVenta(TIPO_PRECIO.VENDEDOR);
    setPrecioTempVenta(obtenerPrecioPorTipo(producto, TIPO_PRECIO.VENDEDOR));
    setCantidadTempVenta(1);
    try {
      const { data } = await api.get('/inventario/unidades', {
        params: { product_id: producto.id, estado: ESTADO_UNIDAD.DISPONIBLE },
      });
      const lista = Array.isArray(data) ? data : (data.datos || []);
      setStockDisponible(lista.length);
    } catch {
      setStockDisponible(0);
    }
  };

  const agregarItemVenta = () => {
    if (!productoTempVenta) return toast.error('Selecciona un producto');
    const precio = parseFloat(precioTempVenta);
    if (!precio || precio <= 0) return toast.error('Ingresa un precio válido');
    if (cantidadTempVenta < 1) return toast.error('La cantidad debe ser mayor a 0');
    const minimo = parseFloat(productoTempVenta.precio_venta_base) || 0;
    if (precio < minimo) return toast.error(`El precio no puede ser menor al mínimo (${formatearMoneda(minimo)})`);

    const idxExistente = itemsVenta.findIndex((i) => i.product_id === productoTempVenta.id);
    if (idxExistente >= 0) {
      const actualizado = [...itemsVenta];
      const item = actualizado[idxExistente];
      const nuevaCantidad = item.cantidad + cantidadTempVenta;
      const desc = parseFloat(item.descuento) || 0;
      actualizado[idxExistente] = { ...item, cantidad: nuevaCantidad, precio_unitario_vendido: precio, subtotal: Math.max(0, (nuevaCantidad * precio) - desc), tipo_precio: tipoPrecioVenta };
      setItemsVenta(actualizado);
    } else {
      setItemsVenta([
        ...itemsVenta,
        {
          product_id: productoTempVenta.id,
          nombre: productoTempVenta.nombre,
          cantidad: cantidadTempVenta,
          precio_unitario_vendido: precio,
          precio_minimo: parseFloat(productoTempVenta.precio_venta_base) || 0,
          descuento: 0,
          subtotal: cantidadTempVenta * precio,
          es_regalo: false,
          tipo_precio: tipoPrecioVenta,
        },
      ]);
    }

    setProductoTempVenta(null);
    setStockDisponible(0);
    setCantidadTempVenta(1);
    setPrecioTempVenta('');
  };

  const subtotalVenta = itemsVenta.reduce((sum, i) => i.es_regalo ? sum : sum + i.subtotal, 0);

  const descuentoPromocion = (() => {
    if (!promocionId) return 0;
    const promo = promociones.find((p) => p.id === parseInt(promocionId));
    if (!promo) return 0;
    if (promo.tipo === TIPO_PROMOCION.DESCUENTO_PORCENTAJE) return subtotalVenta * (parseFloat(promo.valor) / 100);
    return parseFloat(promo.valor);
  })();

  const totalVenta = Math.max(0, subtotalVenta - descuentoPromocion - descuentoPuntos);

  const convertirAVenta = async () => {
    if (!clienteSeleccionado) return toast.error('Selecciona un cliente');
    if (itemsVenta.length === 0) return toast.error('Agrega al menos un producto');
    // Validar precio mínimo considerando descuento (misma fórmula que cotización)
    const itemBajoPrecio = itemsVenta.find((i) => {
      if (i.es_regalo) return false;
      const precioEf = (parseFloat(i.precio_unitario_vendido) || 0) - ((parseFloat(i.descuento) || 0) / (parseInt(i.cantidad) || 1));
      return i.precio_minimo > 0 && precioEf < i.precio_minimo;
    });
    if (itemBajoPrecio) {
      const precioEf = (parseFloat(itemBajoPrecio.precio_unitario_vendido) || 0) - ((parseFloat(itemBajoPrecio.descuento) || 0) / (parseInt(itemBajoPrecio.cantidad) || 1));
      return toast.error(`"${itemBajoPrecio.nombre}" tiene precio efectivo (${formatearMoneda(precioEf)}) menor al mínimo (${formatearMoneda(itemBajoPrecio.precio_minimo)})`);
    }
    if (descuentoPuntos > clientePuntos) return toast.error('No tienes suficientes puntos');

    if (tipoEntrega === TIPO_ENTREGA.ENVIO_POR_AGENCIA) {
      if (!transportistaId) return toast.error('Selecciona la agencia transportista');
      if (!departamentoId || !provinciaId || !distritoId) {
        return toast.error('Selecciona departamento, provincia y distrito');
      }
    }

    setConvirtiendoVenta(true);
    try {
      const body = {
        customer_id: clienteSeleccionado.id,
        tipo_entrega: tipoEntrega,
        tipo_destino: tipoDestino,
        transportista_id: tipoEntrega === TIPO_ENTREGA.ENVIO_POR_AGENCIA ? parseInt(transportistaId) : null,
        departamento_id: tipoEntrega === TIPO_ENTREGA.ENVIO_POR_AGENCIA ? parseInt(departamentoId) : null,
        provincia_id: tipoEntrega === TIPO_ENTREGA.ENVIO_POR_AGENCIA ? parseInt(provinciaId) : null,
        distrito_id: tipoEntrega === TIPO_ENTREGA.ENVIO_POR_AGENCIA ? parseInt(distritoId) : null,
        items: itemsVenta.map((i) => ({
          product_id: i.product_id,
          cantidad: parseInt(i.cantidad) || 1,
          precio_unitario_lista: parseFloat(i.precio_unitario_vendido) || 0,
          descuento_manual_item: parseFloat(i.descuento) || 0,
          es_regalo: i.es_regalo,
          tipo_precio: i.tipo_precio,
        })),
        promocion_id: promocionId ? parseInt(promocionId) : null,
        descuento_puntos: descuentoPuntos > 0 ? descuentoPuntos : 0,
      };

      await api.post(`/prospectos/${prospectoConvertir.id}/convertir`, body);
      toast.success('Prospecto convertido a venta exitosamente');
      setModalConvertir(false);
      listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al convertir');
    } finally {
      setConvirtiendoVenta(false);
    }
  };

  // =========================================================================
  // Producto en espera
  // =========================================================================

  const intentarMarcarEnEspera = (prospectoId, productId, stock, nombre) => {
    if (stock > 0) {
      setConfirmarEspera({ prospectoId, productId, stock, nombre });
      return;
    }
    agregarProductoEnEspera(prospectoId, productId);
  };

  const agregarProductoEnEspera = async (prospectoId, productId) => {
    setGuardandoEspera(true);
    try {
      await api.post(`/prospectos/${prospectoId}/producto-espera`, { product_id: productId });
      toast.success('Producto agregado a lista de espera');
      setProductoEsperaTemp(null);
      listar();
      // Refrescar detalle o cotización si están abiertos
      const refrescar = async () => {
        const { data } = await api.get(`/prospectos/${prospectoId}`);
        if (prospectoDetalle?.id === prospectoId) setProspectoDetalle(data);
        if (prospectoCotiz?.id === prospectoId) setProspectoCotiz(data);
      };
      await refrescar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al agregar producto en espera');
    } finally {
      setGuardandoEspera(false);
    }
  };

  const eliminarProductoEnEspera = async (esperaId, prospectoId) => {
    try {
      await api.delete(`/prospectos/producto-espera/${esperaId}`);
      toast.success('Producto removido de espera');
      listar();
      const { data } = await api.get(`/prospectos/${prospectoId}`);
      if (prospectoDetalle?.id === prospectoId) setProspectoDetalle(data);
      if (prospectoCotiz?.id === prospectoId) setProspectoCotiz(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar producto en espera');
    }
  };

  // =========================================================================
  // Helpers
  // =========================================================================

  const esActivo = (fila) =>
    fila.estado !== ESTADO_PROSPECTO.CONVERTIDO && fila.estado !== ESTADO_PROSPECTO.PERDIDO;

  const totalCotizacion = itemsCotizacion.reduce((sum, i) => sum + i.subtotal, 0);

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-steel-100">Prospectos</h1>
          <p className="text-steel-400 text-sm">{datosFiltrados.length} prospectos registrados</p>
        </div>
        <button onClick={abrirCrear} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-5 h-5" />
          Nuevo Prospecto
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-500" />
          <input
            type="text"
            className="input-field pl-9"
            placeholder="Buscar por nombre, teléfono o empresa..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <HiOutlineFilter className="w-4 h-4 text-steel-500" />
          <select
            className="input-field"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            {ESTADOS_FILTRO.map((ef) => (
              <option key={ef.value} value={ef.value}>{ef.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla */}
      <TablaGenerica
        columnas={columnas}
        datos={datosPaginados}
        cargando={cargando}
        acciones={(fila) => (
          <div className="flex items-center gap-1">
            <button onClick={() => verDetalle(fila.id)} title="Ver detalle"
              className="p-1.5 rounded hover:bg-steel-700 text-steel-400 hover:text-steel-200">
              <HiOutlineEye className="w-4 h-4" />
            </button>
            {esActivo(fila) && (
              <>
                <button onClick={() => abrirEditar(fila)} title="Editar"
                  className="p-1.5 rounded hover:bg-steel-700 text-steel-400 hover:text-blue-600">
                  <HiOutlinePencil className="w-4 h-4" />
                </button>
                <button onClick={() => abrirSeguimiento(fila)} title="Seguimiento"
                  className="p-1.5 rounded hover:bg-steel-700 text-steel-400 hover:text-yellow-600">
                  <HiOutlineChat className="w-4 h-4" />
                </button>
                <button onClick={() => abrirCotizacion(fila)} title="Cotización"
                  className="p-1.5 rounded hover:bg-steel-700 text-steel-400 hover:text-purple-600">
                  <HiOutlineDocumentText className="w-4 h-4" />
                </button>
                <button onClick={() => abrirConvertir(fila)} title="Convertir a Venta"
                  className="p-1.5 rounded hover:bg-steel-700 text-steel-400 hover:text-emerald-700">
                  <HiOutlineShoppingCart className="w-4 h-4" />
                </button>
                <button onClick={() => { setConfirmPerdido(fila.id); setMotivoPerdida(''); }} title="Marcar perdido"
                  className="p-1.5 rounded hover:bg-steel-700 text-steel-400 hover:text-red-600">
                  <HiOutlineBan className="w-4 h-4" />
                </button>
              </>
            )}
            {fila.estado === ESTADO_PROSPECTO.CONVERTIDO && fila.tbl_ventas && (
              <span className="text-xs text-emerald-600 font-medium ml-1">
                Venta #{fila.tbl_ventas.id}
              </span>
            )}
          </div>
        )}
      />

      <Paginacion
        paginaActual={paginaActual}
        totalPaginas={totalPaginas}
        irAPagina={irAPagina}
      />

      {/* ================================================================= */}
      {/* MODAL: Crear/Editar Prospecto */}
      {/* ================================================================= */}
      <Modal
        abierto={modalForm}
        cerrar={() => setModalForm(false)}
        titulo={editandoId ? 'Editar Prospecto' : 'Nuevo Prospecto'}
      >
        <form onSubmit={guardarProspecto} className="space-y-4">
          {/* Vincular cliente existente */}
          <div>
            <label className="label-field">Vincular cliente existente (opcional)</label>
            {clienteVinculado ? (
              <div className="flex items-center justify-between bg-steel-800/50 rounded-lg p-2.5">
                <div>
                  <span className="font-medium text-steel-200">{clienteVinculado.nombre}</span>
                  {clienteVinculado.dni && <span className="text-xs text-steel-500 ml-2">DNI: {clienteVinculado.dni}</span>}
                  {clienteVinculado.telefono_principal && <span className="text-xs text-steel-500 ml-2">Tel: {TELEFONO_INPUT.format(clienteVinculado.telefono_principal)}</span>}
                </div>
                <button type="button" onClick={desvincularClienteForm}
                  className="text-steel-400 hover:text-red-600">
                  <HiOutlineX className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <AutocompleteBusqueda
                buscarFn={buscarClientes}
                placeholder="Buscar cliente por nombre, DNI o teléfono..."
                renderItem={(c) => (
                  <div>
                    <span className="font-medium">{c.nombre}</span>
                    {c.dni && <span className="text-xs text-steel-500 ml-2">DNI: {c.dni}</span>}
                    {c.telefono_principal && <span className="text-xs text-steel-500 ml-2">Tel: {TELEFONO_INPUT.format(c.telefono_principal)}</span>}
                  </div>
                )}
                onSeleccionar={vincularClienteForm}
                onLimpiar={() => {}}
              />
            )}
          </div>
          <div>
            <label className="label-field">Nombre *</label>
            <input type="text" className="input-field" placeholder="Nombre del prospecto"
              value={formData.nombre}
              disabled={!!clienteVinculado}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Teléfono</label>
              <input
                type="tel"
                className="input-field"
                inputMode={TELEFONO_INPUT.INPUT_MODE}
                pattern={TELEFONO_INPUT.PATTERN}
                maxLength={TELEFONO_INPUT.MAX_LENGTH}
                placeholder={TELEFONO_INPUT.PLACEHOLDER}
                value={formData.telefono}
                disabled={!!clienteVinculado}
                onChange={(e) => setFormData({ ...formData, telefono: TELEFONO_INPUT.format(e.target.value) })}
              />
            </div>
            <div>
              <label className="label-field">Correo</label>
              <input type="email" className="input-field" placeholder="Correo electrónico"
                value={formData.correo}
                disabled={!!clienteVinculado}
                onChange={(e) => setFormData({ ...formData, correo: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Empresa</label>
              <input type="text" className="input-field" placeholder="Empresa"
                value={formData.empresa}
                onChange={(e) => setFormData({ ...formData, empresa: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Origen</label>
              <select className="input-field" value={formData.origen}
                onChange={(e) => setFormData({ ...formData, origen: e.target.value })}>
                <option value="">Seleccionar origen</option>
                {ORIGENES_LISTA.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label-field">Próxima fecha de seguimiento</label>
            <input type="datetime-local" className="input-field"
              value={formData.proxima_fecha_seguimiento}
              onChange={(e) => setFormData({ ...formData, proxima_fecha_seguimiento: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalForm(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={guardando} className="btn-primary">
              {guardando ? 'Guardando...' : editandoId ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL: Detalle del Prospecto */}
      {/* ================================================================= */}
      <Modal
        abierto={modalDetalle}
        cerrar={() => setModalDetalle(false)}
        titulo={prospectoDetalle ? `Prospecto #${prospectoDetalle.id}` : 'Detalle'}
        ancho="max-w-3xl"
      >
        {cargandoDetalle ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-steel-600 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : prospectoDetalle && (
          <div className="space-y-6">
            {/* Info principal */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-steel-500">Nombre:</span>
                <span className="ml-2 font-medium text-steel-200">{prospectoDetalle.nombre}</span>
              </div>
              <div>
                <span className="text-steel-500">Estado:</span>
                <span className="ml-2"><ProspectoEstadoBadge estado={prospectoDetalle.estado} /></span>
              </div>
              <div>
                <span className="text-steel-500">Teléfono:</span>
                <span className="ml-2 text-steel-200">{TELEFONO_INPUT.format(prospectoDetalle.telefono) || '-'}</span>
              </div>
              <div>
                <span className="text-steel-500">Correo:</span>
                <span className="ml-2 text-steel-200">{prospectoDetalle.correo || '-'}</span>
              </div>
              <div>
                <span className="text-steel-500">Empresa:</span>
                <span className="ml-2 text-steel-200">{prospectoDetalle.empresa || '-'}</span>
              </div>
              <div>
                <span className="text-steel-500">Origen:</span>
                <span className="ml-2 text-steel-200">{prospectoDetalle.origen || '-'}</span>
              </div>
              <div>
                <span className="text-steel-500">Vendedor:</span>
                <span className="ml-2 text-steel-200">{prospectoDetalle.tbl_usuarios?.nombres || '-'}</span>
              </div>
              <div>
                <span className="text-steel-500">Próx. Seguimiento:</span>
                <span className="ml-2 text-steel-200">{prospectoDetalle.proxima_fecha_seguimiento ? formatearFechaHora(prospectoDetalle.proxima_fecha_seguimiento) : '-'}</span>
              </div>
              {prospectoDetalle.tbl_clientes && (
                <div className="col-span-2">
                  <span className="text-steel-500">Cliente vinculado:</span>
                  <span className="ml-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                    {prospectoDetalle.tbl_clientes.nombre}
                    {prospectoDetalle.tbl_clientes.dni && <span className="text-blue-500">- DNI: {prospectoDetalle.tbl_clientes.dni}</span>}
                  </span>
                </div>
              )}
              {prospectoDetalle.estado === ESTADO_PROSPECTO.CONVERTIDO && prospectoDetalle.tbl_ventas && (
                <div className="col-span-2">
                  <span className="text-steel-500">Venta vinculada:</span>
                  <span className="ml-2 text-emerald-600 font-medium">
                    Venta #{prospectoDetalle.tbl_ventas.id} - {formatearMoneda(prospectoDetalle.tbl_ventas.total)}
                  </span>
                </div>
              )}
              {prospectoDetalle.estado === ESTADO_PROSPECTO.PERDIDO && prospectoDetalle.motivo_perdida && (
                <div className="col-span-2">
                  <span className="text-steel-500">Motivo pérdida:</span>
                  <span className="ml-2 text-red-600">{prospectoDetalle.motivo_perdida}</span>
                </div>
              )}
            </div>

            {/* Cotización */}
            {prospectoDetalle.items_cotizacion?.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-steel-300">Cotización</h3>
                  <button
                    onClick={() => exportarCotizacionProspecto(prospectoDetalle)}
                    disabled={exportandoCotizacion}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
                    title={COTIZACION_EXPORT.BTN_EXPORTAR}
                  >
                    {exportandoCotizacion ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <HiOutlineDocumentDownload className="w-3.5 h-3.5" />
                    )}
                    {COTIZACION_EXPORT.BTN_EXPORTAR}
                  </button>
                </div>
                <div className="bg-steel-800/50 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-steel-700">
                        <th className="text-left p-2 text-steel-400">Producto</th>
                        <th className="text-right p-2 text-steel-400">Cant.</th>
                        <th className="text-right p-2 text-steel-400">Precio</th>
                        <th className="text-right p-2 text-steel-400">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prospectoDetalle.items_cotizacion.map((ic) => (
                        <tr key={ic.id} className="border-b border-steel-800/50">
                          <td className="p-2 text-steel-200">{ic.tbl_productos?.nombre}</td>
                          <td className="p-2 text-right text-steel-300">{ic.cantidad}</td>
                          <td className="p-2 text-right text-steel-300">{formatearMoneda(ic.precio_unitario)}</td>
                          <td className="p-2 text-right font-medium text-steel-200">{formatearMoneda(ic.cantidad * parseFloat(ic.precio_unitario))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-steel-600">
                        <td colSpan="3" className="p-2 text-right font-semibold text-steel-300">Total:</td>
                        <td className="p-2 text-right font-bold text-primary-600">
                          {formatearMoneda(prospectoDetalle.items_cotizacion.reduce((s, ic) => s + ic.cantidad * parseFloat(ic.precio_unitario), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Productos en Espera */}
            <div>
              <h3 className="text-sm font-semibold text-steel-300 mb-2 flex items-center gap-2">
                <HiOutlineClock className="w-4 h-4 text-orange-500" />
                Productos en Espera
              </h3>
              {prospectoDetalle.productos_en_espera?.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {prospectoDetalle.productos_en_espera.map((pe) => (
                    <div key={pe.id} className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-orange-800">{pe.tbl_productos?.nombre}</span>
                        {(() => {
                          const stock = pe.tbl_productos?._count?.unidades ?? 0;
                          return (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {stock > 0 ? `${stock} uds` : 'Sin stock'}
                            </span>
                          );
                        })()}
                      </div>
                      {prospectoDetalle.estado !== ESTADO_PROSPECTO.CONVERTIDO && prospectoDetalle.estado !== ESTADO_PROSPECTO.PERDIDO && (
                        <button
                          onClick={() => eliminarProductoEnEspera(pe.id, prospectoDetalle.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Quitar de espera"
                        >
                          <HiOutlineX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-steel-500 text-sm mb-3">Sin productos en espera</p>
              )}
              {prospectoDetalle.estado !== ESTADO_PROSPECTO.CONVERTIDO && prospectoDetalle.estado !== ESTADO_PROSPECTO.PERDIDO && (
                <div className="bg-steel-800/50 rounded-lg p-3">
                  <label className="label-field text-xs">Agregar producto a espera</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <AutocompleteBusqueda
                        buscarFn={buscarProductos}
                        placeholder="Buscar producto..."
                        renderItem={(p) => {
                          const stock = p._count?.unidades ?? 0;
                          return (
                            <div className="flex justify-between items-center gap-2">
                              <span>{p.nombre}</span>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {stock > 0 ? `${stock} uds` : 'Sin stock'}
                              </span>
                            </div>
                          );
                        }}
                        onSeleccionar={(p) => setProductoEsperaTemp(p)}
                        valorTexto={productoEsperaTemp?.nombre || ''}
                        onLimpiar={() => setProductoEsperaTemp(null)}
                      />
                    </div>
                    <button
                      onClick={() => productoEsperaTemp && intentarMarcarEnEspera(prospectoDetalle.id, productoEsperaTemp.id, productoEsperaTemp._count?.unidades ?? 0, productoEsperaTemp.nombre)}
                      disabled={!productoEsperaTemp || guardandoEspera}
                      className="btn-primary text-sm px-3 py-2"
                    >
                      {guardandoEspera ? '...' : <HiOutlinePlus className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Timeline de seguimientos */}
            <div>
              <h3 className="text-sm font-semibold text-steel-300 mb-2">Historial de seguimientos</h3>
              {prospectoDetalle.seguimientos?.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {prospectoDetalle.seguimientos.map((seg) => (
                    <div key={seg.id} className="flex gap-3 bg-steel-800/50 rounded-lg p-3">
                      <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary-500" />
                      <div className="flex-1">
                        <p className="text-sm text-steel-200">{seg.nota}</p>
                        <p className="text-xs text-steel-500 mt-1">{formatearFechaHora(seg.fecha_hora)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-steel-500 text-sm">Sin seguimientos registrados</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ================================================================= */}
      {/* MODAL: Agregar Seguimiento */}
      {/* ================================================================= */}
      <Modal
        abierto={modalSeguimiento}
        cerrar={() => setModalSeguimiento(false)}
        titulo={prospectoSeg ? `Seguimiento - ${prospectoSeg.nombre}` : 'Seguimiento'}
      >
        {prospectoSeg ? (
          <div className="space-y-4">
            {/* Historial previo */}
            {prospectoSeg.seguimientos?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-steel-400 mb-2 uppercase">Historial anterior</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
                  {prospectoSeg.seguimientos.map((seg) => (
                    <div key={seg.id} className="bg-steel-800/50 rounded p-2 text-sm">
                      <p className="text-steel-300">{seg.nota}</p>
                      <p className="text-xs text-steel-500 mt-1">{formatearFechaHora(seg.fecha_hora)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={guardarSeguimiento} className="space-y-4">
              <div>
                <label className="label-field">Nueva nota de seguimiento *</label>
                <textarea className="input-field min-h-[100px]" placeholder="¿En qué quedó? ¿Qué se habló?"
                  value={notaSeguimiento}
                  onChange={(e) => setNotaSeguimiento(e.target.value)} />
              </div>
              <div>
                <label className="label-field">Próxima fecha de seguimiento</label>
                <input type="datetime-local" className="input-field"
                  value={proximaFechaSeg}
                  onChange={(e) => setProximaFechaSeg(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalSeguimiento(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={guardandoSeg} className="btn-primary">
                  {guardandoSeg ? 'Guardando...' : 'Registrar Seguimiento'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-steel-600 border-t-primary-500 rounded-full animate-spin" />
          </div>
        )}
      </Modal>

      {/* ================================================================= */}
      {/* MODAL: Cotización */}
      {/* ================================================================= */}
      <Modal
        abierto={modalCotizacion}
        cerrar={() => setModalCotizacion(false)}
        titulo={prospectoCotiz ? `Cotización - ${prospectoCotiz.nombre}` : 'Cotización'}
        ancho="max-w-3xl"
      >
        {prospectoCotiz ? (
          <div className="space-y-4">
            {/* Buscador de productos */}
            <div className="bg-steel-800/50 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold text-steel-300">Agregar producto</h4>
              <AutocompleteBusqueda
                buscarFn={buscarProductos}
                placeholder="Buscar producto por nombre o ID..."
                renderItem={(p) => {
                  const stock = p._count?.unidades ?? 0;
                  return (
                    <div className="flex justify-between items-center gap-2">
                      <span>{p.nombre}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {stock > 0 ? `${stock} uds` : 'Sin stock'}
                        </span>
                        <span className="text-xs text-steel-500">{formatearMoneda(p.precio_venta_base)}</span>
                      </div>
                    </div>
                  );
                }}
                onSeleccionar={seleccionarProductoCotiz}
                valorTexto={productoTemp?.nombre || ''}
                onLimpiar={() => setProductoTemp(null)}
              />

              {productoTemp && (
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="label-field text-xs">Tipo Precio</label>
                    <select className="input-field text-sm" value={tipoPrecio}
                      onChange={(e) => {
                        setTipoPrecio(e.target.value);
                        setPrecioTemp(obtenerPrecioPorTipo(productoTemp, e.target.value));
                      }}>
                      <option value={TIPO_PRECIO.VENDEDOR}>Vendedor</option>
                      <option value={TIPO_PRECIO.CATALOGO}>Catálogo</option>
                      {puedeUsarMayorista && <option value={TIPO_PRECIO.MAYORISTA}>Mayorista</option>}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="label-field text-xs">Cantidad</label>
                    <input type="number" min="1" className="input-field text-sm"
                      value={cantidadTemp}
                      onChange={(e) => setCantidadTemp(e.target.value)}
                      onBlur={(e) => {
                        const n = parseInt(e.target.value);
                        setCantidadTemp(Number.isFinite(n) && n > 0 ? n : 1);
                      }} />
                  </div>
                  <div className="w-28">
                    <label className="label-field text-xs">Precio</label>
                    <input type="number" step="0.01" className="input-field text-sm"
                      value={precioTemp} onChange={(e) => setPrecioTemp(e.target.value)} />
                  </div>
                  <button type="button" onClick={agregarItemCotizacion} className="btn-primary text-sm px-3 py-2">
                    <HiOutlinePlus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Tabla items editable */}
            {itemsCotizacion.length > 0 ? (
              <div className="space-y-2">
                {itemsCotizacion.map((item, idx) => {
                  const regEspera = prospectoCotiz?.productos_en_espera?.find(
                    (pe) => pe.product_id === item.product_id
                  );
                  return (
                    <div key={idx} className={`rounded-lg border p-3 ${item.es_regalo ? 'bg-emerald-900/30 border-emerald-700/40' : 'bg-steel-800/50 border-steel-700/50'}`}>
                      {/* Fila 1: nombre + badges + acciones */}
                      <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-steel-200 text-sm">{item.nombre}</span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            item.stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {item.stock > 0 ? `${item.stock} en stock` : 'Sin stock'}
                          </span>
                          {regEspera && (
                            <button
                              onClick={() => eliminarProductoEnEspera(regEspera.id, prospectoCotiz.id)}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors cursor-pointer"
                              title="Quitar de espera"
                            >
                              <HiOutlineClock className="w-3 h-3" /> en espera ✕
                            </button>
                          )}
                          {item.es_regalo && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                              <HiOutlineGift className="w-3 h-3" /> REGALO
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Toggle regalo */}
                          <button
                            onClick={() => actualizarItemCotizacion(idx, 'es_regalo', !item.es_regalo)}
                            className={`p-1 rounded transition-colors ${item.es_regalo ? 'text-emerald-400 hover:text-emerald-300' : 'text-steel-500 hover:text-emerald-400'}`}
                            title={item.es_regalo ? 'Quitar como regalo' : 'Marcar como regalo'}
                          >
                            <HiOutlineGift className="w-4 h-4" />
                          </button>
                          {/* Espera */}
                          {!regEspera && (
                            <button
                              onClick={() => intentarMarcarEnEspera(prospectoCotiz.id, item.product_id, item.stock, item.nombre)}
                              className="text-orange-500 hover:text-orange-700 p-1" title="Marcar en espera"
                            >
                              <HiOutlineClock className="w-4 h-4" />
                            </button>
                          )}
                          {/* Eliminar */}
                          <button onClick={() => setItemsCotizacion(itemsCotizacion.filter((_, i) => i !== idx))}
                            className="text-red-600 hover:text-red-700 p-1" title="Eliminar">
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Fila 2: inputs editables */}
                      {(() => {
                        const precioEfectivo = (parseFloat(item.precio_unitario) || 0) - ((parseFloat(item.descuento) || 0) / (parseInt(item.cantidad) || 1));
                        const bajoPrecioMin = !item.es_regalo && item.precio_minimo > 0 && precioEfectivo < item.precio_minimo;
                        const precioBajo = !item.es_regalo && item.precio_minimo > 0 && (parseFloat(item.precio_unitario) || 0) < item.precio_minimo;

                        if (item.es_regalo) {
                          return (
                            <div className="flex items-center gap-2 text-xs text-emerald-400">
                              <HiOutlineGift className="w-3.5 h-3.5" />
                              <span>Este producto se entregará como regalo (S/ 0.00)</span>
                            </div>
                          );
                        }

                        return (
                          <div>
                            <div className="grid grid-cols-12 gap-2 items-start">
                              <div className="col-span-2">
                                <label className="block text-[10px] text-steel-500 mb-0.5 text-center">Cant.</label>
                                <input type="number" min="1" className="input-field text-xs py-1 px-2 text-center w-full"
                                  value={item.cantidad}
                                  onChange={(e) => actualizarItemCotizacion(idx, 'cantidad', e.target.value)}
                                  onBlur={(e) => {
                                    const n = parseInt(e.target.value);
                                    actualizarItemCotizacion(idx, 'cantidad', Number.isFinite(n) && n > 0 ? n : 1);
                                  }} />
                              </div>
                              <div className="col-span-3">
                                <label className="block text-[10px] text-steel-500 mb-0.5 text-right">Precio</label>
                                <input type="number" step="0.01" min="0"
                                  className={`input-field text-xs py-1 px-2 text-right w-full ${precioBajo ? '!border-red-500 !text-red-400' : ''}`}
                                  value={item.precio_unitario}
                                  onChange={(e) => actualizarItemCotizacion(idx, 'precio_unitario', e.target.value)} />
                                {item.precio_minimo > 0 && (
                                  <div className={`text-[9px] mt-0.5 text-right ${precioBajo ? 'text-red-500 font-bold' : 'text-steel-600'}`}>
                                    Mín: {formatearMoneda(item.precio_minimo)}
                                  </div>
                                )}
                              </div>
                              <div className="col-span-3">
                                <label className="block text-[10px] text-steel-500 mb-0.5 text-right">Descuento</label>
                                <input type="number" step="0.01" min="0"
                                  className={`input-field text-xs py-1 px-2 text-right w-full ${bajoPrecioMin && !precioBajo ? '!border-red-500 !text-red-400' : ''}`}
                                  value={item.descuento || ''}
                                  placeholder="0.00"
                                  onChange={(e) => actualizarItemCotizacion(idx, 'descuento', e.target.value)} />
                              </div>
                              <div className="col-span-4">
                                <label className="block text-[10px] text-steel-500 mb-0.5 text-right">Subtotal</label>
                                <div className={`text-sm font-semibold text-right py-1 ${bajoPrecioMin ? 'text-red-400' : 'text-steel-200'}`}>
                                  {formatearMoneda(item.subtotal)}
                                </div>
                              </div>
                            </div>
                            {bajoPrecioMin && (
                              <p className="text-[10px] text-red-500 font-semibold mt-1">
                                El precio efectivo por unidad ({formatearMoneda(precioEfectivo)}) es menor al precio mínimo ({formatearMoneda(item.precio_minimo)})
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}

                {/* Total */}
                <div className="flex justify-end pt-2 border-t border-steel-600">
                  <div className="text-right">
                    <span className="text-sm text-steel-400 mr-3">Total:</span>
                    <span className="text-lg font-bold text-primary-600">{formatearMoneda(totalCotizacion)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-steel-500 text-sm text-center py-4">Sin productos en la cotización</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setModalCotizacion(false)} className="btn-secondary">Cancelar</button>
              <button onClick={guardarCotizacion} disabled={guardandoCotiz} className="btn-primary">
                {guardandoCotiz ? 'Guardando...' : 'Guardar Cotización'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-steel-600 border-t-primary-500 rounded-full animate-spin" />
          </div>
        )}
      </Modal>

      {/* ================================================================= */}
      {/* MODAL: Convertir a Venta */}
      {/* ================================================================= */}
      <Modal
        abierto={modalConvertir}
        cerrar={() => setModalConvertir(false)}
        titulo={prospectoConvertir ? `Convertir a Venta - ${prospectoConvertir.nombre}` : 'Convertir a Venta'}
        ancho="max-w-4xl"
      >
        {prospectoConvertir ? (
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Resumen prospecto */}
            <div className="bg-steel-800/50 rounded-lg p-3 flex gap-4 text-sm">
              <div><span className="text-steel-500">Prospecto:</span> <span className="text-steel-200 font-medium">{prospectoConvertir.nombre}</span></div>
              {prospectoConvertir.telefono && <div><span className="text-steel-500">Tel:</span> <span className="text-steel-300">{TELEFONO_INPUT.format(prospectoConvertir.telefono)}</span></div>}
              {prospectoConvertir.empresa && <div><span className="text-steel-500">Empresa:</span> <span className="text-steel-300">{prospectoConvertir.empresa}</span></div>}
            </div>

            {/* Seleccionar cliente */}
            <div className="bg-steel-800/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-steel-300">Cliente *</h4>
                <button type="button" onClick={() => setModalCrearCliente(true)}
                  className="text-xs text-primary-600 hover:text-primary-700">
                  + Crear cliente nuevo
                </button>
              </div>
              {clienteSeleccionado ? (
                <div className="flex items-center justify-between bg-steel-900/50 rounded p-2">
                  <div>
                    <span className="font-medium text-steel-200">{clienteSeleccionado.nombre}</span>
                    {clienteSeleccionado.dni && <span className="text-xs text-steel-500 ml-2">DNI: {clienteSeleccionado.dni}</span>}
                    {clientePuntos > 0 && (
                      <span className="text-xs text-amber-600 ml-2">
                        <HiOutlineStar className="inline w-3 h-3 mr-0.5" />{clientePuntos} puntos
                      </span>
                    )}
                  </div>
                  <button onClick={() => { setClienteSeleccionado(null); setClientePuntos(0); }}
                    className="text-steel-400 hover:text-red-600"><HiOutlineX className="w-4 h-4" /></button>
                </div>
              ) : (
                <AutocompleteBusqueda
                  buscarFn={buscarClientes}
                  placeholder="Buscar cliente por nombre, DNI o teléfono..."
                  renderItem={(c) => (
                    <div>
                      <span className="font-medium">{c.nombre}</span>
                      {c.dni && <span className="text-xs text-steel-500 ml-2">DNI: {c.dni}</span>}
                    </div>
                  )}
                  onSeleccionar={seleccionarCliente}
                  onLimpiar={() => {}}
                />
              )}
            </div>

            {/* Tipo entrega y destino */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Tipo de entrega</label>
                <select className="input-field" value={tipoEntrega}
                  onChange={(e) => {
                    setTipoEntrega(e.target.value);
                    setTransportistaId('');
                    setDepartamentoId('');
                    setProvinciaId('');
                    setDistritoId('');
                    setProvincias([]);
                    setDistritos([]);
                  }}>
                  <option value={TIPO_ENTREGA.ENVIO_POR_AGENCIA}>Envío por Agencia</option>
                  <option value={TIPO_ENTREGA.RETIRO_EN_TIENDA}>Retiro en tienda</option>
                </select>
              </div>
              <div>
                <label className="label-field">Destino</label>
                <select className="input-field" value={tipoDestino}
                  onChange={(e) => setTipoDestino(e.target.value)}>
                  <option value={TIPO_DESTINO.LIMA}>Lima</option>
                  <option value={TIPO_DESTINO.PROVINCIA}>Provincia</option>
                </select>
              </div>
            </div>

            {/* Envío por agencia: transportista + cascada ubigeo */}
            {tipoEntrega === TIPO_ENTREGA.ENVIO_POR_AGENCIA && (
              <div className="space-y-3">
                <div>
                  <label className="label-field">Agencia Transportista *</label>
                  <select className="input-field" value={transportistaId} onChange={(e) => setTransportistaId(e.target.value)} required>
                    <option value="">Seleccionar agencia...</option>
                    {transportistas.map((t) => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="label-field">Departamento *</label>
                    <select
                      className="input-field disabled:opacity-60 disabled:cursor-not-allowed"
                      value={departamentoId}
                      onChange={(e) => handleDepartamentoChangeProspecto(e.target.value)}
                      disabled={tipoDestino === TIPO_DESTINO.LIMA}
                      title={tipoDestino === TIPO_DESTINO.LIMA ? 'Fijado por Destino = Lima' : undefined}
                      required>
                      <option value="">Seleccionar...</option>
                      {departamentosFiltrados.map((d) => (
                        <option key={d.id} value={d.id}>{d.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label-field">Provincia *</label>
                    <select className="input-field" value={provinciaId}
                      onChange={(e) => handleProvinciaChangeProspecto(e.target.value)}
                      disabled={!departamentoId} required>
                      <option value="">{departamentoId ? 'Seleccionar...' : 'Elija depto.'}</option>
                      {provincias.map((p) => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label-field">Distrito *</label>
                    <select className="input-field" value={distritoId}
                      onChange={(e) => setDistritoId(e.target.value)}
                      disabled={!provinciaId} required>
                      <option value="">{provinciaId ? 'Seleccionar...' : 'Elija provincia'}</option>
                      {distritos.map((d) => (
                        <option key={d.id} value={d.id}>{d.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Agregar productos */}
            <div className="bg-steel-800/50 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold text-steel-300">Productos</h4>
              <AutocompleteBusqueda
                buscarFn={buscarProductos}
                placeholder="Buscar producto..."
                renderItem={(p) => {
                  const stock = p._count?.unidades ?? 0;
                  return (
                    <div className="flex justify-between items-center gap-2">
                      <span>{p.nombre}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {stock > 0 ? `${stock} uds` : 'Sin stock'}
                        </span>
                        <span className="text-xs text-steel-500">{formatearMoneda(p.precio_venta_base)}</span>
                      </div>
                    </div>
                  );
                }}
                onSeleccionar={seleccionarProductoVenta}
                valorTexto={productoTempVenta?.nombre || ''}
                onLimpiar={() => setProductoTempVenta(null)}
              />

              {productoTempVenta && (
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="label-field text-xs">Tipo Precio</label>
                    <select className="input-field text-sm" value={tipoPrecioVenta}
                      onChange={(e) => {
                        setTipoPrecioVenta(e.target.value);
                        setPrecioTempVenta(obtenerPrecioPorTipo(productoTempVenta, e.target.value));
                      }}>
                      <option value={TIPO_PRECIO.VENDEDOR}>Vendedor</option>
                      <option value={TIPO_PRECIO.CATALOGO}>Catálogo</option>
                      {puedeUsarMayorista && <option value={TIPO_PRECIO.MAYORISTA}>Mayorista</option>}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="label-field text-xs">Stock: {stockDisponible}</label>
                    <input type="number" min="1" className="input-field text-sm"
                      value={cantidadTempVenta}
                      onChange={(e) => setCantidadTempVenta(e.target.value)}
                      onBlur={(e) => {
                        const n = parseInt(e.target.value);
                        setCantidadTempVenta(Number.isFinite(n) && n > 0 ? n : 1);
                      }} />
                  </div>
                  <div className="w-28">
                    <label className="label-field text-xs">Precio</label>
                    <input type="number" step="0.01" className="input-field text-sm"
                      value={precioTempVenta} onChange={(e) => setPrecioTempVenta(e.target.value)} />
                  </div>
                  <button type="button" onClick={agregarItemVenta} className="btn-primary text-sm px-3 py-2">
                    <HiOutlinePlus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Tabla items venta */}
            {itemsVenta.length > 0 && (
              <div className="bg-steel-800/50 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-steel-700">
                      <th className="text-left p-2 text-steel-400">Producto</th>
                      <th className="text-right p-2 text-steel-400">Cant.</th>
                      <th className="text-right p-2 text-steel-400">Precio</th>
                      <th className="text-right p-2 text-steel-400">Desc.</th>
                      <th className="text-right p-2 text-steel-400">Subtotal</th>
                      <th className="text-center p-2 text-steel-400">Regalo</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsVenta.map((item, idx) => {
                      const desc = parseFloat(item.descuento) || 0;
                      const precioEfectivo = (parseFloat(item.precio_unitario_vendido) || 0) - (desc / (parseInt(item.cantidad) || 1));
                      const bajoPrecioMin = !item.es_regalo && item.precio_minimo > 0 && precioEfectivo < item.precio_minimo;
                      const precioBajo = !item.es_regalo && item.precio_minimo > 0 && (parseFloat(item.precio_unitario_vendido) || 0) < item.precio_minimo;
                      const recalcular = (cambios) => {
                        const nuevo = { ...item, ...cambios };
                        const c = parseInt(nuevo.cantidad) || 1;
                        const p = parseFloat(nuevo.precio_unitario_vendido) || 0;
                        const d = parseFloat(nuevo.descuento) || 0;
                        nuevo.subtotal = nuevo.es_regalo ? 0 : Math.max(0, (c * p) - d);
                        const updated = [...itemsVenta];
                        updated[idx] = nuevo;
                        setItemsVenta(updated);
                      };
                      return (
                        <tr key={idx} className={`border-b border-steel-800/50 ${item.es_regalo ? 'bg-emerald-900/20' : ''}`}>
                          <td className="p-2 text-steel-200">
                            {item.nombre}
                            {item.es_regalo && <span className="ml-1.5 text-[10px] font-bold text-emerald-400">REGALO</span>}
                          </td>
                          <td className="p-2 text-right">
                            <input type="number" min="1"
                              className="input-field text-sm text-right w-16 py-1 px-1.5"
                              value={item.cantidad}
                              onChange={(e) => recalcular({ cantidad: e.target.value })}
                              onBlur={(e) => {
                                const n = parseInt(e.target.value);
                                recalcular({ cantidad: Number.isFinite(n) && n > 0 ? n : 1 });
                              }}
                            />
                          </td>
                          <td className="p-2 text-right">
                            <input type="number" step="0.01" min="0"
                              className={`input-field text-sm text-right w-24 py-1 px-1.5 ${precioBajo ? 'border-red-500 text-red-400' : ''}`}
                              value={item.precio_unitario_vendido}
                              onChange={(e) => recalcular({ precio_unitario_vendido: parseFloat(e.target.value) || 0 })}
                              onBlur={() => {
                                if (precioBajo) toast.error(`Precio mínimo: ${formatearMoneda(item.precio_minimo)}`, { id: `min-price-${idx}` });
                              }}
                            />
                            {!item.es_regalo && item.precio_minimo > 0 && (
                              <div className={`text-[9px] mt-0.5 ${precioBajo ? 'text-red-400 font-semibold' : 'text-steel-500'}`}>
                                Mín: {formatearMoneda(item.precio_minimo)}
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-right">
                            <input type="number" step="0.01" min="0"
                              className={`input-field text-sm text-right w-20 py-1 px-1.5 ${bajoPrecioMin && !precioBajo ? 'border-red-500 text-red-400' : ''}`}
                              value={item.descuento || ''}
                              placeholder="0"
                              onChange={(e) => recalcular({ descuento: e.target.value })}
                            />
                          </td>
                          <td className={`p-2 text-right font-medium ${item.es_regalo ? 'line-through text-steel-500' : bajoPrecioMin ? 'text-red-400' : 'text-steel-200'}`}>
                            {formatearMoneda(item.es_regalo ? item.cantidad * (parseFloat(item.precio_unitario_vendido) || 0) : item.subtotal)}
                          </td>
                          <td className="p-2 text-center">
                            <button onClick={() => recalcular({ es_regalo: !item.es_regalo })}
                              className={`px-2 py-0.5 rounded text-xs font-semibold ${item.es_regalo ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-steel-700 text-steel-400 border border-steel-600'}`}>
                              {item.es_regalo ? 'REGALO' : 'Normal'}
                            </button>
                          </td>
                          <td className="p-2 text-center">
                            <button onClick={() => setItemsVenta(itemsVenta.filter((_, i) => i !== idx))}
                              className="text-red-600 hover:text-red-700">
                              <HiOutlineTrash className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Promoción y puntos */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Promoción</label>
                <select className="input-field" value={promocionId}
                  onChange={(e) => setPromocionId(e.target.value)}>
                  <option value="">Sin promoción</option>
                  {promociones.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.tipo === TIPO_PROMOCION.DESCUENTO_PORCENTAJE ? `${p.valor}%` : formatearMoneda(p.valor)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-field">
                  Puntos a usar {clientePuntos > 0 && <span className="text-amber-600">({clientePuntos} disponibles)</span>}
                </label>
                <input type="number" min="0" max={clientePuntos} className="input-field"
                  value={descuentoPuntos}
                  onChange={(e) => setDescuentoPuntos(Math.max(0, Math.min(clientePuntos, parseFloat(e.target.value) || 0)))} />
              </div>
            </div>

            {/* Resumen total */}
            <div className="bg-steel-800/50 rounded-lg p-4 text-sm space-y-1">
              <div className="flex justify-between text-steel-400">
                <span>Subtotal:</span>
                <span>{formatearMoneda(subtotalVenta)}</span>
              </div>
              {descuentoPromocion > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Desc. Promoción:</span>
                  <span>-{formatearMoneda(descuentoPromocion)}</span>
                </div>
              )}
              {descuentoPuntos > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>Desc. Puntos:</span>
                  <span>-{formatearMoneda(descuentoPuntos)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-primary-600 pt-2 border-t border-steel-700">
                <span>Total:</span>
                <span>{formatearMoneda(totalVenta)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setModalConvertir(false)} className="btn-secondary">Cancelar</button>
              <button onClick={convertirAVenta} disabled={convirtiendoVenta} className="btn-primary flex items-center gap-2">
                <HiOutlineShoppingCart className="w-4 h-4" />
                {convirtiendoVenta ? 'Convirtiendo...' : 'Convertir a Venta'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-steel-600 border-t-primary-500 rounded-full animate-spin" />
          </div>
        )}
      </Modal>

      {/* ================================================================= */}
      {/* MODAL: Crear cliente nuevo (reusa el mismo flujo que Clientes) */}
      {/* ================================================================= */}
      <ModalEditarCliente
        abierto={modalCrearCliente}
        cerrar={() => setModalCrearCliente(false)}
        cliente={null}
        onGuardado={onClienteCreado}
      />

      {/* ================================================================= */}
      {/* DIALOG: Marcar como perdido */}
      {/* ================================================================= */}
      <DialogConfirmacion
        abierto={!!confirmPerdido}
        titulo="Marcar como perdido"
        mensaje="¿Estás seguro de marcar este prospecto como perdido? Esta acción no se puede deshacer fácilmente."
        onConfirmar={marcarPerdido}
        onCancelar={() => { setConfirmPerdido(null); setMotivoPerdida(''); }}
      >
        <div className="mt-3">
          <label className="label-field">Motivo (opcional)</label>
          <textarea className="input-field min-h-[60px]" placeholder="¿Por qué se perdió?"
            value={motivoPerdida}
            onChange={(e) => setMotivoPerdida(e.target.value)} />
        </div>
      </DialogConfirmacion>

      {/* DIALOG: Confirmar espera con stock disponible */}
      <DialogConfirmacion
        abierto={!!confirmarEspera}
        titulo="Producto con stock disponible"
        mensaje={confirmarEspera ? `"${confirmarEspera.nombre}" tiene ${confirmarEspera.stock} unidad(es) disponibles en almacén. ¿Seguro que deseas marcarlo en espera de todas formas?` : ''}
        onConfirmar={() => {
          const { prospectoId, productId } = confirmarEspera;
          setConfirmarEspera(null);
          agregarProductoEnEspera(prospectoId, productId);
        }}
        onCancelar={() => setConfirmarEspera(null)}
        tipo="advertencia"
      />
    </div>
  );
}
