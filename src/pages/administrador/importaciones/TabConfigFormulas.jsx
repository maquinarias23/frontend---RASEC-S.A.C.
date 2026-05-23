import { useState, useEffect, useMemo } from 'react';
import {
  HiOutlinePlus, HiOutlineTrash, HiOutlineSave, HiOutlineChevronRight,
  HiOutlineCalculator, HiOutlinePencilAlt, HiOutlineInformationCircle,
  HiOutlineArrowUp, HiOutlineArrowDown, HiOutlineCode, HiOutlineBeaker,
} from 'react-icons/hi';
import { COLUMNAS_IMPORTACION } from '../../../config/constants';
import { evaluarFormula } from './useFormulasImportacion';
import api from '../../../api/axios';
import toast from 'react-hot-toast';

// ── Info de columnas del sistema ──
const INFO_SISTEMA = {
  [COLUMNAS_IMPORTACION.CODIGO_ADUANERO]: { nombre: 'Codigo Aduanero', desc: 'Partida arancelaria' },
  [COLUMNAS_IMPORTACION.ARTICULO]: { nombre: 'Articulo', desc: 'Producto importado' },
  [COLUMNAS_IMPORTACION.CANTIDAD]: { nombre: 'Cantidad', desc: 'Unidades' },
  [COLUMNAS_IMPORTACION.UNIDAD_MEDIDA]: { nombre: 'Unidad de Medida', desc: 'Kg, Und, etc.' },
  [COLUMNAS_IMPORTACION.PESO]: { nombre: 'Peso (Kg)', desc: 'Peso total' },
  [COLUMNAS_IMPORTACION.COSTO_TOTAL_USD]: { nombre: 'Costo Total $', desc: 'Costo FOB' },
  [COLUMNAS_IMPORTACION.ADVALOREN_USD]: { nombre: 'Advalorem $', desc: 'Impuesto' },
  [COLUMNAS_IMPORTACION.FLETE_USD]: { nombre: 'Flete $', desc: 'Transporte' },
  [COLUMNAS_IMPORTACION.SEGURO_USD]: { nombre: 'Seguro $', desc: 'Seguro de carga' },
  [COLUMNAS_IMPORTACION.COSTO_UNITARIO_USD]: { nombre: 'C. Unitario $' },
  [COLUMNAS_IMPORTACION.COSTO_TOTAL_CALC_USD]: { nombre: 'C. Total Calc $' },
  [COLUMNAS_IMPORTACION.COSTO_TOTAL_SOLES]: { nombre: 'C. Total Soles' },
  [COLUMNAS_IMPORTACION.OTROS_GASTOS_SOLES]: { nombre: 'Otros Gastos S/' },
  [COLUMNAS_IMPORTACION.COSTO_ALMACEN_SOLES]: { nombre: 'C.T. Almacen S/' },
  [COLUMNAS_IMPORTACION.COSTO_UNIT_ALMACEN_SOL]: { nombre: 'C.U. Almacen S/' },
};

const VARIABLES_DISPONIBLES = [
  { grupo: 'Campos del item', vars: [
    { key: 'cantidad', desc: 'Cantidad del item' },
    { key: 'peso', desc: 'Peso en Kg' },
    { key: 'costo_total_usd', desc: 'Costo Total $' },
    { key: 'advaloren_usd', desc: 'Advalorem $' },
    { key: 'flete_usd', desc: 'Flete $' },
    { key: 'seguro_usd', desc: 'Seguro $' },
  ]},
  { grupo: 'Campos calculados', vars: [
    { key: 'costo_unitario_usd', desc: 'C. Unitario $' },
    { key: 'costo_total_calc_usd', desc: 'C. Total Calc $' },
    { key: 'costo_total_soles', desc: 'C. Total Soles' },
    { key: 'otros_gastos_soles', desc: 'Otros Gastos S/' },
    { key: 'costo_almacen_soles', desc: 'C.T. Almacen S/' },
    { key: 'costo_unit_almacen_sol', desc: 'C.U. Almacen S/' },
  ]},
  { grupo: 'Globales', vars: [
    { key: 'TC', desc: 'Tipo de Cambio' },
    { key: 'TOTAL_PESO', desc: 'Peso total de todos los items' },
    { key: 'TOTAL_OTROS_GASTOS', desc: 'Total gastos intermediarios S/' },
  ]},
];

function Toggle({ checked, onChange }) {
  return (
    <button type="button" onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-primary-500' : 'bg-steel-600'}`}>
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
    </button>
  );
}

function TestFormula({ formula }) {
  const testVars = {
    cantidad: 100, peso: 500, costo_total_usd: 1200, advaloren_usd: 60,
    flete_usd: 80, seguro_usd: 15, costo_unitario_usd: 12, costo_total_calc_usd: 1355,
    costo_total_soles: 4832, otros_gastos_soles: 200, costo_almacen_soles: 5032,
    costo_unit_almacen_sol: 50.32, TC: 3.564, TOTAL_PESO: 2000, TOTAL_OTROS_GASTOS: 800,
  };
  const result = evaluarFormula(formula, testVars);
  const ok = result !== 0 || formula === '0';
  return (
    <span className={`text-[10px] font-mono ${ok ? 'text-emerald-600' : 'text-red-600'}`}>
      Test: {result.toFixed(2)}
    </span>
  );
}

export default function TabConfigFormulas({ tiposProducto, onTiposChange }) {
  const [tipoSeleccionado, setTipoSeleccionado] = useState(null);
  const [nuevoTipoNombre, setNuevoTipoNombre] = useState('');
  const [formulas, setFormulas] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [showVars, setShowVars] = useState(false);
  const [editandoFormula, setEditandoFormula] = useState(null);

  // ── Cargar config del tipo seleccionado ──
  useEffect(() => {
    if (!tipoSeleccionado) return;
    const tipo = tiposProducto.find(t => t.id === tipoSeleccionado);
    const existentes = tipo?.formulas || [];

    // Columnas del sistema (orden coincide con Excel original)
    const MANUALES_SISTEMA = [
      COLUMNAS_IMPORTACION.CODIGO_ADUANERO, COLUMNAS_IMPORTACION.ARTICULO,
      COLUMNAS_IMPORTACION.CANTIDAD, COLUMNAS_IMPORTACION.UNIDAD_MEDIDA,
      COLUMNAS_IMPORTACION.PESO, COLUMNAS_IMPORTACION.COSTO_UNITARIO_USD,
      COLUMNAS_IMPORTACION.COSTO_TOTAL_USD,
      COLUMNAS_IMPORTACION.ADVALOREN_USD, COLUMNAS_IMPORTACION.FLETE_USD,
      COLUMNAS_IMPORTACION.SEGURO_USD,
    ];
    const CALC_SISTEMA = [
      COLUMNAS_IMPORTACION.COSTO_TOTAL_CALC_USD,
      COLUMNAS_IMPORTACION.COSTO_TOTAL_SOLES, COLUMNAS_IMPORTACION.OTROS_GASTOS_SOLES,
      COLUMNAS_IMPORTACION.COSTO_ALMACEN_SOLES, COLUMNAS_IMPORTACION.COSTO_UNIT_ALMACEN_SOL,
    ];

    const FORMULAS_DEFAULT = {
      [COLUMNAS_IMPORTACION.COSTO_UNITARIO_USD]: 'costo_total_usd / cantidad',
      [COLUMNAS_IMPORTACION.COSTO_TOTAL_CALC_USD]: 'costo_total_usd + advaloren_usd + flete_usd + seguro_usd',
      [COLUMNAS_IMPORTACION.COSTO_TOTAL_SOLES]: 'costo_total_calc_usd * TC',
      [COLUMNAS_IMPORTACION.OTROS_GASTOS_SOLES]: '(peso / TOTAL_PESO) * TOTAL_OTROS_GASTOS',
      [COLUMNAS_IMPORTACION.COSTO_ALMACEN_SOLES]: 'costo_total_soles + otros_gastos_soles',
      [COLUMNAS_IMPORTACION.COSTO_UNIT_ALMACEN_SOL]: 'costo_almacen_soles / cantidad',
    };

    // Mapear columnas del sistema
    const allCols = [];
    let idx = 0;

    for (const col of MANUALES_SISTEMA) {
      const ex = existentes.find(f => f.columna === col);
      const tieneFormula = !!FORMULAS_DEFAULT[col];
      allCols.push({
        columna: col,
        nombre_display: INFO_SISTEMA[col]?.nombre || col,
        activa: ex ? ex.activa : true,
        es_manual: !tieneFormula,
        es_personalizada: false,
        formula: tieneFormula ? (ex?.formula || FORMULAS_DEFAULT[col]) : null,
        orden: ex?.orden ?? idx,
      });
      idx++;
    }

    for (const col of CALC_SISTEMA) {
      const ex = existentes.find(f => f.columna === col);
      allCols.push({
        columna: col,
        nombre_display: INFO_SISTEMA[col]?.nombre || col,
        activa: ex ? ex.activa : true,
        es_manual: false,
        es_personalizada: false,
        formula: ex?.formula || FORMULAS_DEFAULT[col] || '',
        orden: ex?.orden ?? idx,
      });
      idx++;
    }

    // Columnas personalizadas
    for (const ex of existentes.filter(f => f.es_personalizada)) {
      allCols.push({
        columna: ex.columna,
        nombre_display: ex.nombre_display || ex.columna,
        activa: ex.activa,
        es_manual: ex.es_manual,
        es_personalizada: true,
        formula: ex.formula || '',
        orden: ex.orden,
      });
    }

    allCols.sort((a, b) => a.orden - b.orden);
    setFormulas(allCols);
  }, [tipoSeleccionado, tiposProducto]);

  // ── CRUD Tipos ──
  const crearTipo = async () => {
    if (!nuevoTipoNombre.trim()) return toast.error('Ingrese un nombre');
    try {
      await api.post('/config-formulas-importacion/tipos', { nombre: nuevoTipoNombre.trim() });
      toast.success('Tipo creado');
      setNuevoTipoNombre('');
      onTiposChange();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const eliminarTipo = async (tipoId) => {
    if (!confirm('Eliminar este tipo y toda su configuracion?')) return;
    try {
      await api.delete(`/config-formulas-importacion/tipos/${tipoId}`);
      toast.success('Eliminado');
      if (tipoSeleccionado === tipoId) { setTipoSeleccionado(null); setFormulas([]); }
      onTiposChange();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  // ── Operaciones sobre columnas ──
  const toggleColumna = (columna) => {
    setFormulas(prev => prev.map(f => f.columna === columna ? { ...f, activa: !f.activa } : f));
  };

  const actualizarFormula = (columna, formula) => {
    setFormulas(prev => prev.map(f => f.columna === columna ? { ...f, formula } : f));
  };

  const actualizarNombre = (columna, nombre_display) => {
    setFormulas(prev => prev.map(f => f.columna === columna ? { ...f, nombre_display } : f));
  };

  const moverColumna = (columna, dir) => {
    setFormulas(prev => {
      const arr = [...prev];
      const idx = arr.findIndex(f => f.columna === columna);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= arr.length) return arr;
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr.map((f, i) => ({ ...f, orden: i }));
    });
  };

  const eliminarColumna = (columna) => {
    setFormulas(prev => prev.filter(f => f.columna !== columna));
  };

  const agregarColumnaPersonalizada = (tipo) => {
    const key = `custom_${Date.now()}`;
    const nueva = {
      columna: key,
      nombre_display: tipo === 'manual' ? 'Nuevo campo manual' : 'Nuevo campo calculado',
      activa: true,
      es_manual: tipo === 'manual',
      es_personalizada: true,
      formula: tipo === 'manual' ? null : '',
      orden: formulas.length,
    };
    setFormulas(prev => [...prev, nueva]);
  };

  // ── Guardar ──
  const guardar = async () => {
    // Validar columnas personalizadas calculadas tengan fórmula
    const sinFormula = formulas.filter(f => f.es_personalizada && !f.es_manual && f.activa && !f.formula?.trim());
    if (sinFormula.length > 0) {
      return toast.error(`"${sinFormula[0].nombre_display}" necesita una formula`);
    }

    setGuardando(true);
    try {
      await api.put(`/config-formulas-importacion/tipos/${tipoSeleccionado}/formulas`, {
        formulas: formulas.map((f, idx) => ({
          columna: f.columna,
          nombre_display: f.nombre_display || null,
          activa: f.activa,
          es_manual: f.es_manual,
          es_personalizada: f.es_personalizada,
          formula: f.formula || null,
          orden: idx,
        }))
      });
      toast.success('Configuracion guardada');
      onTiposChange();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally { setGuardando(false); }
  };

  const resumen = useMemo(() => {
    const manuales = formulas.filter(f => f.es_manual && f.activa).length;
    const calculadas = formulas.filter(f => !f.es_manual && f.activa).length;
    const custom = formulas.filter(f => f.es_personalizada).length;
    return { manuales, calculadas, custom, total: manuales + calculadas };
  }, [formulas]);

  const tipoNombre = tiposProducto.find(t => t.id === tipoSeleccionado)?.nombre;

  return (
    <div className="grid grid-cols-12 gap-6 mt-4">
      {/* ── Panel izquierdo: tipos ── */}
      <div className="col-span-4 space-y-4">
        <div className="card">
          <h3 className="text-sm font-semibold text-steel-200 mb-1">Tipos de Producto</h3>
          <p className="text-[11px] text-steel-500 mb-3">Cada tipo define que columnas y formulas usa la Vista 360.</p>

          <div className="flex gap-2 mb-4">
            <input type="text" className="input-field text-sm flex-1" placeholder="Ej: Agricola, Textil..."
              value={nuevoTipoNombre} onChange={e => setNuevoTipoNombre(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && crearTipo()} />
            <button onClick={crearTipo} className="btn-primary text-xs px-3"><HiOutlinePlus className="w-4 h-4" /></button>
          </div>

          <div className="space-y-1">
            {tiposProducto.length === 0 && <p className="text-xs text-steel-500 text-center py-6">Crea un tipo para comenzar</p>}
            {tiposProducto.map(tipo => {
              const isSelected = tipoSeleccionado === tipo.id;
              return (
                <div key={tipo.id} onClick={() => setTipoSeleccionado(tipo.id)}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                    isSelected ? 'bg-primary-500/15 border border-primary-500/30' : 'hover:bg-steel-800/50 border border-transparent'
                  }`}>
                  <div className="flex items-center gap-2">
                    <HiOutlineChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'rotate-90 text-primary-500' : 'text-steel-500'}`} />
                    <span className="text-sm font-medium text-steel-200">{tipo.nombre}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); eliminarTipo(tipo.id); }}
                    className="text-red-600/40 hover:text-red-500 p-1 rounded hover:bg-red-500/10">
                    <HiOutlineTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel variables disponibles */}
        {tipoSeleccionado && (
          <div className="card">
            <button onClick={() => setShowVars(!showVars)}
              className="flex items-center gap-2 text-sm font-semibold text-steel-300 w-full">
              <HiOutlineCode className="w-4 h-4" />
              Variables para formulas
              <HiOutlineChevronRight className={`w-3 h-3 ml-auto transition-transform ${showVars ? 'rotate-90' : ''}`} />
            </button>
            {showVars && (
              <div className="mt-3 space-y-3">
                {VARIABLES_DISPONIBLES.map(g => (
                  <div key={g.grupo}>
                    <p className="text-[10px] uppercase font-semibold text-steel-500 mb-1">{g.grupo}</p>
                    <div className="space-y-0.5">
                      {g.vars.map(v => (
                        <div key={v.key} className="flex items-center justify-between text-[11px] py-0.5 px-2 rounded hover:bg-steel-800/50">
                          <code className="text-primary-400 font-mono">{v.key}</code>
                          <span className="text-steel-500">{v.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {/* Variables de columnas custom */}
                {formulas.filter(f => f.es_personalizada).length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-steel-500 mb-1">Personalizadas</p>
                    <div className="space-y-0.5">
                      {formulas.filter(f => f.es_personalizada).map(f => (
                        <div key={f.columna} className="flex items-center justify-between text-[11px] py-0.5 px-2 rounded hover:bg-steel-800/50">
                          <code className="text-amber-400 font-mono">{f.columna}</code>
                          <span className="text-steel-500">{f.nombre_display}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-steel-600 leading-relaxed">
                  Usa estos nombres en las formulas.<br />
                  Ejemplo: <code className="text-steel-400">costo_total_usd + advaloren_usd</code>
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Panel derecho: config columnas ── */}
      <div className="col-span-8">
        {!tipoSeleccionado ? (
          <div className="card text-center py-16">
            <HiOutlineCalculator className="w-10 h-10 text-steel-600 mx-auto mb-3" />
            <p className="text-steel-400 text-sm">Selecciona un tipo de producto</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <div className="card p-4 relative z-30">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-steel-100">{tipoNombre}</h3>
                  <p className="text-xs text-steel-500 mt-0.5">
                    {resumen.total} columnas activas — {resumen.manuales} manuales, {resumen.calculadas} calculadas
                    {resumen.custom > 0 && <> ({resumen.custom} personalizadas)</>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative group">
                    <button className="btn-secondary text-xs flex items-center gap-1">
                      <HiOutlinePlus className="w-3.5 h-3.5" /> Agregar columna
                    </button>
                    <div className="absolute right-0 mt-1 bg-steel-800 border border-steel-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 w-48">
                      <button onClick={() => agregarColumnaPersonalizada('manual')}
                        className="w-full text-left px-3 py-2 text-xs text-steel-200 hover:bg-steel-700/50 rounded-t-lg flex items-center gap-2">
                        <HiOutlinePencilAlt className="w-3.5 h-3.5 text-blue-400" /> Campo manual
                      </button>
                      <button onClick={() => agregarColumnaPersonalizada('calculada')}
                        className="w-full text-left px-3 py-2 text-xs text-steel-200 hover:bg-steel-700/50 rounded-b-lg flex items-center gap-2">
                        <HiOutlineCalculator className="w-3.5 h-3.5 text-purple-400" /> Campo calculado
                      </button>
                    </div>
                  </div>
                  <button onClick={guardar} disabled={guardando} className="btn-primary flex items-center gap-1.5">
                    <HiOutlineSave className="w-4 h-4" /> {guardando ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de columnas */}
            <div className="card p-0 divide-y divide-steel-700/50">
              {formulas.map((f, idx) => {
                const isCustom = f.es_personalizada;
                const isCalc = !f.es_manual;
                const isEditing = editandoFormula === f.columna;

                return (
                  <div key={f.columna} className={`px-4 py-3 transition-all ${!f.activa ? 'opacity-35' : ''}`}>
                    <div className="flex items-center gap-3">
                      {/* Toggle */}
                      <Toggle checked={f.activa} onChange={() => toggleColumna(f.columna)} />

                      {/* Orden */}
                      <div className="flex flex-col">
                        <button onClick={() => moverColumna(f.columna, -1)} disabled={idx === 0}
                          className="text-steel-600 hover:text-steel-300 disabled:opacity-20"><HiOutlineArrowUp className="w-3 h-3" /></button>
                        <button onClick={() => moverColumna(f.columna, 1)} disabled={idx === formulas.length - 1}
                          className="text-steel-600 hover:text-steel-300 disabled:opacity-20"><HiOutlineArrowDown className="w-3 h-3" /></button>
                      </div>

                      {/* Nombre */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {isCustom ? (
                            <input type="text" className="bg-transparent border-b border-steel-600 text-sm text-steel-100 focus:outline-none focus:border-primary-500 w-48"
                              value={f.nombre_display} onChange={e => actualizarNombre(f.columna, e.target.value)} placeholder="Nombre de la columna" />
                          ) : (
                            <span className="text-sm text-steel-200">{f.nombre_display || INFO_SISTEMA[f.columna]?.nombre || f.columna}</span>
                          )}

                          {/* Badge tipo */}
                          {f.es_manual ? (
                            <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-medium">Manual</span>
                          ) : (
                            <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded font-medium">Calculada</span>
                          )}
                          {isCustom && (
                            <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded font-medium">Personalizada</span>
                          )}
                        </div>

                        {/* Fórmula (solo para calculadas) */}
                        {isCalc && f.activa && (
                          <div className="mt-1.5">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <code className="text-steel-500">=</code>
                                <input type="text"
                                  className="input-field text-xs font-mono flex-1 bg-steel-900/50"
                                  value={f.formula || ''}
                                  onChange={e => actualizarFormula(f.columna, e.target.value)}
                                  placeholder="Ej: costo_total_usd / cantidad"
                                  autoFocus
                                  onBlur={() => setEditandoFormula(null)}
                                  onKeyDown={e => e.key === 'Enter' && setEditandoFormula(null)}
                                />
                                {f.formula && <TestFormula formula={f.formula} />}
                              </div>
                            ) : (
                              <button onClick={() => setEditandoFormula(f.columna)}
                                className="flex items-center gap-1.5 text-[11px] text-steel-400 hover:text-steel-200 group">
                                <code className="text-purple-400/70 font-mono">= {f.formula || '(sin formula)'}</code>
                                <HiOutlinePencilAlt className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                              </button>
                            )}
                          </div>
                        )}

                        {/* Descripción para manuales del sistema */}
                        {f.es_manual && !isCustom && INFO_SISTEMA[f.columna]?.desc && (
                          <p className="text-[10px] text-steel-600 mt-0.5">{INFO_SISTEMA[f.columna].desc}</p>
                        )}

                        {/* Identificador para custom (para usar en fórmulas) */}
                        {isCustom && (
                          <p className="text-[10px] text-steel-600 mt-0.5">
                            ID para formulas: <code className="text-amber-400/70">{f.columna}</code>
                          </p>
                        )}
                      </div>

                      {/* Orden visual */}
                      <span className="text-[10px] text-steel-600 w-6 text-center">{idx + 1}</span>

                      {/* Eliminar (solo custom) */}
                      {isCustom ? (
                        <button onClick={() => eliminarColumna(f.columna)}
                          className="text-red-600/40 hover:text-red-500 p-1 rounded hover:bg-red-500/10">
                          <HiOutlineTrash className="w-3.5 h-3.5" />
                        </button>
                      ) : <div className="w-7" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Info */}
            <div className="flex items-start gap-2 p-3 bg-steel-800/20 rounded-lg">
              <HiOutlineInformationCircle className="w-4 h-4 text-steel-500 mt-0.5 flex-shrink-0" />
              <div className="text-[11px] text-steel-500 leading-relaxed space-y-1">
                <p>Las <strong className="text-purple-400">formulas</strong> usan nombres de columnas y variables globales. Haz click en una formula para editarla.</p>
                <p>Ejemplo: <code className="text-steel-300">costo_total_usd + advaloren_usd + flete_usd</code> o <code className="text-steel-300">(peso / TOTAL_PESO) * TOTAL_OTROS_GASTOS</code></p>
                <p>El <strong>orden</strong> importa: las formulas se ejecutan de arriba a abajo, y pueden usar resultados de columnas anteriores.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
