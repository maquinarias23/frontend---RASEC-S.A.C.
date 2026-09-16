import { useState } from 'react';
import {
  HiOutlineCash,
  HiOutlineGift,
  HiOutlineTag,
  HiOutlineKey,
  HiOutlineClock,
  HiOutlinePencilAlt,
  HiOutlineDocumentText,
  HiOutlineCube,
  HiOutlineTruck,
  HiOutlineOfficeBuilding,
  HiOutlineExclamationCircle,
  HiChevronDown,
} from 'react-icons/hi';
import HojaMovil from './HojaMovil';
import { SeccionMovil, CampoMovil, FilaDato, AvisoMovil, CampoArchivoMovil } from './UiMovil';
import EstadoBadge from '../../../components/ui/EstadoBadge';
import TotalizadorVenta from '../../../components/shared/TotalizadorVenta';
import ListaComprobantesVenta from '../../../components/shared/ListaComprobantesVenta';
import { formatearMoneda, formatearFechaHora } from '../../../utils/formato';
import { buildMediaUrl } from '../../../utils/media';
import { ESTADO_VENTA, ESTADO_TRACKING, TIPO_ENTREGA } from '../../../config/constants';

/** Bloque plegable: todo el detalle cabe sin un scroll interminable. */
function Plegable({ titulo, icono: Icono, contador, abiertoInicial = false, children }) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  return (
    <div>
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className="w-full min-h-[52px] flex items-center gap-2 px-4 py-3 text-left active:bg-steel-900/60 transition-colors"
      >
        {Icono && <Icono className="w-4 h-4 text-primary-500 shrink-0" />}
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-steel-400">
          {titulo}
          {contador != null && <span className="ml-1.5 text-steel-500">({contador})</span>}
        </span>
        <HiChevronDown
          className={`w-5 h-5 text-steel-500 shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`}
        />
      </button>
      {abierto && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

/**
 * Detalle de una venta en celular.
 *
 * Trae exactamente la misma información que el modal de escritorio. La
 * diferencia es de reparto: lo que se consulta siempre —estado, totales,
 * pagos— queda desplegado, y lo que se consulta de vez en cuando va plegado a
 * un toque de distancia, en vez de obligar a recorrer la pantalla entera.
 */
export default function DetalleVentaMovil({ vm }) {
  const v = vm.ventaDetalle;
  const puedePagar = !!v && parseFloat(v.saldo_pendiente) > 0 && vm.ventaPermitePago(v);

  return (
    <>
      <HojaMovil
        abierta={vm.modalDetalle}
        cerrar={() => { vm.setModalDetalle(false); vm.setVentaDetalle(null); }}
        titulo={v ? `Venta #${v.id}` : 'Detalle de venta'}
        subtitulo={v?.tbl_clientes?.nombre}
        pie={
          puedePagar ? (
            <div className="px-3 py-2.5">
              <button
                type="button"
                onClick={() => { vm.setModalDetalle(false); vm.abrirModalPago(v); }}
                className="btn-movil-exito"
              >
                <HiOutlineCash className="w-5 h-5" />
                Registrar pago — Saldo {formatearMoneda(v.saldo_pendiente)}
              </button>
            </div>
          ) : null
        }
      >
        {vm.cargandoDetalle ? (
          <div className="flex justify-center py-16">
            <div className="w-9 h-9 border-4 border-steel-800 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : v ? (
          <div className="divide-y divide-steel-800 pb-6">
            {/* ---- RESUMEN ---- */}
            <SeccionMovil>
              <div className="flex flex-wrap items-center gap-2">
                <EstadoBadge estado={v.estado_venta} />
                <EstadoBadge estado={v.estado_tracking} />
              </div>

              <div className="mt-3 rounded-xl border border-steel-700 bg-steel-900 p-3.5">
                <FilaDato
                  label="Cliente"
                  valor={
                    <>
                      {v.tbl_clientes?.nombre || '-'}
                      {v.tbl_clientes?.dni && (
                        <span className="block text-[11px] font-normal text-steel-500">
                          {v.tbl_clientes.dni}
                        </span>
                      )}
                    </>
                  }
                />
                <FilaDato label="Vendedor" valor={v.tbl_usuarios?.nombres || '-'} />
                <FilaDato
                  label="Entrega"
                  valor={
                    <>
                      <span className="capitalize">{v.tipo_entrega?.replace(/_/g, ' ')}</span>
                      {v.tbl_transportistas && (
                        <span className="block text-[11px] font-normal text-primary-600">
                          {v.tbl_transportistas.nombre}
                        </span>
                      )}
                    </>
                  }
                />
                <FilaDato label="Fecha" valor={formatearFechaHora(v.fecha_hora_registro)} />
              </div>

              {/* Destino */}
              <div className="mt-3">
                {v.tipo_entrega === TIPO_ENTREGA.RETIRO_EN_TIENDA ? (
                  <AvisoMovil tono="info" titulo="Retiro en tienda" icono={HiOutlineOfficeBuilding}>
                    El cliente retirará el producto en tienda. La entrega es gestionada por almacén.
                  </AvisoMovil>
                ) : v.tbl_departamentos ? (
                  <AvisoMovil tono="info" titulo="Destino de envío" icono={HiOutlineTruck}>
                    {v.tbl_departamentos.nombre} / {v.tbl_provincias?.nombre} / {v.tbl_distritos?.nombre}
                  </AvisoMovil>
                ) : v.direccion_manual ? (
                  <AvisoMovil tono="info" titulo="Dirección de envío (manual)" icono={HiOutlineTruck}>
                    {v.direccion_manual}
                  </AvisoMovil>
                ) : null}
              </div>
            </SeccionMovil>

            {/* ---- ÍTEMS ---- */}
            {v.items_venta?.length > 0 && (
              <SeccionMovil titulo="Ítems de la venta" icono={HiOutlineCube}>
                <div className="space-y-2">
                  {v.items_venta.map((it) => (
                    <div
                      key={it.id}
                      className={`rounded-xl border p-3 ${
                        it.es_regalo ? 'border-emerald-300 bg-emerald-50' : 'border-steel-700 bg-steel-900'
                      }`}
                    >
                      <p className="text-sm font-semibold text-steel-100 leading-snug">
                        {it.tbl_productos?.nombre || `Producto #${it.product_id}`}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {it.es_regalo && (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                            <HiOutlineGift className="w-3 h-3" /> REGALO
                          </span>
                        )}
                        {it.promocion_id && parseFloat(it.descuento_promocion_item) > 0 && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                            <HiOutlineTag className="w-3 h-3" /> Promo: -
                            {formatearMoneda(it.descuento_promocion_item)}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-end justify-between gap-3">
                        <span className="text-xs text-steel-400">
                          {it.cantidad} × {formatearMoneda(it.precio_unitario_vendido)}
                        </span>
                        <span className="text-base font-bold text-steel-100">
                          {it.es_regalo ? (
                            <span className="line-through text-steel-500">
                              {formatearMoneda(it.cantidad * parseFloat(it.precio_unitario_vendido))}
                            </span>
                          ) : (
                            formatearMoneda(it.cantidad * parseFloat(it.precio_unitario_vendido))
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Ajuste de precios */}
                {vm.ventaPermiteAjuste(v) && !vm.modoAjuste && (
                  <button
                    type="button"
                    onClick={vm.iniciarAjuste}
                    className="btn-movil-secundario mt-3"
                  >
                    <HiOutlinePencilAlt className="w-5 h-5" /> Ajustar precios / cantidades
                  </button>
                )}
              </SeccionMovil>
            )}

            {/* ---- PANEL DE AJUSTE ---- */}
            {vm.modoAjuste && (
              <SeccionMovil titulo="Ajuste de precios" icono={HiOutlinePencilAlt}>
                <div className="space-y-2.5">
                  {vm.itemsAjuste.map((item, idx) => {
                    const bajoMinimo = !item.es_regalo && item.precio_nuevo < item.precio_minimo;
                    return (
                      <div
                        key={item.item_id}
                        className="rounded-xl border border-amber-200 bg-amber-50 p-3"
                      >
                        <p className="text-sm font-semibold text-amber-900 leading-snug">
                          {item.nombre}
                          {item.es_regalo && (
                            <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                              REGALO
                            </span>
                          )}
                        </p>
                        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                          <CampoMovil label="Cantidad">
                            <input
                              type="number"
                              inputMode="numeric"
                              min="1"
                              className="input-movil bg-white border-amber-300 text-right"
                              value={item.cantidad_nueva}
                              onChange={(e) => {
                                const actualizado = [...vm.itemsAjuste];
                                actualizado[idx] = { ...item, cantidad_nueva: e.target.value };
                                vm.setItemsAjuste(actualizado);
                              }}
                              onBlur={(e) => {
                                const n = parseInt(e.target.value, 10);
                                const actualizado = [...vm.itemsAjuste];
                                actualizado[idx] = {
                                  ...item,
                                  cantidad_nueva: Number.isFinite(n) && n > 0 ? n : 1,
                                };
                                vm.setItemsAjuste(actualizado);
                              }}
                            />
                          </CampoMovil>
                          <CampoMovil
                            label="Precio"
                            ayuda={
                              !item.es_regalo && item.precio_minimo > 0
                                ? `Mín: ${formatearMoneda(item.precio_minimo)}`
                                : undefined
                            }
                          >
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              min="0"
                              className={`input-movil bg-white text-right ${
                                bajoMinimo ? 'border-red-400 text-red-600' : 'border-amber-300'
                              }`}
                              value={item.precio_nuevo}
                              onChange={(e) => {
                                const precio = parseFloat(e.target.value) || 0;
                                const actualizado = [...vm.itemsAjuste];
                                actualizado[idx] = { ...item, precio_nuevo: precio };
                                vm.setItemsAjuste(actualizado);
                              }}
                              onBlur={() => vm.avisarPrecioBajoMinimo(item, idx)}
                            />
                          </CampoMovil>
                        </div>
                        <p className="mt-2 text-right text-sm font-bold text-amber-900">
                          {formatearMoneda(item.cantidad_nueva * item.precio_nuevo)}
                        </p>
                      </div>
                    );
                  })}

                  <CampoMovil label="Motivo del ajuste" requerido>
                    <textarea
                      className="input-movil bg-white border-amber-300 text-amber-900 placeholder:text-amber-400"
                      rows={3}
                      placeholder="Ej: Cliente solicita descuento por volumen..."
                      value={vm.motivoAjuste}
                      onChange={(e) => vm.setMotivoAjuste(e.target.value)}
                    />
                  </CampoMovil>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => vm.setModoAjuste(false)}
                      className="btn-movil-secundario w-auto px-5"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={vm.guardarAjuste}
                      disabled={vm.guardandoAjuste}
                      className="btn-movil-primario flex-1"
                    >
                      {vm.guardandoAjuste ? 'Guardando...' : 'Guardar ajuste'}
                    </button>
                  </div>
                </div>
              </SeccionMovil>
            )}

            {/* ---- TOTALES ---- */}
            <SeccionMovil titulo="Totales" icono={HiOutlineCash}>
              <TotalizadorVenta venta={v} />
            </SeccionMovil>

            {/* ---- PAGOS ---- */}
            {v.pagos?.length > 0 && (
              <SeccionMovil titulo="Pagos realizados" icono={HiOutlineCash}>
                <div className="space-y-2.5">
                  {v.pagos.map((pago) => (
                    <div key={pago.id} className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-base font-bold text-emerald-700">
                          {formatearMoneda(pago.monto)}
                        </span>
                        <span className="text-[11px] text-emerald-600">
                          {formatearFechaHora(pago.fecha_hora)}
                        </span>
                      </div>

                      {pago.adjuntos?.map((adj, j) => {
                        const urlArchivo = buildMediaUrl(adj.archivo);
                        const esImagen = adj.archivo?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                        return (
                          <div key={adj.id || j} className="mt-2 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                              <span className="text-emerald-700">Voucher {j + 1}:</span>
                              {adj.aprobado && (
                                <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-700">
                                  Aprobado
                                </span>
                              )}
                              {adj.rechazado && (
                                <span className="rounded bg-red-100 px-1.5 py-0.5 font-semibold text-red-600">
                                  Rechazado{adj.motivo_rechazo ? ` — ${adj.motivo_rechazo}` : ''}
                                </span>
                              )}
                              {!adj.aprobado && !adj.rechazado && (
                                <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-700">
                                  Pendiente de aprobación
                                </span>
                              )}
                              {urlArchivo && (
                                <a
                                  href={urlArchivo}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-auto font-medium text-primary-600 underline"
                                >
                                  Ver archivo
                                </a>
                              )}
                            </div>
                            {urlArchivo && esImagen && (
                              <a href={urlArchivo} target="_blank" rel="noopener noreferrer" className="block">
                                <img
                                  src={urlArchivo}
                                  alt={`Voucher ${j + 1}`}
                                  className="w-full max-h-56 object-contain rounded-lg border border-emerald-200 bg-white"
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </SeccionMovil>
            )}

            {/* ---- CONTRASEÑA DE ENVÍO / CLAVE DE RETIRO ---- */}
            {v.tipo_entrega === TIPO_ENTREGA.ENVIO_POR_AGENCIA && (
              <SeccionMovil titulo="Contraseña de envío" icono={HiOutlineKey}>
                {v.contrasena_envio ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
                    <span className="font-mono text-lg font-bold tracking-widest text-amber-900">
                      {v.contrasena_envio}
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      Pago aprobado
                    </span>
                  </div>
                ) : v.estado_tracking === ESTADO_TRACKING.DEJADO_EN_AGENCIA ? (
                  <AvisoMovil tono="ambar">
                    Contraseña registrada — será visible cuando el superadministrador apruebe el pago.
                  </AvisoMovil>
                ) : (
                  <AvisoMovil tono="neutro">
                    Pendiente — el chofer ingresará la contraseña al entregar a la agencia.
                  </AvisoMovil>
                )}
              </SeccionMovil>
            )}

            {v.tipo_entrega === TIPO_ENTREGA.RETIRO_EN_TIENDA && v.claves_secretas?.length > 0 && (
              <SeccionMovil titulo="Clave secreta para retiro" icono={HiOutlineKey}>
                <div className="space-y-2">
                  {v.claves_secretas.map((cs) => (
                    <div key={cs.id} className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-lg font-bold tracking-widest text-amber-900">
                          {cs.clave}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            cs.visible_cliente
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-steel-800 text-steel-400'
                          }`}
                        >
                          {cs.visible_cliente ? 'Visible al cliente' : 'No visible'}
                        </span>
                      </div>
                      {!cs.visible_cliente && v.pago_completo && (
                        <button
                          type="button"
                          onClick={() => vm.hacerVisibleClave(cs.id)}
                          className="btn-movil-exito mt-2.5"
                        >
                          <HiOutlineKey className="w-5 h-5" /> Hacer visible
                        </button>
                      )}
                      {!cs.visible_cliente && !v.pago_completo && (
                        <p className="mt-1.5 text-[11px] text-steel-500">Requiere pago completo</p>
                      )}
                    </div>
                  ))}
                </div>
              </SeccionMovil>
            )}

            {/* ---- CANCELACIÓN / RECHAZO ---- */}
            {v.estado_venta === ESTADO_VENTA.CANCELADA && v.motivo_cancelacion && (
              <SeccionMovil>
                <AvisoMovil tono="rojo" titulo="Motivo de cancelación" icono={HiOutlineExclamationCircle}>
                  {v.motivo_cancelacion}
                </AvisoMovil>
              </SeccionMovil>
            )}

            {v.estado_venta === ESTADO_VENTA.RECHAZADA && (
              <SeccionMovil>
                <div className="rounded-xl border border-red-200 bg-red-50 p-3.5">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-red-700">
                    <HiOutlineExclamationCircle className="w-4 h-4" /> Pedido rechazado
                  </p>
                  {v.motivo_rechazo && (
                    <p className="mt-1 text-xs text-red-700 leading-relaxed">{v.motivo_rechazo}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      vm.setVentaReenvio(v);
                      vm.setVoucherReenvio(null);
                      vm.setModalReenvio(true);
                    }}
                    className="btn-movil mt-3 bg-amber-600 text-white shadow-lg shadow-amber-600/25"
                  >
                    <HiOutlineCash className="w-5 h-5" /> Reenviar con nuevo voucher
                  </button>
                </div>
              </SeccionMovil>
            )}

            {/* ---- BLOQUES DE CONSULTA OCASIONAL ---- */}
            <div className="divide-y divide-steel-800">
              <Plegable titulo="Comprobantes electrónicos" icono={HiOutlineDocumentText}>
                <ListaComprobantesVenta ventaId={v.id} soloLectura />
              </Plegable>

              {v.asignaciones_unidad?.length > 0 && (
                <Plegable
                  titulo="Unidades asignadas"
                  icono={HiOutlineCube}
                  contador={v.asignaciones_unidad.length}
                >
                  <div className="flex flex-wrap gap-2">
                    {v.asignaciones_unidad.map((a) => (
                      <span
                        key={a.id}
                        className="inline-flex flex-col rounded-lg bg-indigo-50 px-2.5 py-1.5 font-mono text-xs text-indigo-700"
                      >
                        <span className="font-bold">
                          {a.tbl_unidades_producto?.serial || `#${a.product_unit_id}`}
                        </span>
                        {a.tbl_unidades_producto?.codigo_barras && (
                          <span className="text-[10px] text-indigo-500">
                            {a.tbl_unidades_producto.codigo_barras}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </Plegable>
              )}

              {vm.historialAjustes.length > 0 && (
                <Plegable
                  titulo="Historial de ajustes"
                  icono={HiOutlineClock}
                  contador={vm.historialAjustes.length}
                >
                  <div className="space-y-2">
                    {vm.historialAjustes.map((aj) => (
                      <div key={aj.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-amber-900">
                            {aj.tbl_items_venta?.tbl_productos?.nombre || 'Producto'}
                          </span>
                          <span className="shrink-0 text-[10px] text-amber-600">
                            {new Date(aj.fecha_hora).toLocaleDateString('es-PE')}{' '}
                            {new Date(aj.fecha_hora).toLocaleTimeString('es-PE', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="mt-1 text-amber-700">
                          Precio: {formatearMoneda(aj.precio_anterior)} → {formatearMoneda(aj.precio_nuevo)}
                          {aj.cantidad_anterior !== aj.cantidad_nueva && (
                            <span> | Cant: {aj.cantidad_anterior} → {aj.cantidad_nueva}</span>
                          )}
                        </p>
                        <p className="mt-0.5 text-amber-600">
                          <span className="font-medium">{aj.tbl_usuarios?.nombres || 'Usuario'}</span>: {aj.motivo}
                        </p>
                      </div>
                    ))}
                  </div>
                </Plegable>
              )}

              {v.aplicaciones_promocion?.length > 0 && (
                <Plegable titulo="Promoción aplicada" icono={HiOutlineTag}>
                  <div className="space-y-2">
                    {v.aplicaciones_promocion.map((ap) => (
                      <div
                        key={ap.id}
                        className="flex items-center justify-between gap-3 rounded-xl bg-yellow-50 px-3 py-2.5 text-sm"
                      >
                        <span className="font-medium text-yellow-800">
                          {ap.tbl_promociones?.nombre || `Promoción #${ap.promotion_id}`}
                        </span>
                        <span className="shrink-0 font-semibold text-yellow-700">
                          -{formatearMoneda(ap.monto_descuento)}
                        </span>
                      </div>
                    ))}
                  </div>
                </Plegable>
              )}
            </div>
          </div>
        ) : null}
      </HojaMovil>

      {/* ---- REENVÍO DE PEDIDO RECHAZADO ---- */}
      <ReenvioMovil vm={vm} />
    </>
  );
}

/** Hoja de reenvío: solo pide el voucher nuevo. */
function ReenvioMovil({ vm }) {
  return (
    <HojaMovil
      abierta={vm.modalReenvio}
      cerrar={() => { vm.setModalReenvio(false); vm.setVentaReenvio(null); vm.setVoucherReenvio(null); }}
      titulo={`Reenviar pedido #${vm.ventaReenvio?.id || ''}`}
      nivel={1}
      pie={
        <div className="px-3 py-2.5">
          <button
            type="button"
            disabled={!vm.voucherReenvio || vm.enviandoReenvio}
            onClick={vm.reenviarPedido}
            className="btn-movil-primario"
          >
            {vm.enviandoReenvio ? 'Enviando...' : 'Reenviar pedido'}
          </button>
        </div>
      }
    >
      <div className="divide-y divide-steel-800">
        {vm.ventaReenvio?.motivo_rechazo && (
          <SeccionMovil>
            <AvisoMovil tono="rojo" titulo="Motivo del rechazo" icono={HiOutlineExclamationCircle}>
              {vm.ventaReenvio.motivo_rechazo}
            </AvisoMovil>
          </SeccionMovil>
        )}
        <SeccionMovil titulo="Nuevo voucher de pago" icono={HiOutlineCash}>
          <CampoArchivoMovil
            idBase="reenvio"
            archivo={vm.voucherReenvio}
            onArchivo={vm.setVoucherReenvio}
          />
        </SeccionMovil>
      </div>
    </HojaMovil>
  );
}
