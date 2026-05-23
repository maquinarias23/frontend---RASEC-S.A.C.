import { HiCheck } from 'react-icons/hi';
import { PASOS_TRACKING } from '../../config/constants';
import { formatearFechaHora } from '../../utils/formato';

export default function TimelineTracking({ estadoActual, pasos = PASOS_TRACKING, historial = [] }) {
  const idxActual = pasos.findIndex(p => p.key === estadoActual);

  const fechaPorEstado = {};
  for (const entry of historial) {
    if (!fechaPorEstado[entry.estado_nuevo]) {
      fechaPorEstado[entry.estado_nuevo] = entry.fecha_hora;
    }
  }

  return (
    <>
      {/* Mobile: vertical timeline */}
      <ol className="flex flex-col gap-4 sm:hidden">
        {pasos.map((paso, i) => {
          const completado = i <= idxActual;
          const esActual = i === idxActual;
          const esUltimo = i === pasos.length - 1;
          const fecha = fechaPorEstado[paso.key];
          return (
            <li key={paso.key} className="relative flex gap-3">
              {/* Vertical connector to next step */}
              {!esUltimo && (
                <span
                  aria-hidden="true"
                  className={`absolute left-4 top-8 -translate-x-1/2 w-0.5 h-[calc(100%+0.5rem)] transition-colors ${i < idxActual ? 'bg-primary-500' : 'bg-steel-700'}`}
                />
              )}
              <div
                className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${completado ? 'bg-primary-500 text-white shadow-forge' : 'bg-steel-700 text-steel-400'} ${esActual ? 'ring-4 ring-primary-500/20' : ''}`}
              >
                {completado ? <HiCheck className="w-4 h-4" /> : i + 1}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <p className={`text-sm leading-tight break-words ${completado ? 'text-primary-600 font-medium' : 'text-steel-500'}`}>
                  {paso.label}
                </p>
                {completado && fecha && (
                  <p className="mt-0.5 text-[11px] text-steel-400">{formatearFechaHora(fecha)}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Desktop: horizontal timeline */}
      <div className="hidden sm:flex items-start w-full">
        {pasos.map((paso, i) => {
          const completado = i <= idxActual;
          const esActual = i === idxActual;
          const fecha = fechaPorEstado[paso.key];
          return (
            <div key={paso.key} className="flex-1 min-w-0 flex flex-col items-center relative">
              {i > 0 && (
                <div
                  aria-hidden="true"
                  className={`absolute top-4 right-1/2 w-full h-0.5 transition-colors ${i <= idxActual ? 'bg-primary-500' : 'bg-steel-700'}`}
                />
              )}
              <div
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${completado ? 'bg-primary-500 text-white shadow-forge' : 'bg-steel-700 text-steel-400'} ${esActual ? 'ring-4 ring-primary-500/20' : ''}`}
              >
                {completado ? <HiCheck className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`mt-2 text-xs text-center leading-tight px-1 break-words hyphens-auto ${completado ? 'text-primary-600 font-medium' : 'text-steel-500'}`}>
                {paso.label}
              </span>
              {completado && fecha && (
                <span className="mt-0.5 text-[10px] text-steel-400 text-center">{formatearFechaHora(fecha)}</span>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
