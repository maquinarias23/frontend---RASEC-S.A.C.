export default function DateRangePicker({ fechaInicio, fechaFin, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <div>
        <label className="block text-xs font-medium text-steel-400 mb-1">Desde</label>
        <input type="date" className="input-field text-sm" value={fechaInicio || ''}
          onChange={e => onChange({ fechaInicio: e.target.value, fechaFin })} />
      </div>
      <span className="text-steel-500 mt-5">-</span>
      <div>
        <label className="block text-xs font-medium text-steel-400 mb-1">Hasta</label>
        <input type="date" className="input-field text-sm" value={fechaFin || ''}
          onChange={e => onChange({ fechaInicio, fechaFin: e.target.value })} />
      </div>
    </div>
  );
}
