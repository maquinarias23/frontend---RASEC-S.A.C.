import { create } from 'zustand';
import api from '../api/axios';

const useNotificacionesStore = create((set, get) => ({
  notificaciones: [],
  noLeidas: 0,
  cargando: false,

  cargar: async () => {
    try {
      set({ cargando: true });
      const [{ data: lista }, { data: { count } }] = await Promise.all([
        api.get('/notificaciones'),
        api.get('/notificaciones/no-leidas'),
      ]);
      set({ notificaciones: lista, noLeidas: count, cargando: false });
    } catch {
      set({ cargando: false });
    }
  },

  marcarLeida: async (id) => {
    try {
      await api.patch(`/notificaciones/${id}/leer`);
      set(state => ({
        notificaciones: state.notificaciones.map(n => n.id === id ? { ...n, leida: true } : n),
        noLeidas: Math.max(0, state.noLeidas - 1),
      }));
    } catch { /* silenciar */ }
  },

  marcarTodasLeidas: async () => {
    try {
      await api.patch('/notificaciones/leer-todas');
      set(state => ({
        notificaciones: state.notificaciones.map(n => ({ ...n, leida: true })),
        noLeidas: 0,
      }));
    } catch { /* silenciar */ }
  },

  agregarNotificacion: (notificacion) => {
    set(state => ({
      notificaciones: [notificacion, ...state.notificaciones],
      noLeidas: state.noLeidas + 1,
    }));
  },
}));

export default useNotificacionesStore;
