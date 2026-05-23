import { useState, useEffect, useRef } from 'react';
import { HiOutlineSearch } from 'react-icons/hi';
import api from '../../api/axios';

export default function BuscadorAutocomplete({ endpoint, campo = 'nombre', placeholder = 'Buscar...', onSeleccionar, valor = '', paramBusqueda = 'q' }) {
  const [texto, setTexto] = useState(valor);
  const [resultados, setResultados] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const ref = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => { setTexto(valor); }, [valor]);

  useEffect(() => {
    const handleClickFuera = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, []);

  const buscar = (query) => {
    setTexto(query);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!query.trim()) { setResultados([]); setAbierto(false); return; }
    timeoutRef.current = setTimeout(async () => {
      setCargando(true);
      try {
        const { data } = await api.get(endpoint, { params: { [paramBusqueda]: query } });
        const lista = Array.isArray(data) ? data : (data.datos || data.data || []);
        setResultados(lista.slice(0, 10));
        setAbierto(true);
      } catch { setResultados([]); }
      setCargando(false);
    }, 300);
  };

  const seleccionar = (item) => {
    setTexto(item[campo] || item.nombres || item.nombre || '');
    setAbierto(false);
    onSeleccionar(item);
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-400" />
        <input type="text" className="input-field pl-9" placeholder={placeholder} value={texto}
          onChange={e => buscar(e.target.value)} onFocus={() => resultados.length > 0 && setAbierto(true)} />
        {cargando && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-steel-600 border-t-primary-500 rounded-full animate-spin" />}
      </div>
      {abierto && resultados.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-steel-800 border border-steel-700 rounded-lg shadow-steel max-h-48 overflow-y-auto">
          {resultados.map((item, i) => (
            <li key={item.id || i} onClick={() => seleccionar(item)}
              className="px-3 py-2 text-sm text-steel-200 hover:bg-primary-500/10 hover:text-primary-600 cursor-pointer border-b border-steel-700/50 last:border-0 transition-colors">
              {item[campo] || item.nombres || item.nombre}
              {item.correo && <span className="text-xs text-steel-500 ml-2">{item.correo}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
