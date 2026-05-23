import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  BT_KNOWN_SERVICE_UUIDS,
  BT_TX_UUID_HINTS,
  BT_CHUNK_SIZE,
  BT_CHUNK_DELAY_MS,
  BT_POST_CONNECT_DELAY_MS,
  BT_DRAIN_DELAY_MS,
  LS_PROTOCOLO_OVERRIDE_KEY,
  PROTOCOLO_DEFAULT_ID,
} from '../config/constants';
import {
  getDriver,
  detectarProtocoloPorNombre,
  esProtocoloValido,
} from '../utils/printers';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Slug seguro para usar el nombre del dispositivo como sufijo de LS key.
 * Normaliza a `[a-z0-9_-]` y trunca para evitar keys gigantes.
 */
function slugDevice(nombre) {
  return String(nombre || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

function lsKeyOverride(nombre) {
  const slug = slugDevice(nombre);
  return slug ? `${LS_PROTOCOLO_OVERRIDE_KEY}_${slug}` : null;
}

function leerOverride(nombre) {
  const key = lsKeyOverride(nombre);
  if (!key) return null;
  const v = localStorage.getItem(key);
  return esProtocoloValido(v) ? v : null;
}

function guardarOverride(nombre, protocolo) {
  const key = lsKeyOverride(nombre);
  if (!key) return;
  if (protocolo) localStorage.setItem(key, protocolo);
  else localStorage.removeItem(key);
}

/**
 * Hook para gestionar conexión + impresión Bluetooth en impresoras térmicas.
 *
 * Capa de transporte (BLE chunked write) — agnóstica al protocolo.
 * Capa de protocolo — auto-detectada por nombre del device, con override
 * manual persistente por nombre.
 */
export default function useBluetoothPrinter() {
  const [conectado, setConectado] = useState(false);
  const [nombreDispositivo, setNombreDispositivo] = useState('');
  const [conectando, setConectando] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [error, setError] = useState(null);
  const [apiDisponible, setApiDisponible] = useState(false);

  // Capa de protocolo
  const [protocoloId, setProtocoloId] = useState(PROTOCOLO_DEFAULT_ID);
  const [protocoloAutoDetectado, setProtocoloAutoDetectado] = useState(PROTOCOLO_DEFAULT_ID);

  const deviceRef = useRef(null);
  const charRef = useRef(null);

  const driver = useMemo(() => getDriver(protocoloId), [protocoloId]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.bluetooth) {
      setApiDisponible(false);
      return;
    }
    let cancelled = false;
    const verificar = async () => {
      try {
        if (navigator.bluetooth.getAvailability) {
          const disponible = await navigator.bluetooth.getAvailability();
          if (!cancelled) setApiDisponible(disponible);
          navigator.bluetooth.addEventListener('availabilitychanged', (e) => {
            if (!cancelled) setApiDisponible(e.value);
          });
        } else {
          if (!cancelled) setApiDisponible(true);
        }
      } catch {
        if (!cancelled) setApiDisponible(true);
      }
    };
    verificar();
    return () => { cancelled = true; };
  }, []);

  const elegirMejorCaracteristica = (candidatas) => {
    if (candidatas.length === 0) return null;
    const matchesHint = (c, hint) => c.uuid.toLowerCase().includes(hint);

    for (const hint of BT_TX_UUID_HINTS) {
      const c = candidatas.find(
        (x) => x.properties.writeWithoutResponse && matchesHint(x, hint),
      );
      if (c) return c;
    }
    for (const hint of BT_TX_UUID_HINTS) {
      const c = candidatas.find(
        (x) => x.properties.write && matchesHint(x, hint),
      );
      if (c) return c;
    }
    const wwrAny = candidatas.find((c) => c.properties.writeWithoutResponse);
    if (wwrAny) return wwrAny;
    return candidatas.find((c) => c.properties.write) || null;
  };

  const descubrirCaracteristica = async (server) => {
    const candidatas = [];

    for (const uuid of BT_KNOWN_SERVICE_UUIDS) {
      try {
        const service = await server.getPrimaryService(uuid);
        const chars = await service.getCharacteristics();
        for (const c of chars) {
          if (c.properties.writeWithoutResponse || c.properties.write) {
            candidatas.push(c);
          }
        }
      } catch {
        // Servicio ausente — continuar
      }
    }

    if (candidatas.length === 0) {
      try {
        const services = await server.getPrimaryServices();
        for (const service of services) {
          try {
            const chars = await service.getCharacteristics();
            for (const c of chars) {
              if (c.properties.writeWithoutResponse || c.properties.write) {
                candidatas.push(c);
              }
            }
          } catch {
            // Servicio inaccesible — continuar
          }
        }
      } catch {
        // getPrimaryServices falló
      }
    }

    return elegirMejorCaracteristica(candidatas);
  };

  const finalizarConexion = async (device) => {
    device.addEventListener('gattserverdisconnected', () => {
      setConectado(false);
      setNombreDispositivo('');
      charRef.current = null;
    });

    const server = await device.gatt.connect();
    const writeChar = await descubrirCaracteristica(server);

    if (!writeChar) {
      device.gatt.disconnect();
      throw new Error('No se encontró característica de escritura compatible en la impresora.');
    }

    await sleep(BT_POST_CONNECT_DELAY_MS);

    deviceRef.current = device;
    charRef.current = writeChar;
    const nombre = device.name || 'Impresora BT';
    setConectado(true);
    setNombreDispositivo(nombre);

    // Resolver protocolo: override manual previo > auto-detectado
    const auto = detectarProtocoloPorNombre(nombre);
    setProtocoloAutoDetectado(auto);
    const override = leerOverride(nombre);
    setProtocoloId(override || auto);

    setConectando(false);
    return true;
  };

  const manejarErrorConexion = (err) => {
    const mensaje = err?.message || '';
    let msg;
    if (mensaje.includes('cancelled') || mensaje.includes('User cancelled')) {
      msg = 'Selección cancelada';
    } else if (mensaje.includes('globally disabled')) {
      msg = 'Bluetooth deshabilitado en el navegador. Verifique HTTPS y que Bluetooth esté activo.';
    } else if (err?.name === 'SecurityError') {
      msg = 'Bluetooth requiere conexión segura (HTTPS).';
    } else if (err?.name === 'NotFoundError') {
      msg = 'No se encontró ninguna impresora compatible.';
    } else if (err?.name === 'NotSupportedError') {
      msg = 'Operación no soportada por el navegador. Use Chrome o Edge actualizado.';
    } else if (err?.name === 'NetworkError') {
      msg = 'Fallo de red GATT. Apague y encienda la impresora antes de reintentar.';
    } else if (err?.name === 'InvalidStateError') {
      msg = 'Estado inválido del adaptador. Active Bluetooth en el sistema.';
    } else {
      msg = mensaje || 'Error al conectar con la impresora Bluetooth';
    }
    setError(msg);
    setConectando(false);
    return false;
  };

  const conectar = useCallback(async () => {
    if (!navigator.bluetooth) {
      setError('Bluetooth no disponible en este navegador. Use Chrome o Edge en HTTPS.');
      return false;
    }
    setConectando(true);
    setError(null);

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: BT_KNOWN_SERVICE_UUIDS.map((uuid) => ({ services: [uuid] })),
        optionalServices: BT_KNOWN_SERVICE_UUIDS,
      });
      return await finalizarConexion(device);
    } catch (err) {
      return manejarErrorConexion(err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const conectarTodos = useCallback(async () => {
    if (!navigator.bluetooth) {
      setError('Bluetooth no disponible en este navegador. Use Chrome o Edge en HTTPS.');
      return false;
    }
    setConectando(true);
    setError(null);

    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: BT_KNOWN_SERVICE_UUIDS,
      });
      return await finalizarConexion(device);
    } catch (err) {
      return manejarErrorConexion(err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const desconectar = useCallback(() => {
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }
    deviceRef.current = null;
    charRef.current = null;
    setConectado(false);
    setNombreDispositivo('');
  }, []);

  /**
   * Cambia manualmente el protocolo activo y persiste el override por
   * dispositivo. Si nuevo === auto-detectado, limpiamos el override.
   */
  const cambiarProtocolo = useCallback((nuevo) => {
    if (!esProtocoloValido(nuevo)) return;
    setProtocoloId(nuevo);
    if (nombreDispositivo) {
      if (nuevo === protocoloAutoDetectado) {
        guardarOverride(nombreDispositivo, null);
      } else {
        guardarOverride(nombreDispositivo, nuevo);
      }
    }
  }, [nombreDispositivo, protocoloAutoDetectado]);

  const escribirChunk = async (chunk, esUltimo) => {
    const char = charRef.current;
    const conRespuesta = esUltimo || !char.properties.writeWithoutResponse;
    if (conRespuesta) {
      await char.writeValue(chunk);
    } else {
      await char.writeValueWithoutResponse(chunk);
    }
  };

  const enviarDatos = useCallback(async (data) => {
    if (!charRef.current) {
      setError('Impresora no conectada');
      return false;
    }
    setImprimiendo(true);
    setError(null);

    const total = data.length;
    try {
      for (let offset = 0; offset < total; offset += BT_CHUNK_SIZE) {
        const chunk = data.slice(offset, offset + BT_CHUNK_SIZE);
        const esUltimo = offset + BT_CHUNK_SIZE >= total;
        await escribirChunk(chunk, esUltimo);
        if (!esUltimo) await sleep(BT_CHUNK_DELAY_MS);
      }
      await sleep(BT_DRAIN_DELAY_MS);
      setImprimiendo(false);
      return true;
    } catch (err) {
      setError(err?.message || 'Error al imprimir');
      setImprimiendo(false);
      return false;
    }
  }, []);

  /**
   * Envía un payload de prueba en el protocolo activo.
   */
  const imprimirPrueba = useCallback(async () => {
    if (!charRef.current) {
      setError('Impresora no conectada');
      return false;
    }
    return enviarDatos(driver.generarPrueba());
  }, [enviarDatos, driver]);

  return {
    bluetoothDisponible: apiDisponible,
    conectado,
    nombreDispositivo,
    conectando,
    imprimiendo,
    error,
    conectar,
    conectarTodos,
    desconectar,
    enviarDatos,
    imprimirPrueba,
    limpiarError: () => setError(null),
    // Capa de protocolo
    protocolo: protocoloId,
    protocoloAutoDetectado,
    cambiarProtocolo,
    driver,
  };
}
