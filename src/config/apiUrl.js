// =============================================================================
// URL base del backend
// - Si VITE_API_URL está definida, manda (despliegue con dominio propio, Railway).
// - Si no, se deriva del host por el que se abrió la app: el mismo build sirve
//   para la PC servidor y para la red local, sin recompilar ni tocar el .env
//   (http://192.168.x.x:5173  ->  http://192.168.x.x:4000/api).
// El puerto del backend se puede cambiar con VITE_API_PORT (default 4000).
// =============================================================================

const PUERTO_BACKEND = import.meta.env.VITE_API_PORT?.trim() || '4000';

function resolverApiUrl() {
  const configurada = import.meta.env.VITE_API_URL?.trim();
  if (configurada) return configurada.replace(/\/+$/, '');

  if (typeof window !== 'undefined' && window.location?.hostname) {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:${PUERTO_BACKEND}/api`;
  }

  return `http://localhost:${PUERTO_BACKEND}/api`;
}

export const API_URL = resolverApiUrl();

// Raíz del backend (sin /api), para /uploads y demás recursos estáticos.
export const BACKEND_URL = API_URL.replace(/\/api$/, '');
