import toast from 'react-hot-toast';
import { PROTOCOLOS } from '../../utils/printers';

/**
 * Panel reusable de conexión + impresión Bluetooth térmica multi-protocolo.
 *
 * Estructura:
 *   - Selector de protocolo (visible al conectar; muestra badge "Auto" si el
 *     valor activo coincide con la auto-detección).
 *   - Selector de formato (filtrado al protocolo activo vía `formatosDisponibles`).
 *   - Botones de conectar / imprimir / desconectar / prueba.
 *
 * @param {Object} props
 * @param {Object} props.bluetooth   retorno de useBluetoothPrinter()
 * @param {Object} props.formatoSeleccionado    de useFormatoImpresion(bluetooth.protocolo)
 * @param {Array}  props.formatosDisponibles    de useFormatoImpresion(bluetooth.protocolo)
 * @param {Function} props.onCambiarFormato     de useFormatoImpresion(bluetooth.protocolo)
 * @param {Function} props.onImprimir           async () => boolean
 * @param {string}   [props.imprimirLabel]
 * @param {boolean}  [props.imprimirDisabled]
 */
export default function BluetoothPrinterPanel({
  bluetooth,
  formatoSeleccionado,
  formatosDisponibles,
  onCambiarFormato,
  onImprimir,
  imprimirLabel = 'Imprimir por Bluetooth',
  imprimirDisabled = false,
}) {
  const lanzarImprimir = async () => {
    try {
      const ok = await onImprimir?.();
      if (ok === true) {
        toast.success('Enviado — verifique impresión');
      } else if (bluetooth?.error) {
        toast.error(bluetooth.error);
      }
    } catch (err) {
      toast.error('Error al imprimir: ' + (err?.message || ''));
    }
  };

  const lanzarPrueba = async () => {
    const ok = await bluetooth?.imprimirPrueba?.();
    if (ok) toast.success('Prueba enviada — verifique impresión');
    else if (bluetooth?.error) toast.error(bluetooth.error);
  };

  const protocoloEsAutoDetectado =
    bluetooth?.conectado && bluetooth?.protocolo === bluetooth?.protocoloAutoDetectado;

  return (
    <div className="space-y-2">
      {/* Selector de protocolo (sólo visible cuando hay conexión) */}
      {bluetooth?.conectado && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-steel-400 shrink-0">Protocolo:</span>
          <select
            className="input-field text-xs py-1 flex-1 min-w-0"
            value={bluetooth.protocolo}
            onChange={(e) => bluetooth.cambiarProtocolo(e.target.value)}
          >
            {PROTOCOLOS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          {protocoloEsAutoDetectado && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 shrink-0"
              title="Detectado automáticamente por el nombre del dispositivo"
            >
              Auto
            </span>
          )}
        </div>
      )}

      {/* Selector de formato */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-steel-400 shrink-0">Formato:</span>
        <select
          className="input-field text-xs py-1 flex-1 min-w-0"
          value={formatoSeleccionado.id}
          onChange={(e) => onCambiarFormato(e.target.value)}
        >
          {formatosDisponibles.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
      </div>

      {bluetooth?.bluetoothDisponible ? (
        <div className="space-y-2">
          {!bluetooth.conectado ? (
            <div className="flex items-center gap-2">
              <button
                onClick={bluetooth.conectar}
                disabled={bluetooth.conectando}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {bluetooth.conectando ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Buscando...</>
                ) : (
                  <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.71 7.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 5.83l1.88 1.88L13 9.59V5.83zm1.88 10.46L13 18.17v-3.76l1.88 1.88z"/></svg> Conectar impresora</>
                )}
              </button>
              <button
                onClick={bluetooth.conectarTodos}
                disabled={bluetooth.conectando}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium border border-blue-300 text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-colors"
                title="Buscar todos los dispositivos BLE"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                Todos
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={lanzarImprimir}
                  disabled={bluetooth.imprimiendo || imprimirDisabled}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {bluetooth.imprimiendo ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Imprimiendo...</>
                  ) : (
                    <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.71 7.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 5.83l1.88 1.88L13 9.59V5.83zm1.88 10.46L13 18.17v-3.76l1.88 1.88z"/></svg> {imprimirLabel}</>
                  )}
                </button>
                <button
                  onClick={bluetooth.desconectar}
                  className="px-3 py-2.5 rounded-lg text-xs text-red-500 hover:bg-red-50 border border-red-200 transition-colors"
                  title={`Desconectar ${bluetooth.nombreDispositivo}`}
                >
                  {bluetooth.nombreDispositivo || 'Desconectar'}
                </button>
              </div>
              <button
                onClick={lanzarPrueba}
                disabled={bluetooth.imprimiendo}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-300 text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-colors"
                title="Envía un ticket corto para validar la conexión"
              >
                Imprimir prueba
              </button>
            </div>
          )}
          {!bluetooth.conectado && (
            <p className="text-[10px] text-steel-400 text-center">
              Si su impresora no aparece, use el botón "Todos" para buscar todos los dispositivos
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-steel-500 text-center bg-steel-900/30 rounded-lg p-2">
          Bluetooth no disponible. Requiere Chrome/Edge en HTTPS con Bluetooth activo.
        </p>
      )}

      {bluetooth?.error && (
        <p className="text-xs text-red-500 text-center">{bluetooth.error}</p>
      )}
    </div>
  );
}
