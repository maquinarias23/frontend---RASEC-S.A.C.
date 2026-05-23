import { Link } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { getRutaInicio } from '../../config/roles';

export default function NoAutorizado() {
  const { usuario } = useAuthStore();

  return (
    <div className="min-h-screen flex items-center justify-center bg-steel-950 px-4">
      <div className="text-center">
        <h1 className="font-display text-8xl text-primary-500 mb-4">403</h1>
        <h2 className="font-display text-3xl tracking-wider text-steel-100 mb-2">ACCESO NO AUTORIZADO</h2>
        <p className="text-steel-400 mb-6">No tienes permisos para acceder a esta página.</p>
        <Link
          to={usuario ? getRutaInicio(usuario.rol) : '/login'}
          className="btn-primary inline-block"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
