import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import IconoWhatsapp from '../ui/IconoWhatsapp';
import { comprobantesService } from '../../services/comprobantesService';
import { TELEFONO_INPUT, WA_COMPROBANTE } from '../../config/constants';
import { abrirWhatsapp, telefonoEsValido } from '../../utils/whatsapp';

// Envío manual de un comprobante al cliente por WhatsApp.
// El backend arma el mensaje por defecto y devuelve el teléfono del cliente
// (el comprobante solo snapshotea nombre/documento/email). Ambos son editables
// aquí: si el cliente no tiene teléfono, se puede escribir uno sin salir del modal.
// El PDF se abre en otra pestaña para adjuntarlo manualmente en el chat.
export default function ModalWhatsappComprobante({ comprobante, cerrar }) {
  const [cargando, setCargando] = useState(true);
  const [telefono, setTelefono] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [pdfUrl, setPdfUrl] = useState(null);

  const comprobanteId = comprobante?.id;

  useEffect(() => {
    if (!comprobanteId) return;
    let vigente = true;
    comprobantesService.mensajeWhatsapp(comprobanteId)
      .then(({ data }) => {
        if (!vigente) return;
        setTelefono(TELEFONO_INPUT.format(data.telefono || ''));
        setMensaje(data.mensaje || '');
        setPdfUrl(data.pdf_url || null);
      })
      .catch((err) => {
        if (!vigente) return;
        toast.error(err.response?.data?.error || WA_COMPROBANTE.errorCargar);
        cerrar();
      })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [comprobanteId]);

  const enviar = () => {
    if (!telefonoEsValido(telefono)) {
      toast.error(TELEFONO_INPUT.MSG_INVALIDO);
      return;
    }
    if (!mensaje.trim()) {
      toast.error(WA_COMPROBANTE.errorMensajeVacio);
      return;
    }
    // El PDF se abre primero: WhatsApp Web toma el foco de la pestaña nueva.
    if (pdfUrl) window.open(pdfUrl, '_blank');
    abrirWhatsapp(telefono, mensaje.trim());
    cerrar();
  };

  return (
    <Modal abierto={Boolean(comprobante)} cerrar={cerrar} titulo={WA_COMPROBANTE.titulo}>
      {cargando ? (
        <div className="space-y-3">
          <div className="h-10 shimmer rounded-lg" />
          <div className="h-32 shimmer rounded-lg" />
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">
              {WA_COMPROBANTE.labelTelefono}
            </label>
            <input
              className="input-field"
              inputMode={TELEFONO_INPUT.INPUT_MODE}
              maxLength={TELEFONO_INPUT.MAX_LENGTH}
              placeholder={TELEFONO_INPUT.PLACEHOLDER}
              value={telefono}
              onChange={(e) => setTelefono(TELEFONO_INPUT.format(e.target.value))}
            />
            {!telefono && (
              <p className="text-xs text-amber-400 mt-1">{WA_COMPROBANTE.ayudaSinTelefono}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">
              {WA_COMPROBANTE.labelMensaje}
            </label>
            <textarea
              className="input-field resize-y"
              rows={Math.max(8, mensaje.split('\n').length + 1)}
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
            />
            <p className="text-xs text-steel-500 mt-1">{WA_COMPROBANTE.ayudaMensaje}</p>
          </div>

          {pdfUrl && (
            <p className="text-xs text-steel-400 bg-steel-800/40 border border-steel-700/40 rounded-lg p-2">
              {WA_COMPROBANTE.ayudaPdf}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={cerrar} className="btn-secondary">
              {WA_COMPROBANTE.btnCancelar}
            </button>
            <button type="button" onClick={enviar} className="btn-primary flex items-center gap-2">
              <IconoWhatsapp className="w-4 h-4" /> {WA_COMPROBANTE.btnAbrir}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
