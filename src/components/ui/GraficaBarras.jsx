export default function GraficaBarras({ datos = [], campoLabel = 'label', campoValor = 'valor', color = 'bg-primary-500', titulo = '' }) {
  if (!datos.length) return <p className="text-sm text-steel-500 text-center py-4">Sin datos para graficar</p>;
  const max = Math.max(...datos.map(d => d[campoValor] || 0), 1);

  return (
    <div>
      {titulo && <h3 className="font-display text-lg tracking-wider text-steel-200 mb-3">{titulo}</h3>}
      <div className="space-y-2">
        {datos.map((d, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-steel-400 w-28 truncate text-right">{d[campoLabel]}</span>
            <div className="flex-1 bg-steel-700/50 rounded-full h-6 relative overflow-hidden">
              <div
                className={`${color} h-full rounded-full transition-all duration-700 ease-out`}
                style={{ width: `${(d[campoValor] / max) * 100}%`, animationDelay: `${i * 100}ms` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-steel-200">
                {d[campoValor]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
