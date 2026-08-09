import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineEye, HiOutlineSearch, HiOutlineClock } from 'react-icons/hi';
import useCrud from '../../hooks/useCrud';
import usePaginacion from '../../hooks/usePaginacion';
import TablaGenerica from '../../components/ui/TablaGenerica';
import Modal from '../../components/ui/Modal';
import Paginacion from '../../components/ui/Paginacion';
import ModalEditarCliente from '../../components/shared/ModalEditarCliente';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import EstadoBadge from '../../components/ui/EstadoBadge';
import { formatearFechaHora, formatearMoneda } from '../../utils/formato';
import { ESTADO_ACCESO, TELEFONO_INPUT } from '../../config/constants';
import useAuthStore from '../../store/authStore';
import { RUTAS_POR_ROL } from '../../config/roles';

const columnas = [
  { key: 'id', label: 'ID' },
  { key: 'nombre', label: 'Nombre' },
  { key: 'dni', label: 'DNI/RUC' },
  { key: 'telefono_principal', label: 'Teléfono', render: (f) => TELEFONO_INPUT.format(f.telefono_principal) || '-' },
  { key: 'correo', label: 'Correo', render: (f) => f.tbl_usuarios?.correo || '-' },
  { key: 'total_compras', label: 'Compras', render: (f) => (
    <span className="font-semibold text-steel-200">{f.total_compras || 0}</span>
  )},
  { key: 'valor_comprado', label: 'Valor Comprado', render: (f) => (
    <span className="font-semibold text-amber-600">{formatearMoneda(f.valor_comprado || 0)}</span>
  )},
  { key: 'fecha_ultima_compra', label: 'Última Compra', render: (f) =>
    f.fecha_ultima_compra ? formatearFechaHora(f.fecha_ultima_compra) : <span className="text-steel-500 text-xs">Sin compras</span>
  },
  { key: 'dias_desde_ultima_compra', label: 'Días s/compra', render: (f) => {
    if (f.dias_desde_ultima_compra === null || f.dias_desde_ultima_compra === undefined) return <span className="text-steel-500 text-xs">-</span>;
    const dias = f.dias_desde_ultima_compra;
    const color = dias <= 30 ? 'text-blue-600' : dias <= 90 ? 'text-amber-600' : 'text-red-600';
    return <span className={`font-semibold ${color}`}>{dias}d</span>;
  }},
  { key: 'puntos', label: 'Puntos (Acum/Disp)', render: (f) => (
    <div className="text-xs leading-tight">
      <span className="text-amber-600 font-semibold">{parseFloat(f.puntos_acumulados || 0).toFixed(0)}</span>
      <span className="text-steel-500"> / </span>
      <span className="text-blue-600 font-semibold">{parseFloat(f.puntos_disponibles || 0).toFixed(0)}</span>
    </div>
  )},
];

export default function Clientes() {
  const navigate = useNavigate();
  const location = useLocation();
  const usuario = useAuthStore((s) => s.usuario);
  const prefijoRol = location.pathname.split('/')[1]
    || RUTAS_POR_ROL[usuario?.rol]?.split('/')[1]
    || 'administrador';
  const { datos, cargando, listar } = useCrud('/clientes');
  const [busqueda, setBusqueda] = useState('');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);

  // Historial de movimientos
  const [modalHistorial, setModalHistorial] = useState(false);
  const [historialCliente, setHistorialCliente] = useState(null);
  const [historialData, setHistorialData] = useState(null);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // Filtrar datos por búsqueda
  const datosFiltrados = datos.filter(d => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    const qDigits = TELEFONO_INPUT.toDigits(q);
    return (
      d.nombre?.toLowerCase().includes(q) ||
      d.dni?.toLowerCase().includes(q) ||
      (qDigits && d.telefono_principal?.includes(qDigits)) ||
      d.tbl_usuarios?.correo?.toLowerCase().includes(q)
    );
  });

  const { datosPaginados, paginaActual, totalPaginas, irAPagina } = usePaginacion(datosFiltrados);

  const abrirCrear = () => {
    setEditando(null);
    setModal(true);
  };

  const abrirEditar = (cliente) => {
    setEditando(cliente);
    setModal(true);
  };

  const verHistorial = async (cliente) => {
    setHistorialCliente(cliente);
    setCargandoHistorial(true);
    setModalHistorial(true);
    try {
      const { data } = await api.get(`/clientes/${cliente.id}`);
      setHistorialData(data);
    } catch {
      toast.error('Error al cargar historial');
      setHistorialData(null);
    }
    setCargandoHistorial(false);
  };

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <h1 className="text-2xl font-bold font-display tracking-wider text-steel-100">Gestión de Clientes</h1>
        <button onClick={abrirCrear} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-4 h-4" /> Nuevo Cliente
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="card mb-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-500" />
            <input className="input-field pl-9" placeholder="Buscar por nombre, DNI, teléfono o correo..."
              value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <TablaGenerica columnas={columnas} datos={datosPaginados} cargando={cargando}
          acciones={(fila) => (
            <div className="flex gap-1">
              <button onClick={() => navigate(`/${prefijoRol}/clientes/${fila.id}`)} className="text-steel-300 hover:text-steel-100" title="Vista 360°">
                <HiOutlineEye className="w-4 h-4" />
              </button>
              <button onClick={() => abrirEditar(fila)} className="text-blue-600 hover:text-blue-700" title="Editar">
                <HiOutlinePencil className="w-4 h-4" />
              </button>
              <button onClick={() => verHistorial(fila)} className="text-amber-600 hover:text-amber-700" title="Historial de Movimientos">
                <HiOutlineClock className="w-4 h-4" />
              </button>
            </div>
          )}
        />
        <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onChange={irAPagina} />
      </div>

      <ModalEditarCliente
        abierto={modal}
        cerrar={() => setModal(false)}
        cliente={editando}
        onGuardado={() => listar()}
      />

      {/* Modal Historial de Movimientos */}
      <Modal abierto={modalHistorial} cerrar={() => { setModalHistorial(false); setHistorialData(null); }} titulo={`Historial - ${historialCliente?.nombre || ''}`} ancho="max-w-3xl">
        {cargandoHistorial ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-brand-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : historialData ? (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto">
            {/* KPIs rápidos */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-steel-800/40 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-steel-100">{historialData.total_ventas || 0}</p>
                <p className="text-xs text-steel-500">Compras</p>
              </div>
              <div className="bg-steel-800/40 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-emerald-600">{formatearMoneda(historialData.total_comprado)}</p>
                <p className="text-xs text-steel-500">Total Comprado</p>
              </div>
              <div className="bg-steel-800/40 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-amber-600">{parseFloat(historialData.saldo_puntos || 0).toFixed(0)}</p>
                <p className="text-xs text-steel-500">Puntos</p>
              </div>
            </div>

            {/* Ventas */}
            <div>
              <h4 className="text-sm font-semibold text-steel-200 mb-3">Ventas ({historialData.ventas?.length || 0})</h4>
              {historialData.ventas?.length > 0 ? (
                <div className="space-y-2">
                  {historialData.ventas.map(v => (
                    <div key={v.id} className="flex items-center justify-between p-3 bg-steel-800/30 rounded-lg text-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-steel-400 font-mono">#{v.id}</span>
                        <EstadoBadge estado={v.estado_venta} />
                        <EstadoBadge estado={v.estado_tracking} />
                        <span className="text-steel-400">{v.items_venta?.length || 0} productos</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-semibold text-steel-100">{formatearMoneda(v.total)}</span>
                        <span className="text-steel-500 text-xs">{formatearFechaHora(v.fecha_hora_registro)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-steel-500 text-sm text-center py-3">Sin ventas registradas.</p>
              )}
            </div>

            {/* Pagos */}
            {historialData.ventas?.some(v => v.pagos?.length > 0) && (
              <div>
                <h4 className="text-sm font-semibold text-steel-200 mb-3">Pagos realizados</h4>
                <div className="space-y-1.5">
                  {historialData.ventas.flatMap(v =>
                    (v.pagos || []).map(p => ({ ...p, venta_id: v.id }))
                  ).sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora)).map(p => (
                    <div key={p.id} className="flex items-center justify-between py-2 px-3 bg-steel-800/30 rounded-lg text-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-600 font-semibold">{formatearMoneda(p.monto)}</span>
                        <span className="text-steel-500">Venta #{p.venta_id}</span>
                      </div>
                      <span className="text-steel-500 text-xs">{formatearFechaHora(p.fecha_hora)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Movimientos de Puntos */}
            <div>
              <h4 className="text-sm font-semibold text-steel-200 mb-3">Movimientos de Puntos</h4>
              {historialData.movimientos_puntos?.length > 0 ? (
                <div className="space-y-1.5">
                  {historialData.movimientos_puntos.map(m => (
                    <div key={m.id} className="flex items-center justify-between py-2 px-3 bg-steel-800/30 rounded-lg text-sm">
                      <div className="flex items-center gap-3">
                        <span className={`font-semibold ${m.tipo === 'ganado' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {m.tipo === 'ganado' ? '+' : '-'}{parseFloat(m.puntos).toFixed(2)}
                        </span>
                        <span className="text-steel-300 capitalize">{m.tipo?.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        {m.sale_order_id && <span className="text-steel-500">Venta #{m.sale_order_id}</span>}
                        <span className="text-steel-500 text-xs">{formatearFechaHora(m.fecha_hora)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-steel-500 text-sm text-center py-3">Sin movimientos de puntos.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-steel-500 text-sm text-center py-8">No se pudo cargar el historial.</p>
        )}
      </Modal>
    </div>
  );
}
