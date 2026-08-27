import { EMPRESA, TELEFONO_INPUT } from '../config/constants';
import { configFacturacionService } from '../services/comprobantesService';

// ---------------------------------------------------------------------------
// Identidad de la empresa para los documentos que se imprimen o se guardan como
// PDF (cotizaciones, reportes). El RUC, la razon social, la direccion y el
// telefono salen de Administrador → Facturacion: son los mismos datos del
// emisor que usan los comprobantes electronicos, para no tener dos sitios donde
// mantener lo mismo.
//
// Ambos valores se cachean por sesion: un mismo usuario exporta varios
// documentos seguidos y no tiene sentido volver a pedir el logo ni el emisor.
// ---------------------------------------------------------------------------

let logoDataUrlCache = null;
let emisorCache = null;

export const EMISOR_VACIO = { ruc: '', razonSocial: '', direccion: '', telefono: '' };

/**
 * Trae del modulo de Facturacion los datos del emisor que se imprimen. Si la
 * peticion falla, el documento sale igual con la identidad de la empresa y sin
 * las lineas de contacto: exportar nunca se cae por esto.
 */
export async function obtenerEmisor() {
  if (emisorCache) return emisorCache;
  try {
    const { data } = await configFacturacionService.obtenerEmisor();
    emisorCache = {
      ruc: data?.ruc_emisor || '',
      razonSocial: data?.razon_social_emisor || '',
      direccion: data?.direccion_emisor || '',
      telefono: data?.telefono_emisor ? (TELEFONO_INPUT.format(data.telefono_emisor) || data.telefono_emisor) : '',
    };
    return emisorCache;
  } catch {
    return EMISOR_VACIO;
  }
}

/**
 * Descarga el logo y lo convierte a data URL. Si falla (offline, 404), cae a la
 * URL absoluta para que el documento siga saliendo con logo cuando haya red.
 *
 * Hace falta el base64 porque el documento generado vive en about:blank: una
 * ruta relativa no tendria base URL, y una URL remota podria llegar tarde al
 * dialogo de impresion.
 */
export async function obtenerLogoDataUrl() {
  if (logoDataUrlCache) return logoDataUrlCache;
  const urlAbsoluta = new URL(EMPRESA.LOGO_URL, window.location.origin).href;
  try {
    const respuesta = await fetch(urlAbsoluta);
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    const blob = await respuesta.blob();
    logoDataUrlCache = await new Promise((resolver, rechazar) => {
      const lector = new FileReader();
      lector.onload = () => resolver(lector.result);
      lector.onerror = () => rechazar(lector.error);
      lector.readAsDataURL(blob);
    });
    return logoDataUrlCache;
  } catch {
    return urlAbsoluta;
  }
}
