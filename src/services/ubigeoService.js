import api from '../api/axios';

export const obtenerDepartamentos = () => api.get('/ubigeo/departamentos');

export const obtenerProvincias = (departamentoId) => api.get(`/ubigeo/provincias/${departamentoId}`);

export const obtenerDistritos = (provinciaId) => api.get(`/ubigeo/distritos/${provinciaId}`);
