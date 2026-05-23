import { useEffect, useRef } from 'react';
import useAuthStore from '../store/authStore';
import {
  INACTIVIDAD_SESION_MS,
  INACTIVIDAD_THROTTLE_MS,
  SESION_EXPIRADA_FLAG_KEY,
} from '../config/constants';

const EVENTOS_ACTIVIDAD = [
  'mousemove',
  'mousedown',
  'keydown',
  'click',
  'scroll',
  'touchstart',
  'wheel',
];

export default function useInactivityLogout() {
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const timerRef = useRef(null);
  const ultimoResetRef = useRef(0);

  useEffect(() => {
    if (!token) return undefined;

    const expirar = () => {
      try {
        sessionStorage.setItem(SESION_EXPIRADA_FLAG_KEY, '1');
      } catch {
        // sessionStorage puede fallar en modo privado; continuar de todos modos
      }
      logout();
      window.location.href = '/login';
    };

    const reiniciar = () => {
      const ahora = Date.now();
      if (ahora - ultimoResetRef.current < INACTIVIDAD_THROTTLE_MS) return;
      ultimoResetRef.current = ahora;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(expirar, INACTIVIDAD_SESION_MS);
    };

    reiniciar();
    EVENTOS_ACTIVIDAD.forEach((ev) => window.addEventListener(ev, reiniciar, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      EVENTOS_ACTIVIDAD.forEach((ev) => window.removeEventListener(ev, reiniciar));
    };
  }, [token, logout]);
}
