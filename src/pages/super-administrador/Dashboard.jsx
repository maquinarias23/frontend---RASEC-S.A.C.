import { useState, useEffect } from 'react';
import { HiOutlineUsers, HiOutlineShieldCheck, HiOutlineShoppingCart, HiOutlineCash, HiOutlineCube, HiOutlineClipboardList, HiOutlineOfficeBuilding, HiOutlineTruck } from 'react-icons/hi';
import api from '../../api/axios';
import TarjetaResumen from '../../components/ui/TarjetaResumen';
import GraficaBarras from '../../components/ui/GraficaBarras';
import { formatearMoneda } from '../../utils/formato';
import { ESTADO_TRACKING } from '../../config/constants';

const TRACKING_CONFIG = [
  { estado: ESTADO_TRACKING.PEDIDO_REGISTRADO, titulo: 'Pedido Registrado', icono: HiOutlineClipboardList, color: 'yellow' },
  { estado: ESTADO_TRACKING.ALMACEN, titulo: 'En Almacen', icono: HiOutlineOfficeBuilding, color: 'blue' },
  { estado: ESTADO_TRACKING.DEJADO_EN_AGENCIA, titulo: 'Dejado en Agencia', icono: HiOutlineTruck, color: 'green' },
];

export default function DashboardSuperAdmin() {
  const [resumen, setResumen] = useState({});
  const [tracking, setTracking] = useState({});
  const [ventasDia, setVentasDia] = useState([]);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [resumenRes, dashRes, ventasRes] = await Promise.all([
          api.get('/reportes/resumen-dashboard').catch(() => ({ data: {} })),
          api.get('/reportes/dashboard').catch(() => ({ data: {} })),
          api.get('/reportes/ventas-por-dia').catch(() => ({ data: [] })),
        ]);
        setResumen(resumenRes.data || {});
        const pedidos = dashRes.data?.pedidos_por_estado || [];
        const map = {};
        pedidos.forEach(p => { map[p.estado_tracking] = p._count; });
        setTracking(map);
        setVentasDia(Array.isArray(ventasRes.data) ? ventasRes.data.slice(-7) : []);
      } catch { /* */ }
    };
    cargar();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-steel-100 font-display tracking-wider mb-6">Dashboard Super Administrador</h1>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <TarjetaResumen titulo="Ventas del Mes" valor={resumen.ventas_mes || 0} icono={HiOutlineShoppingCart} color="green" />
        <TarjetaResumen titulo="Monto del Mes" valor={formatearMoneda(resumen.monto_mes || 0)} icono={HiOutlineCash} color="blue" />
        <TarjetaResumen titulo="Total Clientes" valor={resumen.total_clientes || 0} icono={HiOutlineUsers} color="purple" />
        <TarjetaResumen titulo="Total Productos" valor={resumen.total_productos || 0} icono={HiOutlineCube} color="yellow" />
        <TarjetaResumen titulo="Ventas Pendientes" valor={resumen.ventas_pendientes || 0} icono={HiOutlineShieldCheck} color="red" />
      </div>

      <h2 className="text-lg font-bold text-steel-200 mb-4">Ventas por Estado de Tracking</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {TRACKING_CONFIG.map(cfg => (
          <TarjetaResumen key={cfg.estado} titulo={cfg.titulo} valor={tracking[cfg.estado] || 0} icono={cfg.icono} color={cfg.color} />
        ))}
      </div>

      {ventasDia.length > 0 && (
        <div className="card">
          <GraficaBarras datos={ventasDia.map(v => ({ label: v.dia?.split('T')[0] || v.dia, valor: v.cantidad || 0 }))}
            campoLabel="label" campoValor="valor" titulo="Ventas por Dia (Ultima Semana)" color="bg-primary-500" />
        </div>
      )}
    </div>
  );
}
