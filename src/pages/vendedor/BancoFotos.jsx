import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HiOutlineUpload, HiOutlinePhotograph, HiOutlineX, HiOutlineShoppingCart, HiOutlineArrowLeft, HiOutlineDownload, HiOutlineZoomIn } from 'react-icons/hi';
import useCrud from '../../hooks/useCrud';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EstadoBadge from '../../components/ui/EstadoBadge';
import { formatearFechaHora } from '../../utils/formato';
import { TIPO_EVIDENCIA, ESTADO_TRACKING, ESTADO_VENTA } from '../../config/constants';
import api from '../../api/axios';
import { buildMediaUrl } from '../../utils/media';
import toast from 'react-hot-toast';

const LABEL_TIPO = {
  boucher_pago: 'Boucher de pago',
  foto_paquete: 'Foto de paquete',
  [TIPO_EVIDENCIA.BOUCHER_ENVIO]: 'Boucher de envio',
  [TIPO_EVIDENCIA.FOTO_ENVIO]: 'Foto de envio',
  [TIPO_EVIDENCIA.FOTO_GENERAL]: 'Foto general',
};

const BADGE_TIPO = {
  boucher_pago: 'bg-emerald-100 text-emerald-600 border border-emerald-300',
  foto_paquete: 'bg-purple-100 text-purple-600 border border-purple-300',
  [TIPO_EVIDENCIA.BOUCHER_ENVIO]: 'bg-amber-100 text-amber-600 border border-amber-300',
  [TIPO_EVIDENCIA.FOTO_ENVIO]: 'bg-blue-100 text-blue-700 border border-blue-300',
  [TIPO_EVIDENCIA.FOTO_GENERAL]: 'bg-steel-200 text-steel-700 border border-steel-300',
};

const ORDEN_TIPOS = [
  'boucher_pago',
  TIPO_EVIDENCIA.BOUCHER_ENVIO,
  'foto_paquete',
  TIPO_EVIDENCIA.FOTO_ENVIO,
  TIPO_EVIDENCIA.FOTO_GENERAL,
];

export default function BancoFotos() {
  const { datos: gruposVenta, cargando, listar } = useCrud('/banco-fotos/consolidado');
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [modal, setModal] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const [tipo, setTipo] = useState(TIPO_EVIDENCIA.FOTO_GENERAL);
  const [preview, setPreview] = useState(null);
  const [subiendoEvidencia, setSubiendoEvidencia] = useState(false);
  const [ventasDisponibles, setVentasDisponibles] = useState([]);
  const [ventaIdModal, setVentaIdModal] = useState('');
  const [lightbox, setLightbox] = useState(null);

  const ESTADOS_VIGENTES = [ESTADO_VENTA.PENDIENTE_APROBACION, ESTADO_VENTA.ACTIVA];

  useEffect(() => {
    api.get('/ventas').then(({ data }) => {
      setVentasDisponibles(data.filter((v) => ESTADOS_VIGENTES.includes(v.estado_venta)));
    }).catch(() => {});
  }, []);

  const subir = async (e) => {
    e.preventDefault();
    if (!archivo || subiendoEvidencia) return;
    const ventaIdFinal = ventaSeleccionada ? ventaSeleccionada.ventaId : ventaIdModal;
    if (!ventaIdFinal) {
      toast.error('Selecciona una venta para asociar la evidencia');
      return;
    }
    setSubiendoEvidencia(true);
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('tipo', tipo);
    formData.append('venta_id', ventaIdFinal);
    try {
      await api.post('/banco-fotos/subir', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`Evidencia subida y asignada a Venta #${ventaIdFinal}`);
      setModal(false);
      setArchivo(null);
      setPreview(null);
      listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al subir evidencia');
    } finally {
      setSubiendoEvidencia(false);
    }
  };

  const handleArchivo = (e) => {
    const file = e.target.files[0];
    setArchivo(file);
    if (file) setPreview(URL.createObjectURL(file));
    else setPreview(null);
  };

  const abrirModal = () => {
    setArchivo(null);
    setPreview(null);
    setTipo(TIPO_EVIDENCIA.FOTO_GENERAL);
    setVentaIdModal('');
    setModal(true);
  };

  const imgUrl = (foto) => buildMediaUrl(foto.archivo);

  // ===== MODAL SUBIR EVIDENCIA (compartido) =====
  const modalSubir = (
    <Modal abierto={modal} cerrar={() => setModal(false)} titulo="Subir Evidencia">
      <form onSubmit={subir} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-steel-200 mb-1">
            Tipo de Evidencia
          </label>
          <select
            className="input-field"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            <option value={TIPO_EVIDENCIA.FOTO_GENERAL}>Foto general</option>
            <option value={TIPO_EVIDENCIA.BOUCHER_ENVIO}>Boucher de envio</option>
            <option value={TIPO_EVIDENCIA.FOTO_ENVIO}>Foto de envio</option>
          </select>
        </div>

        {!ventaSeleccionada && (
          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">
              Venta relacionada
            </label>
            <select
              className="input-field"
              value={ventaIdModal}
              onChange={(e) => setVentaIdModal(e.target.value)}
              required
            >
              <option value="">Seleccionar venta...</option>
              {ventasDisponibles.map((v) => (
                <option key={v.id} value={v.id}>
                  #{v.id} — {v.tbl_clientes?.nombre || 'Sin cliente'}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-steel-200 mb-1">
            Archivo
          </label>
          <input
            type="file"
            className="input-field"
            onChange={handleArchivo}
            accept="image/*"
            required
          />
        </div>

        {preview && (
          <div className="mt-2 relative">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-40 object-contain rounded-lg bg-steel-900/50 border border-steel-700"
            />
            <button
              type="button"
              onClick={() => { setArchivo(null); setPreview(null); }}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
            >
              <HiOutlineX className="w-3 h-3" />
            </button>
          </div>
        )}

        {ventaSeleccionada && (
          <div className="bg-blue-600 border border-blue-700 rounded-lg p-3">
            <p className="text-xs text-white font-semibold leading-relaxed">
              La evidencia se asignará automáticamente a la <strong>Venta #{ventaSeleccionada.ventaId}</strong>.
            </p>
          </div>
        )}

        {tipo === TIPO_EVIDENCIA.BOUCHER_ENVIO && (
          <div className="bg-primary-600 border border-primary-700 rounded-lg p-3">
            <p className="text-xs text-white font-semibold leading-relaxed">
              Los bouchers de envio actualizan el tracking de la venta a
              &quot;{ESTADO_TRACKING.DEJADO_EN_AGENCIA.replace(/_/g, ' ').toUpperCase()}&quot; al ser asignados.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => setModal(false)} className="btn-secondary" disabled={subiendoEvidencia}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={subiendoEvidencia}>
            {subiendoEvidencia ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <HiOutlineUpload className="w-4 h-4" />
                Subir
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );

  // ===== VISTA DETALLE DE VENTA =====
  if (ventaSeleccionada) {
    const grupo = gruposVenta.find((g) => g.ventaId === ventaSeleccionada.ventaId);
    const fotos = grupo?.fotos || [];

    const fotosPorTipo = {};
    fotos.forEach((f) => {
      const t = f.tipo || TIPO_EVIDENCIA.FOTO_GENERAL;
      if (!fotosPorTipo[t]) fotosPorTipo[t] = [];
      fotosPorTipo[t].push(f);
    });

    const tiposPresentes = ORDEN_TIPOS.filter((t) => fotosPorTipo[t]?.length > 0);

    return (
      <div>
        {/* Header */}
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setVentaSeleccionada(null)}
              className="p-2 rounded-lg bg-steel-800 hover:bg-steel-700 text-steel-300 hover:text-steel-100 transition-colors"
            >
              <HiOutlineArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-steel-100 font-display tracking-wider">
                Venta #{ventaSeleccionada.ventaId}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-sm text-steel-400">{ventaSeleccionada.cliente}</span>
                <span className="text-steel-600">·</span>
                <EstadoBadge estado={ventaSeleccionada.estado} />
                <span className="text-steel-600">·</span>
                <span className="text-sm text-steel-400">
                  {fotos.length} evidencia{fotos.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
          <button onClick={abrirModal} className="btn-primary flex items-center gap-2">
            <HiOutlineUpload className="w-4 h-4" />
            Subir Evidencia
          </button>
        </div>

        {/* Fotos agrupadas por tipo */}
        {fotos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <HiOutlinePhotograph className="w-16 h-16 text-steel-500 mb-4" />
            <p className="text-steel-400 text-lg font-medium">Sin evidencias</p>
            <p className="text-steel-500 text-sm mt-1">
              Sube la primera evidencia para esta venta
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {tiposPresentes.map((tipoKey) => (
              <div key={tipoKey}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${BADGE_TIPO[tipoKey] || BADGE_TIPO[TIPO_EVIDENCIA.FOTO_GENERAL]}`}>
                    {LABEL_TIPO[tipoKey] || tipoKey}
                  </span>
                  <span className="text-xs text-steel-500">
                    ({fotosPorTipo[tipoKey].length})
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {fotosPorTipo[tipoKey].map((foto) => (
                    <div
                      key={foto.id}
                      className="card p-3 group cursor-pointer"
                      onClick={() => setLightbox(imgUrl(foto))}
                    >
                      <div className="aspect-square bg-steel-800 rounded-lg mb-2 flex items-center justify-center overflow-hidden relative">
                        <img
                          src={imgUrl(foto)}
                          alt="Evidencia"
                          className="object-cover w-full h-full"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML =
                              '<div class="flex flex-col items-center justify-center w-full h-full"><svg class="w-10 h-10 text-steel-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg><span class="text-xs text-steel-500 mt-1">Sin preview</span></div>';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <HiOutlineZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                        </div>
                      </div>
                      <p className="text-xs text-steel-500">
                        {formatearFechaHora(foto.fecha_hora)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {modalSubir}

        {/* Lightbox foto maximizada */}
        {lightbox && createPortal(
          <div className="fixed inset-0 z-[70] flex items-center justify-center" onClick={() => setLightbox(null)}>
            <div className="fixed inset-0 bg-black/90 backdrop-blur-sm" />
            <div className="relative z-10 max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              {lightbox.match(/\.pdf$/i) ? (
                <iframe src={lightbox} title="Evidencia PDF" className="w-[80vw] h-[85vh] rounded-lg shadow-2xl bg-white" />
              ) : (
                <img src={lightbox} alt="Evidencia" className="max-h-[85vh] object-contain rounded-lg shadow-2xl" />
              )}
              <div className="absolute top-3 right-3 flex gap-2">
                <a href={lightbox} download target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-colors">
                  <HiOutlineDownload className="w-5 h-5" />
                </a>
                <button onClick={() => setLightbox(null)} className="w-9 h-9 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-colors">
                  <HiOutlineX className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  // ===== VISTA LISTA DE VENTAS =====
  return (
    <div>
      {/* Cabecera */}
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <div>
          <h1 className="text-2xl font-bold text-steel-100 font-display tracking-wider">
            Banco de Fotos
          </h1>
          <p className="text-sm text-steel-400 mt-1">
            Evidencias organizadas por venta
          </p>
        </div>
        <button onClick={abrirModal} className="btn-primary flex items-center gap-2">
          <HiOutlineUpload className="w-4 h-4" />
          Subir Evidencia
        </button>
      </div>

      {/* Tabla de ventas */}
      {cargando ? (
        <LoadingSpinner texto="Cargando evidencias..." />
      ) : gruposVenta.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <HiOutlinePhotograph className="w-16 h-16 text-steel-500 mb-4" />
          <p className="text-steel-400 text-lg font-medium">
            No hay evidencias subidas
          </p>
          <p className="text-steel-500 text-sm mt-1">
            Las evidencias apareceran aqui agrupadas por venta
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-steel-700/50">
                <th className="text-left text-xs font-semibold text-steel-400 uppercase tracking-wider px-4 py-3">
                  N° Venta
                </th>
                <th className="text-left text-xs font-semibold text-steel-400 uppercase tracking-wider px-4 py-3">
                  Cliente
                </th>
                <th className="text-left text-xs font-semibold text-steel-400 uppercase tracking-wider px-4 py-3">
                  Estado
                </th>
                <th className="text-center text-xs font-semibold text-steel-400 uppercase tracking-wider px-4 py-3">
                  Fotos
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-steel-800/50">
              {gruposVenta.map((grupo) => (
                <tr
                  key={grupo.ventaId}
                  onClick={() => setVentaSeleccionada(grupo)}
                  className="cursor-pointer hover:bg-steel-800/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary-500/15 flex items-center justify-center shrink-0">
                        <HiOutlineShoppingCart className="w-3.5 h-3.5 text-primary-500" />
                      </div>
                      <span className="text-sm font-semibold text-steel-100">
                        #{grupo.ventaId}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-steel-300">{grupo.cliente}</span>
                  </td>
                  <td className="px-4 py-3">
                    <EstadoBadge estado={grupo.estado} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center min-w-[28px] h-7 rounded-full bg-steel-700/50 text-sm font-medium text-steel-200 px-2">
                      {grupo.fotos.length}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalSubir}
    </div>
  );
}
