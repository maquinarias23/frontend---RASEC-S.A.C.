import { formatearMoneda } from './formato';

/**
 * Abre una ventana de impresion con rotulos de productos.
 * Si hay datos de unidades (serial + codigo_barras), genera etiquetas con codigo de barras CODE128.
 * Si no hay unidades, genera etiquetas simples (nombre + precio).
 *
 * @param {Object} compra - Datos de la compra/importacion con items y opcionalmente unidades_producto
 * @param {Object} opciones
 */
export function imprimirRotulosProductos(compra, opciones = {}) {
  const { etiqueta = 'Compra', campoFecha = 'fecha_compra' } = opciones;
  const items = compra.items || [];
  if (items.length === 0) return;

  const fecha = compra[campoFecha];
  const fechaStr = fecha
    ? new Date(fecha).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';

  const unidadesProducto = compra.unidades_producto || [];

  // Mapear unidades por product_id para vincularlas con items
  const unidadesPorProducto = {};
  for (const u of unidadesProducto) {
    if (!unidadesPorProducto[u.product_id]) unidadesPorProducto[u.product_id] = [];
    unidadesPorProducto[u.product_id].push(u);
  }

  const tieneUnidades = unidadesProducto.length > 0;

  if (tieneUnidades) {
    imprimirConCodigoBarras(compra, items, unidadesPorProducto, etiqueta, fechaStr);
  } else {
    imprimirSimple(compra, items, etiqueta, fechaStr);
  }
}

/**
 * Imprime etiquetas CON codigo de barras (una por unidad fisica).
 */
function imprimirConCodigoBarras(compra, items, unidadesPorProducto, etiqueta, fechaStr) {
  const labels = [];
  for (const item of items) {
    const nombre = item.tbl_productos?.nombre || `Producto #${item.product_id}`;
    const categoria = item.tbl_productos?.tbl_categorias_producto?.nombre || '';
    const unidades = unidadesPorProducto[item.product_id] || [];

    for (const u of unidades) {
      labels.push({
        nombre,
        categoria,
        serial: u.serial,
        codigo_barras: u.codigo_barras,
      });
    }
  }

  if (labels.length === 0) return;

  const labelsHtml = labels.map((u, i) => `
    <div class="label">
      <div class="empresa">Maquinarias RASEC S.A.C.</div>
      <div class="prod">${u.nombre}</div>
      ${u.categoria ? `<div class="cat">${u.categoria}</div>` : ''}
      <svg id="bc-${i}" class="bc" data-code="${u.codigo_barras}"></svg>
      <div class="serial">SN: ${u.serial}</div>
      <div class="meta">${etiqueta} #${compra.id} — ${fechaStr}</div>
    </div>
  `).join('');

  const ventana = window.open('', '_blank', 'width=800,height=600');
  if (!ventana) return;

  ventana.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Rotulos - ${etiqueta} #${compra.id}</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;padding:10px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
h1{font-size:14px;text-align:center;margin-bottom:10px;color:#333}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.label{border:1.5px solid #333;border-radius:6px;padding:10px 8px;text-align:center;page-break-inside:avoid;display:flex;flex-direction:column;gap:2px}
.empresa{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#c0392b;border-bottom:1px solid #ddd;padding-bottom:3px;margin-bottom:2px}
.prod{font-size:11px;font-weight:800;text-transform:uppercase;line-height:1.2;color:#111}
.cat{font-size:8px;color:#666;text-transform:uppercase;letter-spacing:0.5px}
.bc{display:block;margin:4px auto 2px}
.serial{font-size:9px;color:#555;font-family:monospace}
.meta{font-size:7px;color:#999;margin-top:2px}
@media print{@page{margin:5mm}h1{margin-bottom:6px}}
</style></head><body>
<h1>Rotulos — ${etiqueta} #${compra.id}</h1>
<div class="grid">${labelsHtml}</div>
<script>
document.querySelectorAll('.bc').forEach(function(svg){
  try{JsBarcode(svg,svg.dataset.code,{format:"CODE128",width:1.5,height:40,displayValue:true,fontSize:9,margin:2,font:"monospace"})}catch(e){}
});
window.onload=function(){setTimeout(function(){window.print()},500)};
<\/script></body></html>`);
  ventana.document.close();
}

/**
 * Imprime etiquetas simples SIN codigo de barras (fallback cuando no hay unidades).
 */
function imprimirSimple(compra, items, etiqueta, fechaStr) {
  const rotulos = [];
  for (const item of items) {
    const nombre = item.tbl_productos?.nombre || `Producto #${item.product_id}`;
    const categoria = item.tbl_productos?.tbl_categorias_producto?.nombre || '';
    const precio = item.costo_unitario_manual || item.tbl_productos?.precio_venta_base || 0;
    for (let i = 0; i < (item.cantidad || 1); i++) {
      rotulos.push({ nombre, categoria, precio });
    }
  }

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Rotulos - ${etiqueta} #${compra.id}</title>
<style>
  @page { size: auto; margin: 8mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .rotulo {
    border: 1.5px solid #333; border-radius: 6px; padding: 10px 12px;
    page-break-inside: avoid; display: flex; flex-direction: column; gap: 3px;
  }
  .empresa { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #c0392b; text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 2px; }
  .producto { font-size: 12px; font-weight: 800; text-transform: uppercase; text-align: center; line-height: 1.2; }
  .categoria { font-size: 8px; color: #666; text-transform: uppercase; text-align: center; letter-spacing: 0.5px; }
  .precio { font-size: 16px; font-weight: 900; color: #c0392b; text-align: center; margin-top: 2px; }
  .meta { font-size: 7px; color: #999; text-align: center; margin-top: 2px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="grid">${rotulos.map(r => `
  <div class="rotulo">
    <div class="empresa">Maquinarias RASEC S.A.C.</div>
    <div class="producto">${r.nombre}</div>
    ${r.categoria ? `<div class="categoria">${r.categoria}</div>` : ''}
    <div class="precio">${formatearMoneda(parseFloat(r.precio) || 0)}</div>
    <div class="meta">${etiqueta} #${compra.id} — ${fechaStr}</div>
  </div>`).join('')}
</div>
<script>window.onload=()=>{window.print();}<\/script>
</body></html>`;

  const win = window.open('', '_blank', 'width=800,height=600');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
