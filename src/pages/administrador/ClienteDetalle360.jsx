import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlineShoppingCart, HiOutlineStar, HiOutlineCurrencyDollar, HiOutlinePhone, HiOutlineMail, HiOutlineIdentification, HiOutlineCalendar, HiOutlineLocationMarker, HiOutlinePencil, HiOutlineClock } from 'react-icons/hi';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import EstadoBadge from '../../components/ui/EstadoBadge';
import ModalEditarCliente from '../../components/shared/ModalEditarCliente';
import { formatearFechaHora, formatearFecha, formatearMoneda } from '../../utils/formato';
import { ESTADO_ACCESO, TIPO_DESTINO, TELEFONO_INPUT, CLIENTE_FORM } from '../../config/constants';
import useAuthStore from '../../store/authStore';
import { RUTAS_POR_ROL } from '../../config/roles';

export default function ClienteDetalle360() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const usuario = useAuthStore((s) => s.usuario);
  const prefijoRol = location.pathname.split('/')[1]
    || RUTAS_POR_ROL[usuario?.rol]?.split('/')[1]
    || 'administrador';
  const rutaClientes = `/${prefijoRol}/clientes`;
  const [detalle, setDetalle] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState('resumen');
  const [modalEditar, setModalEditar] = useState(false);

  const cargarDetalle = async () => {
    try {
      const { data } = await api.get(`/clientes/${id}`);
      setDetalle(data);
    } catch {
      toast.error('Error al cargar cliente');
      navigate(rutaClientes);
    }
  };

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      try {
        const { data } = await api.get(`/clientes/${id}`);
        setDetalle(data);
      } catch {
        toast.error('Error al cargar cliente');
        navigate(rutaClientes);
      }
      setCargando(false);
    };
    cargar();
  }, [id, navigate, rutaClientes]);

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-400 border-t-transparent" />
      </div>
    );
  }

  if (!detalle) return null;

  const tabs = [
    { key: 'resumen', label: 'Resumen' },
    { key: 'compras', label: `Compras (${detalle.total_ventas || 0})` },
    { key: 'direcciones', label: `Direcciones (${detalle.direcciones?.length || 0})` },
    { key: 'puntos', label: 'Puntos' },
    { key: 'cotizaciones', label: `Cotizaciones (${detalle.cotizaciones_web?.length || 0})` },
  ];

  return (
    <div className="space-y-6">
      {/* Botón volver */}
      <button onClick={() => navigate(rutaClientes)} className="flex items-center gap-2 text-sm text-steel-400 hover:text-steel-200 transition-colors">
        <HiOutlineArrowLeft className="w-4 h-4" /> Volver a Clientes
      </button>

      {/* Header del cliente */}
      <div className="card">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-3xl font-bold text-white flex-shrink-0">
            {detalle.nombre?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold font-display tracking-wider text-steel-50">{detalle.nombre}</h1>
              <button onClick={() => setModalEditar(true)} className="btn-secondary text-sm flex items-center gap-1">
                <HiOutlinePencil className="w-3.5 h-3.5" /> {CLIENTE_FORM.btnEditar}
              </button>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-sm text-steel-400">
              {detalle.dni && <span className="flex items-center gap-1.5"><HiOutlineIdentification className="w-4 h-4" /> {detalle.dni}</span>}
              {detalle.telefono_principal && <span className="flex items-center gap-1.5"><HiOutlinePhone className="w-4 h-4" /> {TELEFONO_INPUT.format(detalle.telefono_principal)}</span>}
              {detalle.telefono_secundario && <span className="flex items-center gap-1.5"><HiOutlinePhone className="w-4 h-4 opacity-50" /> {TELEFONO_INPUT.format(detalle.telefono_secundario)}</span>}
              {detalle.tbl_usuarios?.correo && <span className="flex items-center gap-1.5"><HiOutlineMail className="w-4 h-4" /> {detalle.tbl_usuarios.correo}</span>}
              {detalle.tbl_usuarios?.ultimo_acceso && <span className="flex items-center gap-1.5"><HiOutlineClock className="w-4 h-4" /> Último acceso: {formatearFechaHora(detalle.tbl_usuarios.ultimo_acceso)}</span>}
            </div>
            <div className="flex gap-2 mt-3">
              <EstadoBadge estado={detalle.tbl_usuarios?.estado_acceso || ESTADO_ACCESO.ACTIVO} />
              {detalle.direcciones?.[0] && (
                <span className="badge border bg-steel-600/30 text-steel-300 border-steel-500/30">
                  <HiOutlineLocationMarker className="w-3 h-3 inline mr-1" />
                  {[detalle.direcciones[0].distrito, detalle.direcciones[0].departamento].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card text-center">
          <HiOutlineCurrencyDollar className="w-7 h-7 mx-auto text-emerald-600 mb-2" />
          <p className="text-2xl font-bold text-steel-100">{formatearMoneda(detalle.total_comprado)}</p>
          <p className="text-xs text-steel-500 mt-1">Total Comprado</p>
        </div>
        <div className="card text-center">
          <HiOutlineShoppingCart className="w-7 h-7 mx-auto text-blue-600 mb-2" />
          <p className="text-2xl font-bold text-steel-100">{detalle.total_ventas}</p>
          <p className="text-xs text-steel-500 mt-1">Compras Realizadas</p>
        </div>
        <div className="card text-center">
          <HiOutlineStar className="w-7 h-7 mx-auto text-amber-600 mb-2" />
          <p className="text-2xl font-bold text-steel-100">{parseFloat(detalle.saldo_puntos || 0).toFixed(0)}</p>
          <p className="text-xs text-steel-500 mt-1">Puntos Acumulados</p>
        </div>
        <div className="card text-center">
          <HiOutlineCalendar className="w-7 h-7 mx-auto text-purple-600 mb-2" />
          <p className="text-2xl font-bold text-steel-100">{formatearFecha(detalle.fecha_hora_registro)}</p>
          <p className="text-xs text-steel-500 mt-1">Cliente Desde</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="card p-0">
        <nav className="flex gap-1 px-4 pt-4 border-b border-steel-700/50">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-brand-400 text-brand-400' : 'border-transparent text-steel-400 hover:text-steel-200'}`}>
              {t.label}
            </button>
          ))}
        </nav>

        <div className="p-4">
          {/* RESUMEN */}
          {tab === 'resumen' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div className="bg-steel-800/30 rounded-lg p-4">
                  <p className="text-steel-500 text-xs mb-1">Nombre Completo</p>
                  <p className="text-steel-100 font-medium">{detalle.nombre}</p>
                </div>
                <div className="bg-steel-800/30 rounded-lg p-4">
                  <p className="text-steel-500 text-xs mb-1">DNI / RUC</p>
                  <p className="text-steel-100 font-medium">{detalle.dni || '-'}</p>
                </div>
                <div className="bg-steel-800/30 rounded-lg p-4">
                  <p className="text-steel-500 text-xs mb-1">Teléfono Principal</p>
                  <p className="text-steel-100 font-medium">{TELEFONO_INPUT.format(detalle.telefono_principal) || '-'}</p>
                </div>
                <div className="bg-steel-800/30 rounded-lg p-4">
                  <p className="text-steel-500 text-xs mb-1">Teléfono Secundario</p>
                  <p className="text-steel-100 font-medium">{TELEFONO_INPUT.format(detalle.telefono_secundario) || '-'}</p>
                </div>
                <div className="bg-steel-800/30 rounded-lg p-4">
                  <p className="text-steel-500 text-xs mb-1">Correo</p>
                  <p className="text-steel-100 font-medium">{detalle.tbl_usuarios?.correo || '-'}</p>
                </div>
                <div className="bg-steel-800/30 rounded-lg p-4">
                  <p className="text-steel-500 text-xs mb-1">Último Acceso</p>
                  <p className="text-steel-100 font-medium">{detalle.tbl_usuarios?.ultimo_acceso ? formatearFechaHora(detalle.tbl_usuarios.ultimo_acceso) : 'Nunca'}</p>
                </div>
              </div>

              {/* Credenciales */}
              {detalle.tarjetas_credenciales?.[0] && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-600 mb-3">Tarjeta de Credenciales</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-steel-400">Usuario:</span> <span className="text-steel-200 font-medium">{detalle.tarjetas_credenciales[0].usuario_generado}</span></div>
                    <div><span className="text-steel-400">Generado:</span> <span className="text-steel-200 font-medium">{formatearFechaHora(detalle.tarjetas_credenciales[0].generado_en)}</span></div>
                  </div>
                </div>
              )}

              {/* Últimas compras */}
              {detalle.ventas?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-steel-200 mb-3">Últimas Compras</h4>
                  <div className="space-y-2">
                    {detalle.ventas.slice(0, 5).map(v => (
                      <div key={v.id} className="flex items-center justify-between p-3 bg-steel-800/30 rounded-lg text-sm">
                        <div className="flex items-center gap-4">
                          <span className="text-steel-400 font-mono">#{v.id}</span>
                          <span className="text-steel-200">{v.items_venta?.length || 0} productos</span>
                          <EstadoBadge estado={v.estado_tracking} />
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-semibold text-steel-100">{formatearMoneda(v.total)}</span>
                          <span className="text-steel-500 text-xs">{formatearFechaHora(v.fecha_hora_registro)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {detalle.ventas.length > 5 && (
                    <button onClick={() => setTab('compras')} className="text-sm text-brand-400 hover:text-brand-300 mt-3">
                      Ver todas las compras ({detalle.total_ventas}) →
                    </button>
                  )}
                </div>
              )}
              {detalle.ventas?.length === 0 && <p className="text-steel-500 text-sm text-center py-6">Sin compras registradas.</p>}
            </div>
          )}

          {/* COMPRAS */}
          {tab === 'compras' && (
            <div className="space-y-4">
              {detalle.ventas?.length === 0 && <p className="text-steel-500 text-sm text-center py-12">Sin compras registradas.</p>}
              {detalle.ventas?.map(v => (
                <div key={v.id} className="bg-steel-800/30 border border-steel-700/30 rounded-lg p-4">
                  <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-mono font-semibold text-steel-200">Venta #{v.id}</span>
                      <EstadoBadge estado={v.estado_tracking} />
                      <EstadoBadge estado={v.estado_venta} />
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-steel-100">{formatearMoneda(v.total)}</p>
                      <p className="text-xs text-steel-500">{formatearFechaHora(v.fecha_hora_registro)}</p>
                    </div>
                  </div>
                  {/* Items */}
                  <div className="space-y-1">
                    {v.items_venta?.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm py-1.5 border-t border-steel-800/50">
                        <span className="text-steel-300">{item.tbl_productos?.nombre || `Producto #${item.product_id}`}</span>
                        <div className="flex items-center gap-6 text-steel-400">
                          <span>Cant: {item.cantidad}</span>
                          <span>{formatearMoneda(item.precio_unitario_vendido)}</span>
                          <span className="font-medium text-steel-200 w-28 text-right">{formatearMoneda(parseFloat(item.precio_unitario_vendido) * item.cantidad)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Pagos */}
                  {v.pagos?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-steel-700/40">
                      <p className="text-xs text-steel-500 mb-1.5">Pagos ({v.pagos.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {v.pagos.map(p => (
                          <span key={p.id} className="text-xs bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded px-2.5 py-1">
                            {formatearMoneda(p.monto)} — {formatearFechaHora(p.fecha_hora)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-steel-700/40 text-sm">
                    <span className="text-steel-400">Pagado: <span className={`font-medium ${v.pago_completo ? 'text-emerald-600' : 'text-amber-600'}`}>{formatearMoneda(v.total_pagado)}</span></span>
                    {!v.pago_completo && <span className="text-red-600">Saldo pendiente: {formatearMoneda(v.saldo_pendiente)}</span>}
                    {v.pago_completo && <span className="text-emerald-600 font-medium">PAGADO COMPLETO</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* DIRECCIONES */}
          {tab === 'direcciones' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {detalle.direcciones?.length === 0 && <p className="text-steel-500 text-sm text-center py-12 col-span-2">Sin direcciones registradas.</p>}
              {detalle.direcciones?.map((dir, i) => (
                <div key={dir.id || i} className="bg-steel-800/30 border border-steel-700/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${dir.tipo_destino === TIPO_DESTINO.LIMA ? 'bg-blue-500/15 text-blue-600' : 'bg-orange-500/15 text-orange-600'}`}>
                      {dir.tipo_destino === TIPO_DESTINO.LIMA ? 'Lima' : 'Provincia'}
                    </span>
                    {dir.nombre_destinatario && <span className="text-xs text-steel-400">Dest: {dir.nombre_destinatario}</span>}
                  </div>
                  <p className="text-sm font-medium text-steel-100">{dir.direccion}</p>
                  <p className="text-sm text-steel-400 mt-1">{[dir.distrito, dir.provincia_nombre, dir.departamento].filter(Boolean).join(', ')}</p>
                  {dir.agencia_shalom_destino && <p className="text-sm text-steel-400 mt-1">Agencia de envío: {dir.agencia_shalom_destino}</p>}
                  {dir.referencia && <p className="text-xs text-steel-500 mt-1">Ref: {dir.referencia}</p>}
                  {dir.telefono_destinatario && <p className="text-sm text-steel-400 mt-1">Tel: {TELEFONO_INPUT.format(dir.telefono_destinatario)}{dir.segundo_numero ? ` / ${TELEFONO_INPUT.format(dir.segundo_numero)}` : ''}</p>}
                  {dir.dni_destinatario && <p className="text-sm text-steel-400">DNI Dest: {dir.dni_destinatario}</p>}
                </div>
              ))}
            </div>
          )}

          {/* PUNTOS */}
          {tab === 'puntos' && (
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-6 text-center">
                <HiOutlineStar className="w-10 h-10 mx-auto text-amber-600 mb-3" />
                <p className="text-3xl font-bold text-steel-100">{parseFloat(detalle.saldo_puntos || 0).toFixed(2)}</p>
                <p className="text-sm text-steel-400 mt-1">Saldo de Puntos Actual</p>
              </div>
              {detalle.movimientos_puntos?.length === 0 && <p className="text-steel-500 text-sm text-center py-6">Sin movimientos de puntos.</p>}
              {detalle.movimientos_puntos?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-steel-200 mb-3">Historial de Movimientos</h4>
                  <div className="space-y-1.5">
                    {detalle.movimientos_puntos.map(m => (
                      <div key={m.id} className="flex items-center justify-between py-2.5 px-4 bg-steel-800/30 rounded-lg text-sm">
                        <div className="flex items-center gap-3">
                          <span className={`font-semibold ${m.tipo === 'ganado' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {m.tipo === 'ganado' ? '+' : '-'}{parseFloat(m.puntos).toFixed(2)}
                          </span>
                          <span className="text-steel-300 capitalize">{m.tipo?.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          {m.sale_order_id && <span className="text-steel-500">Venta #{m.sale_order_id}</span>}
                          <span className="text-steel-500">{formatearFechaHora(m.fecha_hora)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* COTIZACIONES */}
          {tab === 'cotizaciones' && (
            <div className="space-y-4">
              {detalle.cotizaciones_web?.length === 0 && <p className="text-steel-500 text-sm text-center py-12">Sin cotizaciones registradas.</p>}
              {detalle.cotizaciones_web?.map(cot => (
                <div key={cot.id} className="bg-steel-800/30 border border-steel-700/30 rounded-lg p-4">
                  <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-mono font-semibold text-steel-200">Cotización #{cot.id}</span>
                      <EstadoBadge estado={cot.estado} />
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-steel-100">{formatearMoneda(cot.total)}</p>
                      <p className="text-xs text-steel-500">{formatearFechaHora(cot.fecha_hora)}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {cot.items?.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm py-1.5 border-t border-steel-800/50">
                        <span className="text-steel-300">{item.tbl_productos?.nombre || `Producto #${item.product_id}`}</span>
                        <div className="flex items-center gap-6 text-steel-400">
                          <span>Cant: {item.cantidad}</span>
                          <span>{formatearMoneda(item.precio_unitario)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ModalEditarCliente
        abierto={modalEditar}
        cerrar={() => setModalEditar(false)}
        cliente={detalle}
        onGuardado={() => cargarDetalle()}
      />
    </div>
  );
}
