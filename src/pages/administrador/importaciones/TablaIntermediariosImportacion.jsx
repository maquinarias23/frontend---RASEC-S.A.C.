import { useState, useMemo, useEffect } from 'react';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineCog } from 'react-icons/hi';
import ModalIntermediarios from './ModalIntermediarios';
import api from '../../../api/axios';

const gastoVacio = { intermediario_id: '', factura: '', fecha_factura: '', precio_usd: '', precio_soles: '', total_soles: '', fecha_detracciones: '' };

export default function TablaIntermediariosImportacion({ gastos, onGastosChange, tipoCambio, onTipoCambioChange }) {
  const [intermediarios, setIntermediarios] = useState([]);
  const [modalIntermed, setModalIntermed] = useState(false);

  const cargarIntermediarios = async () => {
    try {
      const { data } = await api.get('/intermediarios');
      setIntermediarios(data);
    } catch { setIntermediarios([]); }
  };

  useEffect(() => { cargarIntermediarios(); }, []);

  const actualizarGasto = (idx, campo, valor) => {
    const nuevos = [...gastos];
    nuevos[idx] = { ...nuevos[idx], [campo]: valor };
    // Auto-calc total_soles = precio_usd * TC
    if (campo === 'precio_usd') {
      const tc = parseFloat(tipoCambio) || 0;
      nuevos[idx].total_soles = ((parseFloat(valor) || 0) * tc).toFixed(2);
    }
    onGastosChange(nuevos);
  };

  const agregarGasto = () => onGastosChange([...gastos, { ...gastoVacio }]);
  const eliminarGasto = (idx) => onGastosChange(gastos.filter((_, i) => i !== idx));

  const totalOtrosGastos = useMemo(() => {
    return gastos.reduce((sum, g) => sum + (parseFloat(g.total_soles) || 0), 0);
  }, [gastos]);

  const fmt = (v) => {
    const n = parseFloat(v);
    return isNaN(n) || n === 0 ? '-' : n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const inputClass = "bg-transparent border-0 w-full text-sm text-steel-100 focus:outline-none focus:ring-1 focus:ring-steel-500/50 px-2 py-1.5";

  return (
    <div>
      <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <h3 className="text-sm font-semibold text-steel-200">Intermediarios Logisticos</h3>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setModalIntermed(true)}
            className="text-xs text-steel-400 hover:text-steel-200 flex items-center gap-1">
            <HiOutlineCog className="w-3 h-3" /> Gestionar
          </button>
          <div className="flex items-center gap-1">
            <label className="text-xs text-steel-400 whitespace-nowrap">T.C.:</label>
            <input
              type="number"
              step="0.0001"
              className="bg-steel-800 border border-steel-600 rounded text-xs text-steel-100 px-2 py-0.5 w-20 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
              value={tipoCambio || ''}
              onChange={e => onTipoCambioChange(e.target.value)}
              placeholder="0.0000"
            />
          </div>
          <button type="button" onClick={agregarGasto}
            className="text-xs text-primary-500 hover:text-primary-400 font-medium flex items-center gap-1">
            <HiOutlinePlus className="w-3 h-3" /> Agregar factura
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-steel-600 rounded-lg bg-steel-800/30">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-steel-800/50 border-b border-steel-600">
              {['Intermediario', 'Factura', 'Fecha Fact.', 'Precio $', 'Precio S/', 'Total S/', 'Detracciones', ''].map(h => (
                <th key={h} className="text-left py-2 px-2 font-semibold text-steel-400 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gastos.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-4 text-steel-500 text-xs">Sin gastos registrados</td></tr>
            ) : gastos.map((g, idx) => (
              <tr key={idx} className="border-b border-steel-700/50 hover:bg-steel-900/20">
                <td className="px-1">
                  <select className={`${inputClass} min-w-[160px]`} value={g.intermediario_id || ''} onChange={e => actualizarGasto(idx, 'intermediario_id', parseInt(e.target.value) || '')}>
                    <option value="">Seleccionar...</option>
                    {intermediarios.map(i => <option key={i.id} value={i.id}>{i.nombre} ({i.codigo})</option>)}
                  </select>
                </td>
                <td className="px-1"><input type="text" className={inputClass} value={g.factura || ''} onChange={e => actualizarGasto(idx, 'factura', e.target.value)} placeholder="F001-..." style={{width:'90px'}} /></td>
                <td className="px-1"><input type="date" className={`${inputClass}`} value={g.fecha_factura || ''} onChange={e => actualizarGasto(idx, 'fecha_factura', e.target.value)} style={{width:'120px'}} /></td>
                <td className="px-1"><input type="number" step="0.01" className={`${inputClass} text-right`} value={g.precio_usd || ''} onChange={e => actualizarGasto(idx, 'precio_usd', e.target.value)} style={{width:'80px'}} /></td>
                <td className="px-1"><input type="number" step="0.01" className={`${inputClass} text-right`} value={g.precio_soles || ''} onChange={e => actualizarGasto(idx, 'precio_soles', e.target.value)} style={{width:'80px'}} /></td>
                <td className="px-2 py-1.5 text-right text-sm text-black font-bold">{fmt(g.total_soles)}</td>
                <td className="px-1"><input type="date" className={inputClass} value={g.fecha_detracciones || ''} onChange={e => actualizarGasto(idx, 'fecha_detracciones', e.target.value)} style={{width:'120px'}} /></td>
                <td className="text-center">
                  <button type="button" onClick={() => eliminarGasto(idx)} className="text-red-600/60 hover:text-red-400 p-1">
                    <HiOutlineTrash className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-steel-800/50 border-t border-steel-600">
              <td colSpan={5} className="text-right py-2 px-2 text-xs font-semibold text-steel-300">Total Otros Gastos S/:</td>
              <td className="text-right py-2 px-2 text-sm font-bold text-black">{fmt(totalOtrosGastos)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      <ModalIntermediarios abierto={modalIntermed} cerrar={() => setModalIntermed(false)} onActualizado={cargarIntermediarios} />
    </div>
  );
}
