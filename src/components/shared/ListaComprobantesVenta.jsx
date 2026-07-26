import { useState, useEffect } from 'react';
import { comprobantesService } from '../../services/comprobantesService';
import ComprobantesBadge from './ComprobantesBadge';
import ModalEmitirComprobante from './ModalEmitirComprobante';
import ModalEmitirNota from './ModalEmitirNota';
import ModalWhatsappComprobante from './ModalWhatsappComprobante';
import IconoWhatsapp from '../ui/IconoWhatsapp';
import { TIPO_COMPROBANTE_LABEL, ESTADO_COMPROBANTE, COMPROBANTE_NUMERO, WA_COMPROBANTE } from '../../config/constants';
import { HiOutlineDocumentText, HiOutlinePlusCircle, HiOutlineRefresh, HiOutlineXCircle, HiOutlineDocumentDownload } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function ListaComprobantesVenta({ ventaId, venta }) {
  const [comprobantes, setComprobantes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalEmitir, setModalEmitir] = useState(false);
  const [modalNota, setModalNota] = useState(null);
  const [modalWhatsapp, setModalWhatsapp] = useState(null);

  const cargar = async () => {
    if (!ventaId) return;
    setLoading(true);
    try {
      const { data } = await comprobantesService.listarPorVenta(ventaId);
      setComprobantes(data);
    } catch { /* silencioso */ }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [ventaId]);

  const handleAnular = async (comp) => {
    const motivo = prompt('Motivo de anulación:');
    if (!motivo) return;
    try {
      await comprobantesService.anular(comp.id, motivo);
      toast.success('Comprobante anulado');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al anular');
    }
  };

  const handleReintentar = async (comp) => {
    try {
      await comprobantesService.reintentar(comp.id);
      toast.success('Reintento exitoso');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al reintentar');
    }
  };

  const handleConsultar = async (comp) => {
    try {
      await comprobantesService.consultar(comp.id);
      toast.success('Estado actualizado');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al consultar');
    }
  };

  const handleDescargarPdf = async (comp) => {
    try {
      const { data } = await comprobantesService.descargarPdf(comp.id);
      if (data.pdf_url) window.open(data.pdf_url, '_blank');
      else toast.error('PDF no disponible');
    } catch {
      toast.error('Error al descargar PDF');
    }
  };

  const iconBtn = 'p-1.5 rounded-lg border border-steel-700/40 bg-steel-900/30 text-steel-300 hover:text-steel-100 hover:bg-steel-800 transition-all duration-200';

  return (
    <div className="mt-5 pt-5 border-t border-steel-700/40">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
            <HiOutlineDocumentText className="w-4 h-4 text-primary-500" />
          </div>
          <h3 className="text-sm font-semibold text-steel-200 tracking-wide">Comprobantes Electrónicos</h3>
        </div>
        <button onClick={() => setModalEmitir(true)}
          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
          <HiOutlinePlusCircle className="w-4 h-4" /> Emitir
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-12 shimmer rounded-lg" />)}
        </div>
      ) : comprobantes.length === 0 ? (
        <div className="text-center py-5 bg-steel-900/30 rounded-xl border border-steel-700/30">
          <HiOutlineDocumentText className="w-7 h-7 text-steel-500 mx-auto mb-1.5" />
          <p className="text-steel-400 text-xs">Sin comprobantes emitidos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {comprobantes.map((comp) => (
            <div key={comp.id} className="flex items-center justify-between bg-steel-900/40 rounded-xl p-3 border border-steel-700/30 hover:border-steel-600/50 transition-all group">
              <div className="flex items-center gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-steel-200">
                    {TIPO_COMPROBANTE_LABEL[comp.tipo_comprobante] || comp.tipo_comprobante}
                  </p>
                  <p className="text-xs text-steel-400 font-mono tracking-wider">{COMPROBANTE_NUMERO.formatear(comp.serie, comp.numero)}</p>
                </div>
                <ComprobantesBadge estado={comp.estado} />
                <span className="text-xs text-steel-300 font-semibold num-chromium">S/ {parseFloat(comp.total).toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                {comp.pdf_url && (
                  <button onClick={() => handleDescargarPdf(comp)} className={iconBtn} title="Descargar PDF">
                    <HiOutlineDocumentDownload className="w-3.5 h-3.5" />
                  </button>
                )}
                {!comp.anulado && comp.estado !== ESTADO_COMPROBANTE.ERROR && (
                  <button onClick={() => setModalWhatsapp(comp)}
                    className="p-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                    title={WA_COMPROBANTE.btnAccion}>
                    <IconoWhatsapp className="w-3.5 h-3.5" />
                  </button>
                )}
                {comp.proveedor_external_id && !comp.anulado && (
                  <button onClick={() => handleConsultar(comp)} className={iconBtn} title="Consultar SUNAT">
                    <HiOutlineRefresh className="w-3.5 h-3.5" />
                  </button>
                )}
                {comp.estado === ESTADO_COMPROBANTE.ERROR && (
                  <button onClick={() => handleReintentar(comp)}
                    className="p-1.5 rounded-lg border border-accent-500/30 bg-accent-500/10 text-accent-500 hover:bg-accent-500/20 transition-all"
                    title="Reintentar">
                    <HiOutlineRefresh className="w-3.5 h-3.5" />
                  </button>
                )}
                {!comp.anulado && comp.proveedor_external_id && (
                  <>
                    <button onClick={() => setModalNota(comp)}
                      className="px-2 py-1 rounded-lg border border-steel-700/40 bg-steel-900/30 text-steel-300 hover:text-steel-100 hover:bg-steel-800 transition-all text-[10px] font-bold tracking-wider"
                      title="Emitir Nota de Crédito">NC</button>
                    <button onClick={() => handleAnular(comp)}
                      className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/15 transition-all"
                      title="Anular">
                      <HiOutlineXCircle className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalEmitir && (
        <ModalEmitirComprobante
          venta={venta}
          comprobantesExistentes={comprobantes}
          onClose={() => setModalEmitir(false)}
          onSuccess={() => { setModalEmitir(false); cargar(); }}
          onEnviarWhatsapp={(comp) => { setModalEmitir(false); cargar(); setModalWhatsapp(comp); }}
        />
      )}

      {modalWhatsapp && (
        <ModalWhatsappComprobante
          comprobante={modalWhatsapp}
          cerrar={() => setModalWhatsapp(null)}
        />
      )}

      {modalNota && (
        <ModalEmitirNota
          comprobanteRef={modalNota}
          onClose={() => setModalNota(null)}
          onSuccess={() => { setModalNota(null); cargar(); }}
        />
      )}
    </div>
  );
}
