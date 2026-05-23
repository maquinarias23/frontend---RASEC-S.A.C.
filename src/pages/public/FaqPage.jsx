import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineChevronLeft, HiOutlineChevronDown } from 'react-icons/hi';
import api from '../../api/axios';

export default function FaqPage() {
  const [preguntas, setPreguntas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [abierta, setAbierta] = useState(null);

  useEffect(() => {
    api.get('/config-landing')
      .then(res => setPreguntas(res.data?.preguntas_frecuentes || []))
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
            Preguntas Frecuentes
          </h1>
          <p className="text-white/80 text-[15px] mt-2">
            Resolvemos tus dudas mas comunes.
          </p>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-[800px] mx-auto px-5 sm:px-10 py-12">
        {cargando ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-3 border-gray-300 border-t-[#c0392b] rounded-full animate-spin" />
          </div>
        ) : preguntas.length === 0 ? (
          <p className="text-center text-[#4a4a4a] text-lg">Proximamente preguntas frecuentes.</p>
        ) : (
          <div className="space-y-3">
            {preguntas.map((faq) => {
              const isOpen = abierta === faq.id;
              return (
                <div key={faq.id} className="bg-[#fcfcfc] rounded-[12px] border border-[#dcdcdc] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                  <button
                    onClick={() => setAbierta(isOpen ? null : faq.id)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-condensed font-bold text-[16px] text-[#1a1a1a] pr-4">{faq.pregunta}</span>
                    <HiOutlineChevronDown className={`w-5 h-5 text-[#c0392b] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 border-t border-[#eee]">
                      <p className="text-[14px] text-[#4a4a4a] leading-relaxed pt-4 whitespace-pre-line">{faq.respuesta}</p>
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
