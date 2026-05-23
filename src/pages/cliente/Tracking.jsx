import { useState } from 'react';
import { HiOutlineSearch } from 'react-icons/hi';
import EstadoBadge from '../../components/ui/EstadoBadge';
import TimelineTracking from '../../components/ui/TimelineTracking';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { formatearMoneda, formatearFechaHora } from '../../utils/formato';
import { buildMediaUrl } from '../../utils/media';
import { ESTADO_TRACKING, TIPO_ENTREGA, TELEFONO_INPUT } from '../../config/constants';

const imgUrl = buildMediaUrl;

export default function Tracking() {
  const [ventaId, setVentaId] = useState('');
  const [venta, setVenta] = useState(null);
  const [cargando, setCargando] = useState(false);

  const buscar = async () => {
    if (!ventaId) return;
    setCargando(true);
    try {
      const { data } = await api.get(`/ventas/${ventaId}`);
      setVenta(data);
    } catch {
      toast.error('Pedido no encontrado');
      setVenta(null);
    } finally { setCargando(false); }
  };

  return (
    <div>
      <h1 className="section-title-chromium mb-6">Tracking de Pedido</h1>

      {/* Búsqueda */}
      <div className="card-chromium mb-6">
        <div className="flex gap-3">
          <input
            className="input-chromium flex-1"
            placeholder="Ingresa el N° de pedido..."
            value={ventaId}
            onChange={(e) => setVentaId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscar()}
          />
          <button onClick={buscar} disabled={cargando} className="btn-primary flex items-center gap-2">
            {cargando ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <HiOutlineSearch className="w-4 h-4" />
            )}
            Buscar
          </button>
        </div>
      </div>

      {venta && (
        <div className="space-y-6">
          {/* Info de la venta */}
          <div className="card-chromium">
            <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
              <h2 className="text-lg font-semibold text-steel-100 font-display tracking-wider">Pedido #{venta.id}</h2>
              <EstadoBadge estado={venta.estado_venta} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-steel-400">Cliente:</span>{' '}
                <span className="font-medium text-steel-100">{venta.tbl_clientes?.nombre || '-'}</span>
              </div>
              <div>
                <span className="text-steel-400">Tipo entrega:</span>{' '}
                <span className="font-medium text-steel-100">{venta.tipo_entrega?.replace(/_/g, ' ')}</span>
              </div>
              <div>
                <span className="text-steel-400">Total:</span>{' '}
                <span className="font-bold text-primary-500 num-chromium">{formatearMoneda(venta.total)}</span>
              </div>
              <div>
                <span className="text-steel-400">Fecha:</span>{' '}
                <span className="font-medium text-steel-100">{formatearFechaHora(venta.fecha_hora_registro)}</span>
              </div>
              <div className="col-span-2">
                <span className="text-steel-400">Vendedor:</span>{' '}
                <span className="font-medium text-steel-100">{venta.tbl_usuarios?.nombres || '-'}</span>
                {venta.tbl_usuarios?.telefono && (
                  <span className="ml-2 text-steel-400 text-xs">{TELEFONO_INPUT.format(venta.tbl_usuarios.telefono)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Timeline visual */}
          <div className="card-chromium">
            <h3 className="label-chromium mb-6">Estado del envío</h3>
            <TimelineTracking estadoActual={venta.estado_tracking} historial={venta.historial_tracking || []} />
          </div>

          {/* Evidencia del envío */}
          {(venta.fotos_paquete?.length > 0 || venta.asignaciones_evidencia?.length > 0) && (
            <div className="card-chromium">
              <h3 className="label-chromium mb-3">Evidencia del envío</h3>
              <div className="flex gap-2 flex-wrap">
                {venta.fotos_paquete?.map((foto) => (
                  <img
                    key={foto.id}
                    src={imgUrl(foto.archivo)}
                    alt="Paquete"
                    className="w-20 h-20 rounded-lg object-cover border border-steel-700/30"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ))}
                {venta.asignaciones_evidencia?.map((ae) => (
                  <img
                    key={ae.id}
                    src={imgUrl(ae.tbl_banco_evidencias?.url_archivo)}
                    alt="Evidencia"
                    className="w-20 h-20 rounded-lg object-cover border border-steel-700/30"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Contraseña de recojo por agencia (envio_por_agencia) */}
          {venta.tipo_entrega === TIPO_ENTREGA.ENVIO_POR_AGENCIA && (
            <div className="card-chromium">
              <h3 className="label-chromium mb-3">Contraseña de Recojo en Agencia</h3>
              {venta.contrasena_envio ? (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-center">
                  <p className="text-sm text-amber-400 mb-1">Tu contraseña de recojo en agencia:</p>
                  <p className="text-primary-500 text-3xl font-bold tracking-widest num-chromium">{venta.contrasena_envio}</p>
                </div>
              ) : venta.estado_tracking === ESTADO_TRACKING.DEJADO_EN_AGENCIA ? (
                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg text-center">
                  <p className="text-sm text-orange-400 font-medium">Tu pedido ya fue entregado en agencia. La contraseña de recojo se mostrará cuando todos los pagos estén verificados.</p>
                </div>
              ) : (
                <div className="p-4 bg-steel-900/50 border border-steel-700/20 rounded-lg text-center">
                  <p className="text-sm text-steel-400">La contraseña de recojo se mostrará cuando el pedido sea entregado en agencia y todos los pagos estén verificados.</p>
                </div>
              )}
            </div>
          )}

          {/* Clave secreta (retiro_en_tienda) */}
          {venta.tipo_entrega === TIPO_ENTREGA.RETIRO_EN_TIENDA && venta.tbl_claves_secretas?.length > 0 && (
            <div className="card-chromium">
              <h3 className="label-chromium mb-3">Clave Secreta para Retiro</h3>
              {venta.tbl_claves_secretas.filter(c => c.visible_cliente).map(c => (
                <div key={c.id} className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-center">
                  <p className="text-sm text-amber-400 mb-1">Tu clave de retiro es:</p>
                  <p className="text-primary-500 text-3xl font-bold tracking-widest num-chromium">{c.clave}</p>
                </div>
              ))}
              {venta.tbl_claves_secretas.every(c => !c.visible_cliente) && (
                <div className="p-4 bg-steel-900/50 border border-steel-700/20 rounded-lg text-center">
                  <p className="text-sm text-steel-400">La clave aún no está visible. Se activará cuando el pago esté completo y el vendedor lo confirme.</p>
                </div>
              )}
            </div>
          )}

          {/* Items del pedido */}
          {venta.tbl_items_venta?.length > 0 && (
            <div className="card-chromium">
              <h3 className="label-chromium mb-3">Productos del Pedido</h3>
              <div className="space-y-2">
                {venta.tbl_items_venta.map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-steel-900/30 rounded-lg p-3 border border-steel-700/20 text-sm">
                    <div>
                      <p className="font-medium text-steel-100">{item.tbl_productos?.nombre || `Producto #${item.producto_id}`}</p>
                      <p className="text-xs text-steel-400">Cantidad: <span className="num-chromium">{item.cantidad}</span></p>
                    </div>
                    <p className="font-medium text-steel-100 num-chromium">{formatearMoneda(item.subtotal)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
