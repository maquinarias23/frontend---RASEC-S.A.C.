import { create } from 'zustand';
import api from '../api/axios';

const usePuntosStore = create((set) => ({
  saldo: 0,
  cargado: false,

  cargar: async () => {
    try {
      const { data } = await api.get('/puntos/mi-saldo');
      set({ saldo: data?.saldo || 0, cargado: true });
    } catch {
      set({ cargado: true });
    }
  },

  refrescar: async () => {
    try {
      const { data } = await api.get('/puntos/mi-saldo');
      set({ saldo: data?.saldo || 0 });
    } catch { /* silenciar */ }
  },

  reset: () => set({ saldo: 0, cargado: false }),
}));

export default usePuntosStore;
