import { useEffect, useState } from 'react';
import { HiOutlineCheck, HiOutlineCamera, HiOutlineTruck, HiOutlineExclamation, HiOutlineOfficeBuilding, HiOutlineShoppingCart } from 'react-icons/hi';
import { Link } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { ROLES } from '../../config/roles';
import {
  TIPO_ENTREGA,
  TIPO_EVIDENCIA,
  TABS_CHOFER_ENTREGAS,
  TABS_CHOFER_ENTREGAS_LABEL,
  RUTAS_CHOFER,
  MSG_COMPRA_NACIONAL_UI,
} from '../../config/constants';
import useCrud from '../../hooks/useCrud';
import usePaginacion from '../../hooks/usePaginacion';
import TablaGenerica from '../../components/ui/TablaGenerica';
import EstadoBadge from '../../components/ui/EstadoBadge';
import Paginacion from '../../components/ui/Paginacion';
import Modal from '../../components/ui/Modal';
import DialogConfirmacion from '../../components/ui/DialogConfirmacion';
import Tabs from '../../components/ui/Tabs';
import { formatearFechaHora } from '../../utils/formato';
import { calcularCobertura, formatearFaltantesCorto } from '../../utils/ventaCobertura';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const columnas = [
  { key: 'id', label: 'N° Venta', render: (f) => {
    const cobertura = calcularCobertura(f);
    return (
      <div className="flex items-center gap-1">
        <span>#{f.id}</span>
        {!cobertura.completa && (
          <span
            className="inline-flex items-center px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold"
            title={`Faltan: ${formatearFaltantesCorto(cobertura)}`}
          >
            INCOMPLETA
          </span>
        )}
      </div>
    );
  } },
  { key: 'cliente', label: 'Cliente', render: (f) => f.tbl_clientes?.nombre || '-' },
  { key: 'tipo_entrega', label: 'Tipo Entrega', render: (f) => (
    <div>
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${f.tipo_entrega === TIPO_ENTREGA.ENVIO_POR_AGENCIA ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-600'}`}>
        {f.tipo_entrega?.replace(/_/g, ' ')}
      </span>
      {f.tbl_transportistas && (
        <span className="block text-xs text-steel-400 mt-0.5">{f.tbl_transportistas.nombre}</span>
      )}
    </div>
  )},
  { key: 'origen', label: 'Origen', render: (f) => {
    const tieneExternos = (f.items_venta || []).some(iv => iv.unidades_externas > 0);
    if (!tieneExternos) return <span className="text-xs text-steel-500">Almacén</span>;
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">Compra ext.</span>
      </div>
    );
  }},
  { key: 'conductor', label: 'Conductor', render: (f) => {
    const rotulo = (f.rotulos || []).slice().sort((a, b) => b.id - a.id)[0];
    if (!rotulo) return <span className="text-xs text-steel-500">-</span>;
    if (rotulo.chofer_externo_nombre) return (
      <div>
        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">Externo</span>
        <span className="block text-xs text-steel-400 mt-0.5">{rotulo.chofer_externo_nombre}</span>
      </div>
    );
    if (rotulo.chofer_user_id) return <span className="text-xs text-steel-400">Chofer interno</span>;
    return <span className="text-xs text-steel-500">-</span>;
  }},
  { key: 'estado_tracking', label: 'Tracking', render: (f) => <EstadoBadge estado={f.estado_tracking} /> },
  { key: 'fecha', label: 'Fecha', render: (f) => formatearFechaHora(f.fecha_hora_registro) },
];

export default function Entregas() {
  const { usuario } = useAuthStore();
  const esChofer = usuario?.rol === ROLES.CHOFER;
  const esAlmacen = usuario?.rol === ROLES.ALMACEN;
  const { datos, cargando, listar } = useCrud('/almacen/envios-chofer');
  const pendientes = datos;
  const { datosPaginados, paginaActual, totalPaginas, irAPagina } = usePaginacion(pendientes);

  // Fase 2: tabs + pedidos por completar (solo visible al rol CHOFER)
  const [tabActual, setTabActual] = useState(TABS_CHOFER_ENTREGAS.EN_RUTA);
  const [pedidosIncompletos, setPedidosIncompletos] = useState([]);
  const [cargandoPedidos, setCargandoPedidos] = useState(false);

  const cargarPedidosIncompletos = async () => {
    if (!esChofer) return;
    setCargandoPedidos(true);
    try {
      const { data } = await api.get('/compras/chofer/pedidos-incompletos');
      setPedidosIncompletos(data?.pedidos || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cargar pedidos incompletos');
    } finally {
      setCargandoPedidos(false);
    }
  };

  useEffect(() => {
    if (esChofer) cargarPedidosIncompletos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esChofer]);

  const [confirmEntrega, setConfirmEntrega] = useState(null);
  const [modalEvidencia, setModalEvidencia] = useState(false);
  const [ventaEvidencia, setVentaEvidencia] = useState(null);
  const [archivo, setArchivo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [subiendoEvidencia, setSubiendoEvidencia] = useState(false);

  // Modal entrega a agencia
  const [modalEntrega, setModalEntrega] = useState(false);
  const [ventaEntrega, setVentaEntrega] = useState(null);
  const [archivoEntrega, setArchivoEntrega] = useState(null);
  const [previewEntrega, setPreviewEntrega] = useState(null);
  const [contrasenaEnvio, setContrasenaEnvio] = useState('');
  const [costoFlete, setCostoFlete] = useState('');
  const [costoPari, setCostoPari] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [confirmandoEmpaque, setConfirmandoEmpaque] = useState(false);

  // Modal detalle items
  const [modalDetalle, setModalDetalle] = useState(false);
  const [ventaDetalle, setVentaDetalle] = useState(null);

  const confirmarEntrega = async () => {
    if (!confirmEntrega || confirmandoEmpaque) return;
    setConfirmandoEmpaque(true);
    try {
      await api.post(`/almacen/${confirmEntrega}/empaque`);
      toast.success('Entrega confirmada');
      setConfirmEntrega(null);
      await listar();
    } catch (err) { toast.error(err.response?.data?.error || 'Error al confirmar'); }
    finally { setConfirmandoEmpaque(false); }
  };

  const abrirEvidencia = (venta) => {
    setVentaEvidencia(venta);
    setArchivo(null);
    setPreview(null);
    setModalEvidencia(true);
  };

  const subirEvidencia = async (e) => {
    e.preventDefault();
    if (subiendoEvidencia) return;
    if (!ventaEvidencia) { toast.error('No se ha seleccionado una venta'); return; }
    if (!archivo) { toast.error('Debe seleccionar una foto de evidencia'); return; }
    setSubiendoEvidencia(true);
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('tipo', TIPO_EVIDENCIA.FOTO_ENVIO);
    formData.append('venta_id', ventaEvidencia.id);
    try {
      await api.post('/banco-fotos/subir', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`Evidencia de entrega asignada a Venta #${ventaEvidencia.id}`);
      setModalEvidencia(false);
      await listar();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
    finally { setSubiendoEvidencia(false); }
  };

  const handleArchivo = (e) => {
    const file = e.target.files[0];
    setArchivo(file);
    if (file) setPreview(URL.createObjectURL(file));
    else setPreview(null);
  };

  // Entrega a Agencia
  const abrirModalEntrega = (venta) => {
    setVentaEntrega(venta);
    setArchivoEntrega(null);
    setPreviewEntrega(null);
    setContrasenaEnvio('');
    setCostoFlete('');
    setCostoPari('');
    setModalEntrega(true);
  };

  const handleArchivoEntrega = (e) => {
    const file = e.target.files[0];
    setArchivoEntrega(file);
    if (file) setPreviewEntrega(URL.createObjectURL(file));
    else setPreviewEntrega(null);
  };

  const transportista = ventaEntrega?.tbl_transportistas;
  const requiereContrasena = transportista?.requiere_contrasena;
  const operacionEnCurso = enviando || subiendoEvidencia || confirmandoEmpaque;

  const confirmarEntregaAgencia = async (e) => {
    e.preventDefault();
    if (enviando) return;
    if (!ventaEntrega) { toast.error('No se ha seleccionado una venta'); return; }
    if (!archivoEntrega) { toast.error('Debe adjuntar el boucher de envío'); return; }
    if (requiereContrasena && !contrasenaEnvio.trim()) { toast.error('La contraseña de recojo es obligatoria'); return; }
    setEnviando(true);
    const formData = new FormData();
    formData.append('archivo', archivoEntrega);
    if (requiereContrasena) formData.append('contrasena_envio', contrasenaEnvio.trim());
    formData.append('costo_flete', costoFlete || '0');
    formData.append('costo_parihuela', costoPari || '0');
    try {
      await api.post(`/almacen/${ventaEntrega.id}/confirmar-entrega-agencia`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`Entrega a ${transportista?.nombre || 'agencia'} confirmada`);
      setModalEntrega(false);
      await listar();
    } catch (err) { toast.error(err.response?.data?.error || 'Error al confirmar entrega'); }
    finally { setEnviando(false); }
  };

  // Ver detalle de items (para ver origen)
  const abrirDetalle = (venta) => {
    setVentaDetalle(venta);
    setModalDetalle(true);
  };

  const tabs = [
    { key: TABS_CHOFER_ENTREGAS.EN_RUTA, label: TABS_CHOFER_ENTREGAS_LABEL[TABS_CHOFER_ENTREGAS.EN_RUTA], contador: pendientes.length },
    ...(esChofer ? [{
      key: TABS_CHOFER_ENTREGAS.POR_COMPLETAR,
      label: TABS_CHOFER_ENTREGAS_LABEL[TABS_CHOFER_ENTREGAS.POR_COMPLETAR],
      contador: pedidosIncompletos.length,
    }] : []),
  ];

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <div>
          <h1 className="text-2xl font-bold text-steel-100 font-display tracking-wider">Entregas</h1>
          <p className="text-sm text-steel-400 mt-1">{pendientes.length} entregas pendientes</p>
        </div>
      </div>

      <Tabs tabs={tabs} tabActual={tabActual} onChange={setTabActual} />

      {tabActual === TABS_CHOFER_ENTREGAS.POR_COMPLETAR && esChofer && (
        <div className="card mb-4">
          <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
            <div className="flex items-center gap-2">
              <HiOutlineShoppingCart className="w-5 h-5 text-orange-500" />
              <h2 className="font-display text-lg tracking-wider text-steel-100">Pedidos por completar</h2>
            </div>
            <Link to={RUTAS_CHOFER.COMPRAS_DISPONIBLES}
              className="text-xs bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 px-3 py-1.5 rounded font-medium">
              Ver compras disponibles
            </Link>
          </div>
          {cargandoPedidos ? (
            <p className="text-sm text-steel-400 py-4 text-center">Cargando...</p>
          ) : pedidosIncompletos.length === 0 ? (
            <p className="text-sm text-steel-400 py-4 text-center">{MSG_COMPRA_NACIONAL_UI.SIN_PEDIDOS_INCOMPLETOS}</p>
          ) : (
            <div className="space-y-2">
              {pedidosIncompletos.map((p) => (
                <div key={p.id} className="bg-steel-900/40 border border-steel-700/50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-steel-100">Venta #{p.id} — {p.cliente}</p>
                      <p className="text-xs text-steel-400 mt-0.5">
                        Faltantes: {p.items_faltantes.map((f) => `${f.producto_nombre} (${f.cantidad_faltante})`).join(', ')}
                      </p>
                    </div>
                    <span className="text-xs bg-red-500/15 text-red-400 px-2 py-1 rounded font-medium">
                      {p.total_asignado}/{p.total_requerido}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tabActual === TABS_CHOFER_ENTREGAS.EN_RUTA && (
      <div className="card">
        <TablaGenerica columnas={columnas} datos={datosPaginados} cargando={cargando} vacio="No hay entregas pendientes."
          acciones={(fila) => {
            const cobertura = calcularCobertura(fila);
            const incompleta = !cobertura.completa;
            const tooltipIncompleta = `Esta venta está incompleta (${formatearFaltantesCorto(cobertura)}). Contacte al administrador.`;
            const onEntregaIncompleta = () => toast.error(tooltipIncompleta);
            return (
            <div className="flex gap-1">
              <button onClick={() => abrirDetalle(fila)} className="text-xs bg-steel-800 text-steel-300 px-2 py-1 rounded hover:bg-steel-700 flex items-center gap-1" title="Ver items">
                <HiOutlineOfficeBuilding className="w-3.5 h-3.5" /> Items
              </button>
              {!esChofer && !esAlmacen && (
                <button
                  disabled={operacionEnCurso || incompleta}
                  onClick={incompleta ? onEntregaIncompleta : () => setConfirmEntrega(fila.id)}
                  className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${(operacionEnCurso || incompleta) ? 'bg-steel-700 text-steel-500 cursor-not-allowed' : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'}`}
                  title={incompleta ? tooltipIncompleta : 'Confirmar entrega'}>
                  <HiOutlineCheck className="w-3.5 h-3.5" /> Confirmar
                </button>
              )}
              {fila.tipo_entrega === TIPO_ENTREGA.ENVIO_POR_AGENCIA && (
                <button
                  disabled={operacionEnCurso || incompleta}
                  onClick={incompleta ? onEntregaIncompleta : () => abrirModalEntrega(fila)}
                  className={`text-xs px-2 py-1 rounded flex items-center gap-1 font-medium ${(operacionEnCurso || incompleta) ? 'bg-steel-700 text-steel-500 cursor-not-allowed' : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'}`}
                  title={incompleta ? tooltipIncompleta : 'Entregar a agencia'}>
                  <HiOutlineTruck className="w-3.5 h-3.5" /> Entregar
                </button>
              )}
              <button disabled={operacionEnCurso} onClick={() => abrirEvidencia(fila)} className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${operacionEnCurso ? 'bg-steel-700 text-steel-500 cursor-not-allowed' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`} title="Subir evidencia">
                <HiOutlineCamera className="w-3.5 h-3.5" /> Evidencia
              </button>
            </div>
            );
          }}
        />
        <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onChange={irAPagina} />
      </div>
      )}

      <DialogConfirmacion abierto={!!confirmEntrega} titulo="Confirmar Entrega"
        mensaje={confirmandoEmpaque ? 'Procesando confirmación...' : `¿Confirmar que la entrega de la venta #${confirmEntrega} fue realizada?`}
        onConfirmar={confirmandoEmpaque ? () => {} : confirmarEntrega}
        onCancelar={confirmandoEmpaque ? () => {} : () => setConfirmEntrega(null)} tipo="info" />

      {/* Modal Detalle Items con Origen */}
      <Modal abierto={modalDetalle} cerrar={() => setModalDetalle(false)} titulo={`Items — Venta #${ventaDetalle?.id || ''}`} ancho="max-w-lg">
        {ventaDetalle && (
          <div className="space-y-3">
            <p className="text-xs text-steel-400">
              Cliente: <span className="text-steel-200 font-medium">{ventaDetalle.tbl_clientes?.nombre}</span>
            </p>
            <div className="space-y-2">
              {(ventaDetalle.items_venta || []).map((iv) => {
                const tieneExterno = iv.unidades_externas > 0;
                return (
                  <div key={iv.id} className={`rounded-lg p-3 border ${tieneExterno ? 'border-orange-500/50 bg-orange-500/5' : 'border-steel-700 bg-steel-900/20'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-steel-100">{iv.tbl_productos?.nombre}</span>
                      <span className="text-xs text-steel-400">{iv.cantidad} und.</span>
                    </div>
                    {tieneExterno ? (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="bg-steel-800 text-steel-300 px-1.5 py-0.5 rounded">Del almacén: {iv.cantidad - iv.unidades_externas}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">
                            Recoger de {iv.proveedor_externo || 'proveedor'}: {iv.unidades_externas}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-steel-500 mt-1">Todo del almacén</p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => setModalDetalle(false)} className="btn-secondary">Cerrar</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Evidencia genérica */}
      <Modal abierto={modalEvidencia} cerrar={() => setModalEvidencia(false)} bloquearCierre={subiendoEvidencia} titulo={`Evidencia de Entrega - Venta #${ventaEvidencia?.id || ''}`}>
        <form onSubmit={subirEvidencia} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">Foto de evidencia</label>
            <input type="file" className="input-field" onChange={handleArchivo} accept="image/*" required />
          </div>
          {preview && (
            <div><img src={preview} alt="Preview" className="w-full h-48 object-contain rounded-lg bg-steel-900/50" /></div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalEvidencia(false)} className="btn-secondary" disabled={subiendoEvidencia}>Cancelar</button>
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={subiendoEvidencia}>
              {subiendoEvidencia ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Subiendo evidencia...</>
              ) : (
                <><HiOutlineCamera className="w-4 h-4" /> Subir Evidencia</>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Entrega a Agencia */}
      <Modal abierto={modalEntrega} cerrar={() => setModalEntrega(false)} bloquearCierre={enviando} titulo={`Entrega a ${transportista?.nombre || 'Agencia'} - Venta #${ventaEntrega?.id || ''}`}>
        <form onSubmit={confirmarEntregaAgencia} className="space-y-4">

          {/* Items con origen (dentro del modal de entrega) */}
          {ventaEntrega && (ventaEntrega.items_venta || []).some(iv => iv.unidades_externas > 0) && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3">
              <p className="text-orange-400 font-bold text-xs uppercase tracking-wider mb-2">Productos de proveedor externo</p>
              {(ventaEntrega.items_venta || []).filter(iv => iv.unidades_externas > 0).map(iv => (
                <div key={iv.id} className="flex items-center justify-between text-sm py-1">
                  <span className="text-steel-200">{iv.tbl_productos?.nombre}</span>
                  <span className="text-orange-400 font-medium">
                    Recoger {iv.unidades_externas} de {iv.proveedor_externo || 'proveedor'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ALERTA: Transportista sin contraseña */}
          {!requiereContrasena && (
            <div className="bg-amber-400 border-2 border-amber-600 rounded-xl p-4 flex items-start gap-3 shadow-lg">
              <div className="bg-steel-950 rounded-full p-1.5 flex-shrink-0 mt-0.5">
                <HiOutlineExclamation className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-steel-950 font-extrabold text-sm tracking-wider">IMPORTANTE</p>
                <p className="text-steel-950 text-sm mt-1 font-medium">
                  Este envio no requiere codigo de recojo. <span className="font-extrabold underline">No olvides confirmar que se realizo el pago de la totalidad del pedido</span> antes de entregar la mercaderia.
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">Boucher de envio</label>
            <input type="file" className="input-field" onChange={handleArchivoEntrega} accept="image/*" required />
          </div>
          {previewEntrega && (
            <div><img src={previewEntrega} alt="Preview boucher" className="w-full h-48 object-contain rounded-lg bg-steel-900/50" /></div>
          )}

          {/* Campo de contraseña solo si el transportista lo requiere */}
          {requiereContrasena && (
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1">Contraseña de recojo</label>
              <input type="text" className="input-field w-full" placeholder="Ingrese la contraseña de recojo..."
                value={contrasenaEnvio} onChange={(e) => setContrasenaEnvio(e.target.value)} required />
              <p className="text-xs text-steel-500 mt-1">Este codigo sera visible al cliente cuando todos los pagos esten verificados</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1">Costo de flete (S/)</label>
              <input type="number" step="0.01" min="0" className="input-field w-full" placeholder="0.00"
                value={costoFlete} onChange={(e) => setCostoFlete(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1">Costo de parihuela (S/)</label>
              <input type="number" step="0.01" min="0" className="input-field w-full" placeholder="0.00"
                value={costoPari} onChange={(e) => setCostoPari(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalEntrega(false)} className="btn-secondary" disabled={enviando}>Cancelar</button>
            <button type="submit" disabled={enviando} className="btn-primary flex items-center gap-2">
              {enviando ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <HiOutlineTruck className="w-4 h-4" />}
              Confirmar Entrega
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
