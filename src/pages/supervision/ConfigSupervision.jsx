import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function ConfigSupervision() {
  const [config, setConfig] = useState({ dias_sin_vender: '', mensaje_personalizado: '', activo: true });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      try {
        const { data } = await api.get('/alerta-inactividad/configuracion');
        if (data) setConfig({
          dias_sin_vender: data.dias_sin_vender,
          mensaje_personalizado: data.mensaje_personalizado,
          activo: data.activo,
        });
      } catch { /* */ }
    };
    cargar();
  }, []);

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await api.put('/alerta-inactividad/configuracion', {
        dias_sin_vender: parseInt(config.dias_sin_vender),
        mensaje_personalizado: config.mensaje_personalizado,
        activo: config.activo,
      });
      toast.success('Configuración de alerta de inactividad guardada');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold font-display tracking-wider text-steel-100 mb-6">Configuración</h1>

      <div className="max-w-lg">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Alerta de Inactividad de Vendedores</h2>
          <p className="text-sm text-steel-400 mb-4">
            Si un vendedor no registra ventas en X días, se le mostrará una alerta al iniciar sesión. También recibirás una notificación.
            Usa <code className="text-primary-400">{'{dias}'}</code> en el mensaje para insertar los días reales.
          </p>
          <form onSubmit={guardar} className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-steel-200 whitespace-nowrap">Activar alerta</label>
              <button
                type="button"
                onClick={() => setConfig({ ...config, activo: !config.activo })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.activo ? 'bg-primary-500' : 'bg-steel-600'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.activo ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1">Días sin vender</label>
              <input
                type="number"
                min="1"
                className="input-field"
                value={config.dias_sin_vender}
                onChange={(e) => setConfig({ ...config, dias_sin_vender: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-steel-200 mb-1">Mensaje personalizado</label>
              <textarea
                className="input-field min-h-[80px]"
                maxLength={500}
                value={config.mensaje_personalizado}
                onChange={(e) => setConfig({ ...config, mensaje_personalizado: e.target.value })}
              />
              <p className="text-xs text-steel-400 mt-1">{config.mensaje_personalizado.length}/500 caracteres</p>
            </div>
            <button type="submit" disabled={guardando} className="btn-primary">
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
