import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import ModalAlertaInactividad from './ModalAlertaInactividad';
import useInactivityLogout from '../../hooks/useInactivityLogout';

export default function AppLayout() {
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  useInactivityLogout();

  return (
    <div className="flex h-screen overflow-hidden bg-steel-950">
      <Sidebar
        abierto={sidebarAbierto}
        cerrar={() => setSidebarAbierto(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar toggleSidebar={() => setSidebarAbierto(!sidebarAbierto)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-steel-950 bg-dot-grid">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
      <ModalAlertaInactividad />
    </div>
  );
}
