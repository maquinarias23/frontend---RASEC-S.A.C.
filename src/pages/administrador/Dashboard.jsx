import { useState, useEffect } from 'react';
import { HiOutlineShoppingCart, HiOutlineCash, HiOutlineUsers, HiOutlineCube, HiOutlineClock } from 'react-icons/hi';
import api from '../../api/axios';
import TarjetaResumen from '../../components/ui/TarjetaResumen';
import GraficaBarras from '../../components/ui/GraficaBarras';
import { formatearMoneda } from '../../utils/formato';

export default function DashboardAdmin() {
  const [resumen, setResumen] = useState({});
  const [ventasDia, setVentasDia] = useState([]);
  const [topProductos, setTopProductos] = useState([]);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [dashRes, ventasRes, prodRes] = await Promise.all([
          api.get('/reportes/dashboard').catch(() => ({ data: {} })),
          api.get('/reportes/ventas-por-dia').catch(() => ({ data: [] })),
          api.get('/reportes/productos-mas-vendidos').catch(() => ({ data: [] })),
        ]);
        setResumen(dashRes.data || {});
        setVentasDia(Array.isArray(ventasRes.data) ? ventasRes.data.slice(-7) : []);
        setTopProductos(Array.isArray(prodRes.data) ? prodRes.data.slice(0, 5) : []);
      } catch { /* */ }
    };
    cargar();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-steel-100 font-display tracking-wider mb-6">Dashboard Administrador</h1>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
        <TarjetaResumen titulo="Ventas del Mes" valor={resumen.ventas_mes || 0} icono={HiOutlineShoppingCart} color="green" />
        <TarjetaResumen titulo="Monto del Mes" valor={formatearMoneda(resumen.monto_mes || 0)} icono={HiOutlineCash} color="blue" />
        <TarjetaResumen titulo="Total Clientes" valor={resumen.total_clientes || 0} icono={HiOutlineUsers} color="purple" />
        <TarjetaResumen titulo="Total Productos" valor={resumen.total_productos || 0} icono={HiOutlineCube} color="yellow" />
        <TarjetaResumen titulo="Ventas Pendientes" valor={resumen.ventas_pendientes || 0} icono={HiOutlineClock} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <GraficaBarras datos={ventasDia.map(v => ({ label: v.dia?.split('T')[0] || v.dia, valor: v.cantidad || 0 }))}
            campoLabel="label" campoValor="valor" titulo="Ventas por Día (Última Semana)" color="bg-primary-500" />
        </div>
        <div className="card">
          <GraficaBarras datos={topProductos.map(p => ({ label: p.nombre, valor: p.cantidad_vendida || 0 }))}
            campoLabel="label" campoValor="valor" titulo="Top 5 Productos Más Vendidos" color="bg-emerald-500" />
        </div>
      </div>
    </div>
  );
}
