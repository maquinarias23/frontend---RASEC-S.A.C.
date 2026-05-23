/**
 * Concatena varios Uint8Array en uno solo, sin copias intermedias.
 * Útil para ensamblar payloads binarios en cualquier protocolo (TSPL, ESC/POS,
 * ZPL, PPLB).
 */
export function concatBytes(...partes) {
  const total = partes.reduce((acc, p) => acc + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of partes) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}
