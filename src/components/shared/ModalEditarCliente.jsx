import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import DialogConfirmacion from '../ui/DialogConfirmacion';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  TELEFONO_INPUT, DNI_RUC_INPUT, EMAIL_INPUT, CLIENTE_FORM,
  TIPO_DOCUMENTO_CLIENTE, TIPO_DOCUMENTO_CLIENTE_LABEL,
} from '../../config/constants';
import { obtenerDepartamentos, obtenerProvincias, obtenerDistritos } from '../../services/ubigeoService';

const FORM_VACIO = {
  nombre: '', dni: '', telefono_principal: '', telefono_secundario: '', correo: '', contrasena: '',
  tipo_documento: TIPO_DOCUMENTO_CLIENTE.DNI, ruc: '', email: '', direccion_fiscal: '',
  distrito_fiscal_id: '',
};

// Modal reusable para crear/editar cliente. Incluye datos fiscales (requeridos
// para emisión de comprobantes electrónicos: RUC, dirección fiscal y ubigeo).
export default function ModalEditarCliente({ abierto, cerrar, cliente, onGuardado }) {
  const [form, setForm] = useState(FORM_VACIO);
  const [verPass, setVerPass] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mostrarFiscal, setMostrarFiscal] = useState(false);
  // Cliente existente detectado por DNI/RUC duplicado, pendiente de confirmar
  // la vinculación a la cartera del vendedor actual.
  const [confirmVinc, setConfirmVinc] = useState(null);
  // Resultado de la verificación del documento mientras se escribe:
  // null | { estado: 'verificando' } | { estado: 'existe', cliente, yaVinculado }
  const [dniCheck, setDniCheck] = useState(null);
  const [vinculando, setVinculando] = useState(false);

  // Estado del selector cascada de ubigeo
  const [departamentos, setDepartamentos] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [departamentoId, setDepartamentoId] = useState('');
  const [provinciaId, setProvinciaId] = useState('');

  const modoEditar = Boolean(cliente);

  useEffect(() => {
    if (!abierto) return;
    obtenerDepartamentos()
      .then(({ data }) => setDepartamentos(Array.isArray(data) ? data : []))
      .catch(() => setDepartamentos([]));
  }, [abierto]);

  // Sincroniza el form cuando cambia el cliente o se abre el modal
  useEffect(() => {
    if (!abierto) return;
    if (cliente) {
      setForm({
        nombre: cliente.nombre || '',
        dni: cliente.dni || '',
        telefono_principal: TELEFONO_INPUT.format(cliente.telefono_principal || ''),
        telefono_secundario: TELEFONO_INPUT.format(cliente.telefono_secundario || ''),
        correo: cliente.tbl_usuarios?.correo || '',
        contrasena: '',
        tipo_documento: cliente.tipo_documento || TIPO_DOCUMENTO_CLIENTE.DNI,
        ruc: cliente.ruc || '',
        email: cliente.email || '',
        direccion_fiscal: cliente.direccion_fiscal || '',
        distrito_fiscal_id: cliente.distrito_fiscal_id ? String(cliente.distrito_fiscal_id) : '',
      });

      const distritoCargado = cliente.tbl_distrito_fiscal;
      if (distritoCargado) {
        const deptoCargado = distritoCargado.tbl_provincias?.tbl_departamentos;
        const provCargada = distritoCargado.tbl_provincias;
        setMostrarFiscal(true);
        if (deptoCargado?.id) {
          setDepartamentoId(String(deptoCargado.id));
          obtenerProvincias(deptoCargado.id)
            .then(({ data }) => {
              setProvincias(Array.isArray(data) ? data : []);
              if (provCargada?.id) {
                setProvinciaId(String(provCargada.id));
                obtenerDistritos(provCargada.id)
                  .then((res) => setDistritos(Array.isArray(res.data) ? res.data : []))
                  .catch(() => setDistritos([]));
              }
            })
            .catch(() => setProvincias([]));
        }
      } else {
        setMostrarFiscal(Boolean(cliente.ruc || cliente.direccion_fiscal || cliente.email));
        setDepartamentoId('');
        setProvinciaId('');
        setProvincias([]);
        setDistritos([]);
      }
    } else {
      setForm(FORM_VACIO);
      setMostrarFiscal(false);
      setDepartamentoId('');
      setProvinciaId('');
      setProvincias([]);
      setDistritos([]);
    }
    setVerPass(false);
    setDniCheck(null);
    setConfirmVinc(null);
  }, [abierto, cliente]);

  // Verifica el documento contra TODOS los clientes (no solo la cartera propia).
  // Sin esto un vendedor no ve a un cliente que existe pero no es suyo y acaba
  // creando un duplicado. El `verificando` lo enciende el onChange del input:
  // aquí solo se publica el resultado, ya dentro de una callback asíncrona.
  useEffect(() => {
    if (!abierto) return;
    const digits = DNI_RUC_INPUT.toDigits(form.dni);
    if (!DNI_RUC_INPUT.esValido(digits)) return;

    let vigente = true;
    const temporizador = setTimeout(async () => {
      try {
        const { data } = await api.get('/clientes/verificar-dni', {
          params: { dni: digits, ...(cliente?.id ? { excluir_id: cliente.id } : {}) },
        });
        if (!vigente) return;
        setDniCheck(data?.existe
          ? { estado: 'existe', cliente: data.cliente, yaVinculado: !!data.yaVinculado }
          : null);
      } catch {
        if (vigente) setDniCheck(null);
      }
    }, 400);

    return () => { vigente = false; clearTimeout(temporizador); };
  }, [abierto, form.dni, cliente?.id]);

  const cambiarDni = (valor) => {
    const digits = DNI_RUC_INPUT.toDigits(valor);
    setForm((prev) => ({ ...prev, dni: digits }));
    setDniCheck(DNI_RUC_INPUT.esValido(digits) ? { estado: 'verificando' } : null);
  };

  const handleDepartamentoChange = async (deptoId) => {
    setDepartamentoId(deptoId);
    setProvinciaId('');
    setProvincias([]);
    setDistritos([]);
    setForm((prev) => ({ ...prev, distrito_fiscal_id: '' }));
    if (deptoId) {
      try {
        const { data } = await obtenerProvincias(deptoId);
        setProvincias(Array.isArray(data) ? data : []);
      } catch { setProvincias([]); }
    }
  };

  const handleProvinciaChange = async (provId) => {
    setProvinciaId(provId);
    setDistritos([]);
    setForm((prev) => ({ ...prev, distrito_fiscal_id: '' }));
    if (provId) {
      try {
        const { data } = await obtenerDistritos(provId);
        setDistritos(Array.isArray(data) ? data : []);
      } catch { setDistritos([]); }
    }
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (guardando) return;

    const telPrincipal = TELEFONO_INPUT.toDigits(form.telefono_principal);
    const telSecundario = TELEFONO_INPUT.toDigits(form.telefono_secundario);
    if (!TELEFONO_INPUT.esValido(telPrincipal)) {
      toast.error(`${CLIENTE_FORM.labelTelefonoPrincipal}: ${TELEFONO_INPUT.MSG_INVALIDO}`);
      return;
    }
    if (telSecundario && !TELEFONO_INPUT.esValido(telSecundario)) {
      toast.error(`${CLIENTE_FORM.labelTelefonoSecundario}: ${TELEFONO_INPUT.MSG_INVALIDO}`);
      return;
    }

    const dniDigits = DNI_RUC_INPUT.toDigits(form.dni);
    if (dniDigits && !DNI_RUC_INPUT.esValido(dniDigits)) {
      toast.error(`${CLIENTE_FORM.labelDni}: ${DNI_RUC_INPUT.MSG_INVALIDO}`);
      return;
    }

    const rucDigits = DNI_RUC_INPUT.toDigits(form.ruc);
    if (rucDigits && !DNI_RUC_INPUT.esValido(rucDigits)) {
      toast.error(`RUC: ${DNI_RUC_INPUT.MSG_INVALIDO}`);
      return;
    }

    // Email fiscal: opcional. Vacío se guarda como null y no bloquea el alta;
    // solo se detiene el envío cuando trae contenido con formato inválido.
    const emailFiscal = EMAIL_INPUT.normalizar(form.email);
    if (!EMAIL_INPUT.esValido(emailFiscal)) {
      toast.error(`${CLIENTE_FORM.labelEmailFiscal}: ${EMAIL_INPUT.MSG_INVALIDO}`);
      return;
    }

    const body = {
      ...form,
      dni: dniDigits || null,
      ruc: rucDigits || null,
      telefono_principal: telPrincipal,
      telefono_secundario: telSecundario || null,
      email: emailFiscal || null,
      direccion_fiscal: form.direccion_fiscal?.trim() || null,
      distrito_fiscal_id: form.distrito_fiscal_id ? parseInt(form.distrito_fiscal_id, 10) : null,
    };

    setGuardando(true);
    try {
      let data;
      if (modoEditar) {
        const res = await api.put(`/clientes/${cliente.id}`, body);
        data = res.data;
        toast.success(CLIENTE_FORM.toastActualizado);
      } else {
        const res = await api.post('/clientes', body);
        data = res.data;
        toast.success(CLIENTE_FORM.toastCreado);
      }
      cerrar();
      onGuardado?.(data);
    } catch (err) {
      const resp = err.response?.data;
      // DNI/RUC ya registrado: si el cliente aún no está en la cartera del
      // vendedor, se ofrece vincularlo en vez de mostrar solo el error.
      if (err.response?.status === 409 && resp?.requiereConfirmacion && resp?.clienteExistente) {
        setConfirmVinc(resp.clienteExistente);
      } else if (err.response?.status === 409 && resp?.yaVinculado) {
        toast(resp.error || 'Este cliente ya está en tu cartera.', { icon: 'ℹ️' });
      } else {
        toast.error(resp?.error || CLIENTE_FORM.errorGenerico);
      }
    } finally {
      setGuardando(false);
    }
  };

  // Trae el cliente ya existente a la cartera del vendedor y lo devuelve al
  // llamador, que puede así seleccionarlo directamente (p. ej. para la venta).
  const vincularCliente = async (clienteId) => {
    if (!clienteId || vinculando) return;
    setVinculando(true);
    try {
      const { data } = await api.post(`/clientes/${clienteId}/vincular`);
      toast.success(data.mensaje || CLIENTE_FORM.toastVinculado);
      setConfirmVinc(null);
      setDniCheck(null);
      cerrar();
      onGuardado?.(data);
    } catch (err) {
      toast.error(err.response?.data?.error || CLIENTE_FORM.errorGenerico);
    } finally {
      setVinculando(false);
    }
  };

  return (
    <>
    <Modal abierto={abierto} cerrar={cerrar} titulo={modoEditar ? CLIENTE_FORM.tituloEditar : CLIENTE_FORM.tituloCrear}>
      <form onSubmit={guardar} className="space-y-4">
        {/* El documento va primero: identifica al cliente y permite avisar de
            uno ya existente antes de que se rellene el resto del formulario. */}
        <div>
          <label className="block text-sm font-medium text-steel-200 mb-1">{CLIENTE_FORM.labelDni}</label>
          <input
            className="input-field"
            autoFocus={!modoEditar}
            inputMode={DNI_RUC_INPUT.INPUT_MODE}
            pattern={DNI_RUC_INPUT.PATTERN}
            maxLength={DNI_RUC_INPUT.MAX_LENGTH}
            placeholder={DNI_RUC_INPUT.PLACEHOLDER}
            value={form.dni}
            onChange={(e) => cambiarDni(e.target.value)}
          />
          {!modoEditar && !dniCheck && (
            <p className="mt-1 text-xs text-steel-500">{CLIENTE_FORM.ayudaDni}</p>
          )}
          {dniCheck?.estado === 'verificando' && (
            <p className="mt-1 text-xs text-steel-400">{CLIENTE_FORM.dniVerificando}</p>
          )}
        </div>

        {/* Al editar no se ofrece vincular: cambiaría de cliente y descartaría
            los datos que se están modificando. Solo se avisa del conflicto. */}
        {dniCheck?.estado === 'existe' && (
          <div className={`rounded-lg border p-3 ${dniCheck.yaVinculado && !modoEditar
            ? 'border-blue-500/30 bg-blue-500/5'
            : 'border-amber-500/30 bg-amber-500/5'}`}>
            <p className="text-sm font-medium text-steel-100">{CLIENTE_FORM.dniExisteTitulo}</p>
            <p className="mt-1 text-xs text-steel-300">
              {modoEditar
                ? CLIENTE_FORM.dniExisteOcupado(dniCheck.cliente.nombre)
                : dniCheck.yaVinculado
                  ? CLIENTE_FORM.dniExisteEnCartera(dniCheck.cliente.nombre)
                  : CLIENTE_FORM.dniExisteVincular(dniCheck.cliente.nombre)}
            </p>
            {!modoEditar && !dniCheck.yaVinculado && (
              <button
                type="button"
                onClick={() => vincularCliente(dniCheck.cliente.id)}
                disabled={vinculando}
                className="btn-primary mt-3 text-sm py-1.5"
              >
                {vinculando ? CLIENTE_FORM.btnVinculando : CLIENTE_FORM.btnVincular}
              </button>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-steel-200 mb-1">
            {CLIENTE_FORM.labelNombre} <span className="text-red-600">*</span>
          </label>
          <input
            className="input-field"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">
              {CLIENTE_FORM.labelTelefonoPrincipal} <span className="text-red-600">*</span>
            </label>
            <input
              className="input-field"
              type="tel"
              inputMode={TELEFONO_INPUT.INPUT_MODE}
              pattern={TELEFONO_INPUT.PATTERN}
              maxLength={TELEFONO_INPUT.MAX_LENGTH}
              placeholder={TELEFONO_INPUT.PLACEHOLDER}
              value={form.telefono_principal}
              onChange={(e) => setForm({ ...form, telefono_principal: TELEFONO_INPUT.format(e.target.value) })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">{CLIENTE_FORM.labelTelefonoSecundario}</label>
            <input
              className="input-field"
              type="tel"
              inputMode={TELEFONO_INPUT.INPUT_MODE}
              pattern={TELEFONO_INPUT.PATTERN}
              maxLength={TELEFONO_INPUT.MAX_LENGTH}
              placeholder={TELEFONO_INPUT.PLACEHOLDER}
              value={form.telefono_secundario}
              onChange={(e) => setForm({ ...form, telefono_secundario: TELEFONO_INPUT.format(e.target.value) })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-steel-200 mb-1">{CLIENTE_FORM.labelCorreo}</label>
          <input
            type="email"
            className="input-field"
            value={form.correo}
            onChange={(e) => setForm({ ...form, correo: e.target.value })}
            placeholder={CLIENTE_FORM.placeholderCorreo}
          />
        </div>

        {!modoEditar && (
          <div>
            <label className="block text-sm font-medium text-steel-200 mb-1">{CLIENTE_FORM.labelContrasena}</label>
            <div className="relative">
              <input
                type={verPass ? 'text' : 'password'}
                className="input-field pr-10"
                value={form.contrasena}
                onChange={(e) => setForm({ ...form, contrasena: e.target.value })}
                placeholder={CLIENTE_FORM.placeholderContrasena}
              />
              <button
                type="button"
                onClick={() => setVerPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-400 hover:text-steel-200 transition-colors"
              >
                {verPass ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Sección plegable: datos fiscales (facturación electrónica) */}
        <div className="border-t border-steel-700/40 pt-3">
          <button
            type="button"
            onClick={() => setMostrarFiscal((v) => !v)}
            className="w-full flex items-center justify-between text-sm font-medium text-steel-200 hover:text-steel-100 transition-colors"
          >
            <span>Datos fiscales (facturación electrónica)</span>
            <span className="text-xs text-steel-400">{mostrarFiscal ? '▲ Ocultar' : '▼ Completar'}</span>
          </button>

          {mostrarFiscal && (
            <div className="mt-3 space-y-3 bg-steel-900/30 p-3 rounded-lg border border-steel-700/30">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-steel-300 mb-1">Tipo de documento</label>
                  <select
                    className="input-field"
                    value={form.tipo_documento}
                    onChange={(e) => setForm({ ...form, tipo_documento: e.target.value })}
                  >
                    {Object.entries(TIPO_DOCUMENTO_CLIENTE).map(([k, v]) => (
                      <option key={k} value={v}>{TIPO_DOCUMENTO_CLIENTE_LABEL[v]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-steel-300 mb-1">RUC (para factura)</label>
                  <input
                    className="input-field"
                    inputMode={DNI_RUC_INPUT.INPUT_MODE}
                    maxLength={11}
                    value={form.ruc}
                    onChange={(e) => setForm({ ...form, ruc: DNI_RUC_INPUT.toDigits(e.target.value) })}
                    placeholder="20XXXXXXXXX"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-steel-300 mb-1">
                  {CLIENTE_FORM.labelEmailFiscal}{' '}
                  <span className="text-steel-500">({CLIENTE_FORM.sufijoOpcional})</span>
                </label>
                {/* type="text" a propósito: con type="email" el navegador aborta el
                    submit sin mensaje propio. La validación vive en guardar(). */}
                <input
                  type="text"
                  inputMode={EMAIL_INPUT.INPUT_MODE}
                  maxLength={EMAIL_INPUT.MAX_LENGTH}
                  className="input-field"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder={EMAIL_INPUT.PLACEHOLDER}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-steel-300 mb-1">Dirección fiscal</label>
                <input
                  className="input-field"
                  value={form.direccion_fiscal}
                  onChange={(e) => setForm({ ...form, direccion_fiscal: e.target.value })}
                  placeholder="Av. Ejemplo 123, Distrito"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-steel-300 mb-1">Departamento</label>
                  <select
                    className="input-field"
                    value={departamentoId}
                    onChange={(e) => handleDepartamentoChange(e.target.value)}
                  >
                    <option value="">Seleccionar...</option>
                    {departamentos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-steel-300 mb-1">Provincia</label>
                  <select
                    className="input-field"
                    value={provinciaId}
                    onChange={(e) => handleProvinciaChange(e.target.value)}
                    disabled={!departamentoId}
                  >
                    <option value="">Seleccionar...</option>
                    {provincias.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-steel-300 mb-1">Distrito fiscal</label>
                  <select
                    className="input-field"
                    value={form.distrito_fiscal_id}
                    onChange={(e) => setForm({ ...form, distrito_fiscal_id: e.target.value })}
                    disabled={!provinciaId}
                  >
                    <option value="">Seleccionar...</option>
                    {distritos.map((dis) => <option key={dis.id} value={dis.id}>{dis.nombre}</option>)}
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-steel-500">
                El distrito fiscal es obligatorio para emitir <strong>factura electrónica</strong>. SUNAT utiliza su ubigeo.
              </p>
            </div>
          )}
        </div>

        <p className="text-xs text-steel-500">{CLIENTE_FORM.ayuda}</p>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={cerrar} className="btn-secondary" disabled={guardando}>
            {CLIENTE_FORM.btnCancelar}
          </button>
          <button type="submit" className="btn-primary" disabled={guardando}>
            {modoEditar ? CLIENTE_FORM.btnActualizar : CLIENTE_FORM.btnCrear}
          </button>
        </div>
      </form>
    </Modal>

    <DialogConfirmacion
      abierto={!!confirmVinc}
      tipo="info"
      titulo="Cliente ya registrado"
      mensaje={confirmVinc
        ? `Ya existe un cliente con ese DNI / RUC: ${confirmVinc.nombre}. ¿Deseas vincularlo a tu cartera?`
        : ''}
      onConfirmar={() => vincularCliente(confirmVinc?.id)}
      onCancelar={() => setConfirmVinc(null)}
    />
    </>
  );
}
