import { useState, useEffect } from 'react';
import { HiOutlineTruck, HiOutlineCube, HiOutlineCamera, HiOutlineClipboardList } from 'react-icons/hi';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import TarjetaResumen from '../../components/ui/TarjetaResumen';
import { ESTADO_COMPRA } from '../../config/constants';

export default function DashboardAlmacen() {
  const [pendientes, setPendientes] = useState(0);
  const [totalProductos, setTotalProductos] = useState(0);
  const [comprasPendientes, setComprasPendientes] = useState(0);

  useEffect(() => {
    const cargar = async () => {
      const [bandeja, dash, compras] = await Promise.all([
        api.get('/almacen/bandeja').catch(() => ({ data: [] })),
        api.get('/reportes/dashboard').catch(() => ({ data: {} })),
        api.get('/compras').catch(() => ({ data: [] })),
      ]);
      setPendientes(Array.isArray(bandeja.data) ? bandeja.data.length : 0);
      setTotalProductos(dash.data?.total_productos || 0);
      const listaCompras = Array.isArray(compras.data) ? compras.data : [];
      setComprasPendientes(listaCompras.filter((c) => c.estado === ESTADO_COMPRA.REGISTRADA).length);
    };
    cargar();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-steel-100 font-display tracking-wider mb-6">Dashboard Almacén</h1>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/almacen/recepcion">
          <TarjetaResumen titulo="Compras por Recibir" valor={comprasPendientes} icono={HiOutlineClipboardList} color="green" />
        </Link>
        <Link to="/almacen/despacho">
          <TarjetaResumen titulo="Pendientes Despacho" valor={pendientes} icono={HiOutlineTruck} color="yellow" />
        </Link>
        <Link to="/almacen/inventario">
          <TarjetaResumen titulo="Productos" valor={totalProductos} icono={HiOutlineCube} color="blue" />
        </Link>
        <Link to="/almacen/banco-fotos">
          <TarjetaResumen titulo="Banco Fotos" valor="Ver" icono={HiOutlineCamera} color="purple" />
        </Link>
      </div>
    </div>
  );
}
