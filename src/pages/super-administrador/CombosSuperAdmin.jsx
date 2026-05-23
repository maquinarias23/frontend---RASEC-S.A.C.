import { useState, useCallback, useRef } from 'react';
import { HiOutlineSearch, HiOutlineGlobe, HiOutlineGift, HiOutlineCollection, HiOutlinePhotograph, HiOutlineTrash } from 'react-icons/hi';
import useCrud from '../../hooks/useCrud';
import usePaginacion from '../../hooks/usePaginacion';
import TablaGenerica from '../../components/ui/TablaGenerica';
import Paginacion from '../../components/ui/Paginacion';
import EstadoBadge from '../../components/ui/EstadoBadge';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { formatearMoneda } from '../../utils/formato';
import { calcularPrecioCombo, calcularTotalCombo } from '../../utils/precioCombo';
import { buildMediaUrl } from '../../utils/media';
import { SA_COMBOS, LANDING_COMBOS } from '../../config/constants';

const columnas = [
  { key: 'id', label: 'ID' },
  { key: 'nombre', label: 'Nombre' },
  {
    key: 'vendedor',
    label: 'Vendedor',
    render: (f) => (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        {f.tbl_usuarios?.nombres || '-'}
      </span>
    ),
  },
  {
    key: 'items',
    label: 'Productos',
    render: (f) => (
      <span className="text-steel-300 text-xs">
        {f.items_combo?.length || 0} producto(s)
      </span>
    ),
  },
  {
    key: 'activo',
    label: 'Estado',
    render: (f) => <EstadoBadge estado={f.activo ? 'activo' : 'inactivo'} />,
  },
  {
    key: 'visible_landing',
    label: 'En Landing',
    render: (f) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        f.visible_landing
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-steel-700 text-steel-400'
      }`}>
        {f.visible_landing ? 'Visible' : 'Oculto'}
      </span>
    ),
  },
];

export default function CombosSuperAdmin() {
  const { datos, cargando, listar } = useCrud('/combos');
  const [busqueda, setBusqueda] = useState('');
  const [filtroVendedor, setFiltroVendedor] = useState('');
  const [filtroLanding, setFiltroLanding] = useState('');
  const [filaExpandidaId, setFilaExpandidaId] = useState(null);
  const [toggling, setToggling] = useState(null);
  const [uploadingImagen, setUploadingImagen] = useState(null);
  const fileInputRef = useRef(null);
  const [comboParaImagen, setComboParaImagen] = useState(null);

  // Vendedores únicos para filtro
  const vendedoresUnicos = [...new Map(
    datos
      .filter((d) => d.tbl_usuarios?.id)
      .map((d) => [d.tbl_usuarios.id, d.tbl_usuarios.nombres])
  ).entries()].map(([id, nombres]) => ({ id, nombres }));

  // Filtrado
  const datosFiltrados = datos.filter((d) => {
    const matchBusqueda =
      !busqueda ||
      d.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      d.tbl_usuarios?.nombres?.toLowerCase().includes(busqueda.toLowerCase());
    const matchVendedor = !filtroVendedor || d.vendedor_user_id === parseInt(filtroVendedor);
    const matchLanding =
      filtroLanding === '' ||
      (filtroLanding === 'visible' && d.visible_landing) ||
      (filtroLanding === 'oculto' && !d.visible_landing);
    return matchBusqueda && matchVendedor && matchLanding;
  });

  const { datosPaginados, paginaActual, totalPaginas, irAPagina } = usePaginacion(datosFiltrados);

  const handleToggleLanding = useCallback(async (combo) => {
    setToggling(combo.id);
    try {
      await api.patch(`/combos/${combo.id}/toggle-landing`);
      toast.success(
        combo.visible_landing
          ? SA_COMBOS.toastRemovidoLanding(combo.nombre)
          : SA_COMBOS.toastVisibleLanding(combo.nombre)
      );
      await listar();
    } catch (err) {
      toast.error(err.response?.data?.error || SA_COMBOS.btnQuitarLanding);
    } finally {
      setToggling(null);
    }
  }, [listar]);

  const handleSubirImagen = useCallback(async (comboId, file) => {
    setUploadingImagen(comboId);
    try {
      const formData = new FormData();
      formData.append('imagen', file);
      await api.post(`/combos/${comboId}/imagen-landing`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(SA_COMBOS.imagenSubida);
      await listar();
    } catch (err) {
      toast.error(err.response?.data?.error || SA_COMBOS.imagenSubida);
    } finally {
      setUploadingImagen(null);
      setComboParaImagen(null);
    }
  }, [listar]);

  const handleEliminarImagen = useCallback(async (combo) => {
    setUploadingImagen(combo.id);
    try {
      await api.delete(`/combos/${combo.id}/imagen-landing`);
      toast.success(SA_COMBOS.imagenEliminada);
      await listar();
    } catch (err) {
      toast.error(err.response?.data?.error || SA_COMBOS.imagenEliminada);
    } finally {
      setUploadingImagen(null);
    }
  }, [listar]);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file && comboParaImagen) {
      handleSubirImagen(comboParaImagen, file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [comboParaImagen, handleSubirImagen]);

  const triggerUpload = useCallback((comboId) => {
    setComboParaImagen(comboId);
    setTimeout(() => fileInputRef.current?.click(), 0);
  }, []);

  // Renderizado expandido: detalle de items del combo
  const renderExpandido = (combo) => (
    <div className="p-4 bg-steel-800/30">
      {combo.descripcion && (
        <p className="text-steel-400 text-sm mb-3 italic">{combo.descripcion}</p>
      )}
      <div className="space-y-2">
        {combo.items_combo?.map((item) => {
          const prod = item.tbl_productos;
          const precioRef = parseFloat(prod?.precio_catalogo || prod?.precio_venta_base || 0);
          const precioFinal = item.es_regalo ? 0 : calcularPrecioCombo(precioRef, item.tipo_descuento, item.valor_descuento);

          return (
            <div key={item.id} className="flex items-center justify-between text-sm border-b border-steel-700/50 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-steel-200">{prod?.nombre || 'Producto'}</span>
                <span className="text-steel-500 text-xs">x{item.cantidad || 1}</span>
                {item.es_regalo && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700 flex items-center gap-0.5">
                    <HiOutlineGift className="w-3 h-3" />
                    {LANDING_COMBOS.labelRegalo}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {item.tipo_descuento && !item.es_regalo && (
                  <span className="text-steel-500 line-through text-xs">
                    {formatearMoneda(precioRef)}
                  </span>
                )}
                <span className={`font-medium ${item.es_regalo ? 'text-purple-400' : 'text-emerald-400'}`}>
                  {item.es_regalo ? LANDING_COMBOS.labelGratis : formatearMoneda(precioFinal)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-end mt-3 pt-2 border-t border-steel-700">
        <span className="text-sm font-semibold text-steel-200">
          {LANDING_COMBOS.labelTotalCombo} <span className="text-primary-400">{formatearMoneda(calcularTotalCombo(combo.items_combo))}</span>
        </span>
      </div>

      {/* Imagen Landing */}
      {combo.visible_landing && (
        <div className="mt-4 pt-3 border-t border-steel-700">
          <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
            <span className="text-sm font-medium text-steel-300 flex items-center gap-1.5">
              <HiOutlinePhotograph className="w-4 h-4" />
              {SA_COMBOS.imagenLandingLabel}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); triggerUpload(combo.id); }}
                disabled={uploadingImagen === combo.id}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-primary-600/20 text-primary-400 hover:bg-primary-600/30 border border-primary-600/40 transition-all disabled:opacity-50"
              >
                <HiOutlinePhotograph className="w-3.5 h-3.5" />
                {uploadingImagen === combo.id ? '...' : combo.imagen_landing_url ? SA_COMBOS.btnCambiar : SA_COMBOS.btnSubir}
              </button>
              {combo.imagen_landing_url && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleEliminarImagen(combo); }}
                  disabled={uploadingImagen === combo.id}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/40 transition-all disabled:opacity-50"
                >
                  <HiOutlineTrash className="w-3.5 h-3.5" />
                  {SA_COMBOS.btnEliminar}
                </button>
              )}
            </div>
          </div>
          {combo.imagen_landing_url && (
            <div className="rounded-lg overflow-hidden border border-steel-700 w-fit">
              <img
                src={buildMediaUrl(combo.imagen_landing_url)}
                alt={`${SA_COMBOS.imagenLandingLabel} - ${combo.nombre}`}
                className="h-24 object-contain bg-steel-800"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}
          {!combo.imagen_landing_url && (
            <p className="text-steel-500 text-xs italic">{SA_COMBOS.sinImagenExtra}</p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <HiOutlineCollection className="w-7 h-7 text-primary-500" />
          <h1 className="text-2xl font-display tracking-wider text-steel-100">{SA_COMBOS.titulo}</h1>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-400" />
          <input
            type="text"
            placeholder={SA_COMBOS.buscarPlaceholder}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-steel-800 border border-steel-700 rounded-lg text-sm text-steel-200 placeholder-steel-500 focus:outline-none focus:border-primary-500"
          />
        </div>
        <select
          value={filtroVendedor}
          onChange={(e) => setFiltroVendedor(e.target.value)}
          className="px-3 py-2 bg-steel-800 border border-steel-700 rounded-lg text-sm text-steel-200 focus:outline-none focus:border-primary-500"
        >
          <option value="">{SA_COMBOS.todosVendedores}</option>
          {vendedoresUnicos.map((v) => (
            <option key={v.id} value={v.id}>{v.nombres}</option>
          ))}
        </select>
        <select
          value={filtroLanding}
          onChange={(e) => setFiltroLanding(e.target.value)}
          className="px-3 py-2 bg-steel-800 border border-steel-700 rounded-lg text-sm text-steel-200 focus:outline-none focus:border-primary-500"
        >
          <option value="">{SA_COMBOS.filtroTodos}</option>
          <option value="visible">{SA_COMBOS.filtroVisibles}</option>
          <option value="oculto">{SA_COMBOS.filtroOcultos}</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-steel-900/50 rounded-xl border border-steel-700 overflow-hidden">
        <TablaGenerica
          columnas={columnas}
          datos={datosPaginados}
          cargando={cargando}
          vacio={SA_COMBOS.sinCombos}
          filaExpandidaId={filaExpandidaId}
          onFilaClick={(fila) => setFilaExpandidaId(filaExpandidaId === fila.id ? null : fila.id)}
          renderExpandido={renderExpandido}
          acciones={(fila) => (
            <button
              onClick={(e) => { e.stopPropagation(); handleToggleLanding(fila); }}
              disabled={toggling === fila.id}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                fila.visible_landing
                  ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-600/40'
                  : 'bg-steel-700/50 text-steel-400 hover:bg-steel-700 border border-steel-600/40'
              } ${toggling === fila.id ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={fila.visible_landing ? SA_COMBOS.btnQuitarLanding : SA_COMBOS.btnMostrarLanding}
            >
              <HiOutlineGlobe className="w-4 h-4" />
              {toggling === fila.id ? '...' : fila.visible_landing ? SA_COMBOS.btnEnLanding : SA_COMBOS.btnMostrar}
            </button>
          )}
        />
      </div>

      <Paginacion
        paginaActual={paginaActual}
        totalPaginas={totalPaginas}
        onCambio={irAPagina}
      />

      {/* Input file hidden para subir imagen landing */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
