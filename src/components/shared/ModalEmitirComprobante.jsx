import { useState, useEffect } from 'react';
import { comprobantesService, configFacturacionService } from '../../services/comprobantesService';
import {
  TIPO_COMPROBANTE, TIPO_DOCUMENTO_CLIENTE, TIPO_IGV, CONDICION_PAGO_COMPROBANTE,
  TIPO_COMPROBANTE_LABEL, TIPO_DOCUMENTO_CLIENTE_LABEL, MONEDA, FORMATO_PDF,
  METODOS_PAGO, METODOS_PAGO_LABEL,
} from '../../config/constants';
import toast from 'react-hot-toast';
import { HiOutlineX, HiOutlineExclamationCircle } from 'react-icons/hi';

// Mapping para texto descriptivo en observaciones de comprobantes (ej: "en efectivo", "en transferencia")
const METODO_PAGO_OBSERVACION = Object.fromEntries(
  Object.entries(METODOS_PAGO_LABEL).map(([key, label]) => [key, `en ${label.toLowerCase()}`])
);

function generarObservacionesPagos(pagos) {
  if (!pagos || pagos.length === 0) return '';
  return pagos.map((p, i) => {
    const monto = `S/. ${parseFloat(p.monto).toFixed(2)}`;
    const metodo = METODO_PAGO_OBSERVACION[p.metodo_pago] || (p.metodo_pago ? `en ${p.metodo_pago}` : '');
    const fechaObj = new Date(p.fecha_hora);
    const fecha = fechaObj.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const hora = fechaObj.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `-Pago ${i + 1}: ${monto} ${metodo}    ${fecha} ${hora}`;
  }).join('\n');
}

export default function ModalEmitirComprobante({ venta, comprobantesExistentes = [], onClose, onSuccess }) {
  // Cálculo de facturación acumulada
  const totalVenta = parseFloat(venta?.total || 0);
  const facturadoBruto = comprobantesExistentes
    .filter(c => !c.anulado && (c.tipo_comprobante === TIPO_COMPROBANTE.FACTURA || c.tipo_comprobante === TIPO_COMPROBANTE.BOLETA))
    .reduce((sum, c) => sum + parseFloat(c.total), 0);
  const totalNotasCredito = comprobantesExistentes
    .filter(c => !c.anulado && c.tipo_comprobante === TIPO_COMPROBANTE.NOTA_CREDITO)
    .reduce((sum, c) => sum + parseFloat(c.total), 0);
  const totalFacturado = facturadoBruto - totalNotasCredito;
  const pendienteFacturar = Math.max(totalVenta - totalFacturado, 0);
  const esAdelanto = !venta?.pago_completo;
  const montoDefault = pendienteFacturar;

  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    tipo_comprobante: '',
    serie_id: '',
    condicion_pago: CONDICION_PAGO_COMPROBANTE.CONTADO,
    tipo_igv_default: TIPO_IGV.GRAVADO,
    moneda: MONEDA.PEN,
    observaciones: generarObservacionesPagos(venta?.pagos),
    monto_comprobante: montoDefault.toFixed(2),
  });

  const cliente = venta?.tbl_clientes;

  useEffect(() => {
    configFacturacionService.listarSeries().then(({ data }) => {
      setSeries(data.filter(s => s.activa));
    }).catch(() => {});

    if (cliente) {
      const tipoDoc = cliente.tipo_documento || TIPO_DOCUMENTO_CLIENTE.DNI;
      const esRuc = tipoDoc === TIPO_DOCUMENTO_CLIENTE.RUC || (cliente.ruc && cliente.ruc.length === 11);
      setForm(prev => ({
        ...prev,
        tipo_comprobante: esRuc ? TIPO_COMPROBANTE.FACTURA : TIPO_COMPROBANTE.BOLETA,
      }));
    }
  }, [cliente]);

  const seriesFiltradas = series.filter(s =>
    s.tipo_comprobante === form.tipo_comprobante
  );

  useEffect(() => {
    if (seriesFiltradas.length === 1 && form.serie_id !== seriesFiltradas[0].id) {
      setForm(prev => ({ ...prev, serie_id: seriesFiltradas[0].id }));
    }
  }, [form.tipo_comprobante, seriesFiltradas]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.tipo_comprobante || !form.serie_id) {
      toast.error('Seleccione tipo y serie');
      return;
    }

    const montoComp = parseFloat(form.monto_comprobante);
    if (!montoComp || montoComp <= 0) {
      toast.error('El monto del comprobante debe ser mayor a 0');
      return;
    }
    if (montoComp > pendienteFacturar + 0.01) {
      toast.error(`El monto excede el pendiente por facturar (S/ ${pendienteFacturar.toFixed(2)})`);
      return;
    }

    setLoading(true);
    try {
      await comprobantesService.emitir({
        sale_order_id: venta.id,
        tipo_comprobante: form.tipo_comprobante,
        serie_id: parseInt(form.serie_id),
        condicion_pago: form.condicion_pago,
        tipo_igv_default: form.tipo_igv_default,
        moneda: form.moneda,
        observaciones: form.observaciones || undefined,
        monto_comprobante: montoComp,
      });
      toast.success('Comprobante emitido exitosamente');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al emitir comprobante');
    }
    setLoading(false);
  };

  const itemsVenta = venta?.items_venta?.filter(i => !i.es_regalo) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-steel-800 rounded-lg border border-steel-600 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-steel-100">Emitir Comprobante Electrónico</h2>
          <button onClick={onClose} className="text-steel-400 hover:text-steel-200"><HiOutlineX className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de comprobante */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-steel-300 tracking-wide uppercase block mb-1">Tipo de comprobante</label>
              <select className="input-field" value={form.tipo_comprobante} onChange={e => setForm(prev => ({ ...prev, tipo_comprobante: e.target.value, serie_id: '' }))}>
                <option value="">Seleccionar...</option>
                <option value={TIPO_COMPROBANTE.FACTURA}>{TIPO_COMPROBANTE_LABEL[TIPO_COMPROBANTE.FACTURA]}</option>
                <option value={TIPO_COMPROBANTE.BOLETA}>{TIPO_COMPROBANTE_LABEL[TIPO_COMPROBANTE.BOLETA]}</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-steel-300 tracking-wide uppercase block mb-1">Serie</label>
              <select className="input-field" value={form.serie_id} onChange={e => setForm(prev => ({ ...prev, serie_id: e.target.value }))}>
                <option value="">Seleccionar...</option>
                {seriesFiltradas.map(s => (
                  <option key={s.id} value={s.id}>{s.serie} (Correlativo: {s.correlativo_actual})</option>
                ))}
              </select>
              {seriesFiltradas.length === 0 && form.tipo_comprobante && (
                <p className="text-xs text-red-400 mt-1">No hay series activas para este tipo</p>
              )}
            </div>
          </div>

          {/* Datos del cliente */}
          <div className="bg-steel-900/50 rounded p-3 border border-steel-700/30">
            <p className="text-xs font-semibold text-steel-300 mb-2">Datos del cliente</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-steel-500">Nombre: </span>
                <span className="text-steel-200">{cliente?.nombre || '-'}</span>
              </div>
              <div>
                <span className="text-steel-500">Tipo doc.: </span>
                <span className="text-steel-200">{TIPO_DOCUMENTO_CLIENTE_LABEL[cliente?.tipo_documento] || 'DNI'}</span>
              </div>
              <div>
                <span className="text-steel-500">DNI: </span>
                <span className="text-steel-200">{cliente?.dni || '-'}</span>
              </div>
              <div>
                <span className="text-steel-500">RUC: </span>
                <span className="text-steel-200">{cliente?.ruc || '-'}</span>
              </div>
            </div>
          </div>

          {/* Estado de facturación */}
          <div className="bg-steel-900/50 rounded p-3 border border-steel-700/30">
            <p className="text-xs font-semibold text-steel-300 mb-2">Estado de facturación</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-steel-800/50 rounded p-2 text-center">
                <span className="text-steel-500 block">Total venta</span>
                <span className="text-steel-100 font-semibold">S/ {totalVenta.toFixed(2)}</span>
              </div>
              <div className="bg-steel-800/50 rounded p-2 text-center">
                <span className="text-steel-500 block">Ya facturado</span>
                <span className={`font-semibold ${totalFacturado > 0 ? 'text-green-400' : 'text-steel-400'}`}>S/ {totalFacturado.toFixed(2)}</span>
              </div>
              <div className="bg-steel-800/50 rounded p-2 text-center">
                <span className="text-steel-500 block">Pendiente</span>
                <span className={`font-semibold ${pendienteFacturar > 0 ? 'text-amber-400' : 'text-green-400'}`}>S/ {pendienteFacturar.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Monto del comprobante */}
          <div>
            <label className="text-xs font-semibold text-steel-300 tracking-wide uppercase block mb-1">Monto del comprobante</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400 text-sm">S/</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={pendienteFacturar > 0 ? pendienteFacturar : totalVenta}
                  className="input-field pl-9"
                  value={form.monto_comprobante}
                  onChange={e => setForm(prev => ({ ...prev, monto_comprobante: e.target.value }))}
                />
              </div>
              {pendienteFacturar > 0 && parseFloat(form.monto_comprobante) !== pendienteFacturar && (
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, monto_comprobante: pendienteFacturar.toFixed(2) }))}
                  className="text-xs text-primary-400 hover:text-primary-300 whitespace-nowrap"
                >
                  Usar pendiente
                </button>
              )}
            </div>
            {parseFloat(form.monto_comprobante) < totalVenta && parseFloat(form.monto_comprobante) > 0 && (
              <p className="text-xs text-steel-400 mt-1">
                Se emitirá un comprobante parcial. Quedarán S/ {(pendienteFacturar - parseFloat(form.monto_comprobante || 0)).toFixed(2)} por facturar después de este comprobante.
              </p>
            )}
          </div>

          {/* Alerta de adelanto */}
          {esAdelanto && (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <HiOutlineExclamationCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-300">
                <p className="font-semibold mb-0.5">Comprobante de adelanto</p>
                <p className="text-amber-400/80">La venta aún no ha sido pagada completamente. Este comprobante se emitirá solo como adelanto del monto indicado.</p>
              </div>
            </div>
          )}

          {/* Items */}
          <div>
            <p className="text-xs font-semibold text-steel-300 mb-2">Items de la venta ({itemsVenta.length})</p>
            <div className="max-h-40 overflow-y-auto border border-steel-700/30 rounded">
              <table className="w-full text-xs">
                <thead className="bg-steel-900/80">
                  <tr>
                    <th className="text-left px-2 py-1 text-steel-400">Producto</th>
                    <th className="text-right px-2 py-1 text-steel-400">Cant.</th>
                    <th className="text-right px-2 py-1 text-steel-400">P. Unit.</th>
                    <th className="text-right px-2 py-1 text-steel-400">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsVenta.map((item, i) => (
                    <tr key={i} className="border-t border-steel-800">
                      <td className="px-2 py-1 text-steel-200">{item.tbl_productos?.nombre || `Producto #${item.product_id}`}</td>
                      <td className="px-2 py-1 text-right text-steel-300">{item.cantidad}</td>
                      <td className="px-2 py-1 text-right text-steel-300">S/ {parseFloat(item.precio_unitario_vendido).toFixed(2)}</td>
                      <td className="px-2 py-1 text-right text-steel-200">S/ {(item.cantidad * parseFloat(item.precio_unitario_vendido)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-right mt-1 text-sm text-steel-200 flex justify-end gap-4">
              <span className="text-steel-400">Total venta: S/ {totalVenta.toFixed(2)}</span>
              <span className="font-semibold">Comprobante: S/ {parseFloat(form.monto_comprobante || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Opciones */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-steel-300 tracking-wide uppercase block mb-1">Condición pago</label>
              <select className="input-field" value={form.condicion_pago} onChange={e => setForm(prev => ({ ...prev, condicion_pago: e.target.value }))}>
                <option value={CONDICION_PAGO_COMPROBANTE.CONTADO}>Contado</option>
                <option value={CONDICION_PAGO_COMPROBANTE.CREDITO}>Crédito</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-steel-300 tracking-wide uppercase block mb-1">Tipo IGV</label>
              <select className="input-field" value={form.tipo_igv_default} onChange={e => setForm(prev => ({ ...prev, tipo_igv_default: e.target.value }))}>
                <option value={TIPO_IGV.GRAVADO}>Gravado (18%)</option>
                <option value={TIPO_IGV.EXONERADO}>Exonerado</option>
                <option value={TIPO_IGV.INAFECTO}>Inafecto</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-steel-300 tracking-wide uppercase block mb-1">Moneda</label>
              <select className="input-field" value={form.moneda} onChange={e => setForm(prev => ({ ...prev, moneda: e.target.value }))}>
                {Object.entries(MONEDA).map(([k, v]) => <option key={k} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-steel-300 tracking-wide uppercase block mb-1">Observaciones (opcional)</label>
            <textarea className="input-field resize-y" rows={Math.max(3, (form.observaciones?.split('\n')?.length || 0) + 1)} value={form.observaciones} onChange={e => setForm(prev => ({ ...prev, observaciones: e.target.value }))} placeholder="Observaciones adicionales..." />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Emitiendo...' : 'Emitir Comprobante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
