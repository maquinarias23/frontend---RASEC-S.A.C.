import { useEffect, useRef } from 'react';
import useNotificacionesStore from '../store/notificacionesStore';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default function useSSE() {
  const token = useAuthStore(state => state.token);
  const agregarNotificacion = useNotificacionesStore(state => state.agregarNotificacion);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    const url = `${API_URL}/notificaciones/sse?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'nueva_notificacion' && data.notificacion) {
          agregarNotificacion(data.notificacion);
          toast(data.notificacion.titulo, { icon: '\uD83D\uDD14' });
        }
      } catch { /* ignorar mensajes malformados */ }
    };

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [token, agregarNotificacion]);
}
