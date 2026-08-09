import { useState, useRef, useEffect, useMemo } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import JsBarcode from 'jsbarcode';
import {
  HiOutlineClipboardCheck,
  HiOutlineTag,
  HiOutlineCamera,
  HiOutlineFilter,
  HiOutlineGift,
  HiOutlineCube,
  HiOutlineTruck,
  HiOutlineShoppingBag,
  HiOutlineQrcode,
  HiOutlineOfficeBuilding,
  HiOutlineExclamation,
  HiOutlineSearch,
  HiOutlineUser,
} from 'react-icons/hi';
import useCrud from '../../hooks/useCrud';
import usePaginacion from '../../hooks/usePaginacion';
import TablaGenerica from '../../components/ui/TablaGenerica';
import EstadoBadge from '../../components/ui/EstadoBadge';
import Paginacion from '../../components/ui/Paginacion';
import DialogConfirmacion from '../../components/ui/DialogConfirmacion';
import Modal from '../../components/ui/Modal';
import { formatearFechaHora, formatearMoneda } from '../../utils/formato';
import { calcularCobertura, formatearFaltantesCorto } from '../../utils/ventaCobertura';
import useBluetoothPrinter from '../../hooks/useBluetoothPrinter';
import useFormatoImpresion from '../../hooks/useFormatoImpresion';
import BluetoothPrinterPanel from '../../components/shared/BluetoothPrinterPanel';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  ESTADO_TRACKING,
  ESTADO_UNIDAD,
  TIPO_ENTREGA,
  ORIGEN_INGRESO,
  TELEFONO_INPUT,
} from '../../config/constants';

// ---------------------------------------------------------------------------
// Columnas de la tabla
// ---------------------------------------------------------------------------
// Devuelve true si todas las unidades asignadas a la venta están en estado EMPAQUETADA.
const todoEmpaquetado = (venta) => {
  const items = venta?.items_venta || [];
  let total = 0;
  let empacadas = 0;
  for (const item of items) {
    for (const a of (item.asignaciones_unidad || [])) {
      total++;
      if (a.tbl_unidades_producto?.estado_unidad === ESTADO_UNIDAD.EMPAQUETADA) empacadas++;
    }
  }
  return total > 0 && empacadas === total;
};

const columnas = [
  { key: 'id', label: 'N° Venta' },
  { key: 'cliente', label: 'Cliente', render: (f) => f.tbl_clientes?.nombre || '-' },
  {
    key: 'tipo_entrega', label: 'Tipo Entrega', render: (f) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        f.tipo_entrega === TIPO_ENTREGA.ENVIO_POR_AGENCIA ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-600'
      }`}>
        {f.tipo_entrega?.replace(/_/g, ' ')}
      </span>
    ),
  },
  { key: 'estado_tracking', label: 'Tracking', render: (f) => <EstadoBadge estado={f.estado_tracking} /> },
  {
    key: 'items', label: 'Items', render: (f) => {
      const items = f.items_venta || [];
      const regalos = items.filter((i) => i.es_regalo).length;
      const cobertura = calcularCobertura(f);
      const empaquetado = todoEmpaquetado(f);
      // Amarillo si hay unidades provenientes de compra externa_envio mezcladas.
      const tieneExt = items.some(iv => {
        const asigs = iv.asignaciones_unidad || [];
        return asigs.some(a => a.tbl_unidades_producto?.ingreso_origen === ORIGEN_INGRESO.COMPRA_EXTERNA_ENVIO);
      });
      const chipClass = !cobertura.completa
        ? 'bg-red-100 text-red-700'
        : tieneExt
          ? 'bg-amber-100 text-amber-700'
          : 'bg-emerald-100 text-emerald-600';
      return (
        <div className="flex flex-wrap items-center gap-1">
          <span className="font-medium">{items.length} item{items.length !== 1 ? 's' : ''}</span>
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${chipClass}`}
            title={cobertura.completa ? 'Cobertura completa' : `Faltan: ${formatearFaltantesCorto(cobertura)}`}
          >
            {cobertura.totalAsignado}/{cobertura.totalRequerido}
          </span>
          {empaquetado && (
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold"
              title="Todas las unidades asignadas están empaquetadas"
            >
              <HiOutlineClipboardCheck className="w-3 h-3" /> Empaquetado
            </span>
          )}
          {regalos > 0 && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[10px] font-bold">
              <HiOutlineGift className="w-3 h-3" /> {regalos}
            </span>
          )}
        </div>
      );
    },
  },
  { key: 'fecha', label: 'Fecha', render: (f) => formatearFechaHora(f.fecha_hora_registro) },
];

// ---------------------------------------------------------------------------
// Formatos de código de barras soportados por el scanner
// ---------------------------------------------------------------------------
const BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.QR_CODE,
];

// ---------------------------------------------------------------------------
// qrbox responsive: se adapta al tamaño real del viewfinder
// ---------------------------------------------------------------------------
const calcularQrbox = (viewfinderWidth, viewfinderHeight) => {
  const width = Math.floor(Math.min(viewfinderWidth * 0.85, 400));
  const height = Math.floor(Math.min(viewfinderHeight * 0.35, 120));
  return { width, height };
};

// ---------------------------------------------------------------------------
// El rótulo se imprime escribiendo HTML en una ventana nueva. Los datos que
// interpola (nombres, razón social, observación del receptor) son texto libre,
// así que se escapan para que un "<" o un "&" no rompa el marcado del rótulo.
// ---------------------------------------------------------------------------
const esc = (valor) => String(valor ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function Despacho() {
  const { datos, cargando, listar } = useCrud('/almacen/bandeja');
  const { datos: almacenes } = useCrud('/almacenes?activo=true');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [ordenColumna, setOrdenColumna] = useState('id');
  const [ordenDireccion, setOrdenDireccion] = useState('desc');

  const datosFiltrados = useMemo(() => {
    let resultado = datos;
    if (filtroEstado) resultado = resultado.filter((d) => d.estado_tracking === filtroEstado);
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      resultado = resultado.filter((d) =>
        String(d.id).includes(q) ||
        (d.tbl_clientes?.nombre || '').toLowerCase().includes(q) ||
        (d.tipo_entrega || '').toLowerCase().replace(/_/g, ' ').includes(q) ||
        (d.estado_tracking || '').toLowerCase().replace(/_/g, ' ').includes(q)
      );
    }
    if (ordenColumna) {
      resultado = [...resultado].sort((a, b) => {
        let va, vb;
        switch (ordenColumna) {
          case 'id': va = a.id; vb = b.id; break;
          case 'cliente': va = (a.tbl_clientes?.nombre || '').toLowerCase(); vb = (b.tbl_clientes?.nombre || '').toLowerCase(); break;
          case 'tipo_entrega': va = a.tipo_entrega || ''; vb = b.tipo_entrega || ''; break;
          case 'estado_tracking': va = a.estado_tracking || ''; vb = b.estado_tracking || ''; break;
          case 'items': va = (a.items_venta || []).length; vb = (b.items_venta || []).length; break;
          case 'fecha': va = a.fecha_hora_registro || ''; vb = b.fecha_hora_registro || ''; break;
          default: va = a[ordenColumna]; vb = b[ordenColumna];
        }
        if (va < vb) return ordenDireccion === 'asc' ? -1 : 1;
        if (va > vb) return ordenDireccion === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return resultado;
  }, [datos, filtroEstado, busqueda, ordenColumna, ordenDireccion]);

  const { datosPaginados, paginaActual, totalPaginas, irAPagina } = usePaginacion(datosFiltrados);

  const handleOrdenar = (key) => {
    if (ordenColumna === key) {
      setOrdenDireccion((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrdenColumna(key);
      setOrdenDireccion('asc');
    }
  };

  // Foto paquete
  const [modalFoto, setModalFoto] = useState(false);
  const [ventaFoto, setVentaFoto] = useState(null);
  const [archivoFoto, setArchivoFoto] = useState(null);
  const [previewFoto, setPreviewFoto] = useState(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  // Rótulo imprimible
  const [modalRotulo, setModalRotulo] = useState(false);
  const [rotuloData, setRotuloData] = useState(null);
  const [cargandoRotulo, setCargandoRotulo] = useState(false);
  const barcodeRef = useRef(null);

  // Chofer para rótulo
  const [choferes, setChoferes] = useState([]);
  const [choferSeleccionado, setChoferSeleccionado] = useState('');
  const [ventaParaRotulo, setVentaParaRotulo] = useState(null);
  // Permite cambiar el conductor después de generar el rótulo.
  // choferPrevioEdicion: valor para restaurar al cancelar la edición.
  const [editandoConductor, setEditandoConductor] = useState(false);
  const [choferPrevioEdicion, setChoferPrevioEdicion] = useState('');
  const [guardandoChofer, setGuardandoChofer] = useState(false);
  // Conductor externo (app/tercerizado, sin cuenta en el sistema).
  // Cuando está activo se registran los datos a mano y almacén completa el flujo.
  const [conductorExterno, setConductorExterno] = useState(false);
  const [datosExterno, setDatosExterno] = useState({ nombre: '', dni: '', telefono: '' });
  const externoCompleto = (d) => !!(d.nombre.trim() && d.dni.trim() && d.telefono.trim());

  // Bluetooth printer + selector de formato (multi-protocolo)
  const bluetooth = useBluetoothPrinter();
  const { formatoSeleccionado, formatosDisponibles, cambiarFormato } =
    useFormatoImpresion(bluetooth.protocolo);

  // Confirmaciones
  const [confirmEmpaque, setConfirmEmpaque] = useState(null);

  // Enviar a chofer (scanner de código de barras de rótulo)
  const [modalEnviar, setModalEnviar] = useState(false);
  const [ventaEnviar, setVentaEnviar] = useState(null);
  const [escaneando, setEscaneando] = useState(false);
  const [scanResultado, setScanResultado] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [scanAlertaRetiro, setScanAlertaRetiro] = useState(null);
  const [confirmEnvio, setConfirmEnvio] = useState(null);
  const [enviandoAChofer, setEnviandoAChofer] = useState(false);
  const scannerRef = useRef(null);
  const procesandoRef = useRef(false);
  const SCANNER_ID = 'rotulo-barcode-reader';

  // Retiro en tienda
  const [modalRetiro, setModalRetiro] = useState(false);
  const [ventaRetiro, setVentaRetiro] = useState(null);
  const [archivoRetiro, setArchivoRetiro] = useState(null);
  const [previewRetiro, setPreviewRetiro] = useState(null);
  const [costoPariRetiro, setCostoPariRetiro] = useState('');
  const [enviandoRetiro, setEnviandoRetiro] = useState(false);

  // R1: Asignar unidades
  const [modalAsignar, setModalAsignar] = useState(false);
  const [ventaAsignar, setVentaAsignar] = useState(null);
  const [itemsAsignar, setItemsAsignar] = useState([]);
  const [asignaciones, setAsignaciones] = useState({});
  const [cargandoAsignar, setCargandoAsignar] = useState(false);
  const [enviandoAsignacion, setEnviandoAsignacion] = useState(false);
  const [almacenAsignar, setAlmacenAsignar] = useState('');

  // Confirmación de asignación parcial (reemplaza window.confirm nativo)
  const [confirmParcial, setConfirmParcial] = useState(null);

  // Scanner para asignación de unidades
  const [scanAsignarActivo, setScanAsignarActivo] = useState(false);
  const [codigoManualAsignar, setCodigoManualAsignar] = useState('');
  const scannerAsignarRef = useRef(null);
  const scannerAsignarContainerRef = useRef(null);
  const procesandoScanAsignarRef = useRef(false);
  const inputScanRef = useRef(null);

  // Refs para evitar stale closures en el callback del scanner de cámara
  const asignacionesRef = useRef(asignaciones);
  const itemsAsignarRef = useRef(itemsAsignar);
  useEffect(() => { asignacionesRef.current = asignaciones; }, [asignaciones]);
  useEffect(() => { itemsAsignarRef.current = itemsAsignar; }, [itemsAsignar]);

  // Cleanup AMBOS scanners on unmount
  useEffect(() => {
    return () => { detenerScanner(); detenerScannerAsignar(); };
  }, []);

  // Cargar lista de choferes al montar
  useEffect(() => {
    api.get('/almacen/choferes')
      .then(({ data }) => setChoferes(data))
      .catch(() => {});
  }, []);

  // Renderizar código de barras en el modal cuando rotuloData cambia
  useEffect(() => {
    if (rotuloData?.codigo && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, rotuloData.codigo, {
          format: 'CODE128',
          width: 2,
          height: 55,
          displayValue: true,
          fontSize: 12,
          margin: 5,
          font: 'Arial',
        });
      } catch {
        // Si falla JsBarcode, el SVG queda vacío — no bloquea la UI
      }
    }
  }, [rotuloData]);

  // =========================================================================
  // Enviar a chofer: scanner de código de barras del rótulo
  // =========================================================================

  const abrirModalEnviar = (venta) => {
    setVentaEnviar(venta);
    setScanResultado(null);
    setScanError(null);
    setScanAlertaRetiro(null);
    setConfirmEnvio(null);
    setModalEnviar(true);
  };

  const cerrarModalEnviar = () => {
    detenerScanner();
    setVentaEnviar(null);
    setScanResultado(null);
    setScanError(null);
    setScanAlertaRetiro(null);
    setConfirmEnvio(null);
    setModalEnviar(false);
  };

  const scannerContainerRef = useRef(null);

  const limpiarScannerDOM = () => {
    const el = scannerContainerRef.current;
    if (el) el.innerHTML = '';
  };

  const iniciarScanner = async () => {
    setScanError(null);
    setScanResultado(null);
    setConfirmEnvio(null);

    try {
      const camaras = await Html5Qrcode.getCameras();
      if (!camaras || camaras.length === 0) {
        setScanError('No se detectó ninguna cámara en este dispositivo.');
        return;
      }

      limpiarScannerDOM();
      const wrapperId = SCANNER_ID + '-inner';
      const innerDiv = document.createElement('div');
      innerDiv.id = wrapperId;
      scannerContainerRef.current.appendChild(innerDiv);

      const scanner = new Html5Qrcode(wrapperId, { formatsToSupport: BARCODE_FORMATS });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: calcularQrbox, aspectRatio: 1.777778, disableFlip: true },
        onScanExitoso,
        () => {}
      );
      setEscaneando(true);
    } catch (err) {
      limpiarScannerDOM();
      const msg = err?.message?.includes('NotFound') || err?.name === 'NotFoundError'
        ? 'No se detectó ninguna cámara en este dispositivo.'
        : 'No se pudo acceder a la cámara. Verifica los permisos.';
      setScanError(msg);
      console.error('Error al iniciar scanner:', err);
    }
  };

  const detenerScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // ignorar si ya estaba detenido
      }
      scannerRef.current = null;
    }
    limpiarScannerDOM();
    setEscaneando(false);
  };

  const onScanExitoso = async (codigoEscaneado) => {
    if (procesandoRef.current) return;
    procesandoRef.current = true;

    try {
      await detenerScanner();
      // Enviar al backend para validar el código de rótulo
      const { data } = await api.post('/almacen/enviar-a-chofer', { codigo_rotulo: codigoEscaneado, venta_id: ventaEnviar?.id });
      setScanResultado(data);
      setScanError(null);
      toast.success(data.mensaje);
      await listar();
    } catch (err) {
      const respData = err.response?.data;
      if (respData?.tipo === TIPO_ENTREGA.RETIRO_EN_TIENDA) {
        setScanAlertaRetiro({
          mensaje: respData.error,
          ventaId: respData.venta?.id,
          cliente: respData.venta?.cliente,
        });
        setScanError(null);
      } else {
        const msg = respData?.error || 'Error al procesar el código escaneado';
        setScanError(msg);
        setScanAlertaRetiro(null);
      }
      setScanResultado(null);
    } finally {
      procesandoRef.current = false;
    }
  };

  const escanearOtro = () => {
    setScanResultado(null);
    setScanError(null);
    setScanAlertaRetiro(null);
    iniciarScanner();
  };

  // =========================================================================
  // R1: Abrir modal asignar unidades
  // =========================================================================

  const abrirAsignarUnidades = async (venta) => {
    setVentaAsignar(venta);
    setAsignaciones({});
    setAlmacenAsignar('');
    setCargandoAsignar(true);
    setModalAsignar(true);

    try {
      const { data } = await api.get(`/ventas/${venta.id}`);
      const itemsBase = (data.items_venta || []).map(item => ({ ...item, unidadesDisponibles: [] }));
      setItemsAsignar(itemsBase);
    } catch {
      toast.error('Error al cargar datos de la venta');
      setModalAsignar(false);
    }
    setCargandoAsignar(false);
  };

  const cargarUnidadesPorAlmacen = async (almId) => {
    setAlmacenAsignar(almId);
    setAsignaciones({});
    if (!almId) {
      setItemsAsignar(prev => prev.map(item => ({ ...item, unidadesDisponibles: [] })));
      return;
    }
    const itemsConUnidades = await Promise.all(
      itemsAsignar.map(async (item) => {
        try {
          const { data: unidades } = await api.get('/inventario/unidades', {
            params: { product_id: item.product_id, estado: ESTADO_UNIDAD.DISPONIBLE, almacen_id: almId },
          });
          const lista = Array.isArray(unidades) ? unidades : (unidades.datos || []);
          return { ...item, unidadesDisponibles: lista };
        } catch {
          return { ...item, unidadesDisponibles: [] };
        }
      })
    );
    setItemsAsignar(itemsConUnidades);
  };

  const toggleUnidadAsignacion = (itemId, unidadId, cantidadRequerida) => {
    setAsignaciones((prev) => {
      const current = prev[itemId] || [];
      if (current.includes(unidadId)) {
        return { ...prev, [itemId]: current.filter((id) => id !== unidadId) };
      }
      if (current.length >= cantidadRequerida) {
        toast.error(`Solo puedes seleccionar ${cantidadRequerida} unidad(es) para este producto`);
        return prev;
      }
      return { ...prev, [itemId]: [...current, unidadId] };
    });
  };

  // =========================================================================
  // Scanner: buscar y seleccionar unidad por código de barras
  // =========================================================================

  const ESTADOS_LABEL = {
    [ESTADO_UNIDAD.ASIGNADA_A_VENTA]: 'Asignada a otra venta',
    [ESTADO_UNIDAD.EMPAQUETADA]: 'Empaquetada',
    [ESTADO_UNIDAD.ROTULADA]: 'Rotulada',
    [ESTADO_UNIDAD.DEJADO_EN_AGENCIA]: 'Enviada a agencia',
    [ESTADO_UNIDAD.RETIRADO_EN_TIENDA]: 'Retirada en tienda',
    [ESTADO_UNIDAD.RETIRADO_EN_AGENCIA]: 'Retirada en agencia',
    [ESTADO_UNIDAD.CANCELADA_REVERTIDA]: 'Cancelada',
  };

  const seleccionarPorCodigoBarras = async (codigo) => {
    const codigoTrim = codigo.trim();
    if (!codigoTrim) return;
    // Leer desde refs para evitar stale closures en el callback de cámara
    const itemsActuales = itemsAsignarRef.current;
    const asignacionesActuales = asignacionesRef.current;

    // 1. Buscar en unidades disponibles locales
    for (const item of itemsActuales) {
      const unidad = item.unidadesDisponibles.find(
        (u) => u.codigo_barras.toLowerCase() === codigoTrim.toLowerCase()
      );
      if (unidad) {
        const seleccionadas = asignacionesActuales[item.id] || [];
        if (seleccionadas.includes(unidad.id)) {
          toast(`${unidad.serial} ya está seleccionada`, { icon: 'ℹ️' });
          return;
        }
        if (seleccionadas.length >= item.cantidad) {
          toast.error(`"${item.tbl_productos?.nombre}" ya tiene todas sus unidades asignadas`);
          return;
        }
        toggleUnidadAsignacion(item.id, unidad.id, item.cantidad);
        toast.success(`${unidad.serial} asignada a "${item.tbl_productos?.nombre}"`);
        return;
      }
    }

    // 2. No encontrada localmente → consultar al backend para dar mensaje preciso
    try {
      const { data: unidadRemota } = await api.get('/inventario/buscar-codigo', { params: { codigo: codigoTrim } });
      const nombre = unidadRemota.tbl_productos?.nombre || 'Producto desconocido';
      const estado = unidadRemota.estado_unidad;
      if (estado !== ESTADO_UNIDAD.DISPONIBLE) {
        const estadoTexto = ESTADOS_LABEL[estado] || estado?.replace(/_/g, ' ');
        toast.error(`"${nombre}" (${unidadRemota.serial}) ya no está en stock — Estado: ${estadoTexto}`);
      } else {
        // Disponible pero en otro almacén
        const almNombre = unidadRemota.tbl_almacenes?.nombre || 'otro almacén';
        toast.error(`"${nombre}" (${unidadRemota.serial}) está disponible en "${almNombre}", no en el almacén seleccionado`);
      }
    } catch {
      toast.error(`Código "${codigoTrim}" no registrado en el sistema`);
    }
  };

  const limpiarScannerAsignarDOM = () => {
    const el = scannerAsignarContainerRef.current;
    if (el) el.innerHTML = '';
  };

  const detenerScannerAsignar = async () => {
    if (scannerAsignarRef.current) {
      try { await scannerAsignarRef.current.stop(); scannerAsignarRef.current.clear(); } catch { /* ya detenido */ }
      scannerAsignarRef.current = null;
    }
    limpiarScannerAsignarDOM();
    setScanAsignarActivo(false);
  };

  const iniciarScannerAsignar = async () => {
    try {
      const camaras = await Html5Qrcode.getCameras();
      if (!camaras || camaras.length === 0) {
        toast.error('No se detectó ninguna cámara');
        return;
      }
      limpiarScannerAsignarDOM();
      const wrapperId = 'asignar-barcode-inner';
      const inner = document.createElement('div');
      inner.id = wrapperId;
      scannerAsignarContainerRef.current.appendChild(inner);

      const scanner = new Html5Qrcode(wrapperId, { formatsToSupport: BARCODE_FORMATS });
      scannerAsignarRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: calcularQrbox, aspectRatio: 1.777778, disableFlip: true },
        async (codigo) => {
          if (procesandoScanAsignarRef.current) return;
          procesandoScanAsignarRef.current = true;
          // Pausar el scanner inmediatamente para evitar lecturas múltiples
          try { scanner.pause(true); } catch { /* ignore */ }
          await seleccionarPorCodigoBarras(codigo);
          setTimeout(() => {
            procesandoScanAsignarRef.current = false;
            try { scanner.resume(); } catch { /* ignore si ya detenido */ }
          }, 3000);
        },
        () => {}
      );
      setScanAsignarActivo(true);
    } catch (err) {
      limpiarScannerAsignarDOM();
      const msg = err?.message?.includes('NotFound') || err?.name === 'NotFoundError'
        ? 'No se detectó ninguna cámara.'
        : 'No se pudo acceder a la cámara. Verifica los permisos.';
      toast.error(msg);
    }
  };

  const handleScanManual = (e) => {
    e.preventDefault();
    if (!codigoManualAsignar.trim()) return;
    seleccionarPorCodigoBarras(codigoManualAsignar);
    setCodigoManualAsignar('');
    inputScanRef.current?.focus();
  };

  const cerrarModalAsignar = () => {
    detenerScannerAsignar();
    setCodigoManualAsignar('');
    setModalAsignar(false);
  };

  const enviarAsignaciones = async (forzarParcial = false) => {
    if (!almacenAsignar) {
      toast.error('Debe seleccionar un almacén de origen');
      return;
    }

    const lista = [];
    let totalAsignadas = 0;
    let totalRequeridas = 0;
    const faltantes = [];

    for (const item of itemsAsignar) {
      const seleccionadas = asignaciones[item.id] || [];
      // Considerar asignaciones previas
      const previas = item.asignaciones_unidad?.length || 0;
      const requeridas = item.cantidad - previas;
      totalRequeridas += requeridas;
      totalAsignadas += seleccionadas.length;

      if (seleccionadas.length < requeridas) {
        faltantes.push({
          nombre: item.tbl_productos?.nombre || 'Producto',
          faltantes: requeridas - seleccionadas.length,
        });
      }

      for (const uid of seleccionadas) {
        lista.push({ item_venta_id: item.id, unidad_id: uid });
      }
    }

    if (lista.length === 0) {
      toast.error('No hay unidades seleccionadas para asignar');
      return;
    }

    const esParcial = totalAsignadas < totalRequeridas;
    if (esParcial && !forzarParcial) {
      const faltantesTexto = faltantes.map(f => `${f.nombre} (${f.faltantes})`).join(', ');
      setConfirmParcial({ faltantesTexto });
      return;
    }

    setEnviandoAsignacion(true);
    try {
      const { data } = await api.post(`/almacen/${ventaAsignar.id}/asignar-unidades`, {
        asignaciones: lista,
        almacen_id: parseInt(almacenAsignar),
        parcial: esParcial,
      });
      if (data.parcial) {
        toast.success(data.mensaje, { duration: 5000 });
      } else {
        toast.success('Unidades asignadas exitosamente');
      }
      setModalAsignar(false);
      await listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al asignar unidades');
    }
    setEnviandoAsignacion(false);
  };

  // =========================================================================
  // Acciones de despacho
  // =========================================================================

  const confirmarEmpaque = async () => {
    if (!confirmEmpaque) return;
    try {
      await api.post(`/almacen/${confirmEmpaque}/empaque`);
      toast.success('Empaque confirmado');
      setConfirmEmpaque(null);
      await listar();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  // -----------------------------------------------------------------------
  // Helpers para construir el rótulo y resolver datos de chofer (reutilizados
  // en abrirGenerarRotulo, generarRotulo, persistirCambioChofer y preview).
  // -----------------------------------------------------------------------
  const resolverChofer = (lista, choferId) => {
    if (!choferId) return null;
    const idNum = parseInt(choferId);
    if (Number.isNaN(idNum)) return null;
    const ch = lista.find((c) => c.id === idNum);
    if (!ch) return null;
    return { id: ch.id, nombres: ch.nombres, dni: ch.dni || '', telefono: ch.telefono || '' };
  };

  // Construye el objeto rotuloData a partir de una venta (de la bandeja o del
  // payload del backend que usa el shape { venta: {...} }) y un chofer opcional.
  const construirRotuloData = (venta, chofer, codigoRotulo, empresa) => {
    // Soporta dos shapes: venta de bandeja (con tbl_clientes) o venta
    // serializada desde backend (con campos planos cliente_nombre, etc.).
    const cli = venta?.tbl_clientes || null;
    // Quien recibe puede ser un tercero declarado en la venta; si no se declaró
    // ninguno recae en el propio cliente, para que nombre, documento y teléfono
    // no queden en blanco en el rótulo.
    //
    // El backend ya resuelve esa caída y marca el resultado con
    // `destinatario_es_tercero`. Cuando ese campo viene, sus valores se toman
    // literales: si el receptor es una empresa con RUC y sin DNI, el rótulo debe
    // dejar el DNI vacío, NO rellenarlo con el del cliente que compró.
    const resueltoPorBackend = venta?.destinatario_es_tercero !== undefined;

    const destinatario_nombre = resueltoPorBackend
      ? (venta.destinatario_nombre || '')
      : (venta?.receptor_nombre || venta?.receptor_razon_social || cli?.nombre || venta?.cliente_nombre || '');
    const destinatario_dni = resueltoPorBackend
      ? (venta.destinatario_dni || '')
      : (venta?.receptor_dni || cli?.dni || venta?.cliente_dni || '');
    const destinatario_telefono = resueltoPorBackend
      ? (venta.destinatario_telefono || '')
      : (venta?.receptor_telefono || cli?.telefono_principal || venta?.cliente_telefono || '');
    const destinatario_documento = resueltoPorBackend
      ? (venta.destinatario_documento || '')
      : (venta?.receptor_documento || cli?.ruc || destinatario_dni || '');
    const destinatario_razon_social = resueltoPorBackend
      ? (venta.destinatario_razon_social || '')
      : (venta?.receptor_razon_social || '');
    const destinatario_observacion = resueltoPorBackend
      ? (venta.destinatario_observacion || '')
      : (venta?.receptor_observacion || '');
    const direccion_manual = venta?.direccion_manual || '';
    // En retiro en tienda no hay dirección de envío: decirlo explícitamente
    // evita que el rótulo parezca incompleto por un guion en el destino.
    const esRetiroEnTienda = (venta?.tipo_entrega || '') === TIPO_ENTREGA.RETIRO_EN_TIENDA;
    const direccion = venta?.direccion
      || direccion_manual
      || (esRetiroEnTienda ? 'Retiro en tienda' : '');
    // Ubigeo/agencia: desde las relaciones de la venta (caso envío por agencia).
    const distrito = venta?.distrito || venta?.tbl_distritos?.nombre || '';
    const departamento = venta?.departamento || venta?.tbl_departamentos?.nombre || '';
    const provincia = venta?.provincia || venta?.tbl_provincias?.nombre || '';
    const agencia_shalom = venta?.agencia_shalom || venta?.tbl_transportistas?.nombre || '';
    const referencia = venta?.referencia || '';

    return {
      codigo: codigoRotulo,
      ventaId: venta?.id,
      empresa: empresa || null,
      es_externo: chofer?.externo || false,
      remitente_nombre: chofer?.nombres || '',
      remitente_dni: chofer?.dni || '',
      remitente_telefono: chofer?.telefono || '',
      destinatario_nombre,
      destinatario_dni,
      destinatario_telefono,
      destinatario_documento,
      destinatario_razon_social,
      destinatario_observacion,
      direccion,
      distrito,
      departamento,
      provincia,
      agencia_shalom,
      direccion_manual,
      referencia,
    };
  };

  // Traduce el payload del rótulo del backend (POST/PUT/GET) al shape del
  // preview. Es la ÚNICA vía por la que se arma un rótulo ya generado, para que
  // reimprimir muestre exactamente lo mismo que la impresión original.
  const rotuloDesdeRespuesta = (data, ventaId) => {
    const chofer = data.chofer
      ? { id: data.chofer.id, nombres: data.chofer.nombre, dni: data.chofer.dni, telefono: data.chofer.telefono, externo: data.chofer.externo }
      : null;
    return {
      chofer,
      rotulo: construirRotuloData({ ...data.venta, id: ventaId }, chofer, data.codigo_rotulo, data.empresa),
    };
  };

  // Abrir modal de rótulo (con selector de chofer antes de generar).
  // Si ya existe rótulo: lo recarga del backend y permite editar el conductor.
  const abrirGenerarRotulo = async (venta) => {
    setVentaParaRotulo(venta);
    const rotuloExistente = (venta.rotulos || []).slice().sort((a, b) => b.id - a.id)[0] || null;

    if (!rotuloExistente) {
      setChoferSeleccionado('');
      setChoferPrevioEdicion('');
      setConductorExterno(false);
      setDatosExterno({ nombre: '', dni: '', telefono: '' });
      setRotuloData(null);
      setEditandoConductor(false);
      setModalRotulo(true);
      return;
    }

    const esExterno = !rotuloExistente.chofer_user_id && !!rotuloExistente.chofer_externo_nombre;
    const choferId = rotuloExistente.chofer_user_id ? String(rotuloExistente.chofer_user_id) : '';
    setChoferSeleccionado(choferId);
    setChoferPrevioEdicion(choferId);
    setConductorExterno(esExterno);
    setDatosExterno(esExterno
      ? {
        nombre: rotuloExistente.chofer_externo_nombre || '',
        dni: rotuloExistente.chofer_externo_dni || '',
        telefono: rotuloExistente.chofer_externo_telefono || '',
      }
      : { nombre: '', dni: '', telefono: '' });

    setModalRotulo(true);
    setCargandoRotulo(true);
    try {
      // El rótulo se recarga completo del backend en vez de rearmarse desde la
      // fila de la bandeja: así la reimpresión trae los mismos datos de empresa,
      // receptor y destino que tuvo la impresión original.
      const { data } = await api.get(`/almacen/${venta.id}/rotulo`);
      const { chofer, rotulo } = rotuloDesdeRespuesta(data, venta.id);
      setRotuloData(rotulo);
      setEditandoConductor(!chofer);
    } catch (err) {
      setRotuloData(null);
      toast.error(err.response?.data?.error || 'No se pudo cargar el rótulo');
    } finally {
      setCargandoRotulo(false);
    }
  };

  const generarRotulo = async () => {
    if (!ventaParaRotulo) return;
    // La cobertura puede estar incompleta: el chofer completa en viaje.
    const id = ventaParaRotulo.id;
    try {
      const payload = conductorExterno
        ? { chofer_externo: { nombre: datosExterno.nombre.trim(), dni: datosExterno.dni.trim(), telefono: datosExterno.telefono.trim() } }
        : { chofer_user_id: choferSeleccionado || undefined };
      const { data } = await api.post(`/almacen/${id}/rotulo`, payload);

      setRotuloData(rotuloDesdeRespuesta(data, id).rotulo);
      setChoferPrevioEdicion(choferSeleccionado);
      setEditandoConductor(false);
      toast.success(`Rótulo generado: ${data.codigo_rotulo || 'OK'}`);
      await listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  // Previsualiza el cambio de conductor en el preview (sin persistir).
  // Usado por el onChange del <select> durante la edición.
  const previsualizarCambioChofer = (choferId) => {
    setChoferSeleccionado(choferId);
    if (!rotuloData) return;
    const chofer = resolverChofer(choferes, choferId);
    setRotuloData((prev) => ({
      ...prev,
      remitente_nombre: chofer?.nombres || '',
      remitente_dni: chofer?.dni || '',
      remitente_telefono: chofer?.telefono || '',
    }));
  };

  // Previsualiza en el rótulo los datos del conductor externo mientras se tipean.
  const previsualizarDatoExterno = (campo, valor) => {
    setDatosExterno((prev) => {
      const actualizado = { ...prev, [campo]: valor };
      if (rotuloData) {
        setRotuloData((r) => ({
          ...r,
          es_externo: true,
          remitente_nombre: actualizado.nombre,
          remitente_dni: actualizado.dni,
          remitente_telefono: actualizado.telefono,
        }));
      }
      return actualizado;
    });
  };

  // Persiste el cambio de conductor del rótulo existente (PUT /almacen/:id/rotulo).
  const persistirCambioChofer = async () => {
    if (!ventaParaRotulo || guardandoChofer) return;
    if (conductorExterno) {
      if (!externoCompleto(datosExterno)) {
        toast.error('Complete nombre, DNI y teléfono del conductor externo');
        return;
      }
    } else if (!choferSeleccionado) {
      toast.error('Debe seleccionar un conductor');
      return;
    }
    setGuardandoChofer(true);
    try {
      const payload = conductorExterno
        ? { chofer_externo: { nombre: datosExterno.nombre.trim(), dni: datosExterno.dni.trim(), telefono: datosExterno.telefono.trim() } }
        : { chofer_user_id: choferSeleccionado };
      const { data } = await api.put(`/almacen/${ventaParaRotulo.id}/rotulo`, payload);
      setRotuloData(rotuloDesdeRespuesta(data, ventaParaRotulo.id).rotulo);
      setChoferPrevioEdicion(choferSeleccionado);
      setEditandoConductor(false);
      toast.success('Conductor actualizado');
      await listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al actualizar conductor');
    } finally {
      setGuardandoChofer(false);
    }
  };

  // Cancela la edición del conductor y restaura el preview al valor anterior.
  const cancelarEdicionChofer = () => {
    setChoferSeleccionado(choferPrevioEdicion);
    // Restaura desde rotuloData: conserva el conductor (interno o externo) previo.
    const eraExterno = rotuloData?.es_externo;
    setConductorExterno(!!eraExterno);
    if (eraExterno) {
      setDatosExterno({
        nombre: rotuloData?.remitente_nombre || '',
        dni: rotuloData?.remitente_dni || '',
        telefono: rotuloData?.remitente_telefono || '',
      });
    } else {
      const chofer = resolverChofer(choferes, choferPrevioEdicion);
      if (rotuloData) {
        setRotuloData((prev) => ({
          ...prev,
          es_externo: false,
          remitente_nombre: chofer?.nombres || '',
          remitente_dni: chofer?.dni || '',
          remitente_telefono: chofer?.telefono || '',
        }));
      }
    }
    setEditandoConductor(false);
  };

  // Alterna entre conductor interno (catálogo) y externo (datos manuales),
  // limpiando el estado del modo que se abandona y refrescando el preview.
  const alternarTipoConductor = (esExterno) => {
    setConductorExterno(esExterno);
    if (esExterno) {
      setChoferSeleccionado('');
      if (rotuloData) {
        setRotuloData((prev) => ({
          ...prev, es_externo: true,
          remitente_nombre: datosExterno.nombre, remitente_dni: datosExterno.dni, remitente_telefono: datosExterno.telefono,
        }));
      }
    } else {
      if (rotuloData) {
        setRotuloData((prev) => ({
          ...prev, es_externo: false,
          remitente_nombre: '', remitente_dni: '', remitente_telefono: '',
        }));
      }
    }
  };

  // ¿Hay conductor válido (interno seleccionado o externo completo)?
  const tieneConductorAsignado = conductorExterno ? externoCompleto(datosExterno) : !!choferSeleccionado;

  // Toggle interno/externo + selector o inputs. Reutilizado en crear y editar.
  const renderSelectorConductor = (deshabilitado) => (
    <>
      <div className="flex gap-4 mb-2 text-xs text-steel-700">
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="radio" checked={!conductorExterno} onChange={() => alternarTipoConductor(false)} disabled={deshabilitado} />
          De la empresa
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="radio" checked={conductorExterno} onChange={() => alternarTipoConductor(true)} disabled={deshabilitado} />
          Externo (app/tercerizado)
        </label>
      </div>
      {conductorExterno ? (
        <div className="space-y-2">
          <input className="input-field text-sm" placeholder="Nombre del conductor *" value={datosExterno.nombre}
            onChange={(e) => previsualizarDatoExterno('nombre', e.target.value)} disabled={deshabilitado} />
          <input className="input-field text-sm" placeholder="DNI *" value={datosExterno.dni}
            onChange={(e) => previsualizarDatoExterno('dni', e.target.value)} disabled={deshabilitado} />
          <input className="input-field text-sm" placeholder="Teléfono *" value={datosExterno.telefono}
            onChange={(e) => previsualizarDatoExterno('telefono', e.target.value)} disabled={deshabilitado} />
        </div>
      ) : (
        <select className="input-field text-sm" value={choferSeleccionado}
          onChange={(e) => previsualizarCambioChofer(e.target.value)} disabled={deshabilitado}>
          <option value="">-- Seleccionar conductor --</option>
          {choferes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombres}{c.dni ? ` (DNI: ${c.dni})` : ''}{c.telefono ? ` — ${TELEFONO_INPUT.format(c.telefono)}` : ''}
            </option>
          ))}
        </select>
      )}
      <p className="text-[10px] text-blue-600 mt-1">
        {conductorExterno
          ? 'Registre los datos del conductor externo. Almacén completa el envío y la entrega en agencia.'
          : 'Los datos del conductor se usarán como remitente en el rótulo'}
      </p>
    </>
  );

  // Imprime el rótulo actual vía Bluetooth. Devuelve true cuando el hook
  // confirma el envío real; el toast lo muestra el panel BluetoothPrinterPanel.
  const imprimirRotuloBluetooth = async () => {
    try {
      const datos = bluetooth.driver.generarRotuloVenta(
        rotuloData,
        { formato: formatoSeleccionado },
      );
      return await bluetooth.enviarDatos(datos);
    } catch (err) {
      toast.error('Error al generar rótulo: ' + (err.message || ''));
      return false;
    }
  };

  const abrirSubirFoto = (venta) => {
    setVentaFoto(venta);
    setArchivoFoto(null);
    setPreviewFoto(null);
    setModalFoto(true);
  };

  const subirFotoPaquete = async (e) => {
    e.preventDefault();
    if (!archivoFoto || !ventaFoto || subiendoFoto) return;
    setSubiendoFoto(true);
    const formData = new FormData();
    formData.append('foto', archivoFoto);
    try {
      await api.post(`/almacen/${ventaFoto.id}/foto-paquete`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Foto de paquete subida');
      setModalFoto(false);
      await listar();
    } catch (err) { toast.error(err.response?.data?.error || 'Error al subir foto'); }
    finally { setSubiendoFoto(false); }
  };

  const handleFoto = (e) => {
    const file = e.target.files[0];
    setArchivoFoto(file);
    if (file) setPreviewFoto(URL.createObjectURL(file));
    else setPreviewFoto(null);
  };

  // =========================================================================
  // Retiro en tienda
  // =========================================================================

  const abrirRetiroTienda = (venta) => {
    setVentaRetiro(venta);
    setArchivoRetiro(null);
    setPreviewRetiro(null);
    setCostoPariRetiro('');
    setModalRetiro(true);
  };

  const handleFotoRetiro = (e) => {
    const file = e.target.files[0];
    setArchivoRetiro(file);
    if (file) setPreviewRetiro(URL.createObjectURL(file));
    else setPreviewRetiro(null);
  };

  const confirmarRetiroTienda = async (e) => {
    e.preventDefault();
    if (!ventaRetiro || enviandoRetiro) return;
    if (!archivoRetiro) {
      toast.error('Debe subir una foto de entrega');
      return;
    }
    setEnviandoRetiro(true);
    const formData = new FormData();
    formData.append('costo_parihuela', costoPariRetiro || '0');
    formData.append('foto', archivoRetiro);
    try {
      await api.post(`/almacen/${ventaRetiro.id}/confirmar-retiro-tienda`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Retiro en tienda confirmado');
      setModalRetiro(false);
      await listar();
    } catch (err) { toast.error(err.response?.data?.error || 'Error al confirmar retiro'); }
    finally { setEnviandoRetiro(false); }
  };

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div>
      <h1 className="text-2xl font-bold text-steel-100 font-display tracking-wider mb-6">Bandeja de Despacho</h1>

      {/* Filtros: buscador + estado tracking */}
      <div className="card mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full sm:w-auto">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-500" />
            <input
              type="text"
              className="input-field pl-9 w-full text-sm"
              placeholder="Buscar por N° venta, cliente, tipo entrega..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-500 hover:text-steel-300 text-xs">✕</button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <HiOutlineFilter className="w-4 h-4 text-steel-500" />
            <select className="input-field w-auto text-sm" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value={ESTADO_TRACKING.PEDIDO_REGISTRADO}>Pedido Registrado</option>
              <option value={ESTADO_TRACKING.ALMACEN}>En Almacén</option>
              <option value={ESTADO_TRACKING.EN_RUTA_A_AGENCIA}>En Ruta a Agencia</option>
              <option value={ESTADO_TRACKING.DEJADO_EN_AGENCIA}>En Agencia</option>
            </select>
            {(filtroEstado || busqueda) && (
              <button onClick={() => { setFiltroEstado(''); setBusqueda(''); }} className="text-xs text-red-600 hover:text-red-700">Limpiar</button>
            )}
          </div>
        </div>
        {busqueda && (
          <p className="text-xs text-steel-500 mt-2">{datosFiltrados.length} resultado{datosFiltrados.length !== 1 ? 's' : ''}</p>
        )}
      </div>

      <div className="card">
        <TablaGenerica columnas={columnas} datos={datosPaginados} cargando={cargando}
          ordenColumna={ordenColumna} ordenDireccion={ordenDireccion} onOrdenar={handleOrdenar}
          acciones={(fila) => {
            const cobertura = calcularCobertura(fila);
            const incompleta = !cobertura.completa;
            const empaquetado = todoEmpaquetado(fila);
            const tooltipIncompleta = incompleta ? `Venta incompleta. Faltan: ${formatearFaltantesCorto(cobertura)}` : '';
            return (
            <div className="flex gap-1 flex-wrap">
              {/* R1: Asignar unidades (visible cuando faltan asignaciones) */}
              {incompleta && (
                <button onClick={() => abrirAsignarUnidades(fila)}
                  className="text-xs bg-amber-100 text-amber-600 px-2 py-1 rounded hover:bg-amber-200 flex items-center gap-1 font-medium"
                  title="Asignar unidades específicas">
                  <HiOutlineCube className="w-3.5 h-3.5" /> Asignar
                </button>
              )}
              {!empaquetado && fila.estado_tracking !== ESTADO_TRACKING.EN_RUTA_A_AGENCIA && fila.estado_tracking !== ESTADO_TRACKING.DEJADO_EN_AGENCIA && (
                <button onClick={() => setConfirmEmpaque(fila.id)}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 flex items-center gap-1"
                  title={incompleta ? `${tooltipIncompleta} — se empaca lo asignado, el chofer completa en viaje` : 'Confirmar empaque'}>
                  <HiOutlineClipboardCheck className="w-3.5 h-3.5" /> Empaque
                </button>
              )}
              <button onClick={() => abrirGenerarRotulo(fila)}
                className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded hover:bg-purple-200 flex items-center gap-1"
                title={incompleta ? `${tooltipIncompleta} — el chofer completa en viaje` : 'Generar rótulo'}>
                <HiOutlineTag className="w-3.5 h-3.5" /> Rótulo
              </button>
              {fila.estado_tracking !== ESTADO_TRACKING.EN_RUTA_A_AGENCIA && fila.estado_tracking !== ESTADO_TRACKING.DEJADO_EN_AGENCIA && (
                <button onClick={() => abrirSubirFoto(fila)}
                  className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 flex items-center gap-1"
                  title="Foto paquete">
                  <HiOutlineCamera className="w-3.5 h-3.5" /> Foto
                </button>
              )}
              {fila.estado_tracking === ESTADO_TRACKING.ALMACEN && fila.tipo_entrega === TIPO_ENTREGA.ENVIO_POR_AGENCIA && (
                <button onClick={() => abrirModalEnviar(fila)}
                  className="text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded hover:bg-cyan-200 flex items-center gap-1 font-medium"
                  title={incompleta ? `${tooltipIncompleta} — el chofer completará en viaje` : 'Escanear rótulo y enviar a chofer'}>
                  <HiOutlineTruck className="w-3.5 h-3.5" /> Enviar
                </button>
              )}
              {fila.tipo_entrega === TIPO_ENTREGA.RETIRO_EN_TIENDA && (fila.estado_tracking === ESTADO_TRACKING.ALMACEN || fila.estado_tracking === ESTADO_TRACKING.EN_RUTA_A_AGENCIA) && (
                <button onClick={() => abrirRetiroTienda(fila)}
                  className="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded hover:bg-emerald-200 flex items-center gap-1 font-medium"
                  title={incompleta ? `${tooltipIncompleta} — el chofer debe completar primero` : 'Confirmar retiro en tienda'}>
                  <HiOutlineShoppingBag className="w-3.5 h-3.5" /> Entregar
                </button>
              )}
            </div>
            );
          }}
        />
        <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onChange={irAPagina} />
      </div>

      {/* ================================================================= */}
      {/* R1: MODAL ASIGNAR UNIDADES                                        */}
      {/* ================================================================= */}
      <Modal
        abierto={modalAsignar}
        cerrar={cerrarModalAsignar}
        titulo={`Asignar Unidades - Venta #${ventaAsignar?.id || ''}`}
        ancho="max-w-3xl"
      >
        {cargandoAsignar ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* ── Selector de almacén de origen ── */}
            <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wider">
                <HiOutlineOfficeBuilding className="w-4 h-4" />
                Almacén de origen *
              </label>
              <select
                className="input-field text-sm"
                value={almacenAsignar}
                onChange={(e) => cargarUnidadesPorAlmacen(e.target.value)}
              >
                <option value="">-- Seleccionar almacén --</option>
                {almacenes.filter(a => a.activo).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}{a.direccion ? ` — ${a.direccion}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {!almacenAsignar && (
              <p className="text-sm text-steel-400 text-center py-4">
                Selecciona un almacén para ver las unidades disponibles
              </p>
            )}

            {almacenAsignar && <>
            <p className="text-sm text-steel-400">
              Selecciona las unidades manualmente o escanea el código de barras de cada producto.
            </p>

            {/* Advertencia de stock insuficiente */}
            {itemsAsignar.some(item => {
              const previas = item.asignaciones_unidad?.length || 0;
              return item.unidadesDisponibles.length < (item.cantidad - previas);
            }) && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-400 rounded-lg p-3">
                <HiOutlineExclamation className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-700">Stock insuficiente en este almacén</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Algunos productos no tienen suficientes unidades. Puede asignar las disponibles y se notificará para completar desde otro almacén.
                  </p>
                </div>
              </div>
            )}

            {/* ── Scanner de código de barras ── */}
            <div className="bg-steel-900/40 border border-steel-700/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <HiOutlineQrcode className="w-4 h-4 text-primary-400" />
                <span className="text-xs font-semibold text-steel-300 uppercase tracking-wider">Escanear código de barras</span>
              </div>
              <form onSubmit={handleScanManual} className="flex gap-2">
                <input
                  ref={inputScanRef}
                  type="text"
                  className="input-field text-sm flex-1"
                  placeholder="Escanea o escribe el código de barras..."
                  value={codigoManualAsignar}
                  onChange={(e) => setCodigoManualAsignar(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="btn-primary text-xs px-3 whitespace-nowrap">
                  Buscar
                </button>
                <button
                  type="button"
                  onClick={scanAsignarActivo ? detenerScannerAsignar : iniciarScannerAsignar}
                  className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium transition-colors whitespace-nowrap ${
                    scanAsignarActivo
                      ? 'bg-red-500/15 text-red-600 border border-red-500/30 hover:bg-red-500/25'
                      : 'bg-steel-700 text-steel-300 hover:bg-steel-600'
                  }`}
                >
                  <HiOutlineCamera className="w-3.5 h-3.5" />
                  {scanAsignarActivo ? 'Detener' : 'Cámara'}
                </button>
              </form>

              {/* Visor de cámara */}
              <div
                ref={scannerAsignarContainerRef}
                className={`w-full rounded-lg overflow-hidden bg-steel-900 ${scanAsignarActivo ? 'border border-steel-700' : ''}`}
                style={scanAsignarActivo ? { maxHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center' } : undefined}
              />
              {scanAsignarActivo && (
                <p className="text-center text-[11px] text-primary-400 font-medium tracking-wide animate-pulse">
                  Centra el codigo de barras dentro del recuadro
                </p>
              )}
            </div>

            {itemsAsignar.map((item) => {
              const seleccionadas = asignaciones[item.id] || [];
              const completo = seleccionadas.length === item.cantidad;

              return (
                <div key={item.id} className={`border rounded-lg p-3 ${
                  completo ? 'border-emerald-600/50 bg-emerald-50' : 'border-steel-700'
                }`}>
                  {/* Header del item */}
                  <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{item.tbl_productos?.nombre || `Producto #${item.product_id}`}</span>
                      <span className="text-xs bg-steel-800 text-steel-300 px-2 py-0.5 rounded">×{item.cantidad}</span>
                      {item.es_regalo && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[10px] font-bold">
                          <HiOutlineGift className="w-3 h-3" /> REGALO
                        </span>
                      )}
                    </div>
                    <span className={`text-xs font-medium ${completo ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {seleccionadas.length}/{item.cantidad}
                    </span>
                  </div>

                  {/* Lista de unidades disponibles */}
                  {item.unidadesDisponibles.length > 0 ? (
                    <div className="max-h-36 overflow-y-auto border border-steel-700/50 rounded bg-steel-900/30">
                      {item.unidadesDisponibles.map((u) => {
                        const sel = seleccionadas.includes(u.id);
                        const limiteAlcanzado = seleccionadas.length >= item.cantidad && !sel;
                        return (
                          <label
                            key={u.id}
                            className={`flex items-center gap-2 px-3 py-1.5 text-xs border-b border-steel-900/30 last:border-0 ${
                              limiteAlcanzado ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-steel-800/50'
                            } ${sel ? 'bg-primary-900/20' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={sel}
                              disabled={limiteAlcanzado}
                              onChange={() => toggleUnidadAsignacion(item.id, u.id, item.cantidad)}
                              className="rounded border-steel-600 text-primary-500 focus:ring-primary-500 disabled:opacity-40"
                            />
                            <span className="font-mono font-medium">{u.serial}</span>
                            {u.codigo_barras && (
                              <span className="text-steel-500">CB: {u.codigo_barras}</span>
                            )}
                            <span className="ml-auto text-steel-400">
                              Costo: {formatearMoneda(u.costo_unitario)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                      No hay unidades disponibles para este producto.
                    </p>
                  )}
                </div>
              );
            })}

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-3 border-t border-steel-700">
              <button
                type="button"
                onClick={cerrarModalAsignar}
                className="btn-secondary"
                disabled={enviandoAsignacion}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => enviarAsignaciones()}
                className="btn-primary flex items-center gap-2"
                disabled={enviandoAsignacion || !almacenAsignar}
              >
                {enviandoAsignacion ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Asignando...
                  </>
                ) : (
                  <>
                    <HiOutlineCube className="w-4 h-4" />
                    Confirmar Asignación
                  </>
                )}
              </button>
            </div>
            </>}
          </div>
        )}
      </Modal>

      {/* Dialog confirmar empaque */}
      <DialogConfirmacion abierto={!!confirmEmpaque} titulo="Confirmar Empaque"
        mensaje={`¿Confirmar empaque de la venta #${confirmEmpaque}?`}
        onConfirmar={confirmarEmpaque} onCancelar={() => setConfirmEmpaque(null)} tipo="info" />

      {/* Dialog confirmación de asignación parcial (reemplaza window.confirm nativo) */}
      <DialogConfirmacion
        abierto={!!confirmParcial}
        titulo="Stock insuficiente en este almacén"
        mensaje={confirmParcial
          ? `Faltantes: ${confirmParcial.faltantesTexto}. Se notificará a administración y al vendedor para gestionar las unidades faltantes desde otro almacén. ¿Desea asignar las unidades disponibles?`
          : ''}
        onConfirmar={() => { setConfirmParcial(null); enviarAsignaciones(true); }}
        onCancelar={() => setConfirmParcial(null)}
        tipo="advertencia"
      />

      {/* Modal foto paquete */}
      <Modal abierto={modalFoto} cerrar={() => setModalFoto(false)} titulo={`Foto Paquete - Venta #${ventaFoto?.id || ''}`}>
        <form onSubmit={subirFotoPaquete} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">Foto del paquete</label>
            <input type="file" className="input-field" onChange={handleFoto} accept="image/*" required />
          </div>
          {previewFoto && (
            <div><img src={previewFoto} alt="Preview" className="w-full h-48 object-contain rounded-lg bg-steel-900/50" /></div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalFoto(false)} className="btn-secondary" disabled={subiendoFoto}>Cancelar</button>
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={subiendoFoto}>
              {subiendoFoto ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Subiendo foto...
                </>
              ) : (
                <>
                  <HiOutlineCamera className="w-4 h-4" /> Subir Foto
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Enviar a Chofer (Scanner de código de barras del rótulo) */}
      <Modal abierto={modalEnviar} cerrar={cerrarModalEnviar} titulo={`Enviar a Chofer - Venta #${ventaEnviar?.id || ''}`} ancho="max-w-lg">
        <div className="space-y-4">
          <p className="text-sm text-steel-400">
            Escanea el código de barras del rótulo de la <span className="font-semibold text-steel-200">Venta #{ventaEnviar?.id}</span> para enviar el paquete al chofer.
          </p>

          {!escaneando && !scanResultado && !scanError && !scanAlertaRetiro && (
            <div className="w-full rounded-lg bg-steel-900 border border-steel-700 flex items-center justify-center" style={{ minHeight: '250px' }}>
              <p className="text-steel-500 text-sm">Presiona "Iniciar Escáner" para activar la cámara</p>
            </div>
          )}
          <div
            ref={scannerContainerRef}
            className={`w-full rounded-lg overflow-hidden bg-steel-900 ${escaneando ? 'border border-steel-700' : ''}`}
          />
          {escaneando && (
            <p className="text-center text-[11px] text-primary-400 font-medium tracking-wide animate-pulse">
              Centra el codigo de barras dentro del recuadro
            </p>
          )}

          <div className="flex gap-3">
            {!escaneando && !scanResultado && !scanAlertaRetiro && (
              <button onClick={iniciarScanner} className="btn-primary flex items-center gap-2">
                <HiOutlineTruck className="w-4 h-4" />
                Iniciar Escáner
              </button>
            )}
            {escaneando && (
              <button onClick={detenerScanner} className="btn-secondary">
                Detener
              </button>
            )}
            {(scanResultado || scanError || scanAlertaRetiro) && (
              <button onClick={escanearOtro} className="btn-primary flex items-center gap-2">
                Escanear Otro
              </button>
            )}
          </div>

          {/* Resultado exitoso */}
          {scanResultado && (
            <div className="p-4 rounded-lg border bg-emerald-500/10 border-emerald-500/30">
              <div className="flex items-center gap-3 mb-2">
                <HiOutlineTruck className="w-8 h-8 text-emerald-600" />
                <div>
                  <p className="text-lg font-bold text-emerald-600">ENVIADO AL CHOFER</p>
                  <p className="text-steel-200 text-sm">{scanResultado.mensaje}</p>
                </div>
              </div>
              <div className="text-sm text-steel-300 space-y-1 mt-3 border-t border-steel-700 pt-3">
                <p><span className="text-steel-500">Venta:</span> #{scanResultado.venta?.id}</p>
                <p><span className="text-steel-500">Cliente:</span> {scanResultado.venta?.cliente}</p>
                <p><span className="text-steel-500">Rótulo:</span> {scanResultado.venta?.codigo_rotulo}</p>
                {scanResultado.venta?.items?.length > 0 && (
                  <p><span className="text-steel-500">Productos:</span> {scanResultado.venta.items.join(', ')}</p>
                )}
              </div>
            </div>
          )}

          {/* Alerta: pedido de retiro en tienda */}
          {scanAlertaRetiro && (
            <div className="p-4 rounded-lg border-2 bg-amber-500/10 border-amber-500/40">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-1.5 bg-amber-500/20 rounded-full flex-shrink-0">
                  <HiOutlineShoppingBag className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-base font-bold text-amber-600">Recojo en Tienda</p>
                  <p className="text-steel-300 text-sm mt-1">
                    Este pedido <strong>no se envía por agencia</strong>. El cliente lo recoge directamente en tienda.
                  </p>
                </div>
              </div>
              <div className="text-sm text-steel-300 space-y-1 border-t border-amber-500/20 pt-2 ml-12">
                <p><span className="text-steel-500">Venta:</span> <span className="font-bold">#{scanAlertaRetiro.ventaId}</span></p>
                <p><span className="text-steel-500">Cliente:</span> <span className="font-bold">{scanAlertaRetiro.cliente}</span></p>
              </div>
            </div>
          )}

          {/* Error */}
          {scanError && (
            <div className="p-4 rounded-lg border bg-red-500/10 border-red-500/30">
              <p className="text-red-600 font-medium">{scanError}</p>
              <button onClick={escanearOtro} className="mt-2 text-sm text-red-600 hover:text-red-700 underline">
                Intentar de nuevo
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Retiro en Tienda */}
      <Modal abierto={modalRetiro} cerrar={() => setModalRetiro(false)} titulo={`Retiro en Tienda - Venta #${ventaRetiro?.id || ''}`}>
        <form onSubmit={confirmarRetiroTienda} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">Costo de parihuela (S/)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input-field w-full"
              placeholder="0.00"
              value={costoPariRetiro}
              onChange={(e) => setCostoPariRetiro(e.target.value)}
            />
            <p className="text-xs text-steel-500 mt-1">Ingrese el costo de parihuela si aplica</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">Foto de entrega</label>
            <input type="file" className="input-field" onChange={handleFotoRetiro} accept="image/*" />
          </div>
          {previewRetiro && (
            <div><img src={previewRetiro} alt="Preview entrega" className="w-full h-48 object-contain rounded-lg bg-steel-900/50" /></div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalRetiro(false)} className="btn-secondary" disabled={enviandoRetiro}>Cancelar</button>
            <button type="submit" disabled={enviandoRetiro} className="btn-primary flex items-center gap-2">
              {enviandoRetiro ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <HiOutlineShoppingBag className="w-4 h-4" />}
              Confirmar Entrega
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Rótulo Imprimible */}
      <Modal abierto={modalRotulo} cerrar={() => { setModalRotulo(false); setVentaParaRotulo(null); setEditandoConductor(false); setChoferPrevioEdicion(''); setConductorExterno(false); setDatosExterno({ nombre: '', dni: '', telefono: '' }); }} titulo={`Rótulo de Venta${ventaParaRotulo ? ` #${ventaParaRotulo.id}` : ''}`} ancho="max-w-lg">
        <div className="space-y-4">
          {/* Selector de chofer */}
          <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wider">
              <HiOutlineUser className="w-4 h-4" />
              Conductor (remitente) *
            </label>

            {/* Modo CREAR: aún no existe rótulo → toggle + selector/inputs */}
            {!rotuloData && renderSelectorConductor(false)}

            {/* Modo LECTURA: rótulo ya existe + hay conductor asignado y no se está editando */}
            {rotuloData && !editandoConductor && tieneConductorAsignado && (
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs text-steel-700">
                  <p className="font-semibold text-steel-800 flex items-center gap-2">
                    {rotuloData.remitente_nombre || '-'}
                    {rotuloData.es_externo && (
                      <span className="text-[10px] font-bold uppercase bg-amber-500 text-white px-1.5 py-0.5 rounded">Externo</span>
                    )}
                  </p>
                  <p className="text-steel-600">
                    {rotuloData.remitente_dni ? `DNI: ${rotuloData.remitente_dni}` : 'Sin DNI'}
                    {rotuloData.remitente_telefono ? ` — Tel: ${TELEFONO_INPUT.format(rotuloData.remitente_telefono)}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setChoferPrevioEdicion(choferSeleccionado);
                    setEditandoConductor(true);
                  }}
                  className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 whitespace-nowrap"
                >
                  Editar conductor
                </button>
              </div>
            )}

            {/* Modo EDICIÓN: rótulo ya existe y el usuario está cambiando el conductor
                 (o aún no hay conductor asignado) → toggle + selector/inputs + Guardar/Cancelar */}
            {rotuloData && (editandoConductor || !tieneConductorAsignado) && (
              <>
                {renderSelectorConductor(guardandoChofer)}
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={persistirCambioChofer}
                    disabled={guardandoChofer || !tieneConductorAsignado}
                    className="btn-primary text-xs flex items-center gap-1 disabled:opacity-50"
                  >
                    {guardandoChofer ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Guardando...
                      </>
                    ) : 'Guardar conductor'}
                  </button>
                  {/* Solo mostrar "Cancelar" si había un conductor previo al que volver */}
                  {choferPrevioEdicion && (
                    <button
                      type="button"
                      onClick={cancelarEdicionChofer}
                      disabled={guardandoChofer}
                      className="btn-secondary text-xs"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Aviso informativo: venta incompleta (no bloquea, el chofer completa en viaje) */}
          {!rotuloData && ventaParaRotulo && (() => {
            const cov = calcularCobertura(ventaParaRotulo);
            if (cov.completa) return null;
            return (
              <div className="p-3 rounded-lg border-2 bg-amber-500/10 border-amber-500/40 text-sm">
                <p className="font-bold text-amber-500 mb-1">Venta incompleta — el chofer completará en viaje</p>
                <p className="text-steel-300 text-xs">
                  Faltan: <span className="text-amber-400 font-medium">{formatearFaltantesCorto(cov)}</span>.
                  Puede generar el rótulo y enviar; el chofer completa con Compra Nacional en ruta.
                </p>
              </div>
            );
          })()}

          {/* Botón generar rótulo (solo si aún no se generó) */}
          {!rotuloData && (
            <button
              onClick={generarRotulo}
              disabled={!tieneConductorAsignado}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <HiOutlineTag className="w-4 h-4" />
              Generar Rótulo
            </button>
          )}

          {/* Vista previa del rótulo */}
          {rotuloData && (
            <>
            <div id="rotulo-print" className="bg-white rounded-xl overflow-hidden border-2 border-steel-600">
              {/* Header con logo y datos legales de la empresa */}
              <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#DC2626' }}>
                <img src="/logo-rasec.png" alt="Logo" className="w-12 h-12 rounded-md bg-white p-0.5 object-contain shrink-0" />
                <div className="min-w-0">
                  <p className="text-white font-display text-xl tracking-wider leading-none">RASEC</p>
                  <p className="text-white/90 text-[10px] tracking-[0.08em] font-semibold leading-tight mt-0.5">
                    {rotuloData.empresa?.razon_social || 'MAQUINARIA RASEC S.A.C.'}
                  </p>
                  {rotuloData.empresa?.ruc && (
                    <p className="text-white/80 text-[10px] font-medium leading-tight">RUC: {rotuloData.empresa.ruc}</p>
                  )}
                  {rotuloData.empresa?.direccion && (
                    <p className="text-white/75 text-[9px] leading-tight">{rotuloData.empresa.direccion}</p>
                  )}
                </div>
              </div>

              {/* Código de venta */}
              <div className="bg-gray-50 px-4 py-2.5 text-center" style={{ borderBottom: '2.5px solid #1a1a1a' }}>
                <p className="text-[9px] uppercase tracking-[2px] text-gray-400 font-semibold">Código de Venta</p>
                <p className="text-[28px] font-display tracking-[4px] leading-tight" style={{ color: '#DC2626' }}>{rotuloData.codigo}</p>
              </div>

              {/* Remitente (datos del chofer) */}
              <div className="px-4 py-2.5 border-b border-gray-200">
                <p className="text-[9px] font-bold uppercase tracking-[1.5px] pb-0.5 mb-1.5 inline-block" style={{ color: '#DC2626', borderBottom: '1.5px solid #DC2626' }}>Remitente (quien envía)</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                  <div><span className="text-gray-400">Nombre: </span><span className="font-bold text-gray-900">{rotuloData.remitente_nombre || '-'}</span></div>
                  <div><span className="text-gray-400">DNI: </span><span className="font-bold text-gray-900">{rotuloData.remitente_dni || '-'}</span></div>
                  <div className="col-span-2"><span className="text-gray-400">Teléfono: </span><span className="font-bold text-gray-900">{TELEFONO_INPUT.format(rotuloData.remitente_telefono) || '-'}</span></div>
                </div>
              </div>

              {/* Destinatario */}
              <div className="px-4 py-2.5 border-b border-gray-200">
                <p className="text-[9px] font-bold uppercase tracking-[1.5px] pb-0.5 mb-1.5 inline-block" style={{ color: '#DC2626', borderBottom: '1.5px solid #DC2626' }}>Destinatario (quien recibe)</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                  <div><span className="text-gray-400">Nombre: </span><span className="font-bold text-gray-900">{rotuloData.destinatario_nombre || '-'}</span></div>
                  <div><span className="text-gray-400">DNI: </span><span className="font-bold text-gray-900">{rotuloData.destinatario_dni || '-'}</span></div>
                  {rotuloData.destinatario_razon_social && (
                    <div className="col-span-2"><span className="text-gray-400">Razón social: </span><span className="font-bold text-gray-900">{rotuloData.destinatario_razon_social}</span></div>
                  )}
                  {rotuloData.destinatario_documento && rotuloData.destinatario_documento !== rotuloData.destinatario_dni && (
                    <div className="col-span-2"><span className="text-gray-400">RUC / DNI: </span><span className="font-bold text-gray-900">{rotuloData.destinatario_documento}</span></div>
                  )}
                  <div className="col-span-2"><span className="text-gray-400">Teléfono: </span><span className="font-bold text-gray-900">{TELEFONO_INPUT.format(rotuloData.destinatario_telefono) || '-'}</span></div>
                  {rotuloData.destinatario_observacion && (
                    <div className="col-span-2"><span className="text-gray-400">Observación: </span><span className="font-bold text-gray-900">{rotuloData.destinatario_observacion}</span></div>
                  )}
                </div>
              </div>

              {/* Destino */}
              <div className="px-4 py-2.5" style={{ borderBottom: '2.5px solid #1a1a1a' }}>
                <p className="text-[9px] font-bold uppercase tracking-[1.5px] pb-0.5 mb-1.5 inline-block" style={{ color: '#DC2626', borderBottom: '1.5px solid #DC2626' }}>Destino</p>
                <div className="space-y-0.5 text-xs">
                  <div><span className="text-gray-400">Dirección: </span><span className="font-bold text-gray-900">{rotuloData.direccion_manual || rotuloData.direccion || '-'}{rotuloData.distrito ? `, ${rotuloData.distrito}` : ''}</span></div>
                  {(rotuloData.departamento || rotuloData.provincia) && (
                    <div><span className="text-gray-400">Departamento: </span><span className="font-bold text-gray-900">{rotuloData.departamento || ''}{rotuloData.provincia ? ` - ${rotuloData.provincia}` : ''}</span></div>
                  )}
                  {rotuloData.agencia_shalom && (
                    <div><span className="text-gray-400">Agencia: </span><span className="font-bold" style={{ color: '#DC2626' }}>{rotuloData.agencia_shalom}</span></div>
                  )}
                  {rotuloData.referencia && (
                    <div><span className="text-gray-400">Referencia: </span><span className="font-bold text-gray-900">{rotuloData.referencia}</span></div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-4 py-2.5 flex items-center justify-between">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">N° Venta</span>
                <span className="px-3 py-0.5 font-display text-lg tracking-wider text-white rounded" style={{ background: '#DC2626' }}>#{rotuloData.ventaId}</span>
              </div>

              {/* Código de barras en el modal */}
              <div className="bg-white px-4 py-3 text-center">
                <svg ref={barcodeRef} />
              </div>
            </div>

            {/* Botones de impresión */}
            <div className="space-y-2">
              <BluetoothPrinterPanel
                bluetooth={bluetooth}
                formatoSeleccionado={formatoSeleccionado}
                formatosDisponibles={formatosDisponibles}
                onCambiarFormato={cambiarFormato}
                onImprimir={imprimirRotuloBluetooth}
                imprimirLabel="Imprimir por Bluetooth"
              />

              {/* Impresión clásica (todos los navegadores) */}
              <button
              onClick={() => {
                const d = rotuloData;
                const logoUrl = window.location.origin + '/logo-rasec.png';
                const remNombre = esc(d.remitente_nombre) || '-';
                const remDni = esc(d.remitente_dni) || '-';
                const remTel = esc(TELEFONO_INPUT.format(d.remitente_telefono)) || '-';
                const destNombre = esc(d.destinatario_nombre) || '-';
                const destDni = esc(d.destinatario_dni) || '-';
                const destTel = esc(TELEFONO_INPUT.format(d.destinatario_telefono)) || '-';
                const destRazon = esc(d.destinatario_razon_social);
                // El documento solo se repite si aporta algo distinto al DNI ya impreso.
                const destDoc = d.destinatario_documento && d.destinatario_documento !== d.destinatario_dni
                  ? esc(d.destinatario_documento)
                  : '';
                const destObs = esc(d.destinatario_observacion);
                const empRazon = esc(d.empresa?.razon_social) || 'MAQUINARIA RASEC S.A.C.';
                const empRuc = esc(d.empresa?.ruc);
                const empDir = esc(d.empresa?.direccion);
                const dirCompleta = esc((d.direccion_manual || d.direccion || '-') + (d.distrito ? `, ${d.distrito}` : ''));
                const depto = esc((d.departamento || '') + (d.provincia ? ` - ${d.provincia}` : ''));
                const ventana = window.open('', '_blank');
                ventana.document.write(`<!DOCTYPE html><html><head><title>Rotulo Venta #${d.ventaId}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Barlow',Arial,sans-serif;margin:0 auto;color:#1a1a1a;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.label{border:2.5px solid #1a1a1a;max-width:100%}
.hdr{background:#DC2626;padding:clamp(8px,2vw,14px) clamp(10px,3vw,18px);display:flex;align-items:center;gap:clamp(8px,2vw,14px)}
.hdr img{width:clamp(36px,8vw,52px);height:clamp(36px,8vw,52px);border-radius:6px;background:#fff;padding:3px;object-fit:contain}
.brand{font-family:'Bebas Neue',Impact,sans-serif;font-size:clamp(16px,4vw,24px);color:#fff;letter-spacing:3px;line-height:1.05}
.brand-sub{font-size:clamp(8px,1.5vw,11px);color:rgba(255,255,255,.95);letter-spacing:.5px;font-weight:600;line-height:1.25;margin-top:2px}
.brand-doc{font-size:clamp(7px,1.3vw,10px);color:rgba(255,255,255,.9);font-weight:500;line-height:1.25}
.brand-dir{font-size:clamp(7px,1.2vw,9px);color:rgba(255,255,255,.8);line-height:1.25}
.code-box{text-align:center;padding:clamp(6px,1.5vw,10px) clamp(10px,3vw,18px) clamp(8px,2vw,12px);background:#f8f8f8;border-bottom:2.5px solid #1a1a1a}
.code-lbl{font-size:clamp(7px,1.2vw,9px);text-transform:uppercase;letter-spacing:2.5px;color:#999;font-weight:600}
.code-val{font-family:'Bebas Neue',monospace;font-size:clamp(22px,5vw,34px);letter-spacing:clamp(2px,0.8vw,5px);color:#DC2626;margin-top:2px}
.sec{padding:clamp(6px,1.5vw,10px) clamp(10px,3vw,18px) clamp(8px,2vw,12px);border-bottom:1px solid #e0e0e0}
.sec.last{border-bottom:2.5px solid #1a1a1a}
.sec-t{font-size:clamp(7px,1.2vw,9px);font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#DC2626;padding-bottom:3px;margin-bottom:7px;border-bottom:1.5px solid #DC2626;display:inline-block}
.row{display:flex;font-size:clamp(9px,1.8vw,12px);margin:3px 0;gap:8px;flex-wrap:wrap}
.lbl{color:#777;min-width:clamp(50px,12vw,68px);font-weight:500}
.val{font-weight:700;color:#1a1a1a;word-break:break-word}
.val.ac{color:#DC2626}
.ftr{padding:clamp(6px,1.5vw,10px) clamp(10px,3vw,18px);display:flex;justify-content:space-between;align-items:center;background:#f8f8f8;border-bottom:1px solid #e0e0e0}
.v-lbl{font-size:clamp(8px,1.4vw,10px);color:#999;text-transform:uppercase;letter-spacing:1.5px;font-weight:600}
.v-badge{background:#DC2626;color:#fff;padding:3px clamp(8px,2vw,14px);font-family:'Bebas Neue',sans-serif;font-size:clamp(14px,3vw,20px);letter-spacing:1.5px;border-radius:3px}
.bc{text-align:center;padding:clamp(6px,1.5vw,10px) clamp(10px,3vw,18px) clamp(10px,2vw,14px)}
.bc svg{max-width:100%;height:auto}
@media print{body{padding:0;margin:0 auto;width:100%}@page{margin:5mm}.label{border-width:1.5px}}
</style></head><body>
<div class="label">
<div class="hdr"><img src="${logoUrl}" alt="Logo"><div><div class="brand">RASEC</div><div class="brand-sub">${empRazon}</div>${empRuc ? `<div class="brand-doc">RUC: ${empRuc}</div>` : ''}${empDir ? `<div class="brand-dir">${empDir}</div>` : ''}</div></div>
<div class="code-box"><div class="code-lbl">Código de Venta</div><div class="code-val">${esc(d.codigo)}</div></div>
<div class="sec"><div class="sec-t">Remitente (quien envía)</div>
<div class="row"><span class="lbl">Nombre:</span><span class="val">${remNombre}</span></div>
<div class="row"><span class="lbl">DNI:</span><span class="val">${remDni}</span></div>
<div class="row"><span class="lbl">Teléfono:</span><span class="val">${remTel}</span></div></div>
<div class="sec"><div class="sec-t">Destinatario (quien recibe)</div>
<div class="row"><span class="lbl">Nombre:</span><span class="val">${destNombre}</span></div>
<div class="row"><span class="lbl">DNI:</span><span class="val">${destDni}</span></div>
${destRazon ? `<div class="row"><span class="lbl">Razón social:</span><span class="val">${destRazon}</span></div>` : ''}
${destDoc ? `<div class="row"><span class="lbl">RUC / DNI:</span><span class="val">${destDoc}</span></div>` : ''}
<div class="row"><span class="lbl">Teléfono:</span><span class="val">${destTel}</span></div>
${destObs ? `<div class="row"><span class="lbl">Observación:</span><span class="val">${destObs}</span></div>` : ''}</div>
<div class="sec last"><div class="sec-t">Destino</div>
<div class="row"><span class="lbl">Dirección:</span><span class="val">${dirCompleta}</span></div>
${depto ? `<div class="row"><span class="lbl">Depto:</span><span class="val">${depto}</span></div>` : ''}
${d.agencia_shalom ? `<div class="row"><span class="lbl">Agencia:</span><span class="val ac">${d.agencia_shalom}</span></div>` : ''}
${d.referencia ? `<div class="row"><span class="lbl">Ref:</span><span class="val">${d.referencia}</span></div>` : ''}</div>
<div class="ftr"><span class="v-lbl">N° Venta</span><span class="v-badge">#${d.ventaId}</span></div>
<div class="bc"><svg id="barcode"></svg></div>
</div>
<script>
try{JsBarcode("#barcode","${d.codigo}",{format:"CODE128",width:2,height:55,displayValue:true,fontSize:12,margin:5,font:"Barlow"})}catch(e){}
window.onload=function(){setTimeout(function(){window.print()},400)};
<\/script></body></html>`);
                ventana.document.close();
              }}
              className="btn-primary w-full"
            >
              Imprimir Rótulo (ventana)
            </button>
            </div>
            </>
          )}
        </div>
      </Modal>

    </div>
  );
}
