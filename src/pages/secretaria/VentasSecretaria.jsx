import { useState, useMemo } from 'react';
import {
  HiOutlineEye, HiOutlineGift, HiOutlineSearch, HiOutlineX, HiOutlineDocumentDownload,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import useCrud from '../../hooks/useCrud';
import TablaGenerica from '../../components/ui/TablaGenerica';
import EstadoBadge from '../../components/ui/EstadoBadge';
import Modal from '../../components/ui/Modal';
import ListaComprobantesVenta from '../../components/shared/ListaComprobantesVenta';
import TotalizadorVenta from '../../components/shared/TotalizadorVenta';
import BadgeFacturacion from '../../components/shared/BadgeFacturacion';
import { estaFacturada, comprobanteVigente } from '../../utils/facturacionVenta';
import { exportarVentasExcel } from '../../utils/exportarVentas';
import { formatearMoneda, formatearFechaHora } from '../../utils/formato';
import { ESTADO_VENTA, TIPO_ENTREGA, COMPROBANTE_NUMERO } from '../../config/constants';

const columnas = [
  { key: 'id', label: 'N° Venta' },
  { key: 'cliente', label: 'Cliente', render: (f) => f.tbl_clientes?.nombre || '-' },
  { key: 'vendedor', label: 'Vendedor', render: (f) => f.tbl_usuarios?.nombres || '-' },
  { key: 'total', label: 'Total', render: (f) => formatearMoneda(f.total) },
  { key: 'estado_venta', label: 'Estado', render: (f) => <EstadoBadge estado={f.estado_venta} /> },
  { key: 'facturacion', label: 'Facturación', render: (f) => <BadgeFacturacion venta={f} /> },
  { key: 'fecha', label: 'Fecha', render: (f) => formatearFechaHora(f.fecha_hora_registro) },
];

const FILTROS_FACTURACION = [
  { value: '', label: 'Todas' },
  { value: 'facturadas', label: 'Facturadas' },
  { value: 'sin_facturar', label: 'Sin facturar' },
];

/**
 * Texto sobre el que corre el buscador. Se arma una sola vez por venta e
 * incluye lo que alguien escribiría para encontrarla: número, cliente,
 * vendedor, productos y número de comprobante.
 */
const textoBuscable = (v) => {
  const comp = comprobanteVigente(v);
  return [
    v.id,
    v.tbl_clientes?.nombre,
    v.tbl_clientes?.dni,
    v.tbl_usuarios?.nombres,
    v.estado_venta,
    ...(v.items_venta || []).map((i) => i.tbl_productos?.nombre),
    comp ? COMPROBANTE_NUMERO.formatear(comp.serie, comp.numero) : '',
    comp?.tbl_usuarios?.nombres,
  ].filter(Boolean).join(' ').toLowerCase();
};

export default function VentasSecretaria() {
  const { datos, cargando } = useCrud('/ventas');
  const [detalle, setDetalle] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroFactura, setFiltroFactura] = useState('');

  const ventasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (datos || []).filter((v) => {
      if (filtroFactura === 'facturadas' && !estaFacturada(v)) return false;
      if (filtroFactura === 'sin_facturar' && estaFacturada(v)) return false;
      if (!q) return true;
      return textoBuscable(v).includes(q);
    });
  }, [datos, busqueda, filtroFactura]);

  const totalFacturadas = useMemo(() => (datos || []).filter(estaFacturada).length, [datos]);

  /** Deja escrito en el Excel con qué filtros se armó. */
  const describirFiltros = () => {
    const partes = [];
    if (busqueda.trim()) partes.push(`"${busqueda.trim()}"`);
    const etiqueta = FILTROS_FACTURACION.find((f) => f.value === filtroFactura)?.label;
    if (filtroFactura) partes.push(etiqueta);
    return partes.join(' · ');
  };

  // Se exporta lo que está en pantalla: si hay filtros aplicados, el Excel sale
  // filtrado igual, sin sorpresas entre lo que se ve y lo que se descarga.
  const exportar = () => {
    if (ventasFiltradas.length === 0) {
      toast.error('No hay ventas para exportar con esos filtros');
      return;
    }
    try {
      const r = exportarVentasExcel(ventasFiltradas, { filtrosTexto: describirFiltros() });
      toast.success(`Excel descargado: ${r.ventas} ventas, ${r.productos} productos, ${r.pagos} pagos`);
    } catch (err) {
      console.error('Error al exportar ventas:', err);
      toast.error('No se pudo generar el Excel');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold font-display tracking-wider text-steel-100 mb-6">Ventas (Solo lectura)</h1>

      <div className="card mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <HiOutlineSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-steel-400 pointer-events-none" />
            <input
              className="input-field !pl-9 !pr-9"
              placeholder="Buscar por N° de venta, cliente, vendedor, producto o N° de comprobante…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-400 hover:text-steel-200"
                title="Limpiar"
              >
                <HiOutlineX className="w-4 h-4" />
              </button>
            )}
          </div>
          <select
            className="input-field sm:w-48"
            value={filtroFactura}
            onChange={(e) => setFiltroFactura(e.target.value)}
          >
            {FILTROS_FACTURACION.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>

          <button
            onClick={exportar}
            className="btn-secondary !py-2 !text-xs flex items-center justify-center gap-1.5 whitespace-nowrap"
            title="Descargar en Excel las ventas que se están mostrando"
          >
            <HiOutlineDocumentDownload className="w-4 h-4" /> Exportar Excel
          </button>
        </div>

        <p className="text-xs text-steel-400 mt-2">
          {ventasFiltradas.length} de {datos?.length || 0} ventas
          {' · '}
          <span className="text-emerald-600">{totalFacturadas} facturadas</span>
          {' · '}
          <span className="text-steel-400">{(datos?.length || 0) - totalFacturadas} sin facturar</span>
        </p>
      </div>

      <div className="card">
        <TablaGenerica
          columnas={columnas}
          datos={ventasFiltradas}
          cargando={cargando}
          vacio={busqueda || filtroFactura ? 'Ninguna venta coincide con la búsqueda.' : 'No hay ventas.'}
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
              <div><span className="text-steel-400 block text-xs mb-0.5">Facturación</span><BadgeFacturacion venta={detalle} /></div>
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
