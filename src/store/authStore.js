import { create } from 'zustand';
import api from '../api/axios';
import { CARRITO_STORAGE_KEY } from '../config/constants';

const useAuthStore = create((set, get) => ({
  usuario: JSON.parse(localStorage.getItem('usuario') || 'null'),
  token: localStorage.getItem('token') || null,
  cargando: false,
  error: null,

  login: async (correo, contrasena) => {
    set({ cargando: true, error: null });
    try {
      const { data } = await api.post('/auth/login', { correo, contrasena });
      localStorage.setItem('token', data.token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      set({ usuario: data.usuario, token: data.token, cargando: false });
      localStorage.removeItem(CARRITO_STORAGE_KEY);
      return data;
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al iniciar sesión';
      set({ error: msg, cargando: false });
      throw new Error(msg);
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    set({ usuario: null, token: null, error: null });
  },

  tienePermiso: (codigo) => {
    const { usuario } = get();
    if (!usuario?.permisos) return false;
    return usuario.permisos.some(p => p.codigo === codigo);
  },

  esRol: (...roles) => {
    const { usuario } = get();
    if (!usuario?.rol) return false;
    return roles.includes(usuario.rol);
  },
}));

export default useAuthStore;
