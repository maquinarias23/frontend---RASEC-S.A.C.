import { HiArrowNarrowRight } from 'react-icons/hi';

const SECUENCIA = [
  { campo: 'fecha_pedido', label: 'Pedido' },
  { campo: 'fecha_fabricacion', label: 'Fabricacion' },
  { campo: 'fecha_embarque', label: 'Embarque (China)' },
  { campo: 'fecha_desembarque', label: 'Desembarque (Peru)' },
  { campo: 'fecha_descarga', label: 'Descarga (Almacen)' },
];

function diasEntre(f1, f2) {
  if (!f1 || !f2) return null;
  const d1 = new Date(f1);
  const d2 = new Date(f2);
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

function BadgeDias({ dias }) {
  if (dias === null) return (
    <div className="flex flex-col items-center justify-end pb-2 px-1">
      <HiArrowNarrowRight className="w-4 h-4 text-steel-600" />
      <span className="text-[10px] text-steel-600">--</span>
    </div>
  );

  const color = dias < 0
    ? 'text-white bg-red-600 border-red-500'
    : dias === 0
      ? 'text-white bg-steel-500 border-steel-400'
      : 'text-white bg-blue-600 border-blue-500';

  return (
    <div className="flex flex-col items-center justify-end pb-2 px-1">
      <HiArrowNarrowRight className="w-4 h-4 text-blue-400 mb-0.5" />
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${color}`}>
        {dias}d
      </span>
    </div>
  );
}

export default function FechasTimeline({ fechas, onChange }) {
  return (
    <div className="flex items-end gap-0">
      {SECUENCIA.map((etapa, i) => (
        <div key={etapa.campo} className="contents">
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-steel-400 mb-1">{etapa.label}</label>
            <input
              type="date"
              className="input-field text-sm w-full"
              value={fechas[etapa.campo] || ''}
              onChange={e => onChange(etapa.campo, e.target.value)}
            />
          </div>
          {i < SECUENCIA.length - 1 && (
            <BadgeDias dias={diasEntre(fechas[etapa.campo], fechas[SECUENCIA[i + 1].campo])} />
          )}
        </div>
      ))}
    </div>
  );
}
