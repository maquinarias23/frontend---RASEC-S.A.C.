import { HiOutlineCash, HiOutlineExclamation } from 'react-icons/hi';
import HojaMovil from './HojaMovil';
import { SeccionMovil, CampoMovil, FilaDato, CampoArchivoMovil, AvisoMovil } from './UiMovil';
import { formatearMoneda, formatearFechaHora } from '../../../utils/formato';
import { METODOS_PAGO_LABEL, MSG_PAGO_BLOQUEADO_CLIENTE } from '../../../config/constants';

/**
 * Registrar un pago desde el celular.
 *
 * Es la acción que más se hace en la calle, con el cliente delante, así que el
 * monto va grande y el voucher se adjunta desde la cámara en un toque. Las
 * reglas son las mismas del escritorio: tope en el saldo disponible, voucher
 * obligatorio y bloqueo si el cliente ya declaró un pago pendiente de revisar.
 *
 * @param {number} [nivel] - 1 cuando se abre encima de la hoja de detalle.
 */
export default function PagoMovil({ vm, nivel = 0 }) {
  const venta = vm.ventaPago;
  const bloqueadoPorCliente = !!venta?.pago_cliente_pendiente;
  const sinSaldo = vm.saldoDisponiblePago <= 0;

  return (
    <HojaMovil
      abierta={vm.modalPago}
      cerrar={() => vm.setModalPago(false)}
      titulo={`Registrar pago`}
      subtitulo={venta ? `Venta #${venta.id} · ${venta.tbl_clientes?.nombre || ''}` : undefined}
      nivel={nivel}
      pie={
        <div className="px-3 py-2.5">
          <button
            type="button"
            onClick={vm.registrarPago}
            disabled={vm.registrandoPago || bloqueadoPorCliente || sinSaldo}
            className="btn-movil-exito"
            title={
              bloqueadoPorCliente
                ? MSG_PAGO_BLOQUEADO_CLIENTE.TOOLTIP_BOTON
                : sinSaldo
                  ? 'Los pagos registrados (aprobados + en verificación) ya cubren el total de la venta'
                  : undefined
            }
          >
            {vm.registrandoPago ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <HiOutlineCash className="w-5 h-5" /> Registrar pago
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="divide-y divide-steel-800">
        {/* ---- ESTADO DE CUENTA ---- */}
        {venta && (
          <SeccionMovil titulo="Estado de la venta">
            <div className="rounded-xl border border-steel-700 bg-steel-900 p-3.5">
              <FilaDato label="Cliente" valor={venta.tbl_clientes?.nombre || '-'} />
              <FilaDato label="Total venta" valor={formatearMoneda(venta.total)} />
              <FilaDato label="Ya pagado" valor={formatearMoneda(venta.total_pagado)} />
              <FilaDato
                label="Saldo pendiente"
                valor={formatearMoneda(venta.saldo_pendiente)}
                tono="ambar"
                fuerte
              />
              {vm.montoEnVerificacion > 0 && (
                <>
                  <FilaDato
                    label="Pagos en verificación"
                    valor={formatearMoneda(vm.montoEnVerificacion)}
                    tono="ambar"
                  />
                  <FilaDato
                    label="Disponible por registrar"
                    valor={formatearMoneda(vm.saldoDisponiblePago)}
                    tono="verde"
                    fuerte
                  />
                </>
              )}
            </div>
          </SeccionMovil>
        )}

        {/* ---- AVISOS QUE CONDICIONAN EL REGISTRO ---- */}
        {(vm.montoEnVerificacion > 0 || bloqueadoPorCliente) && (
          <SeccionMovil>
            <div className="space-y-3">
              {vm.montoEnVerificacion > 0 && (
                <AvisoMovil tono="ambar" titulo="Hay vouchers sin aprobar" icono={HiOutlineExclamation}>
                  Esta venta tiene {formatearMoneda(vm.montoEnVerificacion)} en pagos con voucher
                  pendiente de aprobación. Ese monto ya está contado: solo puedes registrar hasta{' '}
                  {formatearMoneda(Math.max(vm.saldoDisponiblePago, 0))}.
                  {sinSaldo && ' Los pagos registrados ya cubren el total; espera la aprobación o el rechazo del voucher.'}
                </AvisoMovil>
              )}

              {bloqueadoPorCliente && (
                <div className="rounded-xl border border-amber-700 bg-amber-600 p-3.5 shadow-md">
                  <p className="text-sm font-bold text-white">
                    {MSG_PAGO_BLOQUEADO_CLIENTE.BANNER_INTERNO}
                  </p>
                  <p className="mt-1 text-xs font-medium text-white/95 leading-relaxed">
                    {MSG_PAGO_BLOQUEADO_CLIENTE.DETALLE({
                      monto: venta.pago_cliente_pendiente.monto,
                      fecha_hora: venta.pago_cliente_pendiente.fecha_hora,
                      nombre_cliente: venta.pago_cliente_pendiente.nombre_cliente,
                      formatearMoneda,
                      formatearFechaHora,
                    })}
                  </p>
                </div>
              )}
            </div>
          </SeccionMovil>
        )}

        {/* ---- FORMULARIO ---- */}
        <SeccionMovil titulo="Datos del pago" icono={HiOutlineCash}>
          <div className="space-y-4">
            <CampoMovil label="Monto a pagar (S/)" requerido>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                max={venta ? Math.max(vm.saldoDisponiblePago, 0) : undefined}
                className="input-movil text-right text-2xl font-bold tracking-tight"
                value={vm.formPago.monto}
                onChange={(e) => vm.setFormPago({ ...vm.formPago, monto: e.target.value })}
              />
            </CampoMovil>

            <CampoMovil label="Método de pago">
              <select
                className="select-movil"
                value={vm.formPago.metodo_pago}
                onChange={(e) => vm.setFormPago({ ...vm.formPago, metodo_pago: e.target.value })}
              >
                {Object.entries(METODOS_PAGO_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </CampoMovil>

            <CampoMovil label="Boucher / comprobante" requerido>
              <CampoArchivoMovil
                idBase="pago"
                archivo={vm.archivoBoucher}
                onArchivo={vm.setArchivoBoucher}
              />
            </CampoMovil>
          </div>
        </SeccionMovil>
      </div>
    </HojaMovil>
  );
}
