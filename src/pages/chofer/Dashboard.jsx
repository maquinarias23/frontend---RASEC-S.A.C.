import { useEffect, useState } from 'react';
import { HiOutlineTruck, HiOutlineShoppingCart, HiOutlineClipboardList } from 'react-icons/hi';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import TarjetaResumen from '../../components/ui/TarjetaResumen';
import { RUTAS_CHOFER } from '../../config/constants';

export default function DashboardChofer() {
  const [pendientes, setPendientes] = useState(0);
  const [pedidosIncompletos, setPedidosIncompletos] = useState(0);
  const [comprasDisponibles, setComprasDisponibles] = useState(0);

  useEffect(() => {
    api.get('/almacen/envios-chofer').then(r => {
      const datos = Array.isArray(r.data) ? r.data : [];
      setPendientes(datos.length);
    }).catch(() => {});

    api.get('/compras/chofer/pedidos-incompletos').then(r => {
      const datos = r.data?.pedidos || [];
      setPedidosIncompletos(datos.length);
    }).catch(() => {});

    api.get('/compras/chofer/compras-nacionales-disponibles').then(r => {
      const datos = r.data?.compras || [];
      setComprasDisponibles(datos.length);
    }).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-steel-100 font-display tracking-wider mb-6">Dashboard Chofer</h1>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to={RUTAS_CHOFER.ENTREGAS}>
          <TarjetaResumen titulo="Entregas pendientes" valor={pendientes} icono={HiOutlineTruck} color="yellow" />
        </Link>
        <Link to={RUTAS_CHOFER.ENTREGAS}>
          <TarjetaResumen titulo="Pedidos por completar" valor={pedidosIncompletos} icono={HiOutlineClipboardList} color="red" />
        </Link>
        <Link to={RUTAS_CHOFER.COMPRAS_DISPONIBLES}>
          <TarjetaResumen titulo="Compras nacionales disponibles" valor={comprasDisponibles} icono={HiOutlineShoppingCart} color="yellow" />
        </Link>
      </div>
    </div>
  );
}
