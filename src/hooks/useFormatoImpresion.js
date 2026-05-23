import { useState, useMemo } from 'react';
import {
  LS_FORMATO_IMPRESION_KEY,
  PROTOCOLO_DEFAULT_ID,
} from '../config/constants';
import { getDriver } from '../utils/printers';

/**
 * Persiste y expone el formato de impresión seleccionado para el protocolo
 * activo. El estado es por-protocolo: cada protocolo recuerda su última
 * selección (TSPL su 58c, ESC/POS su 80c, ZPL su 100×150, etc.).
 *
 * El localStorage usa una clave por protocolo (`{base}_{protocoloId}`) en
 * lugar de un JSON-blob para evitar problemas de parsing y mantener la
 * información explícita.
 */
function lsKeyPara(protocoloId) {
  return `${LS_FORMATO_IMPRESION_KEY}_${protocoloId}`;
}

function leerFormatoGuardado(driver) {
  if (!driver) return null;
  const guardado = localStorage.getItem(lsKeyPara(driver.id));
  if (guardado && driver.formatos.some((f) => f.id === guardado)) return guardado;
  return null;
}

function resolverFormatoIdInicial(driver) {
  return leerFormatoGuardado(driver) || driver.formatoDefaultId;
}

export default function useFormatoImpresion(protocoloId = PROTOCOLO_DEFAULT_ID) {
  const driver = useMemo(() => getDriver(protocoloId), [protocoloId]);

  const [formatoId, setFormatoId] = useState(() => resolverFormatoIdInicial(driver));
  const [driverIdAnterior, setDriverIdAnterior] = useState(driver.id);

  // Cambio de protocolo: resincroniza formato sin pasar por useEffect.
  // React permite setState durante el render mientras se compare con el
  // valor previo (evita el patrón anti-pattern de set-state-in-effect).
  if (driverIdAnterior !== driver.id) {
    setDriverIdAnterior(driver.id);
    setFormatoId(resolverFormatoIdInicial(driver));
  }

  const formatoSeleccionado =
    driver.formatos.find((f) => f.id === formatoId) || driver.formatos[0];

  const cambiarFormato = (id) => {
    if (!driver.formatos.some((f) => f.id === id)) return;
    setFormatoId(id);
    localStorage.setItem(lsKeyPara(driver.id), id);
  };

  return {
    formatoSeleccionado,
    formatosDisponibles: driver.formatos,
    cambiarFormato,
    driver,
  };
}
