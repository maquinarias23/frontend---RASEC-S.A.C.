import { useState, useRef, useEffect, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  HiOutlineQrcode,
  HiOutlinePencilAlt,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineExclamation,
  HiOutlineShoppingBag,
  HiOutlineTruck,
  HiOutlineSearch,
  HiOutlineX,
  HiOutlineRefresh,
  HiOutlineOfficeBuilding,
} from 'react-icons/hi';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import EstadoBadge from '../../components/ui/EstadoBadge';
import { ESTADO_TRACKING, TIPO_ENTREGA } from '../../config/constants';

const MODO = { CAMARA: 'camara', MANUAL: 'manual' };
const SCANNER_CONTAINER_ID = 'escaner-salida-reader';

export default function EscanerSalida() {
  const [modo, setModo] = useState(MODO.CAMARA);
  const [escaneando, setEscaneando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [ultimoResultado, setUltimoResultado] = useState(null);
  const [error, setError] = useState(null);
  const [alertaRetiro, setAlertaRetiro] = useState(null);
  const [historial, setHistorial] = useState([]);

  // Manual mode
  const [busqueda, setBusqueda] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const debounceRef = useRef(null);

  // Scanner
  const scannerRef = useRef(null);
  const scannerContainerRef = useRef(null);
  const procesandoRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => { detenerScanner(); };
  }, []);

  // ===== SCANNER =====

  const limpiarScannerDOM = () => {
    const el = scannerContainerRef.current;
    if (el) el.innerHTML = '';
  };

  const iniciarScanner = async () => {
    setError(null);
    setUltimoResultado(null);

    try {
      const camaras = await Html5Qrcode.getCameras();
      if (!camaras || camaras.length === 0) {
        setError('No se detectó ninguna cámara en este dispositivo.');
        return;
      }

      limpiarScannerDOM();
      const wrapperId = SCANNER_CONTAINER_ID + '-inner';
      const innerDiv = document.createElement('div');
      innerDiv.id = wrapperId;
      scannerContainerRef.current.appendChild(innerDiv);

      const scanner = new Html5Qrcode(wrapperId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 300, height: 150 }, disableFlip: false },
        onCodigoDetectado,
        () => {}
      );
      setEscaneando(true);
    } catch (err) {
      limpiarScannerDOM();
      const msg = err?.message?.includes('NotFound') || err?.name === 'NotFoundError'
        ? 'No se detectó ninguna cámara en este dispositivo.'
        : 'No se pudo acceder a la cámara. Verifica los permisos.';
      setError(msg);
    }
  };

  const detenerScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // ignorar si ya estaba detenido
      }
      scannerRef.current = null;
    }
    limpiarScannerDOM();
    setEscaneando(false);
  };

  // ===== PROCESO CENTRAL: enviar a chofer =====

  const despacharPorCodigo = useCallback(async (codigoRotulo) => {
    if (procesandoRef.current) return;
    procesandoRef.current = true;
    setProcesando(true);
    setError(null);

    try {
      const { data } = await api.post('/almacen/enviar-a-chofer', { codigo_rotulo: codigoRotulo });

      const registro = {
        codigo: codigoRotulo,
        ventaId: data.venta?.id,
        cliente: data.venta?.cliente || '-',
        productos: data.venta?.items || [],
        almacenes: data.venta?.almacenes_origen || [],
        mensaje: data.mensaje,
        hora: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };

      setUltimoResultado(registro);
      setHistorial((prev) => [registro, ...prev]);
      toast.success(data.mensaje);
    } catch (err) {
      const respData = err.response?.data;
      if (respData?.tipo === TIPO_ENTREGA.RETIRO_EN_TIENDA) {
        setAlertaRetiro({
          mensaje: respData.error,
          ventaId: respData.venta?.id,
          cliente: respData.venta?.cliente,
        });
        setError(null);
      } else {
        const msg = respData?.error || 'Error al procesar el código escaneado';
        setError(msg);
        setAlertaRetiro(null);
      }
      setUltimoResultado(null);
    } finally {
      procesandoRef.current = false;
      setProcesando(false);
    }
  }, []);

  const onCodigoDetectado = useCallback(async (codigo) => {
    await detenerScanner();
    await despacharPorCodigo(codigo);
  }, [despacharPorCodigo]);

  const escanearOtro = () => {
    setUltimoResultado(null);
    setError(null);
    setAlertaRetiro(null);
    if (modo === MODO.CAMARA) {
      iniciarScanner();
    } else {
      setBusqueda('');
      setSugerencias([]);
    }
  };

  // ===== MODO MANUAL: búsqueda con autocompletado =====

  const buscarRotulos = useCallback(async (query) => {
    if (query.length < 2) {
      setSugerencias([]);
      return;
    }
    setBuscando(true);
    try {
      const { data } = await api.get('/almacen/buscar-rotulo', { params: { q: query } });
      setSugerencias(data);
    } catch {
      setSugerencias([]);
    } finally {
      setBuscando(false);
    }
  }, []);

  const onBusquedaChange = (e) => {
    const val = e.target.value;
    setBusqueda(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscarRotulos(val), 300);
  };

  const seleccionarSugerencia = (sugerencia) => {
    setBusqueda(sugerencia.codigo_rotulo);
    setSugerencias([]);
    despacharPorCodigo(sugerencia.codigo_rotulo);
  };

  const enviarManual = (e) => {
    e.preventDefault();
    if (!busqueda.trim()) return;
    setSugerencias([]);
    despacharPorCodigo(busqueda.trim());
  };

  // Cambiar modo
  const cambiarModo = (nuevoModo) => {
    if (nuevoModo === modo) return;
    detenerScanner();
    setModo(nuevoModo);
    setError(null);
    setAlertaRetiro(null);
    setUltimoResultado(null);
    setBusqueda('');
    setSugerencias([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display tracking-wider text-steel-100">Escáner de Salida</h1>
        <p className="text-sm text-steel-400 mt-1">Escanea o ingresa el código del rótulo para despachar pedidos</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel principal: escáner */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs: Cámara / Manual */}
          <div className="flex gap-2">
            <button
              onClick={() => cambiarModo(MODO.CAMARA)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                modo === MODO.CAMARA
                  ? 'bg-primary-500 text-white shadow-forge'
                  : 'bg-steel-800/80 text-steel-300 hover:bg-steel-700/80'
              }`}
            >
              <HiOutlineQrcode className="w-5 h-5" />
              Cámara
            </button>
            <button
              onClick={() => cambiarModo(MODO.MANUAL)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                modo === MODO.MANUAL
                  ? 'bg-primary-500 text-white shadow-forge'
                  : 'bg-steel-800/80 text-steel-300 hover:bg-steel-700/80'
              }`}
            >
              <HiOutlinePencilAlt className="w-5 h-5" />
              Manual
            </button>
          </div>

          {/* Zona de escaneo */}
          <div className="card p-6">
            {modo === MODO.CAMARA && (
              <div className="space-y-4">
                {!escaneando && !ultimoResultado && !error && (
                  <div className="text-center py-8">
                    <HiOutlineQrcode className="w-16 h-16 text-steel-500 mx-auto mb-4" />
                    <p className="text-steel-300 mb-4">Apunta la cámara al código de barras del rótulo</p>
                    <button onClick={iniciarScanner} className="btn-primary px-6 py-2.5">
                      Iniciar Escáner
                    </button>
                  </div>
                )}

                <div
                  ref={scannerContainerRef}
                  id={SCANNER_CONTAINER_ID}
                  className={`rounded-lg overflow-hidden ${escaneando ? 'border-2 border-primary-500/50' : ''}`}
                />

                {escaneando && (
                  <div className="flex justify-center">
                    <button onClick={detenerScanner} className="btn-secondary px-4 py-2 text-sm">
                      Detener Escáner
                    </button>
                  </div>
                )}
              </div>
            )}

            {modo === MODO.MANUAL && (
              <div className="space-y-4">
                <form onSubmit={enviarManual} className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-steel-400" />
                      <input
                        type="text"
                        value={busqueda}
                        onChange={onBusquedaChange}
                        placeholder="Escribe el código del rótulo (ej: RSK-14-...)"
                        className="input pl-10 w-full"
                        autoFocus
                      />
                      {busqueda && (
                        <button
                          type="button"
                          onClick={() => { setBusqueda(''); setSugerencias([]); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-400 hover:text-steel-200"
                        >
                          <HiOutlineX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <button type="submit" disabled={!busqueda.trim() || procesando} className="btn-primary px-5">
                      {procesando ? 'Enviando...' : 'Enviar'}
                    </button>
                  </div>

                  {/* Sugerencias dropdown */}
                  {sugerencias.length > 0 && !ultimoResultado && !procesando && (
                    <div className="absolute z-10 mt-1 w-full bg-steel-800 border border-steel-600 rounded-lg shadow-xl overflow-hidden">
                      {sugerencias.map((s) => (
                        <button
                          key={s.codigo_rotulo}
                          type="button"
                          onClick={() => seleccionarSugerencia(s)}
                          className="w-full text-left px-4 py-3 hover:bg-steel-700/80 transition-colors border-b border-steel-700/50 last:border-0"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-primary-500 text-sm">{s.codigo_rotulo}</span>
                            <span className="text-xs text-steel-400">Venta #{s.venta_id}</span>
                          </div>
                          <div className="text-xs text-steel-300 mt-0.5">
                            {s.cliente} — {s.productos.join(', ')}
                          </div>
                          {s.direccion !== '-' && (
                            <div className="text-xs text-steel-500 mt-0.5">{s.direccion}{s.distrito ? `, ${s.distrito}` : ''}</div>
                          )}
                          {s.almacenes_origen?.length > 0 && (
                            <div className="text-xs text-blue-400 mt-0.5 flex items-center gap-0.5">
                              <HiOutlineOfficeBuilding className="w-3 h-3" /> {s.almacenes_origen.join(', ')}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {buscando && busqueda.length >= 2 && !ultimoResultado && (
                    <div className="absolute z-10 mt-1 w-full bg-steel-800 border border-steel-600 rounded-lg p-3 text-center">
                      <p className="text-steel-400 text-sm">Buscando...</p>
                    </div>
                  )}

                  {!buscando && busqueda.length >= 2 && sugerencias.length === 0 && !ultimoResultado && !procesando && !error && (
                    <div className="absolute z-10 mt-1 w-full bg-steel-800 border border-steel-600 rounded-lg p-3 text-center">
                      <p className="text-steel-400 text-sm">No se encontraron rótulos pendientes</p>
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* Procesando */}
            {procesando && (
              <div className="text-center py-6">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-steel-300 text-sm">Procesando despacho...</p>
              </div>
            )}

            {/* Resultado exitoso */}
            {ultimoResultado && !procesando && (
              <div className="mt-4 p-4 rounded-lg border bg-emerald-500/10 border-emerald-500/30 animate-fade-in">
                <div className="flex items-center gap-3 mb-3">
                  <HiOutlineCheckCircle className="w-8 h-8 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="text-lg font-bold text-emerald-600">Despachado Correctamente</p>
                    <p className="text-steel-300 text-sm">{ultimoResultado.mensaje}</p>
                  </div>
                </div>
                <div className="text-sm text-steel-300 space-y-1 border-t border-steel-700 pt-3">
                  <p><span className="text-steel-500">Código:</span> <span className="font-mono text-primary-500">{ultimoResultado.codigo}</span></p>
                  <p><span className="text-steel-500">Venta:</span> #{ultimoResultado.ventaId}</p>
                  <p><span className="text-steel-500">Cliente:</span> {ultimoResultado.cliente}</p>
                  {ultimoResultado.productos.length > 0 && (
                    <p><span className="text-steel-500">Productos:</span> {ultimoResultado.productos.join(', ')}</p>
                  )}
                  {ultimoResultado.almacenes.length > 0 && (
                    <p className="flex items-center gap-1">
                      <HiOutlineOfficeBuilding className="w-3.5 h-3.5 text-steel-500" />
                      <span className="text-steel-500">Sale de:</span>{' '}
                      <span className="font-medium">{ultimoResultado.almacenes.join(', ')}</span>
                    </p>
                  )}
                </div>
                <button onClick={escanearOtro} className="btn-primary w-full mt-4">
                  <HiOutlineRefresh className="w-4 h-4 mr-2 inline" />
                  Escanear Otro
                </button>
              </div>
            )}

            {/* Alerta: pedido de retiro en tienda */}
            {alertaRetiro && !procesando && (
              <div className="mt-4 p-5 rounded-lg border-2 bg-amber-500/10 border-amber-500/40 animate-fade-in">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-amber-500/20 rounded-full flex-shrink-0">
                    <HiOutlineExclamation className="w-7 h-7 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-amber-600">Recojo en Tienda</p>
                    <p className="text-steel-300 text-sm mt-1">
                      Este pedido <strong>no se envía por agencia</strong>. El cliente lo recoge directamente en tienda.
                    </p>
                  </div>
                </div>
                <div className="text-sm text-steel-300 space-y-1 border-t border-amber-500/20 pt-3 ml-14">
                  <p><span className="text-steel-500">Venta:</span> <span className="font-bold">#{alertaRetiro.ventaId}</span></p>
                  <p><span className="text-steel-500">Cliente:</span> <span className="font-bold">{alertaRetiro.cliente}</span></p>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-steel-700/50">
                    <HiOutlineShoppingBag className="w-4 h-4 text-amber-600" />
                    <span className="text-amber-400 text-xs font-medium">La entrega se gestiona desde la Bandeja de Despacho</span>
                  </div>
                </div>
                <button onClick={escanearOtro} className="btn-primary w-full mt-4">
                  <HiOutlineRefresh className="w-4 h-4 mr-2 inline" />
                  Escanear Otro
                </button>
              </div>
            )}

            {/* Error */}
            {error && !procesando && (
              <div className="mt-4 p-4 rounded-lg border bg-red-500/10 border-red-500/30 animate-fade-in">
                <div className="flex items-center gap-3">
                  <HiOutlineExclamationCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  <p className="text-red-600 font-medium">{error}</p>
                </div>
                <button onClick={escanearOtro} className="mt-3 text-sm text-red-600 hover:text-red-300 underline">
                  Intentar de nuevo
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Panel lateral: historial de sesión */}
        <div className="lg:col-span-1">
          <div className="card p-4">
            <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
              <h2 className="text-sm font-semibold text-steel-200 uppercase tracking-wider">Historial de Sesión</h2>
              <span className="text-xs text-steel-500">{historial.length} despachados</span>
            </div>

            {historial.length === 0 ? (
              <div className="text-center py-8">
                <HiOutlineTruck className="w-10 h-10 text-steel-600 mx-auto mb-2" />
                <p className="text-steel-500 text-sm">Aún no se han despachado pedidos</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
                {historial.map((item, idx) => (
                  <div key={`${item.codigo}-${idx}`} className="p-3 rounded-lg bg-steel-900/50 border border-steel-700/50">
                    <div className="flex flex-col gap-3 mb-1 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                      <span className="font-mono text-xs font-bold text-primary-500">{item.codigo}</span>
                      <span className="text-[10px] text-steel-500">{item.hora}</span>
                    </div>
                    <div className="text-xs text-steel-300">
                      <span className="text-steel-500">#{item.ventaId}</span> — {item.cliente}
                    </div>
                    {item.productos.length > 0 && (
                      <p className="text-[10px] text-steel-500 mt-0.5 truncate">{item.productos.join(', ')}</p>
                    )}
                    {item.almacenes?.length > 0 && (
                      <p className="text-[10px] text-blue-400 mt-0.5 flex items-center gap-0.5">
                        <HiOutlineOfficeBuilding className="w-3 h-3" /> {item.almacenes.join(', ')}
                      </p>
                    )}
                    <div className="mt-1.5">
                      <EstadoBadge estado={ESTADO_TRACKING.EN_RUTA_A_AGENCIA} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
