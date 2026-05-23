import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function useCrud(endpoint) {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(false);

  const listar = useCallback(async (params = {}) => {
    setCargando(true);
    try {
      const { data } = await api.get(endpoint, { params });
      setDatos(Array.isArray(data) ? data : (data.datos || data.data || []));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cargar datos');
    } finally {
      setCargando(false);
    }
  }, [endpoint]);

  const crear = async (body, config = {}) => {
    try {
      const { data } = await api.post(endpoint, body, config);
      toast.success('Registro creado');
      await listar();
      return data;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear');
      throw err;
    }
  };

  const actualizar = async (id, body) => {
    try {
      const { data } = await api.put(`${endpoint}/${id}`, body);
      toast.success('Registro actualizado');
      await listar();
      return data;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al actualizar');
      throw err;
    }
  };

  const eliminar = async (id) => {
    try {
      await api.delete(`${endpoint}/${id}`);
      toast.success('Registro eliminado');
      await listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
      throw err;
    }
  };

  useEffect(() => {
    listar();
  }, [listar]);

  return { datos, cargando, listar, crear, actualizar, eliminar };
}
