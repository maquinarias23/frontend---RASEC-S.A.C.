import { useState } from 'react';
import { HiOutlineClipboardList, HiOutlineTruck, HiOutlineShoppingCart } from 'react-icons/hi';
import useCrud from '../../hooks/useCrud';
import TablaGenerica from '../../components/ui/TablaGenerica';
import Tabs from '../../components/ui/Tabs';
import TablaProximosIngresos from '../../components/shared/TablaProximosIngresos';
import { formatearMoneda } from '../../utils/formato';

const tabsInventario = [
  { key: 'stock', label: 'Stock Actual', icono: <HiOutlineClipboardList className="w-4 h-4 inline" /> },
  { key: 'llegadas', label: 'Llegadas de Importacion', icono: <HiOutlineTruck className="w-4 h-4 inline" /> },
  { key: 'compras_nacionales', label: 'Compras Nacionales', icono: <HiOutlineShoppingCart className="w-4 h-4 inline" /> },
];

export default function InventarioVendedor() {
  const [tabActual, setTabActual] = useState('stock');
  const { datos, cargando } = useCrud('/inventario/por-producto');

  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');

  const categorias = [...new Set(datos.map(p => p.categoria).filter(Boolean))].sort();

  const datosFiltrados = datos.filter(p => {
    if (categoriaFiltro && p.categoria !== categoriaFiltro) return false;
    if (busqueda) {
      return p.nombre.toLowerCase().includes(busqueda.toLowerCase());
    }
    return true;
  });

  const columnas = [
    { key: 'nombre', label: 'Producto' },
    { key: 'categoria', label: 'Categoria' },
    { key: 'precio_venta_base', label: 'Precio Mínimo', render: (f) => formatearMoneda(f.precio_venta_base) },
    { key: 'precio_vendedor', label: 'Mi Precio', render: (f) => f.precio_vendedor ? formatearMoneda(f.precio_vendedor) : <span className="text-steel-500">-</span> },
    { key: 'stock_total', label: 'Stock Total', render: (f) => (
      <span className={`font-bold ${f.stock_total === 0 ? 'text-red-600' : 'text-steel-100'}`}>{f.stock_total}</span>
    )},
    { key: 'disponibles', label: 'Disponibles', render: (f) => (
      <span className="text-emerald-600 font-medium">{f.disponibles}</span>
    )},
  ];

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold font-display tracking-wider text-steel-100">Inventario</h1>
        <p className="text-sm text-steel-400 mt-1">Consulta disponibilidad de productos y proximos ingresos</p>
      </div>

      <Tabs tabs={tabsInventario} tabActual={tabActual} onChange={setTabActual} />

      {tabActual === 'llegadas' && <TablaProximosIngresos soloImportaciones mostrarCardRetrasadas />}
      {tabActual === 'compras_nacionales' && <TablaProximosIngresos soloCompras />}

      {tabActual === 'stock' && (
        <>
          <div className="card mb-6">
            <div className="flex flex-wrap gap-3">
              <input
                className="input-field flex-1 min-w-[200px]"
                placeholder="Buscar producto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <select
                className="input-field w-48"
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
              >
                <option value="">Todas las categorias</option>
                {categorias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="card">
            <TablaGenerica columnas={columnas} datos={datosFiltrados} cargando={cargando} />
          </div>
        </>
      )}
    </div>
  );
}
