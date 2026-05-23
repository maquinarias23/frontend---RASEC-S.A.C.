import { useState, useEffect } from 'react';
import { HiOutlinePlus, HiOutlineX } from 'react-icons/hi';
import Modal from '../../../components/ui/Modal';
import ComboboxSelect from '../../../components/ui/ComboboxSelect';
import FechasTimeline from './FechasTimeline';
import api from '../../../api/axios';
import toast from 'react-hot-toast';

const itemVacio = { product_id: '', cantidad: 1, codigo_aduanero: '', unidad_medida: 'Kg' };

export default function ModalCrearImportacion({ abierto, cerrar, onCreado, tiposProducto }) {
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mostrarCrearProducto, setMostrarCrearProducto] = useState(false);
  const [nuevoProductoNombre, setNuevoProductoNombre] = useState('');

  const [form, setForm] = useState({
    nombre: '', contrato: '', supplier_id: '', tipo_producto_id: '',
    fecha_pedido: '', fecha_fabricacion: '', fecha_embarque: '',
    fecha_desembarque: '', fecha_descarga: '', tipo_cambio: '', items: [{ ...itemVacio }],
  });

  useEffect(() => {
    if (!abierto) return;
    setForm({
      nombre: '', contrato: '', supplier_id: '', tipo_producto_id: '',
      fecha_pedido: '', fecha_fabricacion: '', fecha_embarque: '',
      fecha_desembarque: '', fecha_descarga: '', tipo_cambio: '', items: [{ ...itemVacio }],
    });
    const cargar = async () => {
      setCargando(true);
      try {
        const [resProv, resProd] = await Promise.all([
          api.get('/proveedores', { params: { tipo: 'importacion' } }),
          api.get('/productos'),
        ]);
        setProveedores(Array.isArray(resProv.data) ? resProv.data : resProv.data.datos || []);
        setProductos(Array.isArray(resProd.data) ? resProd.data : (resProd.data.datos || resProd.data.data || []));
      } catch {
        setProveedores([]);
        setProductos([]);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [abierto]);

  const agregarItem = () => setForm(prev => ({ ...prev, items: [...prev.items, { ...itemVacio }] }));

  const eliminarItem = (idx) => {
    setForm(prev => {
      const items = prev.items.filter((_, i) => i !== idx);
      return { ...prev, items: items.length > 0 ? items : [{ ...itemVacio }] };
    });
  };

  const actualizarItem = (idx, campo, valor) => {
    setForm(prev => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [campo]: valor };
      return { ...prev, items };
    });
  };

  const crearProductoInline = async () => {
    if (!nuevoProductoNombre.trim()) return toast.error('Nombre del producto obligatorio');
    try {
      const { data } = await api.post('/productos', { nombre: nuevoProductoNombre.trim(), precio_venta_base: 0 });
      const nuevoId = data.id || data.producto?.id;
      setProductos(prev => [...prev, { id: nuevoId, nombre: nuevoProductoNombre.trim(), precio_venta_base: 0 }]);
      toast.success('Producto creado');
      setMostrarCrearProducto(false);
      setNuevoProductoNombre('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear producto');
    }
  };

  const guardar = async (e) => {
    e.preventDefault();
    const itemsValidos = form.items.filter(i => i.product_id);
    if (itemsValidos.length === 0) return toast.error('Agregue al menos un producto');

    const ids = itemsValidos.map(i => parseInt(i.product_id));
    if (new Set(ids).size !== ids.length) return toast.error('Hay productos duplicados');

    setGuardando(true);
    try {
      const { data } = await api.post('/importaciones', {
        nombre: form.nombre || null,
        contrato: form.contrato || null,
        supplier_id: form.supplier_id ? parseInt(form.supplier_id) : null,
        tipo_producto_id: form.tipo_producto_id ? parseInt(form.tipo_producto_id) : null,
        fecha_pedido: form.fecha_pedido || null,
        fecha_fabricacion: form.fecha_fabricacion || null,
        fecha_embarque: form.fecha_embarque || null,
        fecha_desembarque: form.fecha_desembarque || null,
        fecha_descarga: form.fecha_descarga || null,
        tipo_cambio: form.tipo_cambio ? parseFloat(form.tipo_cambio) : null,
        items: itemsValidos.map(i => ({
          product_id: parseInt(i.product_id),
          cantidad: parseInt(i.cantidad),
          codigo_aduanero: i.codigo_aduanero || null,
          unidad_medida: i.unidad_medida || null,
        })),
      });
      toast.success('Importación creada');
      cerrar();
      if (onCreado) onCreado(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear importación');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal abierto={abierto} cerrar={cerrar} titulo="Nueva Importación" ancho="max-w-4xl">
      <form onSubmit={guardar} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-steel-300 mb-1">Nombre de importación</label>
            <input type="text" className="input-field text-sm" placeholder="Ej: PEIMM250032 Agricola I001-2025"
              value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-steel-300 mb-1">Contrato</label>
            <input type="text" className="input-field text-sm" placeholder="Ej: HNWY202504220028"
              value={form.contrato} onChange={e => setForm({ ...form, contrato: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-steel-300 mb-1">Proveedor *</label>
            <select className="input-field text-sm" value={form.supplier_id}
              onChange={e => setForm({ ...form, supplier_id: e.target.value })} required>
              <option value="">Seleccionar...</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-steel-300 mb-1">Tipo de producto</label>
            <select className="input-field text-sm" value={form.tipo_producto_id}
              onChange={e => setForm({ ...form, tipo_producto_id: e.target.value })}>
              <option value="">Seleccionar...</option>
              {(tiposProducto || []).map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-steel-300 mb-1">Tipo de Cambio (TC)</label>
            <input type="number" step="0.0001" className="input-field text-sm" placeholder="Ej: 3.564"
              value={form.tipo_cambio} onChange={e => setForm({ ...form, tipo_cambio: e.target.value })} />
          </div>
        </div>

        <FechasTimeline fechas={form} onChange={(campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }))} />

        <div>
          <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
            <label className="text-sm font-medium text-steel-200">Productos ({form.items.filter(i => i.product_id).length})</label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setMostrarCrearProducto(true)}
                className="text-xs text-emerald-600 hover:text-emerald-400 font-medium">+ Crear producto</button>
              <button type="button" onClick={agregarItem}
                className="text-xs text-primary-500 hover:text-primary-400 font-medium flex items-center gap-1">
                <HiOutlinePlus className="w-3 h-3" /> Agregar
              </button>
            </div>
          </div>

          {mostrarCrearProducto && (
            <div className="bg-steel-800/50 border border-steel-700 rounded-lg p-3 mb-2 flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs text-steel-400 mb-1">Nombre del nuevo producto</label>
                <input type="text" className="input-field text-sm" value={nuevoProductoNombre}
                  onChange={e => setNuevoProductoNombre(e.target.value)} placeholder="Nombre del producto" />
              </div>
              <button type="button" onClick={crearProductoInline} className="btn-primary text-xs px-3 py-2">Crear</button>
              <button type="button" onClick={() => { setMostrarCrearProducto(false); setNuevoProductoNombre(''); }}
                className="btn-secondary text-xs px-3 py-2">Cancelar</button>
            </div>
          )}

          <div className="grid grid-cols-12 gap-2 mb-1">
            <span className="col-span-5 text-xs font-semibold text-steel-400 uppercase">Producto</span>
            <span className="col-span-2 text-xs font-semibold text-steel-400 uppercase">Cantidad</span>
            <span className="col-span-2 text-xs font-semibold text-steel-400 uppercase">Cód. Aduanero</span>
            <span className="col-span-2 text-xs font-semibold text-steel-400 uppercase">UM</span>
            <span className="col-span-1" />
          </div>

          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {form.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-steel-900/50 rounded-lg p-2">
                <div className="col-span-5">
                  <ComboboxSelect
                    opciones={productos}
                    value={item.product_id}
                    onChange={(val) => actualizarItem(idx, 'product_id', val)}
                    placeholder="Seleccionar producto..."
                    required
                  />
                </div>
                <div className="col-span-2">
                  <input type="number" min="1" className="input-field text-sm" value={item.cantidad}
                    onChange={e => actualizarItem(idx, 'cantidad', e.target.value)} required />
                </div>
                <div className="col-span-2">
                  <input type="text" className="input-field text-sm" placeholder="84361..."
                    value={item.codigo_aduanero} onChange={e => actualizarItem(idx, 'codigo_aduanero', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <select className="input-field text-sm" value={item.unidad_medida}
                    onChange={e => actualizarItem(idx, 'unidad_medida', e.target.value)}>
                    <option value="Kg">Kg</option>
                    <option value="Unidad">Unidad</option>
                    <option value="Litro">Litro</option>
                    <option value="Metro">Metro</option>
                    <option value="Caja">Caja</option>
                  </select>
                </div>
                <div className="col-span-1 flex justify-center">
                  <button type="button" onClick={() => eliminarItem(idx)}
                    className="text-red-600 hover:text-red-400 p-1 rounded-full hover:bg-red-500/10">
                    <HiOutlineX className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-steel-700 pt-4 flex justify-end gap-3">
          <button type="button" onClick={cerrar} className="btn-secondary">Cancelar</button>
          <button type="submit" className="btn-primary" disabled={guardando}>
            {guardando ? 'Creando...' : 'Crear Importación'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
