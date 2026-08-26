// Conversión de importes a letras para documentos comerciales
// ("SON: NOVECIENTOS CON 00/100 SOLES"). Se usa en la exportación de
// cotizaciones, donde el monto escrito es la práctica habitual en Perú.

const UNIDADES = [
  '', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS',
  'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE',
];

const DECENAS = [
  '', '', 'VEINTI', 'TREINTA', 'CUARENTA', 'CINCUENTA',
  'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA',
];

const CENTENAS = [
  '', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
  'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS',
];

const MAX_SOPORTADO = 999999999;

function decenasALetras(n) {
  if (n <= 20) return UNIDADES[n];
  const decena = Math.floor(n / 10);
  const unidad = n % 10;
  if (unidad === 0) return DECENAS[decena];
  // 21-29 se escriben unidos ("VEINTIUNO"); del 31 en adelante van con "Y".
  if (decena === 2) return `${DECENAS[2]}${UNIDADES[unidad]}`;
  return `${DECENAS[decena]} Y ${UNIDADES[unidad]}`;
}

function centenasALetras(n) {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';
  const centena = Math.floor(n / 100);
  const resto = n % 100;
  const prefijo = CENTENAS[centena];
  const sufijo = decenasALetras(resto);
  return [prefijo, sufijo].filter(Boolean).join(' ');
}

function milesALetras(n) {
  if (n === 0) return 'CERO';
  const millones = Math.floor(n / 1000000);
  const miles = Math.floor((n % 1000000) / 1000);
  const resto = n % 1000;

  const partes = [];
  if (millones > 0) {
    partes.push(millones === 1 ? 'UN MILLON' : `${centenasALetras(millones)} MILLONES`);
  }
  if (miles > 0) {
    partes.push(miles === 1 ? 'MIL' : `${centenasALetras(miles)} MIL`);
  }
  if (resto > 0) partes.push(centenasALetras(resto));

  // "UNO" solo se apocopa cuando acompaña al sustantivo (UN MILLON, VEINTIUN MIL).
  return partes.join(' ').replace(/UNO MIL/g, 'UN MIL');
}

/**
 * Convierte un importe a su expresión en letras con el formato usado en
 * comprobantes peruanos: "NOVECIENTOS CON 00/100 SOLES".
 *
 * @param {number|string} valor - Importe a convertir.
 * @param {string} moneda - Nombre de la moneda en plural ("SOLES", "DOLARES").
 * @returns {string} Importe en letras, en mayúsculas.
 */
export function numeroALetras(valor, moneda = 'SOLES') {
  const numero = Math.abs(parseFloat(valor) || 0);
  const entera = Math.floor(numero);
  // Redondeo sobre el importe completo: evita que 0.005 se pierda al truncar.
  const decimal = Math.round((numero - entera) * 100);
  // El redondeo puede empujar los céntimos a 100 (p. ej. 9.999 → 10 con 00/100).
  const enteraFinal = decimal === 100 ? entera + 1 : entera;
  const decimalFinal = decimal === 100 ? 0 : decimal;

  if (enteraFinal > MAX_SOPORTADO) return '';

  const centimos = String(decimalFinal).padStart(2, '0');
  return `${milesALetras(enteraFinal)} CON ${centimos}/100 ${moneda}`;
}

export default numeroALetras;
