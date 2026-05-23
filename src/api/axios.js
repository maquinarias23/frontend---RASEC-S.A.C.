import axios from 'axios';
import { SESION_EXPIRADA_FLAG_KEY } from '../config/constants';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const tokenPrevio = localStorage.getItem('token');
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      // Sólo marcamos expiración si había una sesión activa: así evitamos
      // mostrar el toast cuando el 401 viene de un login fallido.
      if (tokenPrevio) {
        try {
          sessionStorage.setItem(SESION_EXPIRADA_FLAG_KEY, '1');
        } catch {
          // sessionStorage puede fallar en modo privado; continuar igualmente
        }
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
