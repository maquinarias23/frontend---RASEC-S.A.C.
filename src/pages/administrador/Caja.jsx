import { useState, useEffect } from 'react';
import { HiOutlinePlus, HiOutlineCash, HiOutlineTrendingDown, HiOutlineScale } from 'react-icons/hi';
import useCrud from '../../hooks/useCrud';
import usePaginacion from '../../hooks/usePaginacion';
import TablaGenerica from '../../components/ui/TablaGenerica';
import TarjetaResumen from '../../components/ui/TarjetaResumen';
import Modal from '../../components/ui/Modal';
import Paginacion from '../../components/ui/Paginacion';
import DateRangePicker from '../../components/ui/DateRangePicker';
import { formatearMoneda, formatearFechaHora } from '../../utils/formato';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const columnas = [
  { key: 'id', label: 'ID' },
  { key: 'tipo', label: 'Tipo', render: (f) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${f.tipo === 'ingreso' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
      {f.tipo?.toUpperCase()}
    </span>
  )},
  { key: 'origen', label: 'Origen', render: (f) => f.origen?.replace(/_/g, ' ') },
  { key: 'categoria', label: 'Categoría', render: (f) => f.tbl_categorias_gasto?.nombre || '-' },
  { key: 'monto', label: 'Monto', render: (f) => (
    <span className={f.tipo === 'ingreso' ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
      {f.tipo === 'ingreso' ? '+' : '-'}{formatearMoneda(Math.abs(f.monto))}
    </span>
  )},
  { key: 'descripcion', label: 'Descripción', render: (f) => f.descripcion || '-' },
  { key: 'fecha_hora', label: 'Fecha', render: (f) => formatearFechaHora(f.fecha_hora) },
];

export default function Caja() {
  const { datos, cargando, listar } = useCrud('/caja');
  const [resumen, setResumen] = useState({});
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ monto: '', categoria_id: '', descripcion: '' });
  const [fechas, setFechas] = useState({ fechaInicio: '', fechaFin: '' });

  // Categorias dinamicas
  const [categorias, setCategorias] = useState([]);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [creandoCategoria, setCreandoCategoria] = useState(false);

  const cargarCategorias = async () => {
    try {
      const { data } = await api.get('/categorias-gasto');
      setCategorias(data);
    } catch { /* silent */ }
  };

  useEffect(() => { cargarCategorias(); }, []);

  // Filtrar por fecha
  const datosFiltrados = datos.filter(d => {
    if (!fechas.fechaInicio && !fechas.fechaFin) return true;
    const fecha = new Date(d.fecha_hora);
    if (fechas.fechaInicio && fecha < new Date(fechas.fechaInicio)) return false;
    if (fechas.fechaFin && fecha > new Date(fechas.fechaFin + 'T23:59:59')) return false;
    return true;
  });

  const { datosPaginados, paginaActual, totalPaginas, irAPagina } = usePaginacion(datosFiltrados);

  useEffect(() => {
    const params = {};
    if (fechas.fechaInicio) params.fecha_desde = fechas.fechaInicio;
    if (fechas.fechaFin) params.fecha_hasta = fechas.fechaFin;
    api.get('/caja/resumen', { params }).then(r => setResumen(r.data)).catch(() => {});
  }, [datos, fechas.fechaInicio, fechas.fechaFin]);

  const guardarGasto = async (e) => {
    e.preventDefault();
    try {
      await api.post('/caja/gasto', {
        monto: parseFloat(form.monto),
        categoria_id: form.categoria_id || null,
        descripcion: form.descripcion
      });
      toast.success('Gasto registrado');
      setModal(false);
      setForm({ monto: '', categoria_id: '', descripcion: '' });
      listar();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const crearCategoria = async () => {
    if (!nuevaCategoria.trim()) return;
    setCreandoCategoria(true);
    try {
      const { data } = await api.post('/categorias-gasto', { nombre: nuevaCategoria.trim() });
      toast.success('Categoría creada');
      setNuevaCategoria('');
      await cargarCategorias();
      setForm(prev => ({ ...prev, categoria_id: data.id }));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear categoría');
    } finally {
      setCreandoCategoria(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <h1 className="text-2xl font-bold font-display tracking-wider text-steel-100">Flujo de Caja</h1>
        <button onClick={() => { setForm({ monto: '', categoria_id: '', descripcion: '' }); setModal(true); }} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-4 h-4" /> Registrar Gasto
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <TarjetaResumen titulo="Total Ingresos" valor={formatearMoneda(resumen.ingresos || 0)} icono={HiOutlineCash} color="green" />
        <TarjetaResumen titulo="Total Gastos" valor={formatearMoneda(resumen.gastos || 0)} icono={HiOutlineTrendingDown} color="red" />
        <TarjetaResumen titulo="Balance" valor={formatearMoneda(resumen.saldo || 0)} icono={HiOutlineScale} color="blue" />
      </div>

      <div className="card mb-4">
        <div className="flex items-end gap-4">
          <DateRangePicker fechaInicio={fechas.fechaInicio} fechaFin={fechas.fechaFin} onChange={setFechas} />
          {(fechas.fechaInicio || fechas.fechaFin) && (
            <button onClick={() => setFechas({ fechaInicio: '', fechaFin: '' })} className="text-sm text-red-600 hover:text-red-700 h-10">Limpiar</button>
          )}
        </div>
      </div>

      <div className="card">
        <TablaGenerica columnas={columnas} datos={datosPaginados} cargando={cargando} vacio="Sin movimientos de caja." />
        <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onChange={irAPagina} />
      </div>

      <Modal abierto={modal} cerrar={() => setModal(false)} titulo="Registrar Gasto">
        <form onSubmit={guardarGasto} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">Monto (S/)</label>
            <input type="number" step="0.01" min="0.01" className="input-field" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">Categoría</label>
            <select className="input-field" value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}>
              <option value="">Sin categoría</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            <div className="flex gap-2 mt-2">
              <input
                className="input-field flex-1 text-sm"
                placeholder="Nueva categoría..."
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), crearCategoria())}
              />
              <button
                type="button"
                onClick={crearCategoria}
                disabled={creandoCategoria || !nuevaCategoria.trim()}
                className="btn-secondary text-sm px-3"
              >
                {creandoCategoria ? '...' : '+ Crear'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">Descripción</label>
            <textarea className="input-field" rows={3} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Registrar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
