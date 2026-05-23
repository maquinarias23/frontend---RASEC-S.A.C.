import { useState, useEffect, useCallback } from 'react';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineSearch, HiOutlineX } from 'react-icons/hi';
import useCrud from '../../hooks/useCrud';
import TablaGenerica from '../../components/ui/TablaGenerica';
import Modal from '../../components/ui/Modal';
import { formatearMoneda, formatearFecha } from '../../utils/formato';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const columnas = [
  { key: 'id', label: 'ID' },
  { key: 'nombre', label: 'Nombre' },
  { key: 'alcance', label: 'Alcance', render: (f) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${f.alcance === 'producto' ? 'bg-amber-100 text-amber-700' : 'bg-steel-700 text-steel-300'}`}>
      {f.alcance === 'producto' ? 'Por producto' : 'General'}
    </span>
  )},
  { key: 'tipo', label: 'Tipo', render: (f) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${f.tipo === 'descuento_porcentaje' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-600'}`}>
      {f.tipo === 'descuento_porcentaje' ? 'Porcentaje' : 'Monto fijo'}
    </span>
  )},
  { key: 'valor', label: 'Descuento', render: (f) => (
    <span className="font-medium">{f.tipo === 'descuento_porcentaje' ? `${f.valor}%` : formatearMoneda(f.valor)}</span>
  )},
  { key: 'productos', label: 'Productos', render: (f) => {
    if (f.alcance !== 'producto' || !f.productos_promocion?.length) return '-';
    return (
      <div className="flex flex-wrap gap-1 max-w-xs">
        {f.productos_promocion.map((pp) => (
          <span key={pp.tbl_productos.id} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium truncate max-w-[120px]" title={pp.tbl_productos.nombre}>
            {pp.tbl_productos.nombre}
          </span>
        ))}
      </div>
    );
  }},
  { key: 'activo', label: 'Estado', render: (f) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${f.activo ? 'bg-emerald-100 text-emerald-600' : 'bg-steel-800 text-steel-400'}`}>
      {f.activo ? 'Activa' : 'Inactiva'}
    </span>
  )},
];

const formInicial = { nombre: '', tipo: 'descuento_porcentaje', valor: '', activo: true, alcance: 'general', producto_ids: [] };

export default function Promociones() {
  const { datos, cargando, listar } = useCrud('/promociones');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(formInicial);

  // Estado para buscador de productos
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [resultadosProductos, setResultadosProductos] = useState([]);
  const [productosSeleccionados, setProductosSeleccionados] = useState([]);
  const [buscandoProductos, setBuscandoProductos] = useState(false);

  const buscarProductos = useCallback(async (query) => {
    if (!query || query.length < 2) { setResultadosProductos([]); return; }
    setBuscandoProductos(true);
    try {
      const { data } = await api.get('/productos');
      const lista = Array.isArray(data) ? data : (data.datos || data.data || []);
      const q = query.toLowerCase();
      setResultadosProductos(lista.filter((p) => p.nombre?.toLowerCase().includes(q)).slice(0, 10));
    } catch { setResultadosProductos([]); }
    setBuscandoProductos(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => buscarProductos(busquedaProducto), 300);
    return () => clearTimeout(timer);
  }, [busquedaProducto, buscarProductos]);

  const agregarProducto = (producto) => {
    if (productosSeleccionados.some((p) => p.id === producto.id)) return;
    setProductosSeleccionados([...productosSeleccionados, producto]);
    setForm((f) => ({ ...f, producto_ids: [...f.producto_ids, producto.id] }));
    setBusquedaProducto('');
    setResultadosProductos([]);
  };

  const removerProducto = (productoId) => {
    setProductosSeleccionados(productosSeleccionados.filter((p) => p.id !== productoId));
    setForm((f) => ({ ...f, producto_ids: f.producto_ids.filter((id) => id !== productoId) }));
  };

  const abrirCrear = () => {
    setEditando(null);
    setForm(formInicial);
    setProductosSeleccionados([]);
    setModal(true);
  };

  const abrirEditar = (promo) => {
    setEditando(promo);
    const prods = (promo.productos_promocion || []).map((pp) => pp.tbl_productos);
    setProductosSeleccionados(prods);
    setForm({
      nombre: promo.nombre,
      tipo: promo.tipo,
      valor: promo.valor,
      activo: promo.activo,
      alcance: promo.alcance || 'general',
      producto_ids: prods.map((p) => p.id),
    });
    setModal(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    try {
      const body = {
        ...form,
        valor: parseFloat(form.valor),
      };
      if (editando) {
        await api.put(`/promociones/${editando.id}`, body);
        toast.success('Promoción actualizada');
      } else {
        await api.post('/promociones', body);
        toast.success('Promoción creada');
      }
      setModal(false);
      listar();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const previewDescuento = form.valor ? (
    form.tipo === 'descuento_porcentaje'
      ? `Descuento de ${form.valor}% sobre ${form.alcance === 'producto' ? 'el producto' : 'el total'}`
      : `Descuento de ${formatearMoneda(parseFloat(form.valor) || 0)} sobre ${form.alcance === 'producto' ? 'el producto' : 'el total'}`
  ) : '';

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <h1 className="text-2xl font-bold font-display tracking-wider text-steel-100">Promociones</h1>
        <button onClick={abrirCrear} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-4 h-4" /> Nueva Promoción
        </button>
      </div>
      <div className="card">
        <TablaGenerica columnas={columnas} datos={datos} cargando={cargando} vacio="Sin promociones registradas."
          acciones={(fila) => (
            <button onClick={() => abrirEditar(fila)} className="text-blue-600 hover:text-blue-700"><HiOutlinePencil className="w-4 h-4" /></button>
          )}
        />
      </div>
      <Modal abierto={modal} cerrar={() => setModal(false)} titulo={editando ? 'Editar Promoción' : 'Nueva Promoción'}>
        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">Nombre</label>
            <input className="input-field" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          </div>

          {/* Alcance */}
          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">Alcance</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="alcance" checked={form.alcance === 'general'} onChange={() => setForm({ ...form, alcance: 'general', producto_ids: [] })} className="text-primary-500" />
                <span className="text-sm text-steel-300">General (toda la venta)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="alcance" checked={form.alcance === 'producto'} onChange={() => setForm({ ...form, alcance: 'producto' })} className="text-primary-500" />
                <span className="text-sm text-steel-300">Por producto</span>
              </label>
            </div>
          </div>

          {/* Selector de productos (solo si alcance=producto) */}
          {form.alcance === 'producto' && (
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1">Productos asociados</label>
              {/* Buscador */}
              <div className="relative">
                <div className="flex items-center">
                  <HiOutlineSearch className="absolute left-3 w-4 h-4 text-steel-500" />
                  <input
                    className="input-field pl-9 text-sm"
                    placeholder="Buscar producto por nombre..."
                    value={busquedaProducto}
                    onChange={(e) => setBusquedaProducto(e.target.value)}
                  />
                </div>
                {resultadosProductos.length > 0 && (
                  <ul className="absolute z-50 w-full mt-1 bg-steel-800 border border-steel-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {resultadosProductos.map((p) => (
                      <li key={p.id} onClick={() => agregarProducto(p)}
                        className="px-3 py-2 text-sm hover:bg-primary-50 cursor-pointer border-b border-steel-900/50 last:border-0 flex justify-between">
                        <span>{p.nombre}</span>
                        <span className="text-xs text-blue-600">{formatearMoneda(p.precio_venta_base)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {/* Productos seleccionados */}
              {productosSeleccionados.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {productosSeleccionados.map((p) => (
                    <span key={p.id} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                      {p.nombre}
                      <button type="button" onClick={() => removerProducto(p.id)} className="hover:text-red-600">
                        <HiOutlineX className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {productosSeleccionados.length === 0 && (
                <p className="text-xs text-steel-500 mt-1">Busca y selecciona los productos a los que aplica esta promoción</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1">Tipo de Descuento</label>
              <select className="input-field" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                <option value="descuento_porcentaje">Porcentaje (%)</option>
                <option value="descuento_monto_fijo">Monto fijo (S/)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1">
                Valor {form.tipo === 'descuento_porcentaje' ? '(%)' : '(S/)'}
              </label>
              <input type="number" step="0.01" min="0" className="input-field" value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })} required />
            </div>
          </div>
          {previewDescuento && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">{previewDescuento}</p>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} className="rounded" />
            Promoción activa
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">{editando ? 'Actualizar' : 'Crear'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
