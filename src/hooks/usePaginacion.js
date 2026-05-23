import { useState, useMemo } from 'react';

export default function usePaginacion(datos = [], porPagina = 15) {
  const [paginaActual, setPaginaActual] = useState(1);

  const totalPaginas = useMemo(() => Math.ceil(datos.length / porPagina), [datos.length, porPagina]);

  const datosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * porPagina;
    return datos.slice(inicio, inicio + porPagina);
  }, [datos, paginaActual, porPagina]);

  const irAPagina = (pagina) => {
    setPaginaActual(Math.max(1, Math.min(pagina, totalPaginas)));
  };

  return { datosPaginados, paginaActual, totalPaginas, irAPagina, setPaginaActual };
}
