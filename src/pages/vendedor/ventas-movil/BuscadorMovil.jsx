import { useState, useEffect, useRef } from 'react';
import { HiOutlineSearch, HiOutlineX, HiChevronRight } from 'react-icons/hi';
import HojaMovil from './HojaMovil';

/**
 * Búsqueda con autocompletado, en versión celular.
 *
 * El desplegable flotante de escritorio no funciona con un teclado virtual
 * ocupando media pantalla: tapa los resultados justo mientras se escribe. Aquí
 * el toque abre una hoja dedicada donde el campo queda arriba, fijo, y los
 * resultados ocupan todo lo que el teclado deja libre.
 *
 * El contrato es el mismo que el de `AutocompleteBusqueda` del escritorio
 * (misma `buscarFn`, mismo debounce de 300 ms, mismos callbacks), así que la
 * búsqueda devuelve exactamente lo mismo en ambas vistas.
 */
export default function BuscadorMovil({
  buscarFn,
  placeholder = 'Buscar...',
  titulo = 'Buscar',
  renderItem,
  onSeleccionar,
  valorTexto = '',
  onLimpiar,
  onTexto,
  renderExtra,
  icono: Icono = HiOutlineSearch,
  nivel = 1,
}) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const timeoutRef = useRef(null);
  const inputRef = useRef(null);

  // El teclado solo aparece si el foco llega después de que la hoja se pintó.
  useEffect(() => {
    if (!abierto) return undefined;
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [abierto]);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const buscar = (query) => {
    setTexto(query);
    onTexto?.(query);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!query.trim()) {
      setResultados([]);
      setBuscado(false);
      return;
    }
    timeoutRef.current = setTimeout(async () => {
      setCargando(true);
      try {
        const lista = await buscarFn(query);
        setResultados(lista.slice(0, 20));
      } catch {
        setResultados([]);
      }
      setBuscado(true);
      setCargando(false);
    }, 300);
  };

  const abrir = () => {
    setTexto('');
    setResultados([]);
    setBuscado(false);
    setAbierto(true);
  };

  const elegir = (item) => {
    setAbierto(false);
    onSeleccionar(item);
  };

  return (
    <>
      {/* Disparador: muestra lo ya elegido o invita a buscar */}
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={abrir}
          className="flex-1 min-w-0 flex items-center gap-2.5 min-h-[52px] px-3.5 rounded-xl border border-steel-700 bg-steel-900 text-left active:bg-steel-800 transition-colors"
        >
          {Icono && <Icono className="w-5 h-5 text-steel-500 shrink-0" />}
          <span className={`flex-1 min-w-0 truncate text-base ${valorTexto ? 'text-steel-100 font-medium' : 'text-steel-500'}`}>
            {valorTexto || placeholder}
          </span>
          <HiChevronRight className="w-5 h-5 text-steel-500 shrink-0" />
        </button>
        {valorTexto && onLimpiar && (
          <button
            type="button"
            onClick={onLimpiar}
            aria-label="Quitar selección"
            className="w-12 shrink-0 flex items-center justify-center rounded-xl border border-steel-700 bg-steel-900 text-steel-400 active:bg-steel-800"
          >
            <HiOutlineX className="w-5 h-5" />
          </button>
        )}
      </div>

      <HojaMovil
        abierta={abierto}
        cerrar={() => setAbierto(false)}
        titulo={titulo}
        icono="cerrar"
        nivel={nivel}
        encabezadoExtra={
          <div className="px-3 pb-3">
            <div className="relative">
              <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-steel-500" />
              <input
                ref={inputRef}
                type="text"
                value={texto}
                onChange={(e) => buscar(e.target.value)}
                placeholder={placeholder}
                autoComplete="off"
                className="w-full bg-steel-950 border border-steel-700 rounded-xl pl-11 pr-11 py-3 text-base text-steel-100 placeholder-steel-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
              />
              {cargando && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-steel-600 border-t-primary-500 rounded-full animate-spin" />
              )}
              {!cargando && texto && (
                <button
                  type="button"
                  onClick={() => buscar('')}
                  aria-label="Limpiar"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-steel-500"
                >
                  <HiOutlineX className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        }
      >
        <div className="pb-8">
          {resultados.length > 0 && (
            <ul className="divide-y divide-steel-800">
              {resultados.map((item, i) => (
                <li key={item.id || i}>
                  <button
                    type="button"
                    onClick={() => elegir(item)}
                    className="w-full text-left px-4 py-3.5 active:bg-steel-900 transition-colors"
                  >
                    {renderItem ? renderItem(item) : <span className="text-steel-100">{item.nombre}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!cargando && buscado && resultados.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-steel-500">
              Sin resultados para «{texto}»
            </p>
          )}

          {!texto && (
            <p className="px-4 py-8 text-center text-sm text-steel-500">
              Escribe para buscar
            </p>
          )}

          {renderExtra && (
            <div className="px-4 pt-2">
              {renderExtra({ texto, resultados, cargando, cerrar: () => setAbierto(false) })}
            </div>
          )}
        </div>
      </HojaMovil>
    </>
  );
}
