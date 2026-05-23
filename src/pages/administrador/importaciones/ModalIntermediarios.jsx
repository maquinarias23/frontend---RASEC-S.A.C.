import { useState, useEffect } from 'react';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineX } from 'react-icons/hi';
import Modal from '../../../components/ui/Modal';
import api from '../../../api/axios';
import toast from 'react-hot-toast';
import { TELEFONO_INPUT } from '../../../config/constants';

export default function ModalIntermediarios({ abierto, cerrar, onActualizado }) {
  const [intermediarios, setIntermediarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ codigo: '', nombre: '', telefono: '', correo: '' });

  const cargar = async () => {
    setCargando(true);
    try {
      const { data } = await api.get('/intermediarios');
      setIntermediarios(data);
    } catch { setIntermediarios([]); }
    finally { setCargando(false); }
  };

  useEffect(() => { if (abierto) cargar(); }, [abierto]);

  const resetForm = () => { setForm({ codigo: '', nombre: '', telefono: '', correo: '' }); setEditando(null); };

  const guardar = async () => {
    if (!form.codigo || !form.nombre) return toast.error('Codigo y nombre son obligatorios');
    const telDigits = TELEFONO_INPUT.toDigits(form.telefono);
    if (telDigits && !TELEFONO_INPUT.esValido(telDigits)) {
      return toast.error(TELEFONO_INPUT.MSG_INVALIDO);
    }
    const body = { ...form, telefono: telDigits || null };
    try {
      if (editando) {
        await api.put(`/intermediarios/${editando}`, body);
        toast.success('Intermediario actualizado');
      } else {
        await api.post('/intermediarios', body);
        toast.success('Intermediario creado');
      }
      resetForm();
      cargar();
      if (onActualizado) onActualizado();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const editar = (i) => {
    setEditando(i.id);
    setForm({ codigo: i.codigo, nombre: i.nombre, telefono: TELEFONO_INPUT.format(i.telefono || ''), correo: i.correo || '' });
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este intermediario?')) return;
    try {
      await api.delete(`/intermediarios/${id}`);
      toast.success('Intermediario eliminado');
      cargar();
      if (onActualizado) onActualizado();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
    }
  };

  return (
    <Modal abierto={abierto} cerrar={cerrar} titulo="Gestionar Intermediarios Logisticos" ancho="max-w-2xl">
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          <input type="text" className="input-field text-sm" placeholder="Codigo (RUC)" value={form.codigo} onChange={e => setForm({...form, codigo: e.target.value})} />
          <input type="text" className="input-field text-sm" placeholder="Nombre" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
          <input
            type="tel"
            className="input-field text-sm"
            inputMode={TELEFONO_INPUT.INPUT_MODE}
            pattern={TELEFONO_INPUT.PATTERN}
            maxLength={TELEFONO_INPUT.MAX_LENGTH}
            placeholder={TELEFONO_INPUT.PLACEHOLDER}
            value={form.telefono}
            onChange={e => setForm({...form, telefono: TELEFONO_INPUT.format(e.target.value)})}
          />
          <div className="flex gap-1">
            <input type="text" className="input-field text-sm flex-1" placeholder="Correo" value={form.correo} onChange={e => setForm({...form, correo: e.target.value})} />
            <button onClick={guardar} className="btn-primary text-xs px-2 whitespace-nowrap">{editando ? 'Actualizar' : '+ Crear'}</button>
            {editando && <button onClick={resetForm} className="btn-secondary text-xs px-2"><HiOutlineX className="w-3 h-3" /></button>}
          </div>
        </div>

        <div className="border border-steel-700 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-steel-900/50 border-b border-steel-700">
              <th className="text-left py-2 px-3 text-steel-400 font-medium">Codigo</th>
              <th className="text-left py-2 px-3 text-steel-400 font-medium">Nombre</th>
              <th className="text-left py-2 px-3 text-steel-400 font-medium">Telefono</th>
              <th className="text-left py-2 px-3 text-steel-400 font-medium">Correo</th>
              <th className="w-16" />
            </tr></thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={5} className="text-center py-4 text-steel-500">Cargando...</td></tr>
              ) : intermediarios.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-4 text-steel-500">Sin intermediarios</td></tr>
              ) : intermediarios.map(i => (
                <tr key={i.id} className="border-b border-steel-700/50 hover:bg-steel-900/30">
                  <td className="py-2 px-3 text-steel-100">{i.codigo}</td>
                  <td className="py-2 px-3 text-steel-100">{i.nombre}</td>
                  <td className="py-2 px-3 text-steel-400">{TELEFONO_INPUT.format(i.telefono) || '-'}</td>
                  <td className="py-2 px-3 text-steel-400">{i.correo || '-'}</td>
                  <td className="py-2 px-3 flex gap-1">
                    <button onClick={() => editar(i)} className="text-blue-600 hover:text-blue-400 p-1"><HiOutlinePencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => eliminar(i.id)} className="text-red-600 hover:text-red-400 p-1"><HiOutlineTrash className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
