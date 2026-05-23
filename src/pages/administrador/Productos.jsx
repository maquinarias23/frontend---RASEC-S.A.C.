import { useState, useEffect } from 'react';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch, HiOutlineGlobe, HiOutlineEye, HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineX, HiOutlineUpload, HiOutlineTag, HiOutlineCheck, HiOutlinePlay } from 'react-icons/hi';
import useCrud from '../../hooks/useCrud';
import usePaginacion from '../../hooks/usePaginacion';
import TablaGenerica from '../../components/ui/TablaGenerica';
import Modal from '../../components/ui/Modal';
import Paginacion from '../../components/ui/Paginacion';
import DialogConfirmacion from '../../components/ui/DialogConfirmacion';
import { formatearMoneda } from '../../utils/formato';
import { buildMediaUrl } from '../../utils/media';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import {
  TIPO_MEDIA, MEDIA_PRODUCTO,
  UNIDAD_MEDIDA, UNIDAD_MEDIDA_LABEL,
  TIPO_IGV, TIPO_IGV_LABEL,
} from '../../config/constants';

const columnas = [
  { key: 'id', label: 'ID' },
  { key: 'nombre', label: 'Nombre' },
  { key: 'categoria', label: 'Categoría', render: (f) => f.tbl_categorias_producto?.nombre || '-' },
  { key: 'precio_venta_base', label: 'P. Mínimo', render: (f) => formatearMoneda(f.precio_venta_base) },
  { key: 'precio_vendedor', label: 'P. Vendedor', render: (f) => f.precio_vendedor ? formatearMoneda(f.precio_vendedor) : <span className="text-steel-500">—</span> },
  { key: 'precio_catalogo', label: 'P. Catálogo', render: (f) => f.precio_catalogo ? formatearMoneda(f.precio_catalogo) : <span className="text-steel-500">—</span> },
  { key: 'precio_mayorista', label: 'P. Mayorista', render: (f) => f.precio_mayorista ? formatearMoneda(f.precio_mayorista) : <span className="text-steel-500">—</span> },
  { key: 'publicado_web', label: 'Web', render: (f) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${f.publicado_web ? 'bg-emerald-100 text-emerald-600' : 'bg-steel-800 text-steel-400'}`}>
      {f.publicado_web ? 'Publicado' : 'Oculto'}
    </span>
  )},
  { key: 'media', label: 'Media', render: (f) => f.media?.length || 0 },
];

const formInicial = {
  nombre: '', descripcion: '', precio_venta_base: '', precio_vendedor: '',
  precio_catalogo: '', precio_mayorista: '', categoria_id: '', publicado_web: false,
  unidad_medida: UNIDAD_MEDIDA.UNIDADES,
  tipo_afectacion_igv: TIPO_IGV.GRAVADO,
};

export default function Productos() {
  const { datos, cargando, listar } = useCrud('/productos');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(formInicial);
  const [categorias, setCategorias] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [confirmEliminar, setConfirmEliminar] = useState(null);

  // Preview de imagen
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImages, setPreviewImages] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewNombre, setPreviewNombre] = useState('');

  // Media (foto + video) inline en modal crear/editar
  const [mediaExistente, setMediaExistente] = useState([]);
  const [mediaNueva, setMediaNueva] = useState([]);
  const [mediaEliminada, setMediaEliminada] = useState([]);

  // Gestión de categorías
  const [modalCategorias, setModalCategorias] = useState(false);
  const [catNueva, setCatNueva] = useState('');
  const [catEditando, setCatEditando] = useState(null);
  const [catEditNombre, setCatEditNombre] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Secciones descriptivas del producto
  const [secciones, setSecciones] = useState([]);

  useEffect(() => {
    api.get('/productos/categorias').then(r => setCategorias(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const datosFiltrados = datos.filter(d => {
    const matchBusqueda = !busqueda || d.nombre?.toLowerCase().includes(busqueda.toLowerCase());
    const matchCategoria = !filtroCategoria || d.tbl_categorias_producto?.nombre === filtroCategoria;
    return matchBusqueda && matchCategoria;
  });

  const { datosPaginados, paginaActual, totalPaginas, irAPagina } = usePaginacion(datosFiltrados);

  const abrirCrear = () => {
    setEditando(null);
    setForm(formInicial);
    setMediaExistente([]);
    setMediaNueva([]);
    setMediaEliminada([]);
    setSecciones([]);
    setModal(true);
  };

  const abrirEditar = async (prod) => {
    setEditando(prod);
    setForm({
      nombre: prod.nombre,
      descripcion: prod.descripcion || '',
      precio_venta_base: prod.precio_venta_base,
      precio_vendedor: prod.precio_vendedor || '',
      precio_catalogo: prod.precio_catalogo || '',
      precio_mayorista: prod.precio_mayorista || '',
      categoria_id: prod.categoria_id?.toString() || '',
      publicado_web: prod.publicado_web,
      unidad_medida: prod.unidad_medida || UNIDAD_MEDIDA.UNIDADES,
      tipo_afectacion_igv: prod.tipo_afectacion_igv || TIPO_IGV.GRAVADO,
    });
    setMediaNueva([]);
    setMediaEliminada([]);
    // Cargar secciones existentes del producto
    const seccionesExistentes = (prod.secciones || []).map(s => ({
      nombre: s.nombre,
      campos: (s.campos || []).map(c => ({ clave: c.clave, valor: c.valor })),
    }));
    setSecciones(seccionesExistentes);
    try {
      const { data } = await api.get(`/productos/${prod.id}/media`);
      setMediaExistente(Array.isArray(data) ? data : []);
    } catch { setMediaExistente([]); }
    setModal(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      // Filtrar secciones vacías y campos vacíos
      const seccionesFiltradas = secciones
        .filter(s => s.nombre.trim())
        .map(s => ({
          nombre: s.nombre.trim(),
          campos: (s.campos || []).filter(c => c.clave.trim() && c.valor.trim()),
        }))
        .filter(s => s.campos.length > 0);

      const body = {
        ...form,
        categoria_id: parseInt(form.categoria_id),
        precio_venta_base: parseFloat(form.precio_venta_base),
        precio_vendedor: form.precio_vendedor ? parseFloat(form.precio_vendedor) : null,
        precio_catalogo: form.precio_catalogo ? parseFloat(form.precio_catalogo) : null,
        precio_mayorista: form.precio_mayorista ? parseFloat(form.precio_mayorista) : null,
        secciones: seccionesFiltradas,
      };

      let productoId;
      if (editando) {
        await api.put(`/productos/${editando.id}`, body);
        productoId = editando.id;
      } else {
        const { data } = await api.post('/productos', body);
        productoId = data.id;
      }

      let mediaError = null;
      try {
        for (const mediaId of mediaEliminada) {
          await api.delete(`/productos/${productoId}/media/${mediaId}`);
        }
        for (const item of mediaNueva) {
          const formData = new FormData();
          formData.append('archivo', item.file);
          formData.append('tipo', item.tipo);
          await api.post(`/productos/${productoId}/media`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
      } catch (err) {
        console.error('Error al guardar media del producto:', err);
        mediaError = err.response?.data?.error || 'No se pudieron guardar todas las imágenes/videos';
      }

      if (mediaError) {
        toast.error(`${editando ? 'Producto actualizado' : 'Producto creado'}, pero: ${mediaError}`);
      } else {
        toast.success(editando ? 'Producto actualizado' : 'Producto creado');
      }
      setModal(false);
      listar();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
    finally { setGuardando(false); }
  };

  const detectarTipoMedia = (file) => {
    if (file.type.startsWith(MEDIA_PRODUCTO.MIME_VIDEO_PREFIX)) return TIPO_MEDIA.VIDEO;
    if (file.type.startsWith(MEDIA_PRODUCTO.MIME_FOTO_PREFIX)) return TIPO_MEDIA.FOTO;
    return null;
  };

  const agregarMediaNueva = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    let baseExistentes = mediaExistente;
    let baseNuevas = mediaNueva;
    let baseEliminadas = mediaEliminada;
    const nuevosItems = [];

    for (const file of files) {
      const tipo = detectarTipoMedia(file);
      if (!tipo) {
        toast.error(MEDIA_PRODUCTO.MSG_TIPO_NO_SOPORTADO);
        continue;
      }

      if (tipo === TIPO_MEDIA.VIDEO) {
        const maxBytes = MEDIA_PRODUCTO.MAX_VIDEO_MB * 1024 * 1024;
        if (file.size > maxBytes) {
          toast.error(`${MEDIA_PRODUCTO.MSG_VIDEO_EXCEDE_TAMANIO} (${MEDIA_PRODUCTO.MAX_VIDEO_MB} MB)`);
          continue;
        }

        // Regla MAX_VIDEOS_POR_PRODUCTO: si ya hay un video (existente o nuevo), reemplazarlo
        const videoExistente = baseExistentes.find(m => m.tipo === TIPO_MEDIA.VIDEO);
        if (videoExistente) {
          baseExistentes = baseExistentes.filter(m => m.id !== videoExistente.id);
          baseEliminadas = [...baseEliminadas, videoExistente.id];
          toast(MEDIA_PRODUCTO.MSG_REEMPLAZA_VIDEO, { icon: '🎬' });
        }
        const videoNuevo = baseNuevas.find(m => m.tipo === TIPO_MEDIA.VIDEO);
        if (videoNuevo) {
          URL.revokeObjectURL(videoNuevo.preview);
          baseNuevas = baseNuevas.filter(m => m.id !== videoNuevo.id);
        }
      }

      nuevosItems.push({
        file,
        preview: URL.createObjectURL(file),
        id: `new-${Date.now()}-${Math.random()}`,
        tipo,
      });
    }

    if (baseExistentes !== mediaExistente) setMediaExistente(baseExistentes);
    if (baseEliminadas !== mediaEliminada) setMediaEliminada(baseEliminadas);
    setMediaNueva([...baseNuevas, ...nuevosItems]);
  };

  const quitarMediaExistente = (mediaId) => {
    setMediaEliminada(prev => [...prev, mediaId]);
    setMediaExistente(prev => prev.filter(f => f.id !== mediaId));
  };

  const quitarMediaNueva = (id) => {
    setMediaNueva(prev => {
      const item = prev.find(f => f.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter(f => f.id !== id);
    });
  };

  const eliminar = async () => {
    if (!confirmEliminar) return;
    try {
      await api.delete(`/productos/${confirmEliminar}`);
      toast.success('Producto eliminado');
      setConfirmEliminar(null);
      listar();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const togglePublicado = async (prod) => {
    try {
      await api.put(`/productos/${prod.id}`, { publicado_web: !prod.publicado_web });
      toast.success(prod.publicado_web ? 'Ocultado del catálogo' : 'Publicado en catálogo');
      listar();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const abrirPreview = async (prod) => {
    try {
      const { data } = await api.get(`/productos/${prod.id}/media`);
      const fotos = (Array.isArray(data) ? data : []).filter(m => m.tipo === TIPO_MEDIA.FOTO);
      if (fotos.length === 0) {
        toast('Este producto no tiene imágenes', { icon: '📷' });
        return;
      }
      setPreviewImages(fotos);
      setPreviewIndex(0);
      setPreviewNombre(prod.nombre);
      setPreviewOpen(true);
    } catch { toast.error('Error al cargar imágenes'); }
  };

  // ── CRUD Categorías ──
  const cargarCategorias = () => {
    api.get('/productos/categorias').then(r => setCategorias(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  };

  const crearCat = async () => {
    if (!catNueva.trim()) return;
    try {
      await api.post('/productos/categorias', { nombre: catNueva.trim() });
      setCatNueva('');
      cargarCategorias();
      toast.success('Categoría creada');
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const guardarEditCat = async () => {
    if (!catEditNombre.trim() || !catEditando) return;
    try {
      await api.put(`/productos/categorias/${catEditando}`, { nombre: catEditNombre.trim() });
      setCatEditando(null);
      setCatEditNombre('');
      cargarCategorias();
      listar();
      toast.success('Categoría actualizada');
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const eliminarCat = async (id) => {
    try {
      await api.delete(`/productos/categorias/${id}`);
      cargarCategorias();
      toast.success('Categoría eliminada');
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <h1 className="text-2xl font-bold font-display tracking-wider text-steel-100">Gestión de Productos</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setModalCategorias(true)} className="btn-secondary flex items-center gap-2">
            <HiOutlineTag className="w-4 h-4" /> Categorías
          </button>
          <button onClick={abrirCrear} className="btn-primary flex items-center gap-2">
            <HiOutlinePlus className="w-4 h-4" /> Nuevo Producto
          </button>
        </div>
      </div>

      {/* Búsqueda y filtros */}
      <div className="card mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-500" />
            <input className="input-field pl-9" placeholder="Buscar productos..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <select className="input-field w-auto" value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categorias.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <TablaGenerica columnas={columnas} datos={datosPaginados} cargando={cargando}
          acciones={(fila) => (
            <div className="flex gap-1">
              <button onClick={() => togglePublicado(fila)} className={`text-xs px-2 py-1 rounded ${fila.publicado_web ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' : 'bg-steel-800 text-steel-300 hover:bg-steel-700'}`} title="Toggle publicación">
                <HiOutlineGlobe className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => abrirPreview(fila)} className="text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded hover:bg-sky-200" title="Previsualizar imagen">
                <HiOutlineEye className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => abrirEditar(fila)} className="text-blue-600 hover:text-blue-700"><HiOutlinePencil className="w-4 h-4" /></button>
              <button onClick={() => setConfirmEliminar(fila.id)} className="text-red-600 hover:text-red-700"><HiOutlineTrash className="w-4 h-4" /></button>
            </div>
          )}
        />
        <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onChange={irAPagina} />
      </div>

      {/* Modal Crear/Editar */}
      <Modal abierto={modal} cerrar={() => setModal(false)} titulo={editando ? 'Editar Producto' : 'Nuevo Producto'} ancho="max-w-2xl">
        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">Nombre</label>
            <input className="input-field" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">Descripción</label>
            <textarea className="input-field" rows={3} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción del producto para la web (opcional)" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1">Categoría</label>
              <select className="input-field" value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })} required>
                <option value="">Seleccionar</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1">Precio mínimo (S/) *</label>
              <input type="number" step="0.01" className="input-field" value={form.precio_venta_base} onChange={(e) => setForm({ ...form, precio_venta_base: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-blue-600 mb-1">Precio vendedor (S/)</label>
              <input type="number" step="0.01" className="input-field" value={form.precio_vendedor} onChange={(e) => setForm({ ...form, precio_vendedor: e.target.value })} placeholder="Opcional" />
            </div>
            <div>
              <label className="block text-sm font-medium text-emerald-600 mb-1">Precio catálogo (S/)</label>
              <input type="number" step="0.01" className="input-field" value={form.precio_catalogo} onChange={(e) => setForm({ ...form, precio_catalogo: e.target.value })} placeholder="Opcional" />
            </div>
            <div>
              <label className="block text-sm font-medium text-amber-600 mb-1">Precio mayorista (S/)</label>
              <input type="number" step="0.01" className="input-field" value={form.precio_mayorista} onChange={(e) => setForm({ ...form, precio_mayorista: e.target.value })} placeholder="Opcional" />
            </div>
          </div>

          {/* Datos SUNAT para facturación electrónica */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-steel-700/40">
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1">Unidad de medida (SUNAT)</label>
              <select
                className="input-field"
                value={form.unidad_medida}
                onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })}
              >
                {Object.entries(UNIDAD_MEDIDA).map(([k, v]) => (
                  <option key={k} value={v}>{UNIDAD_MEDIDA_LABEL[v]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1">Afectación IGV (SUNAT)</label>
              <select
                className="input-field"
                value={form.tipo_afectacion_igv}
                onChange={(e) => setForm({ ...form, tipo_afectacion_igv: e.target.value })}
              >
                {Object.entries(TIPO_IGV).map(([k, v]) => (
                  <option key={k} value={v}>{TIPO_IGV_LABEL[v]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Media del producto (fotos + video) */}
          <div>
            <label className="block text-sm font-medium text-steel-200 mb-2">{MEDIA_PRODUCTO.LABEL_BLOQUE}</label>
            <div className="flex flex-wrap gap-3">
              {/* Media existente */}
              {mediaExistente.map(m => (
                <div key={m.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-steel-700 group">
                  {m.tipo === TIPO_MEDIA.VIDEO ? (
                    <div className="w-full h-full bg-steel-800 flex flex-col items-center justify-center">
                      <HiOutlinePlay className="w-6 h-6 text-steel-300" />
                      <span className="text-[9px] text-steel-400 mt-0.5">{MEDIA_PRODUCTO.BADGE_VIDEO}</span>
                    </div>
                  ) : (
                    <img src={buildMediaUrl(m.url_archivo)} alt="" className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => quitarMediaExistente(m.id)}
                    className="absolute inset-0 bg-red-600/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <HiOutlineX className="w-5 h-5 text-white" />
                  </button>
                </div>
              ))}
              {/* Media nueva (previews) */}
              {mediaNueva.map(f => (
                <div key={f.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-emerald-500/50 group">
                  {f.tipo === TIPO_MEDIA.VIDEO ? (
                    <video src={f.preview} className="w-full h-full object-cover" muted playsInline />
                  ) : (
                    <img src={f.preview} alt="" className="w-full h-full object-cover" />
                  )}
                  {f.tipo === TIPO_MEDIA.VIDEO && (
                    <span className="absolute top-0 left-0 right-0 bg-black/60 text-[9px] text-white text-center py-0.5 flex items-center justify-center gap-0.5">
                      <HiOutlinePlay className="w-2.5 h-2.5" /> {MEDIA_PRODUCTO.BADGE_VIDEO}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => quitarMediaNueva(f.id)}
                    className="absolute inset-0 bg-red-600/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <HiOutlineX className="w-5 h-5 text-white" />
                  </button>
                  <span className="absolute bottom-0 left-0 right-0 bg-emerald-600 text-[8px] text-white text-center">{MEDIA_PRODUCTO.BADGE_NUEVA}</span>
                </div>
              ))}
              {/* Botón agregar */}
              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-steel-600 hover:border-primary-500 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                <HiOutlineUpload className="w-5 h-5 text-steel-500 group-hover:text-primary-500 transition-colors" />
                <span className="text-[10px] text-steel-500 group-hover:text-primary-500 mt-0.5">Agregar</span>
                <input
                  type="file"
                  accept={MEDIA_PRODUCTO.ACCEPT_INPUT}
                  multiple
                  className="hidden"
                  onChange={agregarMediaNueva}
                />
              </label>
            </div>
            <p className="text-[11px] text-steel-500 mt-1">{MEDIA_PRODUCTO.AYUDA_BLOQUE}</p>
          </div>

          {/* Secciones descriptivas */}
          <div>
            <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
              <label className="block text-sm font-medium text-steel-200">Campos descriptivos (opcional)</label>
              <button
                type="button"
                onClick={() => setSecciones(prev => [...prev, { nombre: '', campos: [{ clave: '', valor: '' }] }])}
                className="text-xs text-primary-500 hover:text-primary-400 font-medium flex items-center gap-1"
              >
                <HiOutlinePlus className="w-3.5 h-3.5" /> Agregar sección
              </button>
            </div>
            {secciones.length === 0 && (
              <p className="text-[11px] text-steel-500">Sin secciones. Agrega secciones como "Especificaciones Técnicas", "Dimensiones", etc.</p>
            )}
            <div className="space-y-3">
              {secciones.map((sec, si) => (
                <div key={si} className="border border-steel-700 rounded-lg p-3 bg-steel-800/30">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      className="input-field flex-1 text-sm font-medium"
                      placeholder="Nombre de la sección (ej: Especificaciones Técnicas)"
                      value={sec.nombre}
                      onChange={(e) => {
                        const next = [...secciones];
                        next[si] = { ...next[si], nombre: e.target.value };
                        setSecciones(next);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setSecciones(prev => prev.filter((_, i) => i !== si))}
                      className="text-red-500 hover:text-red-400 p-1"
                      title="Eliminar sección"
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {(sec.campos || []).map((campo, ci) => (
                      <div key={ci} className="flex items-center gap-2">
                        <input
                          className="input-field flex-1 text-xs"
                          placeholder="Clave (ej: Capacidad)"
                          value={campo.clave}
                          onChange={(e) => {
                            const next = [...secciones];
                            next[si].campos[ci] = { ...next[si].campos[ci], clave: e.target.value };
                            setSecciones(next);
                          }}
                        />
                        <input
                          className="input-field flex-1 text-xs"
                          placeholder="Valor (ej: 15 kilos)"
                          value={campo.valor}
                          onChange={(e) => {
                            const next = [...secciones];
                            next[si].campos[ci] = { ...next[si].campos[ci], valor: e.target.value };
                            setSecciones(next);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...secciones];
                            next[si].campos = next[si].campos.filter((_, i) => i !== ci);
                            setSecciones(next);
                          }}
                          className="text-red-500 hover:text-red-400 p-0.5"
                        >
                          <HiOutlineX className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...secciones];
                      next[si].campos = [...(next[si].campos || []), { clave: '', valor: '' }];
                      setSecciones(next);
                    }}
                    className="text-[11px] text-primary-500 hover:text-primary-400 mt-2 flex items-center gap-1"
                  >
                    <HiOutlinePlus className="w-3 h-3" /> Agregar campo
                  </button>
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.publicado_web} onChange={(e) => setForm({ ...form, publicado_web: e.target.checked })} className="rounded" />
            Publicar en catálogo web
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={guardando}>
              {guardando && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {guardando ? 'Guardando...' : editando ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Lightbox Preview */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setPreviewOpen(false)}>
          <div className="relative max-w-4xl w-full mx-4" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
              <h3 className="text-white font-medium text-lg truncate pr-4">{previewNombre}</h3>
              <div className="flex items-center gap-3">
                <span className="text-steel-400 text-sm">{previewIndex + 1} / {previewImages.length}</span>
                <button onClick={() => setPreviewOpen(false)} className="text-steel-400 hover:text-white transition-colors">
                  <HiOutlineX className="w-6 h-6" />
                </button>
              </div>
            </div>
            {/* Imagen principal */}
            <div className="relative bg-steel-900 rounded-xl overflow-hidden flex items-center justify-center" style={{ minHeight: '400px' }}>
              <img
                src={buildMediaUrl(previewImages[previewIndex]?.url_archivo)}
                alt={`${previewNombre} - ${previewIndex + 1}`}
                className="max-h-[70vh] max-w-full object-contain"
                onError={(e) => { e.target.src = ''; e.target.alt = 'Error al cargar imagen'; }}
              />
              {/* Flechas de navegación */}
              {previewImages.length > 1 && (
                <>
                  <button
                    onClick={() => setPreviewIndex(i => i === 0 ? previewImages.length - 1 : i - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                  >
                    <HiOutlineChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => setPreviewIndex(i => i === previewImages.length - 1 ? 0 : i + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                  >
                    <HiOutlineChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>
            {/* Thumbnails */}
            {previewImages.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1 justify-center">
                {previewImages.map((m, i) => (
                  <button
                    key={m.id || i}
                    onClick={() => setPreviewIndex(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${i === previewIndex ? 'border-sky-500 ring-1 ring-sky-500/50' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <img src={buildMediaUrl(m.url_archivo)} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <DialogConfirmacion abierto={!!confirmEliminar} titulo="Eliminar Producto"
        mensaje="¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer."
        onConfirmar={eliminar} onCancelar={() => setConfirmEliminar(null)} tipo="peligro" />

      {/* ── Modal Gestión de Categorías ── */}
      <Modal abierto={modalCategorias} cerrar={() => { setModalCategorias(false); setCatEditando(null); setCatNueva(''); }} titulo="Gestión de Categorías">
          {/* Crear nueva */}
          <div className="flex gap-2 mb-4">
            <input
              className="input-field flex-1"
              placeholder="Nueva categoría..."
              value={catNueva}
              onChange={e => setCatNueva(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && crearCat()}
            />
            <button onClick={crearCat} disabled={!catNueva.trim()} className="btn-primary flex items-center gap-1.5 px-4">
              <HiOutlinePlus className="w-4 h-4" /> Agregar
            </button>
          </div>

          {/* Lista */}
          <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
            {categorias.length === 0 && <p className="text-steel-400 text-sm text-center py-4">No hay categorías</p>}
            {categorias.map(c => (
              <div key={c.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-steel-900/50 hover:bg-steel-800/50 transition-colors group">
                {catEditando === c.id ? (
                  <>
                    <input
                      className="input-field flex-1 py-1.5 text-sm"
                      value={catEditNombre}
                      onChange={e => setCatEditNombre(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && guardarEditCat()}
                      autoFocus
                    />
                    <button onClick={guardarEditCat} className="p-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 transition-colors">
                      <HiOutlineCheck className="w-4 h-4" />
                    </button>
                    <button onClick={() => setCatEditando(null)} className="p-1.5 rounded-md bg-steel-700 text-steel-300 hover:bg-steel-600 transition-colors">
                      <HiOutlineX className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-steel-200">{c.nombre}</span>
                    <button
                      onClick={() => { setCatEditando(c.id); setCatEditNombre(c.nombre); }}
                      className="p-1.5 rounded-md text-steel-400 hover:text-blue-400 hover:bg-steel-800 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <HiOutlinePencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => eliminarCat(c.id)}
                      className="p-1.5 rounded-md text-steel-400 hover:text-red-400 hover:bg-steel-800 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <HiOutlineTrash className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </Modal>
    </div>
  );
}
