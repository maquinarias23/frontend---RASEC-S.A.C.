import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';

export default function Paginacion({ paginaActual, totalPaginas, onChange }) {
  if (totalPaginas <= 1) return null;

  const paginas = [];
  const rango = 2;
  for (let i = Math.max(1, paginaActual - rango); i <= Math.min(totalPaginas, paginaActual + rango); i++) {
    paginas.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-4">
      <button onClick={() => onChange(paginaActual - 1)} disabled={paginaActual === 1}
        className="p-2 rounded-lg hover:bg-steel-800 text-steel-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
        <HiChevronLeft className="w-5 h-5" />
      </button>
      {paginas[0] > 1 && (<><button onClick={() => onChange(1)} className="px-3 py-1 rounded-lg text-sm hover:bg-steel-800 text-steel-300">1</button>{paginas[0] > 2 && <span className="px-1 text-steel-500">...</span>}</>)}
      {paginas.map(p => (
        <button key={p} onClick={() => onChange(p)}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${p === paginaActual ? 'bg-primary-500 text-white shadow-forge' : 'hover:bg-steel-800 text-steel-300'}`}>
          {p}
        </button>
      ))}
      {paginas[paginas.length - 1] < totalPaginas && (<>{paginas[paginas.length - 1] < totalPaginas - 1 && <span className="px-1 text-steel-500">...</span>}<button onClick={() => onChange(totalPaginas)} className="px-3 py-1 rounded-lg text-sm hover:bg-steel-800 text-steel-300">{totalPaginas}</button></>)}
      <button onClick={() => onChange(paginaActual + 1)} disabled={paginaActual === totalPaginas}
        className="p-2 rounded-lg hover:bg-steel-800 text-steel-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
        <HiChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
