import { useState } from 'react';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch, HiOutlineQrcode } from 'react-icons/hi';
import useCrud from '../../hooks/useCrud';
import usePaginacion from '../../hooks/usePaginacion';
import TablaGenerica from '../../components/ui/TablaGenerica';
import Modal from '../../components/ui/Modal';
import Paginacion from '../../components/ui/Paginacion';
import DialogConfirmacion from '../../components/ui/DialogConfirmacion';
import EstadoBadge from '../../components/ui/EstadoBadge';
import toast from 'react-hot-toast';
import { ESTADO_ACCESO, TELEFONO_INPUT, DNI_RUC_INPUT } from '../../config/constants';
import api from '../../api/axios';

const columnas = [
  { key: 'id', label: 'ID' },
  { key: 'nombres', label: 'Nombres' },
  { key: 'correo', label: 'Correo' },
  { key: 'telefono', label: 'Teléfono', render: (f) => TELEFONO_INPUT.format(f.telefono) || '-' },
  { key: 'rol', label: 'Rol', render: (f) => (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
      {f.tbl_roles?.nombre || f.rol || '-'}
    </span>
  )},
  { key: 'estado_acceso', label: 'Estado', render: (f) => <EstadoBadge estado={f.estado_acceso} /> },
];

const formInicial = { nombres: '', correo: '', telefono: '', dni: '', contrasena: '', id_rol: '', estado_acceso: ESTADO_ACCESO.ACTIVO, fecha_ingreso: '' };

export default function Usuarios() {
  const { datos, cargando, listar } = useCrud('/usuarios');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(formInicial);
  const [roles, setRoles] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [confirmEliminar, setConfirmEliminar] = useState(null);
  const [verPassUsuario, setVerPassUsuario] = useState(false);
  const [modalQr, setModalQr] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [qrCargando, setQrCargando] = useState(false);

  const datosFiltrados = datos.filter(d => {
    const matchBusqueda = !busqueda || d.nombres?.toLowerCase().includes(busqueda.toLowerCase()) || d.correo?.toLowerCase().includes(busqueda.toLowerCase());
    const matchRol = !filtroRol || (d.tbl_roles?.nombre || d.rol) === filtroRol;
    const matchEstado = !filtroEstado || d.estado_acceso === filtroEstado;
    return matchBusqueda && matchRol && matchEstado;
  });

  const { datosPaginados, paginaActual, totalPaginas, irAPagina } = usePaginacion(datosFiltrados);

  const rolesUnicos = [...new Set(datos.map(d => d.tbl_roles?.nombre || d.rol).filter(Boolean))];

  const cargarRoles = async () => {
    try {
      const { data } = await api.get('/usuarios/roles');
      setRoles(Array.isArray(data) ? data : []);
    } catch { /* */ }
  };

  const abrirCrear = async () => {
    setEditando(null);
    setForm(formInicial);
    await cargarRoles();
    setModal(true);
  };

  const abrirEditar = async (usuario) => {
    setEditando(usuario);
    setForm({
      nombres: usuario.nombres,
      correo: usuario.correo,
      telefono: TELEFONO_INPUT.format(usuario.telefono || ''),
      dni: usuario.dni || '',
      contrasena: '',
      id_rol: usuario.id_rol?.toString() || '',
      estado_acceso: usuario.estado_acceso,
    });
    await cargarRoles();
    setModal(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    try {
      const telefonoDigits = TELEFONO_INPUT.toDigits(form.telefono);
      if (telefonoDigits && !TELEFONO_INPUT.esValido(telefonoDigits)) {
        toast.error(TELEFONO_INPUT.MSG_INVALIDO);
        return;
      }
      const dniDigits = DNI_RUC_INPUT.toDigits(form.dni);
      if (dniDigits && !DNI_RUC_INPUT.esValido(dniDigits)) {
        toast.error(DNI_RUC_INPUT.MSG_INVALIDO);
        return;
      }
      const body = { ...form, id_rol: parseInt(form.id_rol), telefono: telefonoDigits || null, dni: dniDigits || null };
      if (!body.contrasena) delete body.contrasena;
      if (!body.fecha_ingreso) delete body.fecha_ingreso;
      if (editando) {
        delete body.fecha_ingreso;
        await api.put(`/usuarios/${editando.id}`, body);
        toast.success('Usuario actualizado');
      } else {
        await api.post('/usuarios', body);
        toast.success('Usuario y empleado creados');
      }
      setModal(false);
      listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    }
  };

  const verFotocheck = async (usuario) => {
    setQrCargando(true);
    setQrData(null);
    setModalQr(true);
    try {
      const { data } = await api.get(`/usuarios/${usuario.id}/qr`);
      setQrData(data);
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al obtener fotocheck';
      toast.error(msg);
      setModalQr(false);
    } finally {
      setQrCargando(false);
    }
  };

  const regenerarQr = async () => {
    if (!qrData) return;
    setQrCargando(true);
    try {
      const { data } = await api.post(`/usuarios/${qrData.id}/regenerar-qr`);
      setQrData(prev => ({ ...prev, ...data }));
      toast.success('QR regenerado correctamente');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al regenerar QR');
    } finally {
      setQrCargando(false);
    }
  };

  const eliminarUsuario = async () => {
    if (!confirmEliminar) return;
    try {
      await api.delete(`/usuarios/${confirmEliminar}`);
      toast.success('Usuario desactivado');
      setConfirmEliminar(null);
      listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <h1 className="text-2xl font-bold font-display tracking-wider text-steel-100">Gestión de Usuarios</h1>
        <button onClick={abrirCrear} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-4 h-4" /> Nuevo Usuario
        </button>
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-500" />
            <input className="input-field pl-9" placeholder="Buscar por nombre o correo..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <select className="input-field w-auto" value={filtroRol} onChange={e => setFiltroRol(e.target.value)}>
            <option value="">Todos los roles</option>
            {rolesUnicos.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select className="input-field w-auto" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value={ESTADO_ACCESO.ACTIVO}>Activo</option>
            <option value={ESTADO_ACCESO.INACTIVO}>Inactivo</option>
          </select>
        </div>
      </div>

      <div className="card">
        <TablaGenerica columnas={columnas} datos={datosPaginados} cargando={cargando}
          acciones={(fila) => (
            <div className="flex gap-1">
              <button onClick={() => verFotocheck(fila)} className="text-primary-600 hover:text-primary-700" title="Ver Fotocheck QR"><HiOutlineQrcode className="w-4 h-4" /></button>
              <button onClick={() => abrirEditar(fila)} className="text-blue-600 hover:text-blue-700" title="Editar"><HiOutlinePencil className="w-4 h-4" /></button>
              <button onClick={() => setConfirmEliminar(fila.id)} className="text-red-600 hover:text-red-700" title="Desactivar"><HiOutlineTrash className="w-4 h-4" /></button>
            </div>
          )}
        />
        <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onChange={irAPagina} />
      </div>

      <Modal abierto={modal} cerrar={() => setModal(false)} titulo={editando ? 'Editar Usuario' : 'Nuevo Usuario'}>
        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">Nombres</label>
            <input className="input-field" value={form.nombres} onChange={(e) => setForm({ ...form, nombres: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">Correo</label>
            <input type="email" className="input-field" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1">Teléfono</label>
              <input
                className="input-field"
                type="tel"
                inputMode={TELEFONO_INPUT.INPUT_MODE}
                pattern={TELEFONO_INPUT.PATTERN}
                maxLength={TELEFONO_INPUT.MAX_LENGTH}
                placeholder={TELEFONO_INPUT.PLACEHOLDER}
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: TELEFONO_INPUT.format(e.target.value) })}
              />
            </div>
            <div>
              {/* El DNI del chofer se imprime como remitente en el rótulo de venta. */}
              <label className="block text-sm font-medium text-steel-200 mb-1">DNI</label>
              <input
                className="input-field"
                inputMode={DNI_RUC_INPUT.INPUT_MODE}
                pattern={DNI_RUC_INPUT.PATTERN}
                maxLength={DNI_RUC_INPUT.MAX_LENGTH}
                placeholder={DNI_RUC_INPUT.PLACEHOLDER}
                value={form.dni}
                onChange={(e) => setForm({ ...form, dni: DNI_RUC_INPUT.toDigits(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">Contraseña {editando && '(dejar vacío para no cambiar)'}</label>
            <div className="relative">
              <input type={verPassUsuario ? 'text' : 'password'} className="input-field pr-10" value={form.contrasena} onChange={(e) => setForm({ ...form, contrasena: e.target.value })} {...(!editando && { required: true })} />
              <button type="button" onClick={() => setVerPassUsuario(!verPassUsuario)} className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-400 hover:text-steel-200 transition-colors">
                {verPassUsuario ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1">Rol</label>
              <select className="input-field" value={form.id_rol} onChange={(e) => setForm({ ...form, id_rol: e.target.value })} required>
                <option value="">Seleccionar rol</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1">Estado</label>
              <select className="input-field" value={form.estado_acceso} onChange={(e) => setForm({ ...form, estado_acceso: e.target.value })}>
                <option value={ESTADO_ACCESO.ACTIVO}>Activo</option>
                <option value={ESTADO_ACCESO.INACTIVO}>Inactivo</option>
              </select>
            </div>
          </div>
          {!editando && form.id_rol && (
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1">Fecha de Ingreso (empleado)</label>
              <input type="date" className="input-field" value={form.fecha_ingreso} onChange={(e) => setForm({ ...form, fecha_ingreso: e.target.value })} />
              <p className="text-xs text-steel-500 mt-1">Se registrara automaticamente como empleado. Si no ingresa fecha, se usara la fecha de hoy.</p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">{editando ? 'Actualizar' : 'Crear'}</button>
          </div>
        </form>
      </Modal>

      <DialogConfirmacion abierto={!!confirmEliminar} titulo="Desactivar Usuario"
        mensaje="¿Estás seguro de desactivar este usuario? Su acceso será revocado."
        onConfirmar={eliminarUsuario} onCancelar={() => setConfirmEliminar(null)} tipo="peligro" />

      {/* Modal Fotocheck QR */}
      <Modal abierto={modalQr} cerrar={() => setModalQr(false)} titulo="Fotocheck QR" ancho="max-w-sm">
        {qrCargando ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : qrData ? (
          <div className="flex flex-col items-center space-y-4">
            {/* Fotocheck card */}
            <div className="w-full bg-steel-800 rounded-xl border border-steel-700 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary-600 to-primary-800 px-4 py-3 text-center">
                <p className="text-white text-xs font-medium tracking-widest uppercase">Maquinarias Rasec S.A.C</p>
                <p className="text-white/70 text-[10px] tracking-wider">Fotocheck de Empleado</p>
              </div>
              {/* QR image */}
              <div className="flex justify-center py-4 bg-white">
                <img src={qrData.qr_imagen} alt="Código QR" className="w-48 h-48" />
              </div>
              {/* Info */}
              <div className="px-4 py-3 text-center space-y-1">
                <p className="text-steel-100 font-bold text-base">{qrData.nombres}</p>
                <p className="text-primary-600 text-xs font-medium uppercase tracking-wider">{qrData.rol}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 w-full">
              <button
                onClick={regenerarQr}
                disabled={qrCargando}
                className="btn-secondary flex-1 text-sm"
              >
                Regenerar QR
              </button>
              <a
                href={qrData.qr_imagen}
                download={`fotocheck-${qrData.nombres?.replace(/\s+/g, '-')}.png`}
                className="btn-primary flex-1 text-sm text-center"
              >
                Descargar
              </a>
            </div>
          </div>
        ) : (
          <p className="text-steel-500 text-center py-8">No se pudo cargar el fotocheck</p>
        )}
      </Modal>
    </div>
  );
}
