import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { HiOutlineQrcode, HiOutlineLogin, HiOutlineLogout, HiOutlineRefresh } from 'react-icons/hi';
import api from '../../api/axios';

const SCANNER_ID = 'qr-reader';

export default function EscanerQr() {
  const [escaneando, setEscaneando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [ultimasMarcaciones, setUltimasMarcaciones] = useState([]);
  const scannerRef = useRef(null);
  const procesandoRef = useRef(false);

  useEffect(() => {
    cargarMarcacionesRecientes();
    return () => { detenerScanner(); };
  }, []);

  const cargarMarcacionesRecientes = () => {
    api.get('/asistencia-qr/marcaciones/hoy')
      .then(r => setUltimasMarcaciones(Array.isArray(r.data) ? r.data.slice(0, 10) : []))
      .catch(() => {});
  };

  const iniciarScanner = async () => {
    setError(null);
    setResultado(null);

    try {
      const scanner = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, disableFlip: false },
        onScanExitoso,
        () => {} // ignorar errores de escaneo continuo
      );
      setEscaneando(true);
    } catch (err) {
      const msg = err?.message || String(err);
      if (msg.includes('NotFound') || msg.includes('Requested device not found')) {
        setError('No se detecto ninguna camara en este dispositivo. Conecta una camara o usa un dispositivo con camara integrada.');
      } else if (msg.includes('NotAllowed') || msg.includes('Permission')) {
        setError('Permiso de camara denegado. Habilita el acceso a la camara en la configuracion del navegador.');
      } else {
        setError('No se pudo acceder a la camara. Verifica los permisos y que el dispositivo tenga camara disponible.');
      }
      scannerRef.current = null;
      console.error('Error al iniciar scanner:', err);
    }
  };

  const detenerScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        // ignorar si ya estaba detenido
      }
      try {
        scannerRef.current.clear();
      } catch (e) {
        // ignorar
      }
      scannerRef.current = null;
    }
    const el = document.getElementById(SCANNER_ID);
    if (el) el.innerHTML = '';
    setEscaneando(false);
  };

  const onScanExitoso = async (codigoQr) => {
    if (procesandoRef.current) return;
    procesandoRef.current = true;

    try {
      await detenerScanner();
      const { data } = await api.post('/asistencia-qr/escanear', { codigo_qr: codigoQr });
      setResultado(data);
      setError(null);
      cargarMarcacionesRecientes();
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al registrar marcación';
      setError(msg);
      setResultado(null);
    } finally {
      procesandoRef.current = false;
    }
  };

  const escanearOtro = () => {
    setResultado(null);
    setError(null);
    iniciarScanner();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-steel-100 font-display tracking-wider mb-6">
        Escáner QR - Asistencia
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner */}
        <div className="card">
          <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
            <h2 className="text-lg font-semibold text-steel-100 flex items-center gap-2">
              <HiOutlineQrcode className="w-5 h-5 text-primary-600" />
              Cámara
            </h2>
            {escaneando && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 animate-pulse">
                Escaneando...
              </span>
            )}
          </div>

          <div className="relative w-full rounded-lg overflow-hidden bg-steel-900 border border-steel-700" style={{ minHeight: '300px' }}>
            <div id={SCANNER_ID} className="w-full h-full" />
            {!escaneando && !resultado && !error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-steel-500 text-sm">Presiona &quot;Iniciar&quot; para activar la camara</p>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-3">
            {!escaneando && !resultado && (
              <button onClick={iniciarScanner} className="btn-primary flex items-center gap-2">
                <HiOutlineQrcode className="w-4 h-4" />
                Iniciar Escáner
              </button>
            )}
            {escaneando && (
              <button onClick={detenerScanner} className="btn-secondary">
                Detener
              </button>
            )}
            {resultado && (
              <button onClick={escanearOtro} className="btn-primary flex items-center gap-2">
                <HiOutlineRefresh className="w-4 h-4" />
                Escanear Otro
              </button>
            )}
          </div>

          {/* Resultado exitoso */}
          {resultado && (
            <div className={`mt-4 p-4 rounded-lg border ${
              resultado.tipo === 'ingreso'
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-amber-500/10 border-amber-500/30'
            }`}>
              <div className="flex items-center gap-3 mb-2">
                {resultado.tipo === 'ingreso' ? (
                  <HiOutlineLogin className="w-8 h-8 text-emerald-600" />
                ) : (
                  <HiOutlineLogout className="w-8 h-8 text-amber-600" />
                )}
                <div>
                  <p className={`text-lg font-bold ${
                    resultado.tipo === 'ingreso' ? 'text-emerald-600' : 'text-amber-600'
                  }`}>
                    {resultado.tipo === 'ingreso' ? 'INGRESO' : 'SALIDA'}
                  </p>
                  <p className="text-steel-200 text-sm">{resultado.mensaje}</p>
                </div>
              </div>
              <div className="text-sm text-steel-300 space-y-1 mt-3 border-t border-steel-700 pt-3">
                <p><span className="text-steel-500">Empleado:</span> {resultado.empleado.nombres}</p>
                <p><span className="text-steel-500">Cargo:</span> {resultado.empleado.rol_laboral}</p>
                <p><span className="text-steel-500">Hora:</span> {new Date(resultado.marcacion.fecha_hora).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-4 rounded-lg border bg-red-500/10 border-red-500/30">
              <p className="text-red-600 font-medium">{error}</p>
              <button onClick={escanearOtro} className="mt-2 text-sm text-red-600 hover:text-red-700 underline">
                Intentar de nuevo
              </button>
            </div>
          )}
        </div>

        {/* Últimas marcaciones */}
        <div className="card">
          <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
            <h2 className="text-lg font-semibold text-steel-100">Últimas Marcaciones</h2>
            <button onClick={cargarMarcacionesRecientes} className="text-steel-400 hover:text-steel-200 transition-colors">
              <HiOutlineRefresh className="w-5 h-5" />
            </button>
          </div>

          {ultimasMarcaciones.length === 0 ? (
            <p className="text-steel-500 text-sm py-8 text-center">No hay marcaciones hoy</p>
          ) : (
            <div className="space-y-2">
              {ultimasMarcaciones.map(m => (
                <div key={m.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-steel-800/30 border border-steel-700/50">
                  <div className="flex items-center gap-3">
                    {m.tipo === 'ingreso' ? (
                      <HiOutlineLogin className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <HiOutlineLogout className="w-5 h-5 text-amber-600" />
                    )}
                    <div>
                      <p className="text-sm text-steel-200 font-medium">
                        {m.tbl_empleados?.tbl_usuarios?.nombres || '-'}
                      </p>
                      <p className="text-xs text-steel-500 uppercase">{m.tipo}</p>
                    </div>
                  </div>
                  <span className="text-xs text-steel-400">
                    {new Date(m.fecha_hora).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
