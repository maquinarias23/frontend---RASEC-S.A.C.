import { useState } from 'react';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTruck } from 'react-icons/hi';
import useCrud from '../../hooks/useCrud';
import TablaGenerica from '../../components/ui/TablaGenerica';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import api from '../../api/axios';

export default function Transportistas() {
  const { datos, cargando, listar } = useCrud('/transportistas/todos');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [nombre, setNombre] = useState('');
  const [requiereContrasena, setRequiereContrasena] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const abrirCrear = () => {
    setEditando(null);
    setNombre('');
    setRequiereContrasena(false);
    setModal(true);
  };

  const abrirEditar = (t) => {
    setEditando(t);
    setNombre(t.nombre);
    setRequiereContrasena(t.requiere_contrasena);
    setModal(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!nombre.trim() || guardando) return;
    setGuardando(true);
    try {
      if (editando) {
        await api.put(`/transportistas/${editando.id}`, { nombre: nombre.trim(), requiere_contrasena: requiereContrasena });
        toast.success('Transportista actualizado');
      } else {
        await api.post('/transportistas', { nombre: nombre.trim(), requiere_contrasena: requiereContrasena });
        toast.success('Transportista creado');
      }
      setModal(false);
      listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const toggleActivo = async (t) => {
    try {
      await api.patch(`/transportistas/${t.id}/toggle-activo`);
      toast.success(t.activo ? 'Transportista desactivado' : 'Transportista activado');
      listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cambiar estado');
    }
  };

  const columnas = [
    { key: 'nombre', label: 'Nombre' },
    {
      key: 'requiere_contrasena', label: 'Requiere Contraseña', render: (f) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${f.requiere_contrasena ? 'bg-blue-100 text-blue-700' : 'bg-steel-700 text-steel-300'}`}>
          {f.requiere_contrasena ? 'Sí' : 'No'}
        </span>
      ),
    },
    {
      key: 'activo', label: 'Estado', render: (f) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${f.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
          {f.activo ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    { key: 'creador', label: 'Creado por', render: (f) => f.tbl_usuarios?.nombres || '-' },
  ];

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <div>
          <h1 className="text-2xl font-bold text-steel-100 font-display tracking-wider">Transportistas</h1>
          <p className="text-sm text-steel-400 mt-1">Gestiona las agencias de transporte disponibles para envios</p>
        </div>
        <button onClick={abrirCrear} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-4 h-4" /> Nuevo Transportista
        </button>
      </div>

      <div className="card">
        <TablaGenerica
          columnas={columnas}
          datos={datos}
          cargando={cargando}
          vacio="No hay transportistas registrados."
          acciones={(fila) => (
            <div className="flex gap-1">
              <button onClick={() => abrirEditar(fila)} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 flex items-center gap-1" title="Editar">
                <HiOutlinePencil className="w-3.5 h-3.5" /> Editar
              </button>
              <button
                onClick={() => toggleActivo(fila)}
                className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${fila.activo ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'}`}
                title={fila.activo ? 'Desactivar' : 'Activar'}
              >
                {fila.activo ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          )}
        />
      </div>

      <Modal abierto={modal} cerrar={() => setModal(false)} titulo={editando ? 'Editar Transportista' : 'Nuevo Transportista'}>
        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">Nombre</label>
            <input
              type="text"
              className="input-field w-full"
              placeholder="Ej: Shalom, Marvisur, Cavasa..."
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={requiereContrasena}
                onChange={(e) => setRequiereContrasena(e.target.checked)}
              />
              <div className="w-9 h-5 bg-steel-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
            <span className="text-sm text-steel-200">Requiere contraseña de recojo</span>
          </div>
          <p className="text-xs text-steel-500">
            Si se activa, el conductor debera ingresar una contraseña al confirmar la entrega. El cliente usara esta contraseña para recoger su pedido en la agencia.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary" disabled={guardando}>Cancelar</button>
            <button type="submit" disabled={guardando} className="btn-primary flex items-center gap-2">
              {guardando ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <HiOutlineTruck className="w-4 h-4" />}
              {editando ? 'Guardar Cambios' : 'Crear Transportista'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
