import { useState, useEffect } from 'react';
import { HiOutlineShoppingCart, HiOutlineUsers, HiOutlineCash, HiOutlineCamera } from 'react-icons/hi';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import TarjetaResumen from '../../components/ui/TarjetaResumen';
import { formatearMoneda } from '../../utils/formato';

export default function DashboardVendedor() {
  const [resumen, setResumen] = useState({});

  useEffect(() => {
    api.get('/reportes/dashboard').then(r => setResumen(r.data || {})).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-steel-100 font-display tracking-wider mb-6">Dashboard Vendedor</h1>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TarjetaResumen titulo="Ventas del Mes" valor={resumen.ventas_mes || 0} icono={HiOutlineShoppingCart} color="green" />
        <TarjetaResumen titulo="Monto del Mes" valor={formatearMoneda(resumen.monto_mes || 0)} icono={HiOutlineCash} color="blue" />
        <TarjetaResumen titulo="Total Clientes" valor={resumen.total_clientes || 0} icono={HiOutlineUsers} color="purple" />
        <Link to="/vendedor/banco-fotos">
          <TarjetaResumen titulo="Banco Fotos" valor="Ver" icono={HiOutlineCamera} color="yellow" />
        </Link>
      </div>
    </div>
  );
}
