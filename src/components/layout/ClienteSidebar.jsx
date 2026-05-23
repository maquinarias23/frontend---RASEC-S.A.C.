import { NavLink } from 'react-router-dom';
import { HiOutlineLogout, HiX } from 'react-icons/hi';
import useAuthStore from '../../store/authStore';
import usePuntosStore from '../../store/puntosStore';
import { menuPorRol } from '../../config/menuItems';
import Logo from '../ui/Logo';

const NIVELES_CLIENTE = [
  { min: 0, label: 'Miembro', color: 'text-steel-400 border-steel-500/30 bg-steel-700/20' },
  { min: 50, label: 'Plata', color: 'text-steel-300 border-steel-400/40 bg-steel-600/20' },
  { min: 200, label: 'Oro', color: 'text-amber-500 border-amber-500/40 bg-amber-500/10' },
];

function getNivelCliente(puntos) {
  let nivel = NIVELES_CLIENTE[0];
  for (const n of NIVELES_CLIENTE) {
    if (puntos >= n.min) nivel = n;
  }
  return nivel;
}

export default function ClienteSidebar({ abierto, cerrar }) {
  const { usuario, logout } = useAuthStore();
  const items = menuPorRol[usuario?.rol] || [];
  const { saldo: puntos } = usePuntosStore();

  const nivel = getNivelCliente(puntos);

  return (
    <>
      {abierto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={cerrar} />
      )}
      <aside
        className={`fixed top-0 left-0 h-full w-64 z-50 transform transition-transform duration-300 lg:translate-x-0 ${
          abierto ? 'translate-x-0' : '-translate-x-full'
        } lg:static lg:z-auto flex flex-col`}
        style={{
          background: 'linear-gradient(180deg, #ebeef2 0%, #ebeef2 60%, #d5dae0 100%)',
        }}
      >
        {/* Top accent line */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-primary-500 to-transparent" />

        {/* Logo header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid transparent', borderImage: 'linear-gradient(90deg, transparent, rgba(188,195,203,0.4), transparent) 1' }}>
          <Logo size="sm" showText={true} className="flex-shrink-0" />
          <button onClick={cerrar} className="lg:hidden text-steel-400 hover:text-steel-100 transition-colors">
            <HiX className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {items.map((item, i) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={cerrar}
              className={({ isActive }) =>
                `nav-chromium ${isActive ? 'active' : ''}`
              }
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <item.icon className={`w-5 h-5 flex-shrink-0 transition-all duration-200 group-hover:scale-110 nav-icon`} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-4 py-3"
          style={{ borderTop: '1px solid transparent', borderImage: 'linear-gradient(90deg, transparent, rgba(188,195,203,0.4), transparent) 1', background: 'rgba(213,218,224,0.4)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-sm font-bold shadow-forge ring-1 ring-steel-700 ring-offset-1 ring-offset-steel-900">
              {usuario?.nombres?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-steel-200 truncate">{usuario?.nombres}</div>
              <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-[0.2em] border ${nivel.color}`}>
                {nivel.label}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-steel-400 hover:text-primary-600 transition-colors w-full group"
          >
            <HiOutlineLogout className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
            Cerrar sesion
          </button>
        </div>
      </aside>
    </>
  );
}
