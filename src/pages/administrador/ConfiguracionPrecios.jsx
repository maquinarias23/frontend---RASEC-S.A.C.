import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  HiOutlineSearch,
  HiOutlineSave,
  HiOutlineRefresh,
  HiOutlineCurrencyDollar,
  HiOutlineCheck,
  HiOutlinePencil,
} from 'react-icons/hi';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { formatearMoneda } from '../../utils/formato';
import { ORIGEN_INGRESO } from '../../config/constants';
import Paginacion from '../../components/ui/Paginacion';
import usePaginacion from '../../hooks/usePaginacion';

export default function ConfiguracionPrecios() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  // Precios editados: { [productoId]: { precio_venta_base, precio_vendedor, precio_catalogo, precio_mayorista } }
  const [preciosEditados, setPreciosEditados] = useState({});
  // Fila en edición (null = ninguna, id = fila activa)
  const [filaEditando, setFilaEditando] = useState(null);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get('/productos'),
        api.get('/productos/categorias'),
      ]);
      setProductos(Array.isArray(prodRes.data) ? prodRes.data : []);
      setCategorias(Array.isArray(catRes.data) ? catRes.data : []);
    } catch {
      toast.error('Error al cargar productos');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const matchBusqueda = !busqueda || p.nombre?.toLowerCase().includes(busqueda.toLowerCase());
      const matchCategoria = !filtroCategoria || p.tbl_categorias_producto?.nombre === filtroCategoria;
      return matchBusqueda && matchCategoria;
    });
  }, [productos, busqueda, filtroCategoria]);

  const { datosPaginados, paginaActual, totalPaginas, irAPagina } = usePaginacion(productosFiltrados, 20);

  const tieneEdiciones = Object.keys(preciosEditados).length > 0;

  const obtenerPrecio = (producto, campo) => {
    if (preciosEditados[producto.id]?.[campo] !== undefined) {
      return preciosEditados[producto.id][campo];
    }
    return producto[campo] ?? '';
  };

  const editarPrecio = (productoId, campo, valor) => {
    setPreciosEditados((prev) => ({
      ...prev,
      [productoId]: {
        ...prev[productoId],
        [campo]: valor,
      },
    }));
  };

  const iniciarEdicion = (productoId) => {
    setFilaEditando(productoId);
  };

  const cancelarEdicion = (productoId) => {
    setFilaEditando(null);
    setPreciosEditados((prev) => {
      const nuevo = { ...prev };
      delete nuevo[productoId];
      return nuevo;
    });
  };

  const confirmarEdicionFila = (productoId) => {
    setFilaEditando(null);
  };

  const guardarTodos = async () => {
    if (!tieneEdiciones) return;
    setGuardando(true);
    try {
      const productosPayload = Object.entries(preciosEditados).map(([id, precios]) => {
        const payload = { id: parseInt(id) };
        for (const [campo, valor] of Object.entries(precios)) {
          payload[campo] = valor === '' || valor === null ? null : parseFloat(valor);
        }
        return payload;
      });

      await api.put('/productos/precios-masivo', { productos: productosPayload });
      toast.success(`${productosPayload.length} producto(s) actualizado(s)`);
      setPreciosEditados({});
      setFilaEditando(null);
      await cargarDatos();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar precios');
    } finally {
      setGuardando(false);
    }
  };

  const descartarCambios = () => {
    setPreciosEditados({});
    setFilaEditando(null);
  };

  const etiquetaOrigen = (origen) => {
    if (origen === ORIGEN_INGRESO.IMPORTACION) return { texto: 'IMP', clase: 'bg-purple-600 text-white' };
    if (origen === ORIGEN_INGRESO.COMPRA_LOCAL) return { texto: 'COMP', clase: 'bg-cyan-600 text-white' };
    if (origen === ORIGEN_INGRESO.AJUSTE) return { texto: 'AJU', clase: 'bg-steel-500 text-white' };
    if (origen === ORIGEN_INGRESO.COMPRA_EXTERNA_ENVIO) return { texto: 'EXT', clase: 'bg-orange-600 text-white' };
    return null;
  };

  const campos = [
    { key: 'precio_venta_base', label: 'P. Mínimo', color: 'text-steel-200' },
    { key: 'precio_vendedor', label: 'P. Vendedor', color: 'text-blue-600' },
    { key: 'precio_catalogo', label: 'P. Catálogo', color: 'text-emerald-600' },
    { key: 'precio_mayorista', label: 'P. Mayorista', color: 'text-amber-600' },
  ];

  return (
    <div>
      {/* ENCABEZADO */}
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <div>
          <h1 className="text-2xl font-bold text-steel-100 font-display tracking-wider flex items-center gap-2">
            <HiOutlineCurrencyDollar className="w-7 h-7 text-primary-500" />
            Configuración de Precios
          </h1>
          <p className="text-sm text-steel-400 mt-1">
            Gestiona los precios de todos los productos por tipo: mínimo, vendedor, catálogo y mayorista
          </p>
        </div>
        <div className="flex gap-2">
          {tieneEdiciones && (
            <>
              <button
                onClick={descartarCambios}
                className="btn-secondary flex items-center gap-2 text-sm"
                disabled={guardando}
              >
                <HiOutlineRefresh className="w-4 h-4" />
                Descartar
              </button>
              <button
                onClick={guardarTodos}
                className="btn-primary flex items-center gap-2"
                disabled={guardando}
              >
                {guardando ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <HiOutlineSave className="w-4 h-4" />
                    Guardar Cambios ({Object.keys(preciosEditados).length})
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* LEYENDA DE TIPOS DE PRECIO */}
      <div className="card mb-4">
        <div className="flex flex-wrap gap-4 items-center">
          <span className="text-xs font-semibold text-steel-400 uppercase tracking-wider">Tipos de precio:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-steel-400"></span>
            <span className="text-sm text-steel-300">Mínimo (piso para descuentos)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <span className="text-sm text-steel-300">Vendedor (default en ventas)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            <span className="text-sm text-steel-300">Catálogo (web y clientes)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            <span className="text-sm text-steel-300">Mayorista</span>
          </div>
          <span className="mx-2 text-steel-600">|</span>
          <span className="text-xs font-semibold text-steel-400 uppercase tracking-wider">Origen costo:</span>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-600 text-white">IMP</span>
            <span className="text-sm text-steel-300">Importacion</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-600 text-white">COMP</span>
            <span className="text-sm text-steel-300">Compra local</span>
          </div>
        </div>
      </div>

      {/* BÚSQUEDA Y FILTROS */}
      <div className="card mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-500" />
            <input
              className="input-field pl-9"
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <select
            className="input-field w-auto"
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.nombre}>{c.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TABLA DE PRECIOS */}
      <div className="card overflow-x-auto">
        {cargando ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-steel-700">
                  <th className="text-left py-3 px-3 text-xs font-semibold text-steel-400 uppercase tracking-wider w-10">ID</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-steel-400 uppercase tracking-wider">Producto</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-steel-400 uppercase tracking-wider w-24">Categoría</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-orange-600 uppercase tracking-wider w-36">Costo Unit.</th>
                  {campos.map((c) => (
                    <th key={c.key} className={`text-right py-3 px-3 text-xs font-semibold uppercase tracking-wider w-32 ${c.color}`}>
                      {c.label}
                    </th>
                  ))}
                  <th className="text-center py-3 px-3 text-xs font-semibold text-steel-400 uppercase tracking-wider w-20">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {datosPaginados.map((prod) => {
                  const editando = filaEditando === prod.id;
                  const tieneEdicion = !!preciosEditados[prod.id];
                  return (
                    <tr
                      key={prod.id}
                      className={`border-b border-steel-700/50 hover:bg-steel-800/50 transition-colors ${
                        tieneEdicion ? 'bg-primary-900/10' : ''
                      }`}
                    >
                      <td className="py-2 px-3 text-steel-500 text-xs">{prod.id}</td>
                      <td className="py-2 px-3">
                        <span className="font-medium text-steel-100">{prod.nombre}</span>
                      </td>
                      <td className="py-2 px-3 text-xs text-steel-400">
                        {prod.tbl_categorias_producto?.nombre || '-'}
                      </td>
                      <td className="py-2 px-2 text-right">
                        {prod.costo_ultimo ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-sm font-medium text-orange-600">
                              {formatearMoneda(prod.costo_ultimo)}
                            </span>
                            {(() => {
                              const tag = etiquetaOrigen(prod.origen_costo);
                              return tag ? (
                                <span className={`px-1 py-0.5 rounded text-[9px] font-bold leading-none ${tag.clase}`}>
                                  {tag.texto}
                                </span>
                              ) : null;
                            })()}
                          </div>
                        ) : (
                          <span className="text-steel-500 italic text-sm">—</span>
                        )}
                      </td>
                      {campos.map((campo) => (
                        <td key={campo.key} className="py-2 px-2 text-right">
                          {editando ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="input-field text-right text-sm w-full py-1 px-2"
                              value={obtenerPrecio(prod, campo.key)}
                              onChange={(e) => editarPrecio(prod.id, campo.key, e.target.value)}
                              placeholder="—"
                            />
                          ) : (
                            <span className={`text-sm ${campo.color} ${!prod[campo.key] && campo.key !== 'precio_venta_base' ? 'text-steel-500 italic' : ''}`}>
                              {prod[campo.key] ? formatearMoneda(prod[campo.key]) : '—'}
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="py-2 px-3 text-center">
                        {editando ? (
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => confirmarEdicionFila(prod.id)}
                              className="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded hover:bg-emerald-200"
                              title="Confirmar"
                            >
                              <HiOutlineCheck className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => cancelarEdicion(prod.id)}
                              className="text-xs bg-steel-800 text-steel-300 px-2 py-1 rounded hover:bg-steel-700"
                              title="Cancelar"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => iniciarEdicion(prod.id)}
                            className="text-xs bg-steel-800 text-steel-300 px-2 py-1 rounded hover:bg-steel-700"
                            title="Editar precios"
                          >
                            <HiOutlinePencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {datosPaginados.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-steel-500">
                      No se encontraron productos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onChange={irAPagina} />
          </>
        )}
      </div>

      {/* BARRA FLOTANTE DE CAMBIOS PENDIENTES */}
      {tieneEdiciones && createPortal(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-steel-800 border border-primary-500/50 rounded-xl shadow-2xl px-6 py-3 flex items-center gap-4 z-50">
          <span className="text-sm text-steel-200">
            <strong className="text-primary-600">{Object.keys(preciosEditados).length}</strong> producto(s) con cambios pendientes
          </span>
          <button onClick={descartarCambios} className="btn-secondary text-sm py-1.5 px-3" disabled={guardando}>
            Descartar
          </button>
          <button onClick={guardarTodos} className="btn-primary text-sm py-1.5 px-4 flex items-center gap-2" disabled={guardando}>
            {guardando ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <HiOutlineSave className="w-4 h-4" />
            )}
            Guardar Todo
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
