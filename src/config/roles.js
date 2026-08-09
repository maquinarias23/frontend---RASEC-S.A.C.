export const ROLES = {
  SUPER_ADMINISTRADOR: 'SUPER_ADMINISTRADOR',
  ADMINISTRADOR: 'ADMINISTRADOR',
  SECRETARIA: 'SECRETARIA',
  SUPERVISION_VENTA: 'SUPERVISION_VENTA',
  VENDEDOR: 'VENDEDOR',
  ALMACEN: 'ALMACEN',
  CHOFER: 'CHOFER',
  MARKETING_INOVACION: 'MARKETING_INOVACION',
  CLIENTE: 'CLIENTE',
};

export const RUTAS_POR_ROL = {
  SUPER_ADMINISTRADOR: '/super-administrador/dashboard',
  ADMINISTRADOR: '/administrador/dashboard',
  SECRETARIA: '/secretaria/dashboard',
  SUPERVISION_VENTA: '/supervision/dashboard',
  VENDEDOR: '/vendedor/dashboard',
  ALMACEN: '/almacen/dashboard',
  CHOFER: '/chofer/dashboard',
  MARKETING_INOVACION: '/marketing/dashboard',
  CLIENTE: '/cliente/dashboard',
};

export const getRutaInicio = (rol) => RUTAS_POR_ROL[rol] || '/login';
