import { useState, useEffect } from 'react';
import { HiOutlineChartBar, HiOutlineShoppingCart, HiOutlineCash, HiOutlineUsers } from 'react-icons/hi';
import api from '../../api/axios';
import TarjetaResumen from '../../components/ui/TarjetaResumen';
import GraficaBarras from '../../components/ui/GraficaBarras';
import { formatearMoneda } from '../../utils/formato';

export default function DashboardSupervision() {
  const [resumen, setResumen] = useState({});
  const [vendedores, setVendedores] = useState([]);

  useEffect(() => {
    const cargar = async () => {
      const [dashRes, vendRes] = await Promise.all([
        api.get('/reportes/dashboard').catch(() => ({ data: {} })),
        api.get('/reportes/ranking-vendedores').catch(() => ({ data: [] })),
      ]);
      setResumen(dashRes.data || {});
      setVendedores(Array.isArray(vendRes.data) ? vendRes.data.slice(0, 10) : []);
    };
    cargar();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-steel-100 font-display tracking-wider mb-6">Dashboard Supervisión de Ventas</h1>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <TarjetaResumen titulo="Ventas del Mes" valor={resumen.ventas_mes || 0} icono={HiOutlineShoppingCart} color="green" />
        <TarjetaResumen titulo="Monto del Mes" valor={formatearMoneda(resumen.monto_mes || 0)} icono={HiOutlineCash} color="blue" />
        <TarjetaResumen titulo="Total Clientes" valor={resumen.total_clientes || 0} icono={HiOutlineUsers} color="purple" />
        <TarjetaResumen titulo="Ventas Pendientes" valor={resumen.ventas_pendientes || 0} icono={HiOutlineChartBar} color="red" />
      </div>
      {vendedores.length > 0 && (
        <div className="card">
          <GraficaBarras datos={vendedores} campoLabel="vendedor" campoValor="monto_total" titulo="Ranking de Vendedores" color="bg-emerald-500" />
        </div>
      )}
    </div>
  );
}
