import { useState, useMemo } from 'react';
import {
  HiOutlineClipboardCheck,
  HiOutlineEye,
  HiOutlineFilter,
  HiOutlineQrcode,
  HiOutlineCheckCircle,
  HiOutlineOfficeBuilding,
  HiOutlinePrinter,
  HiOutlineTruck,
  HiOutlineExternalLink,
} from 'react-icons/hi';
import useCrud from '../../hooks/useCrud';
import usePaginacion from '../../hooks/usePaginacion';
import TablaGenerica from '../../components/ui/TablaGenerica';
import EstadoBadge from '../../components/ui/EstadoBadge';
import Modal from '../../components/ui/Modal';
import Paginacion from '../../components/ui/Paginacion';
import { formatearFecha, formatearMoneda } from '../../utils/formato';
import { ESTADO_COMPRA, TIPO_COMPRA } from '../../config/constants';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { imprimirRotulosProductos } from '../../utils/rotuloProducto';
import useBluetoothPrinter from '../../hooks/useBluetoothPrinter';
import useFormatoImpresion from '../../hooks/useFormatoImpresion';
import BluetoothPrinterPanel from '../../components/shared/BluetoothPrinterPanel';

/* ── Columnas tabla principal ── */
const columnas = [
  { key: 'id', label: 'ID' },
  { key: 'proveedor', label: 'Proveedor', render: (f) => f.tbl_proveedores?.nombre || '-' },
  { key: 'tipo_compra', label: 'Tipo', render: (f) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
      f.tipo_compra === TIPO_COMPRA.EXTERNA_ENVIO
        ? 'bg-orange-100 text-orange-700'
        : 'bg-steel-800 text-steel-300'
    }`}>
      {f.tipo_compra === TIPO_COMPRA.EXTERNA_ENVIO ? 'Externa envío' : 'Normal'}
    </span>
  )},
  { key: 'fecha_compra', label: 'Fecha', render: (f) => formatearFecha(f.fecha_compra) },
  { key: 'estado', label: 'Estado', render: (f) => <EstadoBadge estado={f.estado} /> },
  { key: 'items', label: 'Items', render: (f) => f.items?.length || 0 },
  {
    key: 'tomado_chofer', label: 'Tomas chofer', render: (f) => {
      if (f.tipo_compra !== TIPO_COMPRA.NORMAL) return '—';
      const tomado = f.total_tomado_chofer || 0;
      const pendiente = f.total_pendiente_ingreso || 0;
      if (tomado === 0) return <span className="text-xs text-steel-500">0 tomadas</span>;
      return (
        <div className="flex flex-col">
          <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium inline-block w-fit">
            {tomado} tomadas
          </span>
          <span className="text-[10px] text-steel-500 mt-0.5">({pendiente} por recibir)</span>
        </div>
      );
    },
  },
  {
    key: 'total', label: 'Total', render: (f) => {
      const total = f.items?.reduce((s, i) => s + (parseFloat(i.total_item) || 0), 0) || 0;
      return formatearMoneda(total);
    },
  },
];

export default function RecepcionCompras() {
  const { datos, cargando, listar } = useCrud('/compras');
  const { datos: almacenes } = useCrud('/almacenes?activo=true');
  const [filtro, setFiltro] = useState(ESTADO_COMPRA.REGISTRADA);

  const datosFiltrados = datos.filter((d) => !filtro || d.estado === filtro);
  const { datosPaginados, paginaActual, totalPaginas, irAPagina } = usePaginacion(datosFiltrados, 15);

  /* ── Estado del modal de ingreso ── */
  const [modalIngreso, setModalIngreso] = useState(false);
  const [compraSeleccionada, setCompraSeleccionada] = useState(null);
  const [itemsIngreso, setItemsIngreso] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [ingresoExitoso, setIngresoExitoso] = useState(false);
  const [almacenSeleccionado, setAlmacenSeleccionado] = useState('');

  /* ── Modal detalle (solo lectura para ingresadas) ── */
  const [modalDetalle, setModalDetalle] = useState(false);
  const [compraDetalle, setCompraDetalle] = useState(null);

  /* ── Impresión Bluetooth térmica ── */
  const bluetooth = useBluetoothPrinter();
  const { formatoSeleccionado, formatosDisponibles, cambiarFormato } = useFormatoImpresion(bluetooth.protocolo);
  const imprimirRotulosBT = async () => {
    if (!compraDetalle) return false;
    const { data, count } = bluetooth.driver.generarRotulosProductos(
      compraDetalle,
      { formato: formatoSeleccionado },
    );
    if (count === 0) {
      toast.error('No hay unidades con código de barras para imprimir');
      return false;
    }
    return bluetooth.enviarDatos(data);
  };

  /* ── Modal compra externa → envío ── */
  const [modalExterna, setModalExterna] = useState(false);
  const [compraExterna, setCompraExterna] = useState(null);
  const [itemsExterna, setItemsExterna] = useState([]);
  const [ventasDisponibles, setVentasDisponibles] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [enviandoExterna, setEnviandoExterna] = useState(false);
  const [externaExitosa, setExternaExitosa] = useState(false);
  const [cargandoVentas, setCargandoVentas] = useState(false);

  /* Contador de pendientes */
  const pendientes = useMemo(() => datos.filter((d) => d.estado === ESTADO_COMPRA.REGISTRADA).length, [datos]);

  /* ══════════════════════════════════════════════
     Abrir modal de ingreso (compra registrada normal)
     ══════════════════════════════════════════════ */
  const abrirIngreso = (compra) => {
    setCompraSeleccionada(compra);
    const items = (compra.items || []).map((item) => {
      // Fase 2: el chofer pudo haber tomado parte. Sólo ingresamos lo pendiente.
      const pendienteIngreso = typeof item.cantidad_pendiente_ingreso === 'number'
        ? item.cantidad_pendiente_ingreso
        : item.cantidad;
      const unidades = [];
      for (let i = 0; i < pendienteIngreso; i++) {
        unidades.push({ idx: i, serial: '', codigo_barras: '' });
      }
      return {
        ...item,
        cantidad_pendiente_ingreso: pendienteIngreso,
        cantidad_tomada_chofer: item.cantidad_tomada_chofer || 0,
        cantidad_recibida: pendienteIngreso,
        costo_unitario: item.costo_unitario_manual ? parseFloat(item.costo_unitario_manual) : 0,
        comentario_recepcion: '',
        unidades,
        confirmado: false,
      };
    });
    setItemsIngreso(items);
    setAlmacenSeleccionado('');
    setModalIngreso(true);
  };

  /* ── Abrir modal compra externa → envío ── */
  const abrirExterna = async (compra) => {
    setCompraExterna(compra);
    const items = (compra.items || []).map((item) => {
      const unidades = [];
      for (let i = 0; i < item.cantidad; i++) {
        unidades.push({ idx: i, serial: '', codigo_barras: '' });
      }
      return {
        ...item,
        costo_unitario: item.costo_unitario_manual ? parseFloat(item.costo_unitario_manual) : 0,
        unidades,
      };
    });
    setItemsExterna(items);
    setAsignaciones([]);
    setExternaExitosa(false);
    setModalExterna(true);

    // Cargar ventas disponibles para asignación
    setCargandoVentas(true);
    try {
      const { data } = await api.get('/compras/ventas-para-asignacion');
      setVentasDisponibles(data);
    } catch (err) {
      toast.error('Error al cargar ventas disponibles');
    }
    setCargandoVentas(false);
  };

  /* ── Abrir detalle solo lectura ── */
  const abrirDetalle = (compra) => {
    setCompraDetalle(compra);
    setModalDetalle(true);
  };

  /* ══════════════════════════════════════════════
     Handlers para el formulario de ingreso (normal)
     ══════════════════════════════════════════════ */
  const actualizarCantidadRecibida = (itemIdx, valor) => {
    setItemsIngreso((prev) => {
      const copia = [...prev];
      const pendiente = copia[itemIdx].cantidad_pendiente_ingreso ?? copia[itemIdx].cantidad;
      const cantNueva = Math.max(0, Math.min(pendiente, parseInt(valor) || 0));
      copia[itemIdx] = { ...copia[itemIdx], cantidad_recibida: cantNueva };
      const unidades = [];
      for (let i = 0; i < cantNueva; i++) {
        unidades.push(copia[itemIdx].unidades[i] || { idx: i, serial: '', codigo_barras: '' });
      }
      copia[itemIdx].unidades = unidades;
      return copia;
    });
  };

  const actualizarCostoUnitario = (itemIdx, valor) => {
    setItemsIngreso((prev) => {
      const copia = [...prev];
      copia[itemIdx] = { ...copia[itemIdx], costo_unitario: parseFloat(valor) || 0 };
      return copia;
    });
  };

  const actualizarUnidad = (itemIdx, unidadIdx, campo, valor) => {
    setItemsIngreso((prev) => {
      const copia = [...prev];
      const unidades = [...copia[itemIdx].unidades];
      unidades[unidadIdx] = { ...unidades[unidadIdx], [campo]: valor };
      copia[itemIdx] = { ...copia[itemIdx], unidades };
      return copia;
    });
  };

  const toggleConfirmado = (itemIdx) => {
    setItemsIngreso((prev) => {
      const copia = [...prev];
      copia[itemIdx] = { ...copia[itemIdx], confirmado: !copia[itemIdx].confirmado };
      return copia;
    });
  };

  const autoGenerarCodigos = (itemIdx) => {
    setItemsIngreso((prev) => {
      const copia = [...prev];
      const item = copia[itemIdx];
      const ts = Date.now().toString(36).toUpperCase();
      const unidades = item.unidades.map((u, i) => ({
        ...u,
        serial: u.serial || `SN-${item.product_id}-${ts}-${i + 1}`,
        codigo_barras: u.codigo_barras || `CB-${item.product_id}-${ts}-${i + 1}`,
      }));
      copia[itemIdx] = { ...item, unidades };
      return copia;
    });
  };

  /* ══════════════════════════════════════════════
     Handlers para compra externa
     ══════════════════════════════════════════════ */
  const actualizarCostoExterna = (itemIdx, valor) => {
    setItemsExterna((prev) => {
      const copia = [...prev];
      copia[itemIdx] = { ...copia[itemIdx], costo_unitario: parseFloat(valor) || 0 };
      return copia;
    });
  };

  const actualizarUnidadExterna = (itemIdx, unidadIdx, campo, valor) => {
    setItemsExterna((prev) => {
      const copia = [...prev];
      const unidades = [...copia[itemIdx].unidades];
      unidades[unidadIdx] = { ...unidades[unidadIdx], [campo]: valor };
      copia[itemIdx] = { ...copia[itemIdx], unidades };
      return copia;
    });
  };

  const autoGenerarCodigosExterna = (itemIdx) => {
    setItemsExterna((prev) => {
      const copia = [...prev];
      const item = copia[itemIdx];
      const ts = Date.now().toString(36).toUpperCase();
      const unidades = item.unidades.map((u, i) => ({
        ...u,
        serial: u.serial || `EXT-${item.product_id}-${ts}-${i + 1}`,
        codigo_barras: u.codigo_barras || `CBE-${item.product_id}-${ts}-${i + 1}`,
      }));
      copia[itemIdx] = { ...item, unidades };
      return copia;
    });
  };

  // Agregar asignación item_compra → venta
  const agregarAsignacion = (itemCompraId, productId) => {
    setAsignaciones(prev => [...prev, {
      item_compra_id: itemCompraId,
      product_id: productId,
      venta_id: '',
      item_venta_id: '',
      cantidad: 1,
    }]);
  };

  const actualizarAsignacion = (idx, campo, valor) => {
    setAsignaciones(prev => {
      const copia = [...prev];
      copia[idx] = { ...copia[idx], [campo]: valor };
      // Si cambia la venta, resetear item_venta_id
      if (campo === 'venta_id') {
        copia[idx].item_venta_id = '';
      }
      return copia;
    });
  };

  const eliminarAsignacion = (idx) => {
    setAsignaciones(prev => prev.filter((_, i) => i !== idx));
  };

  // Ventas que tienen items faltantes del mismo producto
  const ventasFiltradas = (productId) => {
    return ventasDisponibles.filter(v =>
      v.items_faltantes.some(iv => iv.product_id === productId)
    );
  };

  /* ══════════════════════════════════════════════
     Confirmar ingreso al almacén (normal)
     ══════════════════════════════════════════════ */
  const confirmarIngreso = async () => {
    if (!almacenSeleccionado) {
      toast.error('Debe seleccionar un almacén de destino');
      return;
    }
    const sinConfirmar = itemsIngreso.filter((i) => !i.confirmado && i.cantidad_recibida > 0);
    if (sinConfirmar.length > 0) {
      toast.error('Debes confirmar todos los productos antes de ingresar');
      return;
    }
    for (const item of itemsIngreso) {
      if (item.cantidad_recibida <= 0) continue;
      const nombre = item.tbl_productos?.nombre || 'Producto';
      if (item.cantidad_recibida !== item.cantidad_pendiente_ingreso && !item.comentario_recepcion?.trim()) {
        toast.error(`Debe agregar un comentario para "${nombre}" porque la cantidad recibida difiere de la pendiente`);
        return;
      }
      for (let i = 0; i < item.cantidad_recibida; i++) {
        const u = item.unidades[i];
        if (!u?.serial?.trim()) { toast.error(`Falta serial en unidad ${i + 1} de "${nombre}"`); return; }
        if (!u?.codigo_barras?.trim()) { toast.error(`Falta código de barras en unidad ${i + 1} de "${nombre}"`); return; }
      }
    }
    for (const item of itemsIngreso) {
      if (item.cantidad_recibida === 0 && item.cantidad_pendiente_ingreso > 0 && !item.comentario_recepcion?.trim()) {
        const nombre = item.tbl_productos?.nombre || 'Producto';
        toast.error(`Debe agregar un comentario para "${nombre}" porque no se recibió ninguna unidad`);
        return;
      }
    }
    const items_costos = itemsIngreso.filter((i) => i.cantidad_recibida > 0).map((i) => ({
      purchase_item_id: i.id, cantidad: i.cantidad_recibida, costo_unitario: i.costo_unitario,
      ...(i.cantidad_recibida !== i.cantidad_pendiente_ingreso && { comentario_recepcion: i.comentario_recepcion.trim() }),
    }));
    const unidades = [];
    for (const item of itemsIngreso) {
      for (let i = 0; i < item.cantidad_recibida; i++) {
        const u = item.unidades[i];
        unidades.push({ product_id: item.product_id, serial: u.serial.trim(), codigo_barras: u.codigo_barras.trim(), costo_unitario: item.costo_unitario });
      }
    }
    setEnviando(true);
    try {
      await api.post(`/compras/${compraSeleccionada.id}/ingresar`, { items_costos, unidades, almacen_id: parseInt(almacenSeleccionado) });
      toast.success(`Compra #${compraSeleccionada.id} ingresada al almacén - ${unidades.length} unidades registradas`);
      setIngresoExitoso(true);
      listar();
    } catch (err) { toast.error(err.response?.data?.error || 'Error al ingresar compra'); }
    setEnviando(false);
  };

  const cerrarModalIngreso = () => { setModalIngreso(false); setIngresoExitoso(false); };

  /* ══════════════════════════════════════════════
     Confirmar compra externa → envío
     ══════════════════════════════════════════════ */
  const confirmarExterna = async () => {
    // Validar asignaciones
    if (asignaciones.length === 0) {
      toast.error('Debe asignar al menos un item a una venta');
      return;
    }
    for (const asig of asignaciones) {
      if (!asig.venta_id || !asig.item_venta_id || !asig.cantidad) {
        toast.error('Complete todas las asignaciones (venta, item, cantidad)');
        return;
      }
    }
    // Validar seriales
    for (const item of itemsExterna) {
      for (let i = 0; i < item.cantidad; i++) {
        const u = item.unidades[i];
        const nombre = item.tbl_productos?.nombre || 'Producto';
        if (!u?.serial?.trim()) { toast.error(`Falta serial en unidad ${i + 1} de "${nombre}"`); return; }
        if (!u?.codigo_barras?.trim()) { toast.error(`Falta código de barras en unidad ${i + 1} de "${nombre}"`); return; }
      }
    }
    // Validar costos
    for (const item of itemsExterna) {
      if (!item.costo_unitario || item.costo_unitario <= 0) {
        toast.error(`Falta costo unitario para "${item.tbl_productos?.nombre || 'Producto'}"`);
        return;
      }
    }

    const items_costos = itemsExterna.map((i) => ({
      purchase_item_id: i.id, cantidad: i.cantidad, costo_unitario: i.costo_unitario,
    }));

    const unidades = [];
    for (const item of itemsExterna) {
      for (let i = 0; i < item.cantidad; i++) {
        const u = item.unidades[i];
        unidades.push({
          product_id: item.product_id,
          serial: u.serial.trim(),
          codigo_barras: u.codigo_barras.trim(),
          costo_unitario: item.costo_unitario,
        });
      }
    }

    const asignaciones_ventas = asignaciones.map(a => ({
      item_compra_id: a.item_compra_id,
      venta_id: parseInt(a.venta_id),
      item_venta_id: parseInt(a.item_venta_id),
      cantidad: parseInt(a.cantidad),
    }));

    setEnviandoExterna(true);
    try {
      const { data } = await api.post(`/compras/${compraExterna.id}/ingresar-a-envio`, {
        items_costos, unidades, asignaciones_ventas,
      });
      toast.success(data.mensaje);
      setExternaExitosa(true);
      listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al asignar compra a envío');
    }
    setEnviandoExterna(false);
  };

  /* ── Imprimir códigos de barras de unidades ingresadas ── */
  const imprimirCodigosBarras = () => {
    const unidadesImprimir = [];
    for (const item of itemsIngreso) {
      for (let i = 0; i < item.cantidad_recibida; i++) {
        const u = item.unidades[i];
        if (u?.codigo_barras) {
          unidadesImprimir.push({
            producto: item.tbl_productos?.nombre || `Producto #${item.product_id}`,
            serial: u.serial, codigo_barras: u.codigo_barras,
          });
        }
      }
    }
    if (unidadesImprimir.length === 0) return;
    const labelsHtml = unidadesImprimir.map((u, i) => `
      <div class="label">
        <div class="prod">${u.producto}</div>
        <svg id="bc-${i}" class="bc" data-code="${u.codigo_barras}"></svg>
        <div class="serial">SN: ${u.serial}</div>
      </div>
    `).join('');
    const ventana = window.open('', '_blank');
    ventana.document.write(`<!DOCTYPE html><html><head><title>Códigos de Barras - Compra #${compraSeleccionada?.id || ''}</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;padding:10px;-webkit-print-color-adjust:exact;print-color-adjust:exact}h1{font-size:14px;text-align:center;margin-bottom:10px;color:#333}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.label{border:1.5px solid #333;border-radius:4px;padding:8px 6px;text-align:center;page-break-inside:avoid}.prod{font-size:10px;font-weight:700;margin-bottom:4px;color:#111;text-transform:uppercase;line-height:1.2}.bc{display:block;margin:0 auto}.serial{font-size:9px;color:#555;margin-top:3px;font-family:monospace}@media print{@page{margin:5mm}h1{margin-bottom:6px}}</style></head><body>
<h1>Códigos de Barras — Compra #${compraSeleccionada?.id || ''}</h1>
<div class="grid">${labelsHtml}</div>
<script>document.querySelectorAll('.bc').forEach(function(svg){try{JsBarcode(svg,svg.dataset.code,{format:"CODE128",width:1.5,height:40,displayValue:true,fontSize:9,margin:2,font:"monospace"})}catch(e){}});window.onload=function(){setTimeout(function(){window.print()},500)};<\/script></body></html>`);
    ventana.document.close();
  };

  /* ── Totales ── */
  const totalDetalle = useMemo(() => {
    if (!compraDetalle?.items) return 0;
    return compraDetalle.items.reduce((s, i) => s + (parseFloat(i.total_item) || 0), 0);
  }, [compraDetalle]);

  const resumenIngreso = useMemo(() => {
    const totalUnidades = itemsIngreso.reduce((s, i) => s + i.cantidad_recibida, 0);
    const totalCosto = itemsIngreso.reduce((s, i) => s + (i.cantidad_recibida * i.costo_unitario), 0);
    const todosConfirmados = itemsIngreso.every((i) => i.confirmado || i.cantidad_recibida === 0);
    return { totalUnidades, totalCosto, todosConfirmados };
  }, [itemsIngreso]);

  const resumenExterna = useMemo(() => {
    const totalUnidades = itemsExterna.reduce((s, i) => s + i.cantidad, 0);
    const totalCosto = itemsExterna.reduce((s, i) => s + (i.cantidad * i.costo_unitario), 0);
    const totalAsignado = asignaciones.reduce((s, a) => s + (parseInt(a.cantidad) || 0), 0);
    return { totalUnidades, totalCosto, totalAsignado };
  }, [itemsExterna, asignaciones]);

  /* ════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════ */
  return (
    <div>
      {/* ── Encabezado ── */}
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-wider text-steel-100">
            Recepción de Compras
          </h1>
          <p className="text-sm text-steel-400 mt-1">
            Revisa, verifica y aprueba el ingreso de compras al almacén
          </p>
        </div>
        {pendientes > 0 && (
          <span className="bg-amber-500/15 text-amber-600 px-3 py-1.5 rounded-lg text-sm font-medium">
            {pendientes} pendiente{pendientes !== 1 ? 's' : ''} de ingreso
          </span>
        )}
      </div>

      {/* ── Filtro ── */}
      <div className="card mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-steel-300 shrink-0">
            <HiOutlineFilter className="w-5 h-5 text-steel-400" />
            <span>Filtrar:</span>
          </div>
          <select className="input-field w-auto text-sm pr-10" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todas</option>
            <option value={ESTADO_COMPRA.REGISTRADA}>Pendientes de ingreso</option>
            <option value={ESTADO_COMPRA.INGRESADA}>Ya ingresadas</option>
            <option value={ESTADO_COMPRA.ASIGNADA_A_ENVIO}>Asignadas a envío</option>
          </select>
          {filtro && (
            <button onClick={() => setFiltro('')} className="text-xs text-red-600 hover:text-red-700">Limpiar</button>
          )}
        </div>
      </div>

      {/* ── Tabla principal ── */}
      <div className="card">
        <TablaGenerica
          columnas={columnas}
          datos={datosPaginados}
          cargando={cargando}
          acciones={(fila) => (
            <div className="flex items-center gap-2">
              {fila.estado === ESTADO_COMPRA.REGISTRADA && fila.tipo_compra !== TIPO_COMPRA.EXTERNA_ENVIO && (
                <button onClick={() => abrirIngreso(fila)}
                  className="text-xs bg-emerald-100 text-emerald-600 px-2.5 py-1 rounded hover:bg-emerald-200 flex items-center gap-1 font-medium"
                  title="Verificar y aprobar ingreso">
                  <HiOutlineClipboardCheck className="w-3.5 h-3.5" /> Recibir
                </button>
              )}
              {fila.estado === ESTADO_COMPRA.REGISTRADA && fila.tipo_compra === TIPO_COMPRA.EXTERNA_ENVIO && (
                <button onClick={() => abrirExterna(fila)}
                  className="text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded hover:bg-orange-200 flex items-center gap-1 font-medium"
                  title="Asignar a envío">
                  <HiOutlineTruck className="w-3.5 h-3.5" /> Asignar a envío
                </button>
              )}
              {(fila.estado === ESTADO_COMPRA.INGRESADA || fila.estado === ESTADO_COMPRA.ASIGNADA_A_ENVIO) && (
                <button onClick={() => abrirDetalle(fila)}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1" title="Ver detalle">
                  <HiOutlineEye className="w-3.5 h-3.5" /> Ver
                </button>
              )}
            </div>
          )}
        />
        <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onChange={irAPagina} />
      </div>

      {/* ═══════════════════════════════════════════════════════════
         MODAL - INGRESO DE COMPRA NORMAL AL ALMACÉN
         ═══════════════════════════════════════════════════════════ */}
      <Modal abierto={modalIngreso} cerrar={() => !enviando && cerrarModalIngreso()}
        titulo={`Recepción Compra #${compraSeleccionada?.id || ''}`} ancho="max-w-4xl">
        {compraSeleccionada && ingresoExitoso ? (
          <div className="space-y-5 py-4">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 flex items-center justify-center mb-3">
                <HiOutlineCheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-steel-100">Compra ingresada exitosamente</h3>
              <p className="text-sm text-steel-400 mt-1">{resumenIngreso.totalUnidades} unidades registradas en el almacén</p>
            </div>
            <div className="bg-steel-900/30 rounded-lg p-4 border border-steel-700/50">
              <p className="text-xs text-steel-400 mb-3 font-semibold uppercase tracking-wider">Unidades registradas</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {itemsIngreso.filter(i => i.cantidad_recibida > 0).map((item) => (
                  <div key={item.id} className="text-sm">
                    <span className="text-steel-200 font-medium">{item.tbl_productos?.nombre}</span>
                    <span className="text-steel-500 ml-2">× {item.cantidad_recibida}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button onClick={cerrarModalIngreso} className="btn-secondary">Cerrar</button>
              <button onClick={imprimirCodigosBarras} className="btn-primary flex items-center gap-2">
                <HiOutlineQrcode className="w-4 h-4" /> Imprimir Códigos de Barras
              </button>
            </div>
          </div>
        ) : compraSeleccionada ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm bg-steel-900/30 rounded-lg p-3">
              <div><span className="text-steel-400">Proveedor:</span> <span className="font-medium text-steel-100">{compraSeleccionada.tbl_proveedores?.nombre || '-'}</span></div>
              <div><span className="text-steel-400">Fecha:</span> <span className="font-medium text-steel-100">{formatearFecha(compraSeleccionada.fecha_compra)}</span></div>
              <div><span className="text-steel-400">Items:</span> <span className="font-medium text-steel-100">{compraSeleccionada.items?.length || 0} productos</span></div>
            </div>

            <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wider">
                <HiOutlineOfficeBuilding className="w-4 h-4" /> Almacén de destino *
              </label>
              <select className="input-field text-sm" value={almacenSeleccionado} onChange={(e) => setAlmacenSeleccionado(e.target.value)}>
                <option value="">-- Seleccionar almacén --</option>
                {almacenes.filter(a => a.activo).map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre}{a.direccion ? ` — ${a.direccion}` : ''}</option>
                ))}
              </select>
            </div>

            {(compraSeleccionada?.total_tomado_chofer || 0) > 0 && (
              <div className="bg-orange-600 border border-orange-700 rounded-lg p-3 shadow-sm">
                <p className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                  Tomas previas del chofer
                </p>
                <p className="text-sm text-white font-medium">
                  El chofer tomó {compraSeleccionada.total_tomado_chofer} unidad(es) antes de ingresar al almacén.
                  Solo se registrarán las {compraSeleccionada.total_pendiente_ingreso} unidades restantes.
                </p>
              </div>
            )}

            <p className="text-xs text-steel-400 bg-steel-900/20 rounded p-2">
              Verifica cada producto, confirma la cantidad recibida e ingresa el código de barras y serial de cada unidad. Puedes usar "Auto-generar" si no tienes códigos físicos.
            </p>

            {itemsIngreso.map((item, itemIdx) => (
              <div key={item.id} className={`border rounded-lg overflow-hidden transition-colors ${item.confirmado ? 'border-emerald-600/50 bg-emerald-50' : 'border-steel-700'}`}>
                <div className="flex items-center justify-between p-3 bg-steel-900/30">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium text-steel-100">{item.tbl_productos?.nombre || `Producto #${item.product_id}`}</span>
                    <span className="text-xs bg-steel-800 text-steel-300 px-2 py-0.5 rounded">Comprado: {item.cantidad}</span>
                    {item.cantidad_tomada_chofer > 0 && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-medium">
                        Tomado chofer: {item.cantidad_tomada_chofer}
                      </span>
                    )}
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                      Por recibir: {item.cantidad_pendiente_ingreso}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.confirmado && <HiOutlineCheckCircle className="w-5 h-5 text-emerald-600" />}
                    <button type="button" onClick={() => toggleConfirmado(itemIdx)}
                      className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${item.confirmado ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-steel-700 text-steel-300 hover:bg-steel-600'}`}>
                      {item.confirmado ? 'Confirmado' : 'Confirmar'}
                    </button>
                  </div>
                </div>
                <div className="p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-steel-300 mb-1">Cantidad recibida</label>
                      <input type="number" min="0" className="input-field text-sm"
                        value={item.cantidad_recibida} onChange={(e) => actualizarCantidadRecibida(itemIdx, e.target.value)} disabled={item.confirmado} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-steel-300 mb-1">Costo unitario (S/)</label>
                      <input type="number" step="0.01" min="0" className="input-field text-sm"
                        value={item.costo_unitario} onChange={(e) => actualizarCostoUnitario(itemIdx, e.target.value)} disabled={item.confirmado} />
                    </div>
                  </div>
                  {item.cantidad_recibida !== item.cantidad_pendiente_ingreso && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                      <label className="block text-xs font-semibold text-amber-600 mb-1">
                        Comentario obligatorio (cantidad recibida: {item.cantidad_recibida} / pendiente: {item.cantidad_pendiente_ingreso}) *
                      </label>
                      <textarea
                        className="input-field text-sm w-full"
                        rows={2}
                        placeholder="Indique el motivo de la diferencia en la cantidad recibida..."
                        value={item.comentario_recepcion}
                        onChange={(e) => {
                          setItemsIngreso((prev) => {
                            const copia = [...prev];
                            copia[itemIdx] = { ...copia[itemIdx], comentario_recepcion: e.target.value };
                            return copia;
                          });
                        }}
                        disabled={item.confirmado}
                      />
                    </div>
                  )}
                  {item.cantidad_recibida > 0 && (
                    <div>
                      <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                        <label className="text-xs font-medium text-steel-300">Unidades ({item.cantidad_recibida})</label>
                        {!item.confirmado && (
                          <button type="button" onClick={() => autoGenerarCodigos(itemIdx)} className="text-[10px] text-primary-500 hover:text-primary-600 font-medium">Auto-generar vacíos</button>
                        )}
                      </div>
                      <div className="max-h-[250px] overflow-y-auto space-y-1.5">
                        <div className="grid grid-cols-[1.5rem_1fr_1fr] gap-2 mb-1 px-0.5">
                          <span className="text-[10px] text-steel-500 text-center">#</span>
                          <span className="text-[10px] text-steel-500 font-semibold uppercase">Serial</span>
                          <span className="text-[10px] text-steel-500 font-semibold uppercase flex items-center gap-1"><HiOutlineQrcode className="w-3 h-3" />Código de barras</span>
                        </div>
                        {item.unidades.map((u, uIdx) => (
                          <div key={uIdx} className="grid grid-cols-[1.5rem_1fr_1fr] gap-2 items-center">
                            <span className="text-xs text-steel-500 text-center shrink-0">{uIdx + 1}</span>
                            <input type="text" placeholder={`Serial ${uIdx + 1}`} className="input-field text-xs py-1.5"
                              value={u.serial} onChange={(e) => actualizarUnidad(itemIdx, uIdx, 'serial', e.target.value)} disabled={item.confirmado} />
                            <input type="text" placeholder={`Cód. barras ${uIdx + 1}`} className="input-field text-xs py-1.5"
                              value={u.codigo_barras} onChange={(e) => actualizarUnidad(itemIdx, uIdx, 'codigo_barras', e.target.value)} disabled={item.confirmado} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {item.cantidad_recibida === 0 && item.cantidad_recibida === item.cantidad && (
                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">No se recibieron unidades de este producto.</p>
                  )}
                </div>
              </div>
            ))}

            <div className="border-t border-steel-700 pt-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-steel-400">Total unidades a ingresar:</span><span className="font-medium text-steel-100">{resumenIngreso.totalUnidades}</span></div>
              <div className="flex justify-between text-sm"><span className="text-steel-400">Costo total:</span><span className="font-bold text-steel-100">{formatearMoneda(resumenIngreso.totalCosto)}</span></div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={cerrarModalIngreso} className="btn-secondary" disabled={enviando}>Cancelar</button>
              <button type="button" onClick={confirmarIngreso} className="btn-primary flex items-center gap-2"
                disabled={enviando || !resumenIngreso.todosConfirmados || resumenIngreso.totalUnidades === 0}>
                {enviando ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Ingresando...</>) : (<><HiOutlineClipboardCheck className="w-4 h-4" />Confirmar Ingreso al Almacén</>)}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ═══════════════════════════════════════════════════════════
         MODAL - COMPRA EXTERNA → ASIGNAR A ENVÍO
         ═══════════════════════════════════════════════════════════ */}
      <Modal abierto={modalExterna} cerrar={() => !enviandoExterna && setModalExterna(false)}
        titulo={`Compra Externa #${compraExterna?.id || ''} — Asignar a Envío`} ancho="max-w-5xl">
        {compraExterna && externaExitosa ? (
          <div className="space-y-5 py-4">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 flex items-center justify-center mb-3">
                <HiOutlineCheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-steel-100">Compra asignada a envío exitosamente</h3>
              <p className="text-sm text-steel-400 mt-1">Las unidades fueron vinculadas a las ventas seleccionadas</p>
            </div>
            <div className="flex justify-center pt-2">
              <button onClick={() => setModalExterna(false)} className="btn-secondary">Cerrar</button>
            </div>
          </div>
        ) : compraExterna ? (
          <div className="space-y-4">
            {/* Info compra */}
            <div className="grid grid-cols-3 gap-4 text-sm bg-steel-900/30 rounded-lg p-3">
              <div><span className="text-steel-400">Proveedor:</span> <span className="font-medium text-steel-100">{compraExterna.tbl_proveedores?.nombre || '-'}</span></div>
              <div><span className="text-steel-400">Fecha:</span> <span className="font-medium text-steel-100">{formatearFecha(compraExterna.fecha_compra)}</span></div>
              <div>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Compra externa para envío</span>
              </div>
            </div>

            {/* Items + costos + seriales */}
            <div>
              <h4 className="text-sm font-semibold text-steel-200 mb-2">Productos comprados</h4>
              {itemsExterna.map((item, itemIdx) => (
                <div key={item.id} className="border border-steel-700 rounded-lg overflow-hidden mb-3">
                  <div className="flex items-center justify-between p-3 bg-steel-900/30">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-steel-100">{item.tbl_productos?.nombre || `Producto #${item.product_id}`}</span>
                      <span className="text-xs bg-steel-800 text-steel-300 px-2 py-0.5 rounded">{item.cantidad} und.</span>
                    </div>
                    <button type="button" onClick={() => agregarAsignacion(item.id, item.product_id)}
                      className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200 font-medium flex items-center gap-1">
                      <HiOutlineExternalLink className="w-3 h-3" /> Asignar a venta
                    </button>
                  </div>
                  <div className="p-3 space-y-3">
                    <div className="w-48">
                      <label className="block text-xs font-medium text-steel-300 mb-1">Costo unitario (S/)</label>
                      <input type="number" step="0.01" min="0" className="input-field text-sm"
                        value={item.costo_unitario} onChange={(e) => actualizarCostoExterna(itemIdx, e.target.value)} />
                    </div>
                    <div>
                      <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                        <label className="text-xs font-medium text-steel-300">Unidades ({item.cantidad})</label>
                        <button type="button" onClick={() => autoGenerarCodigosExterna(itemIdx)} className="text-[10px] text-primary-500 hover:text-primary-600 font-medium">Auto-generar vacíos</button>
                      </div>
                      <div className="max-h-[200px] overflow-y-auto space-y-1.5">
                        <div className="grid grid-cols-[1.5rem_1fr_1fr] gap-2 mb-1 px-0.5">
                          <span className="text-[10px] text-steel-500 text-center">#</span>
                          <span className="text-[10px] text-steel-500 font-semibold uppercase">Serial</span>
                          <span className="text-[10px] text-steel-500 font-semibold uppercase flex items-center gap-1"><HiOutlineQrcode className="w-3 h-3" />Código de barras</span>
                        </div>
                        {item.unidades.map((u, uIdx) => (
                          <div key={uIdx} className="grid grid-cols-[1.5rem_1fr_1fr] gap-2 items-center">
                            <span className="text-xs text-steel-500 text-center">{uIdx + 1}</span>
                            <input type="text" placeholder={`Serial ${uIdx + 1}`} className="input-field text-xs py-1.5"
                              value={u.serial} onChange={(e) => actualizarUnidadExterna(itemIdx, uIdx, 'serial', e.target.value)} />
                            <input type="text" placeholder={`Cód. barras ${uIdx + 1}`} className="input-field text-xs py-1.5"
                              value={u.codigo_barras} onChange={(e) => actualizarUnidadExterna(itemIdx, uIdx, 'codigo_barras', e.target.value)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Asignaciones a ventas */}
            <div>
              <h4 className="text-sm font-semibold text-steel-200 mb-2">Asignaciones a ventas</h4>
              {cargandoVentas ? (
                <p className="text-sm text-steel-400">Cargando ventas disponibles...</p>
              ) : asignaciones.length === 0 ? (
                <p className="text-sm text-steel-500 bg-steel-900/20 rounded p-3">
                  No hay asignaciones aún. Use el botón "Asignar a venta" en cada producto.
                </p>
              ) : (
                <div className="space-y-2">
                  {asignaciones.map((asig, idx) => {
                    const itemCompra = itemsExterna.find(i => i.id === asig.item_compra_id);
                    const ventasFilt = ventasFiltradas(asig.product_id);
                    const ventaSel = ventasFilt.find(v => v.id === parseInt(asig.venta_id));
                    const itemsFaltantes = ventaSel?.items_faltantes.filter(iv => iv.product_id === asig.product_id) || [];

                    return (
                      <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_4rem_2rem] gap-2 items-center bg-steel-900/20 rounded-lg p-2">
                        <div className="text-xs text-steel-300 truncate" title={itemCompra?.tbl_productos?.nombre}>
                          {itemCompra?.tbl_productos?.nombre || 'Producto'}
                        </div>
                        <select className="input-field text-xs" value={asig.venta_id}
                          onChange={(e) => actualizarAsignacion(idx, 'venta_id', e.target.value)}>
                          <option value="">-- Venta --</option>
                          {ventasFilt.map(v => (
                            <option key={v.id} value={v.id}>Venta #{v.id} — {v.cliente}</option>
                          ))}
                        </select>
                        <select className="input-field text-xs" value={asig.item_venta_id}
                          onChange={(e) => actualizarAsignacion(idx, 'item_venta_id', e.target.value)} disabled={!asig.venta_id}>
                          <option value="">-- Item --</option>
                          {itemsFaltantes.map(iv => (
                            <option key={iv.id} value={iv.id}>{iv.producto_nombre} (falta {iv.cantidad_faltante})</option>
                          ))}
                        </select>
                        <input type="number" min="1" className="input-field text-xs" value={asig.cantidad}
                          onChange={(e) => actualizarAsignacion(idx, 'cantidad', e.target.value)} />
                        <button type="button" onClick={() => eliminarAsignacion(idx)} className="text-red-500 hover:text-red-600 text-lg font-bold">×</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Resumen */}
            <div className="border-t border-steel-700 pt-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-steel-400">Total unidades:</span><span className="font-medium text-steel-100">{resumenExterna.totalUnidades}</span></div>
              <div className="flex justify-between text-sm"><span className="text-steel-400">Unidades asignadas a ventas:</span><span className="font-medium text-steel-100">{resumenExterna.totalAsignado}</span></div>
              <div className="flex justify-between text-sm"><span className="text-steel-400">Costo total:</span><span className="font-bold text-steel-100">{formatearMoneda(resumenExterna.totalCosto)}</span></div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModalExterna(false)} className="btn-secondary" disabled={enviandoExterna}>Cancelar</button>
              <button type="button" onClick={confirmarExterna} className="btn-primary flex items-center gap-2"
                disabled={enviandoExterna || asignaciones.length === 0}>
                {enviandoExterna ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Procesando...</>) : (<><HiOutlineTruck className="w-4 h-4" />Asignar a Envío</>)}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ═══════════════════════════════════════════════════════════
         MODAL - DETALLE (solo lectura para ingresadas/asignadas)
         ═══════════════════════════════════════════════════════════ */}
      <Modal abierto={modalDetalle} cerrar={() => setModalDetalle(false)}
        titulo={`Compra #${compraDetalle?.id || ''}`} ancho="max-w-2xl">
        {compraDetalle && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-steel-400">Proveedor:</span> <span className="font-medium text-steel-100">{compraDetalle.tbl_proveedores?.nombre || '-'}</span></div>
              <div><span className="text-steel-400">Fecha:</span> <span className="font-medium text-steel-100">{formatearFecha(compraDetalle.fecha_compra)}</span></div>
              <div><span className="text-steel-400">Estado:</span> <EstadoBadge estado={compraDetalle.estado} /></div>
              <div><span className="text-steel-400">Tipo:</span> <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${compraDetalle.tipo_compra === TIPO_COMPRA.EXTERNA_ENVIO ? 'bg-orange-100 text-orange-700' : 'bg-steel-800 text-steel-300'}`}>{compraDetalle.tipo_compra === TIPO_COMPRA.EXTERNA_ENVIO ? 'Externa envío' : 'Normal'}</span></div>
              <div><span className="text-steel-400">Registrado por:</span> <span className="font-medium text-steel-100">{compraDetalle.tbl_usuarios?.nombres || '-'}</span></div>
            </div>

            <div className="overflow-x-auto border border-steel-700 rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-steel-900/50 border-b border-steel-700">
                    <th className="text-left py-2 px-3 font-semibold text-steel-300">Producto</th>
                    <th className="text-right py-2 px-3 font-semibold text-steel-300">Cantidad</th>
                    <th className="text-right py-2 px-3 font-semibold text-steel-300">Costo Unit.</th>
                    <th className="text-right py-2 px-3 font-semibold text-steel-300">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {compraDetalle.items?.map((item, idx) => (
                    <tr key={item.id || idx} className="border-b border-steel-700/50 last:border-0">
                      <td className="py-2 px-3">{item.tbl_productos?.nombre || `Producto #${item.product_id}`}</td>
                      <td className="py-2 px-3 text-right">{item.cantidad}</td>
                      <td className="py-2 px-3 text-right">{item.costo_unitario_manual ? formatearMoneda(item.costo_unitario_manual) : '-'}</td>
                      <td className="py-2 px-3 text-right font-medium">{formatearMoneda(item.total_item || 0)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-steel-900/50 border-t border-steel-700">
                    <td colSpan={3} className="py-2 px-3 text-right font-semibold text-steel-200">Total:</td>
                    <td className="py-2 px-3 text-right font-bold text-steel-100">{formatearMoneda(totalDetalle)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Ventas vinculadas (solo para compras externas) */}
            {compraDetalle.tipo_compra === TIPO_COMPRA.EXTERNA_ENVIO && compraDetalle.asignaciones_envio?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-steel-200 mb-2">Ventas vinculadas</h4>
                <div className="space-y-1">
                  {compraDetalle.asignaciones_envio.map((ae, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm bg-orange-500/10 rounded p-2">
                      <HiOutlineTruck className="w-4 h-4 text-orange-500" />
                      <span className="text-steel-200">Venta #{ae.venta_id}</span>
                      <span className="text-steel-500">— {ae.cantidad} und.</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {compraDetalle.tipo_compra !== TIPO_COMPRA.EXTERNA_ENVIO && (
              <div className="pt-2 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => imprimirRotulosProductos(compraDetalle)} className="btn-secondary flex items-center gap-2">
                    <HiOutlinePrinter className="w-4 h-4" /> Imprimir Rótulos (web)
                  </button>
                </div>
                <div className="border-t border-steel-700 pt-3">
                  <p className="text-xs text-steel-400 mb-2">Impresión por Bluetooth</p>
                  <BluetoothPrinterPanel
                    bluetooth={bluetooth}
                    formatoSeleccionado={formatoSeleccionado}
                    formatosDisponibles={formatosDisponibles}
                    onCambiarFormato={cambiarFormato}
                    onImprimir={imprimirRotulosBT}
                    imprimirLabel="Imprimir rótulos por Bluetooth"
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <button onClick={() => setModalDetalle(false)} className="btn-secondary">Cerrar</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
