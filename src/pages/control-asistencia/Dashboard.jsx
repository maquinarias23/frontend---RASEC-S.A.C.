import { useState, useEffect } from 'react';
import { HiOutlineQrcode, HiOutlineClipboardList, HiOutlineUserGroup, HiOutlineLogin, HiOutlineLogout } from 'react-icons/hi';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import TarjetaResumen from '../../components/ui/TarjetaResumen';

export default function DashboardControlAsistencia() {
  const [resumen, setResumen] = useState(null);

  useEffect(() => {
    api.get('/asistencia-qr/resumen-hoy')
      .then(r => setResumen(r.data))
      .catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-steel-100 font-display tracking-wider mb-6">
        Control de Asistencia
      </h1>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link to="/control-asistencia/escaner">
          <TarjetaResumen titulo="Escanear QR" valor="Abrir" icono={HiOutlineQrcode} color="primary" />
        </Link>
        <TarjetaResumen
          titulo="Empleados Presentes"
          valor={resumen?.empleados_presentes ?? '-'}
          icono={HiOutlineUserGroup}
          color="green"
        />
        <TarjetaResumen
          titulo="Sin Marcar Hoy"
          valor={resumen?.empleados_ausentes ?? '-'}
          icono={HiOutlineLogout}
          color="red"
        />
        <TarjetaResumen
          titulo="Total Marcaciones"
          valor={resumen?.total_marcaciones ?? '-'}
          icono={HiOutlineClipboardList}
          color="blue"
        />
      </div>

      {resumen?.detalle && resumen.detalle.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-steel-100 mb-4">Registro de Hoy</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-steel-700">
                  <th className="text-left py-2 px-3 text-steel-400">Empleado</th>
                  <th className="text-center py-2 px-3 text-steel-400">Ingreso</th>
                  <th className="text-center py-2 px-3 text-steel-400">Salida</th>
                  <th className="text-center py-2 px-3 text-steel-400">Estado</th>
                </tr>
              </thead>
              <tbody>
                {resumen.detalle.map(emp => (
                  <tr key={emp.employee_id} className="border-b border-steel-800 hover:bg-steel-800/30">
                    <td className="py-2 px-3 text-steel-200">{emp.nombres}</td>
                    <td className="py-2 px-3 text-center text-steel-300">
                      {emp.hora_ingreso ? new Date(emp.hora_ingreso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="py-2 px-3 text-center text-steel-300">
                      {emp.hora_salida ? new Date(emp.hora_salida).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {emp.ultima_marcacion === 'ingreso' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          <HiOutlineLogin className="w-3 h-3" /> Presente
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          <HiOutlineLogout className="w-3 h-3" /> Salió
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-4">
        <Link
          to="/control-asistencia/historial"
          className="text-primary-600 hover:text-primary-700 text-sm font-medium transition-colors"
        >
          Ver historial completo &rarr;
        </Link>
      </div>
    </div>
  );
}
