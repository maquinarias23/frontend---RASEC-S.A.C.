import { buildMediaUrl } from './media';

// Los PDF de los comprobantes viven en S3/Wasabi. `buildMediaUrl` los reescribe
// a /uploads/* del backend, que firma la URL y redirige: pegarle directo a la
// URL de S3 devuelve 403 cuando el bucket no es público.

// Tiempo que se mantiene vivo el iframe (y su blob) después de lanzar el
// diálogo de impresión. Revocarlo antes deja la vista previa en blanco.
const MS_VIDA_IFRAME = 60000;
// Corte para no dejar un iframe colgado si el PDF nunca termina de cargar.
const MS_TIMEOUT_CARGA = 20000;

const MSG_POPUP_BLOQUEADO =
  'El navegador bloqueó la ventana del PDF. Permite las ventanas emergentes de este sitio e inténtalo de nuevo.';

/**
 * Abre el PDF en una pestaña nueva (visor del navegador, con su botón de
 * imprimir). Devuelve false si no hay archivo o si el navegador bloqueó la
 * ventana emergente, para que quien llama avise en vez de fallar en silencio.
 * Llámalo dentro del manejador del clic: tras un await se pierde el gesto del
 * usuario y el bloqueador de pop-ups actúa.
 */
export function abrirPdf(urlArchivo) {
  const url = buildMediaUrl(urlArchivo);
  if (!url) return false;
  return !!window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Lanza el diálogo de impresión del navegador para un PDF remoto.
 *
 * El PDF se descarga a un blob y se imprime desde un iframe oculto: un iframe
 * apuntando a la URL remota es cross-origin y `contentWindow.print()` lanzaría
 * SecurityError, mientras que un `blob:` es del mismo origen y sí se puede
 * imprimir. Si la descarga o el print fallan (CORS, Safari, bloqueo de
 * pop-ups), se cae a abrir el PDF en una pestaña para que el usuario imprima
 * desde el visor.
 *
 * @param {string} urlArchivo - `pdf_url` del comprobante.
 * @returns {Promise<'dialogo'|'pestana'>} cómo se resolvió la impresión.
 */
export async function imprimirPdf(urlArchivo) {
  const url = buildMediaUrl(urlArchivo);
  if (!url) throw new Error('PDF no disponible');

  let blobUrl;
  try {
    const respuesta = await fetch(url, { credentials: 'omit' });
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    blobUrl = URL.createObjectURL(await respuesta.blob());
  } catch {
    // Sin acceso al contenido desde JS no hay diálogo posible: queda el visor.
    if (!abrirPdf(urlArchivo)) throw new Error(MSG_POPUP_BLOQUEADO);
    return 'pestana';
  }

  try {
    await imprimirDesdeIframe(blobUrl);
    return 'dialogo';
  } catch {
    const ventana = window.open(blobUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(blobUrl), MS_VIDA_IFRAME);
    if (!ventana) throw new Error(MSG_POPUP_BLOQUEADO);
    return 'pestana';
  }
}

function imprimirDesdeIframe(blobUrl) {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = blobUrl;

    let resuelto = false;
    const limpiar = () => {
      iframe.remove();
      URL.revokeObjectURL(blobUrl);
    };

    const temporizador = setTimeout(() => {
      if (resuelto) return;
      resuelto = true;
      limpiar();
      reject(new Error('El PDF no cargó a tiempo'));
    }, MS_TIMEOUT_CARGA);

    iframe.onload = () => {
      if (resuelto) return;
      resuelto = true;
      clearTimeout(temporizador);
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        // print() es bloqueante en la mayoría de navegadores, pero Chrome
        // devuelve el control antes de que el usuario cierre la vista previa:
        // el iframe se retira después, no de inmediato.
        setTimeout(limpiar, MS_VIDA_IFRAME);
        resolve();
      } catch (error) {
        limpiar();
        reject(error);
      }
    };

    iframe.onerror = () => {
      if (resuelto) return;
      resuelto = true;
      clearTimeout(temporizador);
      limpiar();
      reject(new Error('No se pudo cargar el PDF'));
    };

    document.body.appendChild(iframe);
  });
}
