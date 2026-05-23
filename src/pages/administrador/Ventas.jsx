import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  HiOutlineEye, HiOutlineXCircle, HiOutlineCheckCircle,
  HiOutlinePhotograph, HiOutlineDownload, HiOutlineX,
  HiOutlineClipboardList, HiOutlineShoppingCart, HiOutlineCash,
  HiOutlineBan, HiOutlineGift,
} from 'react-icons/hi';
import useCrud from '../../hooks/useCrud';
import usePaginacion from '../../hooks/usePaginacion';
import TablaGenerica from '../../components/ui/TablaGenerica';
import Paginacion from '../../components/ui/Paginacion';
import EstadoBadge from '../../components/ui/EstadoBadge';
import Modal from '../../components/ui/Modal';
import Tabs from '../../components/ui/Tabs';
import ListaComprobantesVenta from '../../components/shared/ListaComprobantesVenta';
import TotalizadorVenta from '../../components/shared/TotalizadorVenta';
import TarjetaResumen from '../../components/ui/TarjetaResumen';
import { formatearMoneda, formatearFechaHora } from '../../utils/formato';
import { buildMediaUrl } from '../../utils/media';
import { ESTADO_VENTA, TIPO_ENTREGA } from '../../config/constants';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const imgUrl = buildMediaUrl;

const obtenerPrimerPago = (venta) => venta.pagos?.[0] || null;

const obtenerVouchers = (venta) => {
  if (!venta.pagos) return [];
  return venta.pagos.flatMap((pago) =>
    (pago.adjuntos || []).map((adj) => ({
      url: adj.archivo,
      monto: pago.monto,
      fecha: pago.fecha_hora,
      pago_id: pago.id,
      aprobado: adj.aprobado,
      rechazado: adj.rechazado,
    }))
  );
};

const tieneVouchersPendientes = (venta) => {
  return obtenerVouchers(venta).some((v) => !v.aprobado && !v.rechazado);
};

const columnas = [
  { key: 'id', label: 'N°' },
  { key: 'cliente', label: 'Cliente', render: (f) => f.tbl_clientes?.nombre || '-' },
  { key: 'vendedor', label: 'Vendedor', render: (f) => f.tbl_usuarios?.nombres || '-' },
  { key: 'tipo_entrega', label: 'Entrega', render: (f) => f.tipo_entrega?.replace(/_/g, ' ').toUpperCase() },
  { key: 'total', label: 'Total', render: (f) => formatearMoneda(f.total) },
  {
    key: 'inicial', label: 'Inicial', render: (f) => {
      const primer = obtenerPrimerPago(f);
      return primer ? formatearMoneda(primer.monto) : <span className="text-steel-500">-</span>;
    },
  },
  { key: 'saldo_pendiente', label: 'Saldo', render: (f) => formatearMoneda(f.saldo_pendiente) },
  {
    key: 'voucher', label: 'Voucher', render: (f) => {
      const vouchers = obtenerVouchers(f);
      if (vouchers.length === 0) return <span className="text-steel-500">-</span>;
      const firstUrl = imgUrl(vouchers[0].url);
      return (
        <div className="relative w-8 h-8">
          {firstUrl ? (
            <img src={firstUrl} alt="voucher" className="w-8 h-8 rounded object-cover border border-steel-600" onError={(e) => { e.target.style.display = 'none'; }} />
          ) : (
            <div className="w-8 h-8 rounded bg-steel-700 flex items-center justify-center">
              <HiOutlinePhotograph className="w-4 h-4 text-steel-500" />
            </div>
          )}
          {vouchers.length > 1 && (
            <span className="absolute -top-1 -right-1 bg-primary-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
              +{vouchers.length - 1}
            </span>
          )}
        </div>
      );
    },
  },
  { key: 'estado_venta', label: 'Estado', render: (f) => (
    <div className="flex flex-col gap-1">
      <EstadoBadge estado={f.estado_venta} />
      {tieneVouchersPendientes(f) && (
        <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/15 text-amber-600 border border-amber-500/30 rounded-full font-semibold text-center">
          Voucher pendiente
        </span>
      )}
      {f.tiene_ajuste && (
        <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/15 text-orange-600 border border-orange-500/30 rounded-full font-semibold text-center">
          Precio ajustado
        </span>
      )}
    </div>
  )},
  { key: 'fecha', label: 'Fecha', render: (f) => formatearFechaHora(f.fecha_hora_registro) },
];

export default function Ventas() {
  const { datos, cargando, listar } = useCrud('/ventas');
  const [detalle, setDetalle] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [tabActual, setTabActual] = useState('pendientes');
  const [rechazoVoucher, setRechazoVoucher] = useState(null);
  const [motivoRechazoVoucher, setMotivoRechazoVoucher] = useState('');
  const [rechazoVenta, setRechazoVenta] = useState(null);
  const [ajustesDetalle, setAjustesDetalle] = useState([]);
  const [motivoRechazoVenta, setMotivoRechazoVenta] = useState('');

  // Contadores
  const contadores = useMemo(() => {
    const c = { pendientes: 0, aprobadas: 0, todas: 0, cerradas: 0, canceladas: 0, rechazadas: 0, vouchers_pendientes: 0 };
    (datos || []).forEach((v) => {
      c.todas++;
      if (v.estado_venta === ESTADO_VENTA.PENDIENTE_APROBACION) c.pendientes++;
      else if (v.estado_venta === ESTADO_VENTA.ACTIVA) c.aprobadas++;
      else if (v.estado_venta === ESTADO_VENTA.CERRADA) c.cerradas++;
      else if (v.estado_venta === ESTADO_VENTA.CANCELADA) c.canceladas++;
      else if (v.estado_venta === ESTADO_VENTA.RECHAZADA) c.rechazadas++;
      if (tieneVouchersPendientes(v)) c.vouchers_pendientes++;
    });
    return c;
  }, [datos]);

  // Filtrar por tab
  const datosFiltrados = useMemo(() => {
    if (!datos) return [];
    switch (tabActual) {
      case 'pendientes': return datos.filter((v) => v.estado_venta === ESTADO_VENTA.PENDIENTE_APROBACION);
      case 'aprobadas': return datos.filter((v) => v.estado_venta === ESTADO_VENTA.ACTIVA);
      case 'cerradas': return datos.filter((v) => v.estado_venta === ESTADO_VENTA.CERRADA);
      case 'canceladas': return datos.filter((v) => v.estado_venta === ESTADO_VENTA.CANCELADA);
      case 'rechazadas': return datos.filter((v) => v.estado_venta === ESTADO_VENTA.RECHAZADA);
      case 'vouchers_pendientes': return datos.filter((v) => tieneVouchersPendientes(v));
      default: return datos;
    }
  }, [datos, tabActual]);

  const { datosPaginados, paginaActual, totalPaginas, irAPagina, setPaginaActual } = usePaginacion(datosFiltrados);

  useEffect(() => { setPaginaActual(1); }, [tabActual]);

  const totalMonto = useMemo(() => {
    return (datos || [])
      .filter((v) => v.estado_venta !== ESTADO_VENTA.CANCELADA)
      .reduce((sum, v) => sum + parseFloat(v.total || 0), 0);
  }, [datos]);

  const cancelar = async () => {
    if (!cancelModal || !motivoCancelacion.trim()) {
      toast.error('Ingrese un motivo de cancelación');
      return;
    }
    try {
      await api.post(`/ventas/${cancelModal}/cancelar`, { motivo: motivoCancelacion });
      toast.success('Venta cancelada');
      listar();
      setCancelModal(null);
      setMotivoCancelacion('');
      setDetalle(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cancelar');
    }
  };

  const abrirCancelModal = (id) => {
    setCancelModal(id);
    setMotivoCancelacion('');
  };

  const tabs = [
    { key: 'pendientes', label: 'Pendientes', contador: contadores.pendientes },
    { key: 'vouchers_pendientes', label: 'Vouchers pendientes', contador: contadores.vouchers_pendientes },
    { key: 'aprobadas', label: 'Aprobadas', contador: contadores.aprobadas },
    { key: 'todas', label: 'Todas', contador: contadores.todas },
    { key: 'cerradas', label: 'Cerradas', contador: contadores.cerradas },
    { key: 'rechazadas', label: 'Rechazadas', contador: contadores.rechazadas },
    { key: 'canceladas', label: 'Canceladas', contador: contadores.canceladas },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold font-display tracking-wider text-steel-100 mb-6">Gestión de Ventas</h1>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <TarjetaResumen titulo="Pendientes" valor={contadores.pendientes} icono={HiOutlineClipboardList} color="yellow" />
        <TarjetaResumen titulo="Aprobadas" valor={contadores.aprobadas} icono={HiOutlineCheckCircle} color="green" />
        <TarjetaResumen titulo="Total ventas" valor={formatearMoneda(totalMonto)} icono={HiOutlineCash} color="primary" />
        <TarjetaResumen titulo="Canceladas" valor={contadores.canceladas} icono={HiOutlineBan} color="red" />
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} tabActual={tabActual} onChange={setTabActual} />

      {/* Tabla */}
      <div className="card">
        <TablaGenerica
          columnas={columnas}
          datos={datosPaginados}
          cargando={cargando}
          acciones={(fila) => (
            <>
              <button onClick={() => {
                setDetalle(fila);
                setAjustesDetalle([]);
                if (fila.tiene_ajuste) api.get(`/ventas/${fila.id}/ajustes`).then(r => setAjustesDetalle(r.data || [])).catch(() => {});
              }} className="text-blue-600 hover:text-blue-700" title="Ver detalle">
                <HiOutlineEye className="w-4 h-4" />
              </button>
              {obtenerVouchers(fila).length > 0 && (
                <button
                  onClick={() => setLightbox(imgUrl(obtenerVouchers(fila)[0].url))}
                  className="text-purple-600 hover:text-purple-700"
                  title={obtenerVouchers(fila)[0].url?.match(/\.pdf$/i) ? 'Ver voucher PDF' : 'Ver voucher'}
                >
                  {obtenerVouchers(fila)[0].url?.match(/\.pdf$/i) ? (
                    <HiOutlineDownload className="w-4 h-4" />
                  ) : (
                    <HiOutlinePhotograph className="w-4 h-4" />
                  )}
                </button>
              )}
              {[ESTADO_VENTA.PENDIENTE_APROBACION, ESTADO_VENTA.ACTIVA].includes(fila.estado_venta) && (
                <button onClick={() => abrirCancelModal(fila.id)} className="text-red-600 hover:text-red-700" title="Cancelar">
                  <HiOutlineXCircle className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        />
        <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onChange={irAPagina} />
      </div>

      {/* Modal Detalle */}
      <Modal abierto={!!detalle} cerrar={() => setDetalle(null)} titulo={`Venta #${detalle?.id}`} ancho="max-w-3xl">
        {detalle && (
          <div className="space-y-5">
            {/* Info general */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div><span className="text-steel-400 block text-xs mb-0.5">Cliente</span><span className="text-steel-100 font-medium">{detalle.tbl_clientes?.nombre || '-'}</span></div>
              <div><span className="text-steel-400 block text-xs mb-0.5">Vendedor</span><span className="text-steel-100 font-medium">{detalle.tbl_usuarios?.nombres || '-'}</span></div>
              <div><span className="text-steel-400 block text-xs mb-0.5">Estado Venta</span><EstadoBadge estado={detalle.estado_venta} /></div>
              <div><span className="text-steel-400 block text-xs mb-0.5">Estado Tracking</span><EstadoBadge estado={detalle.estado_tracking} /></div>
              <div>
                <span className="text-steel-400 block text-xs mb-0.5">Tipo Entrega</span>
                <span className="text-steel-100">{detalle.tipo_entrega?.replace(/_/g, ' ').toUpperCase()}</span>
                {detalle.tbl_transportistas && (
                  <span className="block text-xs text-primary-600 mt-0.5 font-medium">{detalle.tbl_transportistas.nombre}</span>
                )}
              </div>
              <div><span className="text-steel-400 block text-xs mb-0.5">Fecha</span><span className="text-steel-100">{formatearFechaHora(detalle.fecha_hora_registro)}</span></div>
            </div>

            {/* Dirección de envío */}
            {detalle.tipo_entrega !== TIPO_ENTREGA.RETIRO_EN_TIENDA && (
              detalle.tbl_departamentos ? (
                <div className="bg-blue-50 rounded-lg p-3 text-sm">
                  <span className="text-blue-600 font-medium text-xs block mb-1">Destino de envío</span>
                  <p className="text-blue-600">
                    {detalle.tbl_departamentos.nombre} / {detalle.tbl_provincias?.nombre} / {detalle.tbl_distritos?.nombre}
                  </p>
                </div>
              ) : detalle.tbl_direcciones ? (
                <div className="bg-steel-800/30 rounded-lg p-3 text-sm">
                  <span className="text-steel-400 font-medium text-xs block mb-1">Dirección de envío</span>
                  <p className="text-steel-200">{detalle.tbl_direcciones.direccion_completa || detalle.tbl_direcciones.direccion}</p>
                </div>
              ) : detalle.direccion_manual ? (
                <div className="bg-blue-50 rounded-lg p-3 text-sm">
                  <span className="text-blue-600 font-medium text-xs block mb-1">Dirección de envío (manual)</span>
                  <p className="text-blue-600">{detalle.direccion_manual}</p>
                </div>
              ) : null
            )}

            {/* Items */}
            {detalle.items_venta?.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-steel-200 mb-2">Items de venta</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-steel-700">
                        <th className="text-left py-2 px-2 text-steel-400 text-xs">Producto</th>
                        <th className="text-right py-2 px-2 text-steel-400 text-xs">Cant</th>
                        <th className="text-right py-2 px-2 text-steel-400 text-xs">P. Unit</th>
                        <th className="text-right py-2 px-2 text-steel-400 text-xs">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalle.items_venta.map((item, i) => (
                        <tr key={i} className="border-b border-steel-800/40">
                          <td className="py-2 px-2 text-steel-200">
                            {item.tbl_productos?.nombre || `Prod #${item.product_id}`}
                            {item.es_regalo && (
                              <span className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[10px] font-bold">
                                <HiOutlineGift className="w-3 h-3" /> REGALO
                              </span>
                            )}
                          </td>
                          <td className="text-right py-2 px-2 text-steel-200">{item.cantidad}</td>
                          <td className="text-right py-2 px-2 text-steel-200">{formatearMoneda(item.precio_unitario_vendido)}</td>
                          <td className="text-right py-2 px-2 text-steel-100 font-medium">
                            {item.es_regalo
                              ? <span className="text-steel-500 line-through">{formatearMoneda(item.cantidad * item.precio_unitario_vendido)}</span>
                              : formatearMoneda(item.cantidad * item.precio_unitario_vendido)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Totales */}
            <TotalizadorVenta venta={detalle} />


            {/* Pagos realizados */}
            {detalle.pagos?.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-steel-200 mb-2">Pagos realizados</h4>
                <div className="space-y-3">
                  {detalle.pagos.map((pago, i) => (
                    <div key={pago.id || i} className="bg-steel-800/30 rounded-lg p-3 border border-steel-700/40">
                      <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                        <span className="text-steel-100 font-medium text-sm">Pago #{i + 1} — {formatearMoneda(pago.monto)}</span>
                        <span className="text-steel-500 text-xs">{formatearFechaHora(pago.fecha_hora)}</span>
                      </div>
                      {pago.adjuntos?.length > 0 && (
                        <div className="space-y-2">
                          {pago.adjuntos.map((adj, j) => {
                            const url = imgUrl(adj.archivo);
                            const esAprobado = adj.aprobado;
                            const esRechazado = adj.rechazado;
                            const esPendiente = !esAprobado && !esRechazado;
                            const ventaPermiteAccion = ![ESTADO_VENTA.RECHAZADA, ESTADO_VENTA.CANCELADA].includes(detalle.estado_venta);
                            const puedeAprobarRechazar = esPendiente && ventaPermiteAccion;
                            const borderClass = esAprobado ? 'border-emerald-500/30 bg-emerald-500/5' : esRechazado ? 'border-red-500/30 bg-red-500/5' : 'border-amber-500/30 bg-amber-500/5';
                            return (
                              <div key={adj.id || j} className={`flex items-center gap-3 p-2 rounded-lg border ${borderClass}`}>
                                {adj.archivo?.match(/\.pdf$/i) ? (
                                  <button
                                    type="button"
                                    onClick={() => setLightbox(url)}
                                    className="w-14 h-14 rounded-lg border border-steel-600 flex-shrink-0 flex flex-col items-center justify-center bg-steel-800 hover:bg-steel-700 transition-colors"
                                    title="Previsualizar PDF"
                                  >
                                    <HiOutlineDownload className="w-5 h-5 text-primary-400" />
                                    <span className="text-[9px] text-steel-400 mt-0.5">PDF</span>
                                  </button>
                                ) : (
                                  <div className="relative group/thumb w-14 h-14 rounded-lg overflow-hidden border border-steel-600 cursor-pointer flex-shrink-0" onClick={() => setLightbox(url)}>
                                    <img src={url} alt={`Voucher ${j + 1}`} className="w-full h-full object-cover" onError={(e) => { e.target.src = ''; e.target.className = 'hidden'; }} />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                                      <HiOutlineEye className="w-4 h-4 text-white" />
                                    </div>
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs text-steel-400">Voucher {j + 1}</span>
                                  {esAprobado && <p className="text-sm font-semibold text-emerald-600">Aprobado</p>}
                                  {esRechazado && (
                                    <>
                                      <p className="text-sm font-semibold text-red-600">Rechazado</p>
                                      {adj.motivo_rechazo && <p className="text-xs text-red-600 mt-0.5">{adj.motivo_rechazo}</p>}
                                    </>
                                  )}
                                  {esPendiente && <p className="text-sm font-semibold text-amber-600">Pendiente de aprobación</p>}
                                </div>
                                {puedeAprobarRechazar && (
                                  <div className="flex gap-1 flex-shrink-0">
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                          const { data: res } = await api.put(`/ventas/voucher/${adj.id}/aprobar`);
                                          toast.success(res.venta_activada ? 'Voucher aprobado y venta activada' : 'Voucher aprobado');
                                          const { data } = await api.get(`/ventas/${detalle.id}`);
                                          setDetalle(data);
                                          listar();
                                        } catch (err) { toast.error(err.response?.data?.error || 'Error al aprobar'); }
                                      }}
                                      className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1"
                                    >
                                      <HiOutlineCheckCircle className="w-4 h-4" /> Aprobar
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setRechazoVoucher(adj.id); setMotivoRechazoVoucher(''); }}
                                      className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1"
                                    >
                                      <HiOutlineXCircle className="w-4 h-4" /> Rechazar
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Motivo cancelacion */}
            {detalle.estado_venta === ESTADO_VENTA.CANCELADA && detalle.motivo_cancelacion && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <span className="text-red-600 text-xs font-semibold block mb-1">Motivo de cancelación</span>
                <p className="text-steel-200 text-sm">{detalle.motivo_cancelacion}</p>
              </div>
            )}

            {/* Motivo rechazo */}
            {detalle.estado_venta === ESTADO_VENTA.RECHAZADA && detalle.motivo_rechazo && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <span className="text-red-600 text-xs font-semibold block mb-1">Motivo de rechazo</span>
                <p className="text-steel-200 text-sm">{detalle.motivo_rechazo}</p>
              </div>
            )}

            {/* Botones */}
            {detalle.estado_venta === ESTADO_VENTA.PENDIENTE_APROBACION && (
              <div className="flex gap-3 pt-2">
                <div className="flex-1 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
                  <p className="text-amber-600 text-sm font-medium">La venta se activará automáticamente al aprobar el voucher de pago</p>
                </div>
                <button onClick={() => { setRechazoVenta(detalle.id); setMotivoRechazoVenta(''); }} className="px-4 py-2 bg-red-500/15 text-red-600 border border-red-500/30 rounded-lg hover:bg-red-500/25 transition-colors flex items-center gap-2">
                  <HiOutlineXCircle className="w-5 h-5" /> Rechazar
                </button>
              </div>
            )}

            {/* Comprobantes Electrónicos */}
            <ListaComprobantesVenta ventaId={detalle.id} venta={detalle} />

            {/* Historial de ajustes de precio */}
            {ajustesDetalle.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-steel-200 mb-2 flex items-center gap-1.5">
                  <HiOutlineClipboardList className="w-4 h-4 text-orange-500" />
                  Historial de ajustes de precio
                  <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/15 text-orange-500 border border-orange-500/30 rounded-full font-semibold">{ajustesDetalle.length}</span>
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {ajustesDetalle.map((aj) => (
                    <div key={aj.id} className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-orange-800">{aj.tbl_items_venta?.tbl_productos?.nombre || 'Producto'}</span>
                        <span className="text-orange-600 text-[10px]">
                          {new Date(aj.fecha_hora).toLocaleDateString('es-PE')} {new Date(aj.fecha_hora).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-orange-700">
                        Precio: <span className="line-through">{formatearMoneda(aj.precio_anterior)}</span> → <span className="font-bold">{formatearMoneda(aj.precio_nuevo)}</span>
                        {aj.cantidad_anterior !== aj.cantidad_nueva && (
                          <span className="ml-2">| Cant: <span className="line-through">{aj.cantidad_anterior}</span> → <span className="font-bold">{aj.cantidad_nueva}</span></span>
                        )}
                      </div>
                      <div className="text-orange-600 mt-1">
                        <span className="font-semibold">{aj.tbl_usuarios?.nombres || 'Usuario'}</span>: {aj.motivo}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Lightbox Voucher */}
      {lightbox && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center" onClick={() => setLightbox(null)}>
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm" />
          <div className="relative z-10 max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {lightbox.match(/\.pdf$/i) ? (
              <iframe src={lightbox} title="Voucher PDF" className="w-[80vw] h-[85vh] rounded-lg shadow-2xl bg-white" />
            ) : (
              <img src={lightbox} alt="Voucher" className="max-h-[85vh] object-contain rounded-lg shadow-2xl" />
            )}
            <div className="absolute top-3 right-3 flex gap-2">
              <a href={lightbox} download target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-colors">
                <HiOutlineDownload className="w-5 h-5" />
              </a>
              <button onClick={() => setLightbox(null)} className="w-9 h-9 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-colors">
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Cancelación */}
      <Modal abierto={!!cancelModal} cerrar={() => setCancelModal(null)} titulo="Cancelar Venta">
        <div className="space-y-4">
          <p className="text-sm text-steel-300">Ingrese el motivo de cancelación para la venta #{cancelModal}:</p>
          <textarea
            className="input-field w-full"
            rows={3}
            placeholder="Motivo de cancelación..."
            value={motivoCancelacion}
            onChange={(e) => setMotivoCancelacion(e.target.value)}
          />
          <div className="flex gap-3 justify-end">
            <button onClick={() => setCancelModal(null)} className="px-4 py-2 text-steel-400 hover:text-steel-200 transition-colors">
              Cancelar
            </button>
            <button onClick={cancelar} disabled={!motivoCancelacion.trim()} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
              <HiOutlineXCircle className="w-4 h-4" /> Confirmar Cancelación
            </button>
          </div>
        </div>
      </Modal>
      {/* Modal Rechazar Venta */}
      <Modal abierto={!!rechazoVenta} cerrar={() => { setRechazoVenta(null); setMotivoRechazoVenta(''); }} titulo="Rechazar Venta">
        <div className="space-y-4">
          <p className="text-sm text-steel-300">Ingrese el motivo de rechazo para la venta #{rechazoVenta}:</p>
          <textarea
            className="input-field w-full"
            rows={3}
            placeholder="Motivo de rechazo..."
            value={motivoRechazoVenta}
            onChange={(e) => setMotivoRechazoVenta(e.target.value)}
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <button onClick={() => { setRechazoVenta(null); setMotivoRechazoVenta(''); }} className="px-4 py-2 text-steel-400 hover:text-steel-200 transition-colors">
              Cancelar
            </button>
            <button
              disabled={!motivoRechazoVenta.trim()}
              onClick={async () => {
                try {
                  await api.post(`/ventas/${rechazoVenta}/rechazar`, { motivo: motivoRechazoVenta.trim() });
                  toast.success('Venta rechazada');
                  setRechazoVenta(null);
                  setMotivoRechazoVenta('');
                  setDetalle(null);
                  listar();
                } catch (err) { toast.error(err.response?.data?.error || 'Error al rechazar'); }
              }}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <HiOutlineXCircle className="w-4 h-4" /> Confirmar Rechazo
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Rechazar Voucher */}
      <Modal abierto={!!rechazoVoucher} cerrar={() => { setRechazoVoucher(null); setMotivoRechazoVoucher(''); }} titulo="Rechazar Voucher">
        <div className="space-y-4">
          <p className="text-sm text-steel-300">Ingrese el motivo de rechazo del voucher:</p>
          <textarea
            className="input-field w-full"
            rows={3}
            placeholder="Motivo de rechazo..."
            value={motivoRechazoVoucher}
            onChange={(e) => setMotivoRechazoVoucher(e.target.value)}
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <button onClick={() => { setRechazoVoucher(null); setMotivoRechazoVoucher(''); }} className="px-4 py-2 text-steel-400 hover:text-steel-200 transition-colors">
              Cancelar
            </button>
            <button
              disabled={!motivoRechazoVoucher.trim()}
              onClick={async () => {
                try {
                  await api.put(`/ventas/voucher/${rechazoVoucher}/rechazar`, { motivo: motivoRechazoVoucher.trim() });
                  toast.success('Voucher rechazado');
                  setRechazoVoucher(null);
                  setMotivoRechazoVoucher('');
                  if (detalle) {
                    const { data } = await api.get(`/ventas/${detalle.id}`);
                    setDetalle(data);
                  }
                  listar();
                } catch (err) { toast.error(err.response?.data?.error || 'Error al rechazar'); }
              }}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <HiOutlineXCircle className="w-4 h-4" /> Confirmar Rechazo
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
