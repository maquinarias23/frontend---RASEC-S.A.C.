// ---------------------------------------------------------------------------
// Exportación del Dashboard a Excel y a PDF.
//
// Excel: libro con una hoja por bloque de información (Resumen, Ventas por día,
// Ranking, Productos, Clientes, Tracking). Se aplican anchos de columna y
// formato numérico de moneda para que los montos salgan como números reales
// —sumables en Excel— y no como texto.
//
// PDF: se reutiliza el patrón que ya usa el proyecto en exportarCotizacion.js
// (documento A4 armado en HTML e impreso con window.print()), en vez de sumar
// una librería de PDF. Así el archivo hereda la tipografía del navegador y el
// usuario obtiene el PDF desde "Guardar como PDF" del diálogo de impresión.
//
// Ambas exportaciones parten del MISMO objeto `datos`, de modo que el Excel y
// el PDF no puedan mostrar cifras distintas.
// ---------------------------------------------------------------------------

import * as XLSX from 'xlsx';
import { EMPRESA, ESTADO_TRACKING_LABEL } from '../config/constants';
import { formatearFecha } from './formato';

const MS_ANTES_DE_IMPRIMIR = 200;
const MS_ESPERA_MAXIMA = 3000;
const MS_VIDA_IFRAME = 60000;
// El cierre del <script> va partido para que ningún empaquetador que inline
// este bundle en un HTML corte el script de la página anfitriona.
const CIERRE_SCRIPT = `<${'/'}script>`;

const FMT_MONEDA = '"S/" #,##0.00';
const FMT_ENTERO = '#,##0';

let logoDataUrlCache = null;

// Se reutilizan las etiquetas de tracking del sistema para que el reporte no
// invente nombres distintos a los que el usuario ve en pantalla.
const etiquetaTracking = (estado) => ESTADO_TRACKING_LABEL[estado] || estado || '-';

const aNumero = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const esc = (v) =>
  v === null || v === undefined
    ? ''
    : String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const soles = (v) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(aNumero(v));

const entero = (v) => new Intl.NumberFormat('es-PE').format(aNumero(v));

/** "27/08/2026, 14:32" para el pie del documento y el nombre del archivo. */
const selloTiempo = () =>
  new Intl.DateTimeFormat('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima',
  }).format(new Date());

const sufijoArchivo = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
};

/**
 * Normaliza lo que devuelven los endpoints a la estructura única que consumen
 * las dos exportaciones. Cualquier bloque puede venir vacío: el documento se
 * genera igual, indicando que no hay datos.
 */
export function prepararDatosDashboard({ resumen = {}, dash = {}, ventasDia = [], ranking = [], productos = [], clientes = [] } = {}) {
  const pedidos = Array.isArray(dash.pedidos_por_estado) ? dash.pedidos_por_estado : [];

  return {
    generado: selloTiempo(),
    indicadores: [
      { grupo: 'Mes en curso', indicador: 'Ventas del mes', valor: aNumero(resumen.ventas_mes ?? dash.ventas_mes), tipo: 'entero' },
      { grupo: 'Mes en curso', indicador: 'Monto vendido del mes', valor: aNumero(resumen.monto_mes ?? dash.monto_mes), tipo: 'moneda' },
      { grupo: 'Hoy', indicador: 'Ventas de hoy', valor: aNumero(dash.ventas_hoy), tipo: 'entero' },
      { grupo: 'Hoy', indicador: 'Pagos recibidos hoy', valor: aNumero(dash.pagos_hoy), tipo: 'moneda' },
      { grupo: 'Hoy', indicador: 'Ingresos de caja hoy', valor: aNumero(dash.ingresos_hoy), tipo: 'moneda' },
      { grupo: 'Hoy', indicador: 'Gastos de caja hoy', valor: aNumero(dash.gastos_hoy), tipo: 'moneda' },
      { grupo: 'Hoy', indicador: 'Saldo de caja hoy', valor: aNumero(dash.ingresos_hoy) - aNumero(dash.gastos_hoy), tipo: 'moneda' },
      { grupo: 'Operación', indicador: 'Ventas pendientes', valor: aNumero(resumen.ventas_pendientes ?? dash.ventas_pendientes), tipo: 'entero' },
      { grupo: 'Operación', indicador: 'Cotizaciones pendientes', valor: aNumero(dash.cotizaciones_pendientes), tipo: 'entero' },
      { grupo: 'Operación', indicador: 'Importaciones programadas', valor: aNumero(dash.proximos_ingresos), tipo: 'entero' },
      { grupo: 'Catálogo', indicador: 'Total de clientes', valor: aNumero(resumen.total_clientes ?? dash.total_clientes), tipo: 'entero' },
      { grupo: 'Catálogo', indicador: 'Total de productos', valor: aNumero(resumen.total_productos ?? dash.total_productos), tipo: 'entero' },
      { grupo: 'Catálogo', indicador: 'Unidades disponibles en stock', valor: aNumero(dash.productos_disponibles), tipo: 'entero' },
    ],
    tracking: pedidos.map((p) => ({
      estado: etiquetaTracking(p.estado_tracking),
      cantidad: aNumero(p._count ?? p.cantidad),
    })),
    ventasDia: (Array.isArray(ventasDia) ? ventasDia : []).map((v) => ({
      dia: String(v.dia || '').split('T')[0],
      cantidad: aNumero(v.cantidad),
      monto: aNumero(v.monto),
    })),
    ranking: (Array.isArray(ranking) ? ranking : []).map((r, i) => ({
      puesto: i + 1,
      vendedor: r.vendedor || '-',
      ventas: aNumero(r.ventas),
      monto: aNumero(r.monto_total),
      ticket: aNumero(r.ventas) > 0 ? aNumero(r.monto_total) / aNumero(r.ventas) : 0,
    })),
    productos: (Array.isArray(productos) ? productos : []).map((p, i) => ({
      puesto: i + 1,
      producto: p.nombre || '-',
      unidades: aNumero(p.cantidad_vendida),
    })),
    clientes: (Array.isArray(clientes) ? clientes : []).map((c, i) => ({
      puesto: i + 1,
      cliente: c.cliente || '-',
      compras: aNumero(c.compras),
      monto: aNumero(c.monto_total),
      ticket: aNumero(c.compras) > 0 ? aNumero(c.monto_total) / aNumero(c.compras) : 0,
    })),
  };
}

// ===========================================================================
// EXCEL
// ===========================================================================

/**
 * Construye una hoja a partir de una matriz de filas (la primera es el
 * encabezado), aplicando anchos y formato numérico por columna.
 *
 * @param {Array[]} filas     matriz de valores; los números van como Number
 * @param {number[]} anchos   ancho de cada columna en caracteres
 * @param {Object} formatos   { indiceColumna: formatoNumericoExcel }
 * @param {string} titulo     rótulo que se escribe sobre la tabla
 */
function construirHoja(titulo, generado, filas, anchos, formatos = {}) {
  const cabecera = [[EMPRESA.RAZON_SOCIAL], [titulo], [`Generado: ${generado}`], []];
  const hoja = XLSX.utils.aoa_to_sheet([...cabecera, ...filas]);
  const filaEncabezado = cabecera.length; // índice 0-based de la fila de títulos

  hoja['!cols'] = anchos.map((w) => ({ wch: w }));
  // El título de la empresa se extiende sobre el ancho de la tabla.
  hoja['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(anchos.length - 1, 1) } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: Math.max(anchos.length - 1, 1) } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: Math.max(anchos.length - 1, 1) } },
  ];
  // Congela la fila de encabezados para que no se pierda al desplazar.
  hoja['!freeze'] = { xSplit: 0, ySplit: filaEncabezado + 1 };

  // Formato numérico: se aplica a las celdas de datos, no al encabezado.
  for (const [col, fmt] of Object.entries(formatos)) {
    for (let r = filaEncabezado + 1; r < filaEncabezado + filas.length; r++) {
      const ref = XLSX.utils.encode_cell({ r, c: Number(col) });
      if (hoja[ref] && hoja[ref].t === 'n') hoja[ref].z = fmt;
    }
  }
  return hoja;
}

const SIN_DATOS = [['Sin información para el periodo consultado']];

export function exportarDashboardExcel(datos) {
  const libro = XLSX.utils.book_new();
  const g = datos.generado;

  // --- Resumen general ---
  const filasResumen = [
    ['Bloque', 'Indicador', 'Valor'],
    ...datos.indicadores.map((i) => [i.grupo, i.indicador, i.valor]),
  ];
  XLSX.utils.book_append_sheet(
    libro,
    construirHoja('RESUMEN GENERAL', g, filasResumen, [18, 36, 18], { 2: FMT_ENTERO }),
    'Resumen'
  );
  // Los indicadores mezclan enteros y montos: el formato se corrige fila a fila.
  const hojaResumen = libro.Sheets.Resumen;
  datos.indicadores.forEach((ind, i) => {
    const ref = XLSX.utils.encode_cell({ r: 4 + 1 + i, c: 2 });
    if (hojaResumen[ref]) hojaResumen[ref].z = ind.tipo === 'moneda' ? FMT_MONEDA : FMT_ENTERO;
  });

  // --- Pedidos por estado ---
  const filasTracking = datos.tracking.length
    ? [['Estado de tracking', 'Pedidos'], ...datos.tracking.map((t) => [t.estado, t.cantidad])]
    : [['Estado de tracking', 'Pedidos'], ...SIN_DATOS];
  XLSX.utils.book_append_sheet(
    libro,
    construirHoja('PEDIDOS POR ESTADO DE TRACKING', g, filasTracking, [30, 14], { 1: FMT_ENTERO }),
    'Tracking'
  );

  // --- Ventas por día ---
  const totalCant = datos.ventasDia.reduce((s, v) => s + v.cantidad, 0);
  const totalMonto = datos.ventasDia.reduce((s, v) => s + v.monto, 0);
  const filasDias = datos.ventasDia.length
    ? [
        ['Fecha', 'Ventas', 'Monto (S/)'],
        ...datos.ventasDia.map((v) => [formatearFecha(v.dia), v.cantidad, v.monto]),
        ['TOTAL', totalCant, totalMonto],
      ]
    : [['Fecha', 'Ventas', 'Monto (S/)'], ...SIN_DATOS];
  XLSX.utils.book_append_sheet(
    libro,
    construirHoja('VENTAS POR DÍA', g, filasDias, [16, 12, 18], { 1: FMT_ENTERO, 2: FMT_MONEDA }),
    'Ventas por día'
  );

  // --- Ranking de vendedores ---
  const filasRanking = datos.ranking.length
    ? [
        ['#', 'Vendedor', 'Ventas', 'Monto total (S/)', 'Ticket promedio (S/)'],
        ...datos.ranking.map((r) => [r.puesto, r.vendedor, r.ventas, r.monto, r.ticket]),
        ['', 'TOTAL', datos.ranking.reduce((s, r) => s + r.ventas, 0), datos.ranking.reduce((s, r) => s + r.monto, 0), ''],
      ]
    : [['#', 'Vendedor', 'Ventas', 'Monto total (S/)', 'Ticket promedio (S/)'], ...SIN_DATOS];
  XLSX.utils.book_append_sheet(
    libro,
    construirHoja('RANKING DE VENDEDORES', g, filasRanking, [6, 32, 12, 20, 22], { 2: FMT_ENTERO, 3: FMT_MONEDA, 4: FMT_MONEDA }),
    'Ranking vendedores'
  );

  // --- Productos más vendidos ---
  const filasProd = datos.productos.length
    ? [
        ['#', 'Producto', 'Unidades vendidas'],
        ...datos.productos.map((p) => [p.puesto, p.producto, p.unidades]),
        ['', 'TOTAL', datos.productos.reduce((s, p) => s + p.unidades, 0)],
      ]
    : [['#', 'Producto', 'Unidades vendidas'], ...SIN_DATOS];
  XLSX.utils.book_append_sheet(
    libro,
    construirHoja('PRODUCTOS MÁS VENDIDOS', g, filasProd, [6, 46, 20], { 2: FMT_ENTERO }),
    'Productos'
  );

  // --- Clientes frecuentes ---
  const filasCli = datos.clientes.length
    ? [
        ['#', 'Cliente', 'Compras', 'Monto total (S/)', 'Ticket promedio (S/)'],
        ...datos.clientes.map((c) => [c.puesto, c.cliente, c.compras, c.monto, c.ticket]),
        ['', 'TOTAL', datos.clientes.reduce((s, c) => s + c.compras, 0), datos.clientes.reduce((s, c) => s + c.monto, 0), ''],
      ]
    : [['#', 'Cliente', 'Compras', 'Monto total (S/)', 'Ticket promedio (S/)'], ...SIN_DATOS];
  XLSX.utils.book_append_sheet(
    libro,
    construirHoja('CLIENTES FRECUENTES', g, filasCli, [6, 40, 12, 20, 22], { 2: FMT_ENTERO, 3: FMT_MONEDA, 4: FMT_MONEDA }),
    'Clientes'
  );

  XLSX.writeFile(libro, `Dashboard_Rasec_${sufijoArchivo()}.xlsx`);
}

// ===========================================================================
// PDF (documento A4 imprimible)
// ===========================================================================

async function obtenerLogoDataUrl() {
  if (logoDataUrlCache) return logoDataUrlCache;
  const urlAbsoluta = new URL(EMPRESA.LOGO_URL, window.location.origin).href;
  try {
    const r = await fetch(urlAbsoluta);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const blob = await r.blob();
    logoDataUrlCache = await new Promise((ok, err) => {
      const fr = new FileReader();
      fr.onload = () => ok(fr.result);
      fr.onerror = () => err(fr.error);
      fr.readAsDataURL(blob);
    });
    return logoDataUrlCache;
  } catch {
    return urlAbsoluta;
  }
}

/** Tabla del documento. `alineacion` marca qué columnas van a la derecha. */
function tablaHtml(titulo, encabezados, filas, alineacion = [], pieFila = null) {
  const th = encabezados
    .map((h, i) => `<th${alineacion[i] === 'r' ? ' class="r"' : ''}>${esc(h)}</th>`)
    .join('');

  const cuerpo = filas.length
    ? filas
        .map(
          (f) =>
            `<tr>${f
              .map((c, i) => `<td${alineacion[i] === 'r' ? ' class="r"' : ''}>${esc(c)}</td>`)
              .join('')}</tr>`
        )
        .join('')
    : `<tr><td class="vacio" colspan="${encabezados.length}">Sin información para el periodo consultado</td></tr>`;

  const pie = pieFila && filas.length
    ? `<tfoot><tr>${pieFila.map((c, i) => `<td${alineacion[i] === 'r' ? ' class="r"' : ''}>${esc(c)}</td>`).join('')}</tr></tfoot>`
    : '';

  return `
  <section class="bloque">
    <h2>${esc(titulo)}</h2>
    <table>
      <thead><tr>${th}</tr></thead>
      <tbody>${cuerpo}</tbody>
      ${pie}
    </table>
  </section>`;
}

export function construirHtmlDashboard(datos, logo, usuario) {
  const destacados = [
    { rot: 'Ventas del mes', val: entero(datos.indicadores.find((i) => i.indicador === 'Ventas del mes')?.valor) },
    { rot: 'Monto del mes', val: soles(datos.indicadores.find((i) => i.indicador === 'Monto vendido del mes')?.valor) },
    { rot: 'Ventas de hoy', val: entero(datos.indicadores.find((i) => i.indicador === 'Ventas de hoy')?.valor) },
    { rot: 'Pagos de hoy', val: soles(datos.indicadores.find((i) => i.indicador === 'Pagos recibidos hoy')?.valor) },
    { rot: 'Ventas pendientes', val: entero(datos.indicadores.find((i) => i.indicador === 'Ventas pendientes')?.valor) },
  ];

  const tarjetas = destacados
    .map((d) => `<div class="kpi"><span class="kpi-rot">${esc(d.rot)}</span><strong>${esc(d.val)}</strong></div>`)
    .join('');

  // Los indicadores se agrupan para que el bloque se lea por temas.
  const grupos = [...new Set(datos.indicadores.map((i) => i.grupo))];
  const filasIndicadores = grupos.flatMap((g) => [
    [`__GRUPO__${g}`, ''],
    ...datos.indicadores.filter((i) => i.grupo === g).map((i) => [i.indicador, i.tipo === 'moneda' ? soles(i.valor) : entero(i.valor)]),
  ]);

  const tablaIndicadores = `
  <section class="bloque">
    <h2>Indicadores generales</h2>
    <table>
      <thead><tr><th>Indicador</th><th class="r">Valor</th></tr></thead>
      <tbody>
        ${filasIndicadores
          .map(([a, b]) =>
            String(a).startsWith('__GRUPO__')
              ? `<tr class="grupo"><td colspan="2">${esc(String(a).replace('__GRUPO__', ''))}</td></tr>`
              : `<tr><td>${esc(a)}</td><td class="r">${esc(b)}</td></tr>`
          )
          .join('')}
      </tbody>
    </table>
  </section>`;

  const totalDiasCant = datos.ventasDia.reduce((s, v) => s + v.cantidad, 0);
  const totalDiasMonto = datos.ventasDia.reduce((s, v) => s + v.monto, 0);

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Dashboard ${esc(EMPRESA.RAZON_SOCIAL)}</title>
<style>
  @page { size: A4 portrait; margin: 14mm 12mm 16mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font: 11px/1.45 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #1e293b;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .hoja { max-width: 186mm; margin: 0 auto; }

  header.cab {
    display: flex; align-items: center; gap: 14px;
    border-bottom: 2.5px solid #B91C1C; padding-bottom: 10px; margin-bottom: 14px;
  }
  header.cab img { width: 58px; height: 58px; object-fit: contain; }
  .cab-txt { flex: 1; }
  .cab-txt h1 { margin: 0; font-size: 17px; letter-spacing: .04em; color: #7F1D1D; }
  .cab-txt .rubro { color: #556477; font-size: 10px; margin-top: 2px; }
  .cab-meta { text-align: right; font-size: 10px; color: #556477; line-height: 1.6; }
  .cab-meta strong { color: #1e293b; display: block; font-size: 12px; letter-spacing: .06em; }

  .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 16px; }
  .kpi {
    border: 1px solid #d5dae0; border-top: 3px solid #B91C1C; border-radius: 4px;
    padding: 8px 9px; background: #f8fafc;
  }
  .kpi-rot { display: block; font-size: 8.5px; text-transform: uppercase; letter-spacing: .07em; color: #556477; margin-bottom: 3px; }
  .kpi strong { font-size: 14px; color: #1e293b; font-variant-numeric: tabular-nums; }

  .bloque { margin-bottom: 15px; break-inside: avoid; }
  .bloque h2 {
    font-size: 11px; text-transform: uppercase; letter-spacing: .1em;
    color: #7F1D1D; margin: 0 0 6px; padding-bottom: 4px; border-bottom: 1px solid #d5dae0;
  }
  table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
  thead th {
    background: #eef1f5; font-size: 9px; text-transform: uppercase; letter-spacing: .06em;
    color: #475569; text-align: left; padding: 5px 7px; border-bottom: 1.5px solid #bcc3cb;
  }
  tbody td { padding: 4.5px 7px; border-bottom: 1px solid #e8ebef; }
  tbody tr:nth-child(even) td { background: #fafbfc; }
  tr.grupo td {
    background: #eef1f5 !important; font-weight: 700; font-size: 9px;
    text-transform: uppercase; letter-spacing: .07em; color: #556477; padding: 4px 7px;
  }
  tfoot td { padding: 5px 7px; border-top: 1.5px solid #bcc3cb; font-weight: 700; background: #f4f6f8; }
  td.r, th.r { text-align: right; }
  td.vacio { text-align: center; color: #8b95a2; font-style: italic; padding: 10px; }

  footer.pie {
    margin-top: 16px; padding-top: 8px; border-top: 1px solid #d5dae0;
    display: flex; justify-content: space-between; font-size: 9px; color: #8b95a2;
  }
  .barra-print { text-align: center; margin-bottom: 12px; }
  .barra-print button {
    background: #B91C1C; color: #fff; border: 0; border-radius: 6px;
    padding: 9px 22px; font-size: 12px; font-weight: 600; cursor: pointer;
  }
  @media print { .barra-print { display: none; } }
</style>
</head>
<body>
<div class="hoja">
  <div class="barra-print"><button type="button" onclick="window.print()">Imprimir o guardar como PDF</button></div>

  <header class="cab">
    <img id="logo-principal" src="${esc(logo)}" alt="">
    <div class="cab-txt">
      <h1>${esc(EMPRESA.RAZON_SOCIAL)}</h1>
      <div class="rubro">${esc(EMPRESA.RUBRO)}</div>
    </div>
    <div class="cab-meta">
      <strong>REPORTE DE DASHBOARD</strong>
      Generado: ${esc(datos.generado)}<br>
      ${usuario ? `Emitido por: ${esc(usuario)}` : ''}
    </div>
  </header>

  <div class="kpis">${tarjetas}</div>

  ${tablaIndicadores}

  ${tablaHtml(
    'Pedidos por estado de tracking',
    ['Estado', 'Pedidos'],
    datos.tracking.map((t) => [t.estado, entero(t.cantidad)]),
    ['l', 'r']
  )}

  ${tablaHtml(
    'Ventas por día',
    ['Fecha', 'Ventas', 'Monto'],
    datos.ventasDia.map((v) => [formatearFecha(v.dia), entero(v.cantidad), soles(v.monto)]),
    ['l', 'r', 'r'],
    ['TOTAL', entero(totalDiasCant), soles(totalDiasMonto)]
  )}

  ${tablaHtml(
    'Ranking de vendedores',
    ['#', 'Vendedor', 'Ventas', 'Monto total', 'Ticket promedio'],
    datos.ranking.map((r) => [r.puesto, r.vendedor, entero(r.ventas), soles(r.monto), soles(r.ticket)]),
    ['l', 'l', 'r', 'r', 'r'],
    ['', 'TOTAL', entero(datos.ranking.reduce((s, r) => s + r.ventas, 0)), soles(datos.ranking.reduce((s, r) => s + r.monto, 0)), '']
  )}

  ${tablaHtml(
    'Productos más vendidos',
    ['#', 'Producto', 'Unidades'],
    datos.productos.map((p) => [p.puesto, p.producto, entero(p.unidades)]),
    ['l', 'l', 'r'],
    ['', 'TOTAL', entero(datos.productos.reduce((s, p) => s + p.unidades, 0))]
  )}

  ${tablaHtml(
    'Clientes frecuentes',
    ['#', 'Cliente', 'Compras', 'Monto total', 'Ticket promedio'],
    datos.clientes.map((c) => [c.puesto, c.cliente, entero(c.compras), soles(c.monto), soles(c.ticket)]),
    ['l', 'l', 'r', 'r', 'r'],
    ['', 'TOTAL', entero(datos.clientes.reduce((s, c) => s + c.compras, 0)), soles(datos.clientes.reduce((s, c) => s + c.monto, 0)), '']
  )}

  <footer class="pie">
    <span>${esc(EMPRESA.RAZON_SOCIAL)} — documento generado por el sistema</span>
    <span>${esc(datos.generado)}</span>
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

const HTML_ESPERA = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Generando reporte…</title></head>
<body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#10192b;color:#c7cedb;font:600 14px/1.4 'Segoe UI',Helvetica,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase">
Generando reporte…</body></html>`;

/**
 * Abre el dashboard como documento A4 listo para imprimir o guardar en PDF.
 *
 * La ventana se abre de forma síncrona —antes de cualquier await— porque tras
 * un await se pierde el gesto del usuario y actúa el bloqueador de pop-ups.
 */
export async function exportarDashboardPDF(datos, opciones = {}) {
  const ventana = window.open('', '_blank', 'width=980,height=1040');
  if (ventana) escribirEn(ventana.document, HTML_ESPERA);

  const logo = await obtenerLogoDataUrl();
  const html = construirHtmlDashboard(datos, logo, opciones.usuario);

  if (!ventana) {
    // Plan B: el navegador bloqueó la ventana emergente.
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    escribirEn(iframe.contentDocument, html);
    setTimeout(() => iframe.remove(), MS_VIDA_IFRAME);
    return 'iframe';
  }

  escribirEn(ventana.document, html);
  return 'ventana';
}
