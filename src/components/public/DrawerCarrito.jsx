import { useState, useCallback } from 'react';
import { HiOutlineX, HiOutlineTrash, HiOutlinePlus, HiOutlineMinus, HiOutlineShoppingCart } from 'react-icons/hi';
import { buildMediaUrl } from '../../utils/media';
import { formatearMoneda } from '../../utils/formato';
import { TELEFONO_INPUT } from '../../config/constants';
import { construirUrlWhatsappEmpresa } from '../../utils/whatsapp';

export default function DrawerCarrito({ visible, onClose, carrito, onAgregarItem, onEliminarItem, onFinalizar }) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const items = carrito?.items || [];

  const calcularTotal = useCallback(() => {
    return items.reduce(
      (sum, item) => sum + item.cantidad * parseFloat(item.precio_unitario || 0),
      0
    );
  }, [items]);

  const handleCambiarCantidad = async (productoId, cantidadActual, delta) => {
    const nuevaCantidad = cantidadActual + delta;
    if (nuevaCantidad < 1) return;
    try {
      setError(null);
      await onAgregarItem(productoId, nuevaCantidad);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar cantidad');
    }
  };

  const handleEliminar = async (productoId) => {
    try {
      setError(null);
      await onEliminarItem(productoId);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar producto');
    }
  };

  const handleFinalizar = async () => {
    if (!nombre.trim() || !telefono.trim()) {
      setError('Ingresa tu nombre y telefono');
      return;
    }
    const telDigits = TELEFONO_INPUT.toDigits(telefono);
    if (!TELEFONO_INPUT.esValido(telDigits)) {
      setError(TELEFONO_INPUT.MSG_INVALIDO);
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const data = await onFinalizar(nombre.trim(), telDigits);

      const lineas = data.items.map((item, idx) => {
        const subtotal = item.cantidad * item.precio_unitario;
        return `${idx + 1}. ${item.nombre} x${item.cantidad} - ${formatearMoneda(item.precio_unitario)} = ${formatearMoneda(subtotal)}`;
      });

      const mensaje = [
        `Hola, soy ${data.nombre_cliente} (${TELEFONO_INPUT.format(data.telefono_cliente)}).`,
        '',
        'Quiero cotizar los siguientes productos:',
        '',
        ...lineas,
        '',
        `Total estimado: ${formatearMoneda(data.total)}`,
        '',
        `Cotizacion #${data.cotizacion_id}`,
      ].join('\n');

      window.open(construirUrlWhatsappEmpresa(mensaje), '_blank', 'noopener,noreferrer');

      setNombre('');
      setTelefono('');
      setMostrarFormulario(false);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error al finalizar compra');
    } finally {
      setEnviando(false);
    }
  };

  const handleCancelarFormulario = () => {
    setMostrarFormulario(false);
    setError(null);
  };

  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  if (!visible) return null;

  const total = calcularTotal();

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-md bg-white border-l border-steel-600 shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-steel-700 flex-shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <HiOutlineShoppingCart className="w-5 h-5 text-primary-600" />
            <h2 className="font-display text-xl tracking-wider text-steel-100">MI CARRITO</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-steel-800 border border-steel-600 text-steel-100 hover:bg-steel-700 transition-colors"
          >
            <HiOutlineX className="w-4 h-4" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-5 mt-3 px-3 py-2 bg-primary-600 border border-primary-700 rounded-lg text-white text-sm font-semibold shadow-md">
            {error}
          </div>
        )}

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 bg-white">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <HiOutlineShoppingCart className="w-16 h-16 mb-4 text-steel-400" />
              <p className="text-lg text-steel-200 font-semibold">Tu carrito esta vacio</p>
              <p className="text-sm mt-1 text-steel-300">Agrega productos del catalogo</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const producto = item.producto || {};
                const foto = producto.media?.[0];
                const precioUnit = parseFloat(item.precio_unitario || 0);
                const subtotal = item.cantidad * precioUnit;

                return (
                  <div
                    key={item.id}
                    className="flex gap-3 p-3 bg-white rounded-xl border-2 border-steel-700 shadow-sm"
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-16 flex-shrink-0 rounded-lg bg-steel-800 border border-steel-700 overflow-hidden flex items-center justify-center">
                      {foto ? (
                        <img
                          src={buildMediaUrl(foto.url_archivo)}
                          alt={producto.nombre}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <HiOutlineShoppingCart className="w-6 h-6 text-steel-300" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-steel-100 font-semibold line-clamp-2 leading-tight">
                        {producto.nombre || 'Producto'}
                      </p>
                      <p className="text-xs text-steel-300 mt-0.5 font-medium">
                        {formatearMoneda(precioUnit)} c/u
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        {/* Quantity controls */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCambiarCantidad(item.producto_id, item.cantidad, -1)}
                            disabled={item.cantidad <= 1}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-steel-800 border border-steel-600 text-steel-100 hover:bg-steel-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <HiOutlineMinus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-sm text-steel-100 font-bold">
                            {item.cantidad}
                          </span>
                          <button
                            onClick={() => handleCambiarCantidad(item.producto_id, item.cantidad, 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-steel-800 border border-steel-600 text-steel-100 hover:bg-steel-700 transition-colors"
                          >
                            <HiOutlinePlus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-primary-600">
                            {formatearMoneda(subtotal)}
                          </span>
                          <button
                            onClick={() => handleEliminar(item.producto_id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-primary-600 hover:bg-primary-100 transition-colors"
                            title="Eliminar"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t-2 border-steel-700 px-5 py-4 flex-shrink-0 bg-white">
            {!mostrarFormulario ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-steel-200 font-semibold">Total estimado:</span>
                  <span className="font-display text-2xl text-primary-600">
                    {formatearMoneda(total)}
                  </span>
                </div>
                <button
                  onClick={() => { setMostrarFormulario(true); setError(null); }}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors duration-200 shadow-md"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Finalizar compra por WhatsApp
                </button>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-steel-100 font-semibold">Completa tus datos para continuar:</p>
                <input
                  type="text"
                  placeholder="Tu nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="input-field"
                  autoFocus
                />
                <input
                  type="tel"
                  inputMode={TELEFONO_INPUT.INPUT_MODE}
                  pattern={TELEFONO_INPUT.PATTERN}
                  maxLength={TELEFONO_INPUT.MAX_LENGTH}
                  placeholder={`Tu teléfono (${TELEFONO_INPUT.PLACEHOLDER})`}
                  value={telefono}
                  onChange={(e) => setTelefono(TELEFONO_INPUT.format(e.target.value))}
                  className="input-field"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelarFormulario}
                    className="flex-1 btn-secondary py-2.5"
                    disabled={enviando}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleFinalizar}
                    disabled={enviando || !nombre.trim() || !telefono.trim()}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {enviando ? 'Enviando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
