import { useEffect, useMemo, useState } from 'react';
import {
  HiOutlineTruck,
  HiOutlineShoppingCart,
  HiOutlineRefresh,
  HiOutlineX,
  HiOutlineCheckCircle,
  HiOutlineExclamation,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatearFecha } from '../../utils/formato';
import { MSG_COMPRA_NACIONAL_UI } from '../../config/constants';

/**
 * Pantalla del chofer: ver compras nacionales disponibles y tomar unidades
 * para completar sus pedidos incompletos.
 * Endpoint: GET /compras/chofer/compras-nacionales-disponibles
 */
export default function CompraNacional() {
  const [compras, setCompras] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(false);

  const [modalToma, setModalToma] = useState(false);
  const [compraSel, setCompraSel] = useState(null);
  // Filas de toma editable: array de { item_compra_id, product_id, producto_nombre,
  //   pendiente, venta_id, item_venta_id, cantidad }
  const [tomas, setTomas] = useState([]);
  const [enviando, setEnviando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const [c, p] = await Promise.all([
        api.get('/compras/chofer/compras-nacionales-disponibles'),
        api.get('/compras/chofer/pedidos-incompletos'),
      ]);
      setCompras(c.data?.compras || []);
      setPedidos(p.data?.pedidos || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cargar compras disponibles');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const abrirToma = (compra) => {
    setCompraSel(compra);
    // Prefilar una toma vacía por cada item relevante
    const filas = [];
    for (const it of compra.items_relevantes) {
      filas.push({
        uid: `${it.item_compra_id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        item_compra_id: it.item_compra_id,
        product_id: it.product_id,
        producto_nombre: it.producto_nombre,
        pendiente: it.cantidad_pendiente_ingreso,
        ventas_compatibles: it.ventas_compatibles,
        venta_id: '',
        item_venta_id: '',
        cantidad: 0,
      });
    }
    setTomas(filas);
    setModalToma(true);
  };

  const actualizarToma = (uid, campo, valor) => {
    setTomas((prev) =>
      prev.map((t) => {
        if (t.uid !== uid) return t;
        const nueva = { ...t, [campo]: valor };
        if (campo === 'venta_id') nueva.item_venta_id = '';
        return nueva;
      }),
    );
  };

  const itemsVentaDisponibles = (fila) => {
    if (!fila.venta_id) return [];
    const venta = fila.ventas_compatibles.find((v) => String(v.venta_id) === String(fila.venta_id));
    return venta?.items_faltantes || [];
  };

  const maxCantidadFila = (fila) => {
    if (!fila.item_venta_id) return fila.pendiente;
    const items = itemsVentaDisponibles(fila);
    const iv = items.find((x) => String(x.item_venta_id) === String(fila.item_venta_id));
    if (!iv) return fila.pendiente;
    return Math.min(fila.pendiente, iv.cantidad_faltante);
  };

  const resumen = useMemo(() => {
    const totalUnidades = tomas.reduce((s, t) => s + (parseInt(t.cantidad) || 0), 0);
    const filasValidas = tomas.filter((t) => parseInt(t.cantidad) > 0 && t.venta_id && t.item_venta_id);
    return { totalUnidades, filasValidas: filasValidas.length };
  }, [tomas]);

  const confirmarToma = async () => {
    const filasActivas = tomas.filter((t) => parseInt(t.cantidad) > 0);
    if (filasActivas.length === 0) {
      toast.error(MSG_COMPRA_NACIONAL_UI.CANTIDAD_INVALIDA);
      return;
    }
    for (const fila of filasActivas) {
      if (!fila.venta_id) {
        toast.error(MSG_COMPRA_NACIONAL_UI.SELECCIONE_VENTA);
        return;
      }
      if (!fila.item_venta_id) {
        toast.error(MSG_COMPRA_NACIONAL_UI.SELECCIONE_ITEM_VENTA);
        return;
      }
      if (parseInt(fila.cantidad) > maxCantidadFila(fila)) {
        toast.error(`Cantidad excede el máximo permitido para ${fila.producto_nombre}`);
        return;
      }
    }

    const payload = {
      tomas: filasActivas.map((f) => ({
        item_compra_id: f.item_compra_id,
        venta_id: parseInt(f.venta_id),
        item_venta_id: parseInt(f.item_venta_id),
        cantidad: parseInt(f.cantidad),
        unidades: Array.from({ length: parseInt(f.cantidad) }, () => ({
          serial: null,
          codigo_barras: null,
        })),
      })),
    };

    setEnviando(true);
    try {
      const { data } = await api.post(
        `/compras/chofer/compras/${compraSel.id}/tomar-unidades`,
        payload,
      );
      toast.success(MSG_COMPRA_NACIONAL_UI.TOAST_EXITO_TOMA(data.unidades_creadas || 0));
      setModalToma(false);
      await cargar();
    } catch (err) {
      toast.error(err.response?.data?.error || MSG_COMPRA_NACIONAL_UI.ERROR_GENERICO_TOMA);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <div>
          <h1 className="text-2xl font-bold text-steel-100 font-display tracking-wider">
            Compras nacionales disponibles
          </h1>
          <p className="text-sm text-steel-400 mt-1">
            Toma unidades de compras nacionales para completar tus pedidos asignados.
          </p>
        </div>
        <button onClick={cargar} className="btn-secondary flex items-center gap-2 text-sm">
          <HiOutlineRefresh className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {/* Resumen de pedidos incompletos */}
      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-3">
          <HiOutlineShoppingCart className="w-5 h-5 text-primary-500" />
          <h2 className="font-display text-lg tracking-wider text-steel-100">Mis pedidos por completar</h2>
        </div>
        {pedidos.length === 0 ? (
          <p className="text-sm text-steel-400">{MSG_COMPRA_NACIONAL_UI.SIN_PEDIDOS_INCOMPLETOS}</p>
        ) : (
          <div className="space-y-2">
            {pedidos.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-steel-900/40 border border-steel-700/50 rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium text-steel-100">Venta #{p.id} — {p.cliente}</p>
                  <p className="text-xs text-steel-400 mt-0.5">
                    {p.items_faltantes.map((f) => `${f.producto_nombre} (falta ${f.cantidad_faltante})`).join(', ')}
                  </p>
                </div>
                <span className="text-xs bg-red-500/15 text-red-400 px-2 py-1 rounded font-medium">
                  {p.total_asignado}/{p.total_requerido} asignadas
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Listado de compras disponibles */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <HiOutlineTruck className="w-5 h-5 text-orange-500" />
          <h2 className="font-display text-lg tracking-wider text-steel-100">Compras disponibles para tomar</h2>
        </div>
        {cargando ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : compras.length === 0 ? (
          <p className="text-sm text-steel-400 py-4">{MSG_COMPRA_NACIONAL_UI.SIN_COMPRAS_DISPONIBLES}</p>
        ) : (
          <div className="space-y-3">
            {compras.map((c) => (
              <div key={c.id} className="border border-steel-700 rounded-lg bg-steel-900/30 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-steel-700/50">
                  <div>
                    <p className="text-sm font-semibold text-steel-100">Compra #{c.id} — {c.proveedor}</p>
                    <p className="text-xs text-steel-400 mt-0.5">{formatearFecha(c.fecha_compra)}</p>
                  </div>
                  <button onClick={() => abrirToma(c)} className="btn-primary text-xs flex items-center gap-1">
                    <HiOutlineCheckCircle className="w-3.5 h-3.5" /> Tomar unidades
                  </button>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {c.items_relevantes.map((it) => (
                    <div key={it.item_compra_id} className="text-xs text-steel-300 flex items-center justify-between">
                      <span>
                        {it.producto_nombre}
                        <span className="text-steel-500 ml-2">
                          · disponibles para toma: {it.cantidad_pendiente_ingreso}/{it.cantidad_total}
                        </span>
                      </span>
                      <span className="text-orange-400 font-medium">
                        {it.ventas_compatibles.length} venta(s) compatibles
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de toma */}
      <Modal abierto={modalToma} cerrar={() => !enviando && setModalToma(false)}
        titulo={`Tomar unidades — Compra #${compraSel?.id || ''}`} ancho="max-w-3xl"
        bloquearCierre={enviando}>
        {compraSel && (
          <div className="space-y-4">
            <div className="bg-primary-600 border border-primary-700 rounded-lg p-3 flex items-start gap-2">
              <HiOutlineExclamation className="w-5 h-5 text-white shrink-0 mt-0.5" />
              <div className="text-xs text-white font-semibold leading-relaxed">
                Selecciona cuántas unidades tomas de cada producto y a qué venta las asignas.
                Los seriales se auto-generan si no los ingresas manualmente.
              </div>
            </div>

            <div className="space-y-3">
              {tomas.map((fila) => {
                const itemsVenta = itemsVentaDisponibles(fila);
                const maxCant = maxCantidadFila(fila);
                return (
                  <div key={fila.uid} className="border border-steel-700 rounded-lg p-3 space-y-2 bg-steel-900/40">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-steel-100">{fila.producto_nombre}</span>
                      <span className="text-xs text-steel-500">Pendiente en compra: {fila.pendiente}</span>
                    </div>
                    <div className="grid grid-cols-[1fr_1fr_6rem] gap-2">
                      <select className="input-field text-xs" value={fila.venta_id}
                        onChange={(e) => actualizarToma(fila.uid, 'venta_id', e.target.value)}>
                        <option value="">-- Venta --</option>
                        {fila.ventas_compatibles.map((v) => (
                          <option key={v.venta_id} value={v.venta_id}>
                            Venta #{v.venta_id} — {v.cliente}
                          </option>
                        ))}
                      </select>
                      <select className="input-field text-xs" value={fila.item_venta_id}
                        onChange={(e) => actualizarToma(fila.uid, 'item_venta_id', e.target.value)}
                        disabled={!fila.venta_id}>
                        <option value="">-- Ítem de venta --</option>
                        {itemsVenta.map((iv) => (
                          <option key={iv.item_venta_id} value={iv.item_venta_id}>
                            {iv.producto_nombre} (falta {iv.cantidad_faltante})
                          </option>
                        ))}
                      </select>
                      <input type="number" min="0" max={maxCant} className="input-field text-xs"
                        value={fila.cantidad}
                        onChange={(e) => actualizarToma(fila.uid, 'cantidad', e.target.value)} />
                    </div>
                    {parseInt(fila.cantidad) > maxCant && (
                      <p className="text-xs text-red-400">Máximo permitido: {maxCant}</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="border-t border-steel-700 pt-3 flex items-center justify-between text-sm">
              <span className="text-steel-400">
                Total: <span className="text-steel-100 font-medium">{resumen.totalUnidades}</span> unidad(es)
                en <span className="text-steel-100 font-medium">{resumen.filasValidas}</span> asignación(es)
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModalToma(false)} className="btn-secondary" disabled={enviando}>
                <HiOutlineX className="w-4 h-4 inline-block mr-1" /> Cancelar
              </button>
              <button type="button" onClick={confirmarToma} className="btn-primary flex items-center gap-2"
                disabled={enviando || resumen.totalUnidades === 0}>
                {enviando ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Procesando...</>
                ) : (
                  <><HiOutlineCheckCircle className="w-4 h-4" /> {MSG_COMPRA_NACIONAL_UI.CONFIRMAR_TOMA}</>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
