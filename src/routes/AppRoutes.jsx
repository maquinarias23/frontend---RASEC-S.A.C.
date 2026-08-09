import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import ClienteLayout from '../components/layout/ClienteLayout';
import RutaProtegida from '../components/layout/RutaProtegida';
import { ROLES } from '../config/roles';

// Públicas
import LandingPage from '../pages/public/LandingPage';
import CatalogoPublico from '../pages/public/CatalogoPublico';
import NosotrosPage from '../pages/public/NosotrosPage';
import ComoComprarPage from '../pages/public/ComoComprarPage';
import FaqPage from '../pages/public/FaqPage';
import Login from '../pages/auth/Login';
import NoAutorizado from '../pages/auth/NoAutorizado';

// Super Administrador
import DashboardSuperAdmin from '../pages/super-administrador/Dashboard';
import Usuarios from '../pages/super-administrador/Usuarios';
import Configuracion from '../pages/super-administrador/Configuracion';
import CombosSuperAdmin from '../pages/super-administrador/CombosSuperAdmin';
import ConfigLanding from '../pages/super-administrador/ConfigLanding';

// Administrador
import DashboardAdmin from '../pages/administrador/Dashboard';
import VentasAdmin from '../pages/administrador/Ventas';
import ClientesAdmin from '../pages/administrador/Clientes';
import ProductosAdmin from '../pages/administrador/Productos';
import InventarioAdmin from '../pages/administrador/Inventario';
import ImportacionesAdmin from '../pages/administrador/importaciones/ImportacionesPage';
import ComprasAdmin from '../pages/administrador/Compras';
import ProveedoresAdmin from '../pages/administrador/Proveedores';
import CajaAdmin from '../pages/administrador/Caja';
import PromocionesAdmin from '../pages/administrador/Promociones';
import PuntosAdmin from '../pages/administrador/Puntos';
import RRHHAdmin from '../pages/administrador/RRHH';
import ReportesAdmin from '../pages/administrador/Reportes';
import ConfiguracionPrecios from '../pages/administrador/ConfiguracionPrecios';
import ClienteDetalle360 from '../pages/administrador/ClienteDetalle360';
import AnalisisMarketing from '../pages/administrador/AnalisisMarketing';
import AlmacenesAdmin from '../pages/administrador/Almacenes';
import ConfigFacturacion from '../pages/administrador/ConfigFacturacion';
import Transportistas from '../pages/administrador/Transportistas';

// Secretaria
import DashboardSecretaria from '../pages/secretaria/Dashboard';
import Facturas from '../pages/secretaria/Facturas';
import VentasSecretaria from '../pages/secretaria/VentasSecretaria';
import ReportesSecretaria from '../pages/secretaria/ReportesSecretaria';
import RRHHSecretaria from '../pages/secretaria/RRHHSecretaria';

// Supervisión
import DashboardSupervision from '../pages/supervision/Dashboard';
import VentasSupervision from '../pages/supervision/VentasSupervision';
import ReportesSupervision from '../pages/supervision/ReportesSupervision';
import ConfigSupervision from '../pages/supervision/ConfigSupervision';

// Vendedor
import DashboardVendedor from '../pages/vendedor/Dashboard';
import VentasVendedor from '../pages/vendedor/VentasVendedor';
import ClientesVendedor from '../pages/vendedor/ClientesVendedor';
import BancoFotosVendedor from '../pages/vendedor/BancoFotos';
import Cotizaciones from '../pages/vendedor/Cotizaciones';
import Prospectos from '../pages/vendedor/Prospectos';
import InventarioVendedor from '../pages/vendedor/InventarioVendedor';
import CombosVendedor from '../pages/vendedor/CombosVendedor';
import ComisionesVendedor from '../pages/vendedor/ComisionesVendedor';

// Almacén
import DashboardAlmacen from '../pages/almacen/Dashboard';
import Despacho from '../pages/almacen/Despacho';
import BancoFotosAlmacen from '../pages/almacen/BancoFotosAlmacen';
import InventarioAlmacen from '../pages/almacen/InventarioAlmacen';
import RecepcionCompras from '../pages/almacen/RecepcionCompras';
import RecepcionImportaciones from '../pages/almacen/RecepcionImportaciones';
import EscanerSalida from '../pages/almacen/EscanerSalida';

// Marketing e Innovación
import DashboardMarketing from '../pages/marketing/Dashboard';

// Control de Asistencia
import DashboardControlAsistencia from '../pages/control-asistencia/Dashboard';
import EscanerQr from '../pages/control-asistencia/EscanerQr';
import HistorialMarcaciones from '../pages/control-asistencia/HistorialMarcaciones';

// Chofer
import DashboardChofer from '../pages/chofer/Dashboard';
import Entregas from '../pages/chofer/Entregas';
import CompraNacional from '../pages/chofer/CompraNacional';

// Cliente
import DashboardCliente from '../pages/cliente/Dashboard';
import Catalogo from '../pages/cliente/Catalogo';
import DetalleProducto from '../pages/cliente/DetalleProducto';
import MisPedidos from '../pages/cliente/MisPedidos';
import Tracking from '../pages/cliente/Tracking';
import MisPuntos from '../pages/cliente/MisPuntos';
import ProximosIngresosCliente from '../pages/cliente/ProximosIngresos';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/catalogo-web" element={<CatalogoPublico />} />
      <Route path="/nosotros" element={<NosotrosPage />} />
      <Route path="/como-comprar" element={<ComoComprarPage />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/no-autorizado" element={<NoAutorizado />} />

      {/* Super Administrador */}
      <Route element={<RutaProtegida rolesPermitidos={[ROLES.SUPER_ADMINISTRADOR]} />}>
        <Route element={<AppLayout />}>
          <Route path="/super-administrador/dashboard" element={<DashboardSuperAdmin />} />
          <Route path="/super-administrador/usuarios" element={<Usuarios />} />
          <Route path="/super-administrador/configuracion" element={<Configuracion />} />
          <Route path="/super-administrador/combos" element={<CombosSuperAdmin />} />
          <Route path="/super-administrador/config-landing" element={<ConfigLanding />} />
        </Route>
      </Route>

      {/* Administrador */}
      <Route element={<RutaProtegida rolesPermitidos={[ROLES.SUPER_ADMINISTRADOR, ROLES.ADMINISTRADOR]} />}>
        <Route element={<AppLayout />}>
          <Route path="/administrador/dashboard" element={<DashboardAdmin />} />
          <Route path="/administrador/ventas" element={<VentasAdmin />} />
          <Route path="/administrador/clientes" element={<ClientesAdmin />} />
          <Route path="/administrador/clientes/:id" element={<ClienteDetalle360 />} />
          <Route path="/administrador/productos" element={<ProductosAdmin />} />
          <Route path="/administrador/configuracion-precios" element={<ConfiguracionPrecios />} />
          <Route path="/administrador/inventario" element={<InventarioAdmin />} />
          <Route path="/administrador/importaciones" element={<ImportacionesAdmin />} />
          <Route path="/administrador/proveedores" element={<ProveedoresAdmin />} />
          <Route path="/administrador/compras" element={<ComprasAdmin />} />
          <Route path="/administrador/caja" element={<CajaAdmin />} />
          <Route path="/administrador/promociones" element={<PromocionesAdmin />} />
          <Route path="/administrador/puntos" element={<PuntosAdmin />} />
          <Route path="/administrador/rrhh" element={<RRHHAdmin />} />
          <Route path="/administrador/reportes" element={<ReportesAdmin />} />
          <Route path="/administrador/almacenes" element={<AlmacenesAdmin />} />
          <Route path="/administrador/config-facturacion" element={<ConfigFacturacion />} />
        </Route>
      </Route>

      {/* Secretaria */}
      <Route element={<RutaProtegida rolesPermitidos={[ROLES.SUPER_ADMINISTRADOR, ROLES.ADMINISTRADOR, ROLES.SECRETARIA]} />}>
        <Route element={<AppLayout />}>
          <Route path="/secretaria/dashboard" element={<DashboardSecretaria />} />
          <Route path="/secretaria/facturas" element={<Facturas />} />
          <Route path="/secretaria/ventas" element={<VentasSecretaria />} />
          <Route path="/secretaria/reportes" element={<ReportesSecretaria />} />
          <Route path="/secretaria/rrhh" element={<RRHHSecretaria />} />
        </Route>
      </Route>

      {/* Supervisión de Venta */}
      <Route element={<RutaProtegida rolesPermitidos={[ROLES.SUPER_ADMINISTRADOR, ROLES.ADMINISTRADOR, ROLES.SUPERVISION_VENTA]} />}>
        <Route element={<AppLayout />}>
          <Route path="/supervision/dashboard" element={<DashboardSupervision />} />
          <Route path="/supervision/ventas" element={<VentasSupervision />} />
          <Route path="/supervision/reportes" element={<ReportesSupervision />} />
          <Route path="/supervision/configuracion" element={<ConfigSupervision />} />
          <Route path="/administrador/transportistas" element={<Transportistas />} />
        </Route>
      </Route>

      {/* Vendedor */}
      <Route element={<RutaProtegida rolesPermitidos={[ROLES.SUPER_ADMINISTRADOR, ROLES.ADMINISTRADOR, ROLES.VENDEDOR]} />}>
        <Route element={<AppLayout />}>
          <Route path="/vendedor/dashboard" element={<DashboardVendedor />} />
          <Route path="/vendedor/ventas" element={<VentasVendedor />} />
          <Route path="/vendedor/clientes" element={<ClientesVendedor />} />
          <Route path="/vendedor/clientes/:id" element={<ClienteDetalle360 />} />
          <Route path="/vendedor/banco-fotos" element={<BancoFotosVendedor />} />
          <Route path="/vendedor/cotizaciones" element={<Cotizaciones />} />
          <Route path="/vendedor/prospectos" element={<Prospectos />} />
          <Route path="/vendedor/inventario" element={<InventarioVendedor />} />
          <Route path="/vendedor/combos" element={<CombosVendedor />} />
          <Route path="/vendedor/comisiones" element={<ComisionesVendedor />} />
        </Route>
      </Route>

      {/* Almacén */}
      <Route element={<RutaProtegida rolesPermitidos={[ROLES.SUPER_ADMINISTRADOR, ROLES.ADMINISTRADOR, ROLES.ALMACEN]} />}>
        <Route element={<AppLayout />}>
          <Route path="/almacen/dashboard" element={<DashboardAlmacen />} />
          <Route path="/almacen/despacho" element={<Despacho />} />
          <Route path="/almacen/entregas" element={<Entregas />} />
          <Route path="/almacen/escaner-salida" element={<EscanerSalida />} />
          <Route path="/almacen/recepcion" element={<RecepcionCompras />} />
          <Route path="/almacen/recepcion-importaciones" element={<RecepcionImportaciones />} />
          <Route path="/almacen/banco-fotos" element={<BancoFotosAlmacen />} />
          <Route path="/almacen/inventario" element={<InventarioAlmacen />} />
        </Route>
      </Route>

      {/* Control de Asistencia (solo admins) */}
      <Route element={<RutaProtegida rolesPermitidos={[ROLES.SUPER_ADMINISTRADOR, ROLES.ADMINISTRADOR]} />}>
        <Route element={<AppLayout />}>
          <Route path="/control-asistencia/dashboard" element={<DashboardControlAsistencia />} />
          <Route path="/control-asistencia/escaner" element={<EscanerQr />} />
          <Route path="/control-asistencia/historial" element={<HistorialMarcaciones />} />
        </Route>
      </Route>

      {/* Marketing e Innovación (dashboard + módulo Análisis Mkt) */}
      <Route element={<RutaProtegida rolesPermitidos={[ROLES.SUPER_ADMINISTRADOR, ROLES.ADMINISTRADOR, ROLES.MARKETING_INOVACION]} />}>
        <Route element={<AppLayout />}>
          <Route path="/marketing/dashboard" element={<DashboardMarketing />} />
          <Route path="/administrador/analisis-marketing" element={<AnalisisMarketing />} />
        </Route>
      </Route>

      {/* Chofer */}
      <Route element={<RutaProtegida rolesPermitidos={[ROLES.SUPER_ADMINISTRADOR, ROLES.ADMINISTRADOR, ROLES.CHOFER]} />}>
        <Route element={<AppLayout />}>
          <Route path="/chofer/dashboard" element={<DashboardChofer />} />
          <Route path="/chofer/entregas" element={<Entregas />} />
          <Route path="/chofer/compras-disponibles" element={<CompraNacional />} />
        </Route>
      </Route>

      {/* Cliente — Layout premium exclusivo */}
      <Route element={<RutaProtegida rolesPermitidos={[ROLES.SUPER_ADMINISTRADOR, ROLES.ADMINISTRADOR, ROLES.CLIENTE]} />}>
        <Route element={<ClienteLayout />}>
          <Route path="/cliente/dashboard" element={<DashboardCliente />} />
          <Route path="/catalogo" element={<Catalogo />} />
          <Route path="/catalogo/:id" element={<DetalleProducto />} />
          <Route path="/cliente/pedidos" element={<MisPedidos />} />
          <Route path="/cliente/tracking" element={<Tracking />} />
          <Route path="/cliente/proximos-ingresos" element={<ProximosIngresosCliente />} />
          <Route path="/cliente/puntos" element={<MisPuntos />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
