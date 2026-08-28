import { useState, useEffect } from 'react';
import { configFacturacionService } from '../../services/comprobantesService';
import {
  TIPO_COMPROBANTE, TIPO_COMPROBANTE_LABEL, FORMATO_PDF, MONEDA, TIPO_IGV,
  COMPROBANTE_NUMERO, TELEFONO_INPUT, SERIE_COMPROBANTE, PROVEEDOR_CPE,
} from '../../config/constants';
import toast from 'react-hot-toast';
import {
  HiOutlineKey, HiOutlinePlusCircle, HiOutlineCheck, HiOutlineX,
  HiOutlineDocumentText, HiOutlineOfficeBuilding, HiOutlineShieldCheck,
  HiOutlineCollection, HiOutlineLightningBolt, HiOutlineSave, HiOutlineGlobeAlt,
  HiOutlineStatusOnline, HiOutlineExclamation, HiOutlineLogin,
} from 'react-icons/hi';

const PROVEEDOR_NOMBRE = PROVEEDOR_CPE.NOMBRE;
const PROVEEDOR_DESCRIPCION = `${PROVEEDOR_CPE.PLATAFORMA} (${PROVEEDOR_CPE.DOMINIO})`;
const MASCARA_TOKEN_SUFIJO = '****';

const FORM_INICIAL = {
  proveedor_token: '',
  proveedor_base_url: '',
  ruc_emisor: '',
  razon_social_emisor: '',
  direccion_emisor: '',
  telefono_emisor: '',
  formato_pdf: FORMATO_PDF.A4,
  moneda_defecto: MONEDA.PEN,
  igv_tipo_defecto: TIPO_IGV.GRAVADO,
  activo: false,
};

const CREDENCIALES_INICIALES = { email: '', password: '' };

export default function ConfigFacturacion() {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [nuevaSerie, setNuevaSerie] = useState({ tipo_comprobante: '', serie: '' });
  const [credenciales, setCredenciales] = useState(CREDENCIALES_INICIALES);
  const [autenticando, setAutenticando] = useState(false);
  const [probando, setProbando] = useState(false);
  const [diagnostico, setDiagnostico] = useState(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const [configRes, seriesRes] = await Promise.all([
        configFacturacionService.obtener(),
        configFacturacionService.listarSeries(),
      ]);
      setSeries(seriesRes.data);
      setForm({
        proveedor_token: configRes.data.proveedor_token || '',
        proveedor_base_url: configRes.data.proveedor_base_url || '',
        ruc_emisor: configRes.data.ruc_emisor || '',
        razon_social_emisor: configRes.data.razon_social_emisor || '',
        direccion_emisor: configRes.data.direccion_emisor || '',
        telefono_emisor: TELEFONO_INPUT.format(configRes.data.telefono_emisor),
        formato_pdf: configRes.data.formato_pdf || FORMATO_PDF.A4,
        moneda_defecto: configRes.data.moneda_defecto || MONEDA.PEN,
        igv_tipo_defecto: configRes.data.igv_tipo_defecto || TIPO_IGV.GRAVADO,
        activo: configRes.data.activo || false,
      });
    } catch { toast.error('Error al cargar configuración'); }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const handleGuardar = async () => {
    // El teléfono es opcional, pero si se carga debe estar completo: el rótulo
    // de despacho lo imprime como contacto del remitente.
    if (form.telefono_emisor && !TELEFONO_INPUT.esValido(form.telefono_emisor)) {
      toast.error(TELEFONO_INPUT.MSG_INVALIDO);
      return;
    }
    setSaving(true);
    try {
      await configFacturacionService.actualizar(form);
      toast.success('Configuración guardada');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    }
    setSaving(false);
  };

  // Pide el token al proveedor con las credenciales del panel (POST /login del
  // manual) en lugar de copiarlo a mano, que es de donde salen los errores.
  const handleAutenticar = async () => {
    if (!credenciales.email || !credenciales.password) {
      toast.error('Ingrese el correo y la contraseña de su cuenta de ' + PROVEEDOR_NOMBRE);
      return;
    }
    setAutenticando(true);
    try {
      const { data } = await configFacturacionService.autenticar({
        ...credenciales,
        proveedor_base_url: form.proveedor_base_url,
      });
      toast.success(data.mensaje);
      setCredenciales(CREDENCIALES_INICIALES);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo obtener el token');
    }
    setAutenticando(false);
  };

  const handleProbarConexion = async () => {
    setProbando(true);
    setDiagnostico(null);
    try {
      const { data } = await configFacturacionService.probarConexion();
      setDiagnostico({ ok: true, mensaje: data.mensaje, advertencias: data.advertencias || [] });
      toast.success(data.mensaje);
    } catch (err) {
      const mensaje = err.response?.data?.error || 'No se pudo conectar con el proveedor';
      setDiagnostico({ ok: false, mensaje, advertencias: [] });
      toast.error(mensaje);
    }
    setProbando(false);
  };

  const handleCrearSerie = async () => {
    if (!nuevaSerie.tipo_comprobante || !nuevaSerie.serie) {
      toast.error('Complete tipo y serie');
      return;
    }
    // Se valida aquí antes de llamar al backend para dar el motivo exacto:
    // una serie con el prefijo equivocado hace que SUNAT rechace el comprobante.
    const errorSerie = SERIE_COMPROBANTE.validar(nuevaSerie.tipo_comprobante, nuevaSerie.serie);
    if (errorSerie) {
      toast.error(errorSerie);
      return;
    }
    try {
      await configFacturacionService.crearSerie(nuevaSerie);
      toast.success('Serie creada');
      setNuevaSerie({ tipo_comprobante: '', serie: '' });
      const { data } = await configFacturacionService.listarSeries();
      setSeries(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear serie');
    }
  };

  const handleToggle = async (id) => {
    try {
      await configFacturacionService.toggleSerie(id);
      const { data } = await configFacturacionService.listarSeries();
      setSeries(data);
    } catch { toast.error('Error al actualizar serie'); }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <div className="h-10 w-72 shimmer rounded-lg" />
        <div className="card space-y-4">
          <div className="h-6 w-48 shimmer rounded" />
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-10 shimmer rounded-lg" />)}
          </div>
        </div>
      </div>
    );
  }

  const seriesActivas = series.filter(s => s.activa).length;

  // Ayuda contextual del formulario de series: prefijo exigido y error en vivo.
  const prefijosSerie = SERIE_COMPROBANTE.PREFIJOS_VALIDOS[nuevaSerie.tipo_comprobante] || [];
  const esNota = nuevaSerie.tipo_comprobante === TIPO_COMPROBANTE.NOTA_CREDITO
    || nuevaSerie.tipo_comprobante === TIPO_COMPROBANTE.NOTA_DEBITO;
  const errorNuevaSerie = nuevaSerie.tipo_comprobante && nuevaSerie.serie
    ? SERIE_COMPROBANTE.validar(nuevaSerie.tipo_comprobante, nuevaSerie.serie)
    : null;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display tracking-wider text-steel-100 accent-line pb-3">
            FACTURACIÓN ELECTRÓNICA
          </h1>
          <p className="text-sm text-steel-400 mt-2">
            Integración con {PROVEEDOR_NOMBRE} — {PROVEEDOR_DESCRIPCION}
          </p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 ${form.activo
          ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.1)]'
          : 'bg-steel-800 border-steel-700'
        }`}>
          <div className={`w-2.5 h-2.5 rounded-full transition-colors ${form.activo ? 'bg-emerald-500 animate-pulse' : 'bg-steel-500'}`} />
          <span className={`text-sm font-semibold ${form.activo ? 'text-emerald-600' : 'text-steel-400'}`}>
            {form.activo ? 'ACTIVO' : 'INACTIVO'}
          </span>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-3 gap-4 animate-slide-up stagger-1">
        <div className="card flex items-center gap-4 group hover:border-steel-600 transition-all">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center border bg-primary-500/10 border-primary-500/20 text-primary-500">
            <HiOutlineDocumentText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-steel-400">Series Activas</p>
            <p className="text-2xl font-bold text-steel-100">{seriesActivas}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 group hover:border-steel-600 transition-all">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center border bg-blue-500/10 border-blue-500/20 text-blue-500">
            <HiOutlineCollection className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-steel-400">Total Series</p>
            <p className="text-2xl font-bold text-steel-100">{series.length}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 group hover:border-steel-600 transition-all">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center border bg-emerald-500/10 border-emerald-500/20 text-emerald-600">
            <HiOutlineShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-steel-400">Token</p>
            <p className="text-2xl font-bold text-steel-100">{form.proveedor_token ? 'Configurado' : '—'}</p>
          </div>
        </div>
      </div>

      {/* Sección: Credenciales & Conexión */}
      <div className="card noise-overlay animate-slide-up stagger-2">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
              <HiOutlineKey className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h2 className="font-display text-xl tracking-wider text-steel-100">CONEXIÓN {PROVEEDOR_NOMBRE.toUpperCase()}</h2>
              <p className="text-xs text-steel-400">Credenciales del proveedor de facturación electrónica</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-steel-300 tracking-wide uppercase">URL del proveedor</label>
              <div className="relative">
                <HiOutlineGlobeAlt className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-500" />
                <input type="text" className="input-field font-mono text-sm pl-9" value={form.proveedor_base_url}
                  onChange={e => setForm(prev => ({ ...prev, proveedor_base_url: e.target.value }))}
                  placeholder={PROVEEDOR_CPE.URL_DEMO} />
              </div>
              <p className="text-[10px] text-steel-400">
                Subdominio de su empresa en {PROVEEDOR_CPE.DOMINIO} terminado en <span className="font-mono">/api</span>.
                Para pruebas: <span className="font-mono">{PROVEEDOR_CPE.URL_DEMO}</span>
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-steel-300 tracking-wide uppercase">Token de acceso</label>
              <div className="relative">
                <input type="text" className="input-field font-mono text-sm pr-20" value={form.proveedor_token}
                  onChange={e => setForm(prev => ({ ...prev, proveedor_token: e.target.value }))}
                  placeholder={`Token Bearer de ${PROVEEDOR_NOMBRE}`} />
                {form.proveedor_token && form.proveedor_token.includes(MASCARA_TOKEN_SUFIJO) && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    Guardado
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Obtener el token con las credenciales del panel del proveedor */}
          <div className="mt-5 p-4 bg-steel-900/60 rounded-xl border border-steel-700/40">
            <p className="text-sm font-medium text-steel-200 mb-1">¿No tiene el token a la mano?</p>
            <p className="text-xs text-steel-400 mb-3">
              Ingrese el correo y la contraseña con los que entra al panel de {PROVEEDOR_CPE.PLATAFORMA} y
              el sistema obtendrá el token por usted. Las credenciales no se guardan.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-semibold text-steel-300 tracking-wide uppercase">Correo</label>
                <input type="email" autoComplete="off" className="input-field text-sm" value={credenciales.email}
                  onChange={e => setCredenciales(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="usuario@empresa.com" />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs font-semibold text-steel-300 tracking-wide uppercase">Contraseña</label>
                <input type="password" autoComplete="new-password" className="input-field text-sm" value={credenciales.password}
                  onChange={e => setCredenciales(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••" />
              </div>
              <button onClick={handleAutenticar} disabled={autenticando}
                className="btn-secondary flex items-center justify-center gap-2 whitespace-nowrap">
                {autenticando
                  ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <HiOutlineLogin className="w-5 h-5" />}
                Obtener token
              </button>
            </div>
          </div>

          {/* Prueba de conexión y diagnóstico previo a facturar */}
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-steel-400">
                Verifica credenciales, datos del emisor y series antes de emitir el primer comprobante.
              </p>
              <button onClick={handleProbarConexion} disabled={probando}
                className="btn-secondary flex items-center gap-2 whitespace-nowrap">
                {probando
                  ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <HiOutlineStatusOnline className="w-5 h-5" />}
                Probar conexión
              </button>
            </div>

            {diagnostico && (
              <div className={`rounded-xl border p-4 text-sm animate-fade-in ${diagnostico.ok
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                : 'bg-red-500/10 border-red-500/30 text-red-500'
              }`}>
                <p className="font-semibold flex items-center gap-2">
                  {diagnostico.ok ? <HiOutlineCheck className="w-4 h-4" /> : <HiOutlineX className="w-4 h-4" />}
                  {diagnostico.mensaje}
                </p>
                {diagnostico.advertencias.length > 0 && (
                  <ul className="mt-3 space-y-1.5 text-amber-500">
                    {diagnostico.advertencias.map((a, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <HiOutlineExclamation className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Toggle activo */}
          <div className="mt-5 pt-5 border-t border-steel-700/40 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-steel-200">Activar facturación electrónica</p>
              <p className="text-xs text-steel-400">Al activar, se habilitará la emisión de comprobantes en todo el sistema</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={form.activo}
                onChange={e => setForm(prev => ({ ...prev, activo: e.target.checked }))} />
              <div className="w-11 h-6 bg-steel-700 rounded-full peer peer-checked:bg-primary-500 transition-colors duration-300
                after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5
                after:transition-all peer-checked:after:translate-x-full after:shadow-md" />
            </label>
          </div>
        </div>
      </div>

      {/* Sección: Datos del Emisor */}
      <div className="card noise-overlay animate-slide-up stagger-3">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <HiOutlineOfficeBuilding className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="font-display text-xl tracking-wider text-steel-100">DATOS DEL EMISOR</h2>
              <p className="text-xs text-steel-400">Información de la empresa que aparecerá en los comprobantes y como remitente en los rótulos</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-steel-300 tracking-wide uppercase">RUC Emisor</label>
              <input type="text" className="input-field font-mono tracking-wider" maxLength={11} value={form.ruc_emisor}
                onChange={e => setForm(prev => ({ ...prev, ruc_emisor: e.target.value.replace(/\D/g, '') }))} placeholder="20XXXXXXXXX" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-steel-300 tracking-wide uppercase">Razón Social</label>
              <input type="text" className="input-field" value={form.razon_social_emisor}
                onChange={e => setForm(prev => ({ ...prev, razon_social_emisor: e.target.value }))} placeholder="Nombre de la empresa" />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold text-steel-300 tracking-wide uppercase">Dirección Fiscal</label>
              <input type="text" className="input-field" value={form.direccion_emisor}
                onChange={e => setForm(prev => ({ ...prev, direccion_emisor: e.target.value }))} placeholder="Dirección registrada en SUNAT" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-steel-300 tracking-wide uppercase">Teléfono de Contacto</label>
              <input type="text" className="input-field font-mono tracking-wider"
                inputMode={TELEFONO_INPUT.INPUT_MODE} pattern={TELEFONO_INPUT.PATTERN}
                maxLength={TELEFONO_INPUT.MAX_LENGTH} value={form.telefono_emisor}
                onChange={e => setForm(prev => ({ ...prev, telefono_emisor: TELEFONO_INPUT.format(e.target.value) }))}
                placeholder={TELEFONO_INPUT.PLACEHOLDER} />
              <p className="text-[10px] text-steel-400">Se imprime como remitente en los rótulos de despacho.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sección: Preferencias de Emisión */}
      <div className="card noise-overlay animate-slide-up stagger-4">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-accent-500/10 border border-accent-500/20 flex items-center justify-center">
              <HiOutlineLightningBolt className="w-5 h-5 text-accent-500" />
            </div>
            <div>
              <h2 className="font-display text-xl tracking-wider text-steel-100">PREFERENCIAS DE EMISIÓN</h2>
              <p className="text-xs text-steel-400">Valores por defecto al emitir comprobantes</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-x-6 gap-y-5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-steel-300 tracking-wide uppercase">Formato PDF</label>
              <select className="input-field" value={form.formato_pdf}
                onChange={e => setForm(prev => ({ ...prev, formato_pdf: e.target.value }))}>
                {Object.entries(FORMATO_PDF).map(([k, v]) => <option key={k} value={v}>{k === 'TICKET' ? 'Ticket (80mm)' : v}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-steel-300 tracking-wide uppercase">Moneda</label>
              <select className="input-field" value={form.moneda_defecto}
                onChange={e => setForm(prev => ({ ...prev, moneda_defecto: e.target.value }))}>
                {Object.entries(MONEDA).map(([k, v]) => <option key={k} value={v}>{k} — {v}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-steel-300 tracking-wide uppercase">Tipo de IGV</label>
              <select className="input-field" value={form.igv_tipo_defecto}
                onChange={e => setForm(prev => ({ ...prev, igv_tipo_defecto: e.target.value }))}>
                <option value={TIPO_IGV.GRAVADO}>Gravado (18%)</option>
                <option value={TIPO_IGV.EXONERADO}>Exonerado</option>
                <option value={TIPO_IGV.INAFECTO}>Inafecto</option>
              </select>
            </div>
          </div>

          {/* Botón guardar */}
          <div className="flex justify-end mt-6 pt-5 border-t border-steel-700/40">
            <button onClick={handleGuardar} disabled={saving}
              className="btn-primary flex items-center gap-2 px-6">
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <HiOutlineSave className="w-5 h-5" />
                  Guardar Configuración
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Sección: Series */}
      <div className="card noise-overlay animate-slide-up stagger-5">
        <div className="relative z-10">
          <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <HiOutlineCollection className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h2 className="font-display text-xl tracking-wider text-steel-100">SERIES DE COMPROBANTES</h2>
                <p className="text-xs text-steel-400">Gestión de series y correlativos para cada tipo de comprobante</p>
              </div>
            </div>
          </div>

          {/* Formulario nueva serie */}
          <div className="flex gap-3 items-end p-4 bg-steel-900/60 rounded-xl border border-steel-700/40 mb-6">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-semibold text-steel-300 tracking-wide uppercase">Tipo de comprobante</label>
              <select className="input-field" value={nuevaSerie.tipo_comprobante}
                onChange={e => setNuevaSerie(prev => ({ ...prev, tipo_comprobante: e.target.value }))}>
                <option value="">Seleccionar tipo...</option>
                {Object.entries(TIPO_COMPROBANTE).map(([k, v]) => (
                  <option key={k} value={v}>{TIPO_COMPROBANTE_LABEL[v]}</option>
                ))}
              </select>
            </div>
            <div className="w-40 space-y-1">
              <label className="text-xs font-semibold text-steel-300 tracking-wide uppercase">Serie</label>
              <input type="text" className="input-field font-mono tracking-widest text-center uppercase"
                maxLength={SERIE_COMPROBANTE.LONGITUD}
                value={nuevaSerie.serie}
                onChange={e => setNuevaSerie(prev => ({ ...prev, serie: e.target.value.toUpperCase() }))}
                placeholder={prefijosSerie[0] ? `${prefijosSerie[0]}001` : 'F001'} />
            </div>
            <button onClick={handleCrearSerie}
              className="btn-primary flex items-center gap-2 whitespace-nowrap">
              <HiOutlinePlusCircle className="w-5 h-5" /> Crear Serie
            </button>
          </div>

          {/* Aviso del prefijo exigido por SUNAT para el tipo elegido */}
          {nuevaSerie.tipo_comprobante && (
            <p className={`-mt-4 mb-6 text-xs flex items-start gap-2 ${errorNuevaSerie ? 'text-red-500' : 'text-steel-400'}`}>
              <HiOutlineExclamation className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                {errorNuevaSerie || `SUNAT exige que la serie de ${TIPO_COMPROBANTE_LABEL[nuevaSerie.tipo_comprobante]} `
                  + `empiece por ${prefijosSerie.join(' o ')} y tenga ${SERIE_COMPROBANTE.LONGITUD} caracteres.`}
                {esNota && ' La nota hereda la letra del comprobante que afecta: F para notas sobre facturas, B para notas sobre boletas.'}
              </span>
            </p>
          )}

          {/* Tabla de series */}
          <div className="rounded-xl border border-steel-700/40 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-steel-900/50 border-b border-steel-700/40">
                  <th className="text-left py-3 px-4 font-semibold text-steel-300 tracking-wide text-xs uppercase">Tipo</th>
                  <th className="text-left py-3 px-4 font-semibold text-steel-300 tracking-wide text-xs uppercase">Serie</th>
                  <th className="text-right py-3 px-4 font-semibold text-steel-300 tracking-wide text-xs uppercase">Último N°</th>
                  <th className="text-center py-3 px-4 font-semibold text-steel-300 tracking-wide text-xs uppercase">Estado</th>
                  <th className="text-center py-3 px-4 font-semibold text-steel-300 tracking-wide text-xs uppercase">Acción</th>
                </tr>
              </thead>
              <tbody>
                {series.map((s, i) => (
                  <tr key={s.id} className={`border-b border-steel-800/60 hover:bg-steel-800/50 transition-colors animate-fade-in stagger-${Math.min(i + 1, 6)}`}>
                    <td className="py-3 px-4">
                      <span className="text-steel-200 font-medium">{TIPO_COMPROBANTE_LABEL[s.tipo_comprobante]}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-steel-100 tracking-widest bg-steel-900/60 px-2.5 py-1 rounded border border-steel-700/40 text-xs font-bold">
                        {s.serie}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="num-chromium text-steel-200 font-semibold">{String(s.correlativo_actual).padStart(COMPROBANTE_NUMERO.LONGITUD_CORRELATIVO, '0')}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`badge border ${s.activa
                        ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                        : 'bg-red-500/15 text-red-600 border-red-500/30'
                      }`}>
                        {s.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => handleToggle(s.id)}
                        className={`p-1.5 rounded-lg border transition-all duration-200 hover:scale-105 active:scale-95 ${s.activa
                          ? 'border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/15 hover:border-red-500/40'
                          : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500 hover:bg-emerald-500/15 hover:border-emerald-500/40'
                        }`}
                        title={s.activa ? 'Desactivar' : 'Activar'}>
                        {s.activa ? <HiOutlineX className="w-4 h-4" /> : <HiOutlineCheck className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
                {series.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <HiOutlineCollection className="w-10 h-10 text-steel-600 mx-auto mb-3" />
                      <p className="text-steel-400 font-medium">No hay series creadas</p>
                      <p className="text-steel-500 text-xs mt-1">Cree su primera serie usando el formulario de arriba</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
