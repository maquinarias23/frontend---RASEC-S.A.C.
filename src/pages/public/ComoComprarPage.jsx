import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineChevronLeft, HiOutlineCog, HiOutlineTruck, HiOutlinePhone,
  HiOutlineOfficeBuilding, HiOutlineCreditCard, HiOutlineGlobeAlt,
  HiOutlineShoppingCart, HiOutlineLocationMarker, HiOutlineClipboardCheck, HiOutlineGift,
} from 'react-icons/hi';
import api from '../../api/axios';

const ICON_MAP = {
  maquinaria: HiOutlineCog,
  envio: HiOutlineTruck,
  garantia: HiOutlineClipboardCheck,
  puntos: HiOutlineGift,
  tienda: HiOutlineOfficeBuilding,
  web: HiOutlineCreditCard,
  whatsapp: HiOutlinePhone,
};

export default function ComoComprarPage() {
  const [metodos, setMetodos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.get('/config-landing')
      .then(res => setMetodos(res.data?.metodos_compra || []))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-gradient-to-b from-white to-[#f0f0f0] border-b border-[#dcdcdc] shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-10 flex items-center justify-between h-[70px]">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-[#4a4a4a] hover:text-[#c0392b] transition-colors text-sm font-semibold">
              <HiOutlineChevronLeft className="w-5 h-5" />
              Inicio
            </Link>
            <div className="w-px h-8 bg-[#dcdcdc]" />
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo-rasec.png" alt="Rasec" className="w-9 h-9 object-contain" />
              <div className="hidden sm:block leading-[1.1]">
                <div className="font-condensed font-extrabold text-[16px] text-[#1a1a1a] uppercase">Maquinarias</div>
                <div className="font-condensed font-bold text-[12px] text-[#c0392b] uppercase">RASEC S.A.C</div>
              </div>
            </Link>
          </div>
          <Link to="/login" className="text-sm font-semibold text-[#1a1a1a] hover:text-[#c0392b] transition-colors">
            Iniciar Sesion
          </Link>
        </div>
      </nav>

      {/* Header */}
      <div className="bg-gradient-to-b from-[#607590] to-[#7a92a8] py-14">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-10 text-center">
          <h1 className="font-condensed font-black text-[36px] sm:text-[46px] text-white uppercase tracking-[1px]">
            Como Comprar
          </h1>
          <p className="text-white/80 text-[15px] mt-2">
            Conoce nuestros metodos de compra y los lugares a donde llevamos tus productos.
          </p>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-[1100px] mx-auto px-5 sm:px-10 py-12">
        {cargando ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-3 border-gray-300 border-t-[#c0392b] rounded-full animate-spin" />
          </div>
        ) : metodos.length === 0 ? (
          <p className="text-center text-[#4a4a4a] text-lg">Proximamente informacion sobre nuestros metodos de compra.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {metodos.map((m, i) => {
              const Icon = ICON_MAP[m.icono_key] || HiOutlineShoppingCart;
              return (
                <div key={m.id} className="bg-[#fcfcfc] rounded-[12px] border border-[#dcdcdc] p-6 shadow-[0_4px_15px_rgba(0,0,0,0.06)] flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6 text-[#c0392b]" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#f0f0f0] flex items-center justify-center text-[#4a4a4a] font-condensed font-black text-[14px]">
                      {i + 1}
                    </div>
                  </div>
                  <h2 className="font-condensed font-black text-[20px] text-[#1a1a1a] uppercase mb-3">{m.titulo}</h2>
                  <p className="text-[14px] text-[#4a4a4a] leading-relaxed whitespace-pre-line flex-1">{m.descripcion}</p>
                  {m.destinos && (
                    <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-[#eee] text-[13px] text-[#c0392b] font-semibold">
                      <HiOutlineLocationMarker className="w-4 h-4" />
                      {m.destinos}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-[#fcfcfc] py-4 px-5 sm:px-10 border-t-2 border-[#dcdcdc] text-center">
        <p className="text-xs text-[#4a4a4a]">MAQUINARIAS RASEC S.A.C &copy; {new Date().getFullYear()} — Todos los derechos reservados</p>
      </footer>
    </div>
  );
}
