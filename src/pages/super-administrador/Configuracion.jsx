import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function Configuracion() {
  const [puntos, setPuntos] = useState({ soles_por_punto_ganado: '', valor_soles_por_punto_canje: '' });

  // Alerta de inactividad
  const [alertaConfig, setAlertaConfig] = useState({ dias_sin_vender: '', mensaje_personalizado: '', activo: true });
  const [guardandoAlerta, setGuardandoAlerta] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      try {
        const { data: configPuntos } = await api.get('/puntos/configuracion');
        if (configPuntos) setPuntos({ soles_por_punto_ganado: configPuntos.soles_por_punto_ganado, valor_soles_por_punto_canje: configPuntos.valor_soles_por_punto_canje });
      } catch { /* */ }
      try {
        const { data: configAlerta } = await api.get('/alerta-inactividad/configuracion');
        if (configAlerta) setAlertaConfig({
          dias_sin_vender: configAlerta.dias_sin_vender,
          mensaje_personalizado: configAlerta.mensaje_personalizado,
          activo: configAlerta.activo,
        });
      } catch { /* */ }
    };
    cargar();
  }, []);

  const guardarPuntos = async (e) => {
    e.preventDefault();
    try {
      await api.post('/puntos/configuracion', puntos);
      toast.success('Configuración de puntos guardada');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const guardarAlertaInactividad = async (e) => {
    e.preventDefault();
    setGuardandoAlerta(true);
    try {
      await api.put('/alerta-inactividad/configuracion', {
        dias_sin_vender: parseInt(alertaConfig.dias_sin_vender),
        mensaje_personalizado: alertaConfig.mensaje_personalizado,
        activo: alertaConfig.activo,
      });
      toast.success('Configuración de alerta de inactividad guardada');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardandoAlerta(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold font-display tracking-wider text-steel-100 mb-6">Configuración Global</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Puntos de fidelización */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Puntos de Fidelización</h2>
          <form onSubmit={guardarPuntos} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1">Soles por punto ganado</label>
              <input type="number" step="0.0001" className="input-field" value={puntos.soles_por_punto_ganado} onChange={(e) => setPuntos({ ...puntos, soles_por_punto_ganado: e.target.value })} />
              <p className="text-xs text-steel-400 mt-1">Cada X soles de compra se gana 1 punto</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1">Valor en soles por punto canjeado</label>
              <input type="number" step="0.0001" className="input-field" value={puntos.valor_soles_por_punto_canje} onChange={(e) => setPuntos({ ...puntos, valor_soles_por_punto_canje: e.target.value })} />
              <p className="text-xs text-steel-400 mt-1">Cada punto canjeado equivale a X soles de descuento</p>
            </div>
            <button type="submit" className="btn-primary">Guardar Puntos</button>
          </form>
        </div>

        {/* Comisiones info */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Comisiones de Vendedores</h2>
          <p className="text-sm text-steel-400">
            La configuración de comisiones (rangos, ranking y metas) se gestiona desde el módulo de RRHH.
          </p>
        </div>

        {/* Alerta de Inactividad de Vendedores */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Alerta de Inactividad de Vendedores</h2>
          <p className="text-sm text-steel-400 mb-4">
            Si un vendedor no registra ventas en X días, se le mostrará una alerta al iniciar sesión. El supervisor también será notificado.
            Usa <code className="text-primary-400">{'{dias}'}</code> en el mensaje para insertar los días reales.
          </p>
          <form onSubmit={guardarAlertaInactividad} className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-steel-200 whitespace-nowrap">Activar alerta</label>
              <button
                type="button"
                onClick={() => setAlertaConfig({ ...alertaConfig, activo: !alertaConfig.activo })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${alertaConfig.activo ? 'bg-primary-500' : 'bg-steel-600'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${alertaConfig.activo ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1">Días sin vender</label>
              <input
                type="number"
                min="1"
                className="input-field"
                value={alertaConfig.dias_sin_vender}
                onChange={(e) => setAlertaConfig({ ...alertaConfig, dias_sin_vender: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1">Mensaje personalizado</label>
              <textarea
                className="input-field min-h-[80px]"
                maxLength={500}
                value={alertaConfig.mensaje_personalizado}
                onChange={(e) => setAlertaConfig({ ...alertaConfig, mensaje_personalizado: e.target.value })}
              />
              <p className="text-xs text-steel-400 mt-1">{alertaConfig.mensaje_personalizado.length}/500 caracteres</p>
            </div>
            <button type="submit" disabled={guardandoAlerta} className="btn-primary">
              {guardandoAlerta ? 'Guardando...' : 'Guardar Alerta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
