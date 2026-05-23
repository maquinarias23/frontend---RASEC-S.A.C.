import { useState, useMemo } from 'react';
import {
  HiOutlinePlus, HiOutlineSearch, HiOutlinePencil, HiOutlineTrash,
  HiOutlineOfficeBuilding, HiOutlineShoppingCart, HiOutlineGlobe,
  HiOutlineCube, HiOutlineCheckCircle, HiOutlineXCircle,
} from 'react-icons/hi';
import useCrud from '../../hooks/useCrud';
import usePaginacion from '../../hooks/usePaginacion';
import TablaGenerica from '../../components/ui/TablaGenerica';
import Paginacion from '../../components/ui/Paginacion';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';

const formVacio = { nombre: '', direccion: '', activo: true };

export default function Almacenes() {
  const { datos, cargando, listar, crear, actualizar, eliminar } = useCrud('/almacenes');
  const [busqueda, setBusqueda] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ ...formVacio });
  const [guardando, setGuardando] = useState(false);

  const datosFiltrados = useMemo(() => {
    return datos.filter(d => {
      const q = busqueda.toLowerCase();
      const matchBusqueda = !busqueda ||
        d.nombre?.toLowerCase().includes(q) ||
        d.direccion?.toLowerCase().includes(q);
      const matchActivo = filtroActivo === '' || String(d.activo) === filtroActivo;
      return matchBusqueda && matchActivo;
    });
  }, [datos, busqueda, filtroActivo]);

  const { datosPaginados, paginaActual, totalPaginas, irAPagina } = usePaginacion(datosFiltrados);

  const columnas = [
    { key: 'id', label: 'ID' },
    { key: 'nombre', label: 'Almacén', render: f => (
      <div className="flex items-center gap-2">
        <HiOutlineOfficeBuilding className="w-4 h-4 text-amber-500 shrink-0" />
        <div>
          <span className="font-medium text-steel-100">{f.nombre}</span>
          {f.direccion && (
            <span className="block text-[10px] text-steel-400">{f.direccion}</span>
          )}
        </div>
      </div>
    )},
    { key: 'activo', label: 'Estado', render: f => (
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${
        f.activo
          ? 'bg-emerald-600/20 text-emerald-400'
          : 'bg-red-600/20 text-red-400'
      }`}>
        {f.activo
          ? <><HiOutlineCheckCircle className="w-3.5 h-3.5" /> Activo</>
          : <><HiOutlineXCircle className="w-3.5 h-3.5" /> Inactivo</>
        }
      </span>
    )},
    { key: 'uso', label: 'Uso', render: f => {
      const compras = f._count?.compras || 0;
      const importaciones = f._count?.importaciones || 0;
      const unidades = f._count?.unidades || 0;
      return (
        <div className="flex items-center gap-3 text-xs text-steel-400">
          {compras > 0 && (
            <span className="flex items-center gap-0.5" title="Compras">
              <HiOutlineShoppingCart className="w-3 h-3" />{compras}
            </span>
          )}
          {importaciones > 0 && (
            <span className="flex items-center gap-0.5" title="Importaciones">
              <HiOutlineGlobe className="w-3 h-3" />{importaciones}
            </span>
          )}
          {unidades > 0 && (
            <span className="flex items-center gap-0.5" title="Unidades">
              <HiOutlineCube className="w-3 h-3" />{unidades}
            </span>
          )}
          {compras === 0 && importaciones === 0 && unidades === 0 && <span>Sin uso</span>}
        </div>
      );
    }},
  ];

  const abrirCrear = () => {
    setEditando(null);
    setForm({ ...formVacio });
    setModal(true);
  };

  const abrirEditar = (alm) => {
    setEditando(alm);
    setForm({
      nombre: alm.nombre || '',
      direccion: alm.direccion || '',
      activo: alm.activo,
    });
    setModal(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio');

    setGuardando(true);
    try {
      if (editando) {
        await actualizar(editando.id, form);
        toast.success('Almacén actualizado');
      } else {
        await crear(form);
        toast.success('Almacén creado');
      }
      setModal(false);
      listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (alm) => {
    if (!confirm(`Eliminar almacén "${alm.nombre}"?`)) return;
    try {
      await eliminar(alm.id);
      toast.success('Almacén eliminado');
      listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo eliminar');
    }
  };

  const conteo = useMemo(() => ({
    total: datos.length,
    activos: datos.filter(d => d.activo).length,
    inactivos: datos.filter(d => !d.activo).length,
  }), [datos]);

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-wider text-steel-100">Almacenes</h1>
          <p className="text-sm text-steel-400 mt-1">
            {conteo.total} almacenes — {conteo.activos} activos, {conteo.inactivos} inactivos
          </p>
        </div>
        <button onClick={abrirCrear} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-4 h-4" /> Nuevo Almacén
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-500" />
          <input
            className="input-field pl-9"
            placeholder="Buscar por nombre o dirección..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <select
          className="input-field w-auto"
          value={filtroActivo}
          onChange={e => setFiltroActivo(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="card">
        <TablaGenerica
          columnas={columnas}
          datos={datosPaginados}
          cargando={cargando}
          acciones={fila => (
            <div className="flex items-center gap-2">
              <button onClick={() => abrirEditar(fila)}
                className="text-blue-600 hover:text-blue-400 p-1 rounded hover:bg-blue-500/10"
                title="Editar">
                <HiOutlinePencil className="w-4 h-4" />
              </button>
              <button onClick={() => handleEliminar(fila)}
                className="text-red-600/60 hover:text-red-500 p-1 rounded hover:bg-red-500/10"
                title="Eliminar">
                <HiOutlineTrash className="w-4 h-4" />
              </button>
            </div>
          )}
        />
        <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onChange={irAPagina} />
      </div>

      {/* Modal Crear/Editar */}
      <Modal
        abierto={modal}
        cerrar={() => !guardando && setModal(false)}
        titulo={editando ? 'Editar Almacén' : 'Nuevo Almacén'}
        ancho="max-w-lg"
      >
        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-steel-300 mb-1">Nombre *</label>
            <input type="text" className="input-field" placeholder="Ej: Almacén Central"
              value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
          </div>

          <div>
            <label className="block text-xs font-medium text-steel-300 mb-1">Dirección</label>
            <input type="text" className="input-field" placeholder="Ej: Av. Industrial 1234, Lima"
              value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} />
          </div>

          {editando && (
            <div>
              <label className="block text-xs font-medium text-steel-300 mb-1">Estado</label>
              <div className="flex gap-3">
                <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  form.activo
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : 'border-steel-700 hover:border-steel-600'
                }`}>
                  <input type="radio" name="activo" value="true"
                    checked={form.activo === true}
                    onChange={() => setForm({ ...form, activo: true })}
                    className="text-emerald-600" />
                  <div className="flex items-center gap-1.5">
                    <HiOutlineCheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-steel-200">Activo</span>
                  </div>
                </label>
                <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  form.activo === false
                    ? 'border-red-500/50 bg-red-500/10'
                    : 'border-steel-700 hover:border-steel-600'
                }`}>
                  <input type="radio" name="activo" value="false"
                    checked={form.activo === false}
                    onChange={() => setForm({ ...form, activo: false })}
                    className="text-red-600" />
                  <div className="flex items-center gap-1.5">
                    <HiOutlineXCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-steel-200">Inactivo</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          <div className="border-t border-steel-700 pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary" disabled={guardando}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={guardando}>
              {guardando ? 'Guardando...' : editando ? 'Actualizar' : 'Crear Almacén'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
