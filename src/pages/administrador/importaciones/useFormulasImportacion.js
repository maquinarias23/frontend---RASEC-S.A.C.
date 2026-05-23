import { useCallback } from 'react';

// ── Evaluador seguro de fórmulas ──
// Variables disponibles en fórmulas:
//   Columnas del item: cantidad, peso, costo_total_usd, advaloren_usd, flete_usd, seguro_usd, etc.
//   Globales: TC (tipo cambio), TOTAL_OTROS_GASTOS, TOTAL_PESO
//   Columnas calculadas previas: costo_unitario_usd, costo_total_calc_usd, etc.
// Operadores: + - * / ( )

const TOKENS_VALIDOS = /^[\d\s+\-*/().]+$/;

function evaluarFormula(expresion, variables) {
  if (!expresion || typeof expresion !== 'string') return 0;

  let expr = expresion.trim();

  // Reemplazar nombres de variables por valores (de más largo a más corto para evitar conflictos)
  const claves = Object.keys(variables).sort((a, b) => b.length - a.length);
  for (const clave of claves) {
    const valor = parseFloat(variables[clave]) || 0;
    expr = expr.replaceAll(clave, String(valor));
  }

  // Verificar que solo quedan números y operadores
  if (!TOKENS_VALIDOS.test(expr)) return 0;

  try {
    // Evaluar expresión matemática pura (solo números y operadores)
    const fn = new Function(`"use strict"; return (${expr});`);
    const resultado = fn();
    if (typeof resultado !== 'number' || !isFinite(resultado)) return 0;
    return resultado;
  } catch {
    return 0;
  }
}

// ── Fórmulas por defecto del sistema (fallback si no hay config) ──
const FORMULAS_SISTEMA = {
  costo_unitario_usd: 'costo_total_usd / cantidad',
  costo_total_calc_usd: 'costo_total_usd + advaloren_usd + flete_usd + seguro_usd',
  costo_total_soles: 'costo_total_calc_usd * TC',
  otros_gastos_soles: '(peso / TOTAL_PESO) * TOTAL_OTROS_GASTOS',
  costo_almacen_soles: 'costo_total_soles + otros_gastos_soles',
  costo_unit_almacen_sol: 'costo_almacen_soles / cantidad',
};

export default function useFormulasImportacion(formulasConfig = []) {

  const recalcularItems = useCallback((items, tipoCambio, totalOtrosGastosSoles) => {
    const totalPeso = items.reduce((sum, it) => sum + (parseFloat(it.peso) || 0), 0);
    const tc = parseFloat(tipoCambio) || 0;
    const totalOG = parseFloat(totalOtrosGastosSoles) || 0;

    // Construir lista ordenada de columnas calculadas a evaluar
    let columnasCalc = [];

    if (formulasConfig.length > 0) {
      columnasCalc = formulasConfig
        .filter(f => f.activa && !f.es_manual && f.formula)
        .sort((a, b) => a.orden - b.orden)
        .map(f => ({ columna: f.columna, formula: f.formula }));
    } else {
      // Fallback: fórmulas del sistema en orden de dependencia
      columnasCalc = Object.entries(FORMULAS_SISTEMA).map(([col, formula]) => ({ columna: col, formula }));
    }

    return items.map(item => {
      const copia = { ...item };

      // Variables globales
      const globales = {
        TC: tc,
        TOTAL_PESO: totalPeso > 0 ? totalPeso : 1,
        TOTAL_OTROS_GASTOS: totalOG,
      };

      // Evaluar cada fórmula en orden (las posteriores pueden usar resultados previos)
      for (const { columna, formula } of columnasCalc) {
        const variables = {
          ...globales,
          cantidad: parseInt(copia.cantidad) || 1,
          peso: parseFloat(copia.peso) || 0,
          costo_total_usd: parseFloat(copia.costo_total_usd) || 0,
          advaloren_usd: parseFloat(copia.advaloren_usd) || 0,
          flete_usd: parseFloat(copia.flete_usd) || 0,
          seguro_usd: parseFloat(copia.seguro_usd) || 0,
          // Incluir resultados ya calculados para encadenamiento
          costo_unitario_usd: parseFloat(copia.costo_unitario_usd) || 0,
          costo_total_calc_usd: parseFloat(copia.costo_total_calc_usd) || 0,
          costo_total_soles: parseFloat(copia.costo_total_soles) || 0,
          otros_gastos_soles: parseFloat(copia.otros_gastos_soles) || 0,
          costo_almacen_soles: parseFloat(copia.costo_almacen_soles) || 0,
          costo_unit_almacen_sol: parseFloat(copia.costo_unit_almacen_sol) || 0,
        };

        // También incluir valores custom previos
        if (copia._custom) {
          Object.entries(copia._custom).forEach(([k, v]) => {
            variables[k] = parseFloat(v) || 0;
          });
        }

        const resultado = parseFloat(evaluarFormula(formula, variables).toFixed(3));

        // Si es columna del sistema, guardar directo; si es custom, en _custom
        if (columna in FORMULAS_SISTEMA || isSystemColumn(columna)) {
          copia[columna] = resultado;
        } else {
          if (!copia._custom) copia._custom = {};
          copia._custom[columna] = resultado;
        }
      }

      return copia;
    });
  }, [formulasConfig]);

  const getColumnasActivas = useCallback(() => {
    if (formulasConfig.length > 0) {
      return formulasConfig
        .filter(f => f.activa)
        .sort((a, b) => a.orden - b.orden);
    }
    return Object.keys(FORMULAS_SISTEMA).map((col, i) => ({
      columna: col, activa: true, es_manual: false, orden: i,
    }));
  }, [formulasConfig]);

  return { recalcularItems, getColumnasActivas, evaluarFormula };
}

function isSystemColumn(col) {
  const SYSTEM = [
    'codigo_aduanero','articulo','cantidad','unidad_medida','peso',
    'costo_total_usd','advaloren_usd','flete_usd','seguro_usd',
    'costo_unitario_usd','costo_total_calc_usd','costo_total_soles',
    'otros_gastos_soles','costo_almacen_soles','costo_unit_almacen_sol',
  ];
  return SYSTEM.includes(col);
}

export { evaluarFormula, FORMULAS_SISTEMA };
