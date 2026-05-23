import {
  PROTOCOLO_DEFAULT_ID,
  PROTOCOLO_DETECCION_PATTERNS,
  PROTOCOLOS_DISPONIBLES,
} from '../../config/constants';

/**
 * Heurística pura sobre el nombre del dispositivo BT. Devuelve el id del
 * protocolo inferido. Usa PROTOCOLO_DETECCION_PATTERNS como fuente de
 * verdad — no hay strings hardcodeados aquí.
 *
 * - Match case-insensitive con `includes()` por cada patrón.
 * - El primer protocolo que matchea gana (orden importa en el catálogo).
 * - Si nada matchea, devuelve PROTOCOLO_DEFAULT_ID (preserva EX58C en
 *   clones genéricos sin marca reconocible).
 */
export function detectarProtocoloPorNombre(nombre) {
  if (!nombre) return PROTOCOLO_DEFAULT_ID;
  const normalizado = String(nombre).toLowerCase();
  for (const { protocolo, patrones } of PROTOCOLO_DETECCION_PATTERNS) {
    if (patrones.some((p) => normalizado.includes(p.toLowerCase()))) {
      return protocolo;
    }
  }
  return PROTOCOLO_DEFAULT_ID;
}

/**
 * Verifica que un id de protocolo esté registrado. Usa el catálogo
 * PROTOCOLOS_DISPONIBLES — protege a los consumidores de IDs corruptos en
 * localStorage.
 */
export function esProtocoloValido(id) {
  return PROTOCOLOS_DISPONIBLES.some((p) => p.id === id);
}
