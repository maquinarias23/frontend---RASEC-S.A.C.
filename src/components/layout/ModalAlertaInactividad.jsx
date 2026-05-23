import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HiExclamationTriangle } from 'react-icons/hi2';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';
import useNotificacionesStore from '../../store/notificacionesStore';
import { ROLES } from '../../config/roles';

export default function ModalAlertaInactividad() {
  const usuario = useAuthStore(state => state.usuario);
  const marcarLeida = useNotificacionesStore(state => state.marcarLeida);
  const [alerta, setAlerta] = useState(null);

  useEffect(() => {
    if (!usuario || usuario.rol !== ROLES.VENDEDOR) return;

    let cancelado = false;

    const verificar = async () => {
      try {
        const { data } = await api.get('/notificaciones/alerta-inactividad');
        if (!cancelado && data.alerta) {
          setAlerta(data.alerta);
        }
      } catch {
        /* silenciar */
      }
    };

    verificar();

    return () => { cancelado = true; };
  }, [usuario]);

  const handleDismiss = async () => {
    if (alerta?.id) {
      await marcarLeida(alerta.id);
    }
    setAlerta(null);
  };

  if (!alerta) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      {/* Overlay oscuro — sin onClick para bloquear cierre */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-steel-900 rounded-xl border border-steel-700/60 shadow-steel w-full max-w-md z-10 animate-slide-up">
          {/* Barra accent amber */}
          <div className="h-[2px] bg-gradient-to-r from-amber-500 via-amber-600 to-transparent rounded-t-xl" />

          <div className="px-6 py-8 flex flex-col items-center text-center">
            {/* Icono warning */}
            <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mb-5">
              <HiExclamationTriangle className="w-8 h-8 text-amber-400" />
            </div>

            {/* Título */}
            <h3 className="font-display text-xl tracking-wider text-steel-100 mb-3">
              {alerta.titulo}
            </h3>

            {/* Mensaje */}
            <p className="text-steel-300 leading-relaxed mb-6">
              {alerta.mensaje}
            </p>

            {/* Botón de dismiss */}
            <button
              onClick={handleDismiss}
              className="btn-primary w-full py-3"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
