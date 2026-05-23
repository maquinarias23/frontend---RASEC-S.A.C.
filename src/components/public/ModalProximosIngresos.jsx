import { useState, useEffect, useCallback } from 'react';
import { HiOutlineX, HiOutlineClock, HiOutlinePhone } from 'react-icons/hi';
import api from '../../api/axios';
import { formatearFecha } from '../../utils/formato';

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '';

export default function ModalProximosIngresos({ visible, onClose }) {
  const [data, setData] = useState({ importaciones: [], compras: [] });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!visible) return;
    setCargando(true);
    setError(null);

    api.get('/productos/proximos-ingresos')
      .then(({ data: res }) => {
        const d = res?.data || res || {};
        setData({
          importaciones: Array.isArray(d.importaciones) ? d.importaciones : [],
          compras: Array.isArray(d.compras) ? d.compras : [],
        });
      })
      .catch(() => setError('No se pudieron cargar los datos'))
      .finally(() => setCargando(false));
  }, [visible]);

  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  if (!visible) return null;

  const allItems = [
    ...data.importaciones.map((item) => ({ ...item, _tipo: 'importacion' })),
    ...data.compras.map((item) => ({ ...item, _tipo: 'compra_local' })),
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-steel-50/60 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-steel-950 rounded-2xl border border-steel-700/60 shadow-steel animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-steel-700/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center">
              <HiOutlineClock className="w-5 h-5 text-accent-500" />
            </div>
            <h2 className="font-display text-2xl sm:text-3xl tracking-wider text-steel-100">
              PROXIMOS INGRESOS
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-steel-800 border border-steel-700 text-steel-300 hover:text-steel-100 hover:bg-steel-700 transition-colors"
          >
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {cargando ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 border-3 border-steel-700 border-t-accent-500 rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-16 text-steel-400">
              <p>{error}</p>
            </div>
          ) : allItems.length === 0 ? (
            <div className="text-center py-16">
              <HiOutlineClock className="w-16 h-16 text-steel-600 mx-auto mb-4" />
              <p className="text-steel-400 text-lg">No hay ingresos programados por el momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {allItems.map((item, i) => {
                const esImportacion = item._tipo === 'importacion';
                const fecha = esImportacion ? item.fecha_desembarque : item.fecha_compra;
                const items = item.items || [];

                const productNames = items
                  .map((it) => it.tbl_productos?.nombre || 'Producto')
                  .join(', ');
                const reservaMsg = `Hola, me interesa reservar del proximo ingreso: ${productNames}`;

                return (
                  <div
                    key={`${item._tipo}-${item.id}`}
                    className="card p-5 border-accent-500/20 hover:border-accent-500/40 transition-all duration-300"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${
                          esImportacion
                            ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                            : 'bg-accent-500/10 text-accent-600 border border-accent-500/20'
                        }`}
                      >
                        {esImportacion ? 'Importacion' : 'Compra Local'}
                      </span>
                      {fecha && (
                        <span className="text-[10px] text-steel-500">
                          Est. {formatearFecha(fecha)}
                        </span>
                      )}
                    </div>

                    {items.map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center justify-between py-2 border-b border-steel-800 last:border-0"
                      >
                        <span className="text-sm text-steel-200 truncate flex-1">
                          {it.tbl_productos?.nombre || 'Producto'}
                        </span>
                        <span className="text-xs text-accent-600 font-medium ml-2 whitespace-nowrap">
                          {it.cantidad} uds.
                        </span>
                      </div>
                    ))}

                    <a
                      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(reservaMsg)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 w-full flex items-center justify-center gap-2 text-accent-600 hover:text-accent-500 text-sm font-medium transition-colors"
                    >
                      <HiOutlinePhone className="w-4 h-4" />
                      Reservar por WhatsApp
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
