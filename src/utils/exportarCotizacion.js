import {
  EMPRESA,
  COTIZACION_EXPORT,
  ESTADO_COTIZACION,
  ESTADO_PROSPECTO,
  ORIGEN_COTIZACION,
  TELEFONO_INPUT,
} from '../config/constants';
import { formatearFecha } from './formato';
import { numeroALetras } from './numeroALetras';
import { EMISOR_VACIO, obtenerEmisor, obtenerLogoDataUrl } from './emisorDoc';

// ---------------------------------------------------------------------------
// Exportacion de la cotizacion a un documento A4 imprimible (Guardar como PDF).
//
// El documento calca la representacion impresa de la factura electronica que
// emite el proveedor: mismo encabezado (logo + razon social a la izquierda,
// recuadro de RUC / tipo de documento / numero a la derecha), la misma lista de
// datos "etiqueta : valor", la misma grilla Cant. | Unidad | Descripcion |
// P.Unit | Dto. | Total y el mismo pie de totales con el importe en letras. El
// cliente recibe asi la misma hoja cotice o compre.
//
// Se arma como HTML y se abre en una ventana propia: no depende de librerias de
// PDF ni del backend, y el usuario obtiene el archivo desde el dialogo de
// impresion del navegador ("Guardar como PDF").
//
// El logo (ya en base64) y los datos del emisor vienen de `emisorDoc`, que es
// donde se resuelve y se cachea la identidad de la empresa para los documentos.
// ---------------------------------------------------------------------------

const MS_ESPERA_MAXIMA = 3000;
const MS_ANTES_DE_IMPRIMIR = 150;
const MS_VIDA_IFRAME = 60000;
const LADO_LOGO_PX = 320;
// El cierre del <script> del documento generado va partido para que ningun
// empaquetador que inline este bundle en un HTML corte el script de la pagina.
const CIERRE_SCRIPT = `<${'/'}script>`;

function esc(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function aNumero(valor) {
  const n = parseFloat(valor);
  return Number.isFinite(n) ? n : 0;
}

// Importes sin simbolo de moneda: en la factura el "S/" vive en la cabecera de
// los totales, no repetido en cada celda.
function importe(valor) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(aNumero(valor));
}

const ESTADO_SELLO = {
  [ESTADO_COTIZACION.CONVERTIDA_A_VENTA]: { texto: 'CONVERTIDA A VENTA', clase: 'sello--ok' },
  [ESTADO_COTIZACION.CANCELADA]: { texto: 'ANULADA', clase: 'sello--no' },
};

const ESTADO_ETIQUETA = {
  [ESTADO_COTIZACION.PENDIENTE_WHATSAPP]: 'Vigente',
  [ESTADO_COTIZACION.CONVERTIDA_A_VENTA]: 'Convertida a venta',
  [ESTADO_COTIZACION.CANCELADA]: 'Anulada',
};

// El listado de cotizaciones ya llega con el estado mapeado por el backend,
// pero al exportar desde el modulo Prospectos el objeto trae su propio estado:
// se traduce aqui para que el documento hable siempre el mismo idioma.
const ESTADO_DESDE_PROSPECTO = {
  [ESTADO_PROSPECTO.CONVERTIDO]: ESTADO_COTIZACION.CONVERTIDA_A_VENTA,
  [ESTADO_PROSPECTO.PERDIDO]: ESTADO_COTIZACION.CANCELADA,
};

function resolverEstado(estado) {
  if (ESTADO_ETIQUETA[estado]) return estado;
  return ESTADO_DESDE_PROSPECTO[estado] || ESTADO_COTIZACION.PENDIENTE_WHATSAPP;
}

function unidadDeItem(item) {
  const codigo = item.tbl_productos?.unidad_medida || item.unidad_medida || '';
  return COTIZACION_EXPORT.UNIDAD_CORTA[codigo] || COTIZACION_EXPORT.UNIDAD_DEFECTO;
}

/**
 * Lleva la cotizacion (web o de prospecto) a un shape unico para el documento.
 * Acepta `items` (cotizacion web) o `items_cotizacion` (prospecto).
 */
function normalizarCotizacion(cotizacion) {
  const crudos = cotizacion.items || cotizacion.items_cotizacion || [];

  const items = crudos.map((item) => {
    const esRegalo = !!item.es_regalo;
    const cantidad = aNumero(item.cantidad);
    const precioUnitario = esRegalo ? 0 : aNumero(item.precio_unitario);
    const descuento = esRegalo ? 0 : aNumero(item.descuento);
    const bruto = cantidad * precioUnitario;
    return {
      nombre: item.tbl_productos?.nombre || `Producto #${item.product_id}`,
      codigo: item.product_id ? String(item.product_id).padStart(4, '0') : '',
      unidad: unidadDeItem(item),
      cantidad,
      precioUnitario,
      descuento,
      importe: Math.max(0, bruto - descuento),
      esRegalo,
    };
  });

  const subtotalCalculado = items.reduce((suma, item) => suma + item.cantidad * item.precioUnitario, 0);
  const descuentoCalculado = items.reduce((suma, item) => suma + item.descuento, 0);

  const subtotal = cotizacion.subtotal != null ? aNumero(cotizacion.subtotal) : subtotalCalculado;
  const descuento = cotizacion.descuento != null ? aNumero(cotizacion.descuento) : descuentoCalculado;
  const total = cotizacion.total != null ? aNumero(cotizacion.total) : Math.max(0, subtotal - descuento);

  // Los precios cotizados ya incluyen IGV: la operacion gravada se obtiene
  // quitandoselo al total, igual que imprime la factura.
  const gravada = Math.round((total / (1 + COTIZACION_EXPORT.IGV_TASA)) * 100) / 100;
  const igv = Math.round((total - gravada) * 100) / 100;

  const emision = cotizacion.fecha_hora || cotizacion.fecha_hora_registro || new Date().toISOString();
  const validez = new Date(emision);
  validez.setDate(validez.getDate() + COTIZACION_EXPORT.DIAS_VALIDEZ);

  const cliente = cotizacion.tbl_clientes || {};
  const telefono = cliente.telefono_principal || cotizacion.telefono_anonimo || cotizacion.telefono || '';

  const correlativo = String(cotizacion.id ?? '').padStart(COTIZACION_EXPORT.DIGITOS_NUMERO, '0');

  return {
    numero: `${COTIZACION_EXPORT.SERIE_PREFIJO}-${correlativo}`,
    emision,
    validez: validez.toISOString(),
    estado: resolverEstado(cotizacion.estado),
    origen: cotizacion._origen,
    cliente: {
      nombre: cliente.nombre || cotizacion.nombre_anonimo || cotizacion.nombre || 'Cliente no registrado',
      // Empresas cotizan con RUC y personas con DNI: se imprime el que tenga.
      documento: cliente.ruc || cliente.dni || '',
      direccion: cliente.direccion_fiscal || cliente.direccion || '',
      telefono: telefono ? (TELEFONO_INPUT.format(telefono) || telefono) : '',
      // El correo vive en el cliente o, si no, en el usuario asociado.
      correo: cliente.email || cliente.correo || cliente.tbl_usuarios?.correo || '',
    },
    items,
    subtotal,
    descuento,
    gravada,
    igv,
    total,
  };
}

// --- Fragmentos del documento ----------------------------------------------

/**
 * El importe en letras como lo escribe la factura: "Dos mil con 00/100 Soles".
 * `numeroALetras` devuelve todo en mayusculas (uso habitual en comprobantes),
 * asi que aqui se pasa a mayuscula inicial y se recapitaliza la moneda.
 */
function enLetras(total) {
  const moneda = COTIZACION_EXPORT.MONEDA_NOMBRE;
  const texto = numeroALetras(total, moneda);
  if (!texto) return '';
  const cuerpo = texto.slice(0, texto.length - moneda.length).toLowerCase();
  const monedaCapitalizada = moneda.charAt(0) + moneda.slice(1).toLowerCase();
  return cuerpo.charAt(0).toUpperCase() + cuerpo.slice(1) + monedaCapitalizada;
}

// Las filas se imprimen siempre, con guion cuando no hay dato: la lista queda
// alineada y el documento se lee como el comprobante.
function filaDato(etiqueta, valor) {
  return `<tr><th>${esc(etiqueta)}</th><td class="dp">:</td><td>${valor ? esc(valor) : '&mdash;'}</td></tr>`;
}

function filasItems(items) {
  return items
    .map((item) => `
      <tr>
        <td class="col-cant">${esc(item.cantidad)}</td>
        <td class="col-und">${esc(item.unidad)}</td>
        <td class="col-desc">
          ${esc(item.nombre)}
          ${item.esRegalo ? `<span class="item-regalo">${esc(COTIZACION_EXPORT.ETIQUETA_OBSEQUIO)}</span>` : ''}
          ${item.codigo ? `<span class="item-cod">C&oacute;d. ${esc(item.codigo)}</span>` : ''}
        </td>
        <td class="col-pu">${esc(importe(item.precioUnitario))}</td>
        <td class="col-dto">${esc(importe(item.descuento))}</td>
        <td class="col-tot">${esc(importe(item.importe))}</td>
      </tr>`)
    .join('');
}

function bloqueSello(estado) {
  const sello = ESTADO_SELLO[estado];
  if (!sello) return '';
  return `<div class="marca-estado"><span class="sello ${sello.clase}">${esc(sello.texto)}</span></div>`;
}

// --- Hoja de estilos del documento ------------------------------------------

const ESTILOS = `
@page { size: A4; margin: 14mm 15mm 18mm; }

:root {
  --tinta: #000000;
  --tinta-media: #333333;
  --linea: #000000;
  --papel: #ffffff;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

html { background: #6b7280; }

body {
  font-family: 'Open Sans', 'DejaVu Sans', 'Segoe UI', Helvetica, Arial, sans-serif;
  color: var(--tinta);
  font-size: 9pt;
  line-height: 1.4;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  padding: 26px 0;
}

.hoja {
  position: relative;
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 14mm 15mm 18mm;
  background: var(--papel);
  box-shadow: 0 18px 60px rgba(0,0,0,.45);
  display: flex;
  flex-direction: column;
}

/* ---------- Cabecera ---------- */
.cab {
  display: flex;
  align-items: flex-start;
  gap: 7mm;
  margin-bottom: 8mm;
}

.cab-logo { width: 30mm; flex: none; }
.cab-logo img { width: 100%; height: auto; display: block; }

.cab-emisor { flex: 1; padding-top: 2mm; min-width: 0; }
.cab-emisor h1 {
  font-size: 15pt;
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: .01em;
}
.cab-emisor p {
  font-size: 8.5pt;
  color: var(--tinta-media);
  line-height: 1.5;
  margin-top: 1.4mm;
}

/* Recuadro del documento: RUC / tipo / numero */
.doc {
  flex: none;
  width: 56mm;
  align-self: flex-start;
  border: 1px solid var(--linea);
  border-radius: 2.4mm;
  padding: 3.4mm 3mm;
  text-align: center;
  font-size: 10.5pt;
  line-height: 1.75;
}

/* ---------- Datos de emision y cliente ---------- */
.datos { border-collapse: collapse; margin-bottom: 5mm; }
.datos th, .datos td {
  font-size: 9pt;
  font-weight: 400;
  text-align: left;
  vertical-align: top;
  padding: .35mm 0;
}
.datos th { width: 33mm; }
.datos .dp { width: 4mm; }

/* ---------- Grilla de items ---------- */
.items {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 4mm;
}
.items thead { display: table-header-group; }
.items th, .items td {
  border: 1px solid var(--linea);
  font-size: 9pt;
  padding: 1.4mm 2mm;
  vertical-align: top;
}
.items th { font-weight: 700; }
.items tbody tr { page-break-inside: avoid; }

.col-cant { width: 15mm; text-align: center; }
.col-und { width: 13mm; text-align: center; }
.col-pu { width: 21mm; text-align: right; }
.col-dto { width: 14mm; text-align: right; }
.col-tot { width: 23mm; text-align: right; }
th.col-cant, th.col-und { text-align: center; }
th.col-pu, th.col-dto, th.col-tot { text-align: right; }
th.col-desc { text-align: left; }

.item-cod {
  display: block;
  font-size: 7.5pt;
  color: var(--tinta-media);
}
.item-regalo {
  font-size: 7.5pt;
  border: 1px solid var(--tinta);
  padding: 0 1.2mm;
  margin-left: 1.5mm;
  white-space: nowrap;
}

/* ---------- Totales e importe en letras ---------- */
.cierre {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: end;
  gap: 6mm;
  page-break-inside: avoid;
}

.totales { border-collapse: collapse; margin-left: auto; }
.totales th, .totales td {
  font-size: 9pt;
  font-weight: 400;
  padding: .5mm 0 .5mm 6mm;
  white-space: nowrap;
}
.totales th { text-align: right; }
.totales td { text-align: right; min-width: 26mm; font-variant-numeric: tabular-nums; }
.totales .fila-total th, .totales .fila-total td { font-weight: 700; padding-top: 1mm; }

.son { font-size: 10pt; padding-bottom: 1mm; }
.son b { font-weight: 700; }

/* ---------- Condiciones y vendedor ---------- */
.condicion { margin-top: 12mm; font-size: 9pt; font-weight: 700; }
.vendedor { margin-top: 5mm; font-size: 9pt; }
.vendedor b { display: block; }

.condiciones { margin-top: 12mm; page-break-inside: avoid; }
.condiciones h2 { font-size: 9pt; font-weight: 700; margin-bottom: 1.5mm; }
.condiciones ol {
  margin-left: 4.5mm;
  font-size: 8pt;
  color: var(--tinta-media);
  line-height: 1.6;
}

/* ---------- Sello de estado ---------- */
.marca-estado { margin-top: 4mm; padding-right: 3mm; text-align: right; }

.sello {
  display: inline-block;
  transform: rotate(-3deg);
  border: 2px solid currentColor;
  border-radius: 1.5mm;
  padding: 1.4mm 4mm;
  font-size: 13pt;
  font-weight: 700;
  letter-spacing: .08em;
  white-space: nowrap;
  opacity: .55;
}
.sello--ok { color: #15803d; }
.sello--no { color: #b91c1c; }

/* ---------- Pie ---------- */
.pie {
  margin-top: auto;
  padding-top: 10mm;
  text-align: center;
  font-size: 9pt;
  color: var(--tinta-media);
  line-height: 1.5;
}

/* ---------- Barra de accion (solo pantalla) ---------- */
.barra {
  position: fixed;
  top: 0; left: 0; right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px;
  background: rgba(17,24,39,.96);
  z-index: 50;
}
.barra button {
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: .04em;
  padding: 8px 18px;
  border: 0;
  border-radius: 4px;
  cursor: pointer;
  background: #b91c1c;
  color: #fff;
}
.barra button.secundario { background: transparent; color: #d1d5db; border: 1px solid #4b5563; }
.barra button:hover { filter: brightness(1.12); }
body.con-barra { padding-top: 62px; }

@media print {
  html, body { background: #fff; padding: 0; }
  body.con-barra { padding-top: 0; }
  .barra { display: none !important; }
  /* Los margenes ya los pone @page: la hoja solo ocupa el area util. */
  .hoja { box-shadow: none; margin: 0; width: auto; padding: 0; min-height: 265mm; }
}
`;

// --- Documento ---------------------------------------------------------------

export function construirHtmlCotizacion(cotizacion, opciones = {}) {
  const {
    logo = '',
    usuario = null,
    emisor = EMISOR_VACIO,
    conBarra = true,
    autoImprimir = true,
  } = opciones;
  // La razon social registrada en Facturacion manda sobre el nombre por defecto.
  const razonSocial = emisor.razonSocial || EMPRESA.RAZON_SOCIAL;
  const c = normalizarCotizacion(cotizacion);

  const origenTexto = c.origen === ORIGEN_COTIZACION.PROSPECTO ? 'Prospecto' : 'Tienda web';
  const estadoTexto = ESTADO_ETIQUETA[c.estado] || '-';
  const simbolo = COTIZACION_EXPORT.MONEDA_SIMBOLO;

  const contactoEmisor = [emisor.telefono ? `Tel. ${emisor.telefono}` : '', EMPRESA.HORARIO]
    .filter(Boolean)
    .map((dato) => esc(dato))
    .join(' &nbsp;·&nbsp; ');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Cotizacion ${esc(c.numero)} - ${esc(razonSocial)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet">
<style>${ESTILOS}</style>
</head>
<body class="${conBarra ? 'con-barra' : ''}">
${conBarra ? `<div class="barra">
  <button type="button" onclick="window.print()">${esc(COTIZACION_EXPORT.BTN_IMPRIMIR)}</button>
  <button type="button" class="secundario" onclick="window.close()">Cerrar</button>
</div>` : ''}

<div class="hoja">
  <header class="cab">
    <div class="cab-logo">
      <img id="logo-principal" src="${esc(logo)}" width="${LADO_LOGO_PX}" height="${LADO_LOGO_PX}" alt="${esc(razonSocial)}">
    </div>
    <div class="cab-emisor">
      <h1>${esc(razonSocial)}</h1>
      ${emisor.direccion ? `<p>${esc(emisor.direccion)}</p>` : ''}
      ${contactoEmisor ? `<p>${contactoEmisor}</p>` : ''}
    </div>
    <div class="doc">
      ${emisor.ruc ? `RUC ${esc(emisor.ruc)}<br>` : ''}
      ${esc(COTIZACION_EXPORT.TITULO_DOC)}<br>
      ${esc(c.numero)}
    </div>
  </header>

  <table class="datos">
    <tbody>
      ${filaDato('Fecha de emisión', formatearFecha(c.emision))}
      ${filaDato('Válida hasta', formatearFecha(c.validez))}
      ${filaDato('Cliente', c.cliente.nombre)}
      ${filaDato('DNI / RUC', c.cliente.documento)}
      ${filaDato('Dirección', c.cliente.direccion)}
      ${filaDato('Teléfono', c.cliente.telefono)}
      ${filaDato('Correo', c.cliente.correo)}
    </tbody>
  </table>

  <table class="items">
    <thead>
      <tr>
        <th class="col-cant">Cant.</th>
        <th class="col-und">Unidad</th>
        <th class="col-desc">Descripci&oacute;n</th>
        <th class="col-pu">P.Unit</th>
        <th class="col-dto">Dto.</th>
        <th class="col-tot">Total</th>
      </tr>
    </thead>
    <tbody>${filasItems(c.items)}</tbody>
  </table>

  <section class="cierre">
    <p class="son">Son: <b>${esc(enLetras(c.total))}</b></p>
    <table class="totales">
      <tbody>
        ${c.descuento > 0 ? `<tr><th>Descuento: ${esc(simbolo)}</th><td>${esc(importe(c.descuento))}</td></tr>` : ''}
        <tr><th>Op. Gravadas: ${esc(simbolo)}</th><td>${esc(importe(c.gravada))}</td></tr>
        <tr><th>IGV: ${esc(simbolo)}</th><td>${esc(importe(c.igv))}</td></tr>
        <tr class="fila-total"><th>Total a pagar: ${esc(simbolo)}</th><td>${esc(importe(c.total))}</td></tr>
      </tbody>
    </table>
  </section>

  ${bloqueSello(c.estado)}

  <p class="condicion">${esc(COTIZACION_EXPORT.ETIQUETA_VALIDEZ)}: ${esc(COTIZACION_EXPORT.DIAS_VALIDEZ)} d&iacute;as &nbsp;·&nbsp; ${esc(origenTexto)} &nbsp;·&nbsp; ${esc(estadoTexto)}</p>

  <div class="vendedor">
    <b>Vendedor:</b>
    ${esc(usuario?.nombres || '')}
  </div>

  <section class="condiciones">
    <h2>Condiciones comerciales</h2>
    <ol>${COTIZACION_EXPORT.CONDICIONES.map((texto) => `<li>${esc(texto)}</li>`).join('')}</ol>
  </section>

  <footer class="pie">
    ${esc(COTIZACION_EXPORT.PIE_REPRESENTACION)}<br>
    ${esc(COTIZACION_EXPORT.NOTA_LEGAL)}
  </footer>
</div>

${autoImprimir ? `<script>
(function () {
  var yaImprimio = false;
  function imprimir() {
    if (yaImprimio) return;
    yaImprimio = true;
    setTimeout(function () { window.focus(); window.print(); }, ${MS_ANTES_DE_IMPRIMIR});
  }
  var logo = document.getElementById('logo-principal');
  var esperaLogo = (logo && !logo.complete)
    ? new Promise(function (listo) { logo.onload = listo; logo.onerror = listo; })
    : Promise.resolve();
  var esperaFuentes = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  Promise.all([esperaLogo, esperaFuentes]).then(imprimir);
  // Salvavidas: si las fuentes remotas no responden, se imprime igual.
  setTimeout(imprimir, ${MS_ESPERA_MAXIMA});
})();
${CIERRE_SCRIPT}` : ''}
</body>
</html>`;
}

function escribirEn(documento, html) {
  documento.open();
  documento.write(html);
  documento.close();
}

/**
 * Plan B cuando el navegador bloquea la ventana emergente: se imprime desde un
 * iframe oculto. El usuario no ve la vista previa propia, pero igual llega al
 * dialogo de impresion.
 */
function imprimirEnIframe(html) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);
  escribirEn(iframe.contentDocument, html);
  // El script del documento dispara print(); el iframe se retira despues para
  // no cortar el dialogo mientras el usuario elige el destino.
  setTimeout(() => iframe.remove(), MS_VIDA_IFRAME);
}

const HTML_ESPERA = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>${COTIZACION_EXPORT.MSG_GENERANDO}</title></head>
<body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#10192b;color:#c7cedb;font:600 14px/1.4 'Segoe UI',Helvetica,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase">
${COTIZACION_EXPORT.MSG_GENERANDO}</body></html>`;

/**
 * Abre la cotizacion como documento A4 listo para imprimir o guardar en PDF.
 *
 * La ventana se abre de forma sincrona —antes de cualquier await— porque tras
 * un await se pierde el gesto del usuario y el bloqueador de pop-ups actua.
 *
 * @param {Object} cotizacion - Cotizacion web o prospecto con sus items.
 * @param {Object} [opciones]
 * @param {Object} [opciones.usuario] - Usuario que exporta ("Vendedor").
 * @returns {Promise<'ventana'|'iframe'>} donde se abrio el documento.
 */
export async function exportarCotizacion(cotizacion, opciones = {}) {
  const items = cotizacion?.items || cotizacion?.items_cotizacion || [];
  if (items.length === 0) throw new Error(COTIZACION_EXPORT.MSG_SIN_ITEMS);

  const ventana = window.open('', '_blank', 'width=920,height=1040');
  if (ventana) escribirEn(ventana.document, HTML_ESPERA);

  const [logo, emisor] = await Promise.all([obtenerLogoDataUrl(), obtenerEmisor()]);

  if (!ventana) {
    imprimirEnIframe(construirHtmlCotizacion(cotizacion, { ...opciones, logo, emisor, conBarra: false }));
    return 'iframe';
  }

  escribirEn(ventana.document, construirHtmlCotizacion(cotizacion, { ...opciones, logo, emisor }));
  ventana.focus();
  return 'ventana';
}

export default exportarCotizacion;
