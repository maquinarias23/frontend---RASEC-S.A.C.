import { HiX } from 'react-icons/hi';
import { createPortal } from 'react-dom';

export default function Modal({ abierto, cerrar, titulo, children, ancho = 'max-w-lg', bloquearCierre = false }) {
  if (!abierto) return null;

  const handleCerrar = bloquearCierre ? undefined : cerrar;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={handleCerrar} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`relative bg-steel-900 rounded-xl border border-steel-700/60 shadow-steel w-full ${ancho} z-10 animate-slide-up`}>
          {/* Red accent top */}
          <div className="h-[2px] bg-gradient-to-r from-primary-500 via-primary-600 to-transparent rounded-t-xl" />
          <div className="flex items-center justify-between px-6 py-4 border-b border-steel-800/60">
            <h3 className="font-display text-xl tracking-wider text-steel-100">{titulo}</h3>
            <button onClick={handleCerrar} disabled={bloquearCierre} className={`transition-colors p-1 rounded-lg ${bloquearCierre ? 'text-steel-600 cursor-not-allowed' : 'text-steel-400 hover:text-steel-100 hover:bg-steel-800'}`}>
              <HiX className="w-5 h-5" />
            </button>
          </div>
          <div className="px-6 py-4">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
