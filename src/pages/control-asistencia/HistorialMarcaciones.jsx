import { useState, useEffect } from 'react';
import { HiOutlineLogin, HiOutlineLogout, HiOutlineSearch } from 'react-icons/hi';
import api from '../../api/axios';

export default function HistorialMarcaciones() {
  const [marcaciones, setMarcaciones] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [filtros, setFiltros] = useState({
    fecha_desde: new Date().toISOString().split('T')[0],
    fecha_hasta: new Date().toISOString().split('T')[0],
    employee_id: ''
  });
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    api.get('/rrhh/empleados')
      .then(r => setEmpleados(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
    buscar();
  }, []);

  const buscar = () => {
    setCargando(true);
    const params = new URLSearchParams();
    if (filtros.fecha_desde) params.set('fecha_desde', filtros.fecha_desde);
    if (filtros.fecha_hasta) params.set('fecha_hasta', filtros.fecha_hasta);
    if (filtros.employee_id) params.set('employee_id', filtros.employee_id);

    api.get(`/asistencia-qr/marcaciones?${params.toString()}`)
      .then(r => setMarcaciones(Array.isArray(r.data) ? r.data : []))
      .catch(() => setMarcaciones([]))
      .finally(() => setCargando(false));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-steel-100 font-display tracking-wider mb-6">
        Historial de Marcaciones
      </h1>

      {/* Filtros */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm text-steel-400 mb-1">Desde</label>
            <input
              type="date"
              value={filtros.fecha_desde}
              onChange={e => setFiltros(f => ({ ...f, fecha_desde: e.target.value }))}
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-steel-400 mb-1">Hasta</label>
            <input
              type="date"
              value={filtros.fecha_hasta}
              onChange={e => setFiltros(f => ({ ...f, fecha_hasta: e.target.value }))}
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-steel-400 mb-1">Empleado</label>
            <select
              value={filtros.employee_id}
              onChange={e => setFiltros(f => ({ ...f, employee_id: e.target.value }))}
              className="input-field w-full"
            >
              <option value="">Todos</option>
              {empleados.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.tbl_usuarios?.nombres || '-'} — {emp.rol_laboral}
                </option>
              ))}
            </select>
          </div>
          <button onClick={buscar} disabled={cargando} className="btn-primary flex items-center gap-2 justify-center">
            <HiOutlineSearch className="w-4 h-4" />
            {cargando ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-steel-700">
                <th className="text-left py-2 px-3 text-steel-400">Empleado</th>
                <th className="text-center py-2 px-3 text-steel-400">Tipo</th>
                <th className="text-center py-2 px-3 text-steel-400">Fecha</th>
                <th className="text-center py-2 px-3 text-steel-400">Hora</th>
              </tr>
            </thead>
            <tbody>
              {marcaciones.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-steel-500">
                    {cargando ? 'Cargando...' : 'No se encontraron marcaciones'}
                  </td>
                </tr>
              ) : (
                marcaciones.map(m => (
                  <tr key={m.id} className="border-b border-steel-800 hover:bg-steel-800/30">
                    <td className="py-2 px-3 text-steel-200">
                      {m.tbl_empleados?.tbl_usuarios?.nombres || '-'}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {m.tipo === 'ingreso' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          <HiOutlineLogin className="w-3 h-3" /> Ingreso
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          <HiOutlineLogout className="w-3 h-3" /> Salida
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center text-steel-300">
                      {new Date(m.fecha_hora).toLocaleDateString('es-PE')}
                    </td>
                    <td className="py-2 px-3 text-center text-steel-300">
                      {new Date(m.fecha_hora).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {marcaciones.length > 0 && (
          <p className="mt-3 text-xs text-steel-500 text-right">
            {marcaciones.length} registro{marcaciones.length !== 1 ? 's' : ''} encontrado{marcaciones.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
