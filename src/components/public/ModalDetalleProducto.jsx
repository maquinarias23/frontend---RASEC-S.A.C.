import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { HiOutlineX, HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineShoppingCart, HiOutlineCube } from 'react-icons/hi';
import api from '../../api/axios';
import { buildMediaUrl } from '../../utils/media';
import { formatearMoneda } from '../../utils/formato';
import { TIPO_MEDIA, DETALLE_PRODUCTO } from '../../config/constants';

// Fisher-Yates shuffle (no muta el array original)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '';

// Carrusel circular de productos relacionados (barajados al azar)
function RelacionadosCarrusel({ relacionados, onVerProducto }) {
  const scrollRef = useRef(null);
  const shuffled = useMemo(() => shuffle(relacionados || []), [relacionados]);

  if (!shuffled.length) return null;

  const scrollBy = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 176; // w-40 + gap
    const maxScroll = el.scrollWidth - el.clientWidth;

    if (dir === 'right' && el.scrollLeft >= maxScroll - 2) {
      el.scrollTo({ left: 0, behavior: 'smooth' });
    } else if (dir === 'left' && el.scrollLeft <= 2) {
      el.scrollTo({ left: maxScroll, behavior: 'smooth' });
    } else {
      el.scrollBy({ left: dir === 'left' ? -cardWidth : cardWidth, behavior: 'smooth' });
    }
  };

  return (
    <div className="border-t border-steel-700/60 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-xl tracking-wider text-steel-100">
          {DETALLE_PRODUCTO.tituloRelacionados}
        </h3>
        {shuffled.length > 3 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollBy('left')}
              className="w-8 h-8 rounded-full bg-steel-800 border border-steel-700 flex items-center justify-center text-steel-300 hover:text-steel-100 hover:bg-steel-700 transition-colors"
            >
              <HiOutlineChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollBy('right')}
              className="w-8 h-8 rounded-full bg-steel-800 border border-steel-700 flex items-center justify-center text-steel-300 hover:text-steel-100 hover:bg-steel-700 transition-colors"
            >
              <HiOutlineChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {shuffled.map((r) => {
          const rPrecio = r.precio_catalogo || r.precio_venta_base || 0;
          const rFoto = r.media?.[0];
          return (
            <button
              key={r.id}
              onClick={() => onVerProducto(r.id)}
              className="flex-shrink-0 w-40 bg-steel-900 rounded-xl border border-steel-700/60 overflow-hidden hover:border-primary-500/30 transition-all duration-200 text-left group"
            >
              <div className="aspect-square bg-steel-800 flex items-center justify-center overflow-hidden">
                {rFoto ? (
                  <img
                    src={buildMediaUrl(rFoto.url_archivo)}
                    alt={r.nombre}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <HiOutlineCube className="w-10 h-10 text-steel-600" />
                )}
              </div>
              <div className="p-3">
                {r.tbl_categorias_producto?.nombre && (
                  <span className="text-[9px] uppercase tracking-wider text-primary-600 font-medium block mb-0.5">
                    {r.tbl_categorias_producto.nombre}
                  </span>
                )}
                <p className="text-xs text-steel-200 line-clamp-2 leading-tight mb-1">
                  {r.nombre}
                </p>
                <p className="font-display text-sm text-primary-600">
                  {formatearMoneda(rPrecio)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ModalDetalleProducto({ productoId, onClose, onAgregarCarrito, onVerProducto }) {
  const [producto, setProducto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [agregando, setAgregando] = useState(false);
  const [agregado, setAgregado] = useState(false);

  useEffect(() => {
    if (!productoId) return;
    setCargando(true);
    setError(null);
    setMediaIndex(0);
    setAgregado(false);

    api.get(`/productos/catalogo-web/${productoId}`)
      .then(({ data }) => setProducto(data))
      .catch(() => setError('No se pudo cargar el producto'))
      .finally(() => setCargando(false));
  }, [productoId]);

  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  const mediaItems = producto?.media || [];
  const currentMedia = mediaItems[mediaIndex] || null;

  const prevMedia = () => {
    setMediaIndex((prev) => (prev > 0 ? prev - 1 : mediaItems.length - 1));
  };

  const nextMedia = () => {
    setMediaIndex((prev) => (prev < mediaItems.length - 1 ? prev + 1 : 0));
  };

  const handleAgregar = async () => {
    if (agregando || agregado) return;
    setAgregando(true);
    try {
      await onAgregarCarrito(producto.id, 1);
      setAgregado(true);
      setTimeout(() => setAgregado(false), 2000);
    } catch {
      // Error handled by parent
    } finally {
      setAgregando(false);
    }
  };

  const stockDisponible = producto?._count?.unidades || 0;
  const precio = producto?.precio_catalogo || producto?.precio_venta_base || 0;

  const whatsappUrl = producto
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
        `Hola, me interesa el producto: ${producto.nombre} (${formatearMoneda(precio)})`
      )}`
    : '#';

  if (!productoId) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-steel-50/60 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-steel-950 rounded-2xl border border-steel-700/60 shadow-steel animate-scale-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-steel-800 border border-steel-700 text-steel-300 hover:text-steel-100 hover:bg-steel-700 transition-colors"
        >
          <HiOutlineX className="w-5 h-5" />
        </button>

        {cargando ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-3 border-steel-700 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 text-steel-400">
            <HiOutlineCube className="w-16 h-16 mb-4 text-steel-600" />
            <p>{error}</p>
          </div>
        ) : producto ? (
          <>
            {/* Product content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              {/* Gallery */}
              <div className="relative bg-steel-900 flex flex-col items-center justify-center p-6 min-h-[320px]">
                {/* Main media */}
                <div className="relative w-full aspect-square flex items-center justify-center overflow-hidden rounded-xl">
                  {currentMedia ? (
                    currentMedia.tipo === TIPO_MEDIA.VIDEO ? (
                      <video
                        src={buildMediaUrl(currentMedia.url_archivo)}
                        controls
                        className="w-full h-full object-contain rounded-xl"
                      />
                    ) : (
                      <img
                        src={buildMediaUrl(currentMedia.url_archivo)}
                        alt={producto.nombre}
                        className="w-full h-full object-contain rounded-xl"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )
                  ) : (
                    <HiOutlineCube className="w-24 h-24 text-steel-600" />
                  )}

                  {/* Arrows */}
                  {mediaItems.length > 1 && (
                    <>
                      <button
                        onClick={prevMedia}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-steel-50/80 text-steel-400 hover:text-steel-100 hover:bg-steel-50 transition-colors"
                      >
                        <HiOutlineChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={nextMedia}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-steel-50/80 text-steel-400 hover:text-steel-100 hover:bg-steel-50 transition-colors"
                      >
                        <HiOutlineChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnails */}
                {mediaItems.length > 1 && (
                  <div className="flex gap-2 mt-4 overflow-x-auto max-w-full pb-1">
                    {mediaItems.map((m, i) => (
                      <button
                        key={m.id || i}
                        onClick={() => setMediaIndex(i)}
                        className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                          i === mediaIndex
                            ? 'border-primary-500'
                            : 'border-steel-700 hover:border-steel-500'
                        }`}
                      >
                        {m.tipo === TIPO_MEDIA.VIDEO ? (
                          <div className="w-full h-full bg-steel-800 flex items-center justify-center text-steel-400 text-xs">
                            Video
                          </div>
                        ) : (
                          <img
                            src={buildMediaUrl(m.url_archivo)}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-6 md:p-8 flex flex-col">
                {producto.tbl_categorias_producto?.nombre && (
                  <span className="inline-block text-[10px] uppercase tracking-wider text-primary-600 font-medium bg-primary-500/10 border border-primary-500/20 px-2.5 py-0.5 rounded-full w-fit mb-3">
                    {producto.tbl_categorias_producto.nombre}
                  </span>
                )}

                <h2 className="font-display text-3xl sm:text-4xl tracking-wider text-steel-100 mb-3">
                  {producto.nombre}
                </h2>

                {producto.descripcion && (
                  <p className="text-sm text-steel-400 leading-relaxed mb-4 whitespace-pre-line">
                    {producto.descripcion}
                  </p>
                )}

                {/* Secciones descriptivas */}
                {producto.secciones && producto.secciones.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {producto.secciones.map((sec) => (
                      <div key={sec.id}>
                        <h4 className="text-xs uppercase tracking-wider text-primary-500 font-bold mb-1.5">
                          {sec.nombre}
                        </h4>
                        <div className="bg-steel-900/50 rounded-lg border border-steel-700/40 overflow-hidden">
                          {sec.campos.map((campo, ci) => (
                            <div
                              key={campo.id || ci}
                              className={`flex items-center justify-between px-3 py-1.5 text-xs ${
                                ci % 2 === 0 ? 'bg-steel-800/30' : ''
                              }`}
                            >
                              <span className="text-steel-400 font-medium">{campo.clave}</span>
                              <span className="text-steel-200">{campo.valor}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 mb-4">
                  <span className="font-display text-3xl text-primary-600">
                    {formatearMoneda(precio)}
                  </span>
                  <span className="text-xs text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                    Stock: {stockDisponible}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-auto pt-4">
                  <button
                    onClick={handleAgregar}
                    disabled={agregando || stockDisponible === 0}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                      agregado
                        ? 'bg-emerald-600 text-white'
                        : 'bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <HiOutlineShoppingCart className="w-5 h-5" />
                    {agregando
                      ? 'Agregando...'
                      : agregado
                        ? 'Agregado'
                        : 'Agregar al carrito'}
                  </button>

                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-5 rounded-xl text-sm transition-all duration-200 shadow-lg hover:shadow-emerald-500/25"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Consultar por WhatsApp
                  </a>
                </div>
              </div>
            </div>

            {/* Related products carousel — circular, random order */}
            <RelacionadosCarrusel
              relacionados={producto.relacionados}
              onVerProducto={onVerProducto}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
