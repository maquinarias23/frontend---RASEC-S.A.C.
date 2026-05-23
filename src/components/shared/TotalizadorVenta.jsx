import { formatearMoneda } from '../../utils/formato';

const toNumber = (valor) => {
  const n = parseFloat(valor);
  return Number.isFinite(n) ? n : 0;
};

export default function TotalizadorVenta({ venta, mostrarPagos = true }) {
  if (!venta) return null;

  const items = Array.isArray(venta.items_venta) ? venta.items_venta : [];

  let subtotalBruto = 0;
  let descuentoItemsTotal = 0;
  let regalosValor = 0;

  for (const item of items) {
    const cantidad = toNumber(item.cantidad);
    const precioVendido = toNumber(item.precio_unitario_vendido);
    const precioListaRaw = toNumber(item.precio_unitario_lista);
    const precioLista = precioListaRaw > 0 ? precioListaRaw : precioVendido;
    const descManual = toNumber(item.descuento_manual_item);

    if (item.es_regalo) {
      regalosValor += cantidad * precioLista;
    } else {
      subtotalBruto += cantidad * precioLista;
      descuentoItemsTotal += descManual;
    }
  }

  const subtotalBackend = toNumber(venta.subtotal);
  const subtotal = subtotalBruto > 0 ? subtotalBruto : subtotalBackend;

  const descuentoPromocion = toNumber(venta.descuento_promocion);
  const descuentoPuntos = toNumber(venta.descuento_puntos);
  const total = toNumber(venta.total);
  const totalPagado = toNumber(venta.total_pagado);
  const saldoPendiente = toNumber(venta.saldo_pendiente);

  return (
    <div className="bg-steel-900/50 rounded-lg p-3 space-y-1 text-sm">
      <div className="flex justify-between">
        <span className="text-steel-400">Subtotal:</span>
        <span>{formatearMoneda(subtotal)}</span>
      </div>

      {descuentoItemsTotal > 0 && (
        <div className="flex justify-between text-emerald-600">
          <span>Descuento por ítems:</span>
          <span>-{formatearMoneda(descuentoItemsTotal)}</span>
        </div>
      )}

      {regalosValor > 0 && (
        <div className="flex justify-between text-emerald-600">
          <span>Regalos (valor):</span>
          <span>-{formatearMoneda(regalosValor)}</span>
        </div>
      )}

      {descuentoPromocion > 0 && (
        <div className="flex justify-between text-emerald-600">
          <span>Descuento promocion:</span>
          <span>-{formatearMoneda(descuentoPromocion)}</span>
        </div>
      )}

      {descuentoPuntos > 0 && (
        <div className="flex justify-between text-emerald-600">
          <span>Descuento puntos:</span>
          <span>-{formatearMoneda(descuentoPuntos)}</span>
        </div>
      )}

      <div className="flex justify-between font-bold text-base pt-1 border-t border-steel-700">
        <span>Total:</span>
        <span>{formatearMoneda(total)}</span>
      </div>

      {mostrarPagos && (
        <>
          <div className="flex justify-between text-sm">
            <span className="text-steel-400">Pagado:</span>
            <span className="text-emerald-600 font-medium">{formatearMoneda(totalPagado)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-steel-400">Saldo pendiente:</span>
            <span className={saldoPendiente > 0 ? 'text-amber-600 font-medium' : 'text-emerald-600 font-medium'}>
              {formatearMoneda(saldoPendiente)}
            </span>
          </div>
          {venta.pago_completo && (
            <p className="text-xs text-emerald-600 font-medium text-center pt-1">PAGO COMPLETO</p>
          )}
        </>
      )}
    </div>
  );
}
