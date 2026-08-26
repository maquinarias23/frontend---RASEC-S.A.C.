import {
  EMPRESA,
  COTIZACION_EXPORT,
  ESTADO_COTIZACION,
  ESTADO_PROSPECTO,
  ORIGEN_COTIZACION,
  TELEFONO_INPUT,
} from '../config/constants';
import { formatearMoneda, formatearFecha, formatearFechaHora } from './formato';
import { numeroALetras } from './numeroALetras';
import { configFacturacionService } from '../services/comprobantesService';

// ---------------------------------------------------------------------------
// Exportacion de la cotizacion a un documento A4 imprimible (Guardar como PDF).
//
// El documento se arma como HTML y se abre en una ventana propia: no depende de
// librerias de PDF ni del backend, y el usuario obtiene el archivo desde el
// dialogo de impresion del navegador ("Guardar como PDF").
//
// El logo se incrusta como data URL antes de escribir el documento. Una ruta
// relativa no serviria —el documento vive en about:blank, que no tiene base
// URL— y una URL remota podria llegar tarde al dialogo de impresion: con base64
// el logo ya esta resuelto cuando se dispara print().
//
// El RUC, la razon social, la direccion y el telefono salen de Administrador →
// Facturacion: son los mismos datos del emisor que usan los comprobantes
// electronicos, para no tener dos sitios donde mantener lo mismo.
// ---------------------------------------------------------------------------

const MS_ESPERA_MAXIMA = 3000;
const MS_ANTES_DE_IMPRIMIR = 150;
const MS_VIDA_IFRAME = 60000;
const LADO_LOGO_PX = 320;
// El cierre del <script> del documento generado va partido para que ningun
// empaquetador que inline este bundle en un HTML corte el script de la pagina.
const CIERRE_SCRIPT = `<${'/'}script>`;

// Caches de sesion: el logo en base64 y los datos del emisor.
let logoDataUrlCache = null;
let emisorCache = null;

const EMISOR_VACIO = { ruc: '', razonSocial: '', direccion: '', telefono: '' };

/**
 * Trae del modulo de Facturacion los datos del emisor que se imprimen. Si la
 * peticion falla, el documento sale igual con la identidad de la empresa y sin
 * las lineas de contacto: exportar nunca se cae por esto.
 */
async function obtenerEmisor() {
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
 */
async function obtenerLogoDataUrl() {
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
    return {
      nombre: item.tbl_productos?.nombre || `Producto #${item.product_id}`,
      codigo: item.product_id ? String(item.product_id).padStart(4, '0') : '',
      cantidad,
      precioUnitario,
      importe: cantidad * precioUnitario,
      esRegalo,
    };
  });

  const subtotalCalculado = items.reduce((suma, item) => suma + item.importe, 0);
  const descuentoCalculado = crudos.reduce((suma, item) => suma + aNumero(item.descuento), 0);

  const subtotal = cotizacion.subtotal != null ? aNumero(cotizacion.subtotal) : subtotalCalculado;
  const descuento = cotizacion.descuento != null ? aNumero(cotizacion.descuento) : descuentoCalculado;
  const total = cotizacion.total != null ? aNumero(cotizacion.total) : Math.max(0, subtotal - descuento);

  const emision = cotizacion.fecha_hora || cotizacion.fecha_hora_registro || new Date().toISOString();
  const validez = new Date(emision);
  validez.setDate(validez.getDate() + COTIZACION_EXPORT.DIAS_VALIDEZ);

  const cliente = cotizacion.tbl_clientes || {};
  const telefono = cliente.telefono_principal || cotizacion.telefono_anonimo || cotizacion.telefono || '';

  return {
    numero: String(cotizacion.id ?? '').padStart(6, '0'),
    emision,
    validez: validez.toISOString(),
    estado: resolverEstado(cotizacion.estado),
    origen: cotizacion._origen,
    cliente: {
      nombre: cliente.nombre || cotizacion.nombre_anonimo || cotizacion.nombre || 'Cliente no registrado',
      documento: cliente.dni || '',
      telefono: telefono ? (TELEFONO_INPUT.format(telefono) || telefono) : '',
      correo: cliente.correo || '',
    },
    items,
    subtotal,
    descuento,
    total,
  };
}

// --- Fragmentos del documento ----------------------------------------------

// Las filas se imprimen siempre, con guion cuando no hay dato: las dos cajas
// quedan a la misma altura y el documento se lee como un formulario.
function filaDato(etiqueta, valor) {
  return `<tr><th>${esc(etiqueta)}</th><td>${valor ? esc(valor) : '&mdash;'}</td></tr>`;
}

function listaDatosEmpresa(datos) {
  return datos.filter(Boolean).map((dato) => `<li>${esc(dato)}</li>`).join('');
}

function filasItems(items) {
  return items
    .map((item, indice) => `
      <tr>
        <td class="col-num">${String(indice + 1).padStart(2, '0')}</td>
        <td>
          <span class="item-nombre">${esc(item.nombre)}</span>
          ${item.codigo ? `<span class="item-cod">Cod. ${esc(item.codigo)}</span>` : ''}
          ${item.esRegalo ? `<span class="item-regalo">${esc(COTIZACION_EXPORT.ETIQUETA_OBSEQUIO)}</span>` : ''}
        </td>
        <td class="col-cant">${esc(item.cantidad)}</td>
        <td class="col-pu">${esc(formatearMoneda(item.precioUnitario))}</td>
        <td class="col-imp">${esc(formatearMoneda(item.importe))}</td>
      </tr>`)
    .join('');
}

function bloqueSello(estado) {
  const sello = ESTADO_SELLO[estado];
  if (!sello) return '';
  return `<div class="sello ${sello.clase}"><span>${esc(sello.texto)}</span></div>`;
}

// --- Hoja de estilos del documento ------------------------------------------

const ESTILOS = `
@page { size: A4; margin: 0; }

:root {
  --tinta: #10192b;
  --tinta-media: #4b5a70;
  --tinta-suave: #94a1b3;
  --rojo: #b91c1c;
  --rojo-hondo: #7f1d1d;
  --linea: #d5dbe4;
  --panel: #f3f5f8;
  --papel: #ffffff;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

html { background: #55606f; }

body {
  font-family: 'Barlow', 'Segoe UI', Helvetica, Arial, sans-serif;
  color: var(--tinta);
  font-size: 10pt;
  line-height: 1.45;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  padding: 26px 0;
}

.hoja {
  position: relative;
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 13mm 14mm 10mm;
  background: var(--papel);
  box-shadow: 0 18px 60px rgba(0,0,0,.45);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Marcas de esquina: guino a los planos tecnicos de maquinaria */
.hoja::before, .hoja::after {
  content: '';
  position: absolute;
  width: 9mm; height: 9mm;
  border: 1px solid var(--tinta-suave);
  opacity: .5;
}
.hoja::before { top: 5mm; left: 5mm; border-right: 0; border-bottom: 0; }
.hoja::after { bottom: 5mm; right: 5mm; border-left: 0; border-top: 0; }

.marca-agua {
  position: absolute;
  top: 46%; left: 50%;
  width: 128mm;
  transform: translate(-50%, -50%) rotate(-13deg);
  opacity: .04;
  z-index: 0;
  pointer-events: none;
}
.marca-agua img { width: 100%; display: block; }

.hoja > *:not(.marca-agua) { position: relative; z-index: 1; }

/* ---------- Cabecera ---------- */
.cab {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8mm;
  padding-bottom: 4mm;
}

.cab-marca { display: flex; align-items: center; gap: 5mm; }

.logo-marco {
  width: 30mm; height: 30mm;
  flex: none;
  padding: 1.6mm;
  border: 1.5px solid var(--tinta);
  background: var(--papel);
  box-shadow: 3px 3px 0 rgba(16,25,43,.12);
}
.logo-marco img { width: 100%; height: 100%; object-fit: contain; display: block; }

.razon {
  font-family: 'Bebas Neue', 'Barlow Condensed', 'Arial Narrow', Impact, sans-serif;
  line-height: .88;
  white-space: nowrap;
}
.razon span { display: block; font-size: 25pt; letter-spacing: .085em; }
.razon em {
  display: block;
  font-style: normal;
  font-size: 21pt;
  letter-spacing: .175em;
  color: var(--rojo);
}

.rubro {
  font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
  font-size: 8.5pt;
  text-transform: uppercase;
  letter-spacing: .14em;
  color: var(--tinta-media);
  margin-top: 1.2mm;
  padding-top: 1.2mm;
  border-top: 1px solid var(--linea);
}

.datos-empresa {
  list-style: none;
  margin-top: 1.6mm;
  font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
  font-size: 9pt;
  color: var(--tinta-media);
  line-height: 1.35;
}
.datos-empresa li::before {
  content: '';
  display: inline-block;
  width: 2mm; height: 1px;
  background: var(--rojo);
  vertical-align: middle;
  margin-right: 1.6mm;
}

/* Estampa del documento */
.doc {
  flex: none;
  width: 62mm;
  border: 1.5px solid var(--tinta);
  background: var(--papel);
  box-shadow: 3px 3px 0 rgba(185,28,28,.16);
}
.doc-tipo {
  background: var(--rojo);
  color: #fff;
  font-family: 'Bebas Neue', 'Barlow Condensed', 'Arial Narrow', Impact, sans-serif;
  font-size: 15pt;
  letter-spacing: .3em;
  text-align: center;
  padding: 1.4mm 0 .8mm;
}
.doc-num {
  font-family: 'Bebas Neue', 'Barlow Condensed', 'Arial Narrow', Impact, sans-serif;
  font-size: 29pt;
  line-height: 1;
  text-align: center;
  padding: 2.4mm 0 2mm;
  letter-spacing: .06em;
  font-variant-numeric: tabular-nums;
}
.doc-num small {
  display: block;
  font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
  font-size: 8pt;
  letter-spacing: .3em;
  color: var(--tinta-suave);
  margin-bottom: -1mm;
}
.doc-meta { width: 100%; border-collapse: collapse; }
.doc-meta th, .doc-meta td {
  font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
  font-size: 8.5pt;
  border-top: 1px solid var(--linea);
  padding: 1.1mm 2.6mm;
}
.doc-meta th {
  text-align: left;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: var(--tinta-suave);
  font-weight: 600;
}
.doc-meta td { text-align: right; font-weight: 700; }

/* Franja industrial */
.franja {
  height: 3.4mm;
  background: repeating-linear-gradient(-45deg, var(--tinta) 0 3.6mm, var(--rojo) 3.6mm 7.2mm);
}

/* ---------- Bloques de datos ---------- */
.bloques {
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 4mm;
  margin: 5mm 0 4.5mm;
}

.bloque { border: 1px solid var(--linea); background: var(--panel); }
.bloque h2 {
  font-family: 'Bebas Neue', 'Barlow Condensed', 'Arial Narrow', Impact, sans-serif;
  font-size: 11pt;
  letter-spacing: .22em;
  color: var(--papel);
  background: var(--tinta);
  padding: 1mm 3mm .4mm;
}
.bloque table { width: 100%; border-collapse: collapse; }
.bloque th, .bloque td {
  font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
  font-size: 9.5pt;
  padding: 1.1mm 3mm;
  vertical-align: top;
}
.bloque th {
  text-align: left;
  width: 29mm;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--tinta-media);
  font-weight: 600;
}
.bloque td { font-weight: 700; }
.bloque tr + tr th, .bloque tr + tr td { border-top: 1px dotted var(--linea); }

/* ---------- Tabla de items ---------- */
.items { width: 100%; border-collapse: collapse; }
.items thead { display: table-header-group; }
.items th {
  background: var(--tinta);
  color: var(--papel);
  font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
  font-size: 9pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .14em;
  padding: 1.6mm 3mm;
  text-align: left;
}
.items td {
  font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
  font-size: 10pt;
  padding: 2mm 3mm;
  border-bottom: 1px dotted var(--linea);
  vertical-align: middle;
}
.items tbody tr { page-break-inside: avoid; }
.items tbody tr:nth-child(even) td { background: rgba(243,245,248,.7); }

.col-num { width: 12mm; text-align: center; font-variant-numeric: tabular-nums; color: var(--rojo); font-weight: 700; }
.col-cant { width: 17mm; text-align: center; font-variant-numeric: tabular-nums; }
.col-pu { width: 28mm; text-align: right; font-variant-numeric: tabular-nums; }
.col-imp { width: 30mm; text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; }
th.col-num, th.col-cant { text-align: center; }
th.col-pu, th.col-imp { text-align: right; }

.item-nombre {
  display: block;
  font-weight: 700;
  text-transform: uppercase;
  line-height: 1.2;
}
.item-cod {
  font-size: 8pt;
  color: var(--tinta-suave);
  letter-spacing: .08em;
  text-transform: uppercase;
}
.item-regalo {
  display: inline-block;
  margin-left: 2mm;
  font-size: 7.5pt;
  letter-spacing: .12em;
  padding: 0 1.4mm;
  border: 1px solid var(--rojo);
  color: var(--rojo);
}

/* ---------- Cierre ---------- */
.cierre {
  display: grid;
  grid-template-columns: 1fr 74mm;
  gap: 6mm;
  margin-top: 5mm;
  page-break-inside: avoid;
}

.condiciones h3 {
  font-family: 'Bebas Neue', 'Barlow Condensed', 'Arial Narrow', Impact, sans-serif;
  font-size: 10.5pt;
  letter-spacing: .2em;
  border-bottom: 1.5px solid var(--tinta);
  padding-bottom: .6mm;
  margin-bottom: 2mm;
}
.condiciones ol { margin-left: 4.5mm; font-size: 8.6pt; color: var(--tinta-media); line-height: 1.5; }
.condiciones li::marker { color: var(--rojo); font-weight: 700; }

.totales { width: 100%; border-collapse: collapse; }
.totales th, .totales td {
  font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
  font-size: 10pt;
  padding: 1.5mm 3mm;
  border-bottom: 1px solid var(--linea);
}
.totales th { text-align: left; text-transform: uppercase; letter-spacing: .12em; color: var(--tinta-media); font-weight: 600; }
.totales td { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; }
.totales .fila-desc th, .totales .fila-desc td { color: var(--rojo-hondo); }
.totales .fila-total th, .totales .fila-total td {
  background: var(--rojo);
  color: #fff;
  border-bottom: 0;
  font-family: 'Bebas Neue', 'Barlow Condensed', 'Arial Narrow', Impact, sans-serif;
  font-size: 15pt;
  letter-spacing: .12em;
  padding: 1.6mm 3mm .9mm;
}

.letras {
  margin-top: 3mm;
  border: 1px solid var(--tinta);
  border-left: 4px solid var(--rojo);
  padding: 1.4mm 3mm;
  font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
  font-size: 9pt;
  letter-spacing: .05em;
  text-transform: uppercase;
  page-break-inside: avoid;
}
.letras b { color: var(--rojo); letter-spacing: .16em; margin-right: 1.5mm; }

.firmas {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14mm;
  margin-top: auto;
  padding-top: 18mm;
  page-break-inside: avoid;
}
.firma { text-align: center; }
.firma .linea { border-top: 1px solid var(--tinta); margin-bottom: 1.2mm; }
.firma span {
  font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
  font-size: 8.5pt;
  text-transform: uppercase;
  letter-spacing: .13em;
  color: var(--tinta-media);
}

/* ---------- Sello de estado ---------- */
.sello {
  position: absolute;
  bottom: 6mm;
  left: 50%;
  transform: translateX(-50%) rotate(-8deg);
  border: 3px double currentColor;
  padding: 1.6mm 5mm;
  font-family: 'Bebas Neue', 'Barlow Condensed', 'Arial Narrow', Impact, sans-serif;
  font-size: 17pt;
  letter-spacing: .16em;
  white-space: nowrap;
  opacity: .58;
  z-index: 2;
}
.sello--ok { color: #15803d; }
.sello--no { color: var(--rojo); }

/* ---------- Pie ---------- */
.pie {
  margin-top: 8mm;
  padding-top: 3mm;
  border-top: 2px solid var(--tinta);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 6mm;
  font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
  font-size: 8pt;
  color: var(--tinta-media);
  letter-spacing: .05em;
}
.pie strong { color: var(--tinta); letter-spacing: .1em; text-transform: uppercase; }
.pie-logo { width: 13mm; flex: none; opacity: .9; }
.pie-logo img { width: 100%; display: block; }
.pie-nota { text-align: right; text-transform: uppercase; letter-spacing: .09em; }

/* ---------- Barra de accion (solo pantalla) ---------- */
.barra {
  position: fixed;
  top: 0; left: 0; right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px;
  background: rgba(16,25,43,.96);
  z-index: 50;
}
.barra button {
  font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .14em;
  padding: 8px 18px;
  border: 0;
  cursor: pointer;
  background: var(--rojo);
  color: #fff;
}
.barra button.secundario { background: transparent; color: #c7cedb; border: 1px solid #46536b; }
.barra button:hover { filter: brightness(1.12); }
body.con-barra { padding-top: 62px; }

@media print {
  html, body { background: #fff; padding: 0; }
  body.con-barra { padding-top: 0; }
  .barra { display: none !important; }
  .hoja { box-shadow: none; margin: 0; width: auto; min-height: 0; }
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

  const datosEmpresa = listaDatosEmpresa([
    emisor.ruc ? `RUC ${emisor.ruc}` : '',
    emisor.direccion,
    emisor.telefono ? `Tel. ${emisor.telefono}` : '',
  ]);

  const contactoPie = [emisor.telefono ? `Tel. ${emisor.telefono}` : '', EMPRESA.HORARIO]
    .filter(Boolean)
    .map((dato) => esc(dato))
    .join('&nbsp;&nbsp;·&nbsp;&nbsp;');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Cotizacion ${esc(c.numero)} - ${esc(razonSocial)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600;700&family=Barlow+Condensed:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>${ESTILOS}</style>
</head>
<body class="${conBarra ? 'con-barra' : ''}">
${conBarra ? `<div class="barra">
  <button type="button" onclick="window.print()">${esc(COTIZACION_EXPORT.BTN_IMPRIMIR)}</button>
  <button type="button" class="secundario" onclick="window.close()">Cerrar</button>
</div>` : ''}

<div class="hoja">
  <div class="marca-agua"><img src="${esc(logo)}" alt=""></div>

  <header class="cab">
    <div class="cab-marca">
      <div class="logo-marco">
        <img id="logo-principal" src="${esc(logo)}" width="${LADO_LOGO_PX}" height="${LADO_LOGO_PX}" alt="${esc(razonSocial)}">
      </div>
      <div>
        <div class="razon">
          <span>${esc(EMPRESA.MARCA_LINEA_1)}</span>
          <em>${esc(EMPRESA.MARCA_LINEA_2)}</em>
        </div>
        <div class="rubro">${esc(EMPRESA.RUBRO)}</div>
        <ul class="datos-empresa">${datosEmpresa}</ul>
      </div>
    </div>

    <div class="doc">
      <div class="doc-tipo">${esc(COTIZACION_EXPORT.TITULO_DOC)}</div>
      <div class="doc-num"><small>N&deg;</small>${esc(c.numero)}</div>
      <table class="doc-meta">
        <tbody>
          <tr><th>Emisi&oacute;n</th><td>${esc(formatearFecha(c.emision))}</td></tr>
          <tr><th>V&aacute;lida hasta</th><td>${esc(formatearFecha(c.validez))}</td></tr>
          <tr><th>Moneda</th><td>${esc(COTIZACION_EXPORT.MONEDA_ETIQUETA)}</td></tr>
        </tbody>
      </table>
    </div>
  </header>

  <div class="franja"></div>

  <section class="bloques">
    <div class="bloque">
      <h2>Cliente</h2>
      <table>
        <tbody>
          ${filaDato('Señor(es)', c.cliente.nombre)}
          ${filaDato('DNI / RUC', c.cliente.documento)}
          ${filaDato('Teléfono', c.cliente.telefono)}
          ${filaDato('Correo', c.cliente.correo)}
        </tbody>
      </table>
    </div>
    <div class="bloque">
      <h2>Referencia</h2>
      <table>
        <tbody>
          ${filaDato('Origen', origenTexto)}
          ${filaDato('Situación', estadoTexto)}
          ${filaDato('Atendido por', usuario?.nombres || '')}
          ${filaDato('Registrada', formatearFechaHora(c.emision))}
        </tbody>
      </table>
    </div>
  </section>

  <table class="items">
    <thead>
      <tr>
        <th class="col-num">&Iacute;tem</th>
        <th>Descripci&oacute;n</th>
        <th class="col-cant">Cant.</th>
        <th class="col-pu">P. Unitario</th>
        <th class="col-imp">Importe</th>
      </tr>
    </thead>
    <tbody>${filasItems(c.items)}</tbody>
  </table>

  <section class="cierre">
    <div class="condiciones">
      <h3>Condiciones comerciales</h3>
      <ol>${COTIZACION_EXPORT.CONDICIONES.map((texto) => `<li>${esc(texto)}</li>`).join('')}</ol>
    </div>
    <div>
      <table class="totales">
        <tbody>
          <tr><th>Subtotal</th><td>${esc(formatearMoneda(c.subtotal))}</td></tr>
          ${c.descuento > 0 ? `<tr class="fila-desc"><th>Descuento</th><td>- ${esc(formatearMoneda(c.descuento))}</td></tr>` : ''}
          <tr class="fila-total"><th>Total</th><td>${esc(formatearMoneda(c.total))}</td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <div class="letras"><b>Son:</b>${esc(numeroALetras(c.total, COTIZACION_EXPORT.MONEDA_NOMBRE))}</div>

  <section class="firmas">
    ${bloqueSello(c.estado)}
    <div class="firma">
      <div class="linea"></div>
      <span>Aceptado por el cliente</span>
    </div>
    <div class="firma">
      <div class="linea"></div>
      <span>${esc(razonSocial)}</span>
    </div>
  </section>

  <footer class="pie">
    <div class="pie-logo"><img src="${esc(logo)}" alt=""></div>
    <div>
      <strong>${esc(razonSocial)}</strong><br>
      ${contactoPie}
    </div>
    <div class="pie-nota">
      ${esc(COTIZACION_EXPORT.NOTA_LEGAL)}<br>
      Cotizaci&oacute;n N&deg; ${esc(c.numero)}
    </div>
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
 * @param {Object} [opciones.usuario] - Usuario que exporta ("Atendido por").
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
