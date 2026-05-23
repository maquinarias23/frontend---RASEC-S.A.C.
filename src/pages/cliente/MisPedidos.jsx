import { useState } from 'react';
import { HiOutlineEye } from 'react-icons/hi';
import useCrud from '../../hooks/useCrud';
import usePaginacion from '../../hooks/usePaginacion';
import TablaGenerica from '../../components/ui/TablaGenerica';
import Paginacion from '../../components/ui/Paginacion';
import Modal from '../../components/ui/Modal';
import EstadoBadge from '../../components/ui/EstadoBadge';
import TimelineTracking from '../../components/ui/TimelineTracking';
import { formatearMoneda, formatearFechaHora } from '../../utils/formato';
import { buildMediaUrl } from '../../utils/media';
import { ESTADO_VENTA, ESTADO_TRACKING, TIPO_ENTREGA, METODOS_PAGO, METODOS_PAGO_LABEL, TELEFONO_INPUT, MSG_PAGO_BLOQUEADO_CLIENTE } from '../../config/constants';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const imgUrl = buildMediaUrl;

const columnas = [
  { key: 'id', label: 'N Pedido' },
  { key: 'vendedor', label: 'Vendedor', render: (f) => (
    <div className="text-xs">
      <p className="font-medium text-steel-100">{f.tbl_usuarios?.nombres || '-'}</p>
      {f.tbl_usuarios?.telefono && <p className="text-steel-400">{TELEFONO_INPUT.format(f.tbl_usuarios.telefono)}</p>}
    </div>
  )},
  { key: 'total', label: 'Total', render: (f) => (
    <span className="num-chromium font-semibold text-steel-50">{formatearMoneda(f.total)}</span>
  )},
  { key: 'total_pagado', label: 'Pagado', render: (f) => (
    <span className={`num-chromium font-semibold ${parseFloat(f.total_pagado) >= parseFloat(f.total) ? 'text-emerald-700' : 'text-amber-700'}`}>
      {formatearMoneda(f.total_pagado)}
    </span>
  )},
  { key: 'estado_venta', label: 'Estado', render: (f) => <EstadoBadge estado={f.estado_venta} /> },
  { key: 'estado_tracking', label: 'Tracking', render: (f) => <EstadoBadge estado={f.estado_tracking} /> },
  { key: 'fecha', label: 'Fecha', render: (f) => formatearFechaHora(f.fecha_hora_registro) },
];

export default function MisPedidos() {
  const { datos, cargando } = useCrud('/ventas');
  const { datosPaginados, paginaActual, totalPaginas, irAPagina } = usePaginacion(datos);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [modalReenvio, setModalReenvio] = useState(false);
  const [ventaReenvio, setVentaReenvio] = useState(null);
  const [voucherReenvio, setVoucherReenvio] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [modalPago, setModalPago] = useState(false);
  const [ventaPago, setVentaPago] = useState(null);
  const [formPago, setFormPago] = useState({ monto: '', metodo_pago: METODOS_PAGO.TRANSFERENCIA });
  const [voucherPago, setVoucherPago] = useState(null);
  const [enviandoPago, setEnviandoPago] = useState(false);

  const verDetalle = async (venta) => {
    setCargandoDetalle(true);
    setModalDetalle(true);
    try {
      const { data } = await api.get(`/ventas/${venta.id}`);
      setDetalle(data);
    } catch { setDetalle(venta); }
    finally { setCargandoDetalle(false); }
  };

  const reenviarPedido = async () => {
    if (!voucherReenvio) return toast.error('Adjunta un nuevo voucher');
    setEnviando(true);
    try {
      const fd = new FormData();
      fd.append('voucher', voucherReenvio);
      await api.post(`/ventas/${ventaReenvio.id}/reenviar`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Pedido reenviado exitosamente');
      setModalReenvio(false);
      setVentaReenvio(null);
      setVoucherReenvio(null);
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al reenviar');
    } finally {
      setEnviando(false);
    }
  };

  const abrirModalPago = async (venta) => {
    setFormPago({ monto: '', metodo_pago: METODOS_PAGO.TRANSFERENCIA });
    setVoucherPago(null);
    setVentaPago(venta);
    setModalPago(true);
    try {
      const { data } = await api.get(`/ventas/${venta.id}`);
      setVentaPago(data);
    } catch {
      // Si falla el refresco se mantienen los datos de la fila.
      // El backend igualmente bloquea el registro si hay un pago pendiente.
    }
  };

  const registrarPagoCliente = async () => {
    if (!formPago.monto || parseFloat(formPago.monto) <= 0) return toast.error('Ingresa un monto valido');
    const saldoMax = parseFloat(ventaPago?.saldo_disponible ?? ventaPago?.saldo_pendiente ?? 0);
    if (parseFloat(formPago.monto) > saldoMax) {
      return toast.error(`El monto no puede superar el saldo disponible (${formatearMoneda(saldoMax)})`);
    }
    if (!formPago.metodo_pago) return toast.error('Selecciona un metodo de pago');
    if (!voucherPago) return toast.error('Adjunta el comprobante de pago');
    setEnviandoPago(true);
    try {
      const fd = new FormData();
      fd.append('monto', formPago.monto);
      fd.append('metodo_pago', formPago.metodo_pago);
      fd.append('voucher', voucherPago);
      await api.post(`/ventas/${ventaPago.id}/pago-cliente`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Pago registrado. Pendiente de aprobacion.');
      setModalPago(false);
      setVentaPago(null);
      setVoucherPago(null);
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar pago');
    } finally {
      setEnviandoPago(false);
    }
  };

  return (
    <div>
      <h1 className="section-title-chromium mb-6">Mis Pedidos</h1>
      <div className="card-chromium">
        <TablaGenerica columnas={columnas} datos={datosPaginados} cargando={cargando} vacio="No tienes pedidos aun."
          acciones={(fila) => (
            <button onClick={() => verDetalle(fila)} className="text-primary-400 hover:text-primary-300 transition-colors duration-200">
              <HiOutlineEye className="w-5 h-5" />
            </button>
          )}
        />
        <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onChange={irAPagina} />
      </div>

      {/* Modal de Detalle */}
      <Modal abierto={modalDetalle} cerrar={() => { setModalDetalle(false); setDetalle(null); }}
        titulo={`Pedido #${detalle?.id || ''}`} ancho="max-w-2xl">
        {cargandoDetalle ? (
          <div className="flex justify-center py-10">
            <div className="w-9 h-9 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : detalle ? (
          <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-steel-900/30 rounded-lg p-3 border border-steel-700/20">
                <span className="text-steel-400 text-xs block mb-1">Estado</span>
                <EstadoBadge estado={detalle.estado_venta} />
              </div>
              <div className="bg-steel-900/30 rounded-lg p-3 border border-steel-700/20">
                <span className="text-steel-400 text-xs block mb-1">Tipo Entrega</span>
                <span className="font-medium text-steel-100 capitalize">{detalle.tipo_entrega?.replace(/_/g, ' ')}</span>
              </div>
              <div className="bg-steel-900/30 rounded-lg p-3 border border-steel-700/20">
                <span className="text-steel-400 text-xs block mb-1">Total</span>
                <span className="font-bold num-chromium text-primary-400">{formatearMoneda(detalle.total)}</span>
              </div>
              <div className="bg-steel-900/30 rounded-lg p-3 border border-steel-700/20">
                <span className="text-steel-400 text-xs block mb-1">Saldo Pendiente</span>
                <span className={`font-bold num-chromium ${parseFloat(detalle.saldo_pendiente) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {formatearMoneda(detalle.saldo_pendiente)}
                </span>
              </div>
              <div className="bg-steel-900/30 rounded-lg p-3 border border-steel-700/20 col-span-2">
                <span className="text-steel-400 text-xs block mb-1">Vendedor</span>
                <span className="font-medium text-steel-100">{detalle.tbl_usuarios?.nombres || '-'}</span>
                {detalle.tbl_usuarios?.telefono && (
                  <span className="ml-2 text-steel-400 text-xs">{TELEFONO_INPUT.format(detalle.tbl_usuarios.telefono)}</span>
                )}
              </div>
            </div>

            {/* Motivo de Rechazo */}
            {detalle.estado_venta === ESTADO_VENTA.RECHAZADA && detalle.motivo_rechazo && (
              <div className="p-4 bg-red-700 border border-red-500 rounded-lg shadow-md">
                <p className="text-sm font-bold text-white mb-1.5">Motivo de Rechazo:</p>
                <p className="text-sm text-white font-medium whitespace-pre-wrap break-words">{detalle.motivo_rechazo}</p>
                <button
                  onClick={() => { setModalDetalle(false); setVentaReenvio(detalle); setModalReenvio(true); }}
                  className="mt-3 btn-primary bg-amber-600 hover:bg-amber-700 text-sm"
                >
                  Reenviar Pedido con Nuevo Voucher
                </button>
              </div>
            )}

            {/* Timeline */}
            <div className="bg-steel-900/30 rounded-lg p-4 border border-steel-700/20">
              <h3 className="text-sm font-semibold text-steel-200 mb-4 tracking-wide">Estado del envio</h3>
              <TimelineTracking estadoActual={detalle.estado_tracking} historial={detalle.historial_tracking || []} />
            </div>

            {/* Evidencia del envio */}
            {(detalle.fotos_paquete?.length > 0 || detalle.asignaciones_evidencia?.length > 0) && (
              <div>
                <h3 className="text-sm font-semibold text-steel-200 mb-3 tracking-wide">Evidencia del envio</h3>
                <div className="flex gap-2 flex-wrap">
                  {detalle.fotos_paquete?.map((foto) => (
                    <img key={foto.id} src={imgUrl(foto.archivo)} alt="Paquete"
                      className="w-20 h-20 rounded-lg object-cover border border-steel-700/30 hover:border-primary-500/50 transition-colors duration-200"
                      onError={(e) => { e.target.style.display = 'none'; }} />
                  ))}
                  {detalle.asignaciones_evidencia?.map((ae) => (
                    <img key={ae.id} src={imgUrl(ae.tbl_banco_evidencias?.url_archivo)} alt="Evidencia"
                      className="w-20 h-20 rounded-lg object-cover border border-steel-700/30 hover:border-primary-500/50 transition-colors duration-200"
                      onError={(e) => { e.target.style.display = 'none'; }} />
                  ))}
                </div>
              </div>
            )}

            {/* Items */}
            {detalle.items_venta?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-steel-200 mb-3 tracking-wide">Productos</h3>
                <div className="space-y-2">
                  {detalle.items_venta.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-steel-900/30 rounded-lg border border-steel-700/20 text-sm hover:border-steel-600/40 transition-colors duration-200">
                      <div>
                        <p className="font-medium text-steel-100">{item.tbl_productos?.nombre || `Producto #${item.product_id}`}</p>
                        <p className="text-xs text-steel-400 mt-0.5">Cantidad: {item.cantidad} x {formatearMoneda(item.precio_unitario_vendido)}</p>
                      </div>
                      <p className="font-semibold num-chromium text-primary-400">{formatearMoneda(item.cantidad * parseFloat(item.precio_unitario_vendido))}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contrasena de recojo por agencia (envio_por_agencia) */}
            {detalle.tipo_entrega === TIPO_ENTREGA.ENVIO_POR_AGENCIA && (
              detalle.contrasena_envio ? (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-center">
                  <p className="text-sm text-amber-700 mb-2">Tu contrasena de recojo en agencia:</p>
                  <p className="text-3xl font-bold text-primary-500 tracking-widest num-chromium">{detalle.contrasena_envio}</p>
                </div>
              ) : detalle.estado_tracking === ESTADO_TRACKING.DEJADO_EN_AGENCIA ? (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-center">
                  <p className="text-sm text-amber-700 font-medium">Tu pedido ya fue entregado en agencia. La contrasena de recojo se mostrara cuando todos los pagos esten verificados.</p>
                </div>
              ) : (
                <div className="p-4 bg-steel-900/30 border border-steel-700/20 rounded-lg text-center">
                  <p className="text-sm text-steel-400">La contrasena de recojo se mostrara cuando el pedido sea entregado en agencia y todos los pagos esten verificados.</p>
                </div>
              )
            )}

            {/* Clave secreta (retiro_en_tienda) */}
            {detalle.tipo_entrega === TIPO_ENTREGA.RETIRO_EN_TIENDA && detalle.claves_secretas?.length > 0 && detalle.claves_secretas.some(c => c.visible_cliente) && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-center">
                <p className="text-sm text-amber-300/80 mb-2">Tu clave de retiro:</p>
                <p className="text-3xl font-bold text-primary-500 tracking-widest num-chromium">
                  {detalle.claves_secretas.find(c => c.visible_cliente)?.clave}
                </p>
              </div>
            )}

            {/* Pagos */}
            {detalle.pagos?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-steel-200 mb-3 tracking-wide">Pagos realizados</h3>
                <div className="space-y-2">
                  {detalle.pagos.map(p => (
                    <div key={p.id} className="bg-steel-900/30 rounded-lg p-3 border border-steel-700/20 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold num-chromium text-emerald-400">{formatearMoneda(p.monto)}</span>
                        <span className="text-xs text-steel-400">{formatearFechaHora(p.fecha_hora)}</span>
                      </div>
                      {p.adjuntos?.map((adj, j) => (
                        <div key={adj.id || j} className="flex items-center gap-2 text-xs">
                          <span className="text-steel-400">Voucher {j + 1}:</span>
                          {adj.aprobado && <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/20">Aprobado</span>}
                          {adj.rechazado && (
                            <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-semibold border border-red-500/20">
                              Rechazado{adj.motivo_rechazo ? ` — ${adj.motivo_rechazo}` : ''}
                            </span>
                          )}
                          {!adj.aprobado && !adj.rechazado && <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/20">Pendiente</span>}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Boton Registrar Pago - solo para ventas activas con saldo disponible */}
            {[ESTADO_VENTA.ACTIVA, ESTADO_VENTA.PENDIENTE_APROBACION].includes(detalle.estado_venta) && parseFloat(detalle.saldo_disponible ?? detalle.saldo_pendiente) > 0 && (
              <div className="pt-2">
                <button
                  onClick={() => { setModalDetalle(false); abrirModalPago(detalle); }}
                  className="btn-primary w-full"
                >
                  Registrar Pago
                </button>
              </div>
            )}
            {[ESTADO_VENTA.ACTIVA, ESTADO_VENTA.PENDIENTE_APROBACION].includes(detalle.estado_venta) && parseFloat(detalle.saldo_pendiente) > 0 && parseFloat(detalle.saldo_disponible ?? detalle.saldo_pendiente) <= 0 && (
              <div className="pt-2 text-center">
                <p className="text-sm text-amber-400">Tus pagos estan pendientes de aprobacion por un administrador</p>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* Modal de Reenvio */}
      <Modal abierto={modalReenvio} cerrar={() => { setModalReenvio(false); setVentaReenvio(null); setVoucherReenvio(null); }}
        titulo={`Reenviar Pedido #${ventaReenvio?.id || ''}`} ancho="max-w-md">
        <div className="space-y-4">
          <p className="text-sm text-steel-400">
            Tu pedido fue rechazado. Adjunta un nuevo voucher de pago valido para reenviarlo.
          </p>
          {ventaReenvio?.motivo_rechazo && (
            <div className="p-3 bg-red-700 border border-red-500 rounded-lg shadow-md">
              <p className="text-xs font-bold text-white mb-1">Motivo anterior:</p>
              <p className="text-sm text-white font-medium whitespace-pre-wrap break-words">{ventaReenvio.motivo_rechazo}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1.5">Nuevo Voucher *</label>
            <input type="file" accept="image/*,.pdf"
              className="input-field w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-500/10 file:text-primary-400 hover:file:bg-primary-500/20 file:transition-colors file:duration-200 file:cursor-pointer"
              onChange={e => setVoucherReenvio(e.target.files[0] || null)} />
          </div>
          <button onClick={reenviarPedido} disabled={enviando}
            className="btn-primary w-full disabled:opacity-50">
            {enviando ? 'Reenviando...' : 'Reenviar Pedido'}
          </button>
        </div>
      </Modal>

      {/* Modal de Pago */}
      <Modal abierto={modalPago} cerrar={() => { setModalPago(false); setVentaPago(null); setVoucherPago(null); }}
        titulo={`Registrar Pago — Pedido #${ventaPago?.id || ''}`} ancho="max-w-md">
        <div className="space-y-4">
          <div className="p-3 bg-steel-900/30 rounded-lg border border-steel-700/20">
            <div className="flex justify-between text-sm">
              <span className="text-steel-400">Total del pedido</span>
              <span className="font-bold num-chromium text-primary-400">{formatearMoneda(ventaPago?.total)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-steel-400">Disponible para pago</span>
              <span className="font-bold num-chromium text-amber-400">{formatearMoneda(ventaPago?.saldo_disponible ?? ventaPago?.saldo_pendiente)}</span>
            </div>
          </div>

          {ventaPago?.pago_cliente_pendiente && (
            <div className="rounded-lg border border-amber-700 bg-amber-600 p-3 text-sm space-y-1 shadow-md">
              <p className="font-bold text-white">{MSG_PAGO_BLOQUEADO_CLIENTE.BANNER_CLIENTE}</p>
              <p className="text-white/95 font-medium">
                {MSG_PAGO_BLOQUEADO_CLIENTE.DETALLE({
                  monto: ventaPago.pago_cliente_pendiente.monto,
                  fecha_hora: ventaPago.pago_cliente_pendiente.fecha_hora,
                  nombre_cliente: null,
                  formatearMoneda,
                  formatearFechaHora,
                })}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">Monto a pagar <span className="text-red-500">*</span></label>
            <input type="number" step="0.01" min="0.01"
              max={ventaPago ? parseFloat(ventaPago.saldo_disponible ?? ventaPago.saldo_pendiente) : undefined}
              className="input-field w-full"
              placeholder="0.00"
              value={formPago.monto}
              onChange={e => {
                const valor = e.target.value;
                const max = parseFloat(ventaPago?.saldo_disponible ?? ventaPago?.saldo_pendiente ?? 0);
                if (valor !== '' && !isNaN(parseFloat(valor)) && parseFloat(valor) > max) {
                  setFormPago({ ...formPago, monto: max.toFixed(2) });
                } else {
                  setFormPago({ ...formPago, monto: valor });
                }
              }} />
          </div>

          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">Metodo de pago <span className="text-red-500">*</span></label>
            <select className="input-field w-full"
              value={formPago.metodo_pago}
              onChange={e => setFormPago({ ...formPago, metodo_pago: e.target.value })}>
              {Object.entries(METODOS_PAGO_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1.5">Comprobante de pago <span className="text-red-500">*</span></label>
            <input type="file" accept="image/*,.pdf"
              className="input-field w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-500/10 file:text-primary-400 hover:file:bg-primary-500/20 file:transition-colors file:duration-200 file:cursor-pointer"
              onChange={e => setVoucherPago(e.target.files[0] || null)} />
          </div>

          <p className="text-xs text-steel-400">
            Tu pago sera revisado y aprobado por un administrador antes de que se refleje en tu pedido.
          </p>

          <button onClick={registrarPagoCliente}
            disabled={enviandoPago || !!ventaPago?.pago_cliente_pendiente}
            title={ventaPago?.pago_cliente_pendiente ? MSG_PAGO_BLOQUEADO_CLIENTE.TOOLTIP_BOTON : undefined}
            className="btn-primary w-full disabled:opacity-50">
            {enviandoPago ? 'Registrando pago...' : 'Registrar Pago'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
