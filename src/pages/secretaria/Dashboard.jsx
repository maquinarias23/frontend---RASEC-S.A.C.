import { useState, useEffect } from 'react';
import { HiOutlineDocumentText, HiOutlineShoppingCart, HiOutlineCash } from 'react-icons/hi';
import api from '../../api/axios';
import TarjetaResumen from '../../components/ui/TarjetaResumen';
import { formatearMoneda } from '../../utils/formato';

export default function DashboardSecretaria() {
  const [resumen, setResumen] = useState({});

  useEffect(() => {
    api.get('/reportes/dashboard').then(r => setResumen(r.data || {})).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-steel-100 font-display tracking-wider mb-6">Dashboard Secretaria</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TarjetaResumen titulo="Ventas del Mes" valor={resumen.ventas_mes || 0} icono={HiOutlineShoppingCart} color="green" />
        <TarjetaResumen titulo="Monto del Mes" valor={formatearMoneda(resumen.monto_mes || 0)} icono={HiOutlineCash} color="blue" />
        <TarjetaResumen titulo="Ventas Pendientes" valor={resumen.ventas_pendientes || 0} icono={HiOutlineDocumentText} color="yellow" />
      </div>
    </div>
  );
}
