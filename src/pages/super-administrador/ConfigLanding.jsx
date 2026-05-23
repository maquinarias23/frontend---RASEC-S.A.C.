import { useState, useEffect, useRef } from 'react';
import { HiOutlinePlus, HiOutlineTrash, HiOutlinePencil, HiOutlineCheck, HiOutlinePhotograph, HiOutlineX } from 'react-icons/hi';
import api from '../../api/axios';
import { buildMediaUrl } from '../../utils/media';
import { LANDING_SIDEBAR, LANDING_METODOS_COMPRA } from '../../config/constants';
import { LANDING_ICON_MAP, IconDefault } from '../../components/public/landingIconMap';
import IconPicker from '../../components/ui/IconPicker';
import toast from 'react-hot-toast';

const TABS = [
  { key: 'apariencia', label: 'Apariencia' },
  { key: 'nosotros', label: 'Nosotros' },
  { key: 'sidebar', label: 'Sidebar Izq' },
  { key: 'metodos', label: 'Cómo Comprar' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'faq', label: 'FAQ' },
];

// ── CRUD generico ───────────────────────────────────────────────────────
function CrudSection({ endpoint, fields, renderItem, onAfterSave }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    try {
      const { data } = await api.get(endpoint);
      setItems(data);
    } catch { /* */ }
  };

  useEffect(() => { cargar(); }, []);

  const emptyForm = () => fields.reduce((acc, f) => ({ ...acc, [f.key]: f.default || '' }), {});

  const abrir = (item) => {
    if (item) {
      setEditId(item.id);
      setForm(fields.reduce((acc, f) => ({ ...acc, [f.key]: item[f.key] || f.default || '' }), {}));
    } else {
      setEditId(null);
      setForm(emptyForm());
    }
  };

  const cerrar = () => { setForm(null); setEditId(null); };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      if (editId) {
        await api.put(`${endpoint}/${editId}`, form);
        toast.success('Actualizado');
      } else {
        const { data } = await api.post(endpoint, form);
        toast.success('Creado');
        if (onAfterSave) onAfterSave(data);
      }
      cerrar();
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    if (!confirm('Eliminar este registro?')) return;
    try {
      await api.delete(`${endpoint}/${id}`);
      toast.success('Eliminado');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const toggleActivo = async (item) => {
    try {
      await api.put(`${endpoint}/${item.id}`, { activo: !item.activo });
      cargar();
    } catch { /* */ }
  };

  return (
    <div>
      {items.length === 0 && !form && (
        <p className="text-sm text-steel-400 mb-4">No hay registros. Agrega el primero.</p>
      )}
      <div className="space-y-2 mb-4">
        {items.map((item) => (
          <div key={item.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${item.activo ? 'border-steel-700 bg-steel-900/30' : 'border-steel-800 bg-steel-900/10 opacity-50'}`}>
            <div className="flex-1 min-w-0">{renderItem(item)}</div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => toggleActivo(item)} className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${item.activo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-steel-700 text-steel-400'}`} title={item.activo ? 'Desactivar' : 'Activar'}>
                <HiOutlineCheck className="w-4 h-4" />
              </button>
              <button onClick={() => abrir(item)} className="w-7 h-7 rounded bg-steel-700 flex items-center justify-center text-steel-300 hover:text-primary-400 transition-colors">
                <HiOutlinePencil className="w-4 h-4" />
              </button>
              <button onClick={() => eliminar(item.id)} className="w-7 h-7 rounded bg-steel-700 flex items-center justify-center text-steel-300 hover:text-red-400 transition-colors">
                <HiOutlineTrash className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {form ? (
        <form onSubmit={guardar} className="space-y-3 p-4 rounded-lg border border-primary-500/30 bg-steel-900/50">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-steel-200 mb-1">{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea className="input-field w-full" rows={3} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} required={f.required} />
              ) : f.type === 'icon' ? (
                <IconPicker
                  value={form[f.key]}
                  onChange={(val) => setForm({ ...form, [f.key]: val })}
                  catalogo={f.catalogo}
                  categorias={f.categorias}
                />
              ) : (
                <input type={f.type || 'text'} className="input-field w-full" value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} required={f.required} />
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <button type="submit" disabled={guardando} className="btn-primary flex-1">{guardando ? 'Guardando...' : editId ? 'Actualizar' : 'Crear'}</button>
            <button type="button" onClick={cerrar} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      ) : (
        <button onClick={() => abrir(null)} className="btn-secondary w-full flex items-center justify-center gap-2">
          <HiOutlinePlus className="w-4 h-4" /> Agregar
        </button>
      )}
    </div>
  );
}

// ── Upload logo de cliente ──────────────────────────────────────────────
function LogoUploader({ clienteId, logoUrl, onUploaded }) {
  const fileRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const { data } = await api.post(`/config-landing/principales-clientes/${clienteId}/logo`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Logo actualizado');
      if (onUploaded) onUploaded(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al subir logo');
    } finally {
      setSubiendo(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-2 mt-1">
      {logoUrl && (
        <img src={buildMediaUrl(logoUrl)} alt="" className="w-8 h-8 rounded object-contain bg-white border border-steel-700" />
      )}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={subiendo}
        className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
      >
        <HiOutlinePhotograph className="w-4 h-4" />
        {subiendo ? 'Subiendo...' : logoUrl ? 'Cambiar logo' : 'Subir logo'}
      </button>
    </div>
  );
}

// ── VISTA: Apariencia (fondo de la landing) ─────────────────────────────
function TabApariencia() {
  const [fondoUrl, setFondoUrl] = useState(null);
  const [fondoPreview, setFondoPreview] = useState(null);
  const [fondoFile, setFondoFile] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    api.get('/config-landing').then(({ data }) => {
      if (data?.fondo_imagen_url) setFondoUrl(buildMediaUrl(data.fondo_imagen_url));
    }).catch(() => {});
  }, []);

  const onSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFondoFile(file);
    setFondoPreview(URL.createObjectURL(file));
  };

  const guardar = async () => {
    if (!fondoFile) return;
    setSubiendo(true);
    try {
      const formData = new FormData();
      formData.append('fondo_imagen', fondoFile);
      const { data } = await api.put('/config-landing/fondo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFondoUrl(buildMediaUrl(data.fondo_imagen_url));
      setFondoPreview(null);
      setFondoFile(null);
      toast.success('Fondo actualizado');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al subir');
    } finally {
      setSubiendo(false);
    }
  };

  const quitar = async () => {
    if (!fondoUrl) return;
    if (!confirm('Eliminar la imagen de fondo?')) return;
    setEliminando(true);
    try {
      await api.delete('/config-landing/fondo');
      setFondoUrl(null);
      setFondoPreview(null);
      setFondoFile(null);
      toast.success('Fondo eliminado');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
    } finally {
      setEliminando(false);
    }
  };

  const mostrar = fondoPreview || fondoUrl;

  return (
    <div className="card max-w-2xl">
      <h2 className="text-lg font-semibold mb-2">Fondo de la Landing Page</h2>
      <p className="text-sm text-steel-400 mb-4">
        Imagen de fondo que se muestra detrás de todo el contenido de la landing (fijo al hacer scroll). Se recomienda una textura industrial o patrón con baja saturación. Resolución mínima sugerida: 1920×1080. Si no hay imagen configurada, se usa el fondo gris por defecto.
      </p>

      {mostrar ? (
        <div className="relative mb-4 rounded-lg overflow-hidden border border-steel-700 bg-steel-900">
          <img src={mostrar} alt="Vista previa del fondo" className="w-full h-56 object-cover" />
          <div className="absolute bottom-2 left-2 text-[10px] text-white/80 bg-black/40 px-2 py-0.5 rounded">
            Vista previa
          </div>
        </div>
      ) : (
        <div className="mb-4 rounded-lg border-2 border-dashed border-steel-700 bg-steel-900/50 h-56 flex items-center justify-center">
          <p className="text-steel-500 text-sm">Sin fondo configurado (se usa color por defecto)</p>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onSelect}
      />
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="btn-secondary flex-1 min-w-[140px]"
        >
          <HiOutlinePhotograph className="w-4 h-4 inline-block mr-1" />
          {fondoUrl ? 'Cambiar fondo' : 'Seleccionar fondo'}
        </button>
        {fondoFile && (
          <button
            type="button"
            onClick={guardar}
            disabled={subiendo}
            className="btn-primary flex-1 min-w-[140px]"
          >
            <HiOutlineCheck className="w-4 h-4 inline-block mr-1" />
            {subiendo ? 'Subiendo...' : 'Guardar fondo'}
          </button>
        )}
        {fondoUrl && !fondoFile && (
          <button
            type="button"
            onClick={quitar}
            disabled={eliminando}
            className="btn-danger flex-1 min-w-[140px]"
          >
            <HiOutlineTrash className="w-4 h-4 inline-block mr-1" />
            {eliminando ? 'Eliminando...' : 'Quitar fondo'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── VISTA: Nosotros ─────────────────────────────────────────────────────
function TabNosotros() {
  const [form, setForm] = useState({ titulo: '', contenido: '', mision: '', vision: '' });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api.get('/config-landing').then(({ data }) => {
      if (data) setForm({
        titulo: data.quienes_somos_titulo || '',
        contenido: data.quienes_somos_contenido || '',
        mision: data.quienes_somos_mision || '',
        vision: data.quienes_somos_vision || '',
      });
    }).catch(() => {});
  }, []);

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await api.put('/config-landing/quienes-somos', form);
      toast.success('Quienes Somos actualizado');
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
    finally { setGuardando(false); }
  };

  return (
    <div className="card max-w-2xl">
      <h2 className="text-lg font-semibold mb-4">Quienes Somos</h2>
      <p className="text-sm text-steel-400 mb-4">Esta informacion aparece en la seccion "Nosotros" de la landing page.</p>
      <form onSubmit={guardar} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-steel-200 mb-1">Titulo de la seccion</label>
          <input className="input-field w-full" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ej: Quienes Somos" />
        </div>
        <div>
          <label className="block text-sm font-medium text-steel-200 mb-1">Descripcion de la empresa</label>
          <textarea className="input-field w-full" rows={5} value={form.contenido} onChange={e => setForm({ ...form, contenido: e.target.value })} placeholder="Somos una empresa dedicada a..." />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">Mision</label>
            <textarea className="input-field w-full" rows={4} value={form.mision} onChange={e => setForm({ ...form, mision: e.target.value })} placeholder="Nuestra mision es..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">Vision</label>
            <textarea className="input-field w-full" rows={4} value={form.vision} onChange={e => setForm({ ...form, vision: e.target.value })} placeholder="Nuestra vision es..." />
          </div>
        </div>
        <button type="submit" disabled={guardando} className="btn-primary">{guardando ? 'Guardando...' : 'Guardar'}</button>
      </form>
    </div>
  );
}

// ── VISTA: Sidebar Izquierdo (Fortalezas + Beneficios) ──────────────────
function ServicioItemCard({ item, onEdit, onDelete, onImageChange }) {
  const imgUrl = item.imagen_url ? buildMediaUrl(item.imagen_url) : null;
  const fileRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);

  const subirImagen = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.append('imagen', file);
      const { data } = await api.post(`/config-landing/servicios/${item.id}/imagen`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Imagen actualizada');
      onImageChange?.(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al subir');
    } finally {
      setSubiendo(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const quitarImagen = async () => {
    if (!confirm('Quitar imagen de este ítem?')) return;
    try {
      const { data } = await api.delete(`/config-landing/servicios/${item.id}/imagen`);
      toast.success('Imagen eliminada');
      onImageChange?.(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
    }
  };

  const IconItem = item.icono_key ? (LANDING_ICON_MAP[item.icono_key] || IconDefault) : null;

  return (
    <div className="bg-steel-900/50 border border-steel-700 rounded-lg p-3 flex gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {IconItem && (
            <span className="w-7 h-7 rounded bg-steel-800 border border-steel-700 flex items-center justify-center text-primary-400 shrink-0" title={item.icono_key}>
              <IconItem className="w-4 h-4" />
            </span>
          )}
          <p className="text-sm font-medium text-steel-100 truncate">{item.titulo}</p>
        </div>
        <p className="text-xs text-steel-400 line-clamp-2">{item.descripcion}</p>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <button onClick={() => onEdit(item)} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
            <HiOutlinePencil className="w-3.5 h-3.5" /> Editar
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={subirImagen} />
          <button onClick={() => fileRef.current?.click()} disabled={subiendo} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
            <HiOutlinePhotograph className="w-3.5 h-3.5" />
            {subiendo ? 'Subiendo...' : imgUrl ? 'Cambiar imagen' : 'Añadir imagen'}
          </button>
          {imgUrl && (
            <button onClick={quitarImagen} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
              <HiOutlineX className="w-3.5 h-3.5" /> Quitar imagen
            </button>
          )}
          <button onClick={() => onDelete(item)} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 ml-auto">
            <HiOutlineTrash className="w-3.5 h-3.5" /> Eliminar
          </button>
        </div>
      </div>
      {imgUrl && (
        <div className="w-20 h-20 rounded overflow-hidden bg-steel-800 shrink-0">
          <img src={imgUrl} alt={item.titulo} className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );
}

function ServicioForm({ initial, onCancel, onSave }) {
  const [form, setForm] = useState({
    titulo: initial?.titulo || '',
    descripcion: initial?.descripcion || '',
    icono_key: initial?.icono_key || 'tienda',
    grupo: initial?.grupo || 'fortalezas',
  });
  const [guardando, setGuardando] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      if (initial?.id) {
        await api.put(`/config-landing/servicios/${initial.id}`, form);
        toast.success('Actualizado');
      } else {
        await api.post('/config-landing/servicios', form);
        toast.success('Creado');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-steel-900/50 border border-primary-500/40 rounded-lg p-4 space-y-3 mb-3">
      <div>
        <label className="block text-xs font-medium text-steel-200 mb-1">Título</label>
        <input className="input-field w-full" required value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ej: Tienda Física & Showroom" />
      </div>
      <div>
        <label className="block text-xs font-medium text-steel-200 mb-1">Descripción</label>
        <textarea className="input-field w-full" rows={2} required value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Ej: Visítanos y prueba nuestros equipos." />
      </div>
      <div>
        <label className="block text-xs font-medium text-steel-200 mb-1">Ícono</label>
        <IconPicker
          value={form.icono_key}
          onChange={(val) => setForm({ ...form, icono_key: val })}
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={guardando} className="btn-primary">
          <HiOutlineCheck className="w-4 h-4 inline-block mr-1" />
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
      </div>
    </form>
  );
}

function GrupoSeccion({ titulo, grupo, items, onReload, onEditTitulo, editandoTitulo, tituloValor, onTituloChange, onTituloGuardar, onTituloCancelar }) {
  const [form, setForm] = useState(null);

  return (
    <div className="card mb-4">
      {/* Header con título editable */}
      <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0 gap-2">
        {editandoTitulo ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              className="input-field flex-1"
              value={tituloValor}
              onChange={e => onTituloChange(e.target.value)}
              placeholder="Ej: Nuestras Fortalezas"
            />
            <button onClick={onTituloGuardar} className="btn-primary text-xs px-3 py-1">Guardar</button>
            <button onClick={onTituloCancelar} className="btn-secondary text-xs px-3 py-1">Cancelar</button>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-semibold">{titulo}</h3>
            <button onClick={onEditTitulo} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
              <HiOutlinePencil className="w-3.5 h-3.5" /> Renombrar
            </button>
          </>
        )}
      </div>

      {/* Items */}
      <div className="space-y-2 mb-3">
        {items.length === 0 && !form && (
          <p className="text-sm text-steel-400 italic">Sin ítems en este grupo.</p>
        )}
        {items.map(item => (
          <ServicioItemCard
            key={item.id}
            item={item}
            onEdit={(it) => setForm(it)}
            onDelete={async (it) => {
              if (!confirm(`Eliminar "${it.titulo}"?`)) return;
              try {
                await api.delete(`/config-landing/servicios/${it.id}`);
                toast.success('Eliminado');
                onReload();
              } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
            }}
            onImageChange={onReload}
          />
        ))}
      </div>

      {/* Form crear/editar */}
      {form && (
        <ServicioForm
          initial={form.id ? form : { grupo }}
          onCancel={() => setForm(null)}
          onSave={() => { setForm(null); onReload(); }}
        />
      )}

      {!form && (
        <button onClick={() => setForm({ grupo })} className="btn-secondary text-sm inline-flex items-center gap-1">
          <HiOutlinePlus className="w-4 h-4" /> Añadir ítem
        </button>
      )}
    </div>
  );
}

function TabSidebar() {
  const [items, setItems] = useState([]);
  const [titulos, setTitulos] = useState({ fortalezas: '', beneficios: '' });
  const [editando, setEditando] = useState(null); // 'fortalezas' | 'beneficios' | null
  const [tituloValor, setTituloValor] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  const cargar = () => setReloadTick(t => t + 1);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const [{ data: servicios }, { data: config }] = await Promise.all([
          api.get('/config-landing/servicios'),
          api.get('/config-landing'),
        ]);
        if (cancelado) return;
        setItems(servicios || []);
        setTitulos({
          fortalezas: config?.sidebar_fortalezas_titulo || '',
          beneficios: config?.sidebar_beneficios_titulo || '',
        });
      } catch { /* */ }
    })();
    return () => { cancelado = true; };
  }, [reloadTick]);

  const abrirEdicion = (grupo) => {
    setEditando(grupo);
    setTituloValor(titulos[grupo] || '');
  };

  const guardarTitulo = async () => {
    try {
      const payload = {
        fortalezas_titulo: editando === 'fortalezas' ? tituloValor : titulos.fortalezas,
        beneficios_titulo: editando === 'beneficios' ? tituloValor : titulos.beneficios,
      };
      await api.put('/config-landing/sidebar-titulos', payload);
      toast.success('Título actualizado');
      setEditando(null);
      setTituloValor('');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const fortalezas = items.filter(i => i.grupo === 'fortalezas').sort((a, b) => a.orden - b.orden);
  const beneficios = items.filter(i => i.grupo === 'beneficios').sort((a, b) => a.orden - b.orden);

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-1">Sidebar Izquierdo de la Landing</h2>
        <p className="text-sm text-steel-400">
          Gestiona los dos grupos del sidebar lateral izquierdo (Fortalezas y Beneficios), sus títulos y los ítems dentro de cada uno. El primer ítem de "Fortalezas" suele llevar una foto real (ej. Showroom); cualquier ítem puede tener una imagen opcional.
        </p>
      </div>

      <GrupoSeccion
        titulo={titulos.fortalezas || LANDING_SIDEBAR.tituloFortalezasDefault}
        grupo="fortalezas"
        items={fortalezas}
        onReload={cargar}
        onEditTitulo={() => abrirEdicion('fortalezas')}
        editandoTitulo={editando === 'fortalezas'}
        tituloValor={tituloValor}
        onTituloChange={setTituloValor}
        onTituloGuardar={guardarTitulo}
        onTituloCancelar={() => { setEditando(null); setTituloValor(''); }}
      />

      <GrupoSeccion
        titulo={titulos.beneficios || LANDING_SIDEBAR.tituloBeneficiosDefault}
        grupo="beneficios"
        items={beneficios}
        onReload={cargar}
        onEditTitulo={() => abrirEdicion('beneficios')}
        editandoTitulo={editando === 'beneficios'}
        tituloValor={tituloValor}
        onTituloChange={setTituloValor}
        onTituloGuardar={guardarTitulo}
        onTituloCancelar={() => { setEditando(null); setTituloValor(''); }}
      />
    </div>
  );
}

// ── VISTA: Como Comprar ─────────────────────────────────────────────────
function TabMetodos() {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-2">Metodos de Compra</h2>
      <p className="text-sm text-steel-400 mb-4">Describe como pueden comprar tus clientes y a donde realizas envios.</p>
      <CrudSection
        endpoint="/config-landing/metodos-compra"
        fields={[
          { key: 'titulo', label: 'Titulo', required: true },
          { key: 'descripcion', label: 'Descripcion', type: 'textarea', required: true },
          { key: 'destinos', label: 'Destinos / Cobertura' },
          { key: 'icono_key', label: 'Ícono', type: 'icon', catalogo: LANDING_METODOS_COMPRA.iconos, categorias: LANDING_METODOS_COMPRA.iconosCategorias, default: '' },
        ]}
        renderItem={(item) => (
          <>
            <p className="text-sm font-medium text-steel-100">{item.titulo}</p>
            <p className="text-xs text-steel-400 line-clamp-1">{item.descripcion}</p>
            {item.destinos && <p className="text-xs text-primary-400 mt-0.5">{item.destinos}</p>}
          </>
        )}
      />
    </div>
  );
}

// ── VISTA: FAQ ──────────────────────────────────────────────────────────
function TabFaq() {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-2">Preguntas Frecuentes</h2>
      <p className="text-sm text-steel-400 mb-4">Preguntas y respuestas que se muestran en formato acordeon en la landing page.</p>
      <CrudSection
        endpoint="/config-landing/preguntas-frecuentes"
        fields={[
          { key: 'pregunta', label: 'Pregunta', required: true },
          { key: 'respuesta', label: 'Respuesta', type: 'textarea', required: true },
        ]}
        renderItem={(item) => (
          <>
            <p className="text-sm font-medium text-steel-100">{item.pregunta}</p>
            <p className="text-xs text-steel-400 line-clamp-1">{item.respuesta}</p>
          </>
        )}
      />
    </div>
  );
}

// ── VISTA: Clientes ─────────────────────────────────────────────────────
function TabClientes() {
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    try {
      const { data } = await api.get('/config-landing/principales-clientes');
      setClientes(data);
    } catch { /* */ }
  };

  useEffect(() => { cargar(); }, []);

  const abrir = (item) => {
    if (item) {
      setEditId(item.id);
      setForm({ nombre: item.nombre || '', descripcion: item.descripcion || '' });
    } else {
      setEditId(null);
      setForm({ nombre: '', descripcion: '' });
    }
  };

  const cerrar = () => { setForm(null); setEditId(null); };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      if (editId) {
        await api.put(`/config-landing/principales-clientes/${editId}`, form);
        toast.success('Actualizado');
      } else {
        await api.post('/config-landing/principales-clientes', form);
        toast.success('Creado');
      }
      cerrar();
      cargar();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
    finally { setGuardando(false); }
  };

  const eliminar = async (id) => {
    if (!confirm('Eliminar este cliente?')) return;
    try {
      await api.delete(`/config-landing/principales-clientes/${id}`);
      toast.success('Eliminado');
      cargar();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const toggleActivo = async (item) => {
    try {
      await api.put(`/config-landing/principales-clientes/${item.id}`, { activo: !item.activo });
      cargar();
    } catch { /* */ }
  };

  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-2">Principales Clientes</h2>
      <p className="text-sm text-steel-400 mb-4">Empresas que confian en ustedes. Puedes adjuntar el logo de cada cliente (se sube a Wasabi/S3).</p>

      {clientes.length === 0 && !form && (
        <p className="text-sm text-steel-400 mb-4">No hay clientes registrados.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {clientes.map((c) => (
          <div key={c.id} className={`p-4 rounded-lg border transition-colors ${c.activo ? 'border-steel-700 bg-steel-900/30' : 'border-steel-800 bg-steel-900/10 opacity-50'}`}>
            <div className="flex items-start gap-3">
              {/* Logo */}
              <div className="w-14 h-14 rounded-lg bg-steel-800 border border-steel-700 flex items-center justify-center overflow-hidden shrink-0">
                {c.logo_url ? (
                  <img src={buildMediaUrl(c.logo_url)} alt={c.nombre} className="w-full h-full object-contain" />
                ) : (
                  <HiOutlinePhotograph className="w-6 h-6 text-steel-500" />
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-steel-100">{c.nombre}</p>
                {c.descripcion && <p className="text-xs text-steel-400 line-clamp-1">{c.descripcion}</p>}
                <LogoUploader clienteId={c.id} logoUrl={c.logo_url} onUploaded={cargar} />
              </div>
            </div>
            {/* Acciones */}
            <div className="flex items-center gap-1 mt-3 pt-2 border-t border-steel-700/50">
              <button onClick={() => toggleActivo(c)} className={`text-xs px-2 py-1 rounded transition-colors ${c.activo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-steel-700 text-steel-400'}`}>
                {c.activo ? 'Activo' : 'Inactivo'}
              </button>
              <button onClick={() => abrir(c)} className="text-xs px-2 py-1 rounded bg-steel-700 text-steel-300 hover:text-primary-400 transition-colors">Editar</button>
              <button onClick={() => eliminar(c.id)} className="text-xs px-2 py-1 rounded bg-steel-700 text-steel-300 hover:text-red-400 transition-colors">Eliminar</button>
            </div>
          </div>
        ))}
      </div>

      {/* Formulario */}
      {form ? (
        <form onSubmit={guardar} className="space-y-3 p-4 rounded-lg border border-primary-500/30 bg-steel-900/50">
          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">Nombre del cliente</label>
            <input className="input-field w-full" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">Descripcion breve</label>
            <input className="input-field w-full" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
          </div>
          <p className="text-xs text-steel-500">El logo se sube despues de crear el cliente.</p>
          <div className="flex gap-2">
            <button type="submit" disabled={guardando} className="btn-primary flex-1">{guardando ? 'Guardando...' : editId ? 'Actualizar' : 'Crear'}</button>
            <button type="button" onClick={cerrar} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      ) : (
        <button onClick={() => abrir(null)} className="btn-secondary w-full flex items-center justify-center gap-2">
          <HiOutlinePlus className="w-4 h-4" /> Agregar Cliente
        </button>
      )}
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ────────────────────────────────────────────────
export default function ConfigLanding() {
  const [tab, setTab] = useState('apariencia');

  return (
    <div>
      <h1 className="text-2xl font-bold font-display tracking-wider text-steel-100 mb-6">Configuracion Landing Page</h1>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 bg-steel-900/50 p-1 rounded-lg border border-steel-700/50">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-primary-500 text-white shadow'
                : 'text-steel-300 hover:text-steel-100 hover:bg-steel-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido del tab */}
      {tab === 'apariencia' && <TabApariencia />}
      {tab === 'nosotros' && <TabNosotros />}
      {tab === 'sidebar' && <TabSidebar />}
      {tab === 'metodos' && <TabMetodos />}
      {tab === 'clientes' && <TabClientes />}
      {tab === 'faq' && <TabFaq />}
    </div>
  );
}
