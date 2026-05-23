import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function RutaProtegida({ rolesPermitidos }) {
  const { usuario, token } = useAuthStore();

  if (!token || !usuario) {
    return <Navigate to="/login" replace />;
  }

  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
    return <Navigate to="/no-autorizado" replace />;
  }

  return <Outlet />;
}
