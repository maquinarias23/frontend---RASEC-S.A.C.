const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000';

// Patrón para detectar URLs directas de S3/Wasabi y extraer el key
const S3_URL_PATTERN = /^https?:\/\/[^/]+\/[^/]+\/(.+)$/;

export function buildMediaUrl(urlArchivo) {
  if (!urlArchivo) return null;
  // URL directa de S3/Wasabi → convertir a ruta del backend para evitar 403
  if (urlArchivo.startsWith('http')) {
    const match = urlArchivo.match(S3_URL_PATTERN);
    if (match) return `${BACKEND_URL}/uploads/${match[1]}`;
    return urlArchivo;
  }
  // Ruta relativa legacy (/uploads/...)
  return `${BACKEND_URL}${urlArchivo}`;
}

export { BACKEND_URL };
