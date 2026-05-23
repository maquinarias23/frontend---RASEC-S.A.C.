import { HiExclamation } from 'react-icons/hi';
import { createPortal } from 'react-dom';

export default function DialogConfirmacion({ abierto, titulo = '¿Estás seguro?', mensaje = 'Esta acción no se puede deshacer.', onConfirmar, onCancelar, children, tipo = 'peligro' }) {
  if (!abierto) return null;

  const colores = {
    peligro: { icono: 'bg-red-500/15 text-red-600', boton: 'bg-red-600 hover:bg-red-500' },
    advertencia: { icono: 'bg-amber-500/15 text-amber-600', boton: 'bg-amber-600 hover:bg-amber-500' },
    info: { icono: 'bg-blue-500/15 text-blue-600', boton: 'bg-blue-600 hover:bg-blue-500' },
  };
  const c = colores[tipo] || colores.peligro;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancelar} />
      <div className="relative bg-steel-900 rounded-xl border border-steel-700/60 shadow-steel p-6 max-w-sm w-full mx-4 animate-slide-up">
        <div className="flex flex-col items-center text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${c.icono} mb-4`}>
            <HiExclamation className="w-6 h-6" />
          </div>
          <h3 className="font-display text-xl tracking-wider text-steel-100 mb-2">{titulo}</h3>
          <p className="text-sm text-steel-400 mb-6">{mensaje}</p>
          {children}
          <div className="flex gap-3 w-full">
            <button onClick={onCancelar} className="flex-1 btn-secondary text-sm">Cancelar</button>
            <button onClick={onConfirmar} className={`flex-1 px-4 py-2 text-white rounded-lg text-sm font-medium transition-all ${c.boton}`}>Confirmar</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
