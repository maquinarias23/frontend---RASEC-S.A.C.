import { useMemo } from 'react';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineExclamation, HiOutlineCheckCircle } from 'react-icons/hi';

const asientoVacio = { cuenta: '', descripcion: '', debe: '', haber: '' };

export default function TablaAsientoContable({ asientos, onAsientosChange, costoAlmacenTotal }) {
  const actualizarAsiento = (idx, campo, valor) => {
    const nuevos = [...asientos];
    nuevos[idx] = { ...nuevos[idx], [campo]: valor };
    onAsientosChange(nuevos);
  };

  const agregarAsiento = () => onAsientosChange([...asientos, { ...asientoVacio }]);
  const eliminarAsiento = (idx) => onAsientosChange(asientos.filter((_, i) => i !== idx));

  const { totalDebe, totalHaber, diferencia, cuadrado } = useMemo(() => {
    const totalDebe = asientos.reduce((s, a) => s + (parseFloat(a.debe) || 0), 0);
    const totalHaber = asientos.reduce((s, a) => s + (parseFloat(a.haber) || 0), 0);
    const diferencia = Math.abs(totalDebe - totalHaber);
    const cuadrado = diferencia < 0.01;
    return { totalDebe, totalHaber, diferencia, cuadrado };
  }, [asientos]);

  const inputClass = "bg-transparent border-0 w-full text-sm text-steel-100 focus:outline-none focus:ring-1 focus:ring-yellow-500/50 px-2 py-1.5";

  const fmt = (v) => {
    const n = parseFloat(v);
    return isNaN(n) || n === 0 ? '-' : n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div>
      <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <h3 className="text-sm font-semibold text-steel-200">Asiento Contable</h3>
        <button type="button" onClick={agregarAsiento}
          className="text-xs text-primary-500 hover:text-primary-400 font-medium flex items-center gap-1">
          <HiOutlinePlus className="w-3 h-3" /> Agregar linea
        </button>
      </div>

      <div className="overflow-x-auto border border-amber-700/40 rounded-lg bg-amber-950/30">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-amber-900/50 border-b border-amber-700/40">
              <th className="text-left py-2 px-2 font-semibold text-amber-100 w-24">Cuenta</th>
              <th className="text-left py-2 px-2 font-semibold text-amber-100">Descripcion</th>
              <th className="text-right py-2 px-2 font-semibold text-amber-100 w-32">Debe</th>
              <th className="text-right py-2 px-2 font-semibold text-amber-100 w-32">Haber</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {asientos.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-4 text-steel-500 text-xs">Sin asientos registrados</td></tr>
            ) : asientos.map((a, idx) => (
              <tr key={idx} className="border-b border-amber-700/20 hover:bg-amber-950/40">
                <td className="px-1"><input type="text" className={inputClass} value={a.cuenta || ''} onChange={e => actualizarAsiento(idx, 'cuenta', e.target.value)} placeholder="60" /></td>
                <td className="px-1"><input type="text" className={inputClass} value={a.descripcion || ''} onChange={e => actualizarAsiento(idx, 'descripcion', e.target.value)} placeholder="MERCADERIAS" /></td>
                <td className="px-1"><input type="number" step="0.01" className={`${inputClass} text-right`} value={a.debe || ''} onChange={e => actualizarAsiento(idx, 'debe', e.target.value)} /></td>
                <td className="px-1"><input type="number" step="0.01" className={`${inputClass} text-right`} value={a.haber || ''} onChange={e => actualizarAsiento(idx, 'haber', e.target.value)} /></td>
                <td className="text-center">
                  <button type="button" onClick={() => eliminarAsiento(idx)} className="text-red-600/60 hover:text-red-400 p-1">
                    <HiOutlineTrash className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-amber-900/50 border-t border-amber-700/40 font-semibold">
              <td colSpan={2} className="text-right py-2 px-2 text-xs text-amber-200">TOTALES:</td>
              <td className="text-right py-2 px-2 text-sm text-white">{fmt(totalDebe)}</td>
              <td className="text-right py-2 px-2 text-sm text-white">{fmt(totalHaber)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Validation message */}
      <div className="mt-2">
        {cuadrado ? (
          <div className="flex items-center gap-2 text-xs text-emerald-600">
            <HiOutlineCheckCircle className="w-4 h-4" />
            <span>Debe = Haber{costoAlmacenTotal > 0 && Math.abs(totalDebe - costoAlmacenTotal) < 0.01 ? ` = C.T. Almacen S/ (${fmt(costoAlmacenTotal)})` : ''}</span>
          </div>
        ) : asientos.length > 0 ? (
          <div className="flex items-center gap-2 text-xs text-orange-600">
            <HiOutlineExclamation className="w-4 h-4" />
            <span>Diferencia: S/ {fmt(diferencia)} — Debe y Haber no cuadran</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
