import { useState, useMemo } from 'react';
import { HiOutlineSearch, HiOutlineClock, HiOutlineExclamation, HiOutlineShoppingCart } from 'react-icons/hi';
import TablaGenerica from '../ui/TablaGenerica';
import EstadoBadge from '../ui/EstadoBadge';
import Paginacion from '../ui/Paginacion';
import usePaginacion from '../../hooks/usePaginacion';
import useProximosIngresos, { ORIGEN_PROXIMO } from '../../hooks/useProximosIngresos';
import { formatearFecha } from '../../utils/formato';

const ITEMS_POR_PAGINA = 20;

/**
 * Componente compartido: tabla de próximos ingresos con resumen, filtros y paginación.
 * @param {boolean} mostrarCardRetrasadas - Si true, muestra card de retrasadas en el resumen.
 * @param {boolean} soloCompras - Si true, filtra solo compras nacionales y adapta la UI.
 * @param {boolean} soloImportaciones - Si true, filtra solo importaciones y adapta la UI.
 */
export default function TablaProximosIngresos({ mostrarCardRetrasadas = false, soloCompras = false, soloImportaciones = false }) {
  const { cargando, itemsPlanos, resumen } = useProximosIngresos();
  const [busqueda, setBusqueda] = useState('');
  const [filtroOrigen, setFiltroOrigen] = useState('');

  const itemsFiltrados = useMemo(() => {
    return itemsPlanos.filter(item => {
      if (soloCompras && item.origen !== ORIGEN_PROXIMO.COMPRA_LOCAL) return false;
      if (soloImportaciones && item.origen !== ORIGEN_PROXIMO.IMPORTACION) return false;
      if (filtroOrigen && item.origen !== filtroOrigen) return false;
      if (busqueda) {
        const term = busqueda.toLowerCase();
        return item.producto.toLowerCase().includes(term) ||
          item.origen_nombre.toLowerCase().includes(term);
      }
      return true;
    });
  }, [itemsPlanos, busqueda, filtroOrigen, soloCompras, soloImportaciones]);

  const { datosPaginados, paginaActual, totalPaginas, irAPagina } = usePaginacion(itemsFiltrados, ITEMS_POR_PAGINA);

  const columnas = useMemo(() => {
    const cols = [
      { key: 'producto', label: 'Producto', render: f => (
        <span className="font-medium text-steel-100">{f.producto}</span>
      )},
      { key: 'cantidad', label: 'Cantidad', render: f => (
        <span className="font-semibold text-steel-100">{f.cantidad}</span>
      )},
    ];

    if (!soloCompras && !soloImportaciones) {
      cols.push({
        key: 'origen', label: 'Origen', render: f => (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            f.origen === ORIGEN_PROXIMO.IMPORTACION
              ? 'bg-blue-500/15 text-blue-400'
              : 'bg-cyan-500/15 text-cyan-400'
          }`}>
            {f.origen === ORIGEN_PROXIMO.IMPORTACION ? 'IMP' : 'COMP'}
          </span>
        ),
      });
    }

    cols.push(
      { key: 'origen_nombre', label: 'Referencia', render: f => (
        <span className="text-steel-300 text-xs">{f.origen_nombre}</span>
      )},
      { key: 'fecha_estimada', label: soloCompras ? 'Fecha Compra' : 'Fecha Est. Llegada', render: f => (
        <span className="text-steel-200">{f.fecha_estimada ? formatearFecha(f.fecha_estimada) : '-'}</span>
      )},
      { key: 'estado', label: 'Estado', render: f => (
        <EstadoBadge estado={f.estado_display || f.estado} />
      )},
    );

    return cols;
  }, [soloCompras, soloImportaciones]);

  return (
    <>
      {/* Resumen */}
      {soloCompras ? (
        <div className="grid grid-cols-1 gap-4 mb-4">
          <div className="card flex items-center gap-3 py-3">
            <HiOutlineShoppingCart className="w-8 h-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold text-steel-100">{resumen.totalCompras}</p>
              <p className="text-xs text-steel-400">Productos en compras pendientes</p>
            </div>
          </div>
        </div>
      ) : soloImportaciones ? (
        <div className={`grid gap-4 mb-4 ${mostrarCardRetrasadas ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <div className="card flex items-center gap-3 py-3">
            <HiOutlineClock className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold text-steel-100">{resumen.enTransito}</p>
              <p className="text-xs text-steel-400">Productos en tránsito</p>
            </div>
          </div>
          {mostrarCardRetrasadas && (
            <div className="card flex items-center gap-3 py-3">
              <HiOutlineExclamation className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-orange-500">{resumen.retrasadas}</p>
                <p className="text-xs text-steel-400">Productos retrasados</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={`grid gap-4 mb-4 ${mostrarCardRetrasadas ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <div className="card flex items-center gap-3 py-3">
            <HiOutlineClock className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold text-steel-100">{resumen.enTransito}</p>
              <p className="text-xs text-steel-400">Productos en tránsito</p>
            </div>
          </div>
          <div className="card flex items-center gap-3 py-3">
            <HiOutlineClock className="w-8 h-8 text-cyan-500" />
            <div>
              <p className="text-2xl font-bold text-steel-100">{resumen.totalCompras}</p>
              <p className="text-xs text-steel-400">Productos en compras pendientes</p>
            </div>
          </div>
          {mostrarCardRetrasadas && (
            <div className="card flex items-center gap-3 py-3">
              <HiOutlineExclamation className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-orange-500">{resumen.retrasadas}</p>
                <p className="text-xs text-steel-400">Productos retrasados</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="card mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-500" />
            <input
              className="input-field pl-9"
              placeholder="Buscar por producto o referencia..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
          {!soloCompras && !soloImportaciones && (
            <select
              className="input-field w-auto"
              value={filtroOrigen}
              onChange={e => setFiltroOrigen(e.target.value)}
            >
              <option value="">Todos los origenes</option>
              <option value={ORIGEN_PROXIMO.IMPORTACION}>Importaciones</option>
              <option value={ORIGEN_PROXIMO.COMPRA_LOCAL}>Compras Locales</option>
            </select>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <TablaGenerica columnas={columnas} datos={datosPaginados} cargando={cargando} />
        <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onChange={irAPagina} />
      </div>
    </>
  );
}
