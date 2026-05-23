import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineShoppingCart,
  HiOutlineShoppingBag,
  HiOutlineTruck,
  HiOutlineShieldCheck,
  HiOutlineClock,
  HiOutlinePhone,
  HiOutlineCube,
  HiOutlineArrowRight,
  HiOutlineOfficeBuilding,
  HiOutlineCreditCard,
  HiOutlineChevronDown,
  HiOutlineLocationMarker,
  HiOutlineBadgeCheck,
  HiOutlineGlobeAlt,
  HiOutlineSearch,
  HiOutlineUser,
} from 'react-icons/hi';
import api from '../../api/axios';
import { buildMediaUrl } from '../../utils/media';
import { formatearMoneda } from '../../utils/formato';
import { calcularPrecioCombo } from '../../utils/precioCombo';
import {
  TIPO_MEDIA,
  LANDING_NAV_LINKS,
  LANDING_COMBOS,
  LANDING_SIDEBAR,
  LANDING_PRODUCTOS,
  WA_MENSAJES,
  WHATSAPP_SVG_PATH,
} from '../../config/constants';
import useCarritoPublico from '../../hooks/useCarritoPublico';
import ModalDetalleProducto from '../../components/public/ModalDetalleProducto';
import ModalProximosIngresos from '../../components/public/ModalProximosIngresos';
import DrawerCarrito from '../../components/public/DrawerCarrito';
import {
  IconBox,
  IconUsers,
  IconClock,
  IconGarantia,
  IconGift,
  IconCart,
  IconArrow,
  IconChevronLeft,
  IconChevronRight,
} from '../../components/public/LandingIcons';
import { LANDING_ICON_MAP, IconDefault } from '../../components/public/landingIconMap';

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '';

// ── Helpers ─────────────────────────────────────────────────────────────
function scrollToSection(e, href) {
  e.preventDefault();
  const id = href.replace('#', '');
  const el = document.getElementById(id);
  if (!el) return;
  const navbarHeight = 80;
  const top = el.getBoundingClientRect().top + window.scrollY - navbarHeight;
  window.scrollTo({ top, behavior: 'smooth' });
}

function buildWhatsAppUrl(mensaje) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
}

function WhatsAppIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={WHATSAPP_SVG_PATH} />
    </svg>
  );
}

function getProductImages(producto) {
  if (!producto.media || producto.media.length === 0) return null;
  const fotos = producto.media.filter(m => m.tipo === TIPO_MEDIA.FOTO);
  if (fotos.length === 0) return null;
  return fotos.map(m => buildMediaUrl(m.url_archivo)).filter(Boolean);
}

function ProductImage({ producto, className = '', alt = '' }) {
  const [imgIndex, setImgIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const urls = getProductImages(producto);

  const handleError = useCallback(() => {
    if (urls && imgIndex < urls.length - 1) setImgIndex(i => i + 1);
    else setFailed(true);
  }, [urls, imgIndex]);

  if (!urls || urls.length === 0 || failed) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <HiOutlineCube className="w-10 h-10 text-gray-300" />
      </div>
    );
  }

  return <img src={urls[imgIndex]} alt={alt || producto.nombre} className={className} onError={handleError} />;
}

// ═══════════════════════════════════════════════════════════════════════════
// NAVBAR — Logo + nav + Mi Cuenta / Carrito / Login / Registrarse
// ═══════════════════════════════════════════════════════════════════════════
function Navbar({ totalItems, onOpenCart }) {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-5 sm:px-8 h-[64px] bg-gradient-to-b from-white to-[#f0f0f0] border-b border-[#dcdcdc] shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
      <Link to="/" className="flex items-center gap-3">
        <img src="/logo-rasec.png" alt="Rasec" className="w-9 h-9 object-contain" />
        <div className="leading-[1.1]">
          <div className="font-condensed font-extrabold text-[16px] text-[#1a1a1a] tracking-[0.5px] uppercase">Maquinarias</div>
          <div className="font-condensed font-bold text-[12px] text-[#c0392b] tracking-[1px] uppercase">RASEC S.A.C</div>
        </div>
      </Link>

      <div className="hidden xl:flex items-center gap-5 2xl:gap-6">
        {LANDING_NAV_LINKS.map(link =>
          link.isRoute ? (
            <Link key={link.href} to={link.href} className="text-sm font-semibold text-[#1a1a1a] hover:text-[#c0392b] transition-colors whitespace-nowrap">
              {link.label}
            </Link>
          ) : (
            <a key={link.href} href={link.href} onClick={e => scrollToSection(e, link.href)} className="text-sm font-semibold text-[#1a1a1a] hover:text-[#c0392b] transition-colors whitespace-nowrap">
              {link.label}
            </a>
          )
        )}
      </div>

      <div className="flex items-center gap-3 text-sm">
        <Link to="/login" className="hidden sm:flex items-center gap-1.5 font-semibold text-[#1a1a1a] hover:text-[#c0392b] transition-colors">
          <HiOutlineUser className="w-4 h-4" /> Mi Cuenta
        </Link>
        <button
          onClick={onOpenCart}
          className="hidden sm:flex items-center gap-1.5 font-semibold text-[#1a1a1a] hover:text-[#c0392b] transition-colors relative"
        >
          <IconCart className="w-5 h-5" /> Carrito
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-3 bg-[#c0392b] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </button>
        <Link to="/login" className="hidden sm:block px-3 py-1.5 border border-[#1a1a1a] rounded-md font-semibold text-xs hover:bg-[#1a1a1a] hover:text-white transition-colors">
          Login
        </Link>
        <Link to="/login" className="px-3 py-1.5 bg-gradient-to-b from-[#d32f2f] to-[#a93226] text-white font-bold text-xs rounded-md shadow hover:-translate-y-0.5 transition-transform">
          Registrarse
        </Link>
      </div>
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SIDEBAR IZQUIERDO — Nuestras Fortalezas + Beneficios RASEC
// Se alimenta del array servicios_landing (dinámico). Si hay >= 4 items,
// se parte en dos secciones; si hay menos, se renderiza sólo Fortalezas.
// ═══════════════════════════════════════════════════════════════════════════
function ServicioRow({ servicio, showDivider }) {
  const Icon = LANDING_ICON_MAP[servicio.icono_key] || IconDefault;
  const imagenUrl = servicio.imagen_url ? buildMediaUrl(servicio.imagen_url) : null;
  return (
    <div className={`py-3 ${showDivider ? 'border-b border-gray-100' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#fdf2f2] flex items-center justify-center text-[#c0392b] shrink-0">
          <Icon className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-[13px] leading-tight text-[#1a1a1a]">{servicio.titulo}</div>
          <div className="text-[11px] text-gray-600 leading-snug mt-0.5">{servicio.descripcion}</div>
        </div>
      </div>
      {imagenUrl && (
        <div className="mt-2.5 rounded-md overflow-hidden bg-gray-100">
          <img
            src={imagenUrl}
            alt={servicio.titulo}
            className="w-full h-[120px] object-cover"
            onError={e => { e.target.style.display = 'none'; }}
          />
        </div>
      )}
    </div>
  );
}

function GrupoSidebar({ titulo, items }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="font-condensed font-black text-[18px] uppercase mb-1 text-[#1a1a1a]">
        {titulo}
      </h3>
      <div className="divide-y divide-gray-100">
        {items.map((s, i) => (
          <ServicioRow key={s.id} servicio={s} showDivider={i < items.length - 1} />
        ))}
      </div>
    </div>
  );
}

function LeftSidebar({ servicios, config }) {
  const { fortalezas, beneficios, total } = useMemo(() => {
    const lista = servicios || [];
    const f = lista.filter(s => s.grupo === 'fortalezas');
    const b = lista.filter(s => s.grupo === 'beneficios');
    return { fortalezas: f, beneficios: b, total: lista.length };
  }, [servicios]);

  if (total === 0) return <aside className="hidden xl:block" />;

  const tituloFort = config?.sidebar_fortalezas_titulo || LANDING_SIDEBAR.tituloFortalezasDefault;
  const tituloBen = config?.sidebar_beneficios_titulo || LANDING_SIDEBAR.tituloBeneficiosDefault;

  return (
    <aside id="servicios" className="bg-white rounded-lg shadow-sm p-4 flex flex-col gap-5 self-start">
      <GrupoSidebar titulo={tituloFort} items={fortalezas} />
      {fortalezas.length > 0 && beneficios.length > 0 && (
        <div className="border-t border-gray-200" />
      )}
      <GrupoSidebar titulo={tituloBen} items={beneficios} />
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMBOS HORIZONTAL — Carrusel top (reemplaza "OFERTAS DESTACADAS")
// Card: imagen cuadrada 180×180 izquierda + info a la derecha
// ═══════════════════════════════════════════════════════════════════════════
function ComboImageCarouselSquare({ combo }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fading, setFading] = useState(false);

  const imagenes = useMemo(() => {
    const arr = [];
    if (combo.imagen_landing_url) arr.push(buildMediaUrl(combo.imagen_landing_url));
    (combo.items_combo || []).forEach(item => {
      const fotos = item.tbl_productos?.media?.filter(m => m.url_archivo) || [];
      if (fotos.length > 0) arr.push(buildMediaUrl(fotos[0].url_archivo));
    });
    return arr.filter(Boolean);
  }, [combo]);

  const goTo = useCallback((nextIndex) => {
    setFading(true);
    setTimeout(() => {
      setCurrentIndex(nextIndex);
      setFading(false);
    }, 280);
  }, []);

  useEffect(() => {
    if (imagenes.length <= 1) return;
    const timer = setInterval(() => goTo((currentIndex + 1) % imagenes.length), 3500);
    return () => clearInterval(timer);
  }, [currentIndex, imagenes.length, goTo]);

  if (imagenes.length === 0) {
    return (
      <div className="w-[180px] h-[180px] shrink-0 bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center border-r border-[#dcdcdc]">
        <HiOutlineCube className="w-12 h-12 text-gray-300" />
      </div>
    );
  }

  return (
    <div className="relative w-[180px] h-[180px] shrink-0 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden border-r border-[#dcdcdc]">
      <img
        src={imagenes[currentIndex]}
        alt={combo.nombre}
        className={`w-full h-full object-contain p-2 transition-opacity duration-300 ${fading ? 'opacity-0' : 'opacity-100'}`}
        onError={(e) => { e.target.style.display = 'none'; }}
      />
      {imagenes.length > 1 && (
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
          {imagenes.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'bg-[#c0392b] w-4' : 'bg-white/80 w-1.5 border border-gray-300'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ComboCardHorizontal({ combo }) {
  const { items, totalEstimado, totalSinDescuento, tieneDescuento, porcentajeAhorro } = useMemo(() => {
    const arr = combo.items_combo || [];
    const sin = arr.reduce((acc, item) => {
      if (item.es_regalo) return acc;
      const precio = parseFloat(item.tbl_productos?.precio_catalogo || item.tbl_productos?.precio_venta_base || 0);
      return acc + precio * (item.cantidad || 1);
    }, 0);
    const conDesc = arr.reduce((acc, item) => {
      if (item.es_regalo) return acc;
      const precio = parseFloat(item.tbl_productos?.precio_catalogo || item.tbl_productos?.precio_venta_base || 0);
      return acc + calcularPrecioCombo(precio, item.tipo_descuento, item.valor_descuento) * (item.cantidad || 1);
    }, 0);
    const tiene = conDesc < sin;
    const pct = tiene && sin > 0 ? Math.round(((sin - conDesc) / sin) * 100) : 0;
    return { items: arr, totalEstimado: conDesc, totalSinDescuento: sin, tieneDescuento: tiene, porcentajeAhorro: pct };
  }, [combo.items_combo]);

  return (
    <div className="min-w-[380px] max-w-[420px] flex-shrink-0 snap-start bg-white rounded-[10px] border border-[#dcdcdc] overflow-hidden shadow-[0_4px_10px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex h-[180px]">
        {/* Imagen cuadrada izquierda con badge */}
        <div className="relative">
          <ComboImageCarouselSquare combo={combo} />
          {porcentajeAhorro > 0 && (
            <span className="absolute top-2 left-2 bg-[#c0392b] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow z-10">
              -{porcentajeAhorro}%
            </span>
          )}
        </div>

        {/* Info derecha */}
        <div className="flex-1 p-3 min-w-0 flex flex-col">
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">
            {LANDING_COMBOS.labelItems(items.length)}
          </div>
          <div className="font-condensed font-bold text-[13px] leading-tight uppercase mt-0.5 text-[#1a1a1a] line-clamp-2">
            {combo.nombre}
          </div>

          <div className="mt-2 space-y-1 text-[11px] text-gray-600 overflow-hidden">
            {items.slice(0, 3).map(item => (
              <div key={item.id} className="flex items-center gap-1 truncate">
                {item.es_regalo ? (
                  <span className="text-purple-700 flex items-center gap-1 truncate">
                    <IconGift className="w-3 h-3 shrink-0" />
                    <span className="truncate">{item.tbl_productos?.nombre} ({LANDING_COMBOS.labelRegalo})</span>
                  </span>
                ) : (
                  <span className="truncate">• {item.tbl_productos?.nombre} x{item.cantidad || 1}</span>
                )}
              </div>
            ))}
            {items.length > 3 && (
              <div className="text-[10px] text-gray-400">+ {items.length - 3} más</div>
            )}
          </div>

          <div className="mt-auto pt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="font-condensed font-black text-[#c0392b] text-[18px] leading-none">
                {formatearMoneda(totalEstimado)}
              </span>
              {tieneDescuento && (
                <span className="line-through text-gray-400 text-[11px]">
                  {formatearMoneda(totalSinDescuento)}
                </span>
              )}
            </div>
            <div className="flex gap-1.5 mt-1.5">
              <button
                onClick={() => document.getElementById('combos')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex-1 bg-[#1a1a1a] hover:bg-black text-white text-[11px] font-bold py-1.5 rounded transition-colors"
              >
                {LANDING_COMBOS.ctaComprar}
              </button>
              <a
                href={buildWhatsAppUrl(WA_MENSAJES.PRODUCTO(combo.nombre, formatearMoneda(totalEstimado)))}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 bg-[#25d366] hover:bg-[#1da851] text-white rounded flex items-center justify-center shrink-0 transition-colors"
              >
                <WhatsAppIcon className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CombosCarouselTop() {
  const [combos, setCombos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.get('/combos/landing')
      .then(res => setCombos(Array.isArray(res.data) ? res.data : []))
      .catch(() => setCombos([]))
      .finally(() => setCargando(false));
  }, []);

  const scroll = (dir) => {
    const el = document.getElementById('combos-carrusel');
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -420 : 420, behavior: 'smooth' });
  };

  if (!cargando && combos.length === 0) return null;

  return (
    <section id="combos">
      <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0 gap-4 flex-wrap">
        <h2 className="font-condensed font-black text-[22px] uppercase text-[#1a1a1a] whitespace-nowrap">
          {LANDING_COMBOS.title}
        </h2>
        <div className="flex-1 max-w-[380px] min-w-[200px]">
          <div className="relative">
            <input
              type="text"
              placeholder={LANDING_COMBOS.searchPlaceholder}
              className="w-full h-9 pl-4 pr-10 rounded-full border border-[#dcdcdc] text-sm focus:outline-none focus:border-[#c0392b] bg-white"
            />
            <Link
              to="/catalogo-web"
              className="absolute right-1 top-1 w-7 h-7 rounded-full bg-[#c0392b] text-white flex items-center justify-center hover:bg-[#a93226] transition-colors"
            >
              <HiOutlineSearch className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {cargando ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-3 border-gray-300 border-t-[#c0392b] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="relative">
          {combos.length > 1 && (
            <>
              <button
                onClick={() => scroll('left')}
                className="absolute left-[-14px] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow border border-[#dcdcdc] z-10 flex items-center justify-center text-[#4a4a4a] hover:text-[#c0392b]"
              >
                <IconChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="absolute right-[-14px] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow border border-[#dcdcdc] z-10 flex items-center justify-center text-[#4a4a4a] hover:text-[#c0392b]"
              >
                <IconChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          <div
            id="combos-carrusel"
            className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {combos.map(combo => <ComboCardHorizontal key={combo.id} combo={combo} />)}
          </div>
        </div>
      )}
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TITULO + STATS INLINE — Debajo del carrusel de combos
// ═══════════════════════════════════════════════════════════════════════════
function TituloStatsInline({ stats }) {
  const items = [
    { num: stats?.total_productos || '0', label: 'Productos', Icon: IconBox },
    { num: stats?.total_clientes || '0', label: 'Clientes', Icon: IconUsers },
    { num: '24/7', label: 'Soporte', Icon: IconClock },
    { num: '100%', label: 'Garantía', Icon: IconGarantia },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-3 sm:gap-4">
      <h1 className="font-condensed font-black text-[20px] sm:text-[24px] leading-[1.1] text-[#1a1a1a] uppercase sm:max-w-[70%]">
        {LANDING_PRODUCTOS.tituloPrincipal}
      </h1>
      <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:shrink-0 sm:flex-wrap">
        {items.map(s => (
          <div key={s.label} className="bg-[#eef1f4] border border-[#dcdcdc] rounded-lg px-2.5 py-1 flex items-center gap-1.5 min-w-0">
            <s.Icon className="w-4 h-4 text-[#c0392b] shrink-0" />
            <div className="leading-none min-w-0">
              <div className="font-condensed font-black text-[13px] text-[#c0392b]">{s.num}</div>
              <div className="text-[9px] font-bold uppercase mt-0.5 truncate">{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GRID PRODUCTOS — 5 columnas en lg, imagen cuadrada (aspect-square)
// ═══════════════════════════════════════════════════════════════════════════
function ProductosGrid({ onVerProducto, onAgregarCarrito }) {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [colsCount, setColsCount] = useState(4);
  const gridRef = useRef(null);

  useEffect(() => {
    // Traemos hasta 18: cubre 2 filas completas hasta en 9 cols; limitamos por JS
    api.get('/productos/catalogo-web')
      .then(res => setProductos((res.data?.data || res.data || []).slice(0, 18)))
      .catch(() => setProductos([]))
      .finally(() => setCargando(false));
  }, []);

  // Detecta columnas reales del grid y muestra siempre 2 filas COMPLETAS
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const actualizar = () => {
      const cols = getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length;
      if (cols > 0) setColsCount(cols);
    };
    actualizar();
    const ro = new ResizeObserver(actualizar);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cargando]);

  const productosVisibles = productos.slice(0, colsCount * 2);

  if (!cargando && productos.length === 0) {
    return (
      <div id="catalogo" className="text-center py-8">
        <HiOutlineCube className="w-10 h-10 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-400 text-sm">Próximamente nuevos productos.</p>
      </div>
    );
  }

  return (
    <section id="catalogo">
      {cargando ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-3 border-gray-300 border-t-[#c0392b] rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div
            ref={gridRef}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3"
          >
            {productosVisibles.map(p => {
              const stockDisponible = p._count?.unidades || 0;
              const agotado = stockDisponible === 0;
              const precio = parseFloat(p.precio_catalogo || p.precio_venta_base || 0);
              return (
                <div
                  key={p.id}
                  className={`bg-white rounded-lg border border-[#dcdcdc] overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer relative ${agotado ? 'opacity-90' : ''}`}
                  onClick={() => onVerProducto(p.id)}
                >
                  {agotado && (
                    <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded z-10 uppercase tracking-wider">
                      {LANDING_PRODUCTOS.labelSinStock}
                    </span>
                  )}
                  {!agotado && stockDisponible > 0 && stockDisponible <= 3 && (
                    <span className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded z-10">
                      {LANDING_PRODUCTOS.labelSoloRestantes(stockDisponible)}
                    </span>
                  )}

                  <div className={`aspect-square bg-gray-50 border-b border-[#dcdcdc] overflow-hidden ${agotado ? 'opacity-60' : ''}`}>
                    <ProductImage producto={p} className="w-full h-full object-contain p-2.5" />
                  </div>

                  <div className="p-2.5">
                    {p.tbl_categorias_producto?.nombre && (
                      <div className="text-[10px] font-bold text-gray-500 uppercase mb-0.5 truncate">
                        {p.tbl_categorias_producto.nombre}
                      </div>
                    )}
                    <div className="font-condensed font-bold text-[13px] text-[#1a1a1a] uppercase leading-tight mb-1.5 h-9 line-clamp-2">
                      {p.nombre}
                    </div>
                    <div className="font-condensed font-black text-[#c0392b] text-[17px] leading-tight">
                      {formatearMoneda(precio)}
                    </div>
                    <div className={`text-[11px] font-bold mt-1 ${agotado ? 'text-red-600' : 'text-green-600'}`}>
                      {agotado ? LANDING_PRODUCTOS.labelAgotado : LANDING_PRODUCTOS.labelEnStock}
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      <button
                        onClick={e => { e.stopPropagation(); if (!agotado) onAgregarCarrito(p.id); }}
                        disabled={agotado}
                        className={`flex-1 text-[11px] py-1.5 rounded font-bold transition-colors ${
                          agotado
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-[#c0392b] hover:bg-[#a93226] text-white'
                        }`}
                      >
                        {agotado ? LANDING_PRODUCTOS.labelAgotado : LANDING_PRODUCTOS.ctaAlCarrito}
                      </button>
                      {!agotado && (
                        <a
                          href={buildWhatsAppUrl(WA_MENSAJES.PRODUCTO(p.nombre, formatearMoneda(precio)))}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="w-8 bg-[#25d366] hover:bg-[#1da851] text-white rounded flex items-center justify-center transition-colors"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-4">
            <Link
              to="/catalogo-web"
              className="inline-flex items-center gap-1 text-[#c0392b] hover:text-[#a93226] font-semibold transition-colors text-sm group"
            >
              {LANDING_PRODUCTOS.verCatalogoCompleto}
              <IconArrow className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </>
      )}
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SIDEBAR DERECHO — Stats 2×2 + Ver Catálogo + WhatsApp + Contacto rápido
// ═══════════════════════════════════════════════════════════════════════════
function RightSidebar({ stats }) {
  const statsItems = [
    { num: stats?.total_productos || '0', label: 'Productos', Icon: IconBox },
    { num: stats?.total_clientes || '0', label: 'Clientes', Icon: IconUsers },
    { num: '24/7', label: 'Soporte', Icon: IconClock },
    { num: '100%', label: 'Garantía', Icon: IconGarantia },
  ];

  return (
    <aside className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {statsItems.map(s => (
          <div key={s.label} className="bg-white rounded-lg p-3 text-center border border-[#dcdcdc] shadow-sm">
            <s.Icon className="w-5 h-5 text-[#c0392b] mx-auto mb-1" />
            <div className="font-condensed font-black text-[20px] text-[#c0392b] leading-none">{s.num}</div>
            <div className="text-[10px] font-bold uppercase mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <Link
        to="/catalogo-web"
        className="px-4 py-2.5 bg-gradient-to-b from-[#d32f2f] to-[#a93226] text-white rounded-full text-center font-bold text-[13px] shadow flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-transform"
      >
        {LANDING_SIDEBAR.ctaVerCatalogo}
        <IconArrow className="w-3.5 h-3.5" />
      </Link>

      <a
        href={buildWhatsAppUrl(WA_MENSAJES.GENERAL)}
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 py-2.5 bg-gradient-to-b from-[#25d366] to-[#1da851] text-white rounded-full text-center font-bold text-[13px] shadow flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-transform"
      >
        <WhatsAppIcon className="w-4 h-4" />
        {LANDING_SIDEBAR.ctaWhatsApp}
      </a>

      <div className="bg-white rounded-lg p-3 border border-[#dcdcdc] shadow-sm mt-2">
        <div className="font-bold text-[12px] uppercase mb-2 text-[#1a1a1a]">
          {LANDING_SIDEBAR.tituloContactoRapido}
        </div>
        <div className="text-[11px] text-gray-600 leading-snug space-y-1">
          <div className="flex items-center gap-1.5">
            <IconClock className="w-3.5 h-3.5 text-[#c0392b]" />
            {LANDING_SIDEBAR.contactoRapidoHorario}
          </div>
          <div className="flex items-center gap-1.5">
            <HiOutlineTruck className="w-3.5 h-3.5 text-[#c0392b]" />
            {LANDING_SIDEBAR.contactoRapidoEnvio}
          </div>
        </div>
      </div>

    </aside>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CLIENTES + PRÓXIMOS INGRESOS — En 2 columnas dentro del centro
// ═══════════════════════════════════════════════════════════════════════════
function ClientesCompactos({ clientes }) {
  if (!clientes || clientes.length === 0) return null;
  return (
    <div id="clientes">
      <h2 className="font-condensed font-black text-[18px] uppercase text-center text-[#1a1a1a]">
        PRINCIPALES CLIENTES
      </h2>
      <p className="text-[11px] text-gray-600 text-center mb-3">Nuestros Socios de Confianza</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {clientes.slice(0, 8).map(c => (
          <div key={c.id} className="bg-white rounded-lg border border-[#dcdcdc] h-[80px] flex flex-col items-center justify-center p-2 shadow-sm">
            {c.logo_url ? (
              <img
                src={buildMediaUrl(c.logo_url)}
                alt={c.nombre}
                className="w-full h-full object-contain"
                onError={e => { e.target.style.display = 'none'; }}
              />
            ) : (
              <>
                <HiOutlineOfficeBuilding className="w-6 h-6 text-gray-400 mb-1" />
                <div className="text-[9px] font-bold text-gray-500 uppercase text-center line-clamp-2">
                  {c.nombre}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProximosCompactos({ onVerTodos }) {
  const [proximos, setProximos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.get('/productos/proximos-ingresos')
      .then(res => {
        const d = res.data?.data || res.data || {};
        const importaciones = Array.isArray(d.importaciones) ? d.importaciones : [];
        const compras = Array.isArray(d.compras) ? d.compras : [];
        setProximos([...importaciones, ...compras].slice(0, 4));
      })
      .catch(() => setProximos([]))
      .finally(() => setCargando(false));
  }, []);

  if (!cargando && proximos.length === 0) return null;

  return (
    <div id="proximos">
      <h2 className="font-condensed font-black text-[18px] uppercase text-center text-[#1a1a1a] mb-3">
        PRÓXIMOS INGRESOS
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {proximos.map((item, i) => {
          const esImportacion = !!item.fecha_desembarque;
          const firstItem = item.items?.[0];
          const nombre = firstItem?.tbl_productos?.nombre || 'Producto';
          return (
            <div
              key={`${esImportacion ? 'imp' : 'comp'}-${item.id}-${i}`}
              className="bg-white rounded-lg border border-[#dcdcdc] p-2 shadow-sm"
            >
              <span className="inline-block bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                Reserva Ya
              </span>
              <div className="text-[11px] font-bold mt-1 truncate text-[#1a1a1a]">{nombre}</div>
              <div className="text-[10px] text-gray-600">
                {esImportacion ? 'Importación' : 'Compra Local'}
              </div>
              <a
                href={buildWhatsAppUrl(WA_MENSAJES.RESERVA)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-[10px] text-[#25d366] hover:text-[#1da851] font-semibold"
              >
                <WhatsAppIcon className="w-3 h-3" /> Reservar
              </a>
            </div>
          );
        })}
      </div>
      <div className="text-center mt-3">
        <button
          onClick={onVerTodos}
          className="text-[#c0392b] hover:text-[#a93226] text-xs font-semibold inline-flex items-center gap-1"
        >
          Ver todos <IconArrow className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// QUIÉNES SOMOS
// ═══════════════════════════════════════════════════════════════════════════
function QuienesSomosSection({ config }) {
  const titulo = config?.quienes_somos_titulo;
  const contenido = config?.quienes_somos_contenido;
  const mision = config?.quienes_somos_mision;
  const vision = config?.quienes_somos_vision;

  if (!titulo && !contenido && !mision && !vision) return null;

  return (
    <section id="quienes-somos" className="py-10 bg-[#f4f6f8] border-t-2 border-[#dcdcdc]">
      <div className="max-w-[1800px] mx-auto px-5 sm:px-10 xl:px-16">
        <div className="text-center mb-8">
          <h2 className="font-condensed font-black text-[28px] text-[#1a1a1a] uppercase mb-1">
            {titulo || 'QUIÉNES SOMOS'}
          </h2>
        </div>

        {contenido && (
          <p className="text-[14px] text-[#4a4a4a] leading-relaxed text-center max-w-3xl mx-auto mb-8 whitespace-pre-line">
            {contenido}
          </p>
        )}

        {(mision || vision) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {mision && (
              <div className="bg-white rounded-[10px] border border-[#dcdcdc] p-5 shadow-[0_4px_10px_rgba(0,0,0,0.06)]">
                <div className="flex items-center gap-2 mb-3">
                  <HiOutlineBadgeCheck className="w-6 h-6 text-[#c0392b]" />
                  <h3 className="font-condensed font-bold text-[16px] text-[#1a1a1a] uppercase">Misión</h3>
                </div>
                <p className="text-[13px] text-[#4a4a4a] leading-relaxed whitespace-pre-line">{mision}</p>
              </div>
            )}
            {vision && (
              <div className="bg-white rounded-[10px] border border-[#dcdcdc] p-5 shadow-[0_4px_10px_rgba(0,0,0,0.06)]">
                <div className="flex items-center gap-2 mb-3">
                  <HiOutlineGlobeAlt className="w-6 h-6 text-[#c0392b]" />
                  <h3 className="font-condensed font-bold text-[16px] text-[#1a1a1a] uppercase">Visión</h3>
                </div>
                <p className="text-[13px] text-[#4a4a4a] leading-relaxed whitespace-pre-line">{vision}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MÉTODOS DE COMPRA
// ═══════════════════════════════════════════════════════════════════════════
const METODO_ICON_MAP = {
  tienda: HiOutlineOfficeBuilding,
  envio: HiOutlineTruck,
  web: HiOutlineCreditCard,
  whatsapp: HiOutlinePhone,
  default: HiOutlineShoppingCart,
};

function MetodosCompraSection({ metodos }) {
  if (!metodos || metodos.length === 0) return null;

  return (
    <section id="metodos-compra" className="py-10 bg-white border-t-2 border-[#dcdcdc]">
      <div className="max-w-[1800px] mx-auto px-5 sm:px-10 xl:px-16">
        <div className="text-center mb-8">
          <h2 className="font-condensed font-black text-[28px] text-[#1a1a1a] uppercase mb-1">
            CÓMO COMPRAR
          </h2>
          <p className="text-[13px] text-[#4a4a4a]">
            Conoce nuestros métodos de compra y los lugares a donde llevamos tus productos.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {metodos.map((m) => {
            const Icon = METODO_ICON_MAP[m.icono_key] || METODO_ICON_MAP.default;
            return (
              <div key={m.id} className="bg-[#fcfcfc] rounded-[10px] border border-[#dcdcdc] p-5 shadow-[0_4px_10px_rgba(0,0,0,0.06)]">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                  <Icon className="w-6 h-6 text-[#c0392b]" />
                </div>
                <h3 className="font-condensed font-bold text-[16px] text-[#1a1a1a] uppercase mb-2">{m.titulo}</h3>
                <p className="text-[13px] text-[#4a4a4a] leading-relaxed whitespace-pre-line mb-3">{m.descripcion}</p>
                {m.destinos && (
                  <div className="flex items-center gap-1.5 text-[12px] text-[#c0392b] font-medium">
                    <HiOutlineLocationMarker className="w-4 h-4" />
                    {m.destinos}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FAQ
// ═══════════════════════════════════════════════════════════════════════════
function FaqSection({ preguntas }) {
  const [abierta, setAbierta] = useState(null);
  if (!preguntas || preguntas.length === 0) return null;

  return (
    <section id="faq" className="py-10 bg-white border-t-2 border-[#dcdcdc]">
      <div className="max-w-[900px] mx-auto px-5 sm:px-[60px]">
        <div className="text-center mb-8">
          <h2 className="font-condensed font-black text-[28px] text-[#1a1a1a] uppercase mb-1">
            PREGUNTAS FRECUENTES
          </h2>
        </div>
        <div className="space-y-3">
          {preguntas.map((faq) => {
            const isOpen = abierta === faq.id;
            return (
              <div key={faq.id} className="bg-[#fcfcfc] rounded-[10px] border border-[#dcdcdc] overflow-hidden shadow-[0_2px_6px_rgba(0,0,0,0.04)]">
                <button
                  onClick={() => setAbierta(isOpen ? null : faq.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-condensed font-bold text-[14px] text-[#1a1a1a] pr-4">{faq.pregunta}</span>
                  <HiOutlineChevronDown className={`w-5 h-5 text-[#c0392b] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 border-t border-[#eee]">
                    <p className="text-[13px] text-[#4a4a4a] leading-relaxed pt-3 whitespace-pre-line">{faq.respuesta}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════════════════════════════════
function Footer() {
  const footerLinks = LANDING_NAV_LINKS.filter(l => l.href !== '#proximos');

  return (
    <footer className="bg-[#fcfcfc] py-4 px-5 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-3 border-t-2 border-[#dcdcdc]">
      <div className="flex items-center gap-2.5">
        <img src="/logo-rasec.png" alt="Rasec" className="w-[30px] h-[30px] object-contain" />
        <div className="leading-[1.1]">
          <div className="font-condensed font-extrabold text-[14px] text-[#1a1a1a] uppercase">Maquinarias</div>
          <div className="font-condensed font-bold text-[11px] text-[#c0392b] uppercase">RASEC S.A.C</div>
        </div>
      </div>
      <div className="flex items-center gap-5 flex-wrap justify-center">
        {footerLinks.map(link =>
          link.isRoute ? (
            <Link key={link.href} to={link.href} className="text-xs font-semibold text-[#1a1a1a] hover:text-[#c0392b] transition-colors">
              {link.label}
            </Link>
          ) : (
            <a key={link.href} href={link.href} onClick={e => scrollToSection(e, link.href)} className="text-xs font-semibold text-[#1a1a1a] hover:text-[#c0392b] transition-colors">
              {link.label}
            </a>
          )
        )}
        <Link to="/login" className="text-xs font-semibold text-[#1a1a1a] hover:text-[#c0392b] transition-colors">
          Login
        </Link>
      </div>
    </footer>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LANDING PAGE — Layout principal 3 columnas (lg) + secciones full-width abajo
// ═══════════════════════════════════════════════════════════════════════════
export default function LandingPage() {
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [mostrarProximos, setMostrarProximos] = useState(false);
  const [mostrarCarrito, setMostrarCarrito] = useState(false);
  const [landingConfig, setLandingConfig] = useState(null);
  const { carrito, totalItems, agregarItem, eliminarItem, finalizar } = useCarritoPublico();

  useEffect(() => {
    api.get('/config-landing')
      .then(res => setLandingConfig(res.data))
      .catch(() => {});
  }, []);

  const fondoUrl = landingConfig?.fondo_imagen_url ? buildMediaUrl(landingConfig.fondo_imagen_url) : null;
  const bgStyle = fondoUrl
    ? {
        backgroundImage: `url("${fondoUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
      }
    : undefined;

  return (
    <div
      className={`min-h-screen relative ${fondoUrl ? '' : 'bg-[#eef1f4]'}`}
      style={bgStyle}
    >
      <Navbar totalItems={totalItems} onOpenCart={() => setMostrarCarrito(true)} />

      {/* ── LAYOUT 3 COLUMNAS: sidebar izq | centro | sidebar der ──
          Se activa en xl (1280+). En tablet/móvil se apila verticalmente
          para aprovechar todo el ancho. Contenedor fluido hasta 1920px. */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 xl:px-10 py-6 grid grid-cols-1 xl:grid-cols-[260px_1fr_240px] 2xl:grid-cols-[300px_1fr_280px] gap-5 xl:gap-6">

        {/* En móvil/tablet: main primero, luego sidebars (orden DOM via order-*) */}
        <div className="order-2 xl:order-1">
          <LeftSidebar servicios={landingConfig?.servicios_landing} config={landingConfig} />
        </div>

        <main className="order-1 xl:order-2 flex flex-col gap-6 min-w-0">
          <CombosCarouselTop />
          <TituloStatsInline stats={landingConfig?.stats} />
          <ProductosGrid onVerProducto={setProductoSeleccionado} onAgregarCarrito={agregarItem} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#dcdcdc]">
            <ClientesCompactos clientes={landingConfig?.principales_clientes} />
            <ProximosCompactos onVerTodos={() => setMostrarProximos(true)} />
          </div>
        </main>

        <div className="order-3">
          <RightSidebar stats={landingConfig?.stats} />
        </div>
      </div>

      {/* ── SECCIONES FULL-WIDTH INFERIORES ── */}
      <QuienesSomosSection config={landingConfig} />
      <MetodosCompraSection metodos={landingConfig?.metodos_compra} />
      <FaqSection preguntas={landingConfig?.preguntas_faq} />
      <Footer />

      {/* Modales y Drawer */}
      <ModalDetalleProducto
        productoId={productoSeleccionado}
        onClose={() => setProductoSeleccionado(null)}
        onAgregarCarrito={agregarItem}
        onVerProducto={setProductoSeleccionado}
      />
      <ModalProximosIngresos
        visible={mostrarProximos}
        onClose={() => setMostrarProximos(false)}
      />
      <DrawerCarrito
        visible={mostrarCarrito}
        onClose={() => setMostrarCarrito(false)}
        carrito={carrito}
        onAgregarItem={agregarItem}
        onEliminarItem={eliminarItem}
        onFinalizar={finalizar}
      />

      {totalItems > 0 && (
        <button
          onClick={() => setMostrarCarrito(true)}
          className="fixed bottom-24 right-6 z-50 bg-gradient-to-b from-[#d32f2f] to-[#a93226] hover:from-[#c0392b] hover:to-[#922b21] text-white w-14 h-14 rounded-full shadow-xl hover:shadow-2xl flex items-center justify-center transition-all duration-200"
        >
          <HiOutlineShoppingBag className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 bg-[#25d366] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {totalItems}
          </span>
        </button>
      )}
    </div>
  );
}
