import { TELEFONO_INPUT, WHATSAPP } from '../config/constants';

const soloDigitos = (v) => (v == null ? '' : String(v)).replace(/\D/g, '');

// Los teléfonos se persisten sin código de país (TELEFONO_INPUT.MAX_DIGITS dígitos);
// wa.me exige el formato internacional. Un número que ya excede esa longitud y
// empieza por el código de país se asume internacional. Devuelve null si no hay dígitos.
export const aFormatoInternacional = (telefono) => {
  const digits = soloDigitos(telefono);
  if (!digits) return null;
  const yaInternacional =
    digits.length > TELEFONO_INPUT.MAX_DIGITS && digits.startsWith(WHATSAPP.CODIGO_PAIS);
  return yaInternacional ? digits : `${WHATSAPP.CODIGO_PAIS}${digits}`;
};

// True si el teléfono tiene la longitud exacta que exige la app, con o sin código de país.
export const telefonoEsValido = (telefono) => {
  const digits = soloDigitos(telefono);
  if (digits.length === TELEFONO_INPUT.MAX_DIGITS) return true;
  return (
    digits.startsWith(WHATSAPP.CODIGO_PAIS) &&
    digits.length === WHATSAPP.CODIGO_PAIS.length + TELEFONO_INPUT.MAX_DIGITS
  );
};

// URL del chat de un número concreto (cliente), con el mensaje precargado.
export const construirUrlWhatsapp = (telefono, mensaje) => {
  const numero = aFormatoInternacional(telefono);
  if (!numero) return null;
  const texto = mensaje ? `?text=${encodeURIComponent(mensaje)}` : '';
  return `${WHATSAPP.BASE_URL}/${numero}${texto}`;
};

// URL del chat de la empresa (número propio, ya en formato internacional en el env).
// Usada por la landing y el catálogo público.
export const construirUrlWhatsappEmpresa = (mensaje) =>
  `${WHATSAPP.BASE_URL}/${WHATSAPP.NUMERO_EMPRESA}?text=${encodeURIComponent(mensaje)}`;

// Abre el chat de WhatsApp del número indicado con el mensaje precargado.
// Devuelve false si el teléfono no permite construir la URL.
export const abrirWhatsapp = (telefono, mensaje) => {
  const url = construirUrlWhatsapp(telefono, mensaje);
  if (!url) return false;
  window.open(url, '_blank');
  return true;
};
