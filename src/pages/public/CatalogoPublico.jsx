import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineSearch,
  HiOutlineShoppingCart,
  HiOutlineShoppingBag,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineCube,
  HiOutlineAdjustments,
} from 'react-icons/hi';
import api from '../../api/axios';
import { buildMediaUrl } from '../../utils/media';
import { formatearMoneda } from '../../utils/formato';
import { TIPO_MEDIA, WA_MENSAJES } from '../../config/constants';
import { construirUrlWhatsappEmpresa } from '../../utils/whatsapp';
import IconoWhatsapp from '../../components/ui/IconoWhatsapp';
import useCarritoPublico from '../../hooks/useCarritoPublico';
import ModalDetalleProducto from '../../components/public/ModalDetalleProducto';
import DrawerCarrito from '../../components/public/DrawerCarrito';

const PRODUCTOS_POR_PAGINA = 12;

function ProductImage({ producto, className = '' }) {
  const [imgIndex, setImgIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  const urls = useMemo(() => {
    const mediaArr = producto.media || [];
    const fotos = mediaArr.filter(m => m.tipo === TIPO_MEDIA.FOTO);
    if (fotos.length === 0) return null;
    return fotos.map(m => buildMediaUrl(m.url_archivo)).filter(Boolean);
  }, [producto]);

  const handleError = useCallback(() => {
    if (urls && imgIndex < urls.length - 1) {
      setImgIndex(prev => prev + 1);
    } else {
      setFailed(true);
    }
  }, [urls, imgIndex]);

  if (!urls || urls.length === 0 || failed) {
    return <HiOutlineCube className="w-12 h-12 text-steel-500" />;
  }

  return (
    <img
      src={urls[imgIndex]}
      alt={producto.nombre}
      className={className}
      onError={handleError}
    />
  );
}

export default function CatalogoPublico() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [mostrarCarrito, setMostrarCarrito] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { carrito, totalItems, agregarItem, eliminarItem, finalizar } = useCarritoPublico();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    api.get('/productos/catalogo-web')
      .then(res => {
        const lista = Array.isArray(res.data?.data || res.data) ? (res.data?.data || res.data) : [];
        setProductos(lista);
        const cats = [...new Set(lista.map(p => p.tbl_categorias_producto?.nombre).filter(Boolean))];
        setCategorias(cats);
      })
      .catch(() => setProductos([]))
      .finally(() => setCargando(false));
  }, []);

  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      const matchBusqueda = !busqueda ||
        p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.descripcion?.toLowerCase().includes(busqueda.toLowerCase());
      const matchCategoria = !categoriaFiltro || p.tbl_categorias_producto?.nombre === categoriaFiltro;
      return matchBusqueda && matchCategoria;
    });
  }, [productos, busqueda, categoriaFiltro]);

  // Reset pagina al cambiar filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, categoriaFiltro]);

  const totalPaginas = Math.ceil(productosFiltrados.length / PRODUCTOS_POR_PAGINA);
  const inicio = (paginaActual - 1) * PRODUCTOS_POR_PAGINA;
  const productosPagina = productosFiltrados.slice(inicio, inicio + PRODUCTOS_POR_PAGINA);

  const irAPagina = (pagina) => {
    setPaginaActual(pagina);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-neumorph-base">
      {/* Navbar */}
      <nav
        className={`sticky top-0 z-50 transition-all duration-500 backdrop-blur-md border-b border-white/30 ${
          scrolled ? 'bg-white/85 shadow-sm' : 'bg-white/70'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-[68px]">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="flex items-center gap-2 text-steel-300 hover:text-steel-100 transition-colors text-sm font-medium"
              >
                <HiOutlineChevronLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Volver</span>
              </Link>
              <div className="w-px h-8 bg-steel-600/30 hidden sm:block" />
              <Link to="/" className="flex items-center gap-3 group">
                <img
                  src="/logo-rasec.png"
                  alt="Maquinarias Rasec S.A.C"
                  className="w-10 h-10 sm:w-11 sm:h-11 object-contain rounded-lg transition-transform duration-300 group-hover:scale-110"
                />
                <div className="hidden sm:block leading-none">
                  <div className="font-display text-lg tracking-wider text-steel-100">MAQUINARIAS</div>
                  <div className="font-display text-[10px] tracking-[0.2em] text-primary-500">RASEC S.A.S</div>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm font-medium text-steel-200 hover:text-steel-100 transition-colors px-4 py-2"
              >
                Iniciar Sesion
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="bg-gradient-to-b from-[#607590]/20 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-wider text-steel-50 text-center mb-2">
            CATALOGO COMPLETO
          </h1>
          <p className="text-steel-400 text-sm text-center mb-8">
            {productos.length > 0
              ? `${productos.length} producto${productos.length !== 1 ? 's' : ''} disponible${productos.length !== 1 ? 's' : ''} con stock real`
              : 'Productos disponibles con stock real'}
          </p>

          {/* Barra de busqueda y filtros */}
          <div className="max-w-3xl mx-auto">
            <div className="bg-neumorph-base rounded-2xl shadow-neumorph p-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-steel-500" />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-neumorph-surface shadow-neumorph-inset-sm rounded-xl text-sm text-steel-100 placeholder:text-steel-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
                />
              </div>
              {categorias.length > 0 && (
                <div className="relative">
                  <HiOutlineAdjustments className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-500 pointer-events-none" />
                  <select
                    value={categoriaFiltro}
                    onChange={e => setCategoriaFiltro(e.target.value)}
                    className="pl-9 pr-8 py-2.5 bg-neumorph-surface shadow-neumorph-inset-sm rounded-xl text-sm text-steel-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Todas las categorias</option>
                    {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid de productos */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {cargando ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-3 border-steel-600/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div className="text-center py-16">
            <HiOutlineCube className="w-16 h-16 text-steel-500 mx-auto mb-4" />
            <p className="text-steel-400">
              {busqueda || categoriaFiltro ? 'No se encontraron productos con esos filtros.' : 'Proximamente nuevos productos.'}
            </p>
            {(busqueda || categoriaFiltro) && (
              <button
                onClick={() => { setBusqueda(''); setCategoriaFiltro(''); }}
                className="mt-3 text-primary-600 hover:text-primary-500 text-sm font-medium transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {productosPagina.map(p => {
                const precio = parseFloat(p.precio_catalogo || p.precio_venta_base || 0);
                const stockDisponible = p._count?.unidades || 0;
                const agotado = stockDisponible === 0;
                return (
                  <div
                    key={p.id}
                    className={`bg-neumorph-base rounded-2xl shadow-neumorph overflow-hidden cursor-pointer group hover:shadow-neumorph-sm transition-all duration-300 ${agotado ? 'opacity-80' : ''}`}
                    onClick={() => setProductoSeleccionado(p.id)}
                  >
                    {/* Imagen */}
                    <div className="relative aspect-[4/3] bg-neumorph-surface shadow-neumorph-inset-sm flex items-center justify-center overflow-hidden m-3 rounded-xl">
                      <ProductImage
                        producto={p}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      {agotado && (
                        <div className="absolute inset-0 bg-steel-50/40 flex items-center justify-center rounded-xl">
                          <span className="bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow">
                            Agotado
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="px-3 pb-3">
                      {p.tbl_categorias_producto?.nombre && (
                        <span className="text-[9px] uppercase tracking-wider text-primary-600 font-medium block">
                          {p.tbl_categorias_producto.nombre}
                        </span>
                      )}
                      <h3 className="text-xs sm:text-sm font-semibold text-steel-50 mt-0.5 line-clamp-2 leading-tight">
                        {p.nombre}
                      </h3>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-display text-base sm:text-lg text-primary-600">
                          {formatearMoneda(precio)}
                        </span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium border ${
                          agotado
                            ? 'text-red-700 bg-red-100 border-red-200'
                            : 'text-emerald-700 bg-emerald-100 border-emerald-200'
                        }`}>
                          {agotado ? 'Sin stock' : `Stock: ${stockDisponible}`}
                        </span>
                      </div>

                      {/* Botones */}
                      <div className="flex gap-1.5 mt-2">
                        <a
                          href={construirUrlWhatsappEmpresa(WA_MENSAJES.PRODUCTO(p.nombre, formatearMoneda(precio)))}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex-1 flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md py-1.5 text-[10px] font-bold shadow-sm transition-all duration-200"
                        >
                          <IconoWhatsapp className="w-3 h-3" />
                          WhatsApp
                        </a>
                        <button
                          onClick={e => { e.stopPropagation(); if (!agotado) agregarItem(p.id); }}
                          disabled={agotado}
                          className={`flex-1 flex items-center justify-center gap-1 rounded-md py-1.5 text-[10px] font-bold shadow-sm transition-all duration-200 ${
                            agotado
                              ? 'bg-steel-400 text-steel-600 cursor-not-allowed'
                              : 'bg-primary-500 hover:bg-primary-600 text-white'
                          }`}
                        >
                          <HiOutlineShoppingCart className="w-3 h-3" />
                          {agotado ? 'Agotado' : 'Al carrito'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Paginacion */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => irAPagina(paginaActual - 1)}
                  disabled={paginaActual === 1}
                  className="w-10 h-10 rounded-xl bg-neumorph-base shadow-neumorph flex items-center justify-center text-steel-300 hover:text-primary-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <HiOutlineChevronLeft className="w-5 h-5" />
                </button>

                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(pagina => (
                  <button
                    key={pagina}
                    onClick={() => irAPagina(pagina)}
                    className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${
                      pagina === paginaActual
                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                        : 'bg-neumorph-base shadow-neumorph text-steel-300 hover:text-primary-500'
                    }`}
                  >
                    {pagina}
                  </button>
                ))}

                <button
                  onClick={() => irAPagina(paginaActual + 1)}
                  disabled={paginaActual === totalPaginas}
                  className="w-10 h-10 rounded-xl bg-neumorph-base shadow-neumorph flex items-center justify-center text-steel-300 hover:text-primary-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <HiOutlineChevronRight className="w-5 h-5" />
                </button>

                <span className="ml-3 text-xs text-steel-500">
                  {inicio + 1}-{Math.min(inicio + PRODUCTOS_POR_PAGINA, productosFiltrados.length)} de {productosFiltrados.length}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer minimalista */}
      <footer className="bg-steel-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs text-steel-600 tracking-wider">
            MAQUINARIAS RASEC S.A.C &copy; {new Date().getFullYear()} — Todos los derechos reservados
          </p>
        </div>
      </footer>

      {/* Modal detalle producto */}
      <ModalDetalleProducto
        productoId={productoSeleccionado}
        onClose={() => setProductoSeleccionado(null)}
        onAgregarCarrito={agregarItem}
        onVerProducto={setProductoSeleccionado}
      />

      {/* Drawer carrito */}
      <DrawerCarrito
        visible={mostrarCarrito}
        onClose={() => setMostrarCarrito(false)}
        carrito={carrito}
        onAgregarItem={agregarItem}
        onEliminarItem={eliminarItem}
        onFinalizar={finalizar}
      />

      {/* FAB carrito flotante */}
      {totalItems > 0 && (
        <button
          onClick={() => setMostrarCarrito(true)}
          className="fixed bottom-8 right-6 z-50 bg-primary-500 hover:bg-primary-600 text-white w-14 h-14 rounded-full shadow-xl hover:shadow-2xl flex items-center justify-center transition-all duration-200"
        >
          <HiOutlineShoppingBag className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {totalItems}
          </span>
        </button>
      )}
    </div>
  );
}
