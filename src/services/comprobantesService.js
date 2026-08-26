import api from '../api/axios';

export const comprobantesService = {
  emitir: (body) => api.post('/comprobantes/emitir', body),
  emitirNota: (body) => api.post('/comprobantes/emitir-nota', body),
  listarPorVenta: (ventaId) => api.get(`/comprobantes/venta/${ventaId}`),
  listarTodos: (params = {}) => api.get('/comprobantes', { params }),
  consultar: (id) => api.post(`/comprobantes/${id}/consultar`),
  anular: (id, motivo) => api.post(`/comprobantes/${id}/anular`, { motivo }),
  reintentar: (id) => api.post(`/comprobantes/${id}/reintentar`),
  descargarPdf: (id) => api.get(`/comprobantes/${id}/pdf`),
  mensajeWhatsapp: (id) => api.get(`/comprobantes/${id}/whatsapp`),
};

export const configFacturacionService = {
  obtener: () => api.get('/config-facturacion'),
  // Solo los datos del emisor que se imprimen (sin token del proveedor):
  // accesible para cualquier usuario que exporte una cotizacion.
  obtenerEmisor: () => api.get('/config-facturacion/emisor'),
  actualizar: (body) => api.put('/config-facturacion', body),
  crearSerie: (body) => api.post('/config-facturacion/series', body),
  listarSeries: (params = {}) => api.get('/config-facturacion/series', { params }),
  toggleSerie: (id) => api.put(`/config-facturacion/series/${id}/toggle`),
};
