import { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { LANDING_ICON_MAP, IconDefault } from '../public/landingIconMap';
import { LANDING_SIDEBAR } from '../../config/constants';
import { HiOutlineSearch, HiOutlineChevronDown } from 'react-icons/hi';

const POPOVER_HEIGHT = 340;
const POPOVER_MARGIN = 4;

// Normaliza para búsqueda: lowercase + sin tildes (combining marks U+0300..U+036F)
const normalizar = (s) =>
  (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export default function IconPicker({ value, onChange, catalogo, categorias, disabled = false }) {
  const iconos = catalogo ?? LANDING_SIDEBAR.iconos;
  const cats = categorias ?? LANDING_SIDEBAR.iconosCategorias;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, abrirArriba: false });
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const inputRef = useRef(null);

  const seleccionado = useMemo(
    () => iconos.find((i) => i.value === value) || null,
    [iconos, value]
  );

  const IconoActual = seleccionado ? LANDING_ICON_MAP[seleccionado.value] || IconDefault : null;

  // Filtrado por query (label, value, keywords, categoria)
  const filtrados = useMemo(() => {
    const q = normalizar(query).trim();
    if (!q) return iconos;
    return iconos.filter((i) => {
      const blob = normalizar([i.label, i.value, i.keywords, i.categoria].join(' '));
      return blob.includes(q);
    });
  }, [iconos, query]);

  // Agrupar por categoría manteniendo orden de `cats`
  const grupos = useMemo(() => {
    const mapa = new Map();
    for (const i of filtrados) {
      const k = i.categoria || 'general';
      if (!mapa.has(k)) mapa.set(k, []);
      mapa.get(k).push(i);
    }
    const ordenados = [];
    for (const c of cats) {
      if (mapa.has(c.value)) ordenados.push({ ...c, items: mapa.get(c.value) });
    }
    for (const [k, items] of mapa) {
      if (!cats.find((c) => c.value === k)) {
        ordenados.push({ value: k, label: k, items });
      }
    }
    return ordenados;
  }, [filtrados, cats]);

  // Cerrar al click fuera (considera trigger y popover portalizado)
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      const dentroTrigger = triggerRef.current && triggerRef.current.contains(e.target);
      const dentroPopover = popoverRef.current && popoverRef.current.contains(e.target);
      if (!dentroTrigger && !dentroPopover) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Calcular posición del popover y reaccionar a scroll/resize
  useLayoutEffect(() => {
    if (!open) return;
    const calcular = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const espacioAbajo = window.innerHeight - rect.bottom;
      const espacioArriba = rect.top;
      const abrirArriba = espacioAbajo < POPOVER_HEIGHT && espacioArriba > espacioAbajo;
      setPos({
        top: abrirArriba ? rect.top - POPOVER_MARGIN : rect.bottom + POPOVER_MARGIN,
        left: rect.left,
        width: rect.width,
        abrirArriba,
      });
    };
    calcular();
    window.addEventListener('scroll', calcular, true);
    window.addEventListener('resize', calcular);
    return () => {
      window.removeEventListener('scroll', calcular, true);
      window.removeEventListener('resize', calcular);
    };
  }, [open]);

  // Focus automático al abrir
  useEffect(() => {
    if (open && inputRef.current) {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  const seleccionar = (val) => {
    onChange?.(val);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
      return;
    }
    if (e.key === 'Enter' && filtrados.length > 0) {
      e.preventDefault();
      seleccionar(filtrados[0].value);
    }
  };

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="input-field w-full flex items-center gap-2 text-left disabled:opacity-50"
      >
        {IconoActual ? (
          <IconoActual className="w-5 h-5 text-primary-400 shrink-0" />
        ) : (
          <span className="w-5 h-5 rounded border border-dashed border-steel-600 shrink-0" />
        )}
        <span className="flex-1 truncate text-sm">
          {seleccionado ? seleccionado.label : LANDING_SIDEBAR.sinIconoLabel}
        </span>
        <HiOutlineChevronDown className={`w-4 h-4 text-steel-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover en portal con position: fixed para escapar de stacking contexts (.card usa backdrop-blur) */}
      {open && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: pos.abrirArriba ? undefined : pos.top,
            bottom: pos.abrirArriba ? window.innerHeight - pos.top : undefined,
            left: pos.left,
            width: pos.width,
            zIndex: 9999,
          }}
          className="bg-steel-900 border border-steel-700 rounded-lg shadow-2xl overflow-hidden"
        >
          {/* Buscador */}
          <div className="p-2 border-b border-steel-700 bg-steel-900 sticky top-0">
            <div className="relative">
              <HiOutlineSearch className="w-4 h-4 text-steel-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                className="input-field w-full pl-8 pr-2 py-1.5 text-sm"
                placeholder={LANDING_SIDEBAR.buscarIconoPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
              />
            </div>
          </div>

          {/* Grid de íconos */}
          <div className="max-h-72 overflow-y-auto p-2">
            {grupos.length === 0 ? (
              <p className="text-xs text-steel-400 text-center py-6">
                {LANDING_SIDEBAR.sinResultadosIconos}
              </p>
            ) : (
              grupos.map((g) => (
                <div key={g.value} className="mb-3 last:mb-0">
                  <p className="text-[10px] uppercase tracking-wider text-steel-500 mb-1.5 px-1">
                    {g.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {g.items.map((i) => {
                      const Icon = LANDING_ICON_MAP[i.value] || IconDefault;
                      const esActual = i.value === value;
                      return (
                        <button
                          key={i.value}
                          type="button"
                          onClick={() => seleccionar(i.value)}
                          title={i.label}
                          className={`w-8 h-8 flex items-center justify-center rounded border transition-colors ${
                            esActual
                              ? 'bg-primary-500/15 border-primary-400 text-primary-300 ring-1 ring-primary-400'
                              : 'bg-steel-800/40 border-steel-700 text-steel-200 hover:bg-steel-700/60 hover:text-primary-300'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
