import { useState, useMemo } from 'react';
import {
  HiOutlinePlus, HiOutlineSearch, HiOutlinePencil, HiOutlineTrash,
  HiOutlineGlobe, HiOutlineShoppingCart,
} from 'react-icons/hi';
import useCrud from '../../hooks/useCrud';
import usePaginacion from '../../hooks/usePaginacion';
import TablaGenerica from '../../components/ui/TablaGenerica';
import Paginacion from '../../components/ui/Paginacion';
import Modal from '../../components/ui/Modal';
import { TIPO_PROVEEDOR, TELEFONO_INPUT } from '../../config/constants';
import toast from 'react-hot-toast';

const tipoLabel = {
  [TIPO_PROVEEDOR.NACIONAL]: 'Nacional (Compras)',
  [TIPO_PROVEEDOR.IMPORTACION]: 'Importacion',
};

const tipoBadge = {
  [TIPO_PROVEEDOR.NACIONAL]: 'bg-emerald-600 text-white font-semibold',
  [TIPO_PROVEEDOR.IMPORTACION]: 'bg-blue-600 text-white font-semibold',
};

const formVacio = { nombre: '', razon_social: '', ruc: '', telefono: '', correo: '', tipo: TIPO_PROVEEDOR.NACIONAL };

export default function Proveedores() {
  const { datos, cargando, listar, crear, actualizar, eliminar } = useCrud('/proveedores');
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ ...formVacio });
  const [guardando, setGuardando] = useState(false);

  const datosFiltrados = useMemo(() => {
    return datos.filter(d => {
      const q = busqueda.toLowerCase();
      const matchBusqueda = !busqueda ||
        d.nombre?.toLowerCase().includes(q) ||
        d.razon_social?.toLowerCase().includes(q) ||
        d.ruc?.includes(busqueda) ||
        d.correo?.toLowerCase().includes(q) ||
        (TELEFONO_INPUT.toDigits(busqueda) && d.telefono?.includes(TELEFONO_INPUT.toDigits(busqueda)));
      const matchTipo = !filtroTipo || d.tipo === filtroTipo;
      return matchBusqueda && matchTipo;
    });
  }, [datos, busqueda, filtroTipo]);

  const { datosPaginados, paginaActual, totalPaginas, irAPagina } = usePaginacion(datosFiltrados);

  const columnas = [
    { key: 'id', label: 'ID' },
    { key: 'nombre', label: 'Nombre', render: f => (
      <div>
        <span className="font-medium text-steel-100">{f.nombre}</span>
        {f.razon_social && (
          <span className="block text-[10px] text-steel-400">{f.razon_social}{f.ruc ? ` - RUC ${f.ruc}` : ''}</span>
        )}
      </div>
    )},
    { key: 'tipo', label: 'Tipo', render: f => (
      <span className={`text-xs px-2 py-0.5 rounded-full ${tipoBadge[f.tipo] || ''}`}>
        {tipoLabel[f.tipo] || f.tipo}
      </span>
    )},
    { key: 'telefono', label: 'Telefono', render: f => TELEFONO_INPUT.format(f.telefono) || '-' },
    { key: 'correo', label: 'Correo', render: f => f.correo || '-' },
    { key: 'uso', label: 'Uso', render: f => {
      const compras = f._count?.compras || 0;
      const importaciones = f._count?.importaciones || 0;
      return (
        <div className="flex items-center gap-2 text-xs text-steel-400">
          {compras > 0 && <span className="flex items-center gap-0.5"><HiOutlineShoppingCart className="w-3 h-3" />{compras}</span>}
          {importaciones > 0 && <span className="flex items-center gap-0.5"><HiOutlineGlobe className="w-3 h-3" />{importaciones}</span>}
          {compras === 0 && importaciones === 0 && <span>Sin uso</span>}
        </div>
      );
    }},
  ];

  const abrirCrear = () => {
    setEditando(null);
    setForm({ ...formVacio });
    setModal(true);
  };

  const abrirEditar = (prov) => {
    setEditando(prov);
    setForm({
      nombre: prov.nombre || '',
      razon_social: prov.razon_social || '',
      ruc: prov.ruc || '',
      telefono: TELEFONO_INPUT.format(prov.telefono || ''),
      correo: prov.correo || '',
      tipo: prov.tipo || TIPO_PROVEEDOR.NACIONAL,
    });
    setModal(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio');

    const telDigits = TELEFONO_INPUT.toDigits(form.telefono);
    if (telDigits && !TELEFONO_INPUT.esValido(telDigits)) {
      return toast.error(TELEFONO_INPUT.MSG_INVALIDO);
    }
    const body = { ...form, telefono: telDigits || null };

    setGuardando(true);
    try {
      if (editando) {
        await actualizar(editando.id, body);
        toast.success('Proveedor actualizado');
      } else {
        await crear(body);
        toast.success('Proveedor creado');
      }
      setModal(false);
      listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (prov) => {
    if (!confirm(`Eliminar proveedor "${prov.nombre}"?`)) return;
    try {
      await eliminar(prov.id);
      toast.success('Proveedor eliminado');
      listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo eliminar');
    }
  };

  const conteo = useMemo(() => ({
    total: datos.length,
    nacional: datos.filter(d => d.tipo === TIPO_PROVEEDOR.NACIONAL).length,
    importacion: datos.filter(d => d.tipo === TIPO_PROVEEDOR.IMPORTACION).length,
  }), [datos]);

  const esImportacion = form.tipo === TIPO_PROVEEDOR.IMPORTACION;

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-wider text-steel-100">Proveedores</h1>
          <p className="text-sm text-steel-400 mt-1">
            {conteo.total} proveedores — {conteo.nacional} nacionales, {conteo.importacion} importacion
          </p>
        </div>
        <button onClick={abrirCrear} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-4 h-4" /> Nuevo Proveedor
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-500" />
          <input
            className="input-field pl-9"
            placeholder="Buscar por nombre, razon social, RUC, correo..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <select
          className="input-field w-auto"
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          <option value={TIPO_PROVEEDOR.NACIONAL}>Nacional (Compras)</option>
          <option value={TIPO_PROVEEDOR.IMPORTACION}>Importacion</option>
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
        titulo={editando ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        ancho="max-w-lg"
      >
        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-steel-300 mb-1">Nombre *</label>
            <input type="text" className="input-field" placeholder="Nombre del proveedor"
              value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
          </div>

          <div>
            <label className="block text-xs font-medium text-steel-300 mb-1">Tipo *</label>
            <div className="flex gap-3">
              <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                form.tipo === TIPO_PROVEEDOR.NACIONAL
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : 'border-steel-700 hover:border-steel-600'
              }`}>
                <input type="radio" name="tipo" value={TIPO_PROVEEDOR.NACIONAL}
                  checked={form.tipo === TIPO_PROVEEDOR.NACIONAL}
                  onChange={e => setForm({ ...form, tipo: e.target.value })}
                  className="text-emerald-600" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <HiOutlineShoppingCart className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium text-steel-200">Nacional</span>
                  </div>
                  <span className="text-[10px] text-steel-400">Para compras locales</span>
                </div>
              </label>
              <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                form.tipo === TIPO_PROVEEDOR.IMPORTACION
                  ? 'border-blue-500/50 bg-blue-500/10'
                  : 'border-steel-700 hover:border-steel-600'
              }`}>
                <input type="radio" name="tipo" value={TIPO_PROVEEDOR.IMPORTACION}
                  checked={form.tipo === TIPO_PROVEEDOR.IMPORTACION}
                  onChange={e => setForm({ ...form, tipo: e.target.value })}
                  className="text-blue-600" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <HiOutlineGlobe className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-steel-200">Importacion</span>
                  </div>
                  <span className="text-[10px] text-steel-400">Para importaciones</span>
                </div>
              </label>
            </div>
          </div>

          {esImportacion && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
              <div>
                <label className="block text-xs font-medium text-blue-300 mb-1">Razon Social</label>
                <input type="text" className="input-field" placeholder="Ej: MAQUINARIAS RASEC SAC"
                  value={form.razon_social} onChange={e => setForm({ ...form, razon_social: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-blue-300 mb-1">RUC</label>
                <input type="text" className="input-field" placeholder="Ej: 20608304992" maxLength={20}
                  value={form.ruc} onChange={e => setForm({ ...form, ruc: e.target.value })} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-steel-300 mb-1">Telefono</label>
              <input
                type="tel"
                className="input-field"
                inputMode={TELEFONO_INPUT.INPUT_MODE}
                pattern={TELEFONO_INPUT.PATTERN}
                maxLength={TELEFONO_INPUT.MAX_LENGTH}
                placeholder={TELEFONO_INPUT.PLACEHOLDER}
                value={form.telefono}
                onChange={e => setForm({ ...form, telefono: TELEFONO_INPUT.format(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-steel-300 mb-1">Correo</label>
              <input type="email" className="input-field" placeholder="correo@ejemplo.com"
                value={form.correo} onChange={e => setForm({ ...form, correo: e.target.value })} />
            </div>
          </div>

          <div className="border-t border-steel-700 pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary" disabled={guardando}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={guardando}>
              {guardando ? 'Guardando...' : editando ? 'Actualizar' : 'Crear Proveedor'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
