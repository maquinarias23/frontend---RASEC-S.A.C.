import { useState, useEffect, useCallback } from 'react';
import {
  HiOutlineUsers, HiOutlineShieldCheck, HiOutlineShoppingCart, HiOutlineCash,
  HiOutlineCube, HiOutlineClipboardList, HiOutlineOfficeBuilding, HiOutlineTruck,
  HiOutlineDocumentDownload, HiOutlineDocumentText,
} from 'react-icons/hi';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import TarjetaResumen from '../../components/ui/TarjetaResumen';
import GraficaBarras from '../../components/ui/GraficaBarras';
import { formatearMoneda } from '../../utils/formato';
import { ESTADO_TRACKING } from '../../config/constants';
import useAuthStore from '../../store/authStore';
import {
  prepararDatosDashboard,
  exportarDashboardExcel,
  exportarDashboardPDF,
} from '../../utils/exportarDashboard';

const TRACKING_CONFIG = [
  { estado: ESTADO_TRACKING.PEDIDO_REGISTRADO, titulo: 'Pedido Registrado', icono: HiOutlineClipboardList, color: 'yellow' },
  { estado: ESTADO_TRACKING.ALMACEN, titulo: 'En Almacen', icono: HiOutlineOfficeBuilding, color: 'blue' },
  { estado: ESTADO_TRACKING.DEJADO_EN_AGENCIA, titulo: 'Dejado en Agencia', icono: HiOutlineTruck, color: 'green' },
];

export default function DashboardSuperAdmin() {
  const usuario = useAuthStore((s) => s.usuario);
  const [resumen, setResumen] = useState({});
  const [dash, setDash] = useState({});
  const [ventasDia, setVentasDia] = useState([]);
  const [exportando, setExportando] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [resumenRes, dashRes, ventasRes] = await Promise.all([
          api.get('/reportes/resumen-dashboard').catch(() => ({ data: {} })),
          api.get('/reportes/dashboard').catch(() => ({ data: {} })),
          api.get('/reportes/ventas-por-dia').catch(() => ({ data: [] })),
        ]);
        setResumen(resumenRes.data || {});
        setDash(dashRes.data || {});
        setVentasDia(Array.isArray(ventasRes.data) ? ventasRes.data : []);
      } catch { /* el dashboard se muestra igual con lo que haya cargado */ }
    };
    cargar();
  }, []);

  const tracking = {};
  (dash.pedidos_por_estado || []).forEach((p) => { tracking[p.estado_tracking] = p._count; });
  const ultimaSemana = ventasDia.slice(-7);

  /**
   * Reúne TODO lo que va al reporte. El ranking de vendedores, los productos
   * más vendidos y los clientes frecuentes no se pintan en el dashboard, así
   * que se piden aquí, al exportar, en lugar de cargarlos siempre.
   */
  const reunirDatos = useCallback(async () => {
    const [rankingRes, productosRes, clientesRes] = await Promise.all([
      api.get('/reportes/ranking-vendedores').catch(() => ({ data: [] })),
      api.get('/reportes/productos-mas-vendidos').catch(() => ({ data: [] })),
      api.get('/reportes/clientes-frecuentes').catch(() => ({ data: [] })),
    ]);
    return prepararDatosDashboard({
      resumen,
      dash,
      ventasDia,
      ranking: rankingRes.data,
      productos: productosRes.data,
      clientes: clientesRes.data,
    });
  }, [resumen, dash, ventasDia]);

  const exportar = async (formato) => {
    setExportando(formato);
    try {
      const datos = await reunirDatos();
      if (formato === 'excel') {
        exportarDashboardExcel(datos);
        toast.success('Excel descargado');
      } else {
        const destino = await exportarDashboardPDF(datos, { usuario: usuario?.nombres });
        toast.success(
          destino === 'ventana'
            ? 'Reporte abierto: usa "Guardar como PDF"'
            : 'Se abrió el diálogo de impresión: elige "Guardar como PDF"'
        );
      }
    } catch (err) {
      console.error('Error al exportar dashboard:', err);
      toast.error('No se pudo generar el reporte');
    } finally {
      setExportando(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-steel-100 font-display tracking-wider">
          Dashboard Super Administrador
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => exportar('excel')}
            disabled={exportando !== null}
            className="btn-secondary !py-2 !text-xs flex items-center gap-1.5 disabled:opacity-50"
            title="Descargar el reporte completo en Excel"
          >
            <HiOutlineDocumentDownload className="w-4 h-4" />
            {exportando === 'excel' ? 'Generando…' : 'Exportar Excel'}
          </button>
          <button
            onClick={() => exportar('pdf')}
            disabled={exportando !== null}
            className="btn-primary !py-2 !text-xs flex items-center gap-1.5 disabled:opacity-50"
            title="Abrir el reporte para imprimir o guardar como PDF"
          >
            <HiOutlineDocumentText className="w-4 h-4" />
            {exportando === 'pdf' ? 'Generando…' : 'Exportar PDF'}
          </button>
        </div>
      </div>

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

      {ultimaSemana.length > 0 && (
        <div className="card">
          <GraficaBarras datos={ultimaSemana.map(v => ({ label: v.dia?.split('T')[0] || v.dia, valor: v.cantidad || 0 }))}
            campoLabel="label" campoValor="valor" titulo="Ventas por Dia (Ultima Semana)" color="bg-primary-500" />
        </div>
      )}
    </div>
  );
}
