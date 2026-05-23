import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import { getRutaInicio } from '../../config/roles';
import Logo from '../../components/ui/Logo';
import api from '../../api/axios';
import { TELEFONO_INPUT, SESION_EXPIRADA_FLAG_KEY, SESION_EXPIRADA_MSG } from '../../config/constants';

export default function Login() {
  const [modo, setModo] = useState('login'); // 'login' | 'registro'
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [recordar, setRecordar] = useState(false);
  const [errores, setErrores] = useState({});
  const { login, cargando } = useAuthStore();
  const navigate = useNavigate();

  // Registro
  const [regNombre, setRegNombre] = useState('');
  const [regTelefono, setRegTelefono] = useState('');
  const [regCorreo, setRegCorreo] = useState('');
  const [regContrasena, setRegContrasena] = useState('');
  const [registrando, setRegistrando] = useState(false);
  const [erroresReg, setErroresReg] = useState({});
  const [verPass, setVerPass] = useState(false);
  const [verPassReg, setVerPassReg] = useState(false);

  useEffect(() => {
    const correoGuardado = localStorage.getItem('rasek_correo_guardado');
    if (correoGuardado) {
      setCorreo(correoGuardado);
      setRecordar(true);
    }
    if (sessionStorage.getItem(SESION_EXPIRADA_FLAG_KEY) === '1') {
      sessionStorage.removeItem(SESION_EXPIRADA_FLAG_KEY);
      toast.error(SESION_EXPIRADA_MSG);
    }
  }, []);

  // =========================================================================
  // LOGIN
  // =========================================================================

  const validar = () => {
    const e = {};
    if (!correo.trim()) e.correo = 'El correo es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) e.correo = 'Correo inválido';
    if (!contrasena) e.contrasena = 'La contraseña es obligatoria';
    else if (contrasena.length < 4) e.contrasena = 'Mínimo 4 caracteres';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validar()) return;
    try {
      if (recordar) localStorage.setItem('rasek_correo_guardado', correo);
      else localStorage.removeItem('rasek_correo_guardado');

      const data = await login(correo, contrasena);
      toast.success(`Bienvenido, ${data.usuario?.nombres || ''}`);
      navigate(getRutaInicio(data.usuario.rol), { replace: true });
    } catch (err) {
      toast.error(err.message || 'Credenciales incorrectas');
    }
  };

  // =========================================================================
  // REGISTRO
  // =========================================================================

  const validarRegistro = () => {
    const e = {};
    if (!regNombre.trim()) e.nombre = 'El nombre es obligatorio';
    if (!regTelefono.trim()) e.telefono = 'El telefono es obligatorio';
    else if (!TELEFONO_INPUT.esValido(regTelefono)) e.telefono = TELEFONO_INPUT.MSG_INVALIDO;
    if (!regCorreo.trim()) e.correo = 'El correo es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regCorreo)) e.correo = 'Correo invalido';
    if (regContrasena && regContrasena.length < 4) e.contrasena = 'Minimo 4 caracteres';
    setErroresReg(e);
    return Object.keys(e).length === 0;
  };

  const handleRegistro = async (e) => {
    e.preventDefault();
    if (!validarRegistro()) return;
    setRegistrando(true);
    try {
      await api.post('/auth/registro', {
        nombre: regNombre.trim(),
        telefono: TELEFONO_INPUT.toDigits(regTelefono),
        correo: regCorreo.trim() || undefined,
        contrasena: regContrasena || undefined,
      });
      toast.success('Registro exitoso. Ahora puedes iniciar sesion.');
      // Pre-llenar el login con el correo si lo proporcionó
      if (regCorreo.trim()) setCorreo(regCorreo.trim());
      setModo('login');
      setRegNombre('');
      setRegTelefono('');
      setRegCorreo('');
      setRegContrasena('');
      setErroresReg({});
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrarse');
    } finally {
      setRegistrando(false);
    }
  };

  // =========================================================================
  // ACCESOS RAPIDOS
  // =========================================================================

  const accesosRapidos = [
    { label: 'Super Admin', correo: 'admin@raseksaka.com', color: 'from-red-600 to-red-800' },
    { label: 'Administrador', correo: 'administrador@raseksaka.com', color: 'from-orange-600 to-orange-800' },
    { label: 'Secretaria', correo: 'secretaria@raseksaka.com', color: 'from-pink-600 to-pink-800' },
    { label: 'Supervisión', correo: 'supervision@raseksaka.com', color: 'from-purple-600 to-purple-800' },
    { label: 'Vendedor', correo: 'vendedor@raseksaka.com', color: 'from-blue-600 to-blue-800' },
    { label: 'Almacén', correo: 'almacen@raseksaka.com', color: 'from-emerald-600 to-emerald-800' },
    { label: 'Chofer', correo: 'chofer@raseksaka.com', color: 'from-amber-600 to-amber-800' },
    { label: 'Asistencia', correo: 'asistencia@raseksaka.com', color: 'from-cyan-600 to-cyan-800' },
    { label: 'Cliente', correo: 'cliente@raseksaka.com', color: 'from-teal-600 to-teal-800' },
  ];

  const handleAccesoRapido = (acc) => {
    setCorreo(acc.correo);
    setContrasena('admin123');
    setErrores({});
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="min-h-screen flex items-center justify-center bg-steel-950 px-4 py-8 relative overflow-hidden">
      {/* Back to landing */}
      <Link
        to="/"
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-steel-400 hover:text-steel-100 transition-colors duration-200 group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span className="text-sm font-medium">Volver al inicio</span>
      </Link>

      {/* Background elements */}
      <div className="absolute inset-0 bg-dot-grid opacity-40" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent" />

      {/* Decorative logo watermark — top right */}
      <div className="absolute -top-16 -right-16 opacity-[0.04] pointer-events-none">
        <img src="/logo-rasec.png" alt="" width="320" height="320" className="animate-gear-spin" />
      </div>

      {/* Decorative logo watermark — bottom left */}
      <div className="absolute -bottom-12 -left-12 opacity-[0.03] pointer-events-none">
        <img src="/logo-rasec.png" alt="" width="240" height="240" className="animate-gear-spin" style={{ animationDirection: 'reverse', animationDuration: '18s' }} />
      </div>

      {/* Card */}
      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Logo size="2xl" />
        </div>

        {modo === 'login' ? (
          /* =============================================================== */
          /* FORMULARIO LOGIN                                                */
          /* =============================================================== */
          <form onSubmit={handleSubmit} className="bg-steel-900/90 backdrop-blur-md rounded-2xl border border-steel-700/50 p-8 space-y-5 shadow-steel">
            {/* Red accent bar */}
            <div className="h-[2px] bg-gradient-to-r from-primary-500 via-primary-600 to-transparent -mt-8 mb-6 -mx-8 rounded-t-2xl" />

            <h2 className="font-display text-2xl text-steel-100 text-center tracking-wider">INICIAR SESION</h2>

            <div>
              <label className="block text-sm font-medium text-steel-300 mb-1.5">Correo electrónico</label>
              <input
                type="email"
                value={correo}
                onChange={(e) => { setCorreo(e.target.value); if (errores.correo) setErrores({ ...errores, correo: '' }); }}
                className={`input-field ${errores.correo ? 'border-red-500 focus:ring-red-500/40' : ''}`}
                placeholder="correo@raseksaka.com"
              />
              {errores.correo && <p className="text-xs text-red-600 mt-1">{errores.correo}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-steel-300 mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={verPass ? 'text' : 'password'}
                  value={contrasena}
                  onChange={(e) => { setContrasena(e.target.value); if (errores.contrasena) setErrores({ ...errores, contrasena: '' }); }}
                  className={`input-field pr-10 ${errores.contrasena ? 'border-red-500 focus:ring-red-500/40' : ''}`}
                  placeholder="Tu contraseña"
                />
                <button type="button" onClick={() => setVerPass(!verPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-400 hover:text-steel-200 transition-colors">
                  {verPass ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                </button>
              </div>
              {errores.contrasena && <p className="text-xs text-red-600 mt-1">{errores.contrasena}</p>}
            </div>

            <label className="flex items-center gap-2 text-sm text-steel-400 cursor-pointer">
              <input
                type="checkbox"
                checked={recordar}
                onChange={(e) => setRecordar(e.target.checked)}
                className="rounded border-steel-600 bg-steel-800 text-primary-500 focus:ring-primary-500/40"
              />
              Recordar mi correo
            </label>

            <button
              type="submit"
              disabled={cargando}
              className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
            >
              {cargando ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Ingresando...
                </>
              ) : 'Ingresar'}
            </button>

            {/* Link a registro */}
            <p className="text-center text-sm text-steel-400">
              ¿No tienes cuenta?{' '}
              <button type="button" onClick={() => { setModo('registro'); setErrores({}); }} className="text-primary-500 hover:text-primary-400 font-medium">
                Registrate aqui
              </button>
            </p>

            {/* Quick access buttons — solo en desarrollo */}
            {!import.meta.env.PROD && (
              <div className="border-t border-steel-700/50 pt-4">
                <p className="text-xs text-steel-500 text-center mb-3 uppercase tracking-wider">Acceso rápido (demo)</p>
                <div className="grid grid-cols-3 gap-2">
                  {accesosRapidos.map((acc) => (
                    <button
                      key={acc.correo}
                      type="button"
                      onClick={() => handleAccesoRapido(acc)}
                      className={`bg-gradient-to-b ${acc.color} text-white text-[10px] py-1.5 px-1 rounded-lg font-medium transition-all duration-200 truncate hover:scale-105 hover:shadow-lg active:scale-95`}
                    >
                      {acc.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        ) : (
          /* =============================================================== */
          /* FORMULARIO REGISTRO                                             */
          /* =============================================================== */
          <form onSubmit={handleRegistro} className="bg-steel-900/90 backdrop-blur-md rounded-2xl border border-steel-700/50 p-8 space-y-5 shadow-steel">
            {/* Red accent bar */}
            <div className="h-[2px] bg-gradient-to-r from-primary-500 via-primary-600 to-transparent -mt-8 mb-6 -mx-8 rounded-t-2xl" />

            <h2 className="font-display text-2xl text-steel-100 text-center tracking-wider">CREAR CUENTA</h2>

            <div>
              <label className="block text-sm font-medium text-steel-300 mb-1.5">Nombre completo <span className="text-red-600">*</span></label>
              <input
                type="text"
                value={regNombre}
                onChange={(e) => { setRegNombre(e.target.value); if (erroresReg.nombre) setErroresReg({ ...erroresReg, nombre: '' }); }}
                className={`input-field ${erroresReg.nombre ? 'border-red-500 focus:ring-red-500/40' : ''}`}
                placeholder="Tu nombre completo"
              />
              {erroresReg.nombre && <p className="text-xs text-red-600 mt-1">{erroresReg.nombre}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-steel-300 mb-1.5">Telefono <span className="text-red-600">*</span></label>
              <input
                type="tel"
                inputMode={TELEFONO_INPUT.INPUT_MODE}
                pattern={TELEFONO_INPUT.PATTERN}
                maxLength={TELEFONO_INPUT.MAX_LENGTH}
                placeholder={TELEFONO_INPUT.PLACEHOLDER}
                value={regTelefono}
                onChange={(e) => { setRegTelefono(TELEFONO_INPUT.format(e.target.value)); if (erroresReg.telefono) setErroresReg({ ...erroresReg, telefono: '' }); }}
                className={`input-field ${erroresReg.telefono ? 'border-red-500 focus:ring-red-500/40' : ''}`}
              />
              {erroresReg.telefono && <p className="text-xs text-red-600 mt-1">{erroresReg.telefono}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-steel-300 mb-1.5">Correo electronico <span className="text-red-600">*</span></label>
              <input
                type="email"
                value={regCorreo}
                onChange={(e) => { setRegCorreo(e.target.value); if (erroresReg.correo) setErroresReg({ ...erroresReg, correo: '' }); }}
                className={`input-field ${erroresReg.correo ? 'border-red-500 focus:ring-red-500/40' : ''}`}
                placeholder="correo@ejemplo.com"
              />
              {erroresReg.correo && <p className="text-xs text-red-600 mt-1">{erroresReg.correo}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-steel-300 mb-1.5">Contraseña <span className="text-steel-500 text-xs font-normal">(opcional)</span></label>
              <div className="relative">
                <input
                  type={verPassReg ? 'text' : 'password'}
                  value={regContrasena}
                  onChange={(e) => { setRegContrasena(e.target.value); if (erroresReg.contrasena) setErroresReg({ ...erroresReg, contrasena: '' }); }}
                  className={`input-field pr-10 ${erroresReg.contrasena ? 'border-red-500 focus:ring-red-500/40' : ''}`}
                  placeholder="Se genera automaticamente si se deja vacia"
                />
                <button type="button" onClick={() => setVerPassReg(!verPassReg)} className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-400 hover:text-steel-200 transition-colors">
                  {verPassReg ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                </button>
              </div>
              {erroresReg.contrasena && <p className="text-xs text-red-600 mt-1">{erroresReg.contrasena}</p>}
            </div>

            <button
              type="submit"
              disabled={registrando}
              className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
            >
              {registrando ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Registrando...
                </>
              ) : 'Crear Cuenta'}
            </button>

            {/* Link a login */}
            <p className="text-center text-sm text-steel-400">
              ¿Ya tienes cuenta?{' '}
              <button type="button" onClick={() => { setModo('login'); setErroresReg({}); }} className="text-primary-500 hover:text-primary-400 font-medium">
                Inicia sesion
              </button>
            </p>
          </form>
        )}

        <p className="text-center text-steel-500 text-xs mt-6 tracking-wider">
          MAQUINARIAS RASEC S.A.C &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
