import api from '../api/axios';

export const comprobantesService = {
  emitir: (body) => api.post('/comprobantes/emitir', body),
  emitirNota: (body) => api.post('/comprobantes/emitir-nota', body),
  listarPorVenta: (ventaId) => api.get(`/comprobantes/venta/${ventaId}`),
  listarTodos: (params = {}) => api.get('/comprobantes', { params }),
  consultar: (id) => api.post(`/comprobantes/${id}/consultar`),
  anular: (id, motivo) => api.post(`/comprobantes/${id}/anular`, { motivo }),
  // La baja es asíncrona en SUNAT: tras anular hay que consultar el ticket
  // hasta que responda para que el comprobante quede anulado de verdad.
  consultarBaja: (id) => api.post(`/comprobantes/${id}/consultar-baja`),
  reintentar: (id) => api.post(`/comprobantes/${id}/reintentar`),
  // Reenvía a SUNAT el XML de un comprobante que quedó sin CDR.
  reenviarSunat: (id) => api.post(`/comprobantes/${id}/reenviar-sunat`),
  descargarPdf: (id) => api.get(`/comprobantes/${id}/pdf`),
  mensajeWhatsapp: (id) => api.get(`/comprobantes/${id}/whatsapp`),
};

export const configFacturacionService = {
  obtener: () => api.get('/config-facturacion'),
  // Solo los datos del emisor que se imprimen (sin token del proveedor):
  // accesible para cualquier usuario que exporte una cotizacion.
  obtenerEmisor: () => api.get('/config-facturacion/emisor'),
  actualizar: (body) => api.put('/config-facturacion', body),
  // Obtiene y guarda el token Bearer con las credenciales del panel del proveedor.
  autenticar: (body) => api.post('/config-facturacion/autenticar', body),
  probarConexion: () => api.post('/config-facturacion/probar-conexion'),
  crearSerie: (body) => api.post('/config-facturacion/series', body),
  listarSeries: (params = {}) => api.get('/config-facturacion/series', { params }),
  toggleSerie: (id) => api.put(`/config-facturacion/series/${id}/toggle`),
};
