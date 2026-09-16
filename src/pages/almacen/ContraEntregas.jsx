import { useState, useMemo } from 'react';
import {
  HiOutlineTruck,
  HiOutlineCash,
  HiOutlineCheckCircle,
  HiOutlineExclamation,
  HiOutlineDocumentText,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineCamera,
  HiOutlineLocationMarker,
  HiOutlineClipboardCheck,
} from 'react-icons/hi';
import useCrud from '../../hooks/useCrud';
import usePaginacion from '../../hooks/usePaginacion';
import TablaGenerica from '../../components/ui/TablaGenerica';
import Paginacion from '../../components/ui/Paginacion';
import Modal from '../../components/ui/Modal';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { formatearMoneda, formatearFechaHora } from '../../utils/formato';
import {
  ESTADO_COMPROBANTE,
  ESTADO_COMPROBANTE_LABEL,
  COMPROBANTE_NUMERO,
  TELEFONO_INPUT,
} from '../../config/constants';

// Guías que todavía no están aceptadas por SUNAT y admiten reintento. Una guía
// aceptada ya cumplió su función y no debe reenviarse: duplicaría el documento.
const GUIA_REINTENTABLE = [
  ESTADO_COMPROBANTE.ERROR,
  ESTADO_COMPROBANTE.RECHAZADO_SUNAT,
  ESTADO_COMPROBANTE.PENDIENTE,
];

const numeroGuia = (guia) => COMPROBANTE_NUMERO.formatear(guia.serie, guia.numero);

const guiaVigente = (venta) => (venta.guias_remision || []).find((g) => !g.anulado) || null;

const colorGuia = (estado) => {
  if (estado === ESTADO_COMPROBANTE.ACEPTADO_SUNAT) return 'bg-emerald-100 text-emerald-700';
  if (estado === ESTADO_COMPROBANTE.ERROR || estado === ESTADO_COMPROBANTE.RECHAZADO_SUNAT) return 'bg-red-100 text-red-700';
  return 'bg-amber-100 text-amber-700';
};

/**
 * Contra-entregas: pedidos que ya salieron del almacén con un motorizado y que
 * el cliente paga al recibir.
 *
 * Es la pantalla donde al de almacén "le figura" que el cliente ya abonó: hasta
 * que el saldo no llega a cero con vouchers aprobados, el botón de autorizar la
 * entrega no se habilita. Esa regla la decide el backend y viaja en
 * `puede_autorizar_entrega`; aquí no se recalcula para que no existan dos
 * versiones de la misma condición.
 */
export default function ContraEntregas() {
  const { datos, cargando, listar } = useCrud('/almacen/contra-entregas');
  const [busqueda, setBusqueda] = useState('');
  const [soloPendientes, setSoloPendientes] = useState(true);

  // Autorizar entrega
  const [ventaEntrega, setVentaEntrega] = useState(null);
  const [observacion, setObservacion] = useState('');
  const [archivoFoto, setArchivoFoto] = useState(null);
  const [previewFoto, setPreviewFoto] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [reintentandoGuia, setReintentandoGuia] = useState(null);

  const datosFiltrados = useMemo(() => {
    let resultado = datos || [];
    if (soloPendientes) resultado = resultado.filter((v) => !v.entregada);
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      resultado = resultado.filter((v) =>
        String(v.id).includes(q)
        || (v.tbl_clientes?.nombre || '').toLowerCase().includes(q)
        || (v.direccion_manual || '').toLowerCase().includes(q)
      );
    }
    return resultado;
  }, [datos, soloPendientes, busqueda]);

  const { datosPaginados, paginaActual, totalPaginas, irAPagina } = usePaginacion(datosFiltrados);

  const pendientesDeCobro = (datos || []).filter((v) => !v.entregada && !v.cobro_completo).length;
  const listasParaEntregar = (datos || []).filter((v) => v.puede_autorizar_entrega).length;

  const abrirAutorizar = (venta) => {
    setVentaEntrega(venta);
    setObservacion('');
    setArchivoFoto(null);
    setPreviewFoto(null);
  };

  const handleFoto = (e) => {
    const file = e.target.files[0];
    setArchivoFoto(file || null);
    setPreviewFoto(file ? URL.createObjectURL(file) : null);
  };

  const autorizarEntrega = async () => {
    if (!ventaEntrega || confirmando) return;
    setConfirmando(true);
    const formData = new FormData();
    if (observacion.trim()) formData.append('observacion', observacion.trim());
    if (archivoFoto) formData.append('foto', archivoFoto);
    try {
      const { data } = await api.post(
        `/almacen/${ventaEntrega.id}/confirmar-entrega-contra-entrega`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      toast.success(data.mensaje);
      setVentaEntrega(null);
      await listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al autorizar la entrega');
    } finally {
      setConfirmando(false);
    }
  };

  // Reintenta el envío de una guía que no llegó a SUNAT. El despacho ya ocurrió:
  // esto solo corrige el documento, no vuelve a mover mercadería.
  const reintentarGuia = async (guia) => {
    if (reintentandoGuia) return;
    setReintentandoGuia(guia.id);
    try {
      const { data } = await api.post(`/guias-remision/${guia.id}/reintentar`);
      const ok = data.estado === ESTADO_COMPROBANTE.ACEPTADO_SUNAT || data.estado === ESTADO_COMPROBANTE.EMITIDO;
      if (ok) toast.success(`Guía ${numeroGuia(data)} reenviada`);
      else toast.error(data.sunat_descripcion || 'La guía sigue sin ser aceptada. Revise los datos del emisor.');
      await listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al reintentar la guía');
    } finally {
      setReintentandoGuia(null);
    }
  };

  const columnas = [
    { key: 'id', label: 'N° Venta' },
    {
      key: 'cliente',
      label: 'Cliente',
      render: (f) => (
        <div>
          <p className="text-steel-100">{f.tbl_clientes?.nombre || '-'}</p>
          {f.tbl_clientes?.telefono_principal && (
            <p className="text-[11px] text-steel-500">{TELEFONO_INPUT.format(f.tbl_clientes.telefono_principal)}</p>
          )}
        </div>
      ),
    },
    {
      key: 'destino',
      label: 'Destino',
      render: (f) => (
        <div className="max-w-[220px]">
          <p className="text-steel-200 text-xs truncate" title={f.direccion_manual || ''}>
            {f.direccion_manual || '—'}
          </p>
          <p className="text-[11px] text-steel-500 truncate">
            {[f.tbl_distritos?.nombre, f.tbl_provincias?.nombre].filter(Boolean).join(' / ')}
          </p>
        </div>
      ),
    },
    {
      key: 'cobro',
      label: 'Cobro',
      render: (f) => (
        <div>
          <p className="text-steel-100 font-medium text-sm">{formatearMoneda(f.total)}</p>
          {f.cobro_completo ? (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold">
              <HiOutlineCheckCircle className="w-3 h-3" /> Pagado
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold">
              <HiOutlineCash className="w-3 h-3" /> Debe {formatearMoneda(f.saldo_pendiente)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'guia',
      label: 'Guía de remisión',
      render: (f) => {
        const guia = guiaVigente(f);
        if (!guia) return <span className="text-xs text-steel-500">Sin guía</span>;
        return (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-steel-200 font-mono">{numeroGuia(guia)}</span>
            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold w-fit ${colorGuia(guia.estado)}`}>
              {ESTADO_COMPROBANTE_LABEL[guia.estado] || guia.estado}
            </span>
          </div>
        );
      },
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (f) => (
        f.entregada ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 rounded-full text-xs font-medium">
            <HiOutlineClipboardCheck className="w-3.5 h-3.5" /> Entregado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-500/15 text-cyan-600 border border-cyan-500/30 rounded-full text-xs font-medium">
            <HiOutlineTruck className="w-3.5 h-3.5" /> Con el motorizado
          </span>
        )
      ),
    },
    { key: 'fecha', label: 'Registrada', render: (f) => formatearFechaHora(f.fecha_hora_registro) },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-steel-100 font-display tracking-wider">Contra-entregas</h1>
        <p className="text-sm text-steel-400 mt-1">
          Pedidos que ya salieron con un motorizado. Autorice la entrega cuando el cliente haya abonado el total.
        </p>
      </div>

      {/* Resumen: lo que el almacén necesita saber de un vistazo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
            <HiOutlineCheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-steel-100 leading-none">{listasParaEntregar}</p>
            <p className="text-xs text-steel-400 mt-0.5">Pagadas — listas para entregar</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <HiOutlineCash className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-steel-100 leading-none">{pendientesDeCobro}</p>
            <p className="text-xs text-steel-400 mt-0.5">En ruta, pendientes de cobro</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full sm:w-auto">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-500" />
            <input
              type="text"
              className="input-field pl-9 w-full text-sm"
              placeholder="Buscar por N° venta, cliente o dirección..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-steel-300 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={soloPendientes}
              onChange={(e) => setSoloPendientes(e.target.checked)}
            />
            Solo pendientes de entrega
          </label>
        </div>
      </div>

      <div className="card">
        <TablaGenerica
          columnas={columnas}
          datos={datosPaginados}
          cargando={cargando}
          vacio="No hay contra-entregas despachadas."
          acciones={(fila) => {
            const guia = guiaVigente(fila);
            return (
              <div className="flex gap-1 flex-wrap">
                {fila.puede_autorizar_entrega && (
                  <button
                    onClick={() => abrirAutorizar(fila)}
                    className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded hover:bg-emerald-200 flex items-center gap-1 font-medium"
                    title="Autorizar la entrega y marcar el pedido como entregado"
                  >
                    <HiOutlineCheckCircle className="w-3.5 h-3.5" /> Autorizar entrega
                  </button>
                )}
                {!fila.entregada && !fila.cobro_completo && (
                  <span
                    className="text-xs bg-steel-800 text-steel-400 px-2 py-1 rounded flex items-center gap-1 cursor-help"
                    title={fila.motivo_bloqueo || ''}
                  >
                    <HiOutlineExclamation className="w-3.5 h-3.5" /> Falta el abono
                  </span>
                )}
                {guia?.pdf_url && (
                  <a
                    href={guia.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 flex items-center gap-1"
                    title="Ver guía de remisión"
                  >
                    <HiOutlineDocumentText className="w-3.5 h-3.5" /> Guía
                  </a>
                )}
                {guia && GUIA_REINTENTABLE.includes(guia.estado) && (
                  <button
                    onClick={() => reintentarGuia(guia)}
                    disabled={reintentandoGuia === guia.id}
                    className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded hover:bg-amber-200 flex items-center gap-1 disabled:opacity-50"
                    title="Reintentar el envío de la guía a SUNAT"
                  >
                    <HiOutlineRefresh className="w-3.5 h-3.5" />
                    {reintentandoGuia === guia.id ? 'Enviando...' : 'Reintentar guía'}
                  </button>
                )}
              </div>
            );
          }}
        />
        <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onChange={irAPagina} />
      </div>

      {/* ================================================================= */}
      {/* MODAL AUTORIZAR ENTREGA                                           */}
      {/* ================================================================= */}
      <Modal
        abierto={!!ventaEntrega}
        cerrar={() => setVentaEntrega(null)}
        titulo={`Autorizar entrega — Venta #${ventaEntrega?.id || ''}`}
        ancho="max-w-lg"
      >
        {ventaEntrega && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3">
              <p className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5">
                <HiOutlineCheckCircle className="w-4 h-4" />
                Pago completo: {formatearMoneda(ventaEntrega.total)}
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                El cliente ya abonó el total y todos los vouchers están aprobados. Puede autorizar al
                motorizado a entregar el pedido.
              </p>
            </div>

            <div className="bg-steel-900/40 border border-steel-700/50 rounded-lg p-3">
              <p className="text-xs font-semibold text-steel-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <HiOutlineLocationMarker className="w-3.5 h-3.5" /> Entrega en
              </p>
              <p className="text-sm text-steel-100">{ventaEntrega.direccion_manual || '—'}</p>
              <p className="text-xs text-steel-400 mt-0.5">
                {[ventaEntrega.tbl_distritos?.nombre, ventaEntrega.tbl_provincias?.nombre, ventaEntrega.tbl_departamentos?.nombre]
                  .filter(Boolean).join(' / ')}
              </p>
              <p className="text-xs text-steel-400 mt-2">
                {ventaEntrega.tbl_clientes?.nombre}
                {ventaEntrega.tbl_clientes?.telefono_principal
                  ? ` — ${TELEFONO_INPUT.format(ventaEntrega.tbl_clientes.telefono_principal)}`
                  : ''}
              </p>
            </div>

            {/* La foto es opcional: la toma el motorizado y no siempre llega en
                el momento en que almacén autoriza. */}
            <div>
              <label className="block text-xs font-medium text-steel-300 mb-1.5">
                Foto de la entrega <span className="text-steel-500">(opcional)</span>
              </label>
              <input type="file" accept="image/*" onChange={handleFoto} className="input-field text-sm" />
              {previewFoto && (
                <img src={previewFoto} alt="Vista previa" className="mt-2 w-full max-h-48 object-contain rounded-lg border border-steel-700" />
              )}
              {!previewFoto && (
                <p className="text-[11px] text-steel-500 mt-1 flex items-center gap-1">
                  <HiOutlineCamera className="w-3.5 h-3.5" />
                  Si el motorizado envía la foto después, puede registrarla más adelante.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-steel-300 mb-1.5">Observación (opcional)</label>
              <input
                className="input-field text-sm"
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                placeholder="Quién recibió, incidencias, etc."
                maxLength={500}
              />
            </div>

            <button
              onClick={autorizarEntrega}
              disabled={confirmando}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <HiOutlineCheckCircle className="w-4 h-4" />
              {confirmando ? 'Confirmando...' : 'Autorizar y marcar como entregado'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
