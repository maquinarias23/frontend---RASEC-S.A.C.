import { useState, useEffect, useRef } from 'react';
import { HiMenuAlt2, HiOutlineBell } from 'react-icons/hi';
import useAuthStore from '../../store/authStore';
import useNotificacionesStore from '../../store/notificacionesStore';
import useSSE from '../../hooks/useSSE';

function formatDistanceToNow(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `Hace ${diffHrs}h`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return date.toLocaleDateString('es-PE');
}

export default function Navbar({ toggleSidebar }) {
  const { usuario } = useAuthStore();
  const { notificaciones, noLeidas, cargar, marcarLeida, marcarTodasLeidas } = useNotificacionesStore();
  const [panelAbierto, setPanelAbierto] = useState(false);
  const panelRef = useRef(null);

  useSSE();

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setPanelAbierto(false);
      }
    };
    if (panelAbierto) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [panelAbierto]);

  return (
    <header className="bg-steel-900/80 backdrop-blur-md border-b border-steel-800/60 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="lg:hidden text-steel-400 hover:text-steel-100 transition-colors p-1 rounded-lg hover:bg-steel-800"
        >
          <HiMenuAlt2 className="w-6 h-6" />
        </button>
        <div className="hidden sm:block">
          <p className="text-sm text-steel-400">
            Bienvenido, <span className="text-steel-100 font-medium">{usuario?.nombres}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setPanelAbierto(!panelAbierto)}
            className="relative text-steel-400 hover:text-steel-100 transition-colors p-2 rounded-lg hover:bg-steel-800"
          >
            <HiOutlineBell className="w-5 h-5" />
            {noLeidas > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-primary-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1">
                {noLeidas > 99 ? '99+' : noLeidas}
              </span>
            )}
          </button>

          {panelAbierto && (
            <div className="fixed top-16 left-3 right-3 sm:absolute sm:top-full sm:left-auto sm:right-0 sm:mt-2 sm:w-80 bg-steel-800 border border-steel-700 rounded-xl shadow-xl z-50 max-h-[70vh] sm:max-h-96 flex flex-col">
              <div className="flex items-center justify-between p-3 border-b border-steel-700">
                <h3 className="text-sm font-semibold text-steel-100">Notificaciones</h3>
                {noLeidas > 0 && (
                  <button onClick={marcarTodasLeidas} className="text-xs text-primary-400 hover:text-primary-300">
                    Marcar todas como leidas
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto">
                {notificaciones.length === 0 ? (
                  <p className="text-sm text-steel-500 text-center py-6">Sin notificaciones</p>
                ) : (
                  notificaciones.map(n => (
                    <div
                      key={n.id}
                      className={`p-3 border-b border-steel-700/50 cursor-pointer hover:bg-steel-700/30 transition-colors ${!n.leida ? 'bg-steel-700/20' : ''}`}
                      onClick={() => { if (!n.leida) marcarLeida(n.id); }}
                    >
                      <div className="flex items-start gap-2">
                        {!n.leida && <span className="w-2 h-2 bg-primary-500 rounded-full mt-1.5 shrink-0" />}
                        <div className={!n.leida ? '' : 'ml-4'}>
                          <p className="text-sm font-medium text-steel-100">{n.titulo}</p>
                          <p className="text-xs text-steel-400 mt-0.5">{n.mensaje}</p>
                          <p className="text-[10px] text-steel-500 mt-1">{formatDistanceToNow(n.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 text-white rounded-lg flex items-center justify-center text-sm font-bold shadow-forge">
          {usuario?.nombres?.charAt(0) || 'U'}
        </div>
      </div>
    </header>
  );
}
