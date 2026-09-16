import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HiArrowLeft, HiX } from 'react-icons/hi';

/**
 * Contenedor a pantalla completa para los flujos de venta en celular.
 *
 * En un teléfono un modal centrado deja el contenido encajonado y, al abrirse
 * el teclado, el cuadro se desplaza fuera de vista. Aquí el patrón es el de una
 * "hoja": ocupa toda la pantalla, la cabecera y el pie quedan fijos —el pie es
 * la zona del pulgar, donde vive la acción principal— y solo el cuerpo hace
 * scroll.
 *
 * @param {boolean} abierta
 * @param {Function} cerrar
 * @param {string} titulo
 * @param {string} [subtitulo]
 * @param {React.ReactNode} [accionDerecha] - control extra en la cabecera.
 * @param {React.ReactNode} [encabezadoExtra] - franja bajo la cabecera (pasos, tabs).
 * @param {React.ReactNode} [pie] - barra fija inferior con las acciones.
 * @param {'atras'|'cerrar'} [icono] - flecha (navegación) o aspa (descarte).
 * @param {number} [nivel] - profundidad de apilado cuando una hoja abre otra.
 */
export default function HojaMovil({
  abierta,
  cerrar,
  titulo,
  subtitulo,
  accionDerecha,
  encabezadoExtra,
  pie,
  children,
  icono = 'atras',
  nivel = 0,
}) {
  // El fondo no debe hacer scroll detrás de la hoja. Al encadenar hojas, cada
  // una restaura el valor que encontró, así la última en cerrarse devuelve el
  // scroll original de la página.
  useEffect(() => {
    if (!abierta) return undefined;
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previo; };
  }, [abierta]);

  if (!abierta) return null;

  const Icono = icono === 'cerrar' ? HiX : HiArrowLeft;

  // La altura va en `style` con `100dvh`: sigue al teclado virtual y a la
  // barra de direcciones. `h-screen` queda de reserva para navegadores que no
  // conozcan la unidad.
  return createPortal(
    <div
      className="fixed inset-x-0 top-0 h-screen flex flex-col bg-steel-950 animate-slide-up"
      style={{ zIndex: 70 + nivel * 10, height: '100dvh' }}
    >
      <header className="shrink-0 bg-steel-900/95 backdrop-blur-md border-b border-steel-800 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-1.5 px-2 h-14">
          <button
            type="button"
            onClick={cerrar}
            aria-label="Volver"
            className="p-2.5 rounded-full text-steel-300 active:bg-steel-800 active:scale-95 transition-transform"
          >
            <Icono className="w-6 h-6" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg leading-tight tracking-wider text-steel-100 truncate">
              {titulo}
            </h2>
            {subtitulo && (
              <p className="text-[11px] leading-tight text-steel-400 truncate">{subtitulo}</p>
            )}
          </div>
          {accionDerecha}
        </div>
        {encabezadoExtra}
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>

      {pie && (
        <div className="shrink-0 border-t border-steel-800 bg-steel-900/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
          {pie}
        </div>
      )}
    </div>,
    document.body
  );
}
