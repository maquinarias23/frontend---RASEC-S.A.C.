import { useState, useEffect, useRef } from 'react';
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineSearch,
  HiOutlineX,
  HiOutlineExclamation,
  HiOutlineCheck,
  HiOutlineCollection,
  HiOutlineGift,
} from 'react-icons/hi';
import useCrud from '../../hooks/useCrud';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import DialogConfirmacion from '../../components/ui/DialogConfirmacion';
import { formatearMoneda } from '../../utils/formato';
import { calcularPrecioCombo } from '../../utils/precioCombo';
import { TIPO_DESCUENTO_COMBO } from '../../config/constants';

// ---------------------------------------------------------------------------
// Buscador con autocomplete
// ---------------------------------------------------------------------------
function BuscadorProducto({ onSeleccionar, productosExcluidos = [] }) {
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
        const lista = Array.isArray(data) ? data : (data.datos || []);
        const q = query.toLowerCase();
        const filtrados = lista
          .filter((p) => !productosExcluidos.includes(p.id))
          .filter((p) => p.nombre?.toLowerCase().includes(q) || p.id?.toString().includes(q));
        setResultados(filtrados.slice(0, 10));
        setAbierto(filtrados.length > 0);
      } catch { setResultados([]); }
      setCargando(false);
    }, 300);
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-500" />
        <input
          type="text"
          className="input-field pl-9 pr-8"
          placeholder="Buscar producto para agregar..."
          value={texto}
          onChange={(e) => buscar(e.target.value)}
          onFocus={() => resultados.length > 0 && setAbierto(true)}
        />
        {cargando && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-steel-600 border-t-primary-500 rounded-full animate-spin" />
        )}
        {texto && (
          <button type="button" onClick={() => { setTexto(''); setResultados([]); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-steel-500 hover:text-steel-300">
            <HiOutlineX className="w-4 h-4" />
          </button>
        )}
      </div>
      {abierto && resultados.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-steel-800 border border-steel-700 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {resultados.map((prod) => (
            <li key={prod.id}
              onClick={() => { onSeleccionar(prod); setTexto(''); setResultados([]); setAbierto(false); }}
              className="px-3 py-2 text-sm hover:bg-primary-50 cursor-pointer border-b border-steel-900/50 last:border-0">
              <span className="font-medium">{prod.nombre}</span>
              {prod.precio_catalogo && (
                <span className="text-steel-400 ml-2">Cat: {formatearMoneda(prod.precio_catalogo)}</span>
              )}
              {prod.precio_venta_base && (
                <span className="text-steel-400 ml-2">Mín: {formatearMoneda(prod.precio_venta_base)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: calcular precio descontado
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function CombosVendedor() {
  const { datos: combos, cargando, listar } = useCrud('/combos');

  // Modal crear/editar
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [itemsCombo, setItemsCombo] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [erroresBackend, setErroresBackend] = useState([]);

  // Dialog confirmar eliminar
  const [confirmEliminar, setConfirmEliminar] = useState(null);

  // =========================================================================
  // Abrir modal para crear
  // =========================================================================
  const abrirCrear = () => {
    setEditandoId(null);
    setNombre('');
    setDescripcion('');
    setItemsCombo([]);
    setErroresBackend([]);
    setModalAbierto(true);
  };

  // =========================================================================
  // Abrir modal para editar
  // =========================================================================
  const abrirEditar = (combo) => {
    setEditandoId(combo.id);
    setNombre(combo.nombre);
    setDescripcion(combo.descripcion || '');
    setItemsCombo(
      combo.items_combo.map((ic) => ({
        producto_id: ic.producto_id,
        nombre: ic.tbl_productos.nombre,
        precio_venta_base: parseFloat(ic.tbl_productos.precio_venta_base),
        precio_catalogo: parseFloat(ic.tbl_productos.precio_catalogo || ic.tbl_productos.precio_venta_base),
        cantidad: ic.cantidad,
        tipo_descuento: ic.tipo_descuento || '',
        valor_descuento: ic.valor_descuento ? parseFloat(ic.valor_descuento) : '',
        es_regalo: ic.es_regalo || false,
      }))
    );
    setErroresBackend([]);
    setModalAbierto(true);
  };

  // =========================================================================
  // Agregar producto al combo
  // =========================================================================
  const agregarProducto = (producto) => {
    if (itemsCombo.some((i) => i.producto_id === producto.id)) {
      return toast.error('Este producto ya está en el combo');
    }
    setItemsCombo([
      ...itemsCombo,
      {
        producto_id: producto.id,
        nombre: producto.nombre,
        precio_venta_base: parseFloat(producto.precio_venta_base),
        precio_catalogo: parseFloat(producto.precio_catalogo || producto.precio_venta_base),
        cantidad: 1,
        tipo_descuento: '',
        valor_descuento: '',
        es_regalo: false,
      },
    ]);
  };

  const removerProducto = (idx) => {
    setItemsCombo(itemsCombo.filter((_, i) => i !== idx));
  };

  const actualizarItem = (idx, campo, valor) => {
    setItemsCombo((prev) => prev.map((item, i) =>
      i === idx ? { ...item, [campo]: valor } : item
    ));
  };

  // =========================================================================
  // Validación frontend de descuentos
  // =========================================================================
  const validarItem = (item) => {
    if (item.es_regalo) return null;
    if (!item.tipo_descuento || !item.valor_descuento) return null;
    const precioRef = item.precio_catalogo;
    const precioDescontado = calcularPrecioCombo(precioRef, item.tipo_descuento, item.valor_descuento);
    if (precioDescontado < item.precio_venta_base) {
      return `El descuento haría que el precio (${formatearMoneda(precioDescontado)}) baje del precio mínimo (${formatearMoneda(item.precio_venta_base)})`;
    }
    return null;
  };

  const hayErroresValidacion = itemsCombo.some((item) => validarItem(item) !== null);

  // =========================================================================
  // Guardar combo
  // =========================================================================
  const guardarCombo = async () => {
    if (!nombre.trim()) return toast.error('El nombre es obligatorio');
    if (itemsCombo.length === 0) return toast.error('Agrega al menos un producto');
    if (hayErroresValidacion) return toast.error('Corrige los errores de descuento antes de guardar');

    setGuardando(true);
    setErroresBackend([]);
    try {
      const body = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        items: itemsCombo.map((item) => ({
          producto_id: item.producto_id,
          cantidad: parseInt(item.cantidad) || 1,
          tipo_descuento: item.es_regalo ? null : (item.tipo_descuento || null),
          valor_descuento: item.es_regalo ? null : (item.valor_descuento ? parseFloat(item.valor_descuento) : null),
          es_regalo: item.es_regalo || false,
        })),
      };

      if (editandoId) {
        await api.put(`/combos/${editandoId}`, body);
        toast.success('Combo actualizado');
      } else {
        await api.post('/combos', body);
        toast.success('Combo creado');
      }
      setModalAbierto(false);
      listar();
    } catch (err) {
      const data = err.response?.data;
      if (data?.errores) {
        setErroresBackend(data.errores);
      } else {
        toast.error(data?.error || 'Error al guardar combo');
      }
    } finally {
      setGuardando(false);
    }
  };

  // =========================================================================
  // Eliminar combo
  // =========================================================================
  const eliminarCombo = async () => {
    if (!confirmEliminar) return;
    try {
      await api.delete(`/combos/${confirmEliminar}`);
      toast.success('Combo eliminado');
      setConfirmEliminar(null);
      listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar combo');
    }
  };

  // =========================================================================
  // Toggle activo/inactivo
  // =========================================================================
  const toggleActivo = async (combo) => {
    try {
      await api.put(`/combos/${combo.id}`, { activo: !combo.activo });
      toast.success(combo.activo ? 'Combo desactivado' : 'Combo activado');
      listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cambiar estado');
    }
  };

  // =========================================================================
  // Calcular total estimado del combo
  // =========================================================================
  const calcularTotalCombo = (items) => {
    return items.reduce((sum, ic) => {
      if (ic.es_regalo) return sum;
      const prod = ic.tbl_productos || ic;
      const precioCat = parseFloat(prod.precio_catalogo || prod.precio_venta_base);
      const precioFinal = ic.tipo_descuento && ic.valor_descuento
        ? calcularPrecioCombo(precioCat, ic.tipo_descuento, parseFloat(ic.valor_descuento))
        : precioCat;
      return sum + precioFinal * (ic.cantidad || 1);
    }, 0);
  };

  // =========================================================================
  // Render
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-steel-100">Mis Combos</h1>
          <p className="text-sm text-steel-400 mt-1">
            Agrupa productos con descuentos para facilitar tus ventas
          </p>
        </div>
        <button onClick={abrirCrear} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-5 h-5" />
          Nuevo Combo
        </button>
      </div>

      {/* Lista de combos */}
      {cargando ? (
        <div className="text-center py-12 text-steel-400">Cargando combos...</div>
      ) : combos.length === 0 ? (
        <div className="text-center py-16 bg-steel-900/50 rounded-xl border border-steel-800">
          <HiOutlineCollection className="w-12 h-12 mx-auto text-steel-600 mb-3" />
          <p className="text-steel-400 text-lg">No tienes combos creados</p>
          <p className="text-steel-500 text-sm mt-1">Crea tu primer combo para agilizar tus ventas</p>
          <button onClick={abrirCrear} className="btn-primary mt-4">
            <HiOutlinePlus className="w-4 h-4 inline mr-1" />
            Crear Combo
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {combos.map((combo) => (
            <div
              key={combo.id}
              className={`bg-steel-900 border rounded-xl p-4 transition-all hover:border-steel-600 ${
                combo.activo ? 'border-steel-800' : 'border-steel-800/50 opacity-60'
              }`}
            >
              {/* Cabecera */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-steel-100 truncate">{combo.nombre}</h3>
                  {combo.descripcion && (
                    <p className="text-xs text-steel-400 mt-0.5 line-clamp-2">{combo.descripcion}</p>
                  )}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ml-2 flex-shrink-0 ${
                  combo.activo
                    ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                    : 'bg-steel-700/50 text-steel-400 border border-steel-700'
                }`}>
                  {combo.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              {/* Productos */}
              <div className="space-y-1.5 mb-3">
                {combo.items_combo.map((ic) => {
                  const precioCat = parseFloat(ic.tbl_productos.precio_catalogo || ic.tbl_productos.precio_venta_base);
                  const tieneDesc = !ic.es_regalo && ic.tipo_descuento && ic.valor_descuento;
                  const precioFinal = tieneDesc
                    ? calcularPrecioCombo(precioCat, ic.tipo_descuento, parseFloat(ic.valor_descuento))
                    : precioCat;

                  return (
                    <div key={ic.id} className={`flex items-center justify-between text-xs rounded-lg px-2.5 py-1.5 ${
                      ic.es_regalo ? 'bg-emerald-900/40 border border-emerald-700/40' : 'bg-steel-800/50'
                    }`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {ic.es_regalo && <HiOutlineGift className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />}
                          <span className="text-steel-200 truncate">{ic.tbl_productos.nombre}</span>
                        </div>
                        <span className="text-steel-500">x{ic.cantidad}</span>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        {ic.es_regalo ? (
                          <span className="text-emerald-300 font-bold">REGALO</span>
                        ) : tieneDesc ? (
                          <div>
                            <span className="line-through text-steel-500 mr-1">{formatearMoneda(precioCat)}</span>
                            <span className="text-primary-500 font-bold">{formatearMoneda(precioFinal)}</span>
                            <span className="text-primary-400 ml-1">
                              ({ic.tipo_descuento === TIPO_DESCUENTO_COMBO.PORCENTAJE ? `${ic.valor_descuento}%` : `-${formatearMoneda(ic.valor_descuento)}`})
                            </span>
                          </div>
                        ) : (
                          <span className="text-steel-300">{formatearMoneda(precioCat)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total estimado */}
              <div className="flex items-center justify-between text-sm border-t border-steel-800 pt-2 mb-3">
                <span className="text-steel-400">Total estimado:</span>
                <span className="font-bold text-steel-100">{formatearMoneda(calcularTotalCombo(combo.items_combo))}</span>
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActivo(combo)}
                  className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors ${
                    combo.activo
                      ? 'bg-steel-800 text-steel-300 hover:bg-steel-700'
                      : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                  }`}
                >
                  {combo.activo ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => abrirEditar(combo)}
                  className="p-1.5 rounded-lg bg-steel-800 text-steel-300 hover:text-primary-400 hover:bg-steel-700 transition-colors"
                  title="Editar"
                >
                  <HiOutlinePencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setConfirmEliminar(combo.id)}
                  className="p-1.5 rounded-lg bg-steel-800 text-steel-300 hover:text-red-400 hover:bg-steel-700 transition-colors"
                  title="Eliminar"
                >
                  <HiOutlineTrash className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= Modal Crear/Editar ================= */}
      <Modal
        abierto={modalAbierto}
        cerrar={() => setModalAbierto(false)}
        titulo={editandoId ? 'Editar Combo' : 'Nuevo Combo'}
        ancho="max-w-3xl"
      >
        <div className="space-y-4">
          {/* Errores del backend */}
          {erroresBackend.length > 0 && (
            <div className="bg-red-600/20 border-2 border-red-500 rounded-lg p-4">
              <p className="text-sm font-bold text-red-500 mb-2">Errores de validación:</p>
              <ul className="text-sm text-red-400 space-y-1">
                {erroresBackend.map((err, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <HiOutlineExclamation className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                    <span className="font-medium">{err}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Nombre y descripción */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label-field">Nombre del combo *</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej: Combo Oficina Premium"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div>
              <label className="label-field">Descripción (opcional)</label>
              <input
                type="text"
                className="input-field"
                placeholder="Breve descripción..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>
          </div>

          {/* Buscador de productos */}
          <div>
            <label className="label-field">Agregar productos</label>
            <BuscadorProducto
              onSeleccionar={agregarProducto}
              productosExcluidos={itemsCombo.map((i) => i.producto_id)}
            />
          </div>

          {/* Items del combo */}
          {itemsCombo.length > 0 && (
            <div className="space-y-2">
              <label className="label-field">Productos en el combo ({itemsCombo.length})</label>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {itemsCombo.map((item, idx) => {
                  const error = validarItem(item);
                  const precioCat = item.precio_catalogo;
                  const precioFinal = item.es_regalo ? 0
                    : (item.tipo_descuento && item.valor_descuento
                      ? calcularPrecioCombo(precioCat, item.tipo_descuento, item.valor_descuento)
                      : precioCat);

                  return (
                    <div key={item.producto_id}
                      className={`rounded-lg p-3 border ${
                        item.es_regalo
                          ? 'bg-emerald-900/40 border-emerald-700/40'
                          : error ? 'bg-steel-800/60 border-red-500/50' : 'bg-steel-800/60 border-steel-700/50'
                      }`}
                    >
                      {/* Fila superior: nombre + precio mínimo + toggle regalo + botón eliminar */}
                      <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-steel-200">{item.nombre}</span>
                          {!item.es_regalo && (
                            <div className="flex gap-3 text-xs text-steel-500 mt-0.5">
                              <span>Catálogo: {formatearMoneda(item.precio_catalogo)}</span>
                              <span>Mínimo: {formatearMoneda(item.precio_venta_base)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <button
                            type="button"
                            onClick={() => {
                              const nuevoRegalo = !item.es_regalo;
                              setItemsCombo((prev) => prev.map((it, i) =>
                                i === idx
                                  ? { ...it, es_regalo: nuevoRegalo, ...(nuevoRegalo ? { tipo_descuento: '', valor_descuento: '' } : {}) }
                                  : it
                              ));
                            }}
                            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${
                              item.es_regalo
                                ? 'bg-emerald-800/50 text-emerald-300 border border-emerald-600/40'
                                : 'bg-steel-700/50 text-steel-400 hover:text-emerald-300 border border-steel-600/50'
                            }`}
                            title={item.es_regalo ? 'Quitar como regalo' : 'Marcar como regalo'}
                          >
                            <HiOutlineGift className="w-3.5 h-3.5" />
                            Regalo
                          </button>
                          <button onClick={() => removerProducto(idx)}
                            className="text-steel-500 hover:text-red-400">
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {item.es_regalo ? (
                        <div className="flex items-center gap-2 text-sm text-emerald-300">
                          <HiOutlineGift className="w-4 h-4" />
                          <span className="font-medium">Este producto se entregará como regalo (S/ 0.00)</span>
                        </div>
                      ) : (
                        <>
                          {/* Fila inferior: cantidad + tipo descuento + valor descuento */}
                          <div className="grid grid-cols-12 gap-2 items-end">
                            <div className="col-span-2">
                              <label className="text-[10px] text-steel-500 block">Cant.</label>
                              <input
                                type="number"
                                min="1"
                                className="input-field text-center text-sm py-1"
                                value={item.cantidad}
                                onChange={(e) => actualizarItem(idx, 'cantidad', e.target.value)}
                                onBlur={(e) => {
                                  const n = parseInt(e.target.value);
                                  actualizarItem(idx, 'cantidad', Number.isFinite(n) && n > 0 ? n : 1);
                                }}
                              />
                            </div>
                            <div className="col-span-4">
                              <label className="text-[10px] text-steel-500 block">Tipo descuento</label>
                              <select
                                className="input-field text-sm py-1"
                                value={item.tipo_descuento}
                                onChange={(e) => {
                                  actualizarItem(idx, 'tipo_descuento', e.target.value);
                                  if (!e.target.value) actualizarItem(idx, 'valor_descuento', '');
                                }}
                              >
                                <option value="">Sin descuento</option>
                                <option value={TIPO_DESCUENTO_COMBO.PORCENTAJE}>Porcentaje (%)</option>
                                <option value={TIPO_DESCUENTO_COMBO.MONTO_FIJO}>Monto fijo (S/)</option>
                              </select>
                            </div>
                            <div className="col-span-3">
                              <label className="text-[10px] text-steel-500 block">Valor</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="input-field text-sm py-1"
                                placeholder={item.tipo_descuento === TIPO_DESCUENTO_COMBO.PORCENTAJE ? '10' : '50.00'}
                                value={item.valor_descuento}
                                onChange={(e) => actualizarItem(idx, 'valor_descuento', e.target.value)}
                                disabled={!item.tipo_descuento}
                              />
                            </div>
                            <div className="col-span-3 text-right">
                              <label className="text-[10px] text-steel-500 block">P. Final</label>
                              <span className={`text-sm font-bold ${error ? 'text-red-400' : 'text-primary-500'}`}>
                                {formatearMoneda(precioFinal)}
                              </span>
                            </div>
                          </div>

                          {/* Alerta de error */}
                          {error && (
                            <div className="mt-2 flex items-start gap-2 text-sm text-red-500 bg-red-600/20 border border-red-500/50 rounded-md px-3 py-2">
                              <HiOutlineExclamation className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                              <span className="font-medium">{error}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Total estimado */}
              <div className="flex justify-between items-center bg-steel-800 rounded-lg px-4 py-2.5 border border-steel-700">
                <span className="text-sm text-steel-300">Total estimado del combo:</span>
                <span className="text-lg font-bold text-steel-100">
                  {formatearMoneda(
                    itemsCombo.reduce((sum, item) => {
                      if (item.es_regalo) return sum;
                      const precioCat = item.precio_catalogo;
                      const precioFinal = item.tipo_descuento && item.valor_descuento
                        ? calcularPrecioCombo(precioCat, item.tipo_descuento, item.valor_descuento)
                        : precioCat;
                      return sum + precioFinal * (parseInt(item.cantidad) || 1);
                    }, 0)
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalAbierto(false)} className="btn-secondary">
              Cancelar
            </button>
            <button
              onClick={guardarCombo}
              disabled={guardando || hayErroresValidacion || itemsCombo.length === 0}
              className="btn-primary flex items-center gap-2"
            >
              {guardando ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <HiOutlineCheck className="w-4 h-4" />
              )}
              {editandoId ? 'Actualizar Combo' : 'Crear Combo'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Dialog confirmar eliminación */}
      <DialogConfirmacion
        abierto={!!confirmEliminar}
        cerrar={() => setConfirmEliminar(null)}
        titulo="Eliminar Combo"
        mensaje="¿Estás seguro de que deseas eliminar este combo? Esta acción no se puede deshacer."
        onConfirmar={eliminarCombo}
        textoConfirmar="Eliminar"
        variante="danger"
      />
    </div>
  );
}
