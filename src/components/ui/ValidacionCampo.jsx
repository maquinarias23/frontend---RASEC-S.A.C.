export default function ValidacionCampo({ error, tocado = true }) {
  if (!error || !tocado) return null;
  return <p className="text-xs text-red-600 mt-1">{error}</p>;
}

export function validarCampo(valor, reglas = {}) {
  if (reglas.requerido && (!valor || (typeof valor === 'string' && !valor.trim()))) return reglas.mensajeRequerido || 'Campo obligatorio';
  if (reglas.minLength && valor.length < reglas.minLength) return `Mínimo ${reglas.minLength} caracteres`;
  if (reglas.maxLength && valor.length > reglas.maxLength) return `Máximo ${reglas.maxLength} caracteres`;
  if (reglas.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) return 'Correo inválido';
  if (reglas.numero && isNaN(Number(valor))) return 'Debe ser un número';
  if (reglas.min !== undefined && Number(valor) < reglas.min) return `Mínimo ${reglas.min}`;
  if (reglas.patron && !reglas.patron.test(valor)) return reglas.mensajePatron || 'Formato inválido';
  if (reglas.personalizado) return reglas.personalizado(valor);
  return null;
}

export function validarFormulario(form, esquema) {
  const errores = {};
  let valido = true;
  for (const [campo, reglas] of Object.entries(esquema)) {
    const error = validarCampo(form[campo], reglas);
    if (error) { errores[campo] = error; valido = false; }
  }
  return { errores, valido };
}
