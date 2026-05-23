import { useState, useMemo } from 'react';
import { HiOutlinePlus, HiOutlineSearch, HiOutlineEye } from 'react-icons/hi';
import useCrud from '../../../hooks/useCrud';
import usePaginacion from '../../../hooks/usePaginacion';
import TablaGenerica from '../../../components/ui/TablaGenerica';
import EstadoBadge from '../../../components/ui/EstadoBadge';
import Paginacion from '../../../components/ui/Paginacion';
import { formatearFecha, formatearMoneda, formatearNumero } from '../../../utils/formato';
import { ESTADO_IMPORTACION } from '../../../config/constants';
import ModalCrearImportacion from './ModalCrearImportacion';
import Vista360 from './Vista360';

function PanelExpandido({ imp }) {
  const proveedor = imp.tbl_proveedores;
  const items = imp.items || [];
  const totalAlmacen = items.reduce((s, it) => s + (parseFloat(it.costo_almacen_soles) || 0), 0);

  return (
    <div className="bg-steel-900/60 border-x border-steel-700/50 px-6 py-4 space-y-3">
      {/* Encabezado: datos del proveedor + contrato */}
      <div className="space-y-0.5">
        {proveedor?.razon_social && (
          <p className="text-steel-100 font-semibold text-sm">{proveedor.razon_social}</p>
        )}
        {proveedor?.ruc && (
          <p className="text-steel-400 text-xs">RUC {proveedor.ruc}</p>
        )}
        {proveedor?.nombre && (
          <p className="text-steel-300 text-sm italic">{proveedor.nombre}</p>
        )}
        {imp.contrato && (
          <p className="text-steel-400 text-xs">Contract No.: {imp.contrato}</p>
        )}
      </div>

      {/* Tabla de items */}
      {items.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-steel-700/50">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left py-2 px-3 bg-blue-900/20 text-blue-300 font-semibold whitespace-nowrap">Codigo</th>
                <th className="text-left py-2 px-3 bg-blue-900/20 text-blue-300 font-semibold">Articulo</th>
                <th className="text-right py-2 px-3 bg-blue-900/20 text-blue-300 font-semibold whitespace-nowrap">Cantidad</th>
                <th className="text-right py-2 px-3 bg-purple-900/20 text-purple-300 font-semibold whitespace-nowrap">COSTO TOTAL Alm S/</th>
                <th className="text-right py-2 px-3 bg-purple-900/20 text-purple-300 font-semibold whitespace-nowrap">Costo Unitario Alm S/</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id || i} className={i % 2 === 0 ? 'bg-steel-800/30' : 'bg-steel-800/10'}>
                  <td className="py-1.5 px-3 text-steel-300 whitespace-nowrap">{item.codigo_aduanero || '-'}</td>
                  <td className="py-1.5 px-3 text-steel-200">{item.tbl_productos?.nombre || '-'}</td>
                  <td className="py-1.5 px-3 text-steel-300 text-right">{formatearNumero(item.cantidad)}</td>
                  <td className="py-1.5 px-3 text-right bg-purple-900/10 text-steel-200">
                    {parseFloat(item.costo_almacen_soles) ? formatearMoneda(item.costo_almacen_soles, 3) : '-'}
                  </td>
                  <td className="py-1.5 px-3 text-right bg-purple-900/10 text-steel-200">
                    {parseFloat(item.costo_unit_almacen_sol) ? formatearMoneda(item.costo_unit_almacen_sol, 3) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-steel-600">
                <td colSpan={3} className="py-2 px-3 text-right font-semibold text-steel-300">Total</td>
                <td className="py-2 px-3 text-right font-semibold bg-purple-900/10 text-steel-100">
                  {totalAlmacen > 0 ? formatearMoneda(totalAlmacen, 3) : '-'}
                </td>
                <td className="py-2 px-3 bg-purple-900/10" />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p className="text-steel-500 text-xs italic">Sin items registrados</p>
      )}

      {/* Tipo de cambio */}
      {imp.tipo_cambio && (
        <p className="text-steel-400 text-xs">
          Tipo de cambio Dua: <span className="text-steel-200 font-medium">{parseFloat(imp.tipo_cambio).toFixed(4)}</span>
        </p>
      )}
    </div>
  );
}

export default function TabImportaciones({ tiposProducto }) {
  const { datos, cargando, listar } = useCrud('/importaciones');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [modalCrear, setModalCrear] = useState(false);
  const [importacionSeleccionada, setImportacionSeleccionada] = useState(null);
  const [expandidaId, setExpandidaId] = useState(null);

  const datosFiltrados = useMemo(() => {
    return datos.filter(d => {
      const matchBusqueda = !busqueda ||
        d.id?.toString().includes(busqueda) ||
        d.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        d.tbl_proveedores?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        d.tbl_proveedores?.razon_social?.toLowerCase().includes(busqueda.toLowerCase()) ||
        d.tbl_proveedores?.ruc?.includes(busqueda) ||
        d.tbl_usuarios?.nombres?.toLowerCase().includes(busqueda.toLowerCase());
      const matchEstado = !filtroEstado || d.estado === filtroEstado;
      return matchBusqueda && matchEstado;
    });
  }, [datos, busqueda, filtroEstado]);

  const { datosPaginados, paginaActual, totalPaginas, irAPagina } = usePaginacion(datosFiltrados);

  const handleFilaClick = (fila) => {
    setExpandidaId(prev => prev === fila.id ? null : fila.id);
  };

  const columnas = [
    { key: 'id', label: 'ID' },
    { key: 'nombre', label: 'Importación', render: f => f.nombre || `#${f.id}` },
    { key: 'proveedor', label: 'Proveedor', render: f => f.tbl_proveedores?.nombre || '-' },
    { key: 'tipo', label: 'Tipo', render: f => f.tipo_producto?.nombre || '-' },
    { key: 'fecha', label: 'Embarque', render: f => formatearFecha(f.fecha_embarque) },
    { key: 'estado', label: 'Estado', render: f => <EstadoBadge estado={f.estado} /> },
    { key: 'items', label: 'Items', render: f => f.items?.length || 0 },
    {
      key: 'costo_total',
      label: 'C.T. Almacén S/',
      render: f => {
        const total = (f.items || []).reduce((s, it) => s + (parseFloat(it.costo_almacen_soles) || parseFloat(it.total_item) || 0), 0);
        return total > 0 ? formatearMoneda(total, 3) : '-';
      }
    },
  ];

  if (importacionSeleccionada) {
    return (
      <Vista360
        importacionId={importacionSeleccionada.id}
        tiposProducto={tiposProducto}
        onVolver={() => { setImportacionSeleccionada(null); listar(); }}
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <div className="flex flex-wrap gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-500" />
            <input className="input-field pl-9" placeholder="Buscar por ID, nombre, proveedor, RUC..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <select className="input-field w-auto" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value={ESTADO_IMPORTACION.PROGRAMADA}>Programada</option>
            <option value={ESTADO_IMPORTACION.RETRASADA}>Retrasada</option>
            <option value={ESTADO_IMPORTACION.INGRESADA}>Ingresada</option>
          </select>
        </div>
        <button onClick={() => setModalCrear(true)} className="btn-primary flex items-center gap-2 ml-3">
          <HiOutlinePlus className="w-4 h-4" /> Nueva Importación
        </button>
      </div>

      <div className="card">
        <TablaGenerica
          columnas={columnas}
          datos={datosPaginados}
          cargando={cargando}
          filaExpandidaId={expandidaId}
          onFilaClick={handleFilaClick}
          renderExpandido={(fila) => <PanelExpandido imp={fila} />}
          acciones={fila => (
            <button onClick={(e) => { e.stopPropagation(); setImportacionSeleccionada(fila); }}
              className="text-blue-600 hover:text-blue-400 flex items-center gap-1 text-xs">
              <HiOutlineEye className="w-4 h-4" /> Vista 360
            </button>
          )}
        />
        <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onChange={irAPagina} />
      </div>

      <ModalCrearImportacion
        abierto={modalCrear}
        cerrar={() => setModalCrear(false)}
        onCreado={(data) => { listar(); setImportacionSeleccionada(data); }}
        tiposProducto={tiposProducto}
      />
    </>
  );
}
