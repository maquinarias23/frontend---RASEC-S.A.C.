import { useState } from 'react';
import { HiOutlineEye, HiOutlineGift } from 'react-icons/hi';
import useCrud from '../../hooks/useCrud';
import TablaGenerica from '../../components/ui/TablaGenerica';
import EstadoBadge from '../../components/ui/EstadoBadge';
import Modal from '../../components/ui/Modal';
import ListaComprobantesVenta from '../../components/shared/ListaComprobantesVenta';
import TotalizadorVenta from '../../components/shared/TotalizadorVenta';
import { formatearMoneda, formatearFechaHora } from '../../utils/formato';
import { ESTADO_VENTA, TIPO_ENTREGA } from '../../config/constants';

const columnas = [
  { key: 'id', label: 'N° Venta' },
  { key: 'cliente', label: 'Cliente', render: (f) => f.tbl_clientes?.nombre || '-' },
  { key: 'total', label: 'Total', render: (f) => formatearMoneda(f.total) },
  { key: 'estado_venta', label: 'Estado', render: (f) => <EstadoBadge estado={f.estado_venta} /> },
  { key: 'fecha', label: 'Fecha', render: (f) => formatearFechaHora(f.fecha_hora_registro) },
];

export default function VentasSecretaria() {
  const { datos, cargando } = useCrud('/ventas');
  const [detalle, setDetalle] = useState(null);

  return (
    <div>
      <h1 className="text-2xl font-bold font-display tracking-wider text-steel-100 mb-6">Ventas (Solo lectura)</h1>
      <div className="card">
        <TablaGenerica
          columnas={columnas}
          datos={datos}
          cargando={cargando}
          acciones={(fila) => (
            <button onClick={() => setDetalle(fila)} className="text-blue-600 hover:text-blue-700" title="Ver detalle">
              <HiOutlineEye className="w-4 h-4" />
            </button>
          )}
        />
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


            {/* Motivo cancelacion */}
            {detalle.estado_venta === ESTADO_VENTA.CANCELADA && detalle.motivo_cancelacion && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <span className="text-red-600 text-xs font-semibold block mb-1">Motivo de cancelación</span>
                <p className="text-steel-200 text-sm">{detalle.motivo_cancelacion}</p>
              </div>
            )}

            {/* Comprobantes Electrónicos */}
            <ListaComprobantesVenta ventaId={detalle.id} venta={detalle} />
          </div>
        )}
      </Modal>
    </div>
  );
}
