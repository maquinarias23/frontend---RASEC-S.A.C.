import { useState, useCallback, useEffect } from 'react';
import api from '../api/axios';
import { CARRITO_STORAGE_KEY } from '../config/constants';

export default function useCarritoPublico() {
  const [carrito, setCarrito] = useState(null);
  const [cargando, setCargando] = useState(false);

  const getToken = () => localStorage.getItem(CARRITO_STORAGE_KEY);
  const setToken = (token) => localStorage.setItem(CARRITO_STORAGE_KEY, token);
  const clearToken = () => localStorage.removeItem(CARRITO_STORAGE_KEY);

  const cargarCarrito = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setCarrito(null);
      return;
    }
    setCargando(true);
    try {
      const { data } = await api.get(`/carritos-web/${token}`);
      setCarrito(data);
    } catch {
      clearToken();
      setCarrito(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarCarrito();
  }, [cargarCarrito]);

  const agregarItem = useCallback(async (productoId, cantidad = 1) => {
    setCargando(true);
    try {
      let token = getToken();

      if (!token) {
        const { data: nuevoCarrito } = await api.post('/carritos-web');
        token = nuevoCarrito.token_sesion;
        setToken(token);
      }

      await api.put(`/carritos-web/${token}/items`, {
        producto_id: productoId,
        cantidad,
      });

      await cargarCarrito();
    } catch (err) {
      setCargando(false);
      throw err;
    }
  }, [cargarCarrito]);

  const eliminarItem = useCallback(async (productoId) => {
    const token = getToken();
    if (!token) return;
    setCargando(true);
    try {
      await api.delete(`/carritos-web/${token}/items/${productoId}`);
      await cargarCarrito();
    } catch (err) {
      setCargando(false);
      throw err;
    }
  }, [cargarCarrito]);

  const finalizar = useCallback(async (nombre, telefono) => {
    const token = getToken();
    if (!token) throw new Error('No hay carrito activo');
    setCargando(true);
    try {
      const { data } = await api.post(`/carritos-web/${token}/finalizar`, {
        nombre_cliente: nombre,
        telefono_cliente: telefono,
      });
      clearToken();
      setCarrito(null);
      return data;
    } catch (err) {
      setCargando(false);
      throw err;
    }
  }, []);

  const limpiar = useCallback(() => {
    clearToken();
    setCarrito(null);
  }, []);

  const totalItems = carrito?.items
    ? carrito.items.reduce((sum, item) => sum + item.cantidad, 0)
    : 0;

  return {
    carrito,
    cargando,
    totalItems,
    cargarCarrito,
    agregarItem,
    eliminarItem,
    finalizar,
    limpiar,
  };
}
