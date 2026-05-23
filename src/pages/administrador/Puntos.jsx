import { useState, useEffect } from 'react';
import { HiOutlineStar, HiOutlineCog, HiOutlineSearch } from 'react-icons/hi';
import useCrud from '../../hooks/useCrud';
import usePaginacion from '../../hooks/usePaginacion';
import TablaGenerica from '../../components/ui/TablaGenerica';
import Paginacion from '../../components/ui/Paginacion';
import BuscadorAutocomplete from '../../components/ui/BuscadorAutocomplete';
import { formatearFechaHora, formatearMoneda } from '../../utils/formato';
import { TIPO_PUNTO } from '../../config/constants';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const esPuntoPositivo = (tipo) => tipo === TIPO_PUNTO.GANADO || tipo === TIPO_PUNTO.LIBERADO;

const columnas = [
  { key: 'id', label: 'ID' },
  { key: 'cliente', label: 'Cliente', render: (f) => f.tbl_clientes?.nombre || '-' },
  { key: 'tipo', label: 'Tipo', render: (f) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${esPuntoPositivo(f.tipo) ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
      {f.tipo?.replace(/_/g, ' ').toUpperCase()}
    </span>
  )},
  { key: 'puntos', label: 'Puntos', render: (f) => (
    <span className={esPuntoPositivo(f.tipo) ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
      {esPuntoPositivo(f.tipo) ? '+' : '-'}{f.puntos}
    </span>
  )},
  { key: 'venta', label: 'Venta #', render: (f) => f.sale_order_id || '-' },
  { key: 'fecha', label: 'Fecha', render: (f) => formatearFechaHora(f.fecha_hora) },
];

export default function Puntos() {
  const { datos, cargando, listar } = useCrud('/puntos');
  const { datosPaginados, paginaActual, totalPaginas, irAPagina } = usePaginacion(datos);

  // Configuración
  const [config, setConfig] = useState({ soles_por_punto_ganado: 0, valor_soles_por_punto_canje: 0 });
  const [editandoConfig, setEditandoConfig] = useState(false);
  const [formConfig, setFormConfig] = useState({ soles_por_punto_ganado: '', valor_soles_por_punto_canje: '' });

  // Búsqueda por cliente
  const [clienteBusqueda, setClienteBusqueda] = useState(null);
  const [saldoCliente, setSaldoCliente] = useState(null);
  const [historialCliente, setHistorialCliente] = useState([]);

  useEffect(() => {
    cargarConfig();
  }, []);

  const cargarConfig = async () => {
    try {
      const { data } = await api.get('/puntos/configuracion');
      setConfig(data || { soles_por_punto_ganado: 0, valor_soles_por_punto_canje: 0 });
    } catch { /* sin config aún */ }
  };

  const abrirEditarConfig = () => {
    setFormConfig({
      soles_por_punto_ganado: config.soles_por_punto_ganado || '',
      valor_soles_por_punto_canje: config.valor_soles_por_punto_canje || '',
    });
    setEditandoConfig(true);
  };

  const guardarConfig = async () => {
    try {
      await api.post('/puntos/configuracion', {
        soles_por_punto_ganado: parseFloat(formConfig.soles_por_punto_ganado),
        valor_soles_por_punto_canje: parseFloat(formConfig.valor_soles_por_punto_canje),
      });
      toast.success('Configuración guardada');
      setEditandoConfig(false);
      cargarConfig();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const buscarSaldoCliente = async (cliente) => {
    if (!cliente) return;
    setClienteBusqueda(cliente);
    try {
      const { data } = await api.get(`/puntos/saldo/${cliente.id}`);
      setSaldoCliente(data.saldo ?? data.saldo_puntos ?? 0);
      setHistorialCliente(Array.isArray(data.historial) ? data.historial : []);
    } catch {
      setSaldoCliente(0);
      setHistorialCliente([]);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold font-display tracking-wider text-steel-100 mb-6">Puntos de Fidelización</h1>

      {/* Configuración */}
      <div className="card mb-6">
        <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <HiOutlineCog className="w-5 h-5 text-steel-400" /> Configuración de Puntos
          </h2>
          {!editandoConfig && (
            <button onClick={abrirEditarConfig} className="text-sm text-blue-600 hover:text-blue-700">Editar</button>
          )}
        </div>
        {editandoConfig ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1">Soles por punto ganado</label>
              <input type="number" step="0.01" min="0" className="input-field" value={formConfig.soles_por_punto_ganado}
                onChange={(e) => setFormConfig({ ...formConfig, soles_por_punto_ganado: e.target.value })} />
              <p className="text-xs text-steel-500 mt-1">Cuántos soles de compra equivalen a 1 punto</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1">Valor en soles por punto canje</label>
              <input type="number" step="0.01" min="0" className="input-field" value={formConfig.valor_soles_por_punto_canje}
                onChange={(e) => setFormConfig({ ...formConfig, valor_soles_por_punto_canje: e.target.value })} />
              <p className="text-xs text-steel-500 mt-1">Cuántos soles de descuento vale 1 punto</p>
            </div>
            <div className="col-span-full flex gap-2 justify-end">
              <button onClick={() => setEditandoConfig(false)} className="btn-secondary text-sm">Cancelar</button>
              <button onClick={guardarConfig} className="btn-primary text-sm">Guardar Configuración</button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-sm text-blue-600">Soles por punto ganado</p>
              <p className="text-2xl font-bold text-blue-600">{formatearMoneda(config.soles_por_punto_ganado || 0)}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4 text-center">
              <p className="text-sm text-emerald-600">Valor por punto canje</p>
              <p className="text-2xl font-bold text-emerald-600">{formatearMoneda(config.valor_soles_por_punto_canje || 0)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Búsqueda por cliente */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <HiOutlineSearch className="w-5 h-5 text-steel-400" /> Consultar Saldo de Cliente
        </h2>
        <div className="max-w-md">
          <BuscadorAutocomplete endpoint="/clientes/buscar" campo="nombre" placeholder="Buscar cliente por nombre..."
            onSeleccionar={buscarSaldoCliente} valor={clienteBusqueda?.nombre || ''} />
        </div>
        {clienteBusqueda && saldoCliente !== null && (
          <div className="mt-4">
            <div className="bg-purple-50 rounded-lg p-4 inline-flex items-center gap-3">
              <HiOutlineStar className="w-6 h-6 text-purple-500" />
              <div>
                <p className="text-sm text-purple-600">{clienteBusqueda.nombre}</p>
                <p className="text-2xl font-bold text-purple-600">{saldoCliente} puntos</p>
              </div>
            </div>
            {historialCliente.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-steel-200 mb-2">Últimos movimientos</h3>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {historialCliente.slice(0, 10).map((mov, i) => (
                    <div key={mov.id || i} className="flex items-center justify-between p-2 bg-steel-900/50 rounded text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${esPuntoPositivo(mov.tipo) ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                          {esPuntoPositivo(mov.tipo) ? '+' : '-'}{mov.puntos}
                        </span>
                        <span className="text-steel-300">{mov.sale_order_id ? `Venta #${mov.sale_order_id}` : 'Manual'}</span>
                      </div>
                      <span className="text-xs text-steel-500">{formatearFechaHora(mov.fecha_hora)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabla general de movimientos */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Todos los Movimientos de Puntos</h2>
        <TablaGenerica columnas={columnas} datos={datosPaginados} cargando={cargando} vacio="No hay movimientos de puntos." />
        <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onChange={irAPagina} />
      </div>
    </div>
  );
}
