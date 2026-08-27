import { EMPRESA } from '../config/constants';
import { formatearFechaHora } from './formato';
import { EMISOR_VACIO, obtenerEmisor, obtenerLogoDataUrl } from './emisorDoc';

// ---------------------------------------------------------------------------
// Exportacion de los reportes a Excel y a PDF.
//
// Ambas salidas parten de la misma descripcion del reporte, para que el Excel y
// el PDF muestren exactamente lo mismo que el usuario tiene en pantalla:
//
//   {
//     archivo: 'Productos',                    // base del nombre del .xlsx
//     titulo: 'Productos Mas Vendidos',        // encabezado del documento
//     filtros: [{ etiqueta, valor }],          // filtros aplicados al consultar
//     secciones: [{
//       titulo: 'Productos Mas Vendidos',
//       columnas: [{ header, valor, tipo, formato, ancho, sinTotal }],
//       filas: [...],
//       totales: true,                         // fila de sumas al pie
//     }],
//   }
//
// En cada columna: `valor` es el nombre del campo o una funcion (fila, i);
// `tipo` decide formato y alineacion ('texto' por defecto, 'numero', 'moneda');
// `formato` embellece el dato solo en el PDF; `sinTotal` deja fuera de la suma a
// columnas numericas que no se suman (correlativos, IDs). En Excel los numeros
// se escriben como numeros —no como texto— para poder sumarlos y filtrarlos.
//
// El PDF no usa ninguna libreria: se arma un documento A4 y se abre el dialogo
// de impresion del navegador, desde donde el usuario elige "Guardar como PDF".
// Es el mismo camino que ya usa la exportacion de cotizaciones.
// ---------------------------------------------------------------------------

const MS_ESPERA_MAXIMA = 3000;
const MS_ANTES_DE_IMPRIMIR = 150;
const MS_VIDA_IFRAME = 60000;
// El cierre del <script> del documento generado va partido para que ningun
// empaquetador que inline este bundle en un HTML corte el script de la pagina.
const CIERRE_SCRIPT = `<${'/'}script>`;

// Excel corta los nombres de hoja en 31 caracteres y rechaza : \ / ? * [ ]
const MAX_NOMBRE_HOJA = 31;
const INVALIDOS_HOJA = /[:\\/?*[\]]/g;

export const MSG_SIN_DATOS = 'No hay datos para exportar en este reporte.';

const FORMATO_EXCEL = { moneda: '#,##0.00', numero: '#,##0' };

// Marcas de acento que deja `normalize('NFD')`; se quitan del nombre del archivo.
const DIACRITICOS = /\p{M}/gu;

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

const esNumerica = (col) => col.tipo === 'numero' || col.tipo === 'moneda';

/** Valor crudo de una celda: numero para las columnas numericas, texto para el resto. */
function valorCelda(col, fila, indice) {
  const bruto = typeof col.valor === 'function' ? col.valor(fila, indice) : fila?.[col.valor];
  if (esNumerica(col)) return aNumero(bruto);
  return bruto === null || bruto === undefined ? '' : String(bruto);
}

/**
 * Suma por columna; devuelve null donde no corresponde sumar (texto, o columnas
 * numericas marcadas con `sinTotal`, como el correlativo o un ID).
 */
function totalesDeSeccion(seccion) {
  return seccion.columnas.map((col) => {
    if (!esNumerica(col) || col.sinTotal) return null;
    return seccion.filas.reduce(
      (acc, fila, i) => acc + aNumero(valorCelda(col, fila, i)),
      0
    );
  });
}

const seccionesConDatos = (secciones = []) =>
  secciones.filter((s) => s && Array.isArray(s.filas) && s.filas.length > 0);

/** Fecha de emision del documento, tal como se imprime en el encabezado. */
const marcaDeTiempo = () => formatearFechaHora(new Date());

/** Sufijo AAAA-MM-DD para el nombre del archivo descargado. */
function sufijoFecha() {
  const ahora = new Date();
  const dosDigitos = (n) => String(n).padStart(2, '0');
  return `${ahora.getFullYear()}-${dosDigitos(ahora.getMonth() + 1)}-${dosDigitos(ahora.getDate())}`;
}

function normalizarNombreArchivo(texto) {
  return String(texto || 'Reporte')
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_') || 'Reporte';
}

/** Nombre de hoja unico y valido para Excel. */
function nombreHoja(titulo, usados) {
  const base = String(titulo || 'Hoja').replace(INVALIDOS_HOJA, ' ').trim().slice(0, MAX_NOMBRE_HOJA) || 'Hoja';
  let nombre = base;
  let n = 2;
  while (usados.has(nombre)) {
    const sufijo = ` (${n})`;
    nombre = base.slice(0, MAX_NOMBRE_HOJA - sufijo.length) + sufijo;
    n++;
  }
  usados.add(nombre);
  return nombre;
}

const lineaFiltros = (filtros = []) =>
  filtros.filter((f) => f && f.valor).map((f) => `${f.etiqueta}: ${f.valor}`).join('  |  ');

/* ═══════════════════════════════════════════════
   EXCEL
   ═══════════════════════════════════════════════ */

/**
 * Descarga el reporte como .xlsx, una hoja por seccion.
 *
 * @param {Object} reporte - Descripcion del reporte (ver cabecera del modulo).
 * @returns {Promise<string>} nombre del archivo generado.
 * @throws {Error} MSG_SIN_DATOS si ninguna seccion trae filas.
 */
export async function exportarReporteExcel(reporte) {
  const { archivo, titulo, filtros = [], secciones = [] } = reporte || {};
  const conDatos = seccionesConDatos(secciones);
  if (!conDatos.length) throw new Error(MSG_SIN_DATOS);

  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const usados = new Set();
  const filtrosTexto = lineaFiltros(filtros);

  for (const seccion of conDatos) {
    // Encabezado de contexto: quien exporto que y con que filtros. Va antes de
    // la tabla para que el archivo se entienda fuera del sistema.
    const contexto = [
      [seccion.titulo || titulo || 'Reporte'],
      [`${EMPRESA.RAZON_SOCIAL} — generado el ${marcaDeTiempo()}`],
      [filtrosTexto ? `Filtros: ${filtrosTexto}` : 'Filtros: sin filtros aplicados'],
      [],
    ];

    const encabezados = seccion.columnas.map((c) => c.header);
    const cuerpo = seccion.filas.map((fila, i) =>
      seccion.columnas.map((col) => valorCelda(col, fila, i))
    );

    const aoa = [...contexto, encabezados, ...cuerpo];

    if (seccion.totales) {
      const sumas = totalesDeSeccion(seccion);
      aoa.push(
        sumas.map((suma, idx) => {
          if (suma !== null) return suma;
          return idx === 0 ? `TOTALES (${seccion.filas.length})` : '';
        })
      );
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = seccion.columnas.map((col) => ({
      wch: col.ancho || Math.max(12, String(col.header || '').length + 4),
    }));

    // Formato numerico de las celdas: sin esto Excel muestra 7200 en vez de
    // 7,200.00 en los montos.
    const filaEncabezados = contexto.length;
    const ultimaFila = filaEncabezados + cuerpo.length + (seccion.totales ? 1 : 0);
    seccion.columnas.forEach((col, c) => {
      const formato = FORMATO_EXCEL[col.tipo];
      if (!formato) return;
      for (let r = filaEncabezados + 1; r <= ultimaFila; r++) {
        const celda = ws[XLSX.utils.encode_cell({ r, c })];
        if (celda && celda.t === 'n') celda.z = formato;
      }
    });

    XLSX.utils.book_append_sheet(wb, ws, nombreHoja(seccion.titulo || titulo, usados));
  }

  const nombreArchivo = `${normalizarNombreArchivo(archivo || titulo)}_${sufijoFecha()}.xlsx`;
  XLSX.writeFile(wb, nombreArchivo);
  return nombreArchivo;
}

/* ═══════════════════════════════════════════════
   PDF (documento A4 imprimible)
   ═══════════════════════════════════════════════ */

const ESTILOS_PDF = `
  @page { size: A4; margin: 12mm 10mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font: 11px/1.45 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1b2436;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .doc { max-width: 190mm; margin: 0 auto; }
  .cabecera {
    display: flex; align-items: center; gap: 14px;
    border-bottom: 2px solid #c0392b; padding-bottom: 10px; margin-bottom: 14px;
  }
  .cabecera img { width: 54px; height: 54px; object-fit: contain; }
  .emisor { flex: 1; min-width: 0; }
  .emisor .razon { font-size: 14px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
  .emisor .datos { font-size: 10px; color: #5a6478; margin-top: 2px; }
  .doc-meta { text-align: right; font-size: 10px; color: #5a6478; }
  .doc-meta .titulo {
    font-size: 13px; font-weight: 700; color: #1b2436;
    text-transform: uppercase; letter-spacing: .06em; margin-bottom: 2px;
  }
  .filtros {
    border: 1px solid #dfe4ec; background: #f6f8fb; border-radius: 4px;
    padding: 7px 10px; font-size: 10px; color: #41506a; margin-bottom: 14px;
  }
  .filtros b { color: #1b2436; }
  .filtros span { display: inline-block; margin-right: 14px; white-space: nowrap; }
  section { margin-bottom: 16px; page-break-inside: auto; }
  h2 {
    font-size: 12px; text-transform: uppercase; letter-spacing: .06em;
    margin: 0 0 6px; padding-bottom: 4px; border-bottom: 1px solid #dfe4ec;
  }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  thead { display: table-header-group; }
  th {
    background: #eef2f8; color: #41506a; text-align: left; font-weight: 700;
    text-transform: uppercase; letter-spacing: .04em; font-size: 9px;
    padding: 5px 6px; border-bottom: 1px solid #cfd7e4;
  }
  td { padding: 4px 6px; border-bottom: 1px solid #edf0f5; }
  tr { page-break-inside: avoid; }
  tbody tr:nth-child(even) td { background: #fafbfd; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  tfoot td { font-weight: 700; border-top: 2px solid #cfd7e4; background: #f1f4f9; }
  .pie { margin-top: 18px; padding-top: 8px; border-top: 1px solid #dfe4ec;
    font-size: 9px; color: #7b8598; display: flex; justify-content: space-between; }
`;

function celdaPdf(col, fila, indice) {
  const clase = esNumerica(col) ? ' class="num"' : '';
  const bruto = typeof col.valor === 'function' ? col.valor(fila, indice) : fila?.[col.valor];
  const texto = col.formato ? col.formato(bruto) : bruto;
  return `<td${clase}>${esc(texto ?? '')}</td>`;
}

function tablaPdf(seccion) {
  const cabecera = seccion.columnas
    .map((col) => `<th${esNumerica(col) ? ' class="num"' : ''}>${esc(col.header)}</th>`)
    .join('');

  const cuerpo = seccion.filas
    .map((fila, i) => `<tr>${seccion.columnas.map((col) => celdaPdf(col, fila, i)).join('')}</tr>`)
    .join('');

  let pie = '';
  if (seccion.totales) {
    const sumas = totalesDeSeccion(seccion);
    const celdas = seccion.columnas
      .map((col, idx) => {
        if (sumas[idx] === null) {
          return `<td>${idx === 0 ? `TOTALES (${seccion.filas.length})` : ''}</td>`;
        }
        const texto = col.formato ? col.formato(sumas[idx]) : sumas[idx];
        return `<td class="num">${esc(texto)}</td>`;
      })
      .join('');
    pie = `<tfoot><tr>${celdas}</tr></tfoot>`;
  }

  return `<table><thead><tr>${cabecera}</tr></thead><tbody>${cuerpo}</tbody>${pie}</table>`;
}

function documentoPdf({ titulo, filtros, secciones, logo, emisor }) {
  const razonSocial = emisor.razonSocial || EMPRESA.RAZON_SOCIAL;
  const datosEmisor = [
    emisor.ruc ? `RUC ${emisor.ruc}` : '',
    emisor.direccion,
    emisor.telefono ? `Tel. ${emisor.telefono}` : '',
  ].filter(Boolean).map(esc).join(' &middot; ');

  const aplicados = (filtros || []).filter((f) => f && f.valor);
  const bloqueFiltros = aplicados.length
    ? `<div class="filtros"><b>Filtros aplicados:</b> ${aplicados
        .map((f) => `<span>${esc(f.etiqueta)}: <b>${esc(f.valor)}</b></span>`)
        .join('')}</div>`
    : `<div class="filtros"><b>Filtros aplicados:</b> ninguno (todo el periodo)</div>`;

  const cuerpo = secciones
    .map((s) => `<section><h2>${esc(s.titulo || titulo)}</h2>${tablaPdf(s)}</section>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<!-- El navegador propone el <title> como nombre del PDF al guardarlo. -->
<title>${esc(normalizarNombreArchivo(titulo))}_${sufijoFecha()}</title>
<style>${ESTILOS_PDF}</style>
</head>
<body>
<div class="doc">
  <header class="cabecera">
    <img id="logo-principal" src="${esc(logo)}" alt="">
    <div class="emisor">
      <div class="razon">${esc(razonSocial)}</div>
      <div class="datos">${datosEmisor || esc(EMPRESA.RUBRO)}</div>
    </div>
    <div class="doc-meta">
      <div class="titulo">${esc(titulo)}</div>
      <div>Generado: ${esc(marcaDeTiempo())}</div>
    </div>
  </header>

  ${bloqueFiltros}
  ${cuerpo}

  <footer class="pie">
    <span>${esc(razonSocial)} — Reporte interno</span>
    <span>${esc(titulo)}</span>
  </footer>
</div>

<script>
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
${CIERRE_SCRIPT}
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
  setTimeout(() => iframe.remove(), MS_VIDA_IFRAME);
}

const HTML_ESPERA = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Generando reporte…</title></head>
<body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#10192b;color:#c7cedb;font:600 14px/1.4 'Segoe UI',Helvetica,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase">
Generando reporte&hellip;</body></html>`;

/**
 * Abre el reporte como documento A4 listo para imprimir o guardar como PDF.
 *
 * La ventana se abre de forma sincrona —antes de cualquier await— porque tras
 * un await se pierde el gesto del usuario y el bloqueador de pop-ups actua.
 *
 * @param {Object} reporte - Descripcion del reporte (ver cabecera del modulo).
 * @returns {Promise<'ventana'|'iframe'>} donde se abrio el documento.
 * @throws {Error} MSG_SIN_DATOS si ninguna seccion trae filas.
 */
export async function exportarReportePdf(reporte) {
  const { titulo = 'Reporte', filtros = [], secciones = [] } = reporte || {};
  const conDatos = seccionesConDatos(secciones);
  if (!conDatos.length) throw new Error(MSG_SIN_DATOS);

  const ventana = window.open('', '_blank', 'width=980,height=1040');
  if (ventana) escribirEn(ventana.document, HTML_ESPERA);

  const [logo, emisor] = await Promise.all([
    obtenerLogoDataUrl(),
    obtenerEmisor().catch(() => EMISOR_VACIO),
  ]);

  const html = documentoPdf({ titulo, filtros, secciones: conDatos, logo, emisor });

  if (!ventana) {
    imprimirEnIframe(html);
    return 'iframe';
  }
  escribirEn(ventana.document, html);
  return 'ventana';
}
