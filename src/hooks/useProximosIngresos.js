import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { ESTADO_IMPORTACION, ESTADO_COMPRA, ESTADO_DISPLAY } from '../config/constants';

export const ORIGEN_PROXIMO = {
  IMPORTACION: 'importacion',
  COMPRA_LOCAL: 'compra_local',
};

export default function useProximosIngresos() {
  const [data, setData] = useState({ importaciones: [], compras: [] });
  const [cargando, setCargando] = useState(true);

  const cargar = async () => {
    setCargando(true);
    try {
      const { data: res } = await api.get('/productos/proximos-ingresos');
      setData({
        importaciones: Array.isArray(res.importaciones) ? res.importaciones : [],
        compras: Array.isArray(res.compras) ? res.compras : [],
      });
    } catch {
      setData({ importaciones: [], compras: [] });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const itemsPlanos = useMemo(() => {
    const items = [];
    for (const imp of data.importaciones) {
      for (const item of (imp.items || [])) {
        items.push({
          id: `imp-${item.id}`,
          origen: ORIGEN_PROXIMO.IMPORTACION,
          origen_nombre: imp.nombre || `Importación #${imp.id}`,
          origen_id: imp.id,
          estado: imp.estado,
          fecha_estimada: imp.fecha_desembarque,
          product_id: item.product_id,
          producto: item.tbl_productos?.nombre || `Producto #${item.product_id}`,
          cantidad: item.cantidad,
          media: item.tbl_productos?.media || [],
        });
      }
    }
    for (const compra of data.compras) {
      for (const item of (compra.items || [])) {
        items.push({
          id: `comp-${item.id}`,
          origen: ORIGEN_PROXIMO.COMPRA_LOCAL,
          origen_nombre: `Compra #${compra.id}`,
          origen_id: compra.id,
          estado: compra.estado,
          estado_display: compra.estado === ESTADO_COMPRA.REGISTRADA
            ? ESTADO_DISPLAY.PROCESANDO_EN_ALMACEN
            : compra.estado,
          fecha_estimada: compra.fecha_compra,
          product_id: item.product_id,
          producto: item.tbl_productos?.nombre || `Producto #${item.product_id}`,
          cantidad: item.cantidad,
          media: item.tbl_productos?.media || [],
        });
      }
    }
    return items;
  }, [data]);

  const resumen = useMemo(() => {
    let enTransito = 0;
    let retrasadas = 0;
    let totalCompras = 0;

    for (const imp of data.importaciones) {
      const cantItems = (imp.items || []).length;
      if (imp.estado === ESTADO_IMPORTACION.RETRASADA) {
        retrasadas += cantItems;
      } else {
        enTransito += cantItems;
      }
    }

    for (const compra of data.compras) {
      totalCompras += (compra.items || []).length;
    }

    return { enTransito, retrasadas, totalCompras };
  }, [data]);

  return { data, cargando, itemsPlanos, resumen, recargar: cargar };
}
