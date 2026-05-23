import { useMemo } from 'react';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi';
import useFormulasImportacion from './useFormulasImportacion';

const itemVacio = {
  product_id: '', cantidad: 1, codigo_aduanero: '', unidad_medida: 'Kg', peso: '',
  costo_total_usd: '', advaloren_usd: '', flete_usd: '', seguro_usd: '',
  costo_unitario_usd: 0, costo_total_calc_usd: 0, costo_total_soles: 0,
  otros_gastos_soles: 0, costo_almacen_soles: 0, costo_unit_almacen_sol: 0,
};

// Columnas del sistema (para saber si guardar en _custom o directo)
const CAMPOS_SISTEMA = new Set([
  'codigo_aduanero', 'articulo', 'cantidad', 'unidad_medida', 'peso',
  'costo_total_usd', 'advaloren_usd', 'flete_usd', 'seguro_usd',
  'costo_unitario_usd', 'costo_total_calc_usd', 'costo_total_soles',
  'otros_gastos_soles', 'costo_almacen_soles', 'costo_unit_almacen_sol',
]);

// ── Orden por defecto (coincide con el Excel original) ──
// Zona 'blue' = sección manual/azul, 'purple' = sección calculada/morada
const COLUMNAS_DEFAULT = [
  // — Zona Azul (campos de entrada + C.U$ calculado en posición original) —
  { col: 'codigo_aduanero', nombre: 'Codigo',       zona: 'blue',   editable: true,  w: '95px',  tipo: 'text' },
  { col: 'articulo',        nombre: 'Articulo',      zona: 'blue',   editable: true,  w: null,    tipo: 'select-producto' },
  { col: 'cantidad',        nombre: 'Cantidad',      zona: 'blue',   editable: true,  w: '58px',  tipo: 'int' },
  { col: 'unidad_medida',   nombre: 'UM',            zona: 'blue',   editable: true,  w: '52px',  tipo: 'select-um' },
  { col: 'peso',            nombre: 'Peso',          zona: 'blue',   editable: true,  w: '78px',  tipo: 'decimal' },
  { col: 'costo_unitario_usd', nombre: 'C.U $',      zona: 'blue',   editable: false, w: '78px',  tipo: 'calc' },
  { col: 'costo_total_usd', nombre: 'C.T $',         zona: 'blue',   editable: true,  w: '85px',  tipo: 'decimal' },
  { col: 'advaloren_usd',   nombre: 'Advaloren $',   zona: 'blue',   editable: true,  w: '80px',  tipo: 'decimal' },
  { col: 'flete_usd',       nombre: 'Flete $',       zona: 'blue',   editable: true,  w: '75px',  tipo: 'decimal' },
  { col: 'seguro_usd',      nombre: 'Seguro $',      zona: 'blue',   editable: true,  w: '75px',  tipo: 'decimal' },
  // — Zona Morada (campos calculados) —
  { col: 'costo_total_calc_usd',  nombre: 'C. Total $',     zona: 'purple', editable: false, w: '90px',  tipo: 'calc' },
  { col: 'costo_total_soles',     nombre: 'C. Total S/',    zona: 'purple', editable: false, w: '95px',  tipo: 'calc' },
  { col: 'otros_gastos_soles',    nombre: 'Otros Gtos S/',  zona: 'purple', editable: false, w: '95px',  tipo: 'calc' },
  { col: 'costo_almacen_soles',   nombre: 'C.T Alm S/',     zona: 'purple', editable: false, w: '90px',  tipo: 'calc' },
  { col: 'costo_unit_almacen_sol', nombre: 'C.U Alm S/',    zona: 'purple', editable: false, w: '85px',  tipo: 'calc' },
];

// Columnas que NO se suman en totales
const NO_SUMABLE = new Set(['codigo_aduanero', 'articulo', 'unidad_medida']);

export default function TablaProductosImportacion({ items, onItemsChange, productos, tipoCambio, formulasConfig, totalOtrosGastosSoles }) {
  const { recalcularItems } = useFormulasImportacion(formulasConfig);

  // Construir columnas: si hay config, adaptarla; si no, usar defaults
  const columnas = useMemo(() => {
    if (!formulasConfig || formulasConfig.length === 0) return COLUMNAS_DEFAULT;

    const activas = formulasConfig.filter(f => f.activa).sort((a, b) => a.orden - b.orden);

    // Determinar el corte azul/púrpura: la zona púrpura empieza en la última
    // secuencia continua de columnas no-manuales al final de la lista
    let corte = activas.length;
    for (let i = activas.length - 1; i >= 0; i--) {
      if (activas[i].es_manual) break;
      corte = i;
    }

    return activas.map((f, i) => {
      const def = COLUMNAS_DEFAULT.find(d => d.col === f.columna);
      return {
        col: f.columna,
        nombre: def?.nombre || f.nombre_display || f.columna,
        zona: i < corte ? 'blue' : 'purple',
        editable: f.es_manual && !f.formula,
        w: def?.w || '85px',
        tipo: def?.tipo || (f.es_manual ? 'decimal' : 'calc'),
        esCustom: f.es_personalizada || false,
        configId: f.id,
      };
    });
  }, [formulasConfig]);

  // Contar columnas por zona para los colSpan del header
  const zonaCounts = useMemo(() => {
    const blue = columnas.filter(c => c.zona === 'blue').length;
    const purple = columnas.filter(c => c.zona === 'purple').length;
    return { blue, purple };
  }, [columnas]);

  // ── Helpers ──
  const getValor = (item, col) => {
    if (CAMPOS_SISTEMA.has(col) || col === 'product_id') return item[col];
    return item._custom?.[col] ?? '';
  };

  const actualizarItem = (idx, campo, valor) => {
    const nuevos = [...items];
    if (!CAMPOS_SISTEMA.has(campo) && campo !== 'product_id') {
      nuevos[idx] = { ...nuevos[idx], _custom: { ...nuevos[idx]._custom, [campo]: valor } };
    } else {
      nuevos[idx] = { ...nuevos[idx], [campo]: valor };
    }
    onItemsChange(recalcularItems(nuevos, tipoCambio, totalOtrosGastosSoles));
  };

  const agregarItem = () => onItemsChange([...items, { ...itemVacio }]);

  const eliminarItem = (idx) => {
    const nuevos = items.filter((_, i) => i !== idx);
    onItemsChange(recalcularItems(nuevos.length > 0 ? nuevos : [{ ...itemVacio }], tipoCambio, totalOtrosGastosSoles));
  };

  const fmt = (v) => {
    const n = parseFloat(v);
    return isNaN(n) || n === 0 ? '-' : n.toLocaleString('es-PE', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  };

  // Totales
  const totales = useMemo(() => {
    const result = {};
    for (const c of columnas) {
      if (!NO_SUMABLE.has(c.col)) {
        result[c.col] = items.reduce((sum, it) => sum + (parseFloat(getValor(it, c.col)) || 0), 0);
      }
    }
    return result;
  }, [items, columnas]);

  // ── Estilos base ──
  const inputCls = 'bg-transparent border-0 w-full text-xs text-steel-100 focus:outline-none focus:ring-1 focus:ring-blue-500/50 px-1.5 py-1.5';
  const calcCls  = 'text-right px-2 py-1.5 text-xs bg-fuchsia-950/40';

  // ── Renderizar celda individual ──
  const renderCelda = (item, idx, c, isLastBlue) => {
    const key = c.col;
    const borderR = isLastBlue ? ' border-r border-steel-600' : '';
    const blueBg = c.zona === 'blue' ? ' bg-sky-950/30' : '';

    // Calculada (read-only) — tanto zona purple como blue con editable=false
    if (!c.editable || c.tipo === 'calc') {
      const isBlueCalc = c.zona === 'blue';
      const cls = isBlueCalc
        ? `text-right px-2 py-1.5 text-xs text-cyan-300 bg-sky-950/50${borderR}`
        : `${calcCls} ${c.col === 'costo_almacen_soles' ? 'text-white font-semibold' : 'text-pink-100'}${borderR}`;
      return <td key={key} className={cls}>{fmt(getValor(item, key))}</td>;
    }

    // Select producto
    if (c.tipo === 'select-producto') {
      return (
        <td key={key} className={`px-1${blueBg}${borderR}`}>
          <select className={`${inputCls}`} value={item.product_id || ''}
            onChange={e => actualizarItem(idx, 'product_id', parseInt(e.target.value) || '')}>
            <option value="">Seleccionar...</option>
            {(productos || []).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </td>
      );
    }

    // Select UM
    if (c.tipo === 'select-um') {
      return (
        <td key={key} className={`px-1${blueBg}${borderR}`}>
          <select className={inputCls} value={getValor(item, key) || 'Kg'}
            onChange={e => actualizarItem(idx, key, e.target.value)}>
            <option value="Kg">Kg</option><option value="Unidad">Und</option>
            <option value="Litro">Lt</option><option value="Metro">Mt</option><option value="Caja">Caja</option>
          </select>
        </td>
      );
    }

    // Text input
    if (c.tipo === 'text') {
      return (
        <td key={key} className={`px-1${blueBg}${borderR}`}>
          <input type="text" className={inputCls} value={getValor(item, key) || ''}
            onChange={e => actualizarItem(idx, key, e.target.value)} placeholder="84361..." />
        </td>
      );
    }

    // Integer input
    if (c.tipo === 'int') {
      return (
        <td key={key} className={`px-1${blueBg}${borderR}`}>
          <input type="number" min="1" className={`${inputCls} text-center`} value={getValor(item, key) || ''}
            onChange={e => actualizarItem(idx, key, e.target.value)} />
        </td>
      );
    }

    // Decimal input (default)
    return (
      <td key={key} className={`px-1${blueBg}${borderR}`}>
        <input type="number" step="0.01" className={`${inputCls} text-right`}
          value={getValor(item, key) || ''}
          onChange={e => actualizarItem(idx, key, e.target.value)} />
      </td>
    );
  };

  // Encontrar el índice de la última columna azul
  const lastBlueIdx = useMemo(() => {
    let last = -1;
    columnas.forEach((c, i) => { if (c.zona === 'blue') last = i; });
    return last;
  }, [columnas]);

  return (
    <div>
      <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <h3 className="text-sm font-semibold text-steel-200">Productos de Importacion</h3>
        <button type="button" onClick={agregarItem}
          className="text-xs text-primary-500 hover:text-primary-400 font-medium flex items-center gap-1">
          <HiOutlinePlus className="w-3 h-3" /> Agregar producto
        </button>
      </div>

      <div className="overflow-x-auto border border-steel-700 rounded-lg">
        <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
          {/* Definir anchos de columna */}
          <colgroup>
            {columnas.map(c => (
              <col key={c.col} style={c.w ? { width: c.w } : undefined} />
            ))}
            <col style={{ width: '32px' }} />
          </colgroup>

          <thead>
            {/* Fila 1: Zonas */}
            <tr>
              {zonaCounts.blue > 0 && (
                <th colSpan={zonaCounts.blue}
                  className="bg-sky-900/50 text-sky-200 text-center py-1.5 text-[10px] font-bold uppercase tracking-wider border-b border-sky-700/50 border-r border-steel-600">
                  Campos Manuales
                </th>
              )}
              {zonaCounts.purple > 0 && (
                <th colSpan={zonaCounts.purple}
                  className="bg-fuchsia-900/50 text-fuchsia-200 text-center py-1.5 text-[10px] font-bold uppercase tracking-wider border-b border-fuchsia-700/50">
                  Campos Calculados
                </th>
              )}
              <th className="border-b border-steel-700" />
            </tr>

            {/* Fila 2: Nombres de columna */}
            <tr className="border-b border-steel-700">
              {columnas.map((c, i) => {
                const isBlue = c.zona === 'blue';
                const isLastBlue2 = i === lastBlueIdx;
                const customCls = c.esCustom ? ' !text-amber-200 !bg-amber-900/40' : '';
                return (
                  <th key={c.col}
                    className={`py-1.5 px-2 font-semibold whitespace-nowrap text-[11px] ${
                      isBlue
                        ? `text-left text-sky-200 bg-sky-950/60${isLastBlue2 ? ' border-r border-steel-600' : ''}`
                        : 'text-right text-white bg-fuchsia-950/60'
                    }${customCls}`}>
                    {c.nombre}
                  </th>
                );
              })}
              <th className="w-8" />
            </tr>
          </thead>

          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-b border-steel-700/50 hover:bg-steel-900/30">
                {columnas.map((c, i) => renderCelda(item, idx, c, i === lastBlueIdx))}
                <td className="text-center">
                  <button type="button" onClick={() => eliminarItem(idx)}
                    className="text-red-600/60 hover:text-red-400 p-1">
                    <HiOutlineTrash className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr className="border-t border-steel-700 font-semibold text-steel-200">
              {columnas.map((c, i) => {
                const isLastBlue2 = i === lastBlueIdx;
                const borderR = isLastBlue2 ? ' border-r border-steel-600' : '';
                const isBlue = c.zona === 'blue';
                const zoneBg = isBlue ? ' bg-sky-950/40' : ' bg-fuchsia-950/40';

                // Label "TOTALES:" en la columna articulo
                if (c.col === 'articulo') {
                  return <td key={c.col} className={`py-2 px-2 text-right text-[11px] text-steel-300${zoneBg}${borderR}`}>TOTALES:</td>;
                }

                // Columnas sin suma
                if (NO_SUMABLE.has(c.col)) {
                  return <td key={c.col} className={`${zoneBg}${borderR}`} />;
                }

                // Valores sumados
                const color = isBlue ? ' text-sky-200' : ' text-white';
                const bold = c.col === 'costo_almacen_soles' ? ' font-bold' : '';
                return (
                  <td key={c.col} className={`text-right px-2 py-2 text-[11px]${color}${bold}${zoneBg}${borderR}`}>
                    {c.col === 'cantidad' ? (totales.cantidad || '') : fmt(totales[c.col])}
                  </td>
                );
              })}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
