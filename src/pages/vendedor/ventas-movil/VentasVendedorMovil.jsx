import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { HiOutlinePlus, HiOutlineSearch, HiOutlineX, HiOutlineRefresh } from 'react-icons/hi';
import TarjetaVentaMovil from './TarjetaVentaMovil';
import NuevaVentaMovil from './NuevaVentaMovil';
import DetalleVentaMovil from './DetalleVentaMovil';
import PagoMovil from './PagoMovil';
import Modal from '../../../components/ui/Modal';
import DialogConfirmacion from '../../../components/ui/DialogConfirmacion';
import ModalEditarCliente from '../../../components/shared/ModalEditarCliente';
import { ESTADO_VENTA } from '../../../config/constants';
import toast from 'react-hot-toast';

// Por encima de las hojas a pantalla completa (70-90), para que un modal
// lanzado desde dentro de una hoja quede visible.
const Z_SOBRE_HOJAS = 120;

const POR_TANDA = 15;

const FILTROS = [
  { id: 'todas', label: 'Todas' },
  { id: 'saldo', label: 'Con saldo' },
  { id: ESTADO_VENTA.ACTIVA, label: 'Activas' },
  { id: ESTADO_VENTA.PENDIENTE_APROBACION, label: 'Por aprobar' },
  { id: ESTADO_VENTA.CERRADA, label: 'Cerradas' },
  { id: ESTADO_VENTA.RECHAZADA, label: 'Rechazadas' },
  { id: ESTADO_VENTA.CANCELADA, label: 'Canceladas' },
];

/**
 * Vista de ventas del vendedor para celular.
 *
 * Toda la lógica —búsquedas, cálculos, validaciones y llamadas al backend—
 * vive en `VentasVendedor` y llega aquí en `vm`. Este archivo solo decide cómo
 * se ve y se toca en una pantalla de mano: la tabla pasa a tarjetas, los
 * modales a hojas completas y la acción principal a un botón flotante. No hay
 * una sola regla de negocio duplicada, así que ambas vistas no pueden
 * divergir.
 */
export default function VentasVendedorMovil({ vm }) {
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todas');
  const [visibles, setVisibles] = useState(POR_TANDA);

  // Filtro y buscador son ayudas de navegación locales: recortan lo que se
  // pinta, nunca lo que el backend devuelve.
  const ventasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return vm.datos.filter((v) => {
      if (filtro === 'saldo') {
        if (!(parseFloat(v.saldo_pendiente || 0) > 0)) return false;
      } else if (filtro !== 'todas' && v.estado_venta !== filtro) {
        return false;
      }
      if (!q) return true;
      return (
        String(v.id).includes(q) ||
        v.tbl_clientes?.nombre?.toLowerCase().includes(q) ||
        String(v.tbl_clientes?.dni || '').toLowerCase().includes(q)
      );
    });
  }, [vm.datos, busqueda, filtro]);

  // Cambiar de criterio vuelve a la primera tanda: seguir en la tanda 4 tras
  // filtrar dejaría la lista aparentemente vacía.
  const cambiarBusqueda = (valor) => { setBusqueda(valor); setVisibles(POR_TANDA); };
  const cambiarFiltro = (valor) => { setFiltro(valor); setVisibles(POR_TANDA); };

  const mostradas = ventasFiltradas.slice(0, visibles);
  const hayMas = ventasFiltradas.length > visibles;

  return (
    <div className="-mx-4 -my-4 pb-28">
      {/* ---- ENCABEZADO ---- */}
      <div className="px-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl leading-none tracking-wider text-steel-100">
              Mis Ventas
            </h1>
            <p className="mt-1 text-xs text-steel-400">
              {vm.datos.length} venta{vm.datos.length !== 1 ? 's' : ''} registrada
              {vm.datos.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => vm.listar()}
            aria-label="Actualizar"
            className="shrink-0 p-2.5 rounded-full border border-steel-700 bg-steel-900 text-steel-400 active:bg-steel-800"
          >
            <HiOutlineRefresh className={`w-5 h-5 ${vm.cargando ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* ---- BUSCADOR ---- */}
        <div className="relative mt-3">
          <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-steel-500" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => cambiarBusqueda(e.target.value)}
            placeholder="Buscar por n.º, cliente o DNI"
            className="input-movil pl-11 pr-11"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => cambiarBusqueda('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-steel-500"
            >
              <HiOutlineX className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* ---- CHIPS DE FILTRO ---- */}
      <div className="mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => cambiarFiltro(f.id)}
            className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors ${
              filtro === f.id
                ? 'border-primary-500 bg-primary-500 text-white'
                : 'border-steel-700 bg-steel-900 text-steel-400'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ---- LISTA ---- */}
      <div className="mt-3 px-4">
        {vm.cargando ? (
          <div className="flex justify-center py-16">
            <div className="w-9 h-9 border-4 border-steel-800 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : mostradas.length === 0 ? (
          <p className="py-16 text-center text-sm text-steel-500">
            {vm.datos.length === 0
              ? 'No tienes ventas registradas.'
              : 'Ninguna venta coincide con el filtro.'}
          </p>
        ) : (
          <div className="space-y-3">
            {mostradas.map((venta) => (
              <TarjetaVentaMovil
                key={venta.id}
                venta={venta}
                voucherRechazado={vm.tieneVoucherRechazado(venta)}
                permitePago={vm.ventaPermitePago(venta)}
                permiteCancelacion={vm.ventaPermiteCancelacion(venta)}
                onVer={() => vm.verDetalle(venta.id)}
                onPagar={() => vm.abrirModalPago(venta)}
                onCancelar={() => {
                  vm.setConfirmCancelar(venta.id);
                  vm.setMotivoCancelacion('');
                }}
              />
            ))}

            {hayMas && (
              <button
                type="button"
                onClick={() => setVisibles((n) => n + POR_TANDA)}
                className="btn-movil-secundario"
              >
                Ver más ({ventasFiltradas.length - visibles} restantes)
              </button>
            )}
          </div>
        )}
      </div>

      {/* ---- BOTÓN FLOTANTE: NUEVA VENTA ----
          Va por portal: el contenedor del layout conserva un `transform` de su
          animación de entrada, y eso ancla cualquier `position: fixed` hijo al
          contenedor en vez de a la pantalla. Fuera del árbol, el botón queda
          realmente fijo mientras se recorre la lista. */}
      {createPortal(
        <button
          type="button"
          onClick={vm.abrirNuevaVenta}
          className="fixed right-4 z-40 flex items-center gap-2 rounded-full bg-primary-500 pl-4 pr-5 py-4 text-sm font-bold text-white shadow-xl shadow-primary-500/40 active:scale-95 transition-transform"
          style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
          <HiOutlinePlus className="w-5 h-5" /> Nueva venta
        </button>,
        document.body
      )}

      {/* ---- HOJAS ---- */}
      <NuevaVentaMovil key={vm.modalNuevaVenta ? 'abierta' : 'cerrada'} vm={vm} />
      <DetalleVentaMovil vm={vm} />
      <PagoMovil vm={vm} nivel={1} />

      {/* ---- DIÁLOGOS COMPARTIDOS ---- */}
      <DialogConfirmacion
        abierto={!!vm.confirmCancelar}
        zIndex={Z_SOBRE_HOJAS}
        titulo="Cancelar venta"
        mensaje={
          <span className="block space-y-3">
            <span className="block">
              ¿Seguro de cancelar la venta <strong>#{vm.confirmCancelar}</strong>? Se revertirán
              stock, puntos y caja.
            </span>
            <span className="block text-left">
              <span className="mb-1 block text-xs font-medium text-steel-300">
                Motivo de cancelación
              </span>
              <input
                type="text"
                className="input-movil"
                placeholder="Motivo (opcional)"
                value={vm.motivoCancelacion}
                onChange={(e) => vm.setMotivoCancelacion(e.target.value)}
              />
            </span>
          </span>
        }
        onConfirmar={vm.cancelarVenta}
        onCancelar={() => { vm.setConfirmCancelar(null); vm.setMotivoCancelacion(''); }}
        tipo="peligro"
      />

      <ModalEditarCliente
        abierto={vm.modalCrearCliente}
        cerrar={() => vm.setModalCrearCliente(false)}
        cliente={null}
        onGuardado={vm.onClienteCreado}
        zIndex={Z_SOBRE_HOJAS}
      />

      <Modal
        abierto={!!vm.tarjetaCredenciales}
        cerrar={() => vm.setTarjetaCredenciales(null)}
        titulo="Credenciales del cliente"
        zIndex={Z_SOBRE_HOJAS}
      >
        {vm.tarjetaCredenciales && (
          <div className="space-y-4">
            <p className="text-sm text-steel-300">
              Envía estos datos al cliente para que acceda al portal:
            </p>
            <div className="rounded-xl border-2 border-primary-200 bg-gradient-to-br from-primary-50 to-blue-50 p-4">
              <h3 className="text-center font-bold text-primary-800">RASEK SAKA — Acceso Cliente</h3>
              <div className="mt-3 space-y-2 rounded-lg bg-steel-800 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-steel-400">Usuario:</span>
                  <span className="font-mono font-bold text-steel-200 break-all text-right">
                    {vm.tarjetaCredenciales.usuario}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-steel-400">Contraseña:</span>
                  <span className="font-mono font-bold text-steel-200 break-all text-right">
                    {vm.tarjetaCredenciales.contrasena}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const texto = `RASEK SAKA - Credenciales\nUsuario: ${vm.tarjetaCredenciales.usuario}\nContraseña: ${vm.tarjetaCredenciales.contrasena}`;
                navigator.clipboard.writeText(texto);
                toast.success('Credenciales copiadas al portapapeles');
              }}
              className="btn-movil-primario"
            >
              Copiar credenciales
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
