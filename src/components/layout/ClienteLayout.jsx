import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import ClienteSidebar from './ClienteSidebar';
import ClienteNavbar from './ClienteNavbar';
import useInactivityLogout from '../../hooks/useInactivityLogout';

export default function ClienteLayout() {
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  useInactivityLogout();

  return (
    <div className="flex h-screen overflow-hidden bg-steel-950">
      <ClienteSidebar
        abierto={sidebarAbierto}
        cerrar={() => setSidebarAbierto(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ClienteNavbar toggleSidebar={() => setSidebarAbierto(!sidebarAbierto)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-chromium bg-chromium-grain relative">
          <div className="relative z-10 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
