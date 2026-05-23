import { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { HiOutlineChevronDown, HiOutlineSearch } from 'react-icons/hi';

const DROPDOWN_HEIGHT = 280;
const DROPDOWN_MARGIN = 4;

export default function ComboboxSelect({
  opciones = [],
  value = '',
  onChange,
  placeholder = '-- Seleccione --',
  campoLabel = 'nombre',
  campoValue = 'id',
  required = false,
  disabled = false,
  className = '',
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [posicion, setPosicion] = useState({ top: 0, left: 0, width: 0, abrirArriba: false });
  const ref = useRef(null);
  const botonRef = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const cerrar = () => {
    setAbierto(false);
    setBusqueda('');
  };

  // Cerrar al hacer clic fuera (incluye el dropdown del portal)
  useEffect(() => {
    const handleClickFuera = (e) => {
      const dentroBoton = ref.current && ref.current.contains(e.target);
      const dentroDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!dentroBoton && !dentroDropdown) {
        setAbierto(false);
        setBusqueda('');
      }
    };
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, []);

  // Calcular posición y reaccionar a scroll/resize
  useLayoutEffect(() => {
    if (!abierto) return;
    const calcular = () => {
      if (!botonRef.current) return;
      const rect = botonRef.current.getBoundingClientRect();
      const espacioAbajo = window.innerHeight - rect.bottom;
      const espacioArriba = rect.top;
      const abrirArriba = espacioAbajo < DROPDOWN_HEIGHT && espacioArriba > espacioAbajo;
      setPosicion({
        top: abrirArriba ? rect.top - DROPDOWN_MARGIN : rect.bottom + DROPDOWN_MARGIN,
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
  }, [abierto]);

  // Opciones filtradas
  const opcionesFiltradas = useMemo(() => {
    if (!busqueda.trim()) return opciones;
    const q = busqueda.toLowerCase();
    return opciones.filter((o) =>
      String(o[campoLabel] || '').toLowerCase().includes(q)
    );
  }, [opciones, busqueda, campoLabel]);

  // Nombre de la opción seleccionada
  const labelSeleccionado = useMemo(() => {
    if (!value) return '';
    const encontrado = opciones.find((o) => String(o[campoValue]) === String(value));
    return encontrado ? encontrado[campoLabel] : '';
  }, [opciones, value, campoValue, campoLabel]);

  const seleccionar = (opcion) => {
    onChange(String(opcion[campoValue]));
    cerrar();
  };

  const abrir = () => {
    if (disabled) return;
    setAbierto(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Campo visible */}
      <button
        ref={botonRef}
        type="button"
        onClick={abrir}
        disabled={disabled}
        className="input-field w-full text-left flex items-center justify-between gap-2"
      >
        <span className={labelSeleccionado ? 'text-steel-100' : 'text-steel-500'}>
          {labelSeleccionado || placeholder}
        </span>
        <HiOutlineChevronDown className={`w-4 h-4 text-steel-400 flex-shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {/* Input hidden para validación de formulario */}
      {required && (
        <input
          type="text"
          required
          value={value}
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
        />
      )}

      {/* Dropdown renderizado en portal con position: fixed para escapar de overflow:hidden de ancestros */}
      {abierto && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: posicion.abrirArriba ? undefined : posicion.top,
            bottom: posicion.abrirArriba ? window.innerHeight - posicion.top : undefined,
            left: posicion.left,
            width: posicion.width,
            zIndex: 9999,
          }}
          className="bg-steel-800 border border-steel-700 rounded-lg shadow-steel overflow-hidden"
        >
          {/* Buscador */}
          <div className="relative border-b border-steel-700">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-400" />
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-transparent text-sm text-steel-100 py-2.5 pl-9 pr-3 outline-none placeholder:text-steel-500"
              placeholder="Buscar..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          {/* Lista de opciones */}
          <ul className="max-h-60 overflow-y-auto">
            {opcionesFiltradas.length === 0 ? (
              <li className="px-3 py-2 text-sm text-steel-500 text-center">
                Sin resultados
              </li>
            ) : (
              opcionesFiltradas.map((opcion) => {
                const esSeleccionado = String(opcion[campoValue]) === String(value);
                return (
                  <li
                    key={opcion[campoValue]}
                    onClick={() => seleccionar(opcion)}
                    className={`px-3 py-2 text-sm cursor-pointer border-b border-steel-700/50 last:border-0 transition-colors ${
                      esSeleccionado
                        ? 'bg-primary-500/20 text-primary-400 font-medium'
                        : 'text-steel-200 hover:bg-primary-500/10 hover:text-primary-400'
                    }`}
                  >
                    {opcion[campoLabel]}
                  </li>
                );
              })
            )}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
}
