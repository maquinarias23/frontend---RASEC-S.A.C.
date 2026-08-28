import { useState, useEffect } from 'react';
import {
  HiOutlineUpload, HiOutlineDocumentText, HiOutlineDocumentDownload,
  HiOutlineRefresh, HiOutlineXCircle, HiOutlineSearch, HiOutlineX,
  HiOutlineClock,
} from 'react-icons/hi';
import useCrud from '../../hooks/useCrud';
import usePaginacion from '../../hooks/usePaginacion';
import TablaGenerica from '../../components/ui/TablaGenerica';
import Paginacion from '../../components/ui/Paginacion';
import Modal from '../../components/ui/Modal';
import EstadoBadge from '../../components/ui/EstadoBadge';
import ComprobantesBadge from '../../components/shared/ComprobantesBadge';
import ModalWhatsappComprobante from '../../components/shared/ModalWhatsappComprobante';
import IconoWhatsapp from '../../components/ui/IconoWhatsapp';
import { formatearMoneda, formatearFechaHora } from '../../utils/formato';
import { comprobantesService } from '../../services/comprobantesService';
import { exportarComprobantesExcel, ciudadDeVenta } from '../../utils/exportarComprobantes';
import { TIPO_COMPROBANTE_LABEL, ESTADO_COMPROBANTE, COMPROBANTE_NUMERO, WA_COMPROBANTE } from '../../config/constants';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const TAB_COMPROBANTES = 'comprobantes';
const TAB_ADJUNTOS = 'adjuntos';

export default function Facturas() {
  const [tab, setTab] = useState(TAB_COMPROBANTES);

  return (
    <div>
      <h1 className="text-2xl font-bold font-display tracking-wider text-steel-100 mb-4">Facturación</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-steel-700/50">
        <button
          onClick={() => setTab(TAB_COMPROBANTES)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === TAB_COMPROBANTES ? 'border-blue-500 text-blue-400' : 'border-transparent text-steel-400 hover:text-steel-200'}`}>
          Comprobantes Electrónicos
        </button>
        <button
          onClick={() => setTab(TAB_ADJUNTOS)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === TAB_ADJUNTOS ? 'border-blue-500 text-blue-400' : 'border-transparent text-steel-400 hover:text-steel-200'}`}>
          Adjuntos Manuales
        </button>
      </div>

      {tab === TAB_COMPROBANTES ? <TabComprobantes /> : <TabAdjuntos />}
    </div>
  );
}

const FILTROS_INICIALES = {
  busqueda: '', tipo_comprobante: '', estado: '', vendedor_user_id: '',
  fecha_desde: '', fecha_hasta: '', anulado: '', page: 1,
};

function TabComprobantes() {
  const [comprobantes, setComprobantes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  // El texto del buscador se mantiene aparte y se aplica con un respiro, para
  // no disparar una consulta por cada tecla.
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [vendedores, setVendedores] = useState([]);
  const [exportando, setExportando] = useState(false);
  const [modalWhatsapp, setModalWhatsapp] = useState(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const { data } = await comprobantesService.listarTodos(filtros);
      setComprobantes(data.data);
      setTotal(data.total);
    } catch { /* silencioso */ }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [filtros]);

  useEffect(() => {
    const t = setTimeout(() => {
      setFiltros((prev) => (prev.busqueda === textoBusqueda ? prev : { ...prev, busqueda: textoBusqueda, page: 1 }));
    }, 400);
    return () => clearTimeout(t);
  }, [textoBusqueda]);

  useEffect(() => {
    api.get('/ventas/vendedores-activos')
      .then(({ data }) => setVendedores(Array.isArray(data) ? data : []))
      .catch(() => setVendedores([]));
  }, []);

  const hayFiltros = Object.entries(filtros)
    .some(([k, v]) => k !== 'page' && v !== '' && v !== undefined);

  const limpiarFiltros = () => { setTextoBusqueda(''); setFiltros(FILTROS_INICIALES); };

  /** Describe los filtros activos, para dejarlos escritos en el Excel. */
  const describirFiltros = () => {
    const partes = [];
    if (filtros.busqueda) partes.push(`"${filtros.busqueda}"`);
    if (filtros.tipo_comprobante) partes.push(TIPO_COMPROBANTE_LABEL[filtros.tipo_comprobante]);
    if (filtros.estado) partes.push(filtros.estado.replace(/_/g, ' '));
    if (filtros.vendedor_user_id) {
      partes.push(vendedores.find((v) => String(v.id) === String(filtros.vendedor_user_id))?.nombres || 'vendedor');
    }
    if (filtros.anulado === 'si') partes.push('solo anulados');
    if (filtros.anulado === 'no') partes.push('sin anulados');
    if (filtros.fecha_desde || filtros.fecha_hasta) {
      partes.push(`${filtros.fecha_desde || '…'} a ${filtros.fecha_hasta || '…'}`);
    }
    return partes.join(' · ');
  };

  const exportarExcel = async () => {
    setExportando(true);
    try {
      // Se pide todo lo filtrado, no solo la página en pantalla.
      const { data } = await comprobantesService.listarTodos({ ...filtros, todos: 'si', page: undefined });
      if (!data.data?.length) {
        toast.error('No hay comprobantes para exportar con esos filtros');
        return;
      }
      const r = exportarComprobantesExcel(data.data, { filtrosTexto: describirFiltros() });
      toast.success(`Excel descargado: ${r.comprobantes} comprobantes, ${r.items} líneas de detalle`);
      if (data.truncado) {
        toast('Se exportaron los primeros 5,000 comprobantes. Acota los filtros para el resto.', { icon: '⚠️' });
      }
    } catch (err) {
      console.error('Error al exportar comprobantes:', err);
      toast.error('No se pudo generar el Excel');
    } finally {
      setExportando(false);
    }
  };

  const handleAnular = async (comp) => {
    const motivo = prompt('Motivo de anulación:');
    if (!motivo) return;
    try {
      await comprobantesService.anular(comp.id, motivo);
      toast.success('Comprobante anulado');
      cargar();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const handleConsultar = async (comp) => {
    try {
      await comprobantesService.consultar(comp.id);
      toast.success('Estado actualizado');
      cargar();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const handleReintentar = async (comp) => {
    try {
      await comprobantesService.reintentar(comp.id);
      toast.success('Reintento exitoso');
      cargar();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  // Cierra la anulación: SUNAT procesa la baja de forma asíncrona y hasta que
  // no se consulta el ticket el comprobante sigue contando como vigente.
  const handleConsultarBaja = async (comp) => {
    try {
      const { data } = await comprobantesService.consultarBaja(comp.id);
      toast.success(data.anulado
        ? 'SUNAT aceptó la baja: comprobante anulado'
        : 'La baja sigue en proceso en SUNAT. Vuelva a consultar en unos minutos.');
      cargar();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  // Reenvía a SUNAT un comprobante que el proveedor registró pero que quedó
  // sin constancia (CDR).
  const handleReenviarSunat = async (comp) => {
    try {
      await comprobantesService.reenviarSunat(comp.id);
      toast.success('Comprobante reenviado a SUNAT');
      cargar();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const handlePdf = async (comp) => {
    try {
      const { data } = await comprobantesService.descargarPdf(comp.id);
      if (data.pdf_url) window.open(data.pdf_url, '_blank');
      else toast.error('PDF no disponible');
    } catch { toast.error('Error al descargar PDF'); }
  };

  const totalPages = Math.ceil(total / 20);

  const columnasCPE = [
    { key: 'numero', label: 'N° Comprobante', render: (c) => <span className="font-mono text-xs">{COMPROBANTE_NUMERO.formatear(c.serie, c.numero)}</span> },
    { key: 'tipo_comprobante', label: 'Tipo', render: (c) => <span className="text-xs">{TIPO_COMPROBANTE_LABEL[c.tipo_comprobante]}</span> },
    { key: 'cliente_nombre', label: 'Cliente', render: (c) => <div className="text-xs"><p>{c.cliente_nombre}</p><p className="text-steel-500">{c.cliente_documento}</p></div> },
    { key: 'vendedor', label: 'Vendedor', render: (c) => (
      <div className="text-xs">
        <p>{c.tbl_ventas?.tbl_usuarios?.nombres || '-'}</p>
        {c.sale_order_id && <p className="text-steel-500">Venta #{c.sale_order_id}</p>}
      </div>
    ) },
    { key: 'ciudad', label: 'Ciudad / Destino', render: (c) => (
      <span className="text-xs text-steel-300">{ciudadDeVenta(c.tbl_ventas) || '-'}</span>
    ) },
    { key: 'total', label: 'Total', render: (c) => formatearMoneda(c.total) },
    { key: 'estado', label: 'Estado', render: (c) => <ComprobantesBadge estado={c.estado} /> },
    { key: 'emitido_por', label: 'Emitido por', render: (c) => (
      <div className="text-xs">
        <p className="text-steel-200">{c.tbl_usuarios?.nombres || '-'}</p>
        <p className="text-steel-500">{formatearFechaHora(c.fecha_emision)}</p>
      </div>
    ) },
  ];

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="card space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <HiOutlineSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-steel-400 pointer-events-none" />
            <input
              className="input-field !pl-9 !pr-9"
              placeholder="Buscar por cliente, documento, vendedor, producto, ciudad, N° de comprobante o N° de venta…"
              value={textoBusqueda}
              onChange={e => setTextoBusqueda(e.target.value)}
            />
            {textoBusqueda && (
              <button onClick={() => setTextoBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-400 hover:text-steel-200" title="Limpiar">
                <HiOutlineX className="w-4 h-4" />
              </button>
            )}
          </div>
          <button onClick={exportarExcel} disabled={exportando}
            className="btn-secondary !py-2 !text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 whitespace-nowrap"
            title="Descargar en Excel todos los comprobantes que cumplen los filtros">
            <HiOutlineDocumentDownload className="w-4 h-4" />
            {exportando ? 'Generando…' : 'Exportar Excel'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 items-end">
          <select className="input-field w-40" value={filtros.tipo_comprobante}
            onChange={e => setFiltros(prev => ({ ...prev, tipo_comprobante: e.target.value, page: 1 }))}>
            <option value="">Todos los tipos</option>
            {Object.entries(TIPO_COMPROBANTE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          <select className="input-field w-44" value={filtros.estado}
            onChange={e => setFiltros(prev => ({ ...prev, estado: e.target.value, page: 1 }))}>
            <option value="">Todos los estados</option>
            {Object.values(ESTADO_COMPROBANTE).map(e => <option key={e} value={e}>{e.replace(/_/g, ' ').toUpperCase()}</option>)}
          </select>

          <select className="input-field w-48" value={filtros.vendedor_user_id}
            onChange={e => setFiltros(prev => ({ ...prev, vendedor_user_id: e.target.value, page: 1 }))}>
            <option value="">Todos los vendedores</option>
            {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombres}</option>)}
          </select>

          <select className="input-field w-36" value={filtros.anulado}
            onChange={e => setFiltros(prev => ({ ...prev, anulado: e.target.value, page: 1 }))}>
            <option value="">Anulados y no</option>
            <option value="no">Sin anulados</option>
            <option value="si">Solo anulados</option>
          </select>

          <label className="text-xs text-steel-400">
            Desde
            <input type="date" className="input-field w-40 mt-0.5" value={filtros.fecha_desde}
              onChange={e => setFiltros(prev => ({ ...prev, fecha_desde: e.target.value, page: 1 }))} />
          </label>
          <label className="text-xs text-steel-400">
            Hasta
            <input type="date" className="input-field w-40 mt-0.5" value={filtros.fecha_hasta}
              onChange={e => setFiltros(prev => ({ ...prev, fecha_hasta: e.target.value, page: 1 }))} />
          </label>

          {hayFiltros && (
            <button onClick={limpiarFiltros} className="btn-ghost !py-2 !text-xs flex items-center gap-1">
              <HiOutlineX className="w-4 h-4" /> Limpiar filtros
            </button>
          )}
        </div>

        <p className="text-xs text-steel-400">
          {total} comprobante{total === 1 ? '' : 's'}
          {hayFiltros && ' con los filtros aplicados'}
        </p>
      </div>

      <div className="card">
        <TablaGenerica columnas={columnasCPE} datos={comprobantes} cargando={loading} vacio="No hay comprobantes."
          acciones={(fila) => (
            <div className="flex gap-1.5">
              {fila.pdf_url && (
                <button onClick={() => handlePdf(fila)} className="p-1.5 rounded-lg border border-steel-700/40 text-steel-300 hover:text-blue-500 hover:bg-blue-500/5 transition-all" title="PDF">
                  <HiOutlineDocumentDownload className="w-4 h-4" />
                </button>
              )}
              {!fila.anulado && fila.estado !== ESTADO_COMPROBANTE.ERROR && (
                <button onClick={() => setModalWhatsapp(fila)} className="p-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all" title={WA_COMPROBANTE.btnAccion}>
                  <IconoWhatsapp className="w-4 h-4" />
                </button>
              )}
              {fila.proveedor_external_id && !fila.anulado && (
                <button onClick={() => handleConsultar(fila)} className="p-1.5 rounded-lg border border-steel-700/40 text-steel-300 hover:text-steel-100 hover:bg-steel-800 transition-all" title="Consultar">
                  <HiOutlineRefresh className="w-4 h-4" />
                </button>
              )}
              {fila.estado === ESTADO_COMPROBANTE.ERROR && (
                <button onClick={() => handleReintentar(fila)} className="p-1.5 rounded-lg border border-accent-500/30 bg-accent-500/10 text-accent-500 hover:bg-accent-500/20 transition-all" title="Reintentar">
                  <HiOutlineRefresh className="w-4 h-4" />
                </button>
              )}
              {fila.estado === ESTADO_COMPROBANTE.EMITIDO && fila.proveedor_external_id && !fila.anulado && (
                <button onClick={() => handleReenviarSunat(fila)} className="p-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all" title="Reenviar a SUNAT">
                  <HiOutlineUpload className="w-4 h-4" />
                </button>
              )}
              {fila.estado === ESTADO_COMPROBANTE.EN_BAJA_SUNAT && (
                <button onClick={() => handleConsultarBaja(fila)} className="p-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-all" title="Consultar estado de la baja en SUNAT">
                  <HiOutlineClock className="w-4 h-4" />
                </button>
              )}
              {!fila.anulado && fila.estado !== ESTADO_COMPROBANTE.EN_BAJA_SUNAT && fila.proveedor_external_id && (
                <button onClick={() => handleAnular(fila)} className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/15 transition-all" title="Anular">
                  <HiOutlineXCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        />
        {totalPages > 1 && (
          <Paginacion paginaActual={filtros.page} totalPaginas={totalPages}
            onChange={(p) => setFiltros(prev => ({ ...prev, page: p }))} />
        )}
      </div>

      {modalWhatsapp && (
        <ModalWhatsappComprobante
          comprobante={modalWhatsapp}
          cerrar={() => setModalWhatsapp(null)}
        />
      )}
    </div>
  );
}

function TabAdjuntos() {
  const { datos: ventas, cargando, listar } = useCrud('/ventas');
  const { datosPaginados, paginaActual, totalPaginas, irAPagina } = usePaginacion(ventas);
  const [modal, setModal] = useState(false);
  const [ventaId, setVentaId] = useState(null);
  const [archivo, setArchivo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [subiendoFactura, setSubiendoFactura] = useState(false);

  const adjuntar = async (e) => {
    e.preventDefault();
    if (!archivo || subiendoFactura) return;
    setSubiendoFactura(true);
    const formData = new FormData();
    formData.append('factura', archivo);
    try {
      await api.post(`/facturas/venta/${ventaId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Factura adjuntada correctamente');
      setModal(false);
      setArchivo(null);
      setPreview(null);
      listar();
    } catch (err) { toast.error(err.response?.data?.error || 'Error al adjuntar factura'); }
    finally { setSubiendoFactura(false); }
  };

  const handleArchivo = (e) => {
    const file = e.target.files[0];
    setArchivo(file);
    if (file?.type?.startsWith('image/')) setPreview(URL.createObjectURL(file));
    else setPreview(null);
  };

  const columnasAdj = [
    { key: 'id', label: 'N° Venta' },
    { key: 'cliente', label: 'Cliente', render: (f) => f.tbl_clientes?.nombre || '-' },
    { key: 'total', label: 'Total', render: (f) => formatearMoneda(f.total) },
    { key: 'estado_venta', label: 'Estado', render: (f) => <EstadoBadge estado={f.estado_venta} /> },
    { key: 'facturas', label: 'Adjuntos', render: (f) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${(f.facturas?.length || 0) > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-steel-800 text-steel-400'}`}>
        {f.facturas?.length || 0}
      </span>
    )},
    { key: 'fecha', label: 'Fecha', render: (f) => formatearFechaHora(f.fecha_hora_registro) },
  ];

  return (
    <div>
      <div className="card">
        <TablaGenerica columnas={columnasAdj} datos={datosPaginados} cargando={cargando} vacio="No hay ventas."
          acciones={(fila) => (
            <button onClick={() => { setVentaId(fila.id); setArchivo(null); setPreview(null); setModal(true); }}
              className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-xs">
              <HiOutlineUpload className="w-4 h-4" /> Adjuntar
            </button>
          )}
        />
        <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onChange={irAPagina} />
      </div>

      <Modal abierto={modal} cerrar={() => setModal(false)} titulo={`Adjuntar Factura - Venta #${ventaId}`}>
        <form onSubmit={adjuntar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">Archivo de factura</label>
            <input type="file" onChange={handleArchivo} className="input-field" accept=".pdf,.jpg,.png" required />
          </div>
          {preview && (
            <img src={preview} alt="Preview" className="w-full h-32 object-contain rounded-lg bg-steel-900/50" />
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary" disabled={subiendoFactura}>Cancelar</button>
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={subiendoFactura}>
              {subiendoFactura ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Adjuntando...
                </>
              ) : (
                <>
                  <HiOutlineDocumentText className="w-4 h-4" /> Adjuntar
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
