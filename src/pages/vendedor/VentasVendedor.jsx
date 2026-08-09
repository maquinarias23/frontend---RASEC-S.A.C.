import { useState, useEffect, useRef, useCallback } from 'react';
import {
  HiOutlinePlus,
  HiOutlineCash,
  HiOutlineX,
  HiOutlineEye,
  HiOutlineSearch,
  HiOutlineTrash,
  HiOutlineTag,
  HiOutlineStar,
  HiOutlineShoppingCart,
  HiOutlineKey,
  HiOutlineGift,
  HiOutlineExclamation,
  HiOutlineCollection,
  HiOutlinePencilAlt,
  HiOutlineClock,
  HiOutlineUser,
} from 'react-icons/hi';
import useCrud from '../../hooks/useCrud';
import usePaginacion from '../../hooks/usePaginacion';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import TablaGenerica from '../../components/ui/TablaGenerica';
import Modal from '../../components/ui/Modal';
import EstadoBadge from '../../components/ui/EstadoBadge';
import TotalizadorVenta from '../../components/shared/TotalizadorVenta';
import ModalEditarCliente from '../../components/shared/ModalEditarCliente';
import Paginacion from '../../components/ui/Paginacion';
import DialogConfirmacion from '../../components/ui/DialogConfirmacion';
import { formatearMoneda, formatearFechaHora } from '../../utils/formato';
import { buildMediaUrl } from '../../utils/media';
import {
  ESTADO_VENTA,
  ESTADO_TRACKING,
  ESTADO_UNIDAD,
  TIPO_ENTREGA,
  TIPO_DESTINO,
  TIPO_PRECIO,
  TIPO_DESCUENTO_COMBO,
  METODOS_PAGO,
  METODOS_PAGO_LABEL,
  TELEFONO_INPUT,
  DNI_RUC_INPUT,
  MSG_PAGO_BLOQUEADO_CLIENTE,
} from '../../config/constants';
import useAuthStore from '../../store/authStore';
import { ROLES } from '../../config/roles';
import { obtenerDepartamentos, obtenerProvincias, obtenerDistritos } from '../../services/ubigeoService';

// ---------------------------------------------------------------------------
// Persona que RECIBE el envío. Puede no ser el cliente que compra: estos datos
// van al rótulo y a la guía de remisión, y opcionalmente quedan guardados como
// contacto del cliente para reutilizarlos en ventas posteriores.
// ---------------------------------------------------------------------------
const RECEPTOR_VACIO = {
  nombre: '',
  numero_documento: '',
  razon_social: '',
  telefono: '',
  observacion: '',
};

const receptorTieneDatos = (r) =>
  !!(r.nombre.trim() || r.numero_documento.trim() || r.razon_social.trim()
    || r.telefono.trim() || r.observacion.trim());

// ---------------------------------------------------------------------------
// Componente interno: Buscador con autocomplete personalizado
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
// Helpers de vouchers
// ---------------------------------------------------------------------------
const tieneVoucherRechazado = (venta) => {
  if (!venta.pagos) return false;
  return venta.pagos.some(p => (p.adjuntos || []).some(a => a.rechazado));
};

// ---------------------------------------------------------------------------
// Columnas de la tabla principal
// ---------------------------------------------------------------------------
const columnas = [
  { key: 'id', label: 'N° Venta' },
  {
    key: 'cliente',
    label: 'Cliente',
    render: (f) => (
      <div>
        <span className="font-medium">{f.tbl_clientes?.nombre || '-'}</span>
        {f.tbl_clientes?.dni && (
          <span className="text-xs text-steel-500 ml-1">({f.tbl_clientes.dni})</span>
        )}
      </div>
    ),
  },
  {
    key: 'total',
    label: 'Total',
    render: (f) => <span className="font-semibold">{formatearMoneda(f.total)}</span>,
  },
  {
    key: 'inicial',
    label: 'Inicial',
    render: (f) => {
      const primerPago = f.pagos?.[0];
      return primerPago
        ? <span className="font-medium">{formatearMoneda(primerPago.monto)}</span>
        : <span className="text-steel-500">-</span>;
    },
  },
  {
    key: 'saldo',
    label: 'Saldo',
    render: (f) => {
      const saldo = parseFloat(f.saldo_pendiente || 0);
      return (
        <span className={saldo > 0 ? 'text-amber-600 font-medium' : 'text-emerald-600 font-medium'}>
          {formatearMoneda(saldo)}
        </span>
      );
    },
  },
  {
    key: 'tipo_entrega',
    label: 'Entrega',
    render: (f) => (
      <span className="capitalize">{f.tipo_entrega?.replace(/_/g, ' ') || '-'}</span>
    ),
  },
  {
    key: 'estado_venta',
    label: 'Estado',
    render: (f) => (
      <div className="flex flex-col gap-1">
        <EstadoBadge estado={f.estado_venta} />
        {tieneVoucherRechazado(f) && parseFloat(f.saldo_pendiente) > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 bg-red-500/15 text-red-600 border border-red-500/30 rounded-full font-semibold text-center">
            Voucher rechazado
          </span>
        )}
      </div>
    ),
  },
  {
    key: 'estado_tracking',
    label: 'Tracking',
    render: (f) => <EstadoBadge estado={f.estado_tracking} />,
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
export default function VentasVendedor() {
  const { datos, cargando, listar } = useCrud('/ventas');
  const { datosPaginados, paginaActual, totalPaginas, irAPagina } = usePaginacion(datos);
  const { esRol } = useAuthStore();
  const puedeUsarMayorista = esRol(ROLES.ADMINISTRADOR, ROLES.SUPER_ADMINISTRADOR);

  // --- Estado: modal nueva venta ---
  const [modalNuevaVenta, setModalNuevaVenta] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [clientePuntos, setClientePuntos] = useState(0);
  const [items, setItems] = useState([]);
  const [tipoEntrega, setTipoEntrega] = useState(TIPO_ENTREGA.ENVIO_POR_AGENCIA);
  const [tipoDestino, setTipoDestino] = useState(TIPO_DESTINO.LIMA);
  const [departamentos, setDepartamentos] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [departamentoId, setDepartamentoId] = useState('');
  const [provinciaId, setProvinciaId] = useState('');
  const [distritoId, setDistritoId] = useState('');
  const [transportistas, setTransportistas] = useState([]);
  const [transportistaId, setTransportistaId] = useState('');
  const [promocionId, setPromocionId] = useState('');
  const [descuentoPuntos, setDescuentoPuntos] = useState(0);
  const [promociones, setPromociones] = useState([]);
  const [creandoVenta, setCreandoVenta] = useState(false);

  // --- Estado: quien recibe el envío (no siempre es el cliente) ---
  // Estos datos van al rótulo y a la guía de remisión, y opcionalmente quedan
  // en la agenda de contactos del cliente para reutilizarlos en otras ventas.
  const [receptor, setReceptor] = useState(RECEPTOR_VACIO);
  const [guardarReceptor, setGuardarReceptor] = useState(true);
  const [contactosCliente, setContactosCliente] = useState([]);
  const [contactoSeleccionado, setContactoSeleccionado] = useState('');

  // --- Estado: agregar item temporal ---
  const [productoTemp, setProductoTemp] = useState(null);
  const [stockDisponible, setStockDisponible] = useState(0);
  const [cantidadTemp, setCantidadTemp] = useState(1);
  const [precioTemp, setPrecioTemp] = useState('');
  const [tipoPrecio, setTipoPrecio] = useState(TIPO_PRECIO.VENDEDOR);
  const [promocionesProducto, setPromocionesProducto] = useState([]);
  const [promoItemTemp, setPromoItemTemp] = useState('');

  // --- Estado: modal pago ---
  const [modalPago, setModalPago] = useState(false);
  const [ventaPago, setVentaPago] = useState(null);
  const [formPago, setFormPago] = useState({ monto: '', metodo_pago: METODOS_PAGO.EFECTIVO });
  const [archivoBoucher, setArchivoBoucher] = useState(null);
  const [registrandoPago, setRegistrandoPago] = useState(false);

  // --- Estado: modal detalle ---
  const [modalDetalle, setModalDetalle] = useState(false);
  const [ventaDetalle, setVentaDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  // --- Estado: ajuste de precios ---
  const [modoAjuste, setModoAjuste] = useState(false);
  const [itemsAjuste, setItemsAjuste] = useState([]);
  const [motivoAjuste, setMotivoAjuste] = useState('');
  const [guardandoAjuste, setGuardandoAjuste] = useState(false);
  const [historialAjustes, setHistorialAjustes] = useState([]);

  // --- Estado: dialog cancelar ---
  const [confirmCancelar, setConfirmCancelar] = useState(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');

  // --- Estado: crear cliente desde la venta ---
  const [modalCrearCliente, setModalCrearCliente] = useState(false);
  const [tarjetaCredenciales, setTarjetaCredenciales] = useState(null);

  // Reenvío de pedido rechazado
  const [modalReenvio, setModalReenvio] = useState(false);
  const [ventaReenvio, setVentaReenvio] = useState(null);
  const [voucherReenvio, setVoucherReenvio] = useState(null);
  const [enviandoReenvio, setEnviandoReenvio] = useState(false);

  // Combos
  const [combosDisponibles, setCombosDisponibles] = useState([]);
  const [cargandoCombos, setCargandoCombos] = useState(false);

  // Adelanto
  const [conAdelanto, setConAdelanto] = useState(false);
  const [montoAdelanto, setMontoAdelanto] = useState('');
  const [metodoPagoAdelanto, setMetodoPagoAdelanto] = useState(METODOS_PAGO.EFECTIVO);
  const [archivoBoucherAdelanto, setArchivoBoucherAdelanto] = useState(null);

  // =========================================================================
  // Funciones de busqueda
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

  // Recibe la respuesta de ModalEditarCliente, que puede venir de dos caminos:
  // crear ({ cliente, credenciales }) o vincular un cliente ya existente
  // ({ mensaje, cliente }). En ambos queda seleccionado para la venta.
  const onClienteCreado = async (data) => {
    const nuevo = data?.cliente || data;
    if (nuevo?.id) {
      await seleccionarCliente(nuevo);
    }
    if (data?.credenciales) {
      setTarjetaCredenciales(data.credenciales);
    }
  };

  // =========================================================================
  // Abrir modal nueva venta
  // =========================================================================

  const abrirNuevaVenta = async () => {
    setClienteSeleccionado(null);
    setClientePuntos(0);
    setItems([]);
    setTipoEntrega(TIPO_ENTREGA.ENVIO_POR_AGENCIA);
    setTipoDestino(TIPO_DESTINO.LIMA);
    setDepartamentoId('');
    setProvinciaId('');
    setDistritoId('');
    setProvincias([]);
    setDistritos([]);
    setTransportistaId('');
    setPromocionId('');
    setDescuentoPuntos(0);
    setProductoTemp(null);
    setStockDisponible(0);
    setCantidadTemp(1);
    setPrecioTemp('');
    setTipoPrecio(TIPO_PRECIO.VENDEDOR);
    setPromocionesProducto([]);
    setPromoItemTemp('');
    setConAdelanto(false);
    setMontoAdelanto('');
    setMetodoPagoAdelanto(METODOS_PAGO.EFECTIVO);
    setArchivoBoucherAdelanto(null);
    setReceptor(RECEPTOR_VACIO);
    setGuardarReceptor(true);
    setContactosCliente([]);
    setContactoSeleccionado('');
    try {
      const { data } = await api.get('/promociones/activas');
      setPromociones(Array.isArray(data) ? data : (data.datos || []));
    } catch {
      setPromociones([]);
    }
    try {
      const { data: deps } = await obtenerDepartamentos();
      setDepartamentos(Array.isArray(deps) ? deps : []);
    } catch {
      setDepartamentos([]);
    }
    try {
      const { data: transp } = await api.get('/transportistas');
      setTransportistas(Array.isArray(transp) ? transp : []);
    } catch {
      setTransportistas([]);
    }
    setDepartamentoId('');
    setProvinciaId('');
    setDistritoId('');
    setProvincias([]);
    setDistritos([]);
    setTransportistaId('');
    // Cargar combos activos del vendedor
    try {
      const { data: combosData } = await api.get('/combos/mis-activos');
      setCombosDisponibles(Array.isArray(combosData) ? combosData : []);
    } catch {
      setCombosDisponibles([]);
    }
    setModalNuevaVenta(true);
  };

  // =========================================================================
  // Ubigeo: cascada departamento → provincia → distrito
  // =========================================================================

  const handleDepartamentoChange = async (depId) => {
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

  const handleProvinciaChange = async (provId) => {
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

  // =========================================================================
  // Seleccionar cliente -> cargar puntos y su agenda de contactos
  // =========================================================================

  const seleccionarCliente = async (cliente) => {
    setClienteSeleccionado(cliente);
    // La agenda es por cliente: al cambiar de cliente se descarta el receptor
    // elegido para no arrastrar a alguien que pertenece a otra cartera.
    setReceptor(RECEPTOR_VACIO);
    setContactoSeleccionado('');
    try {
      const { data } = await api.get(`/clientes/${cliente.id}`);
      setClientePuntos(data.saldo_puntos || 0);
    } catch {
      setClientePuntos(0);
    }
    try {
      const { data } = await api.get(`/clientes/${cliente.id}/contactos`);
      setContactosCliente(Array.isArray(data) ? data : []);
    } catch {
      setContactosCliente([]);
    }
  };

  // Rellena el formulario de "quien recibe" con un contacto ya guardado.
  const elegirContactoReceptor = (contactoId) => {
    setContactoSeleccionado(contactoId);
    if (!contactoId) {
      setReceptor(RECEPTOR_VACIO);
      return;
    }
    const c = contactosCliente.find((x) => String(x.id) === String(contactoId));
    if (!c) return;
    setReceptor({
      nombre: c.nombre || '',
      numero_documento: c.numero_documento || '',
      razon_social: c.razon_social || '',
      telefono: c.telefono || '',
      observacion: c.observacion || '',
    });
  };

  // Al editar a mano, deja de ser "el contacto guardado tal cual".
  const cambiarCampoReceptor = (campo, valor) => {
    setReceptor((prev) => ({ ...prev, [campo]: valor }));
    setContactoSeleccionado('');
  };

  // =========================================================================
  // Seleccionar producto -> consultar stock disponible (R1: solo cantidad)
  // =========================================================================

  const obtenerPrecioPorTipo = (producto, tipo) => {
    switch (tipo) {
      case TIPO_PRECIO.VENDEDOR: return producto.precio_vendedor || producto.precio_venta_base || '';
      case TIPO_PRECIO.CATALOGO: return producto.precio_catalogo || producto.precio_venta_base || '';
      case TIPO_PRECIO.MAYORISTA: return producto.precio_mayorista || producto.precio_venta_base || '';
      default: return producto.precio_venta_base || '';
    }
  };

  const seleccionarProducto = async (producto) => {
    setProductoTemp(producto);
    setTipoPrecio(TIPO_PRECIO.VENDEDOR);
    setPrecioTemp(obtenerPrecioPorTipo(producto, TIPO_PRECIO.VENDEDOR));
    setCantidadTemp(1);
    try {
      const { data } = await api.get('/inventario/unidades', {
        params: { product_id: producto.id, estado: ESTADO_UNIDAD.DISPONIBLE },
      });
      const lista = Array.isArray(data) ? data : (data.datos || []);
      setStockDisponible(lista.length);
    } catch {
      setStockDisponible(0);
    }
    // Cargar promociones asociadas al producto
    try {
      const { data: promosProd } = await api.get(`/promociones/por-producto/${producto.id}`);
      setPromocionesProducto(Array.isArray(promosProd) ? promosProd : []);
    } catch {
      setPromocionesProducto([]);
    }
  };

  // =========================================================================
  // Cargar combo completo como items de la venta
  // =========================================================================

  const cargarCombo = async (combo) => {
    setCargandoCombos(true);
    try {
      const nuevosItems = [];
      for (const ic of combo.items_combo) {
        const prod = ic.tbl_productos;
        const esRegalo = ic.es_regalo || false;
        const precioCat = parseFloat(prod.precio_catalogo || prod.precio_venta_base);
        const precioMinimo = parseFloat(prod.precio_venta_base);

        // Regalos entran con precio 0; productos normales con descuento del combo
        let precioFinal = esRegalo ? 0 : precioCat;
        if (!esRegalo && ic.tipo_descuento && ic.valor_descuento) {
          const desc = parseFloat(ic.valor_descuento);
          if (ic.tipo_descuento === TIPO_DESCUENTO_COMBO.PORCENTAJE) {
            precioFinal = precioCat * (1 - desc / 100);
          } else {
            precioFinal = precioCat - desc;
          }
          // Validar que no baje del precio mínimo (piso)
          if (precioFinal < precioMinimo) {
            toast.error(`${prod.nombre}: descuento del combo haría que el precio baje del precio mínimo (${formatearMoneda(precioMinimo)}). Se usa precio catálogo sin descuento.`);
            precioFinal = precioCat;
          }
        }

        // Verificar si el producto ya existe en los items
        const idxExistente = items.findIndex((i) => i.product_id === prod.id && i.es_regalo === esRegalo);
        if (idxExistente >= 0) {
          // Si ya existe con el mismo estado de regalo, solo actualizar cantidad
          const item = items[idxExistente];
          const nuevaCantidad = item.cantidad + (ic.cantidad || 1);
          items[idxExistente] = {
            ...item,
            cantidad: nuevaCantidad,
            subtotal: nuevaCantidad * item.precio_unitario_vendido,
          };
        } else {
          // Obtener stock disponible
          let stock = 0;
          try {
            const { data: unidades } = await api.get('/inventario/unidades', {
              params: { product_id: prod.id, estado: ESTADO_UNIDAD.DISPONIBLE },
            });
            stock = Array.isArray(unidades) ? unidades.length : (unidades.datos || []).length;
          } catch { /* ignore */ }

          nuevosItems.push({
            product_id: prod.id,
            nombre: prod.nombre,
            cantidad: ic.cantidad || 1,
            precio_unitario_vendido: Math.round(precioFinal * 100) / 100,
            subtotal: (ic.cantidad || 1) * Math.round(precioFinal * 100) / 100,
            es_regalo: esRegalo,
            tipo_precio: TIPO_PRECIO.CATALOGO,
            stock_disponible: stock,
            promocion_id: null,
            promocion_nombre: null,
            promocion_tipo: null,
            promocion_valor: null,
          });
        }
      }

      setItems([...items, ...nuevosItems]);
      toast.success(`Combo "${combo.nombre}" cargado (${combo.items_combo.length} productos)`);
    } catch {
      toast.error('Error al cargar el combo');
    } finally {
      setCargandoCombos(false);
    }
  };

  // =========================================================================
  // Agregar item a la venta (R1: sin seleccion de unidades, R3: con es_regalo)
  // =========================================================================

  const agregarItem = () => {
    if (!productoTemp) return toast.error('Selecciona un producto');
    const precio = parseFloat(precioTemp);
    if (!precio || precio <= 0) return toast.error('Ingresa un precio valido');
    if (cantidadTemp < 1) return toast.error('La cantidad debe ser mayor a 0');

    // Validar que el precio no sea menor al precio mínimo (precio_venta_base)
    const precioMinimo = parseFloat(productoTemp.precio_venta_base);
    if (precio < precioMinimo) {
      return toast.error(`El precio no puede ser menor al precio mínimo (${formatearMoneda(precioMinimo)})`);
    }

    // Determinar promoción de producto seleccionada
    const promoId = promoItemTemp ? parseInt(promoItemTemp) : null;
    const promoObj = promoId ? promocionesProducto.find((p) => p.id === promoId) : null;

    const idxExistente = items.findIndex((i) => i.product_id === productoTemp.id);
    if (idxExistente >= 0) {
      const actualizado = [...items];
      const item = actualizado[idxExistente];
      const nuevaCantidad = item.cantidad + cantidadTemp;
      actualizado[idxExistente] = {
        ...item,
        cantidad: nuevaCantidad,
        precio_unitario_vendido: precio,
        subtotal: nuevaCantidad * precio,
        tipo_precio: tipoPrecio,
        stock_disponible: stockDisponible,
        promocion_id: promoId || item.promocion_id,
        promocion_nombre: promoObj?.nombre || item.promocion_nombre,
        promocion_tipo: promoObj?.tipo || item.promocion_tipo,
        promocion_valor: promoObj?.valor || item.promocion_valor,
      };
      setItems(actualizado);
      toast.success(`Cantidad actualizada: ${item.nombre} x${nuevaCantidad}`);
    } else {
      setItems([
        ...items,
        {
          product_id: productoTemp.id,
          nombre: productoTemp.nombre,
          cantidad: cantidadTemp,
          precio_unitario_vendido: precio,
          subtotal: cantidadTemp * precio,
          es_regalo: false,
          tipo_precio: tipoPrecio,
          stock_disponible: stockDisponible,
          promocion_id: promoId,
          promocion_nombre: promoObj?.nombre || null,
          promocion_tipo: promoObj?.tipo || null,
          promocion_valor: promoObj?.valor || null,
        },
      ]);
    }

    setProductoTemp(null);
    setStockDisponible(0);
    setCantidadTemp(1);
    setPrecioTemp('');
    setPromocionesProducto([]);
    setPromoItemTemp('');
  };

  const removerItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  // R3: Toggle regalo por item
  const toggleRegalo = (idx) => {
    setItems(items.map((item, i) =>
      i === idx ? { ...item, es_regalo: !item.es_regalo } : item
    ));
  };

  // =========================================================================
  // Calculos de totales (R3: excluir regalos del subtotal)
  // =========================================================================

  const subtotalVenta = items.reduce((sum, i) => i.es_regalo ? sum : sum + i.subtotal, 0);

  // Descuento por promoción general (sobre toda la venta)
  const descuentoPromocionGeneral = (() => {
    if (!promocionId) return 0;
    const promo = promociones.find((p) => p.id === parseInt(promocionId));
    if (!promo) return 0;
    if (promo.tipo === 'descuento_porcentaje') {
      return subtotalVenta * (parseFloat(promo.valor) / 100);
    }
    return parseFloat(promo.valor);
  })();

  // Descuento por promociones de producto (por item)
  const descuentoPromocionProducto = items.reduce((sum, item) => {
    if (item.es_regalo || !item.promocion_id) return sum;
    const subtotalItem = item.cantidad * item.precio_unitario_vendido;
    if (item.promocion_tipo === 'descuento_porcentaje') {
      return sum + subtotalItem * (parseFloat(item.promocion_valor) / 100);
    }
    return sum + Math.min(parseFloat(item.promocion_valor), subtotalItem);
  }, 0);

  const descuentoPromocion = descuentoPromocionGeneral + descuentoPromocionProducto;

  const totalVenta = Math.max(0, subtotalVenta - descuentoPromocion - descuentoPuntos);

  // =========================================================================
  // Crear venta (R1: sin unidades_ids, R2: ubigeo para envío agencia, R3: es_regalo)
  // =========================================================================

  const crearVenta = async () => {
    if (!clienteSeleccionado) return toast.error('Selecciona un cliente');
    if (items.length === 0) return toast.error('Agrega al menos un producto');
    if (descuentoPuntos > clientePuntos) return toast.error('No tienes suficientes puntos');

    if (tipoEntrega === TIPO_ENTREGA.ENVIO_POR_AGENCIA) {
      if (!transportistaId) return toast.error('Selecciona la agencia transportista');
      if (!departamentoId || !provinciaId || !distritoId) return toast.error('Selecciona departamento, provincia y distrito');
    }

    // Quien recibe es opcional, pero si el vendedor declaró algo debe quedar
    // identificable: el rótulo y la guía de remisión necesitan un nombre.
    const hayReceptor = receptorTieneDatos(receptor);
    if (hayReceptor && !receptor.nombre.trim() && !receptor.razon_social.trim()) {
      return toast.error('Indica el nombre o la razón social de quien recibe');
    }
    if (hayReceptor && receptor.numero_documento.trim()) {
      const docDigits = DNI_RUC_INPUT.toDigits(receptor.numero_documento);
      if (!DNI_RUC_INPUT.esValido(docDigits)) {
        return toast.error(`Documento de quien recibe: ${DNI_RUC_INPUT.MSG_INVALIDO}`);
      }
    }
    if (hayReceptor && receptor.telefono.trim()) {
      const telDigits = TELEFONO_INPUT.toDigits(receptor.telefono);
      if (telDigits.length !== TELEFONO_INPUT.MAX_DIGITS) {
        return toast.error(`Teléfono de quien recibe: ${TELEFONO_INPUT.MSG_INVALIDO}`);
      }
    }

    const adelanto = conAdelanto ? parseFloat(montoAdelanto) : 0;
    if (conAdelanto) {
      if (!adelanto || adelanto <= 0) return toast.error('El monto del adelanto debe ser mayor a 0');
      if (!archivoBoucherAdelanto) return toast.error('El voucher es obligatorio para el adelanto');
      if (adelanto > totalVenta) return toast.error('El adelanto no puede superar el total de la venta');
    }

    setCreandoVenta(true);
    try {
      const formData = new FormData();
      formData.append('customer_id', clienteSeleccionado.id);
      formData.append('tipo_entrega', tipoEntrega);
      if (tipoEntrega === TIPO_ENTREGA.ENVIO_POR_AGENCIA) {
        formData.append('transportista_id', transportistaId);
        formData.append('departamento_id', departamentoId);
        formData.append('provincia_id', provinciaId);
        formData.append('distrito_id', distritoId);
      }
      formData.append('tipo_destino', tipoDestino);
      formData.append('items', JSON.stringify(items.map((i) => ({
        product_id: i.product_id,
        cantidad: i.cantidad,
        precio_unitario_lista: parseFloat(i.precio_unitario_vendido) || 0,
        descuento_manual_item: 0,
        es_regalo: i.es_regalo,
        tipo_precio: i.tipo_precio,
        promocion_id: i.promocion_id || null,
      }))));
      if (promocionId) formData.append('promocion_id', parseInt(promocionId));
      if (descuentoPuntos > 0) formData.append('descuento_puntos', descuentoPuntos);

      if (hayReceptor) {
        formData.append('receptor', JSON.stringify({
          nombre: receptor.nombre.trim(),
          numero_documento: DNI_RUC_INPUT.toDigits(receptor.numero_documento),
          razon_social: receptor.razon_social.trim(),
          telefono: TELEFONO_INPUT.toDigits(receptor.telefono),
          observacion: receptor.observacion.trim(),
        }));
        formData.append('guardar_receptor', guardarReceptor ? 'true' : 'false');
      }

      if (conAdelanto && adelanto > 0) {
        formData.append('monto_adelanto', adelanto);
        formData.append('metodo_pago_adelanto', metodoPagoAdelanto);
        formData.append('boucher_adelanto', archivoBoucherAdelanto);
      }

      await api.post('/ventas', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(conAdelanto ? 'Venta creada con adelanto registrado' : 'Venta creada exitosamente');
      setModalNuevaVenta(false);
      setConAdelanto(false);
      setMontoAdelanto('');
      setMetodoPagoAdelanto(METODOS_PAGO.EFECTIVO);
      setArchivoBoucherAdelanto(null);
      listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear la venta');
    } finally {
      setCreandoVenta(false);
    }
  };

  // =========================================================================
  // Registrar pago
  // =========================================================================

  const abrirModalPago = async (fila) => {
    setArchivoBoucher(null);
    setFormPago({
      monto: parseFloat(fila.saldo_pendiente || 0).toFixed(2),
      metodo_pago: METODOS_PAGO.EFECTIVO,
    });
    setVentaPago(fila);
    setModalPago(true);
    try {
      const { data } = await api.get(`/ventas/${fila.id}`);
      setVentaPago(data);
      setFormPago((prev) => ({
        ...prev,
        monto: parseFloat(data.saldo_disponible ?? data.saldo_pendiente ?? 0).toFixed(2),
      }));
    } catch {
      // Si falla el refresco, se mantienen los datos de la fila; el backend
      // igualmente bloquea el registro si existe un pago de cliente pendiente.
    }
  };

  // El saldo_pendiente de la venta solo descuenta pagos APROBADOS; los pagos
  // en verificación (voucher aún sin aprobar ni rechazar) no se reflejan ahí
  // pero SÍ cuentan para el backend. El máximo registrable es el saldo
  // disponible (total − aprobados − en verificación).
  const montoEnVerificacion = (ventaPago?.pagos || [])
    .filter((p) => (p.adjuntos || []).some((a) => !a.aprobado && !a.rechazado))
    .reduce((s, p) => s + parseFloat(p.monto), 0);
  const saldoDisponiblePago = ventaPago
    ? parseFloat(ventaPago.saldo_disponible ?? ventaPago.saldo_pendiente ?? 0)
    : 0;

  const registrarPago = async (e) => {
    e.preventDefault();
    if (!ventaPago) return;
    const montoNum = parseFloat(formPago.monto);
    if (!montoNum || montoNum <= 0) return toast.error('Ingresa un monto válido');
    if (montoNum > saldoDisponiblePago + 0.004) {
      return toast.error(`El monto no puede superar el saldo disponible por registrar (${formatearMoneda(saldoDisponiblePago)})`);
    }
    if (!formPago.metodo_pago) return toast.error('El método de pago es obligatorio');
    if (!archivoBoucher) return toast.error('El boucher es obligatorio');

    setRegistrandoPago(true);
    try {
      const formData = new FormData();
      formData.append('monto', formPago.monto);
      formData.append('metodo_pago', formPago.metodo_pago);
      formData.append('boucher', archivoBoucher);
      await api.post(`/ventas/${ventaPago.id}/pago`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Pago registrado exitosamente');
      setModalPago(false);
      listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar el pago');
    } finally {
      setRegistrandoPago(false);
    }
  };

  // =========================================================================
  // Ver detalle
  // =========================================================================

  const verDetalle = async (id) => {
    setCargandoDetalle(true);
    setModalDetalle(true);
    setModoAjuste(false);
    setHistorialAjustes([]);
    try {
      const { data } = await api.get(`/ventas/${id}`);
      setVentaDetalle(data);
      // Cargar historial de ajustes si tiene
      if (data.tiene_ajuste) {
        api.get(`/ventas/${id}/ajustes`).then(r => setHistorialAjustes(r.data || [])).catch(() => {});
      }
    } catch {
      toast.error('Error al cargar el detalle de la venta');
      setModalDetalle(false);
    } finally {
      setCargandoDetalle(false);
    }
  };

  // =========================================================================
  // Cancelar venta
  // =========================================================================

  const cancelarVenta = async () => {
    if (!confirmCancelar) return;
    try {
      await api.post(`/ventas/${confirmCancelar}/cancelar`, {
        motivo: motivoCancelacion || 'Cancelada por vendedor',
      });
      toast.success('Venta cancelada correctamente');
      setConfirmCancelar(null);
      setMotivoCancelacion('');
      listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cancelar la venta');
    }
  };

  // =========================================================================
  // Helpers para condiciones de estado
  // =========================================================================

  // CERRADA se incluye a propósito: en envío por agencia el chofer cierra la
  // venta al dejar el paquete (estado_venta = cerrada) aunque quede saldo por
  // cobrar (contra-entrega), y el vendedor debe poder registrar ese pago. El
  // guard saldo_pendiente > 0 acota el permiso: las CERRADAS por retiro en
  // tienda siempre tienen saldo 0 (exigen pago_completo antes de cerrar).
  const ventaPermitePago = (fila) =>
    [ESTADO_VENTA.ACTIVA, ESTADO_VENTA.PENDIENTE_APROBACION, ESTADO_VENTA.CERRADA].includes(fila.estado_venta) &&
    parseFloat(fila.saldo_pendiente) > 0;

  const ventaPermiteAjuste = (fila) =>
    fila && fila.estado_venta !== ESTADO_VENTA.CANCELADA &&
    [ESTADO_TRACKING.PEDIDO_REGISTRADO, ESTADO_TRACKING.ALMACEN].includes(fila.estado_tracking);

  const iniciarAjuste = () => {
    if (!ventaDetalle) return;
    setItemsAjuste(
      ventaDetalle.items_venta.map((it) => ({
        item_id: it.id,
        nombre: it.tbl_productos?.nombre || `Producto #${it.product_id}`,
        precio_nuevo: parseFloat(it.precio_unitario_vendido),
        cantidad_nueva: it.cantidad,
        precio_minimo: parseFloat(it.tbl_productos?.precio_venta_base) || 0,
        es_regalo: it.es_regalo,
      }))
    );
    setMotivoAjuste('');
    setModoAjuste(true);
    // Cargar historial
    api.get(`/ventas/${ventaDetalle.id}/ajustes`).then(r => setHistorialAjustes(r.data || [])).catch(() => {});
  };

  const guardarAjuste = async () => {
    if (!motivoAjuste.trim()) return toast.error('Ingresa el motivo del ajuste');
    const itemBajo = itemsAjuste.find(i => !i.es_regalo && i.precio_nuevo < i.precio_minimo);
    if (itemBajo) return toast.error(`"${itemBajo.nombre}" tiene precio menor al mínimo (${formatearMoneda(itemBajo.precio_minimo)})`);

    setGuardandoAjuste(true);
    try {
      await api.put(`/ventas/${ventaDetalle.id}/ajustar-precios`, {
        items: itemsAjuste.map(i => ({ item_id: i.item_id, precio_nuevo: i.precio_nuevo, cantidad_nueva: i.cantidad_nueva })),
        motivo: motivoAjuste.trim(),
      });
      toast.success('Precios ajustados correctamente');
      setModoAjuste(false);
      // Refrescar venta
      const { data } = await api.get(`/ventas/${ventaDetalle.id}`);
      setVentaDetalle(data);
      listar();
      // Refrescar historial
      const ajustesRes = await api.get(`/ventas/${ventaDetalle.id}/ajustes`);
      setHistorialAjustes(ajustesRes.data || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al ajustar precios');
    } finally {
      setGuardandoAjuste(false);
    }
  };

  const ventaPermiteCancelacion = (fila) =>
    [ESTADO_VENTA.ACTIVA, ESTADO_VENTA.PENDIENTE_APROBACION].includes(fila.estado_venta) &&
    fila.estado_tracking === ESTADO_TRACKING.PEDIDO_REGISTRADO;

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div>
      {/* ENCABEZADO */}
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <div>
          <h1 className="text-2xl font-bold text-steel-100 font-display tracking-wider">Mis Ventas</h1>
          <p className="text-sm text-steel-400 mt-1">
            {datos.length} venta{datos.length !== 1 ? 's' : ''} registrada{datos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={abrirNuevaVenta} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-4 h-4" /> Nueva Venta
        </button>
      </div>

      {/* TABLA DE VENTAS */}
      <div className="card">
        <TablaGenerica
          columnas={columnas}
          datos={datosPaginados}
          cargando={cargando}
          vacio="No tienes ventas registradas."
          acciones={(fila) => (
            <div className="flex gap-1">
              <button
                onClick={() => verDetalle(fila.id)}
                className="text-xs bg-steel-800 text-steel-200 px-2 py-1 rounded hover:bg-steel-700 flex items-center gap-1"
                title="Ver detalle"
              >
                <HiOutlineEye className="w-3.5 h-3.5" />
              </button>

              {ventaPermitePago(fila) && (
                <button
                  onClick={() => abrirModalPago(fila)}
                  className="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded hover:bg-emerald-200 flex items-center gap-1"
                  title="Registrar pago"
                >
                  <HiOutlineCash className="w-3.5 h-3.5" />
                </button>
              )}

              {ventaPermiteCancelacion(fila) && (
                <button
                  onClick={() => { setConfirmCancelar(fila.id); setMotivoCancelacion(''); }}
                  className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200 flex items-center gap-1"
                  title="Cancelar venta"
                >
                  <HiOutlineX className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        />
        <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onChange={irAPagina} />
      </div>

      {/* ================================================================= */}
      {/* MODAL: NUEVA VENTA                                                */}
      {/* ================================================================= */}
      <Modal abierto={modalNuevaVenta} cerrar={() => setModalNuevaVenta(false)} titulo="Nueva Venta" ancho="max-w-3xl">
        <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">

          {/* ---- CLIENTE ---- */}
          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">
              Cliente <span className="text-red-600">*</span>
            </label>
            <AutocompleteBusqueda
              buscarFn={buscarClientes}
              placeholder="Buscar por nombre, DNI o telefono..."
              valorTexto={clienteSeleccionado?.nombre || ''}
              onSeleccionar={seleccionarCliente}
              onLimpiar={() => { setClienteSeleccionado(null); setClientePuntos(0); }}
              renderItem={(c) => (
                <div>
                  <span className="font-medium">{c.nombre}</span>
                  {c.dni && <span className="text-xs text-steel-500 ml-2">DNI: {c.dni}</span>}
                  {c.telefono_principal && <span className="text-xs text-steel-500 ml-2">Tel: {TELEFONO_INPUT.format(c.telefono_principal)}</span>}
                </div>
              )}
            />
            <button type="button" onClick={() => setModalCrearCliente(true)} className="text-xs text-primary-600 hover:text-primary-800 mt-1">
              + Crear nuevo cliente
            </button>
            {clienteSeleccionado && (
              <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-600">
                      {clienteSeleccionado.nombre}
                      {clienteSeleccionado.dni && <span className="text-emerald-600 ml-2">DNI: {clienteSeleccionado.dni}</span>}
                    </p>
                    {clienteSeleccionado.telefono_principal && (
                      <p className="text-xs text-emerald-600">Tel: {TELEFONO_INPUT.format(clienteSeleccionado.telefono_principal)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                    <HiOutlineStar className="w-3.5 h-3.5" />
                    {clientePuntos} puntos
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ---- ENTREGA Y DESTINO ---- */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1">Tipo de Entrega</label>
              <select className="input-field" value={tipoEntrega} onChange={(e) => { setTipoEntrega(e.target.value); setTransportistaId(''); setDepartamentoId(''); setProvinciaId(''); setDistritoId(''); setProvincias([]); setDistritos([]); }}>
                <option value={TIPO_ENTREGA.ENVIO_POR_AGENCIA}>Envio por Agencia</option>
                <option value={TIPO_ENTREGA.RETIRO_EN_TIENDA}>Retiro en Tienda</option>
              </select>
            </div>
            {tipoEntrega !== TIPO_ENTREGA.RETIRO_EN_TIENDA && (
              <div>
                <label className="block text-sm font-medium text-steel-200 mb-1">Tipo Destino</label>
                <select className="input-field" value={tipoDestino} onChange={(e) => setTipoDestino(e.target.value)}>
                  <option value={TIPO_DESTINO.LIMA}>Lima</option>
                  <option value={TIPO_DESTINO.PROVINCIA}>Provincia</option>
                </select>
              </div>
            )}
          </div>

          {/* ---- AGENCIA TRANSPORTISTA (solo envío por agencia) ---- */}
          {tipoEntrega === TIPO_ENTREGA.ENVIO_POR_AGENCIA && (
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1">Agencia Transportista *</label>
              <select className="input-field" value={transportistaId} onChange={(e) => setTransportistaId(e.target.value)} required>
                <option value="">Seleccionar agencia...</option>
                {transportistas.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* ---- UBIGEO: Departamento → Provincia → Distrito (solo envío por agencia) ---- */}
          {tipoEntrega === TIPO_ENTREGA.ENVIO_POR_AGENCIA && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-steel-200 mb-1">Departamento</label>
                <select className="input-field" value={departamentoId} onChange={(e) => handleDepartamentoChange(e.target.value)} required>
                  <option value="">Seleccionar...</option>
                  {departamentos.map((d) => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-steel-200 mb-1">Provincia</label>
                <select className="input-field" value={provinciaId} onChange={(e) => handleProvinciaChange(e.target.value)} required disabled={!departamentoId}>
                  <option value="">{departamentoId ? 'Seleccionar...' : 'Primero elija depto.'}</option>
                  {provincias.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-steel-200 mb-1">Distrito</label>
                <select className="input-field" value={distritoId} onChange={(e) => setDistritoId(e.target.value)} required disabled={!provinciaId}>
                  <option value="">{provinciaId ? 'Seleccionar...' : 'Primero elija prov.'}</option>
                  {distritos.map((d) => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ---- MENSAJE RETIRO EN TIENDA ---- */}
          {tipoEntrega === TIPO_ENTREGA.RETIRO_EN_TIENDA && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-600">
              <p className="font-medium">El cliente retirará el producto en tienda</p>
              <p className="text-xs text-blue-600 mt-1">No es necesario especificar dirección de envío</p>
            </div>
          )}

          {/* ---- QUIEN RECIBE (opcional, va al rótulo y a la guía de remisión) ---- */}
          <div className="border-t border-steel-700 pt-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-steel-200 flex items-center gap-1">
                <HiOutlineUser className="w-4 h-4" />
                Quién recibe
              </label>
              <span className="text-xs text-steel-500">Opcional</span>
            </div>
            <p className="text-xs text-steel-500 mb-3">
              Si no lo completas, el rótulo y la guía de remisión salen a nombre del cliente.
            </p>

            {!clienteSeleccionado ? (
              <p className="text-xs text-steel-500 italic">Selecciona primero un cliente.</p>
            ) : (
              <div className="space-y-3">
                {contactosCliente.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-steel-300 mb-1">Contactos guardados de este cliente</label>
                    <select
                      className="input-field"
                      value={contactoSeleccionado}
                      onChange={(e) => elegirContactoReceptor(e.target.value)}
                    >
                      <option value="">Ingresar datos nuevos...</option>
                      {contactosCliente.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}{c.numero_documento ? ` — ${c.numero_documento}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-steel-300 mb-1">Nombre de quien recibe</label>
                    <input
                      type="text"
                      className="input-field"
                      value={receptor.nombre}
                      onChange={(e) => cambiarCampoReceptor('nombre', e.target.value)}
                      placeholder="Nombre completo"
                      maxLength={200}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-steel-300 mb-1">DNI o RUC</label>
                    <input
                      type="text"
                      className="input-field"
                      inputMode={DNI_RUC_INPUT.INPUT_MODE}
                      pattern={DNI_RUC_INPUT.PATTERN}
                      maxLength={DNI_RUC_INPUT.MAX_LENGTH}
                      value={receptor.numero_documento}
                      onChange={(e) => cambiarCampoReceptor('numero_documento', DNI_RUC_INPUT.toDigits(e.target.value))}
                      placeholder={DNI_RUC_INPUT.PLACEHOLDER}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-steel-300 mb-1">Razón social</label>
                    <input
                      type="text"
                      className="input-field"
                      value={receptor.razon_social}
                      onChange={(e) => cambiarCampoReceptor('razon_social', e.target.value)}
                      placeholder="Si recibe una empresa"
                      maxLength={300}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-steel-300 mb-1">Teléfono</label>
                    <input
                      type="text"
                      className="input-field"
                      inputMode={TELEFONO_INPUT.INPUT_MODE}
                      pattern={TELEFONO_INPUT.PATTERN}
                      maxLength={TELEFONO_INPUT.MAX_LENGTH}
                      value={TELEFONO_INPUT.format(receptor.telefono)}
                      onChange={(e) => cambiarCampoReceptor('telefono', TELEFONO_INPUT.toDigits(e.target.value))}
                      placeholder={TELEFONO_INPUT.PLACEHOLDER}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-steel-300 mb-1">Observación</label>
                  <textarea
                    className="input-field"
                    rows={2}
                    value={receptor.observacion}
                    onChange={(e) => cambiarCampoReceptor('observacion', e.target.value)}
                    placeholder="Indicaciones para la entrega"
                    maxLength={500}
                  />
                </div>

                {receptorTieneDatos(receptor) && (
                  <label className="flex items-center gap-2 text-xs text-steel-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={guardarReceptor}
                      onChange={(e) => setGuardarReceptor(e.target.checked)}
                      className="rounded border-steel-600"
                    />
                    Guardar en los contactos del cliente para próximas ventas
                  </label>
                )}
              </div>
            )}
          </div>

          {/* ---- CARGAR COMBO ---- */}
          {combosDisponibles.length > 0 && (
            <div className="border-t border-steel-700 pt-4">
              <label className="block text-sm font-medium text-steel-200 mb-2 flex items-center gap-1">
                <HiOutlineCollection className="w-4 h-4" />
                Cargar Combo
              </label>
              <div className="flex flex-wrap gap-2">
                {combosDisponibles.map((combo) => (
                  <button
                    key={combo.id}
                    type="button"
                    onClick={() => cargarCombo(combo)}
                    disabled={cargandoCombos}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-steel-800 border border-steel-700 rounded-lg text-sm text-steel-200 hover:bg-steel-700 hover:border-primary-500/50 hover:text-primary-400 transition-all group"
                  >
                    <HiOutlineCollection className="w-4 h-4 text-primary-500 group-hover:scale-110 transition-transform" />
                    <div className="text-left">
                      <span className="font-medium block">{combo.nombre}</span>
                      <span className="text-[10px] text-steel-500">{combo.items_combo.length} producto{combo.items_combo.length !== 1 ? 's' : ''}</span>
                    </div>
                  </button>
                ))}
              </div>
              {cargandoCombos && (
                <div className="flex items-center gap-2 mt-2 text-xs text-steel-400">
                  <div className="w-3 h-3 border-2 border-steel-600 border-t-primary-500 rounded-full animate-spin" />
                  Cargando productos del combo...
                </div>
              )}
            </div>
          )}

          {/* ---- AGREGAR PRODUCTOS ---- */}
          <div className="border-t border-steel-700 pt-4">
            <label className="block text-sm font-medium text-steel-200 mb-2 flex items-center gap-1">
              <HiOutlineShoppingCart className="w-4 h-4" />
              Agregar Productos
            </label>

            <div className="space-y-3 p-3 bg-steel-900/50 rounded-lg">
              {/* Buscador de producto */}
              <AutocompleteBusqueda
                buscarFn={buscarProductos}
                placeholder="Buscar producto por nombre..."
                valorTexto={productoTemp?.nombre || ''}
                onSeleccionar={seleccionarProducto}
                onLimpiar={() => { setProductoTemp(null); setStockDisponible(0); setPrecioTemp(''); setPromocionesProducto([]); setPromoItemTemp(''); }}
                renderItem={(p) => (
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{p.nombre}</span>
                      {p.tbl_categorias_producto?.nombre && (
                        <span className="text-xs text-steel-500 ml-2">{p.tbl_categorias_producto.nombre}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-medium text-blue-600">
                        {formatearMoneda(p.precio_vendedor || p.precio_venta_base)}
                      </span>
                    </div>
                  </div>
                )}
              />

              {/* Producto seleccionado: tipo precio, cantidad y precio */}
              {productoTemp && (
                <div className="space-y-3">
                  {/* R1: Indicador de stock disponible */}
                  <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                    stockDisponible > 0
                      ? 'bg-emerald-100 text-emerald-600 border border-emerald-300'
                      : 'bg-amber-100 text-amber-600 border border-amber-300'
                  }`}>
                    <span>Stock disponible:</span>
                    <span className="font-bold text-sm">{stockDisponible}</span>
                    <span>unidad{stockDisponible !== 1 ? 'es' : ''}</span>
                    {stockDisponible === 0 && (
                      <span className="ml-auto text-[10px]">Almacén asignará al despachar</span>
                    )}
                  </div>

                  {/* Selector de tipo de precio */}
                  <div>
                    <label className="block text-xs font-medium text-steel-300 mb-1">Tipo de precio</label>
                    <div className="flex gap-2">
                      {[
                        { key: TIPO_PRECIO.VENDEDOR, label: 'Vendedor', activeClass: 'bg-blue-100 text-blue-700 border-blue-300', precio: productoTemp.precio_vendedor },
                        { key: TIPO_PRECIO.CATALOGO, label: 'Catálogo', activeClass: 'bg-emerald-100 text-emerald-600 border-emerald-300', precio: productoTemp.precio_catalogo },
                        { key: TIPO_PRECIO.MAYORISTA, label: 'Mayorista', activeClass: 'bg-amber-100 text-amber-600 border-amber-300', precio: productoTemp.precio_mayorista },
                      ]
                        .filter((tp) => tp.key !== TIPO_PRECIO.MAYORISTA || puedeUsarMayorista)
                        .map((tp) => (
                        <button
                          key={tp.key}
                          type="button"
                          onClick={() => {
                            setTipoPrecio(tp.key);
                            setPrecioTemp(obtenerPrecioPorTipo(productoTemp, tp.key));
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            tipoPrecio === tp.key
                              ? tp.activeClass
                              : 'bg-steel-800 text-steel-400 border-steel-700 hover:bg-steel-700'
                          }`}
                        >
                          {tp.label}: {tp.precio ? formatearMoneda(tp.precio) : formatearMoneda(productoTemp.precio_venta_base)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-28">
                      <label className="block text-xs font-medium text-steel-300 mb-1">Cantidad</label>
                      <input
                        type="number"
                        min="1"
                        className="input-field text-sm"
                        value={cantidadTemp}
                        onChange={(e) => setCantidadTemp(e.target.value)}
                        onBlur={(e) => {
                          const n = parseInt(e.target.value);
                          setCantidadTemp(Number.isFinite(n) && n > 0 ? n : 1);
                        }}
                      />
                    </div>
                    <div className="w-36">
                      <label className="block text-xs font-medium text-steel-300 mb-1">Precio unitario (S/)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="input-field text-sm"
                        value={precioTemp}
                        onChange={(e) => setPrecioTemp(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <button type="button" onClick={agregarItem} className="btn-primary text-sm h-10 px-4">
                        + Agregar
                      </button>
                    </div>
                  </div>

                  {/* Promociones del producto */}
                  {promocionesProducto.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <label className="block text-xs font-semibold text-amber-700 mb-1.5 flex items-center gap-1">
                        <HiOutlineTag className="w-3.5 h-3.5" />
                        Promociones disponibles para este producto
                      </label>
                      <select
                        className="input-field text-sm"
                        value={promoItemTemp}
                        onChange={(e) => setPromoItemTemp(e.target.value)}
                      >
                        <option value="">Sin promoción de producto</option>
                        {promocionesProducto.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} ({p.tipo === 'descuento_porcentaje' ? `${p.valor}%` : formatearMoneda(p.valor)})
                          </option>
                        ))}
                      </select>
                      {promoItemTemp && (() => {
                        const p = promocionesProducto.find((x) => x.id === parseInt(promoItemTemp));
                        if (!p) return null;
                        const subtItem = cantidadTemp * (parseFloat(precioTemp) || 0);
                        const descItem = p.tipo === 'descuento_porcentaje'
                          ? subtItem * (parseFloat(p.valor) / 100)
                          : Math.min(parseFloat(p.valor), subtItem);
                        return (
                          <p className="text-xs text-amber-600 mt-1.5">
                            Descuento estimado: -{formatearMoneda(descItem)} sobre {formatearMoneda(subtItem)}
                          </p>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ---- TABLA DE ITEMS AGREGADOS (R3: columna regalo) ---- */}
          {items.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-2">
                Items de la venta ({items.length})
              </label>
              <div className="overflow-x-auto border border-steel-700 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-steel-900/50">
                    <tr>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-steel-300">Producto</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold text-steel-300">Cant</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-steel-300">P. Unit.</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-steel-300">Subtotal</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold text-steel-300">Regalo</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} className={`border-t border-steel-700/50 hover:bg-steel-900/50 ${item.es_regalo ? 'bg-emerald-50' : ''}`}>
                        <td className="py-2 px-3">
                          <span className="font-medium">{item.nombre}</span>
                          {item.es_regalo && (
                            <span className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[10px] font-bold">
                              <HiOutlineGift className="w-3 h-3" /> REGALO
                            </span>
                          )}
                          {item.promocion_id && (
                            <span className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold">
                              <HiOutlineTag className="w-3 h-3" /> {item.promocion_nombre} ({item.promocion_tipo === 'descuento_porcentaje' ? `${item.promocion_valor}%` : formatearMoneda(item.promocion_valor)})
                            </span>
                          )}
                          {item.cantidad > item.stock_disponible && (
                            <span className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-red-100 text-red-600 border border-red-300 rounded text-[10px] font-bold">
                              <HiOutlineExclamation className="w-3 h-3" /> Stock: {item.stock_disponible}
                            </span>
                          )}
                        </td>
                        <td className="text-center py-2 px-3">{item.cantidad}</td>
                        <td className="text-right py-2 px-3">{formatearMoneda(item.precio_unitario_vendido)}</td>
                        <td className="text-right py-2 px-3 font-semibold">
                          {item.es_regalo ? (
                            <span className="line-through text-steel-500">{formatearMoneda(item.subtotal)}</span>
                          ) : (
                            formatearMoneda(item.subtotal)
                          )}
                        </td>
                        <td className="text-center py-2 px-3">
                          <button
                            type="button"
                            onClick={() => toggleRegalo(i)}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                              item.es_regalo
                                ? 'bg-emerald-100 text-emerald-600 border border-emerald-300'
                                : 'bg-steel-800 text-steel-500 border border-steel-700 hover:bg-steel-700'
                            }`}
                          >
                            {item.es_regalo ? 'Si' : 'No'}
                          </button>
                        </td>
                        <td className="py-2 px-1">
                          <button
                            onClick={() => removerItem(i)}
                            className="text-red-600 hover:text-red-600 p-1"
                            title="Quitar"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {items.some((item) => item.cantidad > item.stock_disponible) && (
                <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-300 rounded-lg p-3">
                  <HiOutlineExclamation className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-600">Stock insuficiente</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      {items.filter((item) => item.cantidad > item.stock_disponible).map((item) => item.nombre).join(', ')}
                      {' '}— no cuentan con stock suficiente. La venta se puede registrar, pero almacen debera resolver la disponibilidad al despachar.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ---- PROMOCION Y PUNTOS ---- */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1 flex items-center gap-1">
                <HiOutlineTag className="w-4 h-4" />
                Promocion (opcional)
              </label>
              <select
                className="input-field text-sm"
                value={promocionId}
                onChange={(e) => setPromocionId(e.target.value)}
              >
                <option value="">Sin promocion</option>
                {promociones.filter((p) => !p.alcance || p.alcance === 'general').map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.tipo === 'descuento_porcentaje' ? `${p.valor}%` : formatearMoneda(p.valor)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1 flex items-center gap-1">
                <HiOutlineStar className="w-4 h-4" />
                Descuento por puntos (S/)
              </label>
              <input
                type="number"
                min="0"
                max={clientePuntos}
                step="1"
                className="input-field text-sm"
                value={descuentoPuntos}
                onChange={(e) => setDescuentoPuntos(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder={clienteSeleccionado ? `Max: ${clientePuntos}` : 'Selecciona cliente'}
                disabled={!clienteSeleccionado || clientePuntos <= 0}
              />
              {clienteSeleccionado && clientePuntos > 0 && (
                <p className="text-xs text-steel-400 mt-1">
                  Puntos disponibles: {clientePuntos}
                </p>
              )}
            </div>
          </div>

          {/* ---- RESUMEN DE TOTALES ---- */}
          {items.length > 0 && (
            <div className="bg-steel-900/50 rounded-lg p-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-steel-300">Subtotal:</span>
                <span className="font-medium">{formatearMoneda(subtotalVenta)}</span>
              </div>
              {items.some((i) => i.es_regalo) && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Items regalo ({items.filter((i) => i.es_regalo).length}):</span>
                  <span>excluidos del total</span>
                </div>
              )}
              {descuentoPromocionGeneral > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Descuento promoción general:</span>
                  <span>-{formatearMoneda(descuentoPromocionGeneral)}</span>
                </div>
              )}
              {descuentoPromocionProducto > 0 && (
                <div className="flex justify-between text-sm text-amber-600">
                  <span>Descuento promociones producto:</span>
                  <span>-{formatearMoneda(descuentoPromocionProducto)}</span>
                </div>
              )}
              {descuentoPuntos > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Descuento puntos:</span>
                  <span>-{formatearMoneda(descuentoPuntos)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-primary-700 pt-2 border-t border-steel-700">
                <span>Total:</span>
                <span>{formatearMoneda(totalVenta)}</span>
              </div>
            </div>
          )}

          {/* ---- ADELANTO OPCIONAL ---- */}
          {items.length > 0 && (
            <div className="bg-steel-900/50 rounded-lg border border-steel-700 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-steel-200 flex items-center gap-2">
                  <HiOutlineCash className="w-4 h-4 text-steel-400" />
                  Registrar adelanto
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setConAdelanto(!conAdelanto);
                    if (conAdelanto) {
                      setMontoAdelanto('');
                      setMetodoPagoAdelanto(METODOS_PAGO.EFECTIVO);
                      setArchivoBoucherAdelanto(null);
                    }
                  }}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    conAdelanto ? 'bg-primary-600' : 'bg-steel-600'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    conAdelanto ? 'translate-x-5' : ''
                  }`} />
                </button>
              </div>

              {conAdelanto && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-steel-500 block mb-1">Monto del adelanto *</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={totalVenta}
                      className="input-field text-sm"
                      placeholder="0.00"
                      value={montoAdelanto}
                      onChange={(e) => setMontoAdelanto(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-steel-500 block mb-1">Método de pago *</label>
                    <select
                      className="input-field text-sm"
                      value={metodoPagoAdelanto}
                      onChange={(e) => setMetodoPagoAdelanto(e.target.value)}
                    >
                      {Object.entries(METODOS_PAGO_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-steel-500 block mb-1">Voucher / comprobante *</label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="input-field text-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-steel-700 file:text-steel-300"
                      onChange={(e) => setArchivoBoucherAdelanto(e.target.files[0] || null)}
                    />
                  </div>
                  {montoAdelanto && parseFloat(montoAdelanto) > 0 && (
                    <div className="sm:col-span-3 flex justify-between text-sm text-steel-300 bg-steel-800/60 rounded px-3 py-2">
                      <span>Saldo pendiente tras adelanto:</span>
                      <span className="font-medium">
                        {formatearMoneda(Math.max(totalVenta - parseFloat(montoAdelanto), 0))}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ---- BOTONES ---- */}
          <div className="flex justify-end gap-3 pt-4 border-t border-steel-700">
            <button
              type="button"
              onClick={() => setModalNuevaVenta(false)}
              className="btn-secondary"
              disabled={creandoVenta}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={crearVenta}
              className="btn-primary flex items-center gap-2"
              disabled={creandoVenta || items.length === 0 || !clienteSeleccionado}
            >
              {creandoVenta ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <HiOutlineShoppingCart className="w-4 h-4" />
                  Crear Venta
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL: REGISTRAR PAGO                                             */}
      {/* ================================================================= */}
      <Modal
        abierto={modalPago}
        cerrar={() => setModalPago(false)}
        titulo={`Registrar Pago - Venta #${ventaPago?.id || ''}`}
      >
        <form onSubmit={registrarPago} className="space-y-4">
          {ventaPago && (
            <div className="bg-steel-900/50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-steel-400">Cliente:</span>
                <span className="font-medium">{ventaPago.tbl_clientes?.nombre || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-steel-400">Total venta:</span>
                <span className="font-medium">{formatearMoneda(ventaPago.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-steel-400">Ya pagado:</span>
                <span className="font-medium">{formatearMoneda(ventaPago.total_pagado)}</span>
              </div>
              <div className="flex justify-between text-amber-600 font-semibold">
                <span>Saldo pendiente:</span>
                <span>{formatearMoneda(ventaPago.saldo_pendiente)}</span>
              </div>
              {montoEnVerificacion > 0 && (
                <>
                  <div className="flex justify-between text-amber-500">
                    <span>Pagos en verificación:</span>
                    <span>{formatearMoneda(montoEnVerificacion)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Disponible por registrar:</span>
                    <span>{formatearMoneda(saldoDisponiblePago)}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {montoEnVerificacion > 0 && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-600">
              Esta venta tiene {formatearMoneda(montoEnVerificacion)} en pagos con voucher pendiente de aprobación.
              Ese monto ya está contado: solo puedes registrar hasta {formatearMoneda(Math.max(saldoDisponiblePago, 0))}.
              {saldoDisponiblePago <= 0 && ' Los pagos registrados ya cubren el total; espera la aprobación o el rechazo del voucher.'}
            </div>
          )}

          {ventaPago?.pago_cliente_pendiente && (
            <div className="rounded-lg border border-amber-700 bg-amber-600 p-3 text-sm space-y-1 shadow-md">
              <p className="font-bold text-white">{MSG_PAGO_BLOQUEADO_CLIENTE.BANNER_INTERNO}</p>
              <p className="text-white/95 font-medium">
                {MSG_PAGO_BLOQUEADO_CLIENTE.DETALLE({
                  monto: ventaPago.pago_cliente_pendiente.monto,
                  fecha_hora: ventaPago.pago_cliente_pendiente.fecha_hora,
                  nombre_cliente: ventaPago.pago_cliente_pendiente.nombre_cliente,
                  formatearMoneda,
                  formatearFechaHora,
                })}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">
              Monto a pagar (S/) <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={ventaPago ? Math.max(saldoDisponiblePago, 0) : undefined}
              className="input-field"
              value={formPago.monto}
              onChange={(e) => setFormPago({ ...formPago, monto: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">Metodo de Pago</label>
            <select
              className="input-field"
              value={formPago.metodo_pago}
              onChange={(e) => setFormPago({ ...formPago, metodo_pago: e.target.value })}
            >
              {Object.entries(METODOS_PAGO_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">
              Boucher / Comprobante <span className="text-red-600">*</span>
            </label>
            <input
              type="file"
              className="input-field text-sm"
              accept="image/*,.pdf"
              onChange={(e) => setArchivoBoucher(e.target.files[0])}
              required
            />
            {archivoBoucher && (
              <p className="text-xs text-emerald-600 mt-1">
                Archivo: {archivoBoucher.name}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-steel-700/50">
            <button
              type="button"
              onClick={() => setModalPago(false)}
              className="btn-secondary"
              disabled={registrandoPago}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
              disabled={registrandoPago || !!ventaPago?.pago_cliente_pendiente || saldoDisponiblePago <= 0}
              title={
                ventaPago?.pago_cliente_pendiente
                  ? MSG_PAGO_BLOQUEADO_CLIENTE.TOOLTIP_BOTON
                  : saldoDisponiblePago <= 0
                    ? 'Los pagos registrados (aprobados + en verificación) ya cubren el total de la venta'
                    : undefined
              }
            >
              {registrandoPago ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <HiOutlineCash className="w-4 h-4" />
                  Registrar Pago
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL: DETALLE DE VENTA (R4: badges regalo + dirección manual)    */}
      {/* ================================================================= */}
      <Modal
        abierto={modalDetalle}
        cerrar={() => { setModalDetalle(false); setVentaDetalle(null); }}
        titulo={`Detalle Venta #${ventaDetalle?.id || ''}`}
        ancho="max-w-2xl"
      >
        {cargandoDetalle ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : ventaDetalle ? (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Info general */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-steel-900/50 rounded-lg p-3">
                <span className="text-steel-400 block text-xs">Cliente</span>
                <span className="font-medium">{ventaDetalle.tbl_clientes?.nombre || '-'}</span>
                {ventaDetalle.tbl_clientes?.dni && (
                  <span className="text-xs text-steel-500 ml-1">({ventaDetalle.tbl_clientes.dni})</span>
                )}
              </div>
              <div className="bg-steel-900/50 rounded-lg p-3">
                <span className="text-steel-400 block text-xs">Vendedor</span>
                <span className="font-medium">{ventaDetalle.tbl_usuarios?.nombres || '-'}</span>
              </div>
              <div className="bg-steel-900/50 rounded-lg p-3">
                <span className="text-steel-400 block text-xs">Estado Venta</span>
                <EstadoBadge estado={ventaDetalle.estado_venta} />
              </div>
              <div className="bg-steel-900/50 rounded-lg p-3">
                <span className="text-steel-400 block text-xs">Tracking</span>
                <EstadoBadge estado={ventaDetalle.estado_tracking} />
              </div>
              <div className="bg-steel-900/50 rounded-lg p-3">
                <span className="text-steel-400 block text-xs">Tipo Entrega</span>
                <span className="font-medium capitalize">{ventaDetalle.tipo_entrega?.replace(/_/g, ' ')}</span>
                {ventaDetalle.tbl_transportistas && (
                  <span className="text-xs text-primary-400 block mt-0.5">{ventaDetalle.tbl_transportistas.nombre}</span>
                )}
              </div>
              <div className="bg-steel-900/50 rounded-lg p-3">
                <span className="text-steel-400 block text-xs">Fecha</span>
                <span className="font-medium">{formatearFechaHora(ventaDetalle.fecha_hora_registro)}</span>
              </div>
            </div>

            {/* Destino de envío o retiro en tienda */}
            {ventaDetalle.tipo_entrega === TIPO_ENTREGA.RETIRO_EN_TIENDA ? (
              <div className="bg-purple-50 rounded-lg p-3 text-sm">
                <span className="text-purple-600 font-medium text-xs block mb-1">Retiro en Tienda</span>
                <p className="text-purple-600">El cliente retirará el producto en tienda. La entrega es gestionada por almacén.</p>
              </div>
            ) : ventaDetalle.tbl_departamentos ? (
              <div className="bg-blue-50 rounded-lg p-3 text-sm">
                <span className="text-blue-600 font-medium text-xs block mb-1">Destino de envío</span>
                <p className="text-blue-600">
                  {ventaDetalle.tbl_departamentos.nombre} / {ventaDetalle.tbl_provincias?.nombre} / {ventaDetalle.tbl_distritos?.nombre}
                </p>
              </div>
            ) : ventaDetalle.direccion_manual ? (
              <div className="bg-blue-50 rounded-lg p-3 text-sm">
                <span className="text-blue-600 font-medium text-xs block mb-1">Dirección de envío (manual)</span>
                <p className="text-blue-600">{ventaDetalle.direccion_manual}</p>
              </div>
            ) : null}

            {/* Items (R4: badge REGALO por item) */}
            {ventaDetalle.items_venta?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-steel-200 mb-2">Items de la venta</h4>
                <div className="overflow-x-auto border border-steel-700 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-steel-900/50">
                      <tr>
                        <th className="text-left py-2 px-3">Producto</th>
                        <th className="text-center py-2 px-3">Cant</th>
                        <th className="text-right py-2 px-3">P. Unit.</th>
                        <th className="text-right py-2 px-3">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventaDetalle.items_venta.map((it) => (
                        <tr key={it.id} className={`border-t border-steel-700/50 ${it.es_regalo ? 'bg-emerald-50' : ''}`}>
                          <td className="py-2 px-3">
                            {it.tbl_productos?.nombre || `Producto #${it.product_id}`}
                            {it.es_regalo && (
                              <span className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[10px] font-bold">
                                <HiOutlineGift className="w-3 h-3" /> REGALO
                              </span>
                            )}
                            {it.promocion_id && parseFloat(it.descuento_promocion_item) > 0 && (
                              <span className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold">
                                <HiOutlineTag className="w-3 h-3" /> Promo: -{formatearMoneda(it.descuento_promocion_item)}
                              </span>
                            )}
                          </td>
                          <td className="text-center py-2 px-3">{it.cantidad}</td>
                          <td className="text-right py-2 px-3">{formatearMoneda(it.precio_unitario_vendido)}</td>
                          <td className="text-right py-2 px-3 font-medium">
                            {it.es_regalo ? (
                              <span className="line-through text-steel-500">
                                {formatearMoneda(it.cantidad * parseFloat(it.precio_unitario_vendido))}
                              </span>
                            ) : (
                              formatearMoneda(it.cantidad * parseFloat(it.precio_unitario_vendido))
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Botón ajustar precios */}
            {ventaPermiteAjuste(ventaDetalle) && !modoAjuste && (
              <button
                onClick={iniciarAjuste}
                className="w-full btn-secondary text-sm flex items-center justify-center gap-2"
              >
                <HiOutlinePencilAlt className="w-4 h-4" /> Ajustar precios / cantidades
              </button>
            )}

            {/* Panel de ajuste inline */}
            {modoAjuste && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2">
                  <HiOutlinePencilAlt className="w-4 h-4" /> Ajuste de precios
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-amber-200">
                        <th className="text-left py-1.5 px-2 text-amber-700">Producto</th>
                        <th className="text-right py-1.5 px-2 text-amber-700">Cant.</th>
                        <th className="text-right py-1.5 px-2 text-amber-700">Precio</th>
                        <th className="text-right py-1.5 px-2 text-amber-700">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsAjuste.map((item, idx) => (
                        <tr key={item.item_id} className="border-b border-amber-100">
                          <td className="py-1.5 px-2 text-amber-900">
                            {item.nombre}
                            {item.es_regalo && <span className="ml-1 text-[10px] bg-emerald-100 text-emerald-600 px-1 rounded">REGALO</span>}
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            <input type="number" min="1" className="w-14 text-right text-xs border border-amber-300 rounded px-1 py-0.5 bg-white"
                              value={item.cantidad_nueva}
                              onChange={e => {
                                const updated = [...itemsAjuste];
                                updated[idx] = { ...item, cantidad_nueva: e.target.value };
                                setItemsAjuste(updated);
                              }}
                              onBlur={e => {
                                const n = parseInt(e.target.value);
                                const updated = [...itemsAjuste];
                                updated[idx] = { ...item, cantidad_nueva: Number.isFinite(n) && n > 0 ? n : 1 };
                                setItemsAjuste(updated);
                              }}
                            />
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            <input type="number" step="0.01" min="0"
                              className={`w-20 text-right text-xs border rounded px-1 py-0.5 bg-white ${!item.es_regalo && item.precio_nuevo < item.precio_minimo ? 'border-red-400 text-red-600' : 'border-amber-300'}`}
                              value={item.precio_nuevo}
                              onChange={e => {
                                const precio = parseFloat(e.target.value) || 0;
                                const updated = [...itemsAjuste];
                                updated[idx] = { ...item, precio_nuevo: precio };
                                setItemsAjuste(updated);
                              }}
                              onBlur={() => {
                                if (!item.es_regalo && item.precio_nuevo < item.precio_minimo) {
                                  toast.error(`Precio mínimo: ${formatearMoneda(item.precio_minimo)}`, { id: `adj-min-${idx}` });
                                }
                              }}
                            />
                            {!item.es_regalo && item.precio_minimo > 0 && (
                              <div className={`text-[9px] mt-0.5 ${item.precio_nuevo < item.precio_minimo ? 'text-red-500 font-bold' : 'text-amber-500'}`}>
                                Mín: {formatearMoneda(item.precio_minimo)}
                              </div>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-right font-medium text-amber-900">
                            {formatearMoneda(item.cantidad_nueva * item.precio_nuevo)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-700 mb-1">Motivo del ajuste *</label>
                  <textarea
                    className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm bg-white text-amber-900 placeholder:text-amber-400"
                    rows={2}
                    placeholder="Ej: Cliente solicita descuento por volumen..."
                    value={motivoAjuste}
                    onChange={e => setMotivoAjuste(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={guardarAjuste} disabled={guardandoAjuste}
                    className="btn-primary text-sm flex-1">
                    {guardandoAjuste ? 'Guardando...' : 'Guardar ajuste'}
                  </button>
                  <button onClick={() => setModoAjuste(false)} className="btn-secondary text-sm">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Historial de ajustes */}
            {historialAjustes.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-steel-200 mb-2 flex items-center gap-1.5">
                  <HiOutlineClock className="w-4 h-4" /> Historial de ajustes
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {historialAjustes.map((aj) => (
                    <div key={aj.id} className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-amber-800">{aj.tbl_items_venta?.tbl_productos?.nombre || 'Producto'}</span>
                        <span className="text-amber-600 text-[10px]">
                          {new Date(aj.fecha_hora).toLocaleDateString('es-PE')} {new Date(aj.fecha_hora).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-amber-700">
                        Precio: {formatearMoneda(aj.precio_anterior)} → {formatearMoneda(aj.precio_nuevo)}
                        {aj.cantidad_anterior !== aj.cantidad_nueva && (
                          <span className="ml-2">| Cant: {aj.cantidad_anterior} → {aj.cantidad_nueva}</span>
                        )}
                      </div>
                      <div className="text-amber-600 mt-0.5">
                        <span className="font-medium">{aj.tbl_usuarios?.nombres || 'Usuario'}</span>: {aj.motivo}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unidades asignadas (por almacén) */}
            {ventaDetalle.asignaciones_unidad?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-steel-200 mb-2">Unidades asignadas</h4>
                <div className="flex flex-wrap gap-2">
                  {ventaDetalle.asignaciones_unidad.map((a) => (
                    <div key={a.id} className="inline-flex flex-col bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-mono">
                      <span className="font-bold">{a.tbl_unidades_producto?.serial || `#${a.product_unit_id}`}</span>
                      {a.tbl_unidades_producto?.codigo_barras && (
                        <span className="text-indigo-500 text-[10px]">{a.tbl_unidades_producto.codigo_barras}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Totales */}
            <TotalizadorVenta venta={ventaDetalle} />


            {/* Pagos realizados */}
            {ventaDetalle.pagos?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-steel-200 mb-2">Pagos realizados</h4>
                <div className="space-y-2">
                  {ventaDetalle.pagos.map((pago) => (
                    <div key={pago.id} className="bg-emerald-50 rounded-lg px-3 py-2 text-sm space-y-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-emerald-600">{formatearMoneda(pago.monto)}</span>
                          <span className="text-xs text-emerald-600 ml-2">{formatearFechaHora(pago.fecha_hora)}</span>
                        </div>
                      </div>
                      {pago.adjuntos?.map((adj, j) => {
                        const esAprobado = adj.aprobado;
                        const esRechazado = adj.rechazado;
                        const urlArchivo = buildMediaUrl(adj.archivo);
                        return (
                          <div key={adj.id || j} className="space-y-1.5">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-emerald-600">Voucher {j + 1}:</span>
                              {esAprobado && <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">Aprobado</span>}
                              {esRechazado && (
                                <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-semibold">
                                  Rechazado{adj.motivo_rechazo ? ` — ${adj.motivo_rechazo}` : ''}
                                </span>
                              )}
                              {!esAprobado && !esRechazado && <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 font-semibold">Pendiente de aprobación</span>}
                              {urlArchivo && (
                                <a href={urlArchivo} target="_blank" rel="noopener noreferrer"
                                  className="text-primary-500 hover:text-primary-400 underline ml-auto">
                                  Ver archivo
                                </a>
                              )}
                            </div>
                            {urlArchivo && adj.archivo?.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                              <img src={urlArchivo} alt={`Voucher ${j + 1}`}
                                className="w-full max-h-40 object-contain rounded border border-steel-700"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Botón registrar nuevo pago cuando hay saldo pendiente */}
                {parseFloat(ventaDetalle.saldo_pendiente) > 0 && ventaPermitePago(ventaDetalle) && (
                  <button
                    onClick={() => { setModalDetalle(false); abrirModalPago(ventaDetalle); }}
                    className="w-full mt-2 btn-primary bg-emerald-600 hover:bg-emerald-700 text-sm flex items-center justify-center gap-2"
                  >
                    <HiOutlineCash className="w-4 h-4" /> Registrar nuevo pago — Saldo: {formatearMoneda(ventaDetalle.saldo_pendiente)}
                  </button>
                )}
              </div>
            )}

            {/* Contraseña de Envío (envío por agencia) */}
            {ventaDetalle.tipo_entrega === TIPO_ENTREGA.ENVIO_POR_AGENCIA && (
              <div>
                <h4 className="text-sm font-semibold text-steel-200 mb-2">Contraseña de Envío</h4>
                {ventaDetalle.contrasena_envio ? (
                  <div className="bg-amber-50 rounded-lg px-3 py-2 text-sm flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-amber-800">{ventaDetalle.contrasena_envio}</span>
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600">
                        Pago aprobado
                      </span>
                    </div>
                  </div>
                ) : ventaDetalle.estado_tracking === ESTADO_TRACKING.DEJADO_EN_AGENCIA ? (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-sm">
                    <span className="text-orange-700 font-medium">Contraseña registrada — será visible cuando el superadministrador apruebe el pago</span>
                  </div>
                ) : (
                  <div className="bg-steel-900/50 rounded-lg px-3 py-2 text-sm">
                    <span className="text-steel-400">Pendiente — el chofer ingresará la contraseña al entregar a la agencia</span>
                  </div>
                )}
              </div>
            )}

            {/* Clave secreta (retiro en tienda) */}
            {ventaDetalle.tipo_entrega === TIPO_ENTREGA.RETIRO_EN_TIENDA && ventaDetalle.claves_secretas?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-steel-200 mb-2">Clave secreta para retiro</h4>
                {ventaDetalle.claves_secretas.map((cs) => (
                  <div key={cs.id} className="bg-amber-50 rounded-lg px-3 py-2 text-sm flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-amber-800">{cs.clave}</span>
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${cs.visible_cliente ? 'bg-emerald-100 text-emerald-600' : 'bg-steel-800 text-steel-400'}`}>
                        {cs.visible_cliente ? 'Visible al cliente' : 'No visible'}
                      </span>
                    </div>
                    {!cs.visible_cliente && ventaDetalle.pago_completo && (
                      <button
                        onClick={async () => {
                          try {
                            await api.put(`/almacen/clave/${cs.id}/hacer-visible`);
                            toast.success('Clave ahora visible al cliente');
                            const { data } = await api.get(`/ventas/${ventaDetalle.id}`);
                            setVentaDetalle(data);
                          } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
                        }}
                        className="text-xs bg-emerald-100 text-emerald-600 px-3 py-1 rounded hover:bg-emerald-200 flex items-center gap-1"
                      >
                        <HiOutlineKey className="w-3.5 h-3.5" /> Hacer visible
                      </button>
                    )}
                    {!cs.visible_cliente && !ventaDetalle.pago_completo && (
                      <span className="text-xs text-steel-500">Requiere pago completo</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Promocion aplicada */}
            {ventaDetalle.aplicaciones_promocion?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-steel-200 mb-2">Promocion aplicada</h4>
                {ventaDetalle.aplicaciones_promocion.map((ap) => (
                  <div key={ap.id} className="bg-yellow-50 rounded-lg px-3 py-2 text-sm flex justify-between items-center">
                    <span className="text-yellow-800 font-medium">
                      {ap.tbl_promociones?.nombre || `Promocion #${ap.promotion_id}`}
                    </span>
                    <span className="text-yellow-600">-{formatearMoneda(ap.monto_descuento)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Motivo cancelacion */}
            {ventaDetalle.estado_venta === ESTADO_VENTA.CANCELADA && ventaDetalle.motivo_cancelacion && (
              <div className="bg-red-50 rounded-lg p-3 text-sm">
                <span className="text-red-600 font-medium text-xs block mb-1">Motivo de cancelacion</span>
                <p className="text-red-800">{ventaDetalle.motivo_cancelacion}</p>
              </div>
            )}

            {/* Motivo rechazo + reenvío */}
            {ventaDetalle.estado_venta === ESTADO_VENTA.RECHAZADA && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm space-y-3">
                <div>
                  <span className="text-red-600 font-medium text-xs block mb-1">Pedido rechazado</span>
                  {ventaDetalle.motivo_rechazo && (
                    <p className="text-red-800">{ventaDetalle.motivo_rechazo}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setVentaReenvio(ventaDetalle);
                    setVoucherReenvio(null);
                    setModalReenvio(true);
                  }}
                  className="w-full btn-primary bg-amber-600 hover:bg-amber-700 text-sm flex items-center justify-center gap-2"
                >
                  <HiOutlineCash className="w-4 h-4" /> Reenviar con nuevo voucher
                </button>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* ================================================================= */}
      {/* DIALOG: CONFIRMAR CANCELACION                                     */}
      {/* ================================================================= */}
      <DialogConfirmacion
        abierto={!!confirmCancelar}
        titulo="Cancelar Venta"
        mensaje={
          <div className="space-y-3">
            <p>
              Estas seguro de cancelar la venta <strong>#{confirmCancelar}</strong>?
              Se revertiran stock, puntos y caja.
            </p>
            <div>
              <label className="block text-xs font-medium text-steel-300 mb-1">Motivo de cancelacion</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-steel-600 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Motivo (opcional)"
                value={motivoCancelacion}
                onChange={(e) => setMotivoCancelacion(e.target.value)}
              />
            </div>
          </div>
        }
        onConfirmar={cancelarVenta}
        onCancelar={() => { setConfirmCancelar(null); setMotivoCancelacion(''); }}
        tipo="peligro"
      />

      {/* ================================================================= */}
      {/* MODAL: REENVIAR PEDIDO RECHAZADO                                  */}
      {/* ================================================================= */}
      <Modal abierto={modalReenvio} cerrar={() => { setModalReenvio(false); setVentaReenvio(null); setVoucherReenvio(null); }} titulo={`Reenviar Pedido #${ventaReenvio?.id || ''}`} ancho="max-w-md">
        <div className="space-y-4">
          {ventaReenvio?.motivo_rechazo && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
              <span className="text-red-600 font-medium text-xs block mb-1">Motivo del rechazo</span>
              <p className="text-red-800">{ventaReenvio.motivo_rechazo}</p>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-steel-300 mb-1">Nuevo voucher de pago</label>
            <input
              type="file"
              accept="image/*,.pdf"
              className="input-field w-full"
              onChange={(e) => setVoucherReenvio(e.target.files[0] || null)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setModalReenvio(false); setVentaReenvio(null); setVoucherReenvio(null); }} className="btn-secondary">
              Cancelar
            </button>
            <button
              disabled={!voucherReenvio || enviandoReenvio}
              onClick={async () => {
                if (!voucherReenvio || !ventaReenvio) return;
                setEnviandoReenvio(true);
                try {
                  const formData = new FormData();
                  formData.append('voucher', voucherReenvio);
                  await api.post(`/ventas/${ventaReenvio.id}/reenviar`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                  toast.success('Pedido reenviado exitosamente');
                  setModalReenvio(false);
                  setModalDetalle(false);
                  setVentaReenvio(null);
                  setVoucherReenvio(null);
                  listar();
                } catch (err) {
                  toast.error(err.response?.data?.error || 'Error al reenviar pedido');
                } finally {
                  setEnviandoReenvio(false);
                }
              }}
              className="btn-primary flex items-center gap-2"
            >
              {enviandoReenvio ? 'Enviando...' : 'Reenviar Pedido'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL: CREAR CLIENTE (formulario compartido con Clientes)         */}
      {/* ================================================================= */}
      <ModalEditarCliente
        abierto={modalCrearCliente}
        cerrar={() => setModalCrearCliente(false)}
        cliente={null}
        onGuardado={onClienteCreado}
      />

      {/* ================================================================= */}
      {/* MODAL: TARJETA CREDENCIALES                                       */}
      {/* ================================================================= */}
      <Modal abierto={!!tarjetaCredenciales} cerrar={() => setTarjetaCredenciales(null)} titulo="Credenciales del Cliente">
        {tarjetaCredenciales && (
          <div className="space-y-4">
            <p className="text-sm text-steel-300">Envía estos datos al cliente para que acceda al portal:</p>
            <div className="bg-gradient-to-br from-primary-50 to-blue-50 border-2 border-primary-200 rounded-xl p-5 space-y-3">
              <h3 className="text-center font-bold text-primary-800 text-lg">RASEK SAKA - Acceso Cliente</h3>
              <div className="bg-steel-800 rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-steel-400">Usuario:</span>
                  <span className="font-mono font-bold text-steel-200">{tarjetaCredenciales.usuario}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-steel-400">Contraseña:</span>
                  <span className="font-mono font-bold text-steel-200">{tarjetaCredenciales.contrasena}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                const texto = `RASEK SAKA - Credenciales\nUsuario: ${tarjetaCredenciales.usuario}\nContraseña: ${tarjetaCredenciales.contrasena}`;
                navigator.clipboard.writeText(texto);
                toast.success('Credenciales copiadas al portapapeles');
              }}
              className="btn-primary w-full"
            >
              Copiar Credenciales
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
