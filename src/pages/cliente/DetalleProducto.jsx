import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlineShoppingCart } from 'react-icons/hi';
import api from '../../api/axios';
import { formatearMoneda } from '../../utils/formato';
import { buildMediaUrl } from '../../utils/media';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { ESTADO_UNIDAD, TIPO_MEDIA } from '../../config/constants';

const mediaUrl = buildMediaUrl;

export default function DetalleProducto() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [producto, setProducto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mediaActual, setMediaActual] = useState(0);

  useEffect(() => {
    const cargar = async () => {
      try {
        const { data } = await api.get(`/productos/${id}`);
        setProducto(data);
      } catch { /* */ }
      setCargando(false);
    };
    cargar();
  }, [id]);

  if (cargando) return <LoadingSpinner />;
  if (!producto) return <div className="text-center py-12 text-steel-400">Producto no encontrado</div>;

  const medias = producto.tbl_media_producto || producto.media || [];
  const fotos = medias.filter(m => m.tipo === TIPO_MEDIA.FOTO);
  const videos = medias.filter(m => m.tipo === TIPO_MEDIA.VIDEO);
  const allMedia = [...fotos, ...videos];
  const current = allMedia[mediaActual];
  const stockDisponible = producto.unidades?.filter(u => u.estado_unidad === ESTADO_UNIDAD.DISPONIBLE).length || producto.stock_disponible || 0;

  return (
    <div>
      {/* Botón Volver premium */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-steel-400 hover:text-primary-500 transition-colors group mb-6"
      >
        <HiOutlineArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Volver al catálogo
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Galería de media */}
        <div>
          <div className="card-chromium overflow-hidden">
            <div className="aspect-square flex items-center justify-center bg-steel-900/50">
              {current?.tipo === TIPO_MEDIA.VIDEO ? (
                <video src={mediaUrl(current.url_archivo)} controls className="w-full h-full object-contain" />
              ) : current?.url_archivo ? (
                <img
                  src={mediaUrl(current.url_archivo)}
                  alt={producto.nombre}
                  className="w-full h-full object-contain"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="text-steel-500 text-center">
                  <HiOutlineShoppingCart className="w-16 h-16 mx-auto" />
                  <p className="mt-2">Sin imagen</p>
                </div>
              )}
            </div>
          </div>

          {/* Thumbnails */}
          {allMedia.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
              {allMedia.map((m, i) => (
                <button
                  key={m.id || i}
                  onClick={() => setMediaActual(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 transition-all ${
                    i === mediaActual
                      ? 'border-2 border-primary-500 ring-1 ring-primary-500/20'
                      : 'border-2 border-steel-700 hover:border-steel-500'
                  }`}
                >
                  {m.tipo === TIPO_MEDIA.VIDEO ? (
                    <div className="w-full h-full bg-steel-700 flex items-center justify-center text-xs text-steel-400">Video</div>
                  ) : (
                    <img
                      src={mediaUrl(m.url_archivo)}
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

        {/* Info del producto */}
        <div className="card-chromium p-6 space-y-5">
          {/* Categoría y nombre */}
          <div>
            <p className="label-chromium">
              {producto.tbl_categorias_producto?.nombre || producto.categoria || ''}
            </p>
            <h1 className="section-title-chromium mt-2">{producto.nombre}</h1>
          </div>

          {/* Precio */}
          <p className="text-3xl font-bold text-primary-500 num-chromium">
            {formatearMoneda(producto.precio_catalogo || producto.precio_venta_base)}
          </p>

          {/* Descripción */}
          {producto.descripcion && (
            <p className="text-steel-300 text-sm leading-relaxed">{producto.descripcion}</p>
          )}

          {/* Badge de stock */}
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              stockDisponible > 0
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                : 'bg-red-500/10 text-red-500 border border-red-500/20'
            }`}>
              {stockDisponible > 0 ? `${stockDisponible} disponibles` : 'Sin stock'}
            </span>
          </div>

          {/* Conteo de media */}
          <div className="flex items-center gap-4">
            {fotos.length > 0 && (
              <p className="text-xs text-steel-500">{fotos.length} foto(s)</p>
            )}
            {videos.length > 0 && (
              <p className="text-xs text-steel-500">{videos.length} video(s)</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
