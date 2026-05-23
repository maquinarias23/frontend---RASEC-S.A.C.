import { Fragment } from 'react';
import { HiChevronRight, HiChevronDown, HiChevronUp, HiSelector } from 'react-icons/hi';

export default function TablaGenerica({
  columnas, datos, acciones, cargando, vacio = 'No hay registros.',
  renderExpandido, filaExpandidaId, onFilaClick,
  ordenColumna, ordenDireccion, onOrdenar,
}) {
  if (cargando) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 border-4 border-steel-700 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!datos || datos.length === 0) {
    return <p className="text-center text-steel-400 py-8">{vacio}</p>;
  }

  const expandible = !!renderExpandido && !!onFilaClick;
  const totalColumnas = columnas.length + (acciones ? 1 : 0) + (expandible ? 1 : 0);
  const ordenable = !!onOrdenar;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-steel-700">
            {expandible && <th className="w-8 py-3 px-2" />}
            {columnas.map((col) => {
              const colOrdenable = ordenable && col.sortable !== false;
              const activa = ordenColumna === col.key;
              return (
                <th
                  key={col.key}
                  className={`text-left py-3 px-4 font-semibold text-steel-300 whitespace-nowrap uppercase text-xs tracking-wider ${
                    colOrdenable ? 'cursor-pointer select-none hover:text-steel-100 transition-colors' : ''
                  }`}
                  onClick={colOrdenable ? () => onOrdenar(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {colOrdenable && (
                      activa
                        ? ordenDireccion === 'asc'
                          ? <HiChevronUp className="w-3.5 h-3.5 text-primary-400" />
                          : <HiChevronDown className="w-3.5 h-3.5 text-primary-400" />
                        : <HiSelector className="w-3.5 h-3.5 text-steel-600" />
                    )}
                  </span>
                </th>
              );
            })}
            {acciones && <th className="text-left py-3 px-4 font-semibold text-steel-300 uppercase text-xs tracking-wider">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {datos.map((fila, idx) => {
            const estaExpandida = expandible && fila.id === filaExpandidaId;
            return (
              <Fragment key={fila._uid || fila.id || idx}>
                <tr
                  className={`border-b border-steel-800/60 transition-colors ${
                    expandible ? 'cursor-pointer hover:bg-steel-800/50' : 'hover:bg-steel-800/50'
                  } ${estaExpandida ? 'bg-steel-800/70' : ''}`}
                  onClick={expandible ? () => onFilaClick(fila) : undefined}
                >
                  {expandible && (
                    <td className="py-3 px-2 text-steel-400">
                      {estaExpandida
                        ? <HiChevronDown className="w-4 h-4" />
                        : <HiChevronRight className="w-4 h-4" />}
                    </td>
                  )}
                  {columnas.map((col) => (
                    <td key={col.key} className="py-3 px-4 whitespace-nowrap text-steel-200">
                      {col.render ? col.render(fila, col, idx) : fila[col.key]}
                    </td>
                  ))}
                  {acciones && (
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {acciones(fila)}
                      </div>
                    </td>
                  )}
                </tr>
                {estaExpandida && (
                  <tr className="border-b border-steel-700">
                    <td colSpan={totalColumnas} className="p-0">
                      {renderExpandido(fila)}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
