import { useState, useEffect } from 'react';
import { HiOutlineUpload, HiOutlineDocumentText, HiOutlineDocumentDownload, HiOutlineRefresh, HiOutlineXCircle } from 'react-icons/hi';
import useCrud from '../../hooks/useCrud';
import usePaginacion from '../../hooks/usePaginacion';
import TablaGenerica from '../../components/ui/TablaGenerica';
import Paginacion from '../../components/ui/Paginacion';
import Modal from '../../components/ui/Modal';
import EstadoBadge from '../../components/ui/EstadoBadge';
import ComprobantesBadge from '../../components/shared/ComprobantesBadge';
import { formatearMoneda, formatearFechaHora } from '../../utils/formato';
import { comprobantesService } from '../../services/comprobantesService';
import { TIPO_COMPROBANTE_LABEL, ESTADO_COMPROBANTE } from '../../config/constants';
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

function TabComprobantes() {
  const [comprobantes, setComprobantes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ tipo_comprobante: '', estado: '', page: 1 });

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

  const handlePdf = async (comp) => {
    try {
      const { data } = await comprobantesService.descargarPdf(comp.id);
      if (data.pdf_url) window.open(data.pdf_url, '_blank');
      else toast.error('PDF no disponible');
    } catch { toast.error('Error al descargar PDF'); }
  };

  const formatearNumero = (serie, numero) => `${serie}-${String(numero).padStart(8, '0')}`;
  const totalPages = Math.ceil(total / 20);

  const columnasCPE = [
    { key: 'numero', label: 'N° Comprobante', render: (c) => <span className="font-mono text-xs">{formatearNumero(c.serie, c.numero)}</span> },
    { key: 'tipo_comprobante', label: 'Tipo', render: (c) => <span className="text-xs">{TIPO_COMPROBANTE_LABEL[c.tipo_comprobante]}</span> },
    { key: 'cliente_nombre', label: 'Cliente', render: (c) => <div className="text-xs"><p>{c.cliente_nombre}</p><p className="text-steel-500">{c.cliente_documento}</p></div> },
    { key: 'total', label: 'Total', render: (c) => formatearMoneda(c.total) },
    { key: 'estado', label: 'Estado', render: (c) => <ComprobantesBadge estado={c.estado} /> },
    { key: 'fecha', label: 'Fecha', render: (c) => formatearFechaHora(c.fecha_emision) },
  ];

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="flex gap-2 items-end">
        <select className="input-field w-40" value={filtros.tipo_comprobante}
          onChange={e => setFiltros(prev => ({ ...prev, tipo_comprobante: e.target.value, page: 1 }))}>
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO_COMPROBANTE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="input-field w-40" value={filtros.estado}
          onChange={e => setFiltros(prev => ({ ...prev, estado: e.target.value, page: 1 }))}>
          <option value="">Todos los estados</option>
          {Object.values(ESTADO_COMPROBANTE).map(e => <option key={e} value={e}>{e.replace(/_/g, ' ').toUpperCase()}</option>)}
        </select>
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
              {!fila.anulado && fila.proveedor_external_id && (
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
