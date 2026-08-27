// =============================================================================
// CONSTRUCTOR DE COMISIONES — vista de hoja de cálculo
// -----------------------------------------------------------------------------
// La pantalla se lee como la planilla de liquidación que RRHH ya conoce: la
// calculadora arriba (celdas de captura en ámbar, resultado en verde), y debajo
// las tres preguntas que definen la política, cada una como una tabla.
//
// Decisión de UX central: MODO LECTURA por defecto. Antes toda la política se
// mostraba como campos editables a la vez, lo que hacía imposible leerla de un
// vistazo y volvía fácil descuadrar un número sin querer. Ahora se lee como un
// documento y solo se edita al pulsar "Editar".
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  HiOutlinePlus, HiOutlineTrash, HiOutlinePencil,
  HiOutlineCheck, HiOutlineX, HiOutlineDuplicate, HiOutlineCheckCircle,
  HiOutlineExclamation, HiOutlineCog, HiOutlineChevronDown, HiOutlineChevronRight,
} from 'react-icons/hi';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { formatearMoneda } from '../../utils/formato';

// ---------------------------------------------------------------------------
// Diccionario: nombres técnicos -> lenguaje del negocio.
// Nada de "métrica", "tramo" ni "componente" en pantalla.
// ---------------------------------------------------------------------------
const METRICAS = [
  { value: 'venta_bruta', label: 'Venta bruta', corto: 'venta bruta', unidad: 'S/' },
  { value: 'num_operaciones', label: 'Operaciones cerradas', corto: 'operaciones', unidad: 'ops' },
  { value: 'utilidad', label: 'Utilidad', corto: 'utilidad', unidad: 'S/' },
  { value: 'margen', label: 'Margen', corto: 'margen', unidad: '' },
  { value: 'cantidad_productos', label: 'Productos vendidos', corto: 'productos', unidad: 'u' },
];

const OPERADORES = [
  { value: 'mayor_igual', label: 'al menos', simbolo: '≥' },
  { value: 'mayor', label: 'más de', simbolo: '>' },
  { value: 'menor_igual', label: 'como máximo', simbolo: '≤' },
  { value: 'menor', label: 'menos de', simbolo: '<' },
  { value: 'igual', label: 'exactamente', simbolo: '=' },
];

const TIPOS_COMPONENTE = [
  { value: 'fijo', label: 'Monto fijo', ayuda: 'Siempre el mismo monto. Ejemplo: el básico semanal.' },
  { value: 'porcentaje_por_tramo', label: 'Porcentaje según cuánto vendió', ayuda: 'Un porcentaje sobre la venta, distinto según el tramo alcanzado.' },
  { value: 'monto_por_escalon', label: 'Monto según cuántas operaciones', ayuda: 'Un monto fijo por cada escalón. Ejemplo: bono de productividad.' },
  { value: 'monto_por_matriz', label: 'Monto que exige dos cosas a la vez', ayuda: 'Pide venta bruta Y operaciones al mismo tiempo. Ejemplo: bono élite.' },
];

const BASES = [
  { value: 'ninguna', label: '—' },
  { value: 'venta_bruta', label: 'la venta bruta' },
  { value: 'utilidad', label: 'la utilidad' },
];

const MODOS_RAMPUP = [
  { value: 'excluido', label: 'No pagarlo', ayuda: 'El vendedor nuevo cobra con las reglas normales desde el primer día.' },
  { value: 'automatico', label: 'Pagarlo automáticamente', ayuda: 'El sistema lo calcula y lo suma al pago sin que nadie intervenga.' },
  { value: 'manual', label: 'Decidirlo caso por caso', ayuda: 'El sistema avisa que el vendedor es nuevo y sugiere el monto, pero no se paga hasta que RRHH lo confirme.' },
];

const ESTADOS_VENTA = [
  { value: 'activa', label: 'Activa' },
  { value: 'cerrada', label: 'Cerrada' },
  { value: 'pendiente_aprobacion', label: 'Pendiente de aprobación' },
];

const esquemaVacio = () => ({
  nombre: '', descripcion: '', periodo: 'semanal',
  vigente_desde: new Date().toISOString().slice(0, 10), vigente_hasta: '',
  estados_venta_computables: ['activa', 'cerrada'],
  requiere_pago_completo: false, monto_adelanto_minimo: 0, porcentaje_adelanto_minimo: 0,
  origen_venta_bruta: 'total', revierte_si_cancela: true,
  rampup_modo: 'excluido', rampup_semanas: 2, rampup_reemplaza_escala: true,
  rampup_tramos: [], rampup_bono_tramos: [], condiciones: [], componentes: [],
});

// ---------------------------------------------------------------------------
// Helpers de presentación
// ---------------------------------------------------------------------------
const nfmt = (v) => (v === null || v === undefined || v === '' ? null : Number(v).toLocaleString('es-PE'));
const metrica = (v) => METRICAS.find((m) => m.value === v);

/** "S/ 8,501 a S/ 13,000" · "S/ 28,001 o más" · "6 ops" */
const describirRango = (desde, hasta, tipoMetrica) => {
  const m = metrica(tipoMetrica);
  const esDinero = m?.unidad === 'S/';
  const pre = esDinero ? 'S/ ' : '';
  const post = esDinero ? '' : ` ${m?.unidad || ''}`;
  const d = nfmt(desde) ?? '0';
  const h = nfmt(hasta);
  if (h === null) return `${pre}${d}${post} o más`;
  if (String(desde) === String(hasta)) return `${pre}${d}${post}`;
  return `${pre}${d}${post} a ${pre}${h}${post}`;
};

const describirValor = (tipoValor, valor, base) => {
  if (tipoValor === 'porcentaje') {
    const b = BASES.find((x) => x.value === base);
    return `${Number(valor)}% de ${b?.label || 'la venta'}`;
  }
  return formatearMoneda(valor);
};

export default function ConstructorComisiones() {
  const [esquemas, setEsquemas] = useState([]);
  const [esquema, setEsquema] = useState(null);
  const [original, setOriginal] = useState(null);
  const [editando, setEditando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [avanzado, setAvanzado] = useState(false);

  const [sim, setSim] = useState({ venta_bruta: 8501, num_operaciones: 6, utilidad: '', es_nuevo: false, semana_vendedor: 1 });
  const [resultado, setResultado] = useState(null);
  const [simulando, setSimulando] = useState(false);

  const cargarEsquemas = useCallback(async () => {
    try {
      const { data } = await api.get('/rrhh/comisiones/esquemas');
      setEsquemas(Array.isArray(data) ? data : []);
    } catch { setEsquemas([]); }
  }, []);

  const cargarEsquema = useCallback(async (id = null) => {
    setCargando(true);
    try {
      const { data } = await api.get(id ? `/rrhh/comisiones/esquema/${id}` : '/rrhh/comisiones/esquema');
      const normalizado = {
        ...data,
        vigente_desde: data.vigente_desde?.slice(0, 10) || '',
        vigente_hasta: data.vigente_hasta?.slice(0, 10) || '',
      };
      setEsquema(normalizado);
      setOriginal(JSON.parse(JSON.stringify(normalizado)));
      setEditando(false);
    } catch (err) {
      if (err.response?.status === 404) {
        const vacio = esquemaVacio();
        setEsquema(vacio);
        setOriginal(JSON.parse(JSON.stringify(vacio)));
        setEditando(true);
      } else toast.error(err.response?.data?.error || 'Error al cargar el esquema');
    } finally { setCargando(false); }
  }, []);

  useEffect(() => { cargarEsquemas(); cargarEsquema(); }, [cargarEsquemas, cargarEsquema]);

  const set = (campo, valor) => setEsquema((e) => ({ ...e, [campo]: valor }));

  const setComp = (i, campo, valor) => setEsquema((e) => {
    const comps = [...e.componentes];
    comps[i] = { ...comps[i], [campo]: valor };
    return { ...e, componentes: comps };
  });

  const setTramo = (ic, it, campo, valor) => setEsquema((e) => {
    const comps = [...e.componentes];
    const tramos = [...(comps[ic].tramos || [])];
    tramos[it] = { ...tramos[it], [campo]: valor };
    comps[ic] = { ...comps[ic], tramos };
    return { ...e, componentes: comps };
  });

  const agregarTramo = (i) => {
    const c = esquema.componentes[i];
    const esMatriz = c.tipo === 'monto_por_matriz';
    const esPct = c.tipo === 'porcentaje_por_tramo';
    setComp(i, 'tramos', [...(c.tramos || []), {
      metrica_x: esPct || esMatriz ? 'venta_bruta' : 'num_operaciones',
      desde_x: 0, hasta_x: '',
      metrica_y: esMatriz ? 'num_operaciones' : null,
      desde_y: esMatriz ? 8 : null, hasta_y: null,
      tipo_valor: esPct ? 'porcentaje' : 'monto',
      valor: 0, etiqueta: '',
    }]);
  };

  // ---- Bono de productividad del vendedor nuevo ----
  // Se guarda como lista plana de escalones con su semana; agregar una semana
  // es agregar su primer escalón.
  const setBono = (i, campo, valor) => {
    const a = [...(esquema.rampup_bono_tramos || [])];
    a[i] = { ...a[i], [campo]: valor };
    set('rampup_bono_tramos', a);
  };

  const agregarEscalonBono = (semana) => set('rampup_bono_tramos', [
    ...(esquema.rampup_bono_tramos || []),
    {
      semana_numero: semana, metrica_x: 'num_operaciones',
      desde_x: 0, hasta_x: '', tipo_valor: 'monto', valor: 0, etiqueta: '',
    },
  ]);

  const agregarSemanaBono = () => {
    // La primera semana del arranque que aún no tenga tabla propia.
    const usadas = new Set((esquema.rampup_bono_tramos || []).map((t) => Number(t.semana_numero)));
    let semana = 1;
    while (usadas.has(semana)) semana++;
    agregarEscalonBono(semana);
  };

  const quitarEscalonBono = (i) => set(
    'rampup_bono_tramos',
    (esquema.rampup_bono_tramos || []).filter((_, x) => x !== i)
  );

  const quitarSemanaBono = (semana) => set(
    'rampup_bono_tramos',
    (esquema.rampup_bono_tramos || []).filter((t) => Number(t.semana_numero) !== semana)
  );

  const guardar = async (activar = false) => {
    setGuardando(true);
    try {
      const { data } = await api.post('/rrhh/comisiones/esquema', { ...esquema, activar });
      toast.success(activar ? 'Guardado y puesto en uso' : 'Cambios guardados');
      const normalizado = {
        ...data,
        vigente_desde: data.vigente_desde?.slice(0, 10) || '',
        vigente_hasta: data.vigente_hasta?.slice(0, 10) || '',
      };
      setEsquema(normalizado);
      setOriginal(JSON.parse(JSON.stringify(normalizado)));
      setEditando(false);
      cargarEsquemas();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally { setGuardando(false); }
  };

  const cancelar = () => { setEsquema(JSON.parse(JSON.stringify(original))); setEditando(false); };

  const duplicar = async () => {
    try {
      const { data } = await api.post(`/rrhh/comisiones/esquema/${esquema.id}/duplicar`);
      toast.success('Copia creada');
      cargarEsquemas();
      cargarEsquema(data.id);
    } catch (err) { toast.error(err.response?.data?.error || 'Error al duplicar'); }
  };

  const calcular = useCallback(async () => {
    setSimulando(true);
    try {
      const hoy = new Date();
      const lunes = new Date(hoy);
      lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
      // Para probar el arranque se simula un vendedor que ingresó N-1 semanas
      // antes de este lunes: así el motor lo ubica en la semana elegida y se
      // puede verificar la tabla de bono de cada semana por separado.
      const ingreso = new Date(lunes);
      ingreso.setDate(lunes.getDate() - ((parseInt(sim.semana_vendedor) || 1) - 1) * 7);
      const { data } = await api.post('/rrhh/comisiones/simular', {
        esquema_id: esquema?.id,
        venta_bruta: sim.venta_bruta,
        utilidad: sim.utilidad === '' ? null : sim.utilidad,
        num_operaciones: sim.num_operaciones,
        fecha_ingreso_vendedor: sim.es_nuevo ? ingreso.toISOString().slice(0, 10) : null,
        fecha_inicio_periodo: sim.es_nuevo ? lunes.toISOString().slice(0, 10) : null,
      });
      setResultado(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al calcular');
      setResultado(null);
    } finally { setSimulando(false); }
  }, [esquema?.id, sim]);

  useEffect(() => { if (esquema?.id && !editando) calcular(); }, [esquema?.id, editando, calcular]);

  if (cargando || !esquema) {
    return <div className="card text-center text-steel-400 py-10">Cargando la hoja…</div>;
  }

  const vacia = esquema.componentes.length === 0 && esquema.condiciones.length === 0;
  const modoRamp = MODOS_RAMPUP.find((m) => m.value === esquema.rampup_modo);
  const semanasArranque = parseInt(esquema.rampup_semanas) || 0;

  // Los escalones del bono de arranque viajan en una lista plana; la pantalla
  // los agrupa por semana, que es como se configuran y como se leen. Se
  // arrastra el índice original (_i) para poder editar la fila correcta.
  const escalonesBono = (esquema.rampup_bono_tramos || []).map((t, i) => ({ ...t, _i: i }));
  const semanasBono = [...new Set(escalonesBono.map((t) => Number(t.semana_numero) || 1))].sort((a, b) => a - b);

  // En modo manual RRHH confirma un único monto por todo el paquete, así que
  // el desglose que se muestra es la sugerencia, no lo que se paga.
  const rp = resultado?.rampup;
  const rampManual = rp?.modo === 'manual';
  const rampMontoPct = rampManual ? (rp?.monto_porcentaje_sugerido ?? 0) : (rp?.monto_porcentaje ?? 0);
  const rampMontoBono = rampManual ? (rp?.bono?.monto_sugerido ?? 0) : (rp?.monto_bono ?? 0);

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ══ BARRA SUPERIOR ══ */}
      <div className="card !p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <select
              className="input-field !py-1.5 text-sm max-w-[280px]"
              value={esquema.id || ''}
              disabled={editando}
              onChange={(e) => (e.target.value ? cargarEsquema(e.target.value) : (setEsquema(esquemaVacio()), setEditando(true)))}
            >
              <option value="">+ Crear una hoja nueva</option>
              {esquemas.map((e) => (
                <option key={e.id} value={e.id}>{e.nombre}{e.activo ? '  ·  en uso' : ''}</option>
              ))}
            </select>
            {esquema.activo && (
              <span className="badge bg-emerald-500/15 text-emerald-600 whitespace-nowrap">
                <HiOutlineCheckCircle className="w-3.5 h-3.5 mr-1" /> En uso
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!editando ? (
              <>
                {esquema.id && (
                  <button onClick={duplicar} className="btn-ghost !py-1.5 !text-xs flex items-center gap-1.5">
                    <HiOutlineDuplicate className="w-4 h-4" /> Duplicar
                  </button>
                )}
                <button onClick={() => setEditando(true)} className="btn-secondary !py-1.5 !text-xs flex items-center gap-1.5">
                  <HiOutlinePencil className="w-4 h-4" /> Editar
                </button>
              </>
            ) : (
              <>
                <button onClick={cancelar} className="btn-ghost !py-1.5 !text-xs flex items-center gap-1.5">
                  <HiOutlineX className="w-4 h-4" /> Cancelar
                </button>
                <button onClick={() => guardar(false)} disabled={guardando}
                  className="btn-secondary !py-1.5 !text-xs flex items-center gap-1.5">
                  Guardar borrador
                </button>
                <button onClick={() => guardar(true)} disabled={guardando}
                  className="btn-primary !py-1.5 !text-xs flex items-center gap-1.5">
                  <HiOutlineCheck className="w-4 h-4" /> Guardar y usar
                </button>
              </>
            )}
          </div>
        </div>

        {editando ? (
          <div className="grid gap-3 mt-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="hoja-nota">Nombre de la hoja
              <input className="input-field !py-1.5 mt-1" value={esquema.nombre}
                placeholder="Comisiones V5 — Agosto 2026"
                onChange={(e) => set('nombre', e.target.value)} />
            </label>
            <label className="hoja-nota">Se paga cada
              <select className="input-field !py-1.5 mt-1" value={esquema.periodo} onChange={(e) => set('periodo', e.target.value)}>
                <option value="semanal">Semana (lunes a domingo)</option>
                <option value="mensual">Mes</option>
              </select>
            </label>
            <label className="hoja-nota">Empieza a regir el
              <input type="date" className="input-field !py-1.5 mt-1" value={esquema.vigente_desde}
                onChange={(e) => set('vigente_desde', e.target.value)} />
            </label>
            <label className="hoja-nota">Deja de regir el (opcional)
              <input type="date" className="input-field !py-1.5 mt-1" value={esquema.vigente_hasta || ''}
                onChange={(e) => set('vigente_hasta', e.target.value)} />
            </label>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <h2 className="hoja-titulo text-xl">{esquema.nombre || 'Hoja sin nombre'}</h2>
            <span className="hoja-nota">
              Se paga cada <strong className="text-steel-200">{esquema.periodo === 'semanal' ? 'semana' : 'mes'}</strong>
              {esquema.vigente_desde && <> · rige desde el <strong className="text-steel-200">{esquema.vigente_desde.split('-').reverse().join('/')}</strong></>}
            </span>
          </div>
        )}
      </div>

      {vacia && !editando && (
        <div className="card !p-4 border-accent-300 bg-accent-100/30">
          <div className="flex items-start gap-3">
            <HiOutlineExclamation className="w-5 h-5 text-accent-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-steel-100">Esta hoja está vacía</p>
              <p className="hoja-nota mt-0.5">
                No tiene requisitos ni conceptos de pago cargados: hoy nadie cobraría nada.
                Pulsa <strong className="text-steel-200">Editar</strong> para llenarla.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══ CALCULADORA ══ */}
      <div className="card !p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-steel-700/60 bg-steel-700/25">
          <h3 className="hoja-titulo">CALCULADORA</h3>
          <p className="hoja-nota mt-0.5">Escribe una semana de ejemplo y mira cuánto pagaría.</p>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,320px)_1fr]">
          {/* Entradas — celdas ámbar, como el amarillo del Excel */}
          <div className="p-5 space-y-3 border-b lg:border-b-0 lg:border-r border-steel-700/50 bg-steel-900/20">
            <p className="font-condensed uppercase tracking-[0.12em] text-[11px] text-steel-400">Datos de la semana</p>

            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-steel-200">Venta bruta</span>
              <input type="number" className="celda-entrada max-w-[130px]" value={sim.venta_bruta}
                onChange={(e) => setSim({ ...sim, venta_bruta: e.target.value })} />
            </label>

            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-steel-200">Operaciones</span>
              <input type="number" className="celda-entrada max-w-[130px]" value={sim.num_operaciones}
                onChange={(e) => setSim({ ...sim, num_operaciones: e.target.value })} />
            </label>

            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-steel-200">
                Utilidad
                <span className="block text-[11px] text-steel-400">opcional</span>
              </span>
              <input type="number" className="celda-entrada max-w-[130px]" value={sim.utilidad}
                placeholder="—" onChange={(e) => setSim({ ...sim, utilidad: e.target.value })} />
            </label>

            <label className="flex items-center gap-2 pt-1 text-sm text-steel-200">
              <input type="checkbox" checked={sim.es_nuevo}
                onChange={(e) => setSim({ ...sim, es_nuevo: e.target.checked })} />
              Es un vendedor recién ingresado
            </label>

            {/* Cada semana del arranque tiene su propia tabla de bono, así que
                hay que poder probarlas una por una. */}
            {sim.es_nuevo && (
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm text-steel-200">¿En qué semana va?</span>
                <select className="input-field !py-1 !text-sm max-w-[130px]" value={sim.semana_vendedor}
                  onChange={(e) => setSim({ ...sim, semana_vendedor: e.target.value })}>
                  {Array.from({ length: Math.max(semanasArranque, 1) + 1 }, (_, k) => k + 1).map((n) => (
                    <option key={n} value={n}>
                      {n > semanasArranque ? `Semana ${n} (ya no es nuevo)` : `Semana ${n}`}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button onClick={calcular} disabled={simulando || !esquema.id}
              className="btn-primary w-full !py-2 !text-sm mt-1">
              {simulando ? 'Calculando…' : 'Calcular'}
            </button>
            {!esquema.id && <p className="hoja-nota">Guarda la hoja antes de calcular.</p>}
          </div>

          {/* Resultado */}
          <div className="p-5">
            {!resultado ? (
              <p className="hoja-nota text-center py-10">Pulsa «Calcular» para ver el resultado.</p>
            ) : (
              <>
                <div className={`text-xs mb-3 px-3 py-2 rounded-md font-medium ${
                  resultado.cumple_candado ? 'bg-emerald-500/12 text-emerald-700' : 'bg-accent-500/15 text-accent-600'
                }`}>
                  {resultado.cumple_candado
                    ? 'Cumple los requisitos: cobra comisiones y bonos.'
                    : resultado.detalle_candado || 'No cumple los requisitos mínimos.'}
                </div>

                <table className="hoja">
                  <thead>
                    <tr>
                      <th>Concepto</th>
                      <th>Cómo se calculó</th>
                      <th className="!text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.componentes.map((c, i) => (
                      <tr key={i}>
                        <td className={c.monto === 0 ? 'text-steel-400' : ''}>{c.nombre}</td>
                        <td className="text-xs text-steel-400">
                          {c.bloqueado_por_candado ? 'No alcanzó el mínimo'
                            : c.suprimido_por_rampup ? 'No aplica en el arranque'
                            : c.tipo_valor === 'porcentaje' && c.valor_aplicado > 0
                              ? `${c.valor_aplicado}% de ${formatearMoneda(c.base_aplicada)}`
                              : c.tramo_etiqueta || '—'}
                        </td>
                        <td className={`cifra ${c.monto === 0 ? 'text-steel-400' : 'font-medium'}`}>
                          {formatearMoneda(c.monto)}
                        </td>
                      </tr>
                    ))}

                    {/* El paquete de arranque se muestra desglosado: el % que
                        se le reconoce y el bono de productividad de su semana. */}
                    {rp?.aplica && rp.porcentaje > 0 && (
                      <tr>
                        <td className={rampMontoPct === 0 ? 'text-steel-400' : ''}>Arranque de vendedor nuevo</td>
                        <td className="text-xs text-steel-400">
                          Semana {resultado.semana_del_vendedor} · {rp.porcentaje}% de {formatearMoneda(rp.base_aplicada)}
                        </td>
                        <td className={`cifra ${rampMontoPct === 0 ? 'text-steel-400' : 'font-medium'}`}>
                          {formatearMoneda(rampMontoPct)}
                        </td>
                      </tr>
                    )}

                    {rp?.bono?.aplica && (
                      <tr>
                        <td className={rampMontoBono === 0 ? 'text-steel-400' : ''}>Bono de productividad (vendedor nuevo)</td>
                        <td className="text-xs text-steel-400">
                          Semana {resultado.semana_del_vendedor} · {rp.bono.tramo_etiqueta
                            || `${rp.bono.valor_alcanzado} ops: no llega al mínimo de la semana`}
                        </td>
                        <td className={`cifra ${rampMontoBono === 0 ? 'text-steel-400' : 'font-medium'}`}>
                          {formatearMoneda(rampMontoBono)}
                        </td>
                      </tr>
                    )}

                    {/* En modo manual lo de arriba es la sugerencia: lo que se
                        paga es el monto único que confirma RRHH. */}
                    {rp?.aplica && rampManual && (
                      <tr>
                        <td className={rp.monto === 0 ? 'text-steel-400' : ''}>Arranque confirmado por RRHH</td>
                        <td className="text-xs text-steel-400">
                          {rp.confirmado
                            ? `Reemplaza el paquete sugerido de ${formatearMoneda(rp.monto_sugerido)}`
                            : <span className="text-accent-600">Falta que RRHH lo confirme · sugerido {formatearMoneda(rp.monto_sugerido)}</span>}
                        </td>
                        <td className="cifra font-medium">{formatearMoneda(rp.monto)}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2} className="px-3 py-3 font-display tracking-[0.08em] text-emerald-700 border-t-2 border-steel-600/70">
                        TOTAL DE LA SEMANA
                      </td>
                      <td className="cifra px-3 py-3 text-emerald-700 font-bold text-lg border-t-2 border-steel-600/70">
                        {formatearMoneda(resultado.total_periodo)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ══ 1. REQUISITOS ══ */}
      <Bloque
        numero="1"
        titulo="¿QUIÉN COBRA?"
        nota="Requisitos que el vendedor debe cumplir en la semana. Deben cumplirse todos."
        accion={editando && (
          <button onClick={() => set('condiciones', [...esquema.condiciones, { metrica: 'venta_bruta', operador: 'mayor_igual', valor: 0, etiqueta: '' }])}
            className="btn-ghost !py-1 !text-xs flex items-center gap-1">
            <HiOutlinePlus className="w-4 h-4" /> Agregar requisito
          </button>
        )}
      >
        {esquema.condiciones.length === 0 ? (
          <p className="hoja-nota px-5 py-4 italic">Sin requisitos: todos los vendedores cobrarían el variable completo.</p>
        ) : (
          <table className="hoja">
            <thead>
              <tr>
                <th className="!w-9" />
                <th>Concepto</th>
                <th>Debe tener</th>
                <th className="!text-right">Valor</th>
                {editando && <th className="!w-10" />}
              </tr>
            </thead>
            <tbody>
              {esquema.condiciones.map((c, i) => (
                <tr key={i}>
                  <td className="fila-num">{i + 1}</td>
                  <td>
                    {editando ? (
                      <select className="input-field !py-1 !text-sm" value={c.metrica}
                        onChange={(e) => { const a = [...esquema.condiciones]; a[i].metrica = e.target.value; set('condiciones', a); }}>
                        {METRICAS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    ) : metrica(c.metrica)?.label}
                  </td>
                  <td className="text-steel-300">
                    {editando ? (
                      <select className="input-field !py-1 !text-sm" value={c.operador}
                        onChange={(e) => { const a = [...esquema.condiciones]; a[i].operador = e.target.value; set('condiciones', a); }}>
                        {OPERADORES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : OPERADORES.find((o) => o.value === c.operador)?.label}
                  </td>
                  <td className="cifra font-semibold">
                    {editando ? (
                      <input type="number" className="celda-entrada max-w-[120px] ml-auto" value={c.valor}
                        onChange={(e) => { const a = [...esquema.condiciones]; a[i].valor = e.target.value; set('condiciones', a); }} />
                    ) : (
                      <>{metrica(c.metrica)?.unidad === 'S/' ? 'S/ ' : ''}{nfmt(c.valor)}{metrica(c.metrica)?.unidad !== 'S/' ? ` ${metrica(c.metrica)?.unidad}` : ''}</>
                    )}
                  </td>
                  {editando && (
                    <td className="text-center">
                      <button onClick={() => set('condiciones', esquema.condiciones.filter((_, x) => x !== i))}
                        className="text-primary-500 hover:text-primary-600"><HiOutlineTrash className="w-4 h-4" /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="hoja-nota px-5 py-3 border-t border-steel-700/40 bg-steel-700/15">
          Si no cumple, solo cobra los conceptos marcados como <strong className="text-steel-200">«se paga siempre»</strong> (normalmente el básico).
        </p>
      </Bloque>

      {/* ══ 2. CONCEPTOS DE PAGO ══ */}
      <Bloque
        numero="2"
        titulo="¿CUÁNTO SE PAGA?"
        nota="Cada fila del recibo del vendedor."
        accion={editando && (
          <button onClick={() => set('componentes', [...esquema.componentes, {
            nombre: 'Nuevo concepto', tipo: 'monto_por_escalon', base_calculo: 'ninguna',
            monto_fijo: 0, paga_aunque_falle_candado: false, detalle: '', activo: true, tramos: [],
          }])} className="btn-ghost !py-1 !text-xs flex items-center gap-1">
            <HiOutlinePlus className="w-4 h-4" /> Agregar concepto
          </button>
        )}
      >
        {esquema.componentes.length === 0 ? (
          <p className="hoja-nota px-5 py-4 italic">Sin conceptos: no se pagaría nada.</p>
        ) : (
          <div className="divide-y divide-steel-700/40">
            {esquema.componentes.map((c, i) => (
              <Concepto
                key={i} comp={c} indice={i} editando={editando}
                onCampo={(campo, v) => setComp(i, campo, v)}
                onTramo={(it, campo, v) => setTramo(i, it, campo, v)}
                onAgregarTramo={() => agregarTramo(i)}
                onQuitarTramo={(it) => setComp(i, 'tramos', c.tramos.filter((_, x) => x !== it))}
                onEliminar={() => set('componentes', esquema.componentes.filter((_, x) => x !== i))}
              />
            ))}
          </div>
        )}
      </Bloque>

      {/* ══ 3. VENDEDORES NUEVOS ══ */}
      <Bloque
        numero="3"
        titulo="VENDEDORES NUEVOS"
        nota="Un vendedor recién ingresado difícilmente llega al mínimo en sus primeras semanas."
      >
        <div className="px-5 py-4 space-y-3">
          {editando ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="hoja-nota">¿Qué se hace con este bono?
                <select className="input-field !py-1.5 mt-1" value={esquema.rampup_modo}
                  onChange={(e) => set('rampup_modo', e.target.value)}>
                  {MODOS_RAMPUP.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </label>
              <label className="hoja-nota">¿Cuántas semanas dura?
                <input type="number" min="1" className="input-field !py-1.5 mt-1" value={esquema.rampup_semanas}
                  disabled={esquema.rampup_modo === 'excluido'}
                  onChange={(e) => set('rampup_semanas', e.target.value)} />
              </label>
              <label className="hoja-nota">Mientras dura
                <select className="input-field !py-1.5 mt-1" value={esquema.rampup_reemplaza_escala ? 'si' : 'no'}
                  disabled={esquema.rampup_modo === 'excluido'}
                  onChange={(e) => set('rampup_reemplaza_escala', e.target.value === 'si')}>
                  <option value="si">Solo cobra esto (no comisión ni bonos)</option>
                  <option value="no">Cobra esto además de lo normal</option>
                </select>
              </label>
            </div>
          ) : (
            <p className="text-sm text-steel-200">
              <strong>{modoRamp?.label}.</strong>{' '}
              <span className="text-steel-400">{modoRamp?.ayuda}</span>
            </p>
          )}

          {esquema.rampup_modo !== 'excluido' && (
            <div className="pt-1">
              <div className="flex items-center justify-between mb-2">
                <span className="font-condensed uppercase tracking-[0.12em] text-[11px] text-steel-400">
                  Cuánto se le reconoce
                </span>
                {editando && (
                  <button onClick={() => set('rampup_tramos', [...(esquema.rampup_tramos || []), {
                    semana_numero: (esquema.rampup_tramos?.length || 0) + 1, porcentaje: 0, base_calculo: 'utilidad',
                  }])} className="btn-ghost !py-0.5 !text-xs flex items-center gap-1">
                    <HiOutlinePlus className="w-3.5 h-3.5" /> Agregar semana
                  </button>
                )}
              </div>

              {(esquema.rampup_tramos || []).length === 0 ? (
                <p className="hoja-nota italic text-accent-600">Falta indicar el porcentaje de cada semana.</p>
              ) : (
                <table className="hoja">
                  <thead>
                    <tr>
                      <th className="!w-9" />
                      <th>Semana del vendedor</th>
                      <th className="!text-right">Se le reconoce</th>
                      <th>Sobre</th>
                      {editando && <th className="!w-10" />}
                    </tr>
                  </thead>
                  <tbody>
                    {esquema.rampup_tramos.map((t, i) => (
                      <tr key={i}>
                        <td className="fila-num">{i + 1}</td>
                        <td>
                          {editando ? (
                            <input type="number" min="1" className="celda-entrada max-w-[80px] !text-left" value={t.semana_numero}
                              onChange={(e) => { const a = [...esquema.rampup_tramos]; a[i].semana_numero = e.target.value; set('rampup_tramos', a); }} />
                          ) : `Semana ${t.semana_numero}`}
                        </td>
                        <td className="cifra font-semibold">
                          {editando ? (
                            <input type="number" step="0.01" className="celda-entrada max-w-[90px] ml-auto" value={t.porcentaje}
                              onChange={(e) => { const a = [...esquema.rampup_tramos]; a[i].porcentaje = e.target.value; set('rampup_tramos', a); }} />
                          ) : `${Number(t.porcentaje)}%`}
                        </td>
                        <td className="text-steel-300">
                          {editando ? (
                            <select className="input-field !py-1 !text-sm" value={t.base_calculo}
                              onChange={(e) => { const a = [...esquema.rampup_tramos]; a[i].base_calculo = e.target.value; set('rampup_tramos', a); }}>
                              <option value="utilidad">la utilidad</option>
                              <option value="venta_bruta">la venta bruta</option>
                            </select>
                          ) : (t.base_calculo === 'utilidad' ? 'la utilidad' : 'la venta bruta')}
                        </td>
                        {editando && (
                          <td className="text-center">
                            <button onClick={() => set('rampup_tramos', esquema.rampup_tramos.filter((_, x) => x !== i))}
                              className="text-primary-500 hover:text-primary-600"><HiOutlineTrash className="w-4 h-4" /></button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Bono de productividad del arranque: una tabla de escalones por
              semana, porque al vendedor nuevo se le pide menos al principio. */}
          {esquema.rampup_modo !== 'excluido' && (
            <div className="pt-3 mt-1 border-t border-steel-700/40">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <span className="font-condensed uppercase tracking-[0.12em] text-[11px] text-steel-400">
                    Bono de productividad del vendedor nuevo
                  </span>
                  <p className="hoja-nota">
                    El mismo bono de siempre, pero con su propia tabla de operaciones en cada semana del arranque.
                  </p>
                </div>
                {editando && (
                  <button onClick={agregarSemanaBono} className="btn-ghost !py-0.5 !text-xs flex items-center gap-1 shrink-0">
                    <HiOutlinePlus className="w-3.5 h-3.5" /> Agregar semana
                  </button>
                )}
              </div>

              {semanasBono.length === 0 ? (
                <p className="hoja-nota italic">
                  Sin configurar: durante el arranque el vendedor nuevo no cobra bono de productividad.
                </p>
              ) : (
                <div className="space-y-3">
                  {semanasBono.map((sem) => {
                    const filas = escalonesBono.filter((t) => (Number(t.semana_numero) || 1) === sem);
                    const fueraDeArranque = semanasArranque > 0 && sem > semanasArranque;
                    return (
                      <div key={sem} className="rounded-lg border border-steel-700/50 overflow-hidden">
                        <div className="flex items-center justify-between gap-3 px-3 py-1.5 bg-steel-700/20">
                          <span className="text-xs font-medium text-steel-200">
                            Semana {sem} del vendedor
                            {fueraDeArranque && (
                              <span className="text-accent-600 ml-2 font-normal">
                                &middot; el arranque dura {semanasArranque} semana(s): esta nunca se pagaría
                              </span>
                            )}
                          </span>
                          {editando && (
                            <div className="flex items-center gap-2 shrink-0">
                              <button onClick={() => agregarEscalonBono(sem)} className="btn-ghost !py-0.5 !text-xs flex items-center gap-1">
                                <HiOutlinePlus className="w-3.5 h-3.5" /> Agregar escalón
                              </button>
                              <button onClick={() => quitarSemanaBono(sem)} className="text-primary-500 hover:text-primary-600">
                                <HiOutlineTrash className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="overflow-x-auto">
                          <table className="hoja">
                            <thead>
                              <tr>
                                <th className="!w-9" />
                                <th>Si cierra</th>
                                <th className="!text-right">Paga</th>
                                <th>Nombre</th>
                                {editando && <th className="!w-10" />}
                              </tr>
                            </thead>
                            <tbody>
                              {filas.map((t, j) => (
                                <tr key={t._i}>
                                  <td className="fila-num">{j + 1}</td>
                                  <td>
                                    {editando ? (
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-steel-400 text-xs">de</span>
                                        <input type="number" min="0" className="celda-entrada max-w-[80px]" value={t.desde_x}
                                          onChange={(e) => setBono(t._i, 'desde_x', e.target.value)} />
                                        <span className="text-steel-400 text-xs">a</span>
                                        <input type="number" min="0" className="celda-entrada max-w-[80px]" placeholder="sin tope"
                                          value={t.hasta_x ?? ''} onChange={(e) => setBono(t._i, 'hasta_x', e.target.value)} />
                                        <span className="text-steel-400 text-xs">operaciones</span>
                                      </div>
                                    ) : describirRango(t.desde_x, t.hasta_x, 'num_operaciones')}
                                  </td>
                                  <td className="cifra font-semibold">
                                    {editando ? (
                                      <input type="number" step="0.01" className="celda-entrada max-w-[90px] ml-auto" value={t.valor}
                                        onChange={(e) => setBono(t._i, 'valor', e.target.value)} />
                                    ) : formatearMoneda(t.valor)}
                                  </td>
                                  <td className="text-steel-400 text-xs">
                                    {editando ? (
                                      <input className="input-field !py-1 !text-xs w-28" placeholder="2 ops"
                                        value={t.etiqueta || ''} onChange={(e) => setBono(t._i, 'etiqueta', e.target.value)} />
                                    ) : (t.etiqueta || '—')}
                                  </td>
                                  {editando && (
                                    <td className="text-center">
                                      <button onClick={() => quitarEscalonBono(t._i)} className="text-primary-500 hover:text-primary-600">
                                        <HiOutlineTrash className="w-4 h-4" />
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                  <p className="hoja-nota">
                    Desde la semana {semanasArranque + 1} el vendedor deja de ser nuevo y pasa al bono de productividad regular.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </Bloque>

      {/* ══ AJUSTES AVANZADOS (colapsado) ══ */}
      <div className="card !p-0 overflow-hidden">
        <button onClick={() => setAvanzado(!avanzado)}
          className="w-full flex items-center gap-2 px-5 py-3 text-left hover:bg-steel-700/20 transition-colors">
          {avanzado ? <HiOutlineChevronDown className="w-4 h-4 text-steel-400" /> : <HiOutlineChevronRight className="w-4 h-4 text-steel-400" />}
          <HiOutlineCog className="w-4 h-4 text-steel-400" />
          <span className="hoja-titulo">AJUSTES AVANZADOS</span>
          <span className="hoja-nota ml-2">Qué venta cuenta como operación</span>
        </button>

        {avanzado && (
          <div className="px-5 pb-5 pt-1 border-t border-steel-700/40 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="font-condensed uppercase tracking-[0.12em] text-[11px] text-steel-400 mb-2">
                Estados de venta que cuentan
              </p>
              <div className="flex flex-wrap gap-4">
                {ESTADOS_VENTA.map((ev) => (
                  <label key={ev.value} className="flex items-center gap-1.5 text-sm text-steel-200">
                    <input type="checkbox" disabled={!editando}
                      checked={esquema.estados_venta_computables?.includes(ev.value)}
                      onChange={(e) => {
                        const act = esquema.estados_venta_computables || [];
                        set('estados_venta_computables', e.target.checked ? [...act, ev.value] : act.filter((x) => x !== ev.value));
                      }} />
                    {ev.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-steel-200">
                <input type="checkbox" disabled={!editando} checked={esquema.requiere_pago_completo}
                  onChange={(e) => set('requiere_pago_completo', e.target.checked)} />
                La venta debe estar pagada por completo
              </label>
              <label className="flex items-center gap-2 text-sm text-steel-200">
                <input type="checkbox" disabled={!editando} checked={esquema.revierte_si_cancela}
                  onChange={(e) => set('revierte_si_cancela', e.target.checked)} />
                Descontar la comisión si la venta se cancela después
              </label>
            </div>

            <label className="hoja-nota">Adelanto mínimo para que la venta cuente
              <input type="number" step="0.01" className="input-field !py-1.5 mt-1" disabled={!editando}
                value={esquema.monto_adelanto_minimo}
                onChange={(e) => set('monto_adelanto_minimo', e.target.value)} />
              <span className="block mt-1">0 = cualquier adelanto sirve.</span>
            </label>

            <label className="hoja-nota">La venta bruta se toma de
              <select className="input-field !py-1.5 mt-1" disabled={!editando} value={esquema.origen_venta_bruta}
                onChange={(e) => set('origen_venta_bruta', e.target.value)}>
                <option value="total">El total de la venta</option>
                <option value="total_pagado">Solo lo que el cliente ya pagó</option>
              </select>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bloque numerado de la hoja
// ---------------------------------------------------------------------------
function Bloque({ numero, titulo, nota, accion, children }) {
  return (
    <div className="card !p-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-steel-700/60 bg-steel-700/25">
        <div className="flex items-baseline gap-3 min-w-0">
          <span className="font-display text-primary-500 text-lg leading-none">{numero}</span>
          <div className="min-w-0">
            <h3 className="hoja-titulo">{titulo}</h3>
            {nota && <p className="hoja-nota mt-0.5">{nota}</p>}
          </div>
        </div>
        {accion}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Un concepto de pago con su tabla
// ---------------------------------------------------------------------------
function Concepto({ comp, indice, editando, onCampo, onTramo, onAgregarTramo, onQuitarTramo, onEliminar }) {
  const [abierto, setAbierto] = useState(true);
  const esFijo = comp.tipo === 'fijo';
  const esMatriz = comp.tipo === 'monto_por_matriz';
  const tipoInfo = TIPOS_COMPONENTE.find((t) => t.value === comp.tipo);
  const tramos = comp.tramos || [];
  const apagado = comp.activo === false;

  return (
    <div className={apagado ? 'opacity-50' : ''}>
      {/* Encabezado del concepto */}
      <div className="flex flex-wrap items-center gap-2 px-5 py-3">
        {!esFijo && (
          <button onClick={() => setAbierto(!abierto)} className="text-steel-400 hover:text-steel-200">
            {abierto ? <HiOutlineChevronDown className="w-4 h-4" /> : <HiOutlineChevronRight className="w-4 h-4" />}
          </button>
        )}

        <span className="font-condensed text-[11px] text-steel-400 w-5">{indice + 1}.</span>

        {editando ? (
          <input className="input-field !py-1 !text-sm font-semibold flex-1 min-w-[160px]" value={comp.nombre}
            onChange={(e) => onCampo('nombre', e.target.value)} />
        ) : (
          <span className="font-semibold text-steel-100 flex-1 min-w-[160px]">{comp.nombre}</span>
        )}

        {esFijo && (
          <span className="cifra font-semibold text-steel-100 min-w-[110px] text-right">
            {editando ? (
              <input type="number" step="0.01" className="celda-entrada max-w-[120px] ml-auto" value={comp.monto_fijo}
                onChange={(e) => onCampo('monto_fijo', e.target.value)} />
            ) : formatearMoneda(comp.monto_fijo)}
          </span>
        )}

        {comp.paga_aunque_falle_candado && !editando && (
          <span className="badge bg-emerald-500/15 text-emerald-600 !text-[10px]">se paga siempre</span>
        )}
        {apagado && !editando && (
          <span className="badge bg-steel-600/40 text-steel-300 !text-[10px]">apagado</span>
        )}

        {editando && (
          <>
            <select className="input-field !py-1 !text-xs w-56" value={comp.tipo}
              onChange={(e) => onCampo('tipo', e.target.value)}>
              {TIPOS_COMPONENTE.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <label className="flex items-center gap-1.5 text-xs text-steel-300 whitespace-nowrap">
              <input type="checkbox" checked={comp.paga_aunque_falle_candado}
                onChange={(e) => onCampo('paga_aunque_falle_candado', e.target.checked)} />
              se paga siempre
            </label>
            <label className="flex items-center gap-1.5 text-xs text-steel-300 whitespace-nowrap">
              <input type="checkbox" checked={comp.activo !== false}
                onChange={(e) => onCampo('activo', e.target.checked)} />
              activo
            </label>
            <button onClick={onEliminar} className="text-primary-500 hover:text-primary-600">
              <HiOutlineTrash className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Tabla del concepto */}
      {!esFijo && abierto && (
        <div className="pb-4 px-5">
          {editando && (
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <p className="hoja-nota flex-1">{tipoInfo?.ayuda}</p>
              {comp.tipo === 'porcentaje_por_tramo' && (
                <label className="hoja-nota flex items-center gap-2">
                  El porcentaje se aplica sobre
                  <select className="input-field !py-1 !text-xs w-36" value={comp.base_calculo}
                    onChange={(e) => onCampo('base_calculo', e.target.value)}>
                    {BASES.filter((b) => b.value !== 'ninguna').map((b) => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                </label>
              )}
              <button onClick={onAgregarTramo} className="btn-ghost !py-1 !text-xs flex items-center gap-1">
                <HiOutlinePlus className="w-3.5 h-3.5" /> Agregar fila
              </button>
            </div>
          )}

          {tramos.length === 0 ? (
            <p className="hoja-nota italic text-accent-600 flex items-center gap-1.5">
              <HiOutlineExclamation className="w-4 h-4" /> Sin filas: este concepto siempre pagaría S/ 0.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-steel-700/50">
              <table className="hoja">
                <thead>
                  <tr>
                    <th className="!w-9" />
                    <th>Si {metrica(tramos[0]?.metrica_x)?.corto || 'la venta'} es</th>
                    {esMatriz && <th>Y además</th>}
                    <th className="!text-right">Paga</th>
                    <th>Nombre</th>
                    {editando && <th className="!w-10" />}
                  </tr>
                </thead>
                <tbody>
                  {tramos.map((t, j) => (
                    <tr key={j}>
                      <td className="fila-num">{j + 1}</td>

                      {/* Rango principal */}
                      <td>
                        {editando ? (
                          <div className="flex items-center gap-1.5">
                            <select className="input-field !py-1 !text-xs w-36" value={t.metrica_x}
                              onChange={(e) => onTramo(j, 'metrica_x', e.target.value)}>
                              {METRICAS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <span className="text-steel-400 text-xs">de</span>
                            <input type="number" className="celda-entrada max-w-[95px]" value={t.desde_x}
                              onChange={(e) => onTramo(j, 'desde_x', e.target.value)} />
                            <span className="text-steel-400 text-xs">a</span>
                            <input type="number" className="celda-entrada max-w-[95px]" placeholder="sin tope"
                              value={t.hasta_x ?? ''} onChange={(e) => onTramo(j, 'hasta_x', e.target.value)} />
                          </div>
                        ) : describirRango(t.desde_x, t.hasta_x, t.metrica_x)}
                      </td>

                      {/* Segundo eje (matriz) */}
                      {esMatriz && (
                        <td>
                          {editando ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-steel-400 text-xs">al menos</span>
                              <input type="number" className="celda-entrada max-w-[80px]" value={t.desde_y ?? ''}
                                onChange={(e) => onTramo(j, 'desde_y', e.target.value)} />
                              <select className="input-field !py-1 !text-xs w-32" value={t.metrica_y || 'num_operaciones'}
                                onChange={(e) => onTramo(j, 'metrica_y', e.target.value)}>
                                {METRICAS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                              </select>
                            </div>
                          ) : (
                            <>al menos {nfmt(t.desde_y)} {metrica(t.metrica_y)?.corto}</>
                          )}
                        </td>
                      )}

                      {/* Valor */}
                      <td className="cifra font-semibold">
                        {editando ? (
                          <div className="flex items-center gap-1.5 justify-end">
                            <input type="number" step="0.01" className="celda-entrada max-w-[90px]" value={t.valor}
                              onChange={(e) => onTramo(j, 'valor', e.target.value)} />
                            <select className="input-field !py-1 !text-xs w-16" value={t.tipo_valor}
                              onChange={(e) => onTramo(j, 'tipo_valor', e.target.value)}>
                              <option value="monto">S/</option>
                              <option value="porcentaje">%</option>
                            </select>
                          </div>
                        ) : describirValor(t.tipo_valor, t.valor, comp.base_calculo)}
                      </td>

                      {/* Etiqueta */}
                      <td className="text-steel-400 text-xs">
                        {editando ? (
                          <input className="input-field !py-1 !text-xs w-32" placeholder="Zona Oxígeno"
                            value={t.etiqueta || ''} onChange={(e) => onTramo(j, 'etiqueta', e.target.value)} />
                        ) : (t.etiqueta || '—')}
                      </td>

                      {editando && (
                        <td className="text-center">
                          <button onClick={() => onQuitarTramo(j)} className="text-primary-500 hover:text-primary-600">
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
