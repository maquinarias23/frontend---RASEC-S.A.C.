export function formatearMoneda(valor, decimales = 2) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valor || 0);
}

export function formatearFecha(fecha) {
  if (!fecha) return '-';
  // @db.Date fields: Prisma devuelve "2026-03-01T00:00:00.000Z" (medianoche UTC)
  // new Date() + timeZone Lima (UTC-5) muestra el día anterior → desfase -1 día
  // Fix: detectar fechas puras y formatear sin conversión de timezone
  const str = String(fecha);
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})(T00:00:00(\.000)?Z)?$/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return new Intl.DateTimeFormat('es-PE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Lima',
  }).format(new Date(fecha));
}

export function formatearFechaHora(fecha) {
  if (!fecha) return '-';
  return new Intl.DateTimeFormat('es-PE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Lima',
  }).format(new Date(fecha));
}

export function formatearNumero(valor) {
  return new Intl.NumberFormat('es-PE').format(valor || 0);
}

export function formatearFechaHoraPrecisa(fecha) {
  if (!fecha) return '-';
  return new Intl.DateTimeFormat('es-PE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Lima',
  }).format(new Date(fecha));
}

// Solo la hora (zona Lima). Se usa cuando fecha y hora van en columnas
// separadas, como en el historial de ajustes de inventario.
export function formatearHora(fecha) {
  if (!fecha) return '-';
  return new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Lima',
  }).format(new Date(fecha));
}
