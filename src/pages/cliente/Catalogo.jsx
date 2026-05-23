import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { HiOutlineShoppingCart, HiOutlineSearch, HiOutlinePlus, HiOutlineMinus, HiOutlineTrash, HiOutlineX, HiOutlineClock } from 'react-icons/hi';
import api from '../../api/axios';
import { formatearMoneda } from '../../utils/formato';
import { buildMediaUrl } from '../../utils/media';
import { TIPO_ENTREGA, TIPO_DESTINO, METODOS_PAGO, METODOS_PAGO_LABEL } from '../../config/constants';
import { obtenerDepartamentos, obtenerProvincias, obtenerDistritos } from '../../services/ubigeoService';
import { menuPorRol } from '../../config/menuItems';
import usePuntosStore from '../../store/puntosStore';
import toast from 'react-hot-toast';

const RUTA_PROXIMOS_INGRESOS = menuPorRol.CLIENTE?.find(i => i.label === 'Próx. Ingresos')?.path || '/cliente/proximos-ingresos';

function getProductImages(producto) {
  const mediaArr = producto.tbl_media_producto || producto.media || [];
  const fotos = mediaArr.filter(m => m.tipo === 'foto');
  if (fotos.length === 0) return null;
  return fotos.map(m => buildMediaUrl(m.url_archivo)).filter(Boolean);
}

function ResilientImage({ producto, className = '' }) {
  const [imgIndex, setImgIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const urls = getProductImages(producto);

  const handleError = useCallback(() => {
    if (urls && imgIndex < urls.length - 1) {
      setImgIndex(prev => prev + 1);
    } else {
      setFailed(true);
    }
  }, [urls, imgIndex]);

  if (!urls || urls.length === 0 || failed) {
    return <HiOutlineShoppingCart className="w-12 h-12 text-steel-500" />;
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

export default function Catalogo() {
  const navigate = useNavigate();
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [carrito, setCarrito] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rasek_carrito') || '[]'); } catch { return []; }
  });
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const { saldo: misPuntos, refrescar: refrescarPuntos } = usePuntosStore();
  const [puntosAplicar, setPuntosAplicar] = useState(0);
  const [configPuntos, setConfigPuntos] = useState(null);
  const [modalCompra, setModalCompra] = useState(false);
  const [vendedores, setVendedores] = useState([]);
  const [transportistas, setTransportistas] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [cargandoUbigeo, setCargandoUbigeo] = useState(false);
  const [formCompra, setFormCompra] = useState({
    vendedor_user_id: '',
    tipo_entrega: TIPO_ENTREGA.ENVIO_POR_AGENCIA,
    tipo_destino: TIPO_DESTINO.LIMA,
    transportista_id: '',
    departamento_id: '',
    provincia_id: '',
    distrito_id: '',
    metodo_pago: METODOS_PAGO.TRANSFERENCIA,
  });
  const [voucherFile, setVoucherFile] = useState(null);
  const [montoPago, setMontoPago] = useState('');
  const [enviandoCompra, setEnviandoCompra] = useState(false);

  useEffect(() => { localStorage.setItem('rasek_carrito', JSON.stringify(carrito)); }, [carrito]);

  useEffect(() => {
    const cargar = async () => {
      try {
        const { data } = await api.get('/productos/catalogo-web');
        const lista = Array.isArray(data) ? data : [];
        setProductos(lista);
        const cats = [...new Set(lista.map(p => p.tbl_categorias_producto?.nombre).filter(Boolean))];
        setCategorias(cats);
      } catch {
        try {
          const { data } = await api.get('/productos');
          const publicados = (Array.isArray(data) ? data : []).filter(p => p.publicado_web);
          setProductos(publicados);
          const cats = [...new Set(publicados.map(p => p.tbl_categorias_producto?.nombre).filter(Boolean))];
          setCategorias(cats);
        } catch { /* */ }
      } finally {
        setCargando(false);
      }
    };
    cargar();
    refrescarPuntos();
    api.get('/puntos/config').then(r => { setConfigPuntos(r.data); }).catch(() => {});
    api.get('/ventas/vendedores-activos').then(r => setVendedores(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      const matchBusqueda = !busqueda || p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || p.descripcion?.toLowerCase().includes(busqueda.toLowerCase());
      const matchCategoria = !categoriaFiltro || p.tbl_categorias_producto?.nombre === categoriaFiltro;
      return matchBusqueda && matchCategoria;
    });
  }, [productos, busqueda, categoriaFiltro]);

  const agregarAlCarrito = (producto) => {
    const existe = carrito.find(c => c.id === producto.id);
    if (existe) {
      setCarrito(carrito.map(c => c.id === producto.id ? { ...c, cantidad: c.cantidad + 1 } : c));
    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1 }]);
    }
    toast.success(`${producto.nombre} agregado al carrito`);
  };

  const cambiarCantidad = (id, delta) => {
    setCarrito(carrito.map(c => {
      if (c.id === id) {
        const nueva = c.cantidad + delta;
        return nueva > 0 ? { ...c, cantidad: nueva } : c;
      }
      return c;
    }));
  };

  const removerDelCarrito = (id) => setCarrito(carrito.filter(c => c.id !== id));

  const totalCarrito = carrito.reduce((sum, c) => sum + (c.precio_catalogo || c.precio_venta_base || 0) * c.cantidad, 0);
  const totalItems = carrito.reduce((sum, c) => sum + c.cantidad, 0);
  const descuentoPuntosCalc = puntosAplicar * parseFloat(configPuntos?.valor_soles_por_punto_canje || 0);
  const totalAPagar = Math.max(totalCarrito - descuentoPuntosCalc, 0);

  const limaDeptoId = useMemo(() => {
    const lima = departamentos.find((d) => (d.nombre || '').toLowerCase().trim() === 'lima');
    return lima ? String(lima.id) : '';
  }, [departamentos]);

  const departamentosFiltrados = useMemo(() => {
    if (!limaDeptoId) return departamentos;
    if (formCompra.tipo_destino === TIPO_DESTINO.LIMA) {
      return departamentos.filter((d) => String(d.id) === limaDeptoId);
    }
    return departamentos.filter((d) => String(d.id) !== limaDeptoId);
  }, [departamentos, formCompra.tipo_destino, limaDeptoId]);

  useEffect(() => {
    if (!modalCompra) return;
    if (formCompra.tipo_entrega !== TIPO_ENTREGA.ENVIO_POR_AGENCIA) return;
    if (!limaDeptoId) return;
    if (formCompra.tipo_destino === TIPO_DESTINO.LIMA) {
      if (String(formCompra.departamento_id) !== limaDeptoId) {
        handleDepartamentoChange(limaDeptoId);
      }
    } else if (formCompra.tipo_destino === TIPO_DESTINO.PROVINCIA) {
      if (String(formCompra.departamento_id) === limaDeptoId) {
        handleDepartamentoChange('');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formCompra.tipo_destino, formCompra.tipo_entrega, limaDeptoId, modalCompra]);

  const enviarCotizacion = async () => {
    if (carrito.length === 0) return;
    try {
      await api.post('/cotizaciones-web', {
        items: carrito.map(c => ({ product_id: c.id, cantidad: c.cantidad, precio_unitario: c.precio_catalogo || c.precio_venta_base }))
      });
      toast.success('Cotización enviada exitosamente');
      setCarrito([]);
      setCarritoAbierto(false);
    } catch (err) { toast.error(err.response?.data?.error || 'Error al enviar cotización'); }
  };

  const abrirModalCompra = async () => {
    if (carrito.length === 0) return;
    setModalCompra(true);
    setCargandoUbigeo(true);
    try {
      const [transp, deps] = await Promise.all([
        api.get('/transportistas'),
        obtenerDepartamentos(),
      ]);
      setTransportistas(Array.isArray(transp.data) ? transp.data : []);
      setDepartamentos(Array.isArray(deps.data) ? deps.data : []);
    } catch {
      setTransportistas([]);
      setDepartamentos([]);
    }
    setProvincias([]);
    setDistritos([]);
    setCargandoUbigeo(false);
  };

  const handleDepartamentoChange = async (depId) => {
    setFormCompra(prev => ({ ...prev, departamento_id: depId, provincia_id: '', distrito_id: '' }));
    setProvincias([]);
    setDistritos([]);
    if (!depId) return;
    try {
      const { data } = await obtenerProvincias(depId);
      setProvincias(Array.isArray(data) ? data : []);
    } catch {
      setProvincias([]);
    }
  };

  const handleProvinciaChange = async (provId) => {
    setFormCompra(prev => ({ ...prev, provincia_id: provId, distrito_id: '' }));
    setDistritos([]);
    if (!provId) return;
    try {
      const { data } = await obtenerDistritos(provId);
      setDistritos(Array.isArray(data) ? data : []);
    } catch {
      setDistritos([]);
    }
  };

  const enviarCompra = async () => {
    if (!formCompra.vendedor_user_id) return toast.error('Selecciona un vendedor');
    if (!voucherFile) return toast.error('Adjunta el voucher de pago');

    if (formCompra.tipo_entrega === TIPO_ENTREGA.ENVIO_POR_AGENCIA) {
      if (!formCompra.transportista_id) return toast.error('Selecciona la agencia transportista');
      if (!formCompra.departamento_id || !formCompra.provincia_id || !formCompra.distrito_id) {
        return toast.error('Selecciona departamento, provincia y distrito');
      }
    }

    if (montoPago !== '') {
      const montoIngresado = parseFloat(montoPago);
      if (Number.isNaN(montoIngresado) || montoIngresado <= 0) {
        return toast.error('El monto a pagar debe ser mayor a 0');
      }
      if (montoIngresado > totalAPagar) {
        return toast.error(`El monto a pagar no puede exceder el total (${formatearMoneda(totalAPagar)})`);
      }
    }

    setEnviandoCompra(true);
    try {
      const descuentoPuntos = puntosAplicar * parseFloat(configPuntos?.valor_soles_por_punto_canje || 0);
      const montoFinal = montoPago ? parseFloat(montoPago) : totalAPagar;

      const fd = new FormData();
      fd.append('tipo_entrega', formCompra.tipo_entrega);
      fd.append('tipo_destino', formCompra.tipo_destino);
      fd.append('vendedor_user_id', formCompra.vendedor_user_id);
      if (formCompra.tipo_entrega === TIPO_ENTREGA.ENVIO_POR_AGENCIA) {
        fd.append('transportista_id', formCompra.transportista_id);
        fd.append('departamento_id', formCompra.departamento_id);
        fd.append('provincia_id', formCompra.provincia_id);
        fd.append('distrito_id', formCompra.distrito_id);
      }
      if (descuentoPuntos > 0) fd.append('descuento_puntos', descuentoPuntos.toString());
      fd.append('monto_pago', montoFinal.toString());
      fd.append('metodo_pago', formCompra.metodo_pago);
      fd.append('items', JSON.stringify(
        carrito.map(c => ({ product_id: c.id, cantidad: c.cantidad, precio_unitario: c.precio_catalogo || c.precio_venta_base }))
      ));
      fd.append('voucher', voucherFile);

      await api.post('/ventas/cliente', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Compra registrada. Pendiente de aprobacion.');
      setCarrito([]);
      setCarritoAbierto(false);
      setModalCompra(false);
      setVoucherFile(null);
      setMontoPago('');
      setPuntosAplicar(0);
      setFormCompra({
        vendedor_user_id: '',
        tipo_entrega: TIPO_ENTREGA.ENVIO_POR_AGENCIA,
        tipo_destino: TIPO_DESTINO.LIMA,
        transportista_id: '',
        departamento_id: '',
        provincia_id: '',
        distrito_id: '',
        metodo_pago: METODOS_PAGO.TRANSFERENCIA,
      });
      setProvincias([]);
      setDistritos([]);
      refrescarPuntos();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar la compra');
    } finally {
      setEnviandoCompra(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between sm:mb-8 sm:gap-4">
        <h1 className="section-title-chromium">Catalogo de Productos</h1>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => navigate(RUTA_PROXIMOS_INGRESOS)}
            className="btn-secondary flex items-center justify-center gap-2 text-xs sm:text-sm flex-1 sm:flex-none whitespace-nowrap px-3"
          >
            <HiOutlineClock className="w-5 h-5 shrink-0" />
            <span className="hidden sm:inline">Proximos Ingresos</span>
            <span className="sm:hidden">Ingresos</span>
          </button>
          <button
            onClick={() => setCarritoAbierto(true)}
            className="btn-primary flex items-center justify-center gap-2 relative flex-1 sm:flex-none whitespace-nowrap px-3 text-xs sm:text-sm"
          >
            <HiOutlineShoppingCart className="w-5 h-5 shrink-0" /> Carrito
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold animate-pulse">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Busqueda y filtros */}
      <div className="card-chromium mb-6 sm:mb-8 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
          <div className="relative flex-1 sm:min-w-[200px]">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-500" />
            <input
              className="input-chromium w-full pl-9"
              placeholder="Buscar productos..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
          <select
            className="input-chromium w-full sm:w-auto"
            value={categoriaFiltro}
            onChange={e => setCategoriaFiltro(e.target.value)}
          >
            <option value="">Todas las categorias</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Grid de productos */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
        {productosFiltrados.map((prod) => (
          <div key={prod.id} className="card-chromium card-tilt group flex flex-col !p-3 sm:!p-6">
            {/* Imagen con overlay */}
            <div
              className="aspect-square bg-steel-900/60 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative cursor-pointer"
              onClick={() => navigate(`/catalogo/${prod.id}`)}
            >
              <ResilientImage producto={prod} className="object-cover w-full h-full rounded-lg transition-transform duration-500 group-hover:scale-105" />
              {/* Gradient overlay al hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg pointer-events-none" />
              {/* Boton flotante agregar */}
              <button
                onClick={(e) => { e.stopPropagation(); agregarAlCarrito(prod); }}
                className="absolute bottom-2 right-2 bg-primary-500 text-white p-2.5 rounded-full shadow-lg shadow-primary-500/25 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-primary-600 hover:scale-110"
              >
                <HiOutlinePlus className="w-5 h-5" />
              </button>
            </div>

            {/* Categoria label */}
            {prod.tbl_categorias_producto?.nombre && (
              <span className="label-chromium self-start mb-2">
                {prod.tbl_categorias_producto.nombre}
              </span>
            )}

            {/* Nombre */}
            <h3
              className="font-semibold text-steel-100 text-sm mb-1 cursor-pointer hover:text-primary-400 transition-colors duration-200"
              onClick={() => navigate(`/catalogo/${prod.id}`)}
            >
              {prod.nombre}
            </h3>

            {/* Descripcion */}
            <p className="text-xs text-steel-400 mb-3 line-clamp-2 flex-1">
              {prod.descripcion || 'Sin descripcion'}
            </p>

            {/* Precio */}
            <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
              <p className="text-lg font-bold text-primary-500 num-chromium">
                {formatearMoneda(prod.precio_catalogo || prod.precio_venta_base)}
              </p>
            </div>

            {/* Boton agregar */}
            <button
              onClick={() => agregarAlCarrito(prod)}
              className="btn-primary w-full text-sm flex items-center justify-center gap-2"
            >
              <HiOutlineShoppingCart className="w-4 h-4" /> Agregar
            </button>
          </div>
        ))}
        {productosFiltrados.length === 0 && (
          <p className="text-steel-400 col-span-full text-center py-12">No se encontraron productos.</p>
        )}
      </div>

      {/* Panel Carrito (portal lateral) */}
      {carritoAbierto && createPortal(
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setCarritoAbierto(false)} />
          <div className="fixed right-0 top-0 h-screen w-full max-w-sm sm:w-96 bg-gradient-to-b from-steel-800 via-steel-850 to-steel-800 border-l-2 border-primary-500/30 shadow-2xl z-50 flex flex-col animate-slide-in-right">
            {/* Header carrito */}
            <div className="flex items-center justify-between p-4 border-b border-steel-700/50">
              <h2 className="text-lg font-semibold text-steel-100 tracking-wide">
                Carrito <span className="num-chromium text-primary-400">({totalItems})</span>
              </h2>
              <button onClick={() => setCarritoAbierto(false)} className="text-steel-500 hover:text-steel-200 transition-colors">
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            {/* Items del carrito */}
            <div className="flex-1 overflow-y-auto p-4">
              {carrito.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-steel-500">
                  <HiOutlineShoppingCart className="w-12 h-12 mb-3 opacity-40" />
                  <p className="text-sm">Carrito vacio</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {carrito.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-steel-900/50 rounded-lg border border-steel-700/30 hover:border-steel-600/40 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-steel-100 truncate">{item.nombre}</p>
                        <p className="text-xs text-steel-400 num-chromium">{formatearMoneda(item.precio_catalogo || item.precio_venta_base)} c/u</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => cambiarCantidad(item.id, -1)}
                          className="w-7 h-7 rounded-md bg-steel-700/80 flex items-center justify-center hover:bg-steel-600 transition-colors"
                        >
                          <HiOutlineMinus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-semibold w-7 text-center num-chromium text-steel-100">{item.cantidad}</span>
                        <button
                          onClick={() => cambiarCantidad(item.id, 1)}
                          className="w-7 h-7 rounded-md bg-steel-700/80 flex items-center justify-center hover:bg-steel-600 transition-colors"
                        >
                          <HiOutlinePlus className="w-3 h-3" />
                        </button>
                      </div>
                      <button onClick={() => removerDelCarrito(item.id)} className="text-red-500/70 hover:text-red-400 transition-colors ml-1">
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer carrito */}
            {carrito.length > 0 && (
              <div className="p-4 border-t border-steel-700/50 space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="font-medium text-steel-300">Total:</span>
                  <span className="num-chromium text-2xl font-bold text-primary-500">{formatearMoneda(totalCarrito)}</span>
                </div>

                {misPuntos > 0 && configPuntos && (
                  <div className="border-t border-steel-700/40 pt-3">
                    <label className="block text-sm font-medium text-steel-200 mb-1.5">Usar puntos ({misPuntos} disponibles)</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        min="0"
                        max={misPuntos}
                        className="input-chromium w-24 text-sm"
                        value={puntosAplicar}
                        onChange={e => setPuntosAplicar(Math.min(parseInt(e.target.value) || 0, misPuntos))}
                      />
                      <span className="text-xs text-steel-400">= <span className="num-chromium">{formatearMoneda((puntosAplicar * parseFloat(configPuntos.valor_soles_por_punto_canje || 0)))}</span> descuento</span>
                    </div>
                  </div>
                )}

                <button onClick={enviarCotizacion} className="btn-primary w-full">Enviar Cotizacion</button>
                <p className="text-xs text-steel-500 text-center">Se enviara como cotizacion web</p>
                <button onClick={abrirModalCompra} className="btn-primary w-full bg-emerald-600 hover:bg-emerald-700">
                  Comprar Ahora
                </button>
                <p className="text-xs text-steel-500 text-center">Compra directa con voucher de pago</p>
              </div>
            )}
          </div>
        </>,
        document.body
      )}

      {/* Modal de Compra */}
      {modalCompra && createPortal(
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setModalCompra(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border-2 border-steel-700 relative">
              {/* Linea roja superior decorativa */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600 rounded-t-xl" />

              {/* Header modal */}
              <div className="flex items-center justify-between p-4 border-b-2 border-steel-700 bg-white">
                <h2 className="text-lg font-bold text-steel-100 tracking-wide">Confirmar Compra</h2>
                <button onClick={() => setModalCompra(false)} className="text-steel-200 hover:text-primary-600 transition-colors">
                  <HiOutlineX className="w-5 h-5" />
                </button>
              </div>

              {/* Body modal */}
              <div className="p-5 space-y-4 bg-white">
                {/* Vendedor */}
                <div>
                  <label className="block text-sm font-semibold text-steel-100 mb-1.5">Vendedor *</label>
                  <select
                    className="input-chromium w-full"
                    value={formCompra.vendedor_user_id}
                    onChange={e => setFormCompra({ ...formCompra, vendedor_user_id: e.target.value })}
                  >
                    <option value="">Seleccionar vendedor</option>
                    {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombres}</option>)}
                  </select>
                </div>

                {/* Tipo de Entrega */}
                <div>
                  <label className="block text-sm font-semibold text-steel-100 mb-1.5">Tipo de Entrega *</label>
                  <select
                    className="input-chromium w-full"
                    value={formCompra.tipo_entrega}
                    onChange={e => setFormCompra({
                      ...formCompra,
                      tipo_entrega: e.target.value,
                      transportista_id: '',
                      departamento_id: '',
                      provincia_id: '',
                      distrito_id: '',
                    })}
                  >
                    <option value={TIPO_ENTREGA.ENVIO_POR_AGENCIA}>Envio por Agencia</option>
                    <option value={TIPO_ENTREGA.RETIRO_EN_TIENDA}>Retiro en Tienda</option>
                  </select>
                </div>

                {formCompra.tipo_entrega === TIPO_ENTREGA.ENVIO_POR_AGENCIA && (
                  <>
                    {/* Tipo de Destino */}
                    <div>
                      <label className="block text-sm font-semibold text-steel-100 mb-1.5">Tipo de Destino *</label>
                      <select
                        className="input-chromium w-full"
                        value={formCompra.tipo_destino}
                        onChange={e => setFormCompra({ ...formCompra, tipo_destino: e.target.value })}
                      >
                        <option value={TIPO_DESTINO.LIMA}>Lima</option>
                        <option value={TIPO_DESTINO.PROVINCIA}>Provincia</option>
                      </select>
                    </div>

                    {/* Agencia Transportista */}
                    <div>
                      <label className="block text-sm font-semibold text-steel-100 mb-1.5">Agencia Transportista *</label>
                      <select
                        className="input-chromium w-full"
                        value={formCompra.transportista_id}
                        onChange={e => setFormCompra({ ...formCompra, transportista_id: e.target.value })}
                        required
                      >
                        <option value="">Seleccionar agencia...</option>
                        {transportistas.map(t => (
                          <option key={t.id} value={t.id}>{t.nombre}</option>
                        ))}
                      </select>
                    </div>

                    {/* Cascada Departamento → Provincia → Distrito */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-steel-100 mb-1.5">Departamento *</label>
                        <select
                          className="input-chromium w-full"
                          value={formCompra.departamento_id}
                          onChange={e => handleDepartamentoChange(e.target.value)}
                          disabled={cargandoUbigeo || formCompra.tipo_destino === TIPO_DESTINO.LIMA}
                          title={formCompra.tipo_destino === TIPO_DESTINO.LIMA ? 'Fijado por Tipo de Destino = Lima' : undefined}
                          required
                        >
                          <option value="">{cargandoUbigeo ? 'Cargando...' : 'Seleccionar...'}</option>
                          {departamentosFiltrados.map(d => (
                            <option key={d.id} value={d.id}>{d.nombre}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-steel-100 mb-1.5">Provincia *</label>
                        <select
                          className="input-chromium w-full"
                          value={formCompra.provincia_id}
                          onChange={e => handleProvinciaChange(e.target.value)}
                          disabled={!formCompra.departamento_id}
                          required
                        >
                          <option value="">{formCompra.departamento_id ? 'Seleccionar...' : 'Elija departamento'}</option>
                          {provincias.map(p => (
                            <option key={p.id} value={p.id}>{p.nombre}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-steel-100 mb-1.5">Distrito *</label>
                        <select
                          className="input-chromium w-full"
                          value={formCompra.distrito_id}
                          onChange={e => setFormCompra({ ...formCompra, distrito_id: e.target.value })}
                          disabled={!formCompra.provincia_id}
                          required
                        >
                          <option value="">{formCompra.provincia_id ? 'Seleccionar...' : 'Elija provincia'}</option>
                          {distritos.map(d => (
                            <option key={d.id} value={d.id}>{d.nombre}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* Puntos */}
                {misPuntos > 0 && configPuntos && (
                  <div>
                    <label className="block text-sm font-semibold text-steel-100 mb-1.5">Descuento por Puntos ({misPuntos} disponibles)</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        min="0"
                        max={misPuntos}
                        className="input-chromium w-24 text-sm"
                        value={puntosAplicar}
                        onChange={e => setPuntosAplicar(Math.min(parseInt(e.target.value) || 0, misPuntos))}
                      />
                      <span className="text-xs text-steel-200 font-medium">= <span className="num-chromium text-steel-100 font-bold">{formatearMoneda(puntosAplicar * parseFloat(configPuntos.valor_soles_por_punto_canje || 0))}</span> descuento</span>
                    </div>
                  </div>
                )}

                {/* Resumen de precios */}
                <div className="bg-steel-900 rounded-lg p-4 border-2 border-steel-700">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-steel-200 font-medium">Subtotal:</span>
                    <span className="num-chromium text-steel-100 font-bold">{formatearMoneda(totalCarrito)}</span>
                  </div>
                  {puntosAplicar > 0 && configPuntos && (
                    <div className="flex justify-between text-sm text-emerald-700 font-semibold">
                      <span>Descuento puntos:</span>
                      <span className="num-chromium">-{formatearMoneda(descuentoPuntosCalc)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold mt-2 pt-2 border-t-2 border-steel-700">
                    <span className="text-steel-100">Total a pagar:</span>
                    <span className="text-primary-600 num-chromium text-lg">
                      {formatearMoneda(totalAPagar)}
                    </span>
                  </div>
                </div>

                {/* Monto a pagar */}
                <div>
                  <label className="block text-sm font-semibold text-steel-100 mb-1.5">Monto a pagar *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={totalAPagar}
                    className="input-chromium w-full"
                    placeholder={totalAPagar > 0 ? formatearMoneda(totalAPagar) : '0.00'}
                    value={montoPago}
                    onChange={e => setMontoPago(e.target.value)}
                  />
                  <p className="text-xs text-steel-200 mt-1 font-medium">
                    Puedes realizar un adelanto, pago parcial o el pago completo. Si dejas vacio se registra el total.
                  </p>
                </div>

                {/* Metodo de pago */}
                <div>
                  <label className="block text-sm font-semibold text-steel-100 mb-1.5">Metodo de pago *</label>
                  <select
                    className="input-chromium w-full"
                    value={formCompra.metodo_pago}
                    onChange={e => setFormCompra({ ...formCompra, metodo_pago: e.target.value })}
                  >
                    {Object.entries(METODOS_PAGO_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Voucher */}
                <div>
                  <label className="block text-sm font-semibold text-steel-100 mb-1.5">Voucher de Pago *</label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="input-chromium w-full text-sm"
                    onChange={e => setVoucherFile(e.target.files[0] || null)}
                  />
                  {voucherFile && <p className="text-xs text-emerald-700 font-semibold mt-1">{voucherFile.name}</p>}
                </div>

                {/* Mensaje informativo */}
                <div className="p-3 bg-blue-700 border border-blue-800 rounded-lg shadow-md">
                  <p className="text-xs text-white font-semibold leading-snug">
                    Tu voucher sera validado por tu asesor de ventas para confirmar tu pago. El estado de tu pedido se actualizara una vez verificado.
                  </p>
                </div>

                {/* Boton confirmar */}
                <button
                  onClick={enviarCompra}
                  disabled={enviandoCompra}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {enviandoCompra ? 'Registrando...' : 'Confirmar Compra'}
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
