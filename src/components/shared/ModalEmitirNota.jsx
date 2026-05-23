import { useState, useEffect } from 'react';
import { comprobantesService, configFacturacionService } from '../../services/comprobantesService';
import {
  TIPO_COMPROBANTE, TIPO_NOTA_CREDITO, TIPO_NOTA_DEBITO,
  TIPO_COMPROBANTE_LABEL,
} from '../../config/constants';
import toast from 'react-hot-toast';
import { HiOutlineX } from 'react-icons/hi';

const OPCIONES_NC = [
  { value: TIPO_NOTA_CREDITO.ANULACION_OPERACION, label: 'Anulación de la operación' },
  { value: TIPO_NOTA_CREDITO.ANULACION_ERROR_RUC, label: 'Anulación por error en el RUC' },
  { value: TIPO_NOTA_CREDITO.CORRECCION_DESCRIPCION, label: 'Corrección por error en la descripción' },
  { value: TIPO_NOTA_CREDITO.DESCUENTO_GLOBAL, label: 'Descuento global' },
  { value: TIPO_NOTA_CREDITO.DEVOLUCION_TOTAL, label: 'Devolución total' },
  { value: TIPO_NOTA_CREDITO.DEVOLUCION_POR_ITEM, label: 'Devolución por ítem' },
  { value: TIPO_NOTA_CREDITO.BONIFICACION, label: 'Bonificación' },
  { value: TIPO_NOTA_CREDITO.DISMINUCION_VALOR, label: 'Disminución en el valor' },
  { value: TIPO_NOTA_CREDITO.OTROS, label: 'Otros conceptos' },
];

const OPCIONES_ND = [
  { value: TIPO_NOTA_DEBITO.INTERESES_MORA, label: 'Intereses por mora' },
  { value: TIPO_NOTA_DEBITO.AUMENTO_VALOR, label: 'Aumento en el valor' },
  { value: TIPO_NOTA_DEBITO.OTROS, label: 'Otros conceptos' },
];

export default function ModalEmitirNota({ comprobanteRef, onClose, onSuccess }) {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    tipo_comprobante: TIPO_COMPROBANTE.NOTA_CREDITO,
    serie_id: '',
    nota_tipo: '',
    motivo: '',
  });

  useEffect(() => {
    configFacturacionService.listarSeries().then(({ data }) => {
      setSeries(data.filter(s => s.activa));
    }).catch(() => {});
  }, []);

  const seriesFiltradas = series.filter(s =>
    s.tipo_comprobante === form.tipo_comprobante
  );

  useEffect(() => {
    if (seriesFiltradas.length === 1 && form.serie_id !== seriesFiltradas[0].id) {
      setForm(prev => ({ ...prev, serie_id: seriesFiltradas[0].id }));
    }
  }, [form.tipo_comprobante, seriesFiltradas]);

  const opcionesNota = form.tipo_comprobante === TIPO_COMPROBANTE.NOTA_CREDITO ? OPCIONES_NC : OPCIONES_ND;
  const refNumero = `${comprobanteRef.serie}-${String(comprobanteRef.numero).padStart(8, '0')}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.serie_id || !form.nota_tipo || !form.motivo.trim()) {
      toast.error('Complete todos los campos obligatorios');
      return;
    }

    setLoading(true);
    try {
      await comprobantesService.emitirNota({
        comprobante_ref_id: comprobanteRef.id,
        tipo_comprobante: form.tipo_comprobante,
        serie_id: parseInt(form.serie_id),
        nota_tipo: form.nota_tipo,
        motivo: form.motivo,
      });
      toast.success('Nota emitida exitosamente');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al emitir nota');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-steel-800 rounded-lg border border-steel-600 w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-steel-100">Emitir Nota</h2>
          <button onClick={onClose} className="text-steel-400 hover:text-steel-200"><HiOutlineX className="w-5 h-5" /></button>
        </div>

        <div className="bg-steel-900/50 rounded p-3 border border-steel-700/30 mb-4">
          <p className="text-xs text-steel-400">Comprobante de referencia:</p>
          <p className="text-sm font-medium text-steel-200">
            {TIPO_COMPROBANTE_LABEL[comprobanteRef.tipo_comprobante]} {refNumero}
          </p>
          <p className="text-xs text-steel-400">{comprobanteRef.cliente_nombre} | S/ {parseFloat(comprobanteRef.total).toFixed(2)}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-steel-300 tracking-wide uppercase block mb-1">Tipo de nota</label>
              <select className="input-field" value={form.tipo_comprobante}
                onChange={e => setForm(prev => ({ ...prev, tipo_comprobante: e.target.value, nota_tipo: '', serie_id: '' }))}>
                <option value={TIPO_COMPROBANTE.NOTA_CREDITO}>Nota de Crédito</option>
                <option value={TIPO_COMPROBANTE.NOTA_DEBITO}>Nota de Débito</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-steel-300 tracking-wide uppercase block mb-1">Serie</label>
              <select className="input-field" value={form.serie_id} onChange={e => setForm(prev => ({ ...prev, serie_id: e.target.value }))}>
                <option value="">Seleccionar...</option>
                {seriesFiltradas.map(s => (
                  <option key={s.id} value={s.id}>{s.serie}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-steel-300 tracking-wide uppercase block mb-1">Motivo (tipo)</label>
            <select className="input-field" value={form.nota_tipo} onChange={e => setForm(prev => ({ ...prev, nota_tipo: e.target.value }))}>
              <option value="">Seleccionar motivo...</option>
              {opcionesNota.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-steel-300 tracking-wide uppercase block mb-1">Descripción del motivo</label>
            <textarea className="input-field" rows={2} value={form.motivo} onChange={e => setForm(prev => ({ ...prev, motivo: e.target.value }))}
              placeholder="Describa el motivo de la nota..." />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Emitiendo...' : 'Emitir Nota'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
