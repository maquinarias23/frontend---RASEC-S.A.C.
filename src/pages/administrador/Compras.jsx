import { useState, useEffect, useMemo } from 'react';
import {
  HiOutlinePlus,
  HiOutlineDownload,
  HiOutlineEye,
  HiOutlineTrash,
  HiOutlineQrcode,
  HiOutlineCheckCircle,
  HiOutlineClipboardCheck,
  HiOutlineOfficeBuilding,
} from 'react-icons/hi';
import useCrud from '../../hooks/useCrud';
import usePaginacion from '../../hooks/usePaginacion';
import TablaGenerica from '../../components/ui/TablaGenerica';
import EstadoBadge from '../../components/ui/EstadoBadge';
import Modal from '../../components/ui/Modal';
import Paginacion from '../../components/ui/Paginacion';
import { formatearFecha, formatearMoneda } from '../../utils/formato';
import { ESTADO_COMPRA } from '../../config/constants';
import ComboboxSelect from '../../components/ui/ComboboxSelect';
import api from '../../api/axios';
import toast from 'react-hot-toast';

/* ── Estado inicial del formulario ── */
const formInicial = {
  supplier_id: '',
  fecha_compra: '',
  items: [{ product_id: '', cantidad: 1, costo_unitario_manual: '' }],
};

/* ── Columnas de la tabla principal ── */
const columnas = [
  { key: 'id', label: 'ID' },
  {
    key: 'proveedor',
    label: 'Proveedor',
    render: (f) => f.tbl_proveedores?.nombre || '-',
  },
  {
    key: 'fecha_compra',
    label: 'Fecha',
    render: (f) => formatearFecha(f.fecha_compra),
  },
  {
    key: 'estado',
    label: 'Estado',
    render: (f) => <EstadoBadge estado={f.estado} />,
  },
  {
    key: 'items',
    label: 'Items',
    render: (f) => f.items?.length || 0,
  },
  {
    key: 'total',
    label: 'Total',
    render: (f) => {
      const total = f.items?.reduce((s, i) => s + (parseFloat(i.total_item) || 0), 0) || 0;
      return formatearMoneda(total);
    },
  },
];

export default function Compras() {
  /* ── CRUD principal ── */
  const { datos, cargando, listar } = useCrud('/compras');

  /* ── Almacenes activos (para selector de destino al ingresar) ── */
  const { datos: almacenes } = useCrud('/almacenes?activo=true');

  /* ── Paginacion ── */
  const { datosPaginados, paginaActual, totalPaginas, irAPagina } =
    usePaginacion(datos, 15);

  /* ── Catálogos (proveedores y productos) ── */
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);

  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const [resProv, resProd] = await Promise.all([
          api.get('/proveedores', { params: { tipo: 'nacional' } }),
          api.get('/productos'),
        ]);
        setProveedores(
          Array.isArray(resProv.data) ? resProv.data : resProv.data.datos || []
        );
        setProductos(
          Array.isArray(resProd.data) ? resProd.data : resProd.data.datos || []
        );
      } catch {
        toast.error('Error al cargar catálogos');
      }
    };
    cargarCatalogos();
  }, []);

  /* ── Mapa rápido de productos (id → nombre) ── */
  const mapProductos = useMemo(() => {
    const m = {};
    productos.forEach((p) => (m[p.id] = p.nombre));
    return m;
  }, [productos]);

  /* ── Modal de creación ── */
  const [modalCrear, setModalCrear] = useState(false);
  const [form, setForm] = useState(formInicial);

  const abrirCrear = () => {
    setForm({ ...formInicial, items: [{ product_id: '', cantidad: 1, costo_unitario_manual: '' }] });
    setModalCrear(true);
  };

  /* ── Modal de detalle ── */
  const [modalDetalle, setModalDetalle] = useState(false);
  const [compraDetalle, setCompraDetalle] = useState(null);

  const abrirDetalle = (fila) => {
    setCompraDetalle(fila);
    setModalDetalle(true);
  };

  /* ── Modal de ingreso al almacén (con unidades y códigos) ── */
  const [modalIngreso, setModalIngreso] = useState(false);
  const [compraIngreso, setCompraIngreso] = useState(null);
  const [itemsIngreso, setItemsIngreso] = useState([]);
  const [enviandoIngreso, setEnviandoIngreso] = useState(false);
  const [almacenSeleccionado, setAlmacenSeleccionado] = useState('');

  /* ── Manejo de items del formulario ── */
  const agregarItem = () =>
    setForm({
      ...form,
      items: [...form.items, { product_id: '', cantidad: 1, costo_unitario_manual: '' }],
    });

  const eliminarItem = (idx) => {
    if (form.items.length <= 1) {
      toast.error('La compra debe tener al menos un item');
      return;
    }
    const items = form.items.filter((_, i) => i !== idx);
    setForm({ ...form, items });
  };

  const actualizarItem = (idx, campo, valor) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [campo]: valor };
    setForm({ ...form, items });
  };

  /* ── Costo total calculado del formulario ── */
  const totalFormulario = useMemo(() => {
    return form.items.reduce((sum, item) => {
      const cantidad = parseFloat(item.cantidad) || 0;
      const costo = parseFloat(item.costo_unitario_manual) || 0;
      return sum + cantidad * costo;
    }, 0);
  }, [form.items]);

  /* ── Guardar compra ── */
  const guardar = async (e) => {
    e.preventDefault();

    if (!form.supplier_id) {
      toast.error('Seleccione un proveedor');
      return;
    }

    const itemsInvalidos = form.items.some((i) => !i.product_id || !i.cantidad);
    if (itemsInvalidos) {
      toast.error('Todos los items deben tener producto y cantidad');
      return;
    }

    try {
      await api.post('/compras', {
        supplier_id: parseInt(form.supplier_id),
        fecha_compra: form.fecha_compra,
        items: form.items.map((i) => ({
          product_id: parseInt(i.product_id),
          cantidad: parseInt(i.cantidad),
          costo_unitario_manual: parseFloat(i.costo_unitario_manual) || null,
        })),
      });
      toast.success('Compra registrada correctamente');
      setModalCrear(false);
      listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar compra');
    }
  };

  /* ── Abrir modal de ingreso al almacén ── */
  const abrirIngreso = (compra) => {
    setCompraIngreso(compra);
    const items = (compra.items || []).map((item) => {
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

  const actualizarItemIngreso = (idx, campo, valor) => {
    setItemsIngreso((prev) => {
      const copia = [...prev];
      const tope = copia[idx].cantidad_pendiente_ingreso ?? copia[idx].cantidad;
      copia[idx] = { ...copia[idx], [campo]: campo === 'cantidad_recibida' ? Math.max(0, Math.min(parseInt(valor) || 0, tope)) : (campo === 'costo_unitario' ? (parseFloat(valor) || 0) : valor) };
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

  const confirmarIngreso = async () => {
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
      if (item.cantidad_recibida <= 0) continue;
      const nombre = item.tbl_productos?.nombre || 'Producto';
      if (item.cantidad_recibida !== item.cantidad_pendiente_ingreso && !item.comentario_recepcion?.trim()) {
        toast.error(`Debe agregar un comentario para "${nombre}" porque la cantidad recibida difiere de la pendiente`);
        return;
      }
      for (let i = 0; i < item.cantidad_recibida; i++) {
        const u = item.unidades[i];
        if (!u?.serial?.trim()) {
          toast.error(`Falta serial en unidad ${i + 1} de "${nombre}"`);
          return;
        }
        if (!u?.codigo_barras?.trim()) {
          toast.error(`Falta código de barras en unidad ${i + 1} de "${nombre}"`);
          return;
        }
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

    setEnviandoIngreso(true);
    try {
      await api.post(`/compras/${compraIngreso.id}/ingresar`, { items_costos, unidades, almacen_id: parseInt(almacenSeleccionado) });
      toast.success(`Compra #${compraIngreso.id} ingresada - ${unidades.length} unidades registradas`);
      setModalIngreso(false);
      listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al ingresar compra');
    }
    setEnviandoIngreso(false);
  };

  const resumenIngreso = useMemo(() => {
    const totalUnidades = itemsIngreso.reduce((s, i) => s + i.cantidad_recibida, 0);
    const totalCosto = itemsIngreso.reduce((s, i) => s + (i.cantidad_recibida * i.costo_unitario), 0);
    const todosConfirmados = itemsIngreso.every((i) => i.confirmado || i.cantidad_recibida === 0);
    return { totalUnidades, totalCosto, todosConfirmados };
  }, [itemsIngreso]);

  /* ── Total del detalle ── */
  const totalDetalle = useMemo(() => {
    if (!compraDetalle?.items) return 0;
    return compraDetalle.items.reduce(
      (s, i) => s + (parseFloat(i.total_item) || 0),
      0
    );
  }, [compraDetalle]);

  /* ════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════ */
  return (
    <div>
      {/* ── Encabezado ── */}
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <h1 className="text-2xl font-bold font-display tracking-wider text-steel-100">Compras Locales</h1>
        <button onClick={abrirCrear} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-4 h-4" /> Nueva Compra
        </button>
      </div>

      {/* ── Tabla principal ── */}
      <div className="card">
        <TablaGenerica
          columnas={columnas}
          datos={datosPaginados}
          cargando={cargando}
          acciones={(fila) => (
            <div className="flex items-center gap-2">
              {/* Ver detalle */}
              <button
                onClick={() => abrirDetalle(fila)}
                className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-xs"
                title="Ver detalle"
              >
                <HiOutlineEye className="w-4 h-4" /> Ver
              </button>

              {/* Ingresar al almacén (solo si está registrada) */}
              {fila.estado === ESTADO_COMPRA.REGISTRADA && (
                <button
                  onClick={() => abrirIngreso(fila)}
                  className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 text-xs"
                  title="Ingresar al almacén"
                >
                  <HiOutlineDownload className="w-4 h-4" /> Ingresar
                </button>
              )}
            </div>
          )}
        />
        <Paginacion
          paginaActual={paginaActual}
          totalPaginas={totalPaginas}
          onChange={irAPagina}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════
         MODAL - NUEVA COMPRA
         ═══════════════════════════════════════════════════════════ */}
      <Modal
        abierto={modalCrear}
        cerrar={() => setModalCrear(false)}
        titulo="Nueva Compra"
        ancho="max-w-3xl"
      >
        <form onSubmit={guardar} className="space-y-5">
          {/* Fila 1: Proveedor + Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Proveedor (dropdown) */}
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1">
                Proveedor
              </label>
              <select
                className="input-field"
                value={form.supplier_id}
                onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                required
              >
                <option value="">-- Seleccione proveedor --</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha de compra */}
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1">
                Fecha de compra
              </label>
              <input
                type="date"
                className="input-field"
                value={form.fecha_compra}
                onChange={(e) => setForm({ ...form, fecha_compra: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <label className="block text-sm font-medium text-steel-200 mb-2">
              Items de la compra
            </label>

            {/* Encabezados */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_100px_120px_40px] gap-2 mb-1 text-xs font-semibold text-steel-400 uppercase px-1">
              <span>Producto</span>
              <span>Cantidad</span>
              <span>Costo unit.</span>
              <span></span>
            </div>

            {form.items.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-[1fr_100px_120px_40px] gap-2 mb-2 items-center"
              >
                {/* Producto (combobox con búsqueda) */}
                <ComboboxSelect
                  opciones={productos}
                  value={item.product_id}
                  onChange={(val) => actualizarItem(idx, 'product_id', val)}
                  placeholder="-- Producto --"
                  required
                />

                {/* Cantidad */}
                <input
                  type="number"
                  min="1"
                  placeholder="Cant."
                  className="input-field"
                  value={item.cantidad}
                  onChange={(e) => actualizarItem(idx, 'cantidad', e.target.value)}
                  required
                />

                {/* Costo unitario */}
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Costo"
                  className="input-field"
                  value={item.costo_unitario_manual}
                  onChange={(e) =>
                    actualizarItem(idx, 'costo_unitario_manual', e.target.value)
                  }
                />

                {/* Eliminar item */}
                <button
                  type="button"
                  onClick={() => eliminarItem(idx)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                  title="Eliminar item"
                >
                  <HiOutlineTrash className="w-4 h-4" />
                </button>
              </div>
            ))}

            {/* Agregar item */}
            <button
              type="button"
              onClick={agregarItem}
              className="text-sm text-primary-500 hover:text-primary-700 font-medium mt-1"
            >
              + Agregar item
            </button>
          </div>

          {/* Costo total */}
          <div className="flex items-center justify-between border-t border-steel-700 pt-4">
            <span className="text-sm font-semibold text-steel-200">
              Total estimado:
            </span>
            <span className="text-lg font-bold text-steel-100">
              {formatearMoneda(totalFormulario)}
            </span>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalCrear(false)}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Registrar Compra
            </button>
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════
         MODAL - DETALLE DE COMPRA
         ═══════════════════════════════════════════════════════════ */}
      <Modal
        abierto={modalDetalle}
        cerrar={() => setModalDetalle(false)}
        titulo={`Compra #${compraDetalle?.id || ''}`}
        ancho="max-w-2xl"
      >
        {compraDetalle && (
          <div className="space-y-5">
            {/* Info general */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-steel-400">Proveedor:</span>{' '}
                <span className="font-medium text-steel-100">
                  {compraDetalle.tbl_proveedores?.nombre || '-'}
                </span>
              </div>
              <div>
                <span className="text-steel-400">Fecha de compra:</span>{' '}
                <span className="font-medium text-steel-100">
                  {formatearFecha(compraDetalle.fecha_compra)}
                </span>
              </div>
              <div>
                <span className="text-steel-400">Estado:</span>{' '}
                <EstadoBadge estado={compraDetalle.estado} />
              </div>
              <div>
                <span className="text-steel-400">Registrado por:</span>{' '}
                <span className="font-medium text-steel-100">
                  {compraDetalle.tbl_usuarios?.nombres || '-'}
                </span>
              </div>
            </div>

            {/* Tabla de items */}
            <div>
              <h4 className="text-sm font-semibold text-steel-200 mb-2">
                Items ({compraDetalle.items?.length || 0})
              </h4>
              <div className="overflow-x-auto border border-steel-700 rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-steel-900/50 border-b border-steel-700">
                      <th className="text-left py-2 px-3 font-semibold text-steel-300">
                        Producto
                      </th>
                      <th className="text-right py-2 px-3 font-semibold text-steel-300">
                        Cantidad
                      </th>
                      <th className="text-right py-2 px-3 font-semibold text-steel-300">
                        Costo Unit.
                      </th>
                      <th className="text-right py-2 px-3 font-semibold text-steel-300">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {compraDetalle.items?.map((item, idx) => (
                      <tr
                        key={item.id || idx}
                        className="border-b border-steel-700/50 last:border-0"
                      >
                        <td className="py-2 px-3">
                          {item.tbl_productos?.nombre ||
                            mapProductos[item.product_id] ||
                            `Producto #${item.product_id}`}
                        </td>
                        <td className="py-2 px-3 text-right">{item.cantidad}</td>
                        <td className="py-2 px-3 text-right">
                          {item.costo_unitario_manual
                            ? formatearMoneda(item.costo_unitario_manual)
                            : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-medium">
                          {formatearMoneda(item.total_item || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-steel-900/50 border-t border-steel-700">
                      <td
                        colSpan={3}
                        className="py-2 px-3 text-right font-semibold text-steel-200"
                      >
                        Total:
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-steel-100">
                        {formatearMoneda(totalDetalle)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Botón cerrar */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setModalDetalle(false)}
                className="btn-secondary"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══════════════════════════════════════════════════════════
         MODAL - INGRESO AL ALMACÉN (con unidades y códigos)
         ═══════════════════════════════════════════════════════════ */}
      <Modal
        abierto={modalIngreso}
        cerrar={() => !enviandoIngreso && setModalIngreso(false)}
        titulo={`Ingresar Compra #${compraIngreso?.id || ''} al Almacén`}
        ancho="max-w-4xl"
      >
        {compraIngreso && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm bg-steel-900/30 rounded-lg p-3">
              <div>
                <span className="text-steel-400">Proveedor:</span>{' '}
                <span className="font-medium text-steel-100">{compraIngreso.tbl_proveedores?.nombre || '-'}</span>
              </div>
              <div>
                <span className="text-steel-400">Fecha:</span>{' '}
                <span className="font-medium text-steel-100">{formatearFecha(compraIngreso.fecha_compra)}</span>
              </div>
              <div>
                <span className="text-steel-400">Items:</span>{' '}
                <span className="font-medium text-steel-100">{compraIngreso.items?.length || 0} productos</span>
              </div>
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

            {(compraIngreso?.total_tomado_chofer || 0) > 0 && (
              <div className="bg-orange-600 border border-orange-700 rounded-lg p-3 shadow-sm">
                <p className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                  Tomas previas del chofer
                </p>
                <p className="text-sm text-white font-medium">
                  El chofer tomó {compraIngreso.total_tomado_chofer} unidad(es) antes de ingresar al almacén.
                  Solo se registrarán las {compraIngreso.total_pendiente_ingreso} unidades restantes.
                </p>
              </div>
            )}

            <p className="text-xs text-steel-400 bg-steel-900/20 rounded p-2">
              Verifica cada producto, ingresa el código de barras del tipo de producto y un serial único por unidad.
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
                      <input type="number" min="0" max={item.cantidad_pendiente_ingreso} className="input-field text-sm"
                        value={item.cantidad_recibida} onChange={(e) => actualizarItemIngreso(itemIdx, 'cantidad_recibida', e.target.value)} disabled={item.confirmado} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-steel-300 mb-1">Costo unitario (S/)</label>
                      <input type="number" step="0.01" min="0" className="input-field text-sm"
                        value={item.costo_unitario} onChange={(e) => actualizarItemIngreso(itemIdx, 'costo_unitario', e.target.value)} disabled={item.confirmado} />
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
                        value={item.comentario_recepcion || ''}
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
                            Auto-generar vacíos
                          </button>
                        )}
                      </div>
                      <div className="max-h-[250px] overflow-y-auto border border-steel-700/50 rounded-lg p-2 space-y-1.5">
                        <div className="grid grid-cols-[2rem_1fr_1fr] gap-2 mb-1 px-0.5">
                          <span className="text-[10px] text-steel-500 text-right">#</span>
                          <span className="text-[10px] text-steel-500 font-semibold uppercase">Serial</span>
                          <span className="text-[10px] text-steel-500 font-semibold uppercase flex items-center gap-1"><HiOutlineQrcode className="w-3 h-3" />Código de barras</span>
                        </div>
                        {item.unidades.map((u, uIdx) => (
                          <div key={uIdx} className="grid grid-cols-[2rem_1fr_1fr] gap-2 items-center">
                            <span className="text-xs text-steel-500 text-right flex-shrink-0">{uIdx + 1}</span>
                            <input type="text" placeholder={`Serial ${uIdx + 1}`} className="input-field text-xs py-1.5"
                              value={u.serial} onChange={(e) => actualizarUnidadIngreso(itemIdx, uIdx, 'serial', e.target.value)} disabled={item.confirmado} />
                            <input type="text" placeholder={`Cód. barras ${uIdx + 1}`} className="input-field text-xs py-1.5"
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
              <button type="button" onClick={() => setModalIngreso(false)} className="btn-secondary" disabled={enviandoIngreso}>Cancelar</button>
              <button type="button" onClick={confirmarIngreso} className="btn-primary flex items-center gap-2"
                disabled={enviandoIngreso || !resumenIngreso.todosConfirmados || resumenIngreso.totalUnidades === 0}>
                {enviandoIngreso ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Ingresando...</>
                ) : (
                  <><HiOutlineClipboardCheck className="w-4 h-4" /> Confirmar Ingreso</>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
