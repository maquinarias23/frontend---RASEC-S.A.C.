import { useState, useEffect, useRef } from 'react';
import {
  HiOutlineSearch, HiOutlineAdjustments, HiOutlineClipboardList,
  HiOutlineTruck, HiOutlineShoppingCart, HiOutlineOfficeBuilding,
  HiOutlineChevronDown, HiOutlineChevronUp,
} from 'react-icons/hi';
import useCrud from '../../hooks/useCrud';
import TablaGenerica from '../../components/ui/TablaGenerica';
import Modal from '../../components/ui/Modal';
import Tabs from '../../components/ui/Tabs';
import TablaProximosIngresos from '../../components/shared/TablaProximosIngresos';
import useAuthStore from '../../store/authStore';
import { ROLES } from '../../config/roles';
import { formatearMoneda } from '../../utils/formato';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const tabsInventario = [
  { key: 'stock', label: 'Stock Actual', icono: <HiOutlineClipboardList className="w-4 h-4 inline" /> },
  { key: 'llegadas', label: 'Llegadas de Importación', icono: <HiOutlineTruck className="w-4 h-4 inline" /> },
  { key: 'compras_nacionales', label: 'Compras Nacionales', icono: <HiOutlineShoppingCart className="w-4 h-4 inline" /> },
];

export default function Inventario() {
  const [tabActual, setTabActual] = useState('stock');
  const { datos, cargando, listar } = useCrud('/inventario/por-producto');
  const { datos: almacenes } = useCrud('/almacenes');
  const { usuario } = useAuthStore();
  const esSuperAdmin = usuario?.rol === ROLES.SUPER_ADMINISTRADOR;

  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [almacenFiltro, setAlmacenFiltro] = useState('');
  const [expandido, setExpandido] = useState(null);
  const [resultadoBusqueda, setResultadoBusqueda] = useState(null);

  // Modal ajuste
  const [modalAjuste, setModalAjuste] = useState(false);
  const [ajuste, setAjuste] = useState({ product_id: '', tipo: 'ingreso', cantidad: '', motivo_texto: '', costo_unitario: '', almacen_id: '' });
  const [guardando, setGuardando] = useState(false);

  // Combobox producto
  const [textoProducto, setTextoProducto] = useState('');
  const [comboAbierto, setComboAbierto] = useState(false);
  const comboRef = useRef(null);

  const almacenesActivos = almacenes.filter(a => a.activo);

  const productosFiltrados = datos.filter(p =>
    p.nombre.toLowerCase().includes(textoProducto.toLowerCase())
  );

  useEffect(() => {
    const handleClickFuera = (e) => {
      if (comboRef.current && !comboRef.current.contains(e.target)) setComboAbierto(false);
    };
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, []);

  const categorias = [...new Set(datos.map(p => p.categoria).filter(Boolean))].sort();

  // Filtrar datos — si hay filtro de almacén, recalcular desde desglose
  const datosFiltrados = datos.filter(p => {
    if (categoriaFiltro && p.categoria !== categoriaFiltro) return false;
    if (busqueda) {
      const term = busqueda.toLowerCase();
      if (!p.nombre.toLowerCase().includes(term)) return false;
    }
    return true;
  }).map(p => {
    if (!almacenFiltro) return p;
    const alm = p.desglose_almacenes?.find(d => d.almacen_id === parseInt(almacenFiltro));
    if (!alm) return { ...p, stock_total: 0, disponibles: 0, asignadas: 0, en_proceso: 0, entregadas: 0, canceladas: 0 };
    return { ...p, stock_total: alm.stock_total, disponibles: alm.disponibles, asignadas: alm.asignadas, en_proceso: alm.en_proceso, entregadas: alm.entregadas, canceladas: alm.canceladas };
  });

  const columnas = [
    { key: 'nombre', label: 'Producto' },
    { key: 'categoria', label: 'Categoria' },
    { key: 'precio_venta_base', label: 'Precio Mínimo', render: (f) => formatearMoneda(f.precio_venta_base) },
    { key: 'stock_total', label: 'Stock Total', render: (f) => (
      <span className={`font-bold ${f.stock_total === 0 ? 'text-red-600' : 'text-steel-100'}`}>{f.stock_total}</span>
    )},
    { key: 'disponibles', label: 'Disponibles', render: (f) => (
      <span className="text-emerald-600 font-medium">{f.disponibles}</span>
    )},
    { key: 'asignadas', label: 'Reservadas', render: (f) => (
      <span className="text-blue-600 font-medium">{f.asignadas}</span>
    )},
    { key: 'en_proceso', label: 'En Pedido', render: (f) => (
      <span className="text-amber-600 font-medium">{f.en_proceso}</span>
    )},
    { key: 'entregadas', label: 'Entregado en agencia', render: (f) => (
      <span className="text-teal-600 font-medium">{f.entregadas}</span>
    )},
    { key: 'canceladas', label: 'Retiradas por ajuste', render: (f) => f.canceladas > 0 ? (
      <span className="text-red-600 font-medium">{f.canceladas}</span>
    ) : <span className="text-steel-500">0</span> },
    { key: 'almacenes', label: 'Almacenes', render: (f) => {
      if (!f.desglose_almacenes || f.desglose_almacenes.length === 0 || almacenFiltro) return null;
      const conStock = f.desglose_almacenes.filter(d => d.disponibles > 0);
      if (conStock.length === 0) return <span className="text-steel-500 text-xs">-</span>;
      return (
        <button
          onClick={(e) => { e.stopPropagation(); setExpandido(expandido === f.id ? null : f.id); }}
          className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1"
        >
          {conStock.length} almacén{conStock.length !== 1 ? 'es' : ''}
          {expandido === f.id ? <HiOutlineChevronUp className="w-3 h-3" /> : <HiOutlineChevronDown className="w-3 h-3" />}
        </button>
      );
    }},
  ];

  const buscarUnidad = async () => {
    if (!busqueda.trim()) return;
    try {
      const { data } = await api.get('/inventario/buscar-serial', { params: { serial: busqueda.trim() } });
      setResultadoBusqueda(data);
      toast.success('Unidad encontrada');
    } catch {
      setResultadoBusqueda(null);
      toast.error('No encontrada');
    }
  };

  const enviarAjuste = async () => {
    if (!ajuste.product_id || !ajuste.cantidad || parseInt(ajuste.cantidad) <= 0) {
      return toast.error('Selecciona producto y cantidad valida');
    }
    if (!ajuste.almacen_id) {
      return toast.error('Debe seleccionar un almacén');
    }
    setGuardando(true);
    try {
      const payload = {
        product_id: parseInt(ajuste.product_id),
        tipo: ajuste.tipo,
        cantidad: parseInt(ajuste.cantidad),
        motivo_texto: ajuste.motivo_texto,
        almacen_id: parseInt(ajuste.almacen_id),
      };
      if (ajuste.tipo === 'ingreso' && ajuste.costo_unitario !== '') {
        payload.costo_unitario = parseFloat(ajuste.costo_unitario);
      }
      const { data } = await api.post('/inventario/ajustar', payload);
      toast.success(data.mensaje);
      setModalAjuste(false);
      setAjuste({ product_id: '', tipo: 'ingreso', cantidad: '', motivo_texto: '', costo_unitario: '', almacen_id: '' });
      setTextoProducto('');
      listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al ajustar inventario');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <h1 className="text-2xl font-bold font-display tracking-wider text-steel-100">Inventario</h1>
        {tabActual === 'stock' && esSuperAdmin && (
          <button onClick={() => setModalAjuste(true)} className="btn-primary flex items-center gap-2">
            <HiOutlineAdjustments className="w-4 h-4" /> Ajustar Inventario
          </button>
        )}
      </div>

      <Tabs tabs={tabsInventario} tabActual={tabActual} onChange={setTabActual} />

      {tabActual === 'llegadas' && <TablaProximosIngresos soloImportaciones mostrarCardRetrasadas />}
      {tabActual === 'compras_nacionales' && <TablaProximosIngresos soloCompras />}

      {tabActual === 'stock' && <>
      {/* Filtros */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-3">
          <input
            className="input-field flex-1 min-w-[200px]"
            placeholder="Buscar producto o serial/codigo..."
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setResultadoBusqueda(null); }}
            onKeyDown={(e) => e.key === 'Enter' && buscarUnidad()}
          />
          <select
            className="input-field w-48"
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
          >
            <option value="">Todas las categorias</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className="input-field w-48"
            value={almacenFiltro}
            onChange={(e) => { setAlmacenFiltro(e.target.value); setExpandido(null); }}
          >
            <option value="">Todos los almacenes</option>
            {almacenesActivos.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
          <button onClick={buscarUnidad} className="btn-secondary flex items-center gap-2">
            <HiOutlineSearch className="w-4 h-4" /> Buscar Unidad
          </button>
        </div>
        {resultadoBusqueda && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-400 rounded-lg text-sm">
            <p><strong className="text-steel-200">Producto:</strong> <span className="text-steel-300">{resultadoBusqueda.tbl_productos?.nombre}</span></p>
            <p><strong className="text-steel-200">Serial:</strong> <span className="text-steel-300">{resultadoBusqueda.serial}</span></p>
            <p><strong className="text-steel-200">Codigo Barras:</strong> <span className="text-steel-300">{resultadoBusqueda.codigo_barras}</span></p>
            <p><strong className="text-steel-200">Estado:</strong> <span className="text-steel-300">{resultadoBusqueda.estado_unidad?.replace(/_/g, ' ').toUpperCase()}</span></p>
            <p><strong className="text-steel-200">Almacén:</strong> <span className="text-steel-300">{resultadoBusqueda.tbl_almacenes?.nombre || 'Sin asignar'}</span></p>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="card">
        <TablaGenerica
          columnas={columnas}
          datos={datosFiltrados}
          cargando={cargando}
          filaExpandidaId={expandido}
          onFilaClick={(fila) => setExpandido(expandido === fila.id ? null : fila.id)}
          renderExpandido={(fila) => {
            if (!fila.desglose_almacenes || fila.desglose_almacenes.length === 0) return null;
            return (
              <div className="px-4 py-3 bg-steel-900/20">
                <p className="text-xs font-semibold text-steel-400 mb-2 flex items-center gap-1">
                  <HiOutlineOfficeBuilding className="w-3.5 h-3.5" /> Desglose por almacén
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {fila.desglose_almacenes.filter(d => d.stock_total > 0).map(d => (
                    <div key={d.almacen_id || 'sin'} className="bg-steel-800/50 rounded-lg p-2 text-xs">
                      <span className="font-medium text-steel-200">{d.almacen_nombre}</span>
                      <div className="flex gap-3 mt-1 text-steel-400">
                        <span>Disp: <span className="text-emerald-500 font-medium">{d.disponibles}</span></span>
                        <span>Res: <span className="text-blue-500 font-medium">{d.asignadas}</span></span>
                        <span>Total: <span className="text-steel-300 font-medium">{d.stock_total}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }}
        />
      </div>
      </>}

      {/* Modal Ajustar Inventario */}
      <Modal abierto={modalAjuste} cerrar={() => { setModalAjuste(false); setTextoProducto(''); setAjuste({ product_id: '', tipo: 'ingreso', cantidad: '', motivo_texto: '', costo_unitario: '', almacen_id: '' }); }} titulo="Ajustar Inventario">
        <div className="space-y-4">
          <div>
            <label className="label-field">Producto</label>
            <div ref={comboRef} className="relative">
              <input
                type="text"
                className="input-field w-full"
                placeholder="Escriba para buscar producto..."
                value={textoProducto}
                onChange={(e) => {
                  setTextoProducto(e.target.value);
                  setComboAbierto(true);
                  if (!e.target.value) setAjuste({ ...ajuste, product_id: '' });
                }}
                onFocus={() => setComboAbierto(true)}
              />
              {ajuste.product_id && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-steel-400 hover:text-steel-200 text-lg"
                  onClick={() => { setTextoProducto(''); setAjuste({ ...ajuste, product_id: '' }); }}
                >
                  &times;
                </button>
              )}
              {comboAbierto && (
                <ul className="absolute z-50 w-full mt-1 bg-steel-800 border border-steel-700 rounded-lg shadow-steel max-h-48 overflow-y-auto">
                  {productosFiltrados.length > 0 ? productosFiltrados.map(p => (
                    <li
                      key={p.id}
                      onClick={() => {
                        setAjuste({ ...ajuste, product_id: p.id });
                        setTextoProducto(`${p.nombre} (Disp: ${p.disponibles})`);
                        setComboAbierto(false);
                      }}
                      className={`px-3 py-2 text-sm cursor-pointer border-b border-steel-700/50 last:border-0 transition-colors ${
                        ajuste.product_id === p.id
                          ? 'bg-primary-500/20 text-primary-600'
                          : 'text-steel-200 hover:bg-primary-500/10 hover:text-primary-600'
                      }`}
                    >
                      {p.nombre} <span className="text-steel-400 text-xs">(Disp: {p.disponibles})</span>
                    </li>
                  )) : (
                    <li className="px-3 py-2 text-sm text-steel-400">Sin resultados</li>
                  )}
                </ul>
              )}
            </div>
          </div>

          <div>
            <label className="label-field">Almacén *</label>
            <select
              className="input-field w-full"
              value={ajuste.almacen_id}
              onChange={(e) => setAjuste({ ...ajuste, almacen_id: e.target.value })}
            >
              <option value="">-- Seleccionar almacén --</option>
              {almacenesActivos.map(a => (
                <option key={a.id} value={a.id}>{a.nombre}{a.direccion ? ` — ${a.direccion}` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-field">Tipo de Ajuste</label>
            <div className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipoAjuste"
                  value="ingreso"
                  checked={ajuste.tipo === 'ingreso'}
                  onChange={(e) => setAjuste({ ...ajuste, tipo: e.target.value })}
                  className="text-primary-500"
                />
                <span className="text-emerald-600 font-medium">Ingreso (+)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipoAjuste"
                  value="salida"
                  checked={ajuste.tipo === 'salida'}
                  onChange={(e) => setAjuste({ ...ajuste, tipo: e.target.value })}
                  className="text-primary-500"
                />
                <span className="text-red-600 font-medium">Salida (-)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="label-field">Cantidad</label>
            <input
              type="number"
              min="1"
              className="input-field w-full"
              value={ajuste.cantidad}
              onChange={(e) => setAjuste({ ...ajuste, cantidad: e.target.value })}
              placeholder="Cantidad de unidades"
            />
          </div>

          {ajuste.tipo === 'ingreso' && (
            <div>
              <label className="label-field">Costo Unitario <span className="text-steel-400 font-normal">(opcional)</span></label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input-field w-full"
                value={ajuste.costo_unitario}
                onChange={(e) => setAjuste({ ...ajuste, costo_unitario: e.target.value })}
                placeholder="Dejar vacio si no aplica (se asignara 0)"
              />
            </div>
          )}

          <div>
            <label className="label-field">Motivo del Ajuste</label>
            <textarea
              className="input-field w-full"
              rows={3}
              value={ajuste.motivo_texto}
              onChange={(e) => setAjuste({ ...ajuste, motivo_texto: e.target.value })}
              placeholder="Ej: Correccion por inventario fisico, producto danado, etc."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalAjuste(false)} className="btn-secondary">Cancelar</button>
            <button onClick={enviarAjuste} disabled={guardando} className="btn-primary">
              {guardando ? 'Procesando...' : 'Confirmar Ajuste'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
