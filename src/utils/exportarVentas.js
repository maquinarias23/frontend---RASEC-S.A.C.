// ---------------------------------------------------------------------------
// Exportación de ventas a Excel.
//
// Tres hojas, para que cada pregunta se responda en la suya:
//   "Ventas"   — una fila por venta, con cliente, vendedor, destino, importes,
//                cobranza y estado de facturación (incluido quién facturó).
//   "Productos"— una fila por producto vendido, para cruzar qué se vendió.
//   "Pagos"    — una fila por pago recibido, con quién lo registró.
//
// Los importes se escriben como números con formato de soles: quedan sumables
// en Excel en vez de ser texto.
// ---------------------------------------------------------------------------

import * as XLSX from 'xlsx';
import {
  EMPRESA, TIPO_ENTREGA, TIPO_COMPROBANTE_LABEL, ESTADO_COMPROBANTE_LABEL,
  ESTADO_COMPROBANTE, COMPROBANTE_NUMERO, METODOS_PAGO_LABEL,
} from '../config/constants';
import { comprobanteVigente } from './facturacionVenta';

const FMT_MONEDA = '"S/" #,##0.00';
const FMT_ENTERO = '#,##0';

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

const titulo = (v) => (v ? String(v).replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : '');

/** "Lima / Lima / Miraflores", la dirección escrita a mano, o "Tienda". */
export const destinoDeVenta = (venta) => {
  if (venta?.tipo_entrega === TIPO_ENTREGA.RETIRO_EN_TIENDA) return 'Retiro en tienda';
  const partes = [
    venta?.tbl_departamentos?.nombre,
    venta?.tbl_provincias?.nombre,
    venta?.tbl_distritos?.nombre,
  ].filter(Boolean);
  if (partes.length) return partes.join(' / ');
  return venta?.direccion_manual || '';
};

/** Estado de facturación en una palabra, para la columna del Excel. */
const estadoFacturacion = (venta) => {
  const lista = venta?.comprobantes || [];
  if (lista.length === 0) return 'Sin facturar';
  const vigente = comprobanteVigente(venta);
  if (!vigente) return 'Anulado';
  if (vigente.estado === ESTADO_COMPROBANTE.ACEPTADO_SUNAT) return 'Facturado';
  if (vigente.estado === ESTADO_COMPROBANTE.ERROR || vigente.estado === ESTADO_COMPROBANTE.RECHAZADO_SUNAT) {
    return 'Con error';
  }
  return 'En proceso';
};

function construirHoja(rotulo, generado, filas, anchos, formatos = {}) {
  const cabecera = [[EMPRESA.RAZON_SOCIAL], [rotulo], [`Generado: ${generado}`], []];
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
 * @param {Array}  ventas    ventas tal como las devuelve GET /ventas
 * @param {Object} contexto  { filtrosTexto } para dejar constancia del filtro
 */
export function exportarVentasExcel(ventas, contexto = {}) {
  const generado = selloTiempo();
  const libro = XLSX.utils.book_new();
  const lista = Array.isArray(ventas) ? ventas : [];

  // --- Hoja 1: una venta por fila ---
  const encabezado = [
    'N° Venta', 'Fecha', 'Cliente', 'Documento', 'Vendedor', 'Estado venta',
    'Estado tracking', 'Tipo entrega', 'Destino', 'Transportista',
    'Subtotal', 'Descuentos', 'Total', 'Pagado', 'Saldo', 'Pago completo',
    'Facturación', 'N° Comprobante', 'Tipo', 'Emitido por', 'Fecha emisión',
    'Motivo cancelación',
  ];

  const filas = lista.map((v) => {
    const comp = comprobanteVigente(v);
    const descuentos = aNumero(v.descuento_promocion) + aNumero(v.descuento_puntos);
    return [
      v.id,
      fechaHora(v.fecha_hora_registro),
      v.tbl_clientes?.nombre || '',
      v.tbl_clientes?.dni || '',
      v.tbl_usuarios?.nombres || '',
      titulo(v.estado_venta),
      titulo(v.estado_tracking),
      titulo(v.tipo_entrega),
      destinoDeVenta(v),
      v.tbl_transportistas?.nombre || '',
      aNumero(v.subtotal),
      descuentos,
      aNumero(v.total),
      aNumero(v.total_pagado),
      aNumero(v.saldo_pendiente),
      v.pago_completo ? 'Sí' : 'No',
      estadoFacturacion(v),
      comp ? COMPROBANTE_NUMERO.formatear(comp.serie, comp.numero) : '',
      comp ? (TIPO_COMPROBANTE_LABEL[comp.tipo_comprobante] || comp.tipo_comprobante) : '',
      comp?.tbl_usuarios?.nombres || '',
      comp ? fechaHora(comp.fecha_emision) : '',
      v.motivo_cancelacion || '',
    ];
  });

  // Los totales excluyen las ventas canceladas: sumarlas daría una cifra que no
  // corresponde a nada real.
  const vigentes = lista.filter((v) => v.estado_venta !== 'cancelada' && v.estado_venta !== 'rechazada');
  const sum = (campo) => vigentes.reduce((s, v) => s + aNumero(v[campo]), 0);

  const cuerpo = filas.length
    ? [
        encabezado,
        ...filas,
        [
          `TOTAL (${vigentes.length} ventas, sin canceladas ni rechazadas)`,
          '', '', '', '', '', '', '', '', '',
          sum('subtotal'),
          vigentes.reduce((s, v) => s + aNumero(v.descuento_promocion) + aNumero(v.descuento_puntos), 0),
          sum('total'), sum('total_pagado'), sum('saldo_pendiente'),
          '', '', '', '', '', '', '',
        ],
      ]
    : [encabezado, ['Sin ventas para los filtros aplicados']];

  XLSX.utils.book_append_sheet(
    libro,
    construirHoja(
      contexto.filtrosTexto ? `VENTAS — ${contexto.filtrosTexto}` : 'VENTAS',
      generado, cuerpo,
      [10, 18, 32, 14, 26, 15, 22, 18, 32, 20, 13, 13, 13, 13, 13, 14, 14, 18, 12, 26, 18, 40],
      { 0: FMT_ENTERO, 10: FMT_MONEDA, 11: FMT_MONEDA, 12: FMT_MONEDA, 13: FMT_MONEDA, 14: FMT_MONEDA }
    ),
    'Ventas'
  );

  // --- Hoja 2: un producto por fila ---
  const encProd = ['N° Venta', 'Fecha', 'Cliente', 'Vendedor', 'Producto', 'Regalo', 'Cantidad', 'P. Unitario', 'Subtotal'];
  const filasProd = lista.flatMap((v) =>
    (v.items_venta || []).map((i) => {
      const cantidad = aNumero(i.cantidad);
      const precio = aNumero(i.precio_unitario_vendido);
      return [
        v.id,
        fechaHora(v.fecha_hora_registro),
        v.tbl_clientes?.nombre || '',
        v.tbl_usuarios?.nombres || '',
        i.tbl_productos?.nombre || `Producto #${i.product_id}`,
        i.es_regalo ? 'Sí' : 'No',
        cantidad,
        precio,
        // Un regalo no suma al importe de la venta: se deja en 0 para que el
        // total de la hoja cuadre con lo efectivamente cobrado.
        i.es_regalo ? 0 : cantidad * precio,
      ];
    })
  );

  const cuerpoProd = filasProd.length
    ? [
        encProd,
        ...filasProd,
        ['TOTAL', '', '', '', '', '',
          filasProd.reduce((s, f) => s + f[6], 0), '',
          filasProd.reduce((s, f) => s + f[8], 0)],
      ]
    : [encProd, ['Sin productos en las ventas exportadas']];

  XLSX.utils.book_append_sheet(
    libro,
    construirHoja('PRODUCTOS VENDIDOS', generado, cuerpoProd,
      [10, 18, 32, 26, 46, 9, 11, 14, 14],
      { 0: FMT_ENTERO, 6: FMT_ENTERO, 7: FMT_MONEDA, 8: FMT_MONEDA }),
    'Productos'
  );

  // --- Hoja 3: un pago por fila ---
  const encPagos = ['N° Venta', 'Cliente', 'Vendedor', 'Fecha del pago', 'Método', 'Monto', 'Registrado por', 'Vouchers'];
  const filasPagos = lista.flatMap((v) =>
    (v.pagos || []).map((p) => [
      v.id,
      v.tbl_clientes?.nombre || '',
      v.tbl_usuarios?.nombres || '',
      fechaHora(p.fecha_hora),
      METODOS_PAGO_LABEL[p.metodo_pago] || titulo(p.metodo_pago),
      aNumero(p.monto),
      p.tbl_usuarios?.nombres || '',
      (p.adjuntos || []).length,
    ])
  );

  const cuerpoPagos = filasPagos.length
    ? [
        encPagos,
        ...filasPagos,
        ['TOTAL', '', '', '', '', filasPagos.reduce((s, f) => s + f[5], 0), '', ''],
      ]
    : [encPagos, ['Sin pagos registrados en las ventas exportadas']];

  XLSX.utils.book_append_sheet(
    libro,
    construirHoja('PAGOS RECIBIDOS', generado, cuerpoPagos,
      [10, 32, 26, 18, 20, 14, 26, 10],
      { 0: FMT_ENTERO, 5: FMT_MONEDA, 7: FMT_ENTERO }),
    'Pagos'
  );

  XLSX.writeFile(libro, `Ventas_Rasec_${sufijoArchivo()}.xlsx`);
  return { ventas: lista.length, productos: filasProd.length, pagos: filasPagos.length };
}
