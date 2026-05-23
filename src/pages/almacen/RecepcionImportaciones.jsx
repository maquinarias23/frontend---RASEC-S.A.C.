import { useState, useMemo } from 'react';
import {
  HiOutlineClipboardCheck,
  HiOutlineEye,
  HiOutlineFilter,
  HiOutlineQrcode,
  HiOutlineCheckCircle,
  HiOutlineOfficeBuilding,
  HiOutlinePrinter,
} from 'react-icons/hi';
import useCrud from '../../hooks/useCrud';
import usePaginacion from '../../hooks/usePaginacion';
import TablaGenerica from '../../components/ui/TablaGenerica';
import EstadoBadge from '../../components/ui/EstadoBadge';
import Modal from '../../components/ui/Modal';
import Paginacion from '../../components/ui/Paginacion';
import { formatearFecha, formatearMoneda } from '../../utils/formato';
import { ESTADO_IMPORTACION } from '../../config/constants';
import { imprimirRotulosProductos } from '../../utils/rotuloProducto';
import useBluetoothPrinter from '../../hooks/useBluetoothPrinter';
import useFormatoImpresion from '../../hooks/useFormatoImpresion';
import BluetoothPrinterPanel from '../../components/shared/BluetoothPrinterPanel';
import api from '../../api/axios';
import toast from 'react-hot-toast';

// Sentinel para el filtro: agrupa PROGRAMADA + RETRASADA bajo "Pendientes de ingreso"
// (coincide con el badge superior, que también las suma juntas).
const FILTRO_PENDIENTES = 'pendientes';

/* ── Columnas tabla principal ── */
const columnas = [
  { key: 'id', label: 'ID' },
  { key: 'nombre', label: 'Importacion', render: (f) => f.nombre || `#${f.id}` },
  { key: 'proveedor', label: 'Proveedor', render: (f) => f.tbl_proveedores?.nombre || '-' },
  { key: 'tipo', label: 'Tipo', render: (f) => f.tipo_producto?.nombre || '-' },
  {
    key: 'fecha_embarque',
    label: 'Embarque',
    render: (f) => formatearFecha(f.fecha_embarque),
  },
  { key: 'estado', label: 'Estado', render: (f) => <EstadoBadge estado={f.estado} /> },
  { key: 'items', label: 'Items', render: (f) => f.items?.length || 0 },
  {
    key: 'costo_total',
    label: 'Costo Total',
    render: (f) => {
      const total = (f.items || []).reduce((s, i) => s + (parseFloat(i.total_item) || 0), 0);
      return total > 0 ? formatearMoneda(total) : '-';
    },
  },
];

export default function RecepcionImportaciones() {
  const { datos, cargando, listar } = useCrud('/importaciones');
  const { datos: almacenes } = useCrud('/almacenes?activo=true');
  const [filtro, setFiltro] = useState(FILTRO_PENDIENTES);

  const datosFiltrados = datos.filter((d) => {
    if (!filtro) return true;
    if (filtro === FILTRO_PENDIENTES) {
      return d.estado === ESTADO_IMPORTACION.PROGRAMADA || d.estado === ESTADO_IMPORTACION.RETRASADA;
    }
    return d.estado === filtro;
  });
  const { datosPaginados, paginaActual, totalPaginas, irAPagina } = usePaginacion(datosFiltrados, 15);

  /* ── Estado del modal de ingreso ── */
  const [modalIngreso, setModalIngreso] = useState(false);
  const [importacionSeleccionada, setImportacionSeleccionada] = useState(null);
  const [itemsIngreso, setItemsIngreso] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [ingresoExitoso, setIngresoExitoso] = useState(false);
  const [almacenSeleccionado, setAlmacenSeleccionado] = useState('');

  /* ── Modal detalle (solo lectura para ingresadas) ── */
  const [modalDetalle, setModalDetalle] = useState(false);
  const [importacionDetalle, setImportacionDetalle] = useState(null);

  /* ── Impresión Bluetooth térmica ── */
  const bluetooth = useBluetoothPrinter();
  const { formatoSeleccionado, formatosDisponibles, cambiarFormato } = useFormatoImpresion(bluetooth.protocolo);
  const imprimirRotulosBT = async () => {
    if (!importacionDetalle) return false;
    const { data, count } = bluetooth.driver.generarRotulosProductos(
      importacionDetalle,
      { formato: formatoSeleccionado },
    );
    if (count === 0) {
      toast.error('No hay unidades con código de barras para imprimir');
      return false;
    }
    return bluetooth.enviarDatos(data);
  };

  /* Contador de pendientes */
  const pendientes = useMemo(
    () => datos.filter((d) => d.estado === ESTADO_IMPORTACION.PROGRAMADA || d.estado === ESTADO_IMPORTACION.RETRASADA).length,
    [datos]
  );

  /* ══════════════════════════════════════════════
     Abrir modal de ingreso (importacion programada)
     ══════════════════════════════════════════════ */
  const abrirIngreso = (importacion) => {
    setImportacionSeleccionada(importacion);

    const items = (importacion.items || []).map((item) => {
      const unidades = [];
      for (let i = 0; i < item.cantidad; i++) {
        unidades.push({ idx: i, serial: '', codigo_barras: '' });
      }
      return {
        ...item,
        cantidad_recibida: item.cantidad,
        costo_unitario: item.costo_unit_almacen_sol ? parseFloat(item.costo_unit_almacen_sol) : 0,
        comentario_recepcion: '',
        unidades,
        confirmado: false,
      };
    });

    setItemsIngreso(items);
    setAlmacenSeleccionado('');
    setModalIngreso(true);
  };

  /* ── Abrir detalle solo lectura ── */
  const abrirDetalle = (importacion) => {
    setImportacionDetalle(importacion);
    setModalDetalle(true);
  };

  /* ── Obtener nombre de producto ── */
  const obtenerNombreProducto = (item) => {
    if (item.tbl_productos?.nombre) return item.tbl_productos.nombre;
    return `Producto #${item.product_id}`;
  };

  /* ══════════════════════════════════════════════
     Handlers para el formulario de ingreso
     ══════════════════════════════════════════════ */
  const actualizarItemIngreso = (idx, campo, valor) => {
    setItemsIngreso((prev) => {
      const copia = [...prev];
      copia[idx] = {
        ...copia[idx],
        [campo]:
          campo === 'cantidad_recibida'
            ? Math.max(0, parseInt(valor) || 0)
            : campo === 'costo_unitario'
              ? (parseFloat(valor) || 0)
              : valor,
      };
      if (campo === 'cantidad_recibida') {
        const cantNueva = copia[idx].cantidad_recibida;
        const unidades = [];
        for (let i = 0; i < cantNueva; i++) {
          unidades.push(copia[idx].unidades[i] || { idx: i, serial: '', codigo_barras: '' });
        }
        copia[idx].unidades = unidades;
      }
      return copia;
    });
  };

  const actualizarUnidadIngreso = (itemIdx, uIdx, campo, valor) => {
    setItemsIngreso((prev) => {
      const copia = [...prev];
      const unidades = [...copia[itemIdx].unidades];
      unidades[uIdx] = { ...unidades[uIdx], [campo]: valor };
      copia[itemIdx] = { ...copia[itemIdx], unidades };
      return copia;
    });
  };

  const autoGenerarCodigosIngreso = (itemIdx) => {
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
     Confirmar ingreso al almacen
     ══════════════════════════════════════════════ */
  const ejecutarIngreso = async () => {
    if (!almacenSeleccionado) {
      toast.error('Debe seleccionar un almacén de destino');
      return;
    }

    const sinConfirmar = itemsIngreso.filter((i) => !i.confirmado && i.cantidad_recibida > 0);
    if (sinConfirmar.length > 0) {
      toast.error('Confirma todos los productos antes de ingresar');
      return;
    }
    for (const item of itemsIngreso) {
      const nombre = obtenerNombreProducto(item);
      if (item.cantidad_recibida !== item.cantidad && !item.comentario_recepcion?.trim()) {
        toast.error(`Debe agregar un comentario para "${nombre}" porque la cantidad recibida difiere de la esperada`);
        return;
      }
      if (item.cantidad_recibida <= 0) continue;
      for (let i = 0; i < item.cantidad_recibida; i++) {
        const u = item.unidades[i];
        if (!u?.serial?.trim()) {
          toast.error(`Falta serial en unidad ${i + 1} de "${nombre}"`);
          return;
        }
        if (!u?.codigo_barras?.trim()) {
          toast.error(`Falta codigo de barras en unidad ${i + 1} de "${nombre}"`);
          return;
        }
      }
    }

    const items_costos = itemsIngreso
      .filter((i) => i.cantidad_recibida > 0)
      .map((i) => ({
        import_item_id: i.id,
        cantidad: i.cantidad_recibida,
        costo_unitario: i.costo_unitario,
        ...(i.cantidad_recibida !== i.cantidad && { comentario_recepcion: i.comentario_recepcion.trim() }),
      }));
    const unidades = [];
    for (const item of itemsIngreso) {
      for (let i = 0; i < item.cantidad_recibida; i++) {
        const u = item.unidades[i];
        unidades.push({
          product_id: item.product_id,
          serial: u.serial.trim(),
          codigo_barras: u.codigo_barras.trim(),
          costo_unitario: item.costo_unitario,
        });
      }
    }

    setEnviando(true);
    try {
      await api.post(`/importaciones/${importacionSeleccionada.id}/ingresar`, { items_costos, unidades, almacen_id: parseInt(almacenSeleccionado) });
      toast.success(`Importacion #${importacionSeleccionada.id} ingresada - ${unidades.length} unidades registradas`);
      setIngresoExitoso(true);
      listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al ingresar al almacen');
    }
    setEnviando(false);
  };

  /* ── Imprimir codigos de barras de unidades ingresadas ── */
  const imprimirCodigosBarras = () => {
    const unidadesImprimir = [];
    for (const item of itemsIngreso) {
      for (let i = 0; i < item.cantidad_recibida; i++) {
        const u = item.unidades[i];
        if (u?.codigo_barras) {
          unidadesImprimir.push({
            producto: item.tbl_productos?.nombre || `Producto #${item.product_id}`,
            serial: u.serial,
            codigo_barras: u.codigo_barras,
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
    ventana.document.write(`<!DOCTYPE html><html><head><title>Codigos de Barras - Importacion #${importacionSeleccionada?.id || ''}</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;padding:10px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
h1{font-size:14px;text-align:center;margin-bottom:10px;color:#333}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.label{border:1.5px solid #333;border-radius:4px;padding:8px 6px;text-align:center;page-break-inside:avoid}
.prod{font-size:10px;font-weight:700;margin-bottom:4px;color:#111;text-transform:uppercase;line-height:1.2}
.bc{display:block;margin:0 auto}
.serial{font-size:9px;color:#555;margin-top:3px;font-family:monospace}
@media print{@page{margin:5mm}h1{margin-bottom:6px}}
</style></head><body>
<h1>Codigos de Barras — Importacion #${importacionSeleccionada?.id || ''}</h1>
<div class="grid">${labelsHtml}</div>
<script>
document.querySelectorAll('.bc').forEach(function(svg){
  try{JsBarcode(svg,svg.dataset.code,{format:"CODE128",width:1.5,height:40,displayValue:true,fontSize:9,margin:2,font:"monospace"})}catch(e){}
});
window.onload=function(){setTimeout(function(){window.print()},500)};
<\/script></body></html>`);
    ventana.document.close();
  };

  /* ── Total detalle ── */
  const totalDetalle = useMemo(() => {
    if (!importacionDetalle?.items) return 0;
    return importacionDetalle.items.reduce((s, i) => s + (parseFloat(i.total_item) || 0), 0);
  }, [importacionDetalle]);

  /* ══════════════════════════════════════════════
     Resumen del ingreso
     ══════════════════════════════════════════════ */
  const resumenIngreso = useMemo(() => {
    const totalUnidades = itemsIngreso.reduce((s, i) => s + i.cantidad_recibida, 0);
    const totalCosto = itemsIngreso.reduce((s, i) => s + (i.cantidad_recibida * i.costo_unitario), 0);
    const todosConfirmados = itemsIngreso.every((i) => i.confirmado || i.cantidad_recibida === 0);
    return { totalUnidades, totalCosto, todosConfirmados };
  }, [itemsIngreso]);

  /* ════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════ */
  return (
    <div>
      {/* ── Encabezado ── */}
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-wider text-steel-100">
            Recepcion de Importaciones
          </h1>
          <p className="text-sm text-steel-400 mt-1">
            Revisa, verifica y aprueba el ingreso de importaciones al almacen
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
          <select
            className="input-field w-auto text-sm pr-10"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          >
            <option value="">Todas</option>
            <option value={FILTRO_PENDIENTES}>Pendientes de ingreso</option>
            <option value={ESTADO_IMPORTACION.PROGRAMADA}>Solo programadas</option>
            <option value={ESTADO_IMPORTACION.RETRASADA}>Solo retrasadas</option>
            <option value={ESTADO_IMPORTACION.INGRESADA}>Ya ingresadas</option>
          </select>
          {filtro && (
            <button onClick={() => setFiltro('')} className="text-xs text-red-600 hover:text-red-700">
              Limpiar
            </button>
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
              {fila.estado === ESTADO_IMPORTACION.PROGRAMADA || fila.estado === ESTADO_IMPORTACION.RETRASADA ? (
                <button
                  onClick={() => abrirIngreso(fila)}
                  className="text-xs bg-emerald-100 text-emerald-600 px-2.5 py-1 rounded hover:bg-emerald-200 flex items-center gap-1 font-medium"
                  title="Verificar y aprobar ingreso"
                >
                  <HiOutlineClipboardCheck className="w-3.5 h-3.5" /> Recibir
                </button>
              ) : fila.estado === ESTADO_IMPORTACION.INGRESADA ? (
                <button
                  onClick={() => abrirDetalle(fila)}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  title="Ver detalle"
                >
                  <HiOutlineEye className="w-3.5 h-3.5" /> Ver
                </button>
              ) : null}
            </div>
          )}
        />
        <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onChange={irAPagina} />
      </div>

      {/* ═══════════════════════════════════════════════════════════
         MODAL - INGRESO DE IMPORTACION AL ALMACEN
         ═══════════════════════════════════════════════════════════ */}
      <Modal
        abierto={modalIngreso}
        cerrar={() => { if (!enviando) { setModalIngreso(false); setIngresoExitoso(false); } }}
        titulo={`Ingresar Importacion #${importacionSeleccionada?.id || ''} al Almacen`}
        ancho="max-w-4xl"
      >
        {importacionSeleccionada && ingresoExitoso ? (
          <div className="space-y-5 py-4">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 flex items-center justify-center mb-3">
                <HiOutlineCheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-emerald-600">Importacion ingresada exitosamente</h3>
              <p className="text-steel-400 text-sm mt-1">
                Las unidades han sido registradas en el almacen. Puedes imprimir los codigos de barras.
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button onClick={() => { setModalIngreso(false); setIngresoExitoso(false); }} className="btn-secondary">
                Cerrar
              </button>
              <button onClick={imprimirCodigosBarras} className="btn-primary flex items-center gap-2">
                <HiOutlineQrcode className="w-4 h-4" />
                Imprimir Codigos de Barras
              </button>
            </div>
          </div>
        ) : importacionSeleccionada && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm bg-steel-900/30 rounded-lg p-3">
              <div>
                <span className="text-steel-400">Embarque:</span>{' '}
                <span className="font-medium text-steel-100">{formatearFecha(importacionSeleccionada.fecha_embarque)}</span>
              </div>
              <div>
                <span className="text-steel-400">Registrado por:</span>{' '}
                <span className="font-medium text-steel-100">{importacionSeleccionada.tbl_usuarios?.nombres || '-'}</span>
              </div>
              <div>
                <span className="text-steel-400">Items:</span>{' '}
                <span className="font-medium text-steel-100">{importacionSeleccionada.items?.length || 0} productos</span>
              </div>
            </div>

            {/* Selector de almacén destino */}
            <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wider">
                <HiOutlineOfficeBuilding className="w-4 h-4" />
                Almacén de destino *
              </label>
              <select
                className="input-field text-sm"
                value={almacenSeleccionado}
                onChange={(e) => setAlmacenSeleccionado(e.target.value)}
              >
                <option value="">-- Seleccionar almacén --</option>
                {almacenes.filter(a => a.activo).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}{a.direccion ? ` — ${a.direccion}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-steel-400 bg-steel-900/20 rounded p-2">
              Verifica cada producto, ingresa el codigo de barras del tipo de producto y un serial unico por unidad.
            </p>

            {itemsIngreso.map((item, itemIdx) => (
              <div key={item.id} className={`border rounded-lg overflow-hidden transition-colors ${item.confirmado ? 'border-emerald-600/50 bg-emerald-50' : 'border-steel-700'}`}>
                <div className="flex items-center justify-between p-3 bg-steel-900/30">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-steel-100">{obtenerNombreProducto(item)}</span>
                    <span className="text-xs bg-steel-800 text-steel-300 px-2 py-0.5 rounded">Esperado: {item.cantidad} und.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.confirmado && <HiOutlineCheckCircle className="w-5 h-5 text-emerald-600" />}
                    <button type="button" onClick={() => actualizarItemIngreso(itemIdx, 'confirmado', !item.confirmado)}
                      className={`text-xs px-2.5 py-1 rounded font-medium ${item.confirmado ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-steel-700 text-steel-300 hover:bg-steel-600'}`}>
                      {item.confirmado ? 'Confirmado' : 'Confirmar'}
                    </button>
                  </div>
                </div>
                <div className="p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-steel-300 mb-1">Cantidad recibida</label>
                      <input type="number" min="0" className="input-field text-sm"
                        value={item.cantidad_recibida} onChange={(e) => actualizarItemIngreso(itemIdx, 'cantidad_recibida', e.target.value)} disabled={item.confirmado} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-steel-300 mb-1">Costo unitario (S/)</label>
                      <input type="number" step="0.001" min="0" className="input-field text-sm"
                        value={item.costo_unitario} onChange={(e) => actualizarItemIngreso(itemIdx, 'costo_unitario', e.target.value)} disabled={item.confirmado} />
                    </div>
                  </div>
                  {item.cantidad_recibida !== item.cantidad && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                      <label className="block text-xs font-semibold text-amber-600 mb-1">
                        Comentario obligatorio (cantidad recibida: {item.cantidad_recibida} / esperada: {item.cantidad}) *
                      </label>
                      <textarea
                        className="input-field text-sm w-full"
                        rows={2}
                        placeholder="Indique el motivo de la diferencia en la cantidad recibida..."
                        value={item.comentario_recepcion}
                        onChange={(e) => actualizarItemIngreso(itemIdx, 'comentario_recepcion', e.target.value)}
                        disabled={item.confirmado}
                      />
                    </div>
                  )}
                  {item.cantidad_recibida > 0 && (
                    <div>
                      <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                        <label className="text-xs font-medium text-steel-300">
                          Unidades ({item.cantidad_recibida})
                        </label>
                        {!item.confirmado && (
                          <button type="button" onClick={() => autoGenerarCodigosIngreso(itemIdx)} className="text-[10px] text-primary-500 hover:text-primary-600 font-medium">
                            Auto-generar vacios
                          </button>
                        )}
                      </div>
                      <div className="max-h-[250px] overflow-y-auto border border-steel-700/50 rounded-lg p-2 space-y-1.5">
                        <div className="grid grid-cols-[2rem_1fr_1fr] gap-2 mb-1 px-0.5">
                          <span className="text-[10px] text-steel-500 text-right">#</span>
                          <span className="text-[10px] text-steel-500 font-semibold uppercase">Serial</span>
                          <span className="text-[10px] text-steel-500 font-semibold uppercase flex items-center gap-1"><HiOutlineQrcode className="w-3 h-3" />Codigo de barras</span>
                        </div>
                        {item.unidades.map((u, uIdx) => (
                          <div key={uIdx} className="grid grid-cols-[2rem_1fr_1fr] gap-2 items-center">
                            <span className="text-xs text-steel-500 text-right flex-shrink-0">{uIdx + 1}</span>
                            <input type="text" placeholder={`Serial ${uIdx + 1}`} className="input-field text-xs py-1.5"
                              value={u.serial} onChange={(e) => actualizarUnidadIngreso(itemIdx, uIdx, 'serial', e.target.value)} disabled={item.confirmado} />
                            <input type="text" placeholder={`Cod. barras ${uIdx + 1}`} className="input-field text-xs py-1.5"
                              value={u.codigo_barras} onChange={(e) => actualizarUnidadIngreso(itemIdx, uIdx, 'codigo_barras', e.target.value)} disabled={item.confirmado} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div className="border-t border-steel-700 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-steel-400">Total unidades:</span>
                <span className="font-medium text-steel-100">{resumenIngreso.totalUnidades}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-steel-400">Costo total:</span>
                <span className="font-bold text-steel-100">{formatearMoneda(resumenIngreso.totalCosto)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModalIngreso(false)} className="btn-secondary" disabled={enviando}>Cancelar</button>
              <button type="button" onClick={ejecutarIngreso} className="btn-primary flex items-center gap-2"
                disabled={enviando || !resumenIngreso.todosConfirmados || resumenIngreso.totalUnidades === 0}>
                {enviando ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Ingresando...</>
                ) : (
                  <><HiOutlineClipboardCheck className="w-4 h-4" /> Confirmar Ingreso</>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══════════════════════════════════════════════════════════
         MODAL - DETALLE (solo lectura para ingresadas)
         ═══════════════════════════════════════════════════════════ */}
      <Modal
        abierto={modalDetalle}
        cerrar={() => setModalDetalle(false)}
        titulo={`Importacion #${importacionDetalle?.id || ''}`}
        ancho="max-w-2xl"
      >
        {importacionDetalle && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-steel-400">Proveedor:</span>{' '}
                <span className="font-medium text-steel-100">
                  {importacionDetalle.tbl_proveedores?.nombre || '-'}
                </span>
              </div>
              <div>
                <span className="text-steel-400">Embarque:</span>{' '}
                <span className="font-medium text-steel-100">
                  {formatearFecha(importacionDetalle.fecha_embarque)}
                </span>
              </div>
              <div>
                <span className="text-steel-400">Estado:</span>{' '}
                <EstadoBadge estado={importacionDetalle.estado} />
              </div>
              <div>
                <span className="text-steel-400">Registrado por:</span>{' '}
                <span className="font-medium text-steel-100">
                  {importacionDetalle.tbl_usuarios?.nombres || '-'}
                </span>
              </div>
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
                  {importacionDetalle.items?.map((item, idx) => (
                    <tr key={item.id || idx} className="border-b border-steel-700/50 last:border-0">
                      <td className="py-2 px-3">{item.tbl_productos?.nombre || `Producto #${item.product_id}`}</td>
                      <td className="py-2 px-3 text-right">{item.cantidad}</td>
                      <td className="py-2 px-3 text-right">
                        {item.costo_unitario_manual ? formatearMoneda(item.costo_unitario_manual) : '-'}
                      </td>
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

            <div className="pt-2 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => imprimirRotulosProductos(importacionDetalle, { etiqueta: 'Importación', campoFecha: 'fecha_embarque' })}
                  className="btn-secondary flex items-center gap-2"
                >
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
            <div className="flex justify-end pt-2">
              <button onClick={() => setModalDetalle(false)} className="btn-secondary">Cerrar</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
