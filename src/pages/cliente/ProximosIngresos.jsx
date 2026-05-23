import { useState, useMemo } from 'react';
import { HiOutlineSearch, HiOutlineClock, HiOutlineExclamation } from 'react-icons/hi';
import useProximosIngresos, { ORIGEN_PROXIMO } from '../../hooks/useProximosIngresos';
import { formatearFecha } from '../../utils/formato';

export default function ProximosIngresos() {
  const { cargando, itemsPlanos, resumen } = useProximosIngresos();
  const [busqueda, setBusqueda] = useState('');

  const itemsFiltrados = useMemo(() => {
    if (!busqueda) return itemsPlanos;
    const term = busqueda.toLowerCase();
    return itemsPlanos.filter(item =>
      item.producto.toLowerCase().includes(term)
    );
  }, [itemsPlanos, busqueda]);

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-title-chromium">Próximos Ingresos</h1>
          <p className="text-sm text-steel-400 mt-1">Productos que llegarán próximamente a nuestro almacén</p>
        </div>
        {resumen.retrasadas > 0 && (
          <span className="bg-orange-500/15 text-orange-500 px-3 py-1.5 rounded-lg text-sm font-medium inline-flex self-start items-center gap-1.5 border border-orange-500/20 whitespace-nowrap">
            <HiOutlineExclamation className="w-4 h-4" />
            {resumen.retrasadas} retrasada{resumen.retrasadas !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
        <div className="card-chromium flex items-center gap-3 !p-3 sm:!py-4 sm:!px-4 min-w-0">
          <HiOutlineClock className="w-7 h-7 sm:w-8 sm:h-8 text-blue-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-bold text-steel-100 num-chromium">{resumen.enTransito}</p>
            <p className="text-[11px] sm:text-xs text-steel-400 leading-tight">Productos en tránsito</p>
          </div>
        </div>
        <div className="card-chromium flex items-center gap-3 !p-3 sm:!py-4 sm:!px-4 min-w-0">
          <HiOutlineClock className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-bold text-steel-100 num-chromium">{resumen.totalCompras}</p>
            <p className="text-[11px] sm:text-xs text-steel-400 leading-tight">Productos en compras pendientes</p>
          </div>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="card-chromium mb-4">
        <div className="relative">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-500" />
          <input
            className="input-chromium pl-9 w-full"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de productos */}
      {cargando ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-steel-700 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : itemsFiltrados.length === 0 ? (
        <div className="card-chromium text-center py-12">
          <p className="text-steel-400">No hay productos por llegar en este momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {itemsFiltrados.map(item => (
            <div key={item.id} className="card-chromium border-dashed border-steel-600/40">
              <div className="flex items-center gap-2 mb-2">
                <span className={`label-chromium px-1.5 py-0.5 rounded text-[9px] ${
                  item.origen === ORIGEN_PROXIMO.IMPORTACION
                    ? 'bg-blue-500/15 text-blue-400'
                    : 'bg-cyan-500/15 text-cyan-400'
                }`}>
                  {item.origen === ORIGEN_PROXIMO.IMPORTACION ? 'Importación' : 'Compra Local'}
                </span>
              </div>
              <p className="font-medium text-steel-200">{item.producto}</p>
              <p className="text-sm text-steel-400 mt-1">
                Cantidad esperada: <span className="num-chromium">{item.cantidad}</span>
              </p>
              {item.fecha_estimada && (
                <p className="text-xs text-primary-500 mt-1">
                  Llegada estimada: {formatearFecha(item.fecha_estimada)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
