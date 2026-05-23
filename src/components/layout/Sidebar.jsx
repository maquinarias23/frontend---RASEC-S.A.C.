import { NavLink } from 'react-router-dom';
import { HiOutlineLogout, HiX } from 'react-icons/hi';
import useAuthStore from '../../store/authStore';
import { menuPorRol } from '../../config/menuItems';
import Logo from '../ui/Logo';

export default function Sidebar({ abierto, cerrar }) {
  const { usuario, logout } = useAuthStore();
  const items = menuPorRol[usuario?.rol] || [];

  return (
    <>
      {abierto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={cerrar} />
      )}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-steel-900 z-50 transform transition-transform duration-300 lg:translate-x-0 ${
          abierto ? 'translate-x-0' : '-translate-x-full'
        } lg:static lg:z-auto flex flex-col border-r border-steel-800`}
      >
        {/* Red accent line at top */}
        <div className="h-[2px] bg-gradient-to-r from-primary-500 via-primary-600 to-transparent" />

        {/* Logo header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-steel-800/60">
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
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-primary-500/15 text-primary-600 border-l-2 border-primary-500 -ml-[2px] pl-[14px]'
                    : 'text-steel-300 hover:bg-steel-800 hover:text-steel-100'
                }`
              }
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <item.icon className="w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-steel-800/60 px-4 py-3 bg-steel-950/40">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-sm font-bold shadow-forge">
              {usuario?.nombres?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-steel-200 truncate">{usuario?.nombres}</div>
              <div className="text-[10px] text-steel-500 truncate uppercase tracking-wider">
                {usuario?.rol?.replace(/_/g, ' ')}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-steel-400 hover:text-primary-600 transition-colors w-full group"
          >
            <HiOutlineLogout className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
