// ---------------------------------------------------------------------------
// Exportación de comprobantes electrónicos a Excel.
//
// Dos hojas:
//   "Comprobantes" — una fila por comprobante, con los datos de la venta que lo
//                    originó (vendedor, ciudad) que no viven en el comprobante.
//   "Detalle"      — una fila por producto facturado, para cruzar qué se vendió.
//
// Los importes se escriben como números con formato de soles: quedan sumables
// en Excel en vez de ser texto.
// ---------------------------------------------------------------------------

import * as XLSX from 'xlsx';
import { EMPRESA, TIPO_COMPROBANTE_LABEL, ESTADO_COMPROBANTE_LABEL, COMPROBANTE_NUMERO } from '../config/constants';

const FMT_MONEDA = '"S/" #,##0.00';
const FMT_ENTERO = '#,##0';
const FMT_DECIMAL = '#,##0.00';

const aNumero = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

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

const fechaHora = (v) => (v ? new Intl.DateTimeFormat('es-PE', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima',
}).format(new Date(v)) : '');

const soloFecha = (v) => (v ? new Intl.DateTimeFormat('es-PE', {
  day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Lima',
}).format(new Date(v)) : '');

/** "Lima / Lima / Miraflores" o la dirección manual si no hay ubigeo. */
export const ciudadDeVenta = (venta) => {
  if (!venta) return '';
  const partes = [
    venta.tbl_departamentos?.nombre,
    venta.tbl_provincias?.nombre,
    venta.tbl_distritos?.nombre,
  ].filter(Boolean);
  if (partes.length) return partes.join(' / ');
  return venta.direccion_manual || '';
};

/** Productos facturados, resumidos en una celda. */
const productosDe = (comp) =>
  (comp.items || [])
    .map((i) => (aNumero(i.cantidad) > 1 ? `${i.descripcion} x${aNumero(i.cantidad)}` : i.descripcion))
    .join(' + ');

function construirHoja(titulo, generado, filas, anchos, formatos = {}) {
  const cabecera = [[EMPRESA.RAZON_SOCIAL], [titulo], [`Generado: ${generado}`], []];
  const hoja = XLSX.utils.aoa_to_sheet([...cabecera, ...filas]);
  const filaEncabezado = cabecera.length;

  hoja['!cols'] = anchos.map((w) => ({ wch: w }));
  hoja['!merges'] = [0, 1, 2].map((r) => ({
    s: { r, c: 0 }, e: { r, c: Math.max(anchos.length - 1, 1) },
  }));
  hoja['!freeze'] = { xSplit: 0, ySplit: filaEncabezado + 1 };
  hoja['!autofilter'] = {
    ref: XLSX.utils.encode_range(
      { r: filaEncabezado, c: 0 },
      { r: filaEncabezado + Math.max(filas.length - 1, 0), c: anchos.length - 1 }
    ),
  };

  for (const [col, fmt] of Object.entries(formatos)) {
    for (let r = filaEncabezado + 1; r < filaEncabezado + filas.length; r++) {
      const ref = XLSX.utils.encode_cell({ r, c: Number(col) });
      if (hoja[ref] && hoja[ref].t === 'n') hoja[ref].z = fmt;
    }
  }
  return hoja;
}

/**
 * @param {Array} comprobantes  lo que devuelve /comprobantes (con tbl_ventas e items)
 * @param {Object} contexto     { filtrosTexto } para dejar constancia del filtro aplicado
 */
export function exportarComprobantesExcel(comprobantes, contexto = {}) {
  const generado = selloTiempo();
  const libro = XLSX.utils.book_new();
  const lista = Array.isArray(comprobantes) ? comprobantes : [];

  // --- Hoja 1: un comprobante por fila ---
  const encabezado = [
    'N° Comprobante', 'Tipo', 'Fecha emisión', 'Estado', 'Anulado',
    'Cliente', 'Documento', 'N° Venta', 'Vendedor', 'Ciudad / Destino',
    'Productos', 'Subtotal', 'IGV', 'Total', 'Emitido por', 'Registrado',
  ];

  const filas = lista.map((c) => [
    COMPROBANTE_NUMERO.formatear(c.serie, c.numero),
    TIPO_COMPROBANTE_LABEL[c.tipo_comprobante] || c.tipo_comprobante,
    soloFecha(c.fecha_emision),
    ESTADO_COMPROBANTE_LABEL[c.estado] || c.estado,
    c.anulado ? 'SÍ' : 'No',
    c.cliente_nombre || '',
    c.cliente_documento || '',
    c.sale_order_id ?? '',
    c.tbl_ventas?.tbl_usuarios?.nombres || '',
    ciudadDeVenta(c.tbl_ventas),
    productosDe(c),
    aNumero(c.subtotal),
    aNumero(c.igv),
    aNumero(c.total),
    c.tbl_usuarios?.nombres || '',
    fechaHora(c.fecha_hora_registro),
  ]);

  const totalGeneral = lista.reduce((s, c) => s + (c.anulado ? 0 : aNumero(c.total)), 0);
  const totalIgv = lista.reduce((s, c) => s + (c.anulado ? 0 : aNumero(c.igv)), 0);
  const totalSub = lista.reduce((s, c) => s + (c.anulado ? 0 : aNumero(c.subtotal)), 0);

  const cuerpo = filas.length
    ? [
        encabezado,
        ...filas,
        ['TOTAL (sin anulados)', '', '', '', '', '', '', '', '', '', '', totalSub, totalIgv, totalGeneral, '', ''],
      ]
    : [encabezado, ['Sin comprobantes para los filtros aplicados']];

  XLSX.utils.book_append_sheet(
    libro,
    construirHoja(
      contexto.filtrosTexto ? `COMPROBANTES — ${contexto.filtrosTexto}` : 'COMPROBANTES ELECTRÓNICOS',
      generado,
      cuerpo,
      [18, 16, 14, 16, 9, 34, 14, 10, 26, 30, 44, 14, 12, 14, 24, 18],
      { 7: FMT_ENTERO, 11: FMT_MONEDA, 12: FMT_MONEDA, 13: FMT_MONEDA }
    ),
    'Comprobantes'
  );

  // --- Hoja 2: un producto facturado por fila ---
  const encDetalle = ['N° Comprobante', 'Fecha', 'Cliente', 'Vendedor', 'Producto', 'Cantidad', 'P. Unitario', 'Subtotal'];
  const filasDetalle = lista.flatMap((c) =>
    (c.items || []).map((i) => [
      COMPROBANTE_NUMERO.formatear(c.serie, c.numero),
      soloFecha(c.fecha_emision),
      c.cliente_nombre || '',
      c.tbl_ventas?.tbl_usuarios?.nombres || '',
      i.descripcion || '',
      aNumero(i.cantidad),
      aNumero(i.precio_unitario),
      aNumero(i.subtotal_item),
    ])
  );

  const cuerpoDetalle = filasDetalle.length
    ? [
        encDetalle,
        ...filasDetalle,
        ['TOTAL', '', '', '', '', filasDetalle.reduce((s, f) => s + f[5], 0), '', filasDetalle.reduce((s, f) => s + f[7], 0)],
      ]
    : [encDetalle, ['Sin detalle disponible para los comprobantes exportados']];

  XLSX.utils.book_append_sheet(
    libro,
    construirHoja('DETALLE DE PRODUCTOS FACTURADOS', generado, cuerpoDetalle,
      [18, 14, 34, 26, 46, 12, 14, 14],
      { 5: FMT_DECIMAL, 6: FMT_MONEDA, 7: FMT_MONEDA }),
    'Detalle'
  );

  XLSX.writeFile(libro, `Comprobantes_Rasec_${sufijoArchivo()}.xlsx`);
  return { comprobantes: lista.length, items: filasDetalle.length };
}
