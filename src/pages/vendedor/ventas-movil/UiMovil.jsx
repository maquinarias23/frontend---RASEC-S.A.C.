import { HiOutlineCamera, HiOutlinePaperClip, HiOutlineX, HiMinus, HiPlus } from 'react-icons/hi';

// ---------------------------------------------------------------------------
// Piezas de interfaz comunes a las hojas de venta en celular.
//
// Dos reglas gobiernan todo lo de aquí:
//   · Nada interactivo por debajo de 44px de alto: es el mínimo con el que un
//     pulgar acierta sin ampliar.
//   · Los campos de texto van a 16px (`text-base`). Por debajo de eso iOS
//     amplía la página al enfocar el campo y descuadra la hoja.
// ---------------------------------------------------------------------------

/** Bloque temático con título y, opcionalmente, una acción a la derecha. */
export function SeccionMovil({ titulo, icono: Icono, descripcion, accion, children, className = '' }) {
  return (
    <section className={`px-4 py-4 ${className}`}>
      {(titulo || accion) && (
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-steel-400">
            {Icono && <Icono className="w-4 h-4 text-primary-500" />}
            {titulo}
          </h3>
          {accion}
        </div>
      )}
      {descripcion && <p className="text-xs text-steel-500 mb-3 leading-relaxed">{descripcion}</p>}
      {children}
    </section>
  );
}

/** Etiqueta + control, con hueco para texto de ayuda. */
export function CampoMovil({ label, requerido, ayuda, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-medium text-steel-300 mb-1.5">
          {label} {requerido && <span className="text-primary-500">*</span>}
        </label>
      )}
      {children}
      {ayuda && <p className="text-[11px] text-steel-500 mt-1.5 leading-relaxed">{ayuda}</p>}
    </div>
  );
}

/** Par etiqueta/valor de una línea, para resúmenes y totales. */
export function FilaDato({ label, valor, tono = 'normal', fuerte = false }) {
  const tonos = {
    normal: 'text-steel-200',
    tenue: 'text-steel-400',
    verde: 'text-emerald-600',
    ambar: 'text-amber-600',
    rojo: 'text-red-600',
  };
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-sm text-steel-400 shrink-0">{label}</span>
      <span className={`text-sm text-right ${tonos[tono] || tonos.normal} ${fuerte ? 'font-bold' : 'font-medium'}`}>
        {valor}
      </span>
    </div>
  );
}

/**
 * Elección entre pocas opciones excluyentes: todas visibles, un toque para
 * cambiar. Evita el select nativo cuando hay dos o tres alternativas.
 */
export function SelectorSegmentado({ opciones, valor, onChange, columnas }) {
  const cols = columnas || opciones.length;
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {opciones.map((op) => {
        const activo = valor === op.valor;
        return (
          <button
            key={op.valor}
            type="button"
            onClick={() => onChange(op.valor)}
            className={`min-h-[52px] px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all active:scale-[0.97] ${
              activo
                ? 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/20'
                : 'bg-steel-900 border-steel-700 text-steel-300'
            }`}
          >
            {op.icono && <op.icono className={`w-5 h-5 mx-auto mb-0.5 ${activo ? 'text-white' : 'text-steel-400'}`} />}
            <span className="block leading-tight">{op.label}</span>
            {op.detalle && (
              <span className={`block text-[10px] font-normal leading-tight mt-0.5 ${activo ? 'text-white/80' : 'text-steel-500'}`}>
                {op.detalle}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Interruptor de encendido/apagado con área de toque generosa. */
export function ToggleMovil({ activo, onToggle, etiqueta }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      onClick={onToggle}
      className={`relative w-[52px] h-8 shrink-0 rounded-full transition-colors ${
        activo ? 'bg-primary-500' : 'bg-steel-700'
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
          activo ? 'translate-x-5' : ''
        }`}
      />
    </button>
  );
}

/** Cantidad con botones −/+ además del teclado numérico. */
export function StepperCantidad({ valor, onChange, min = 1, max }) {
  const num = parseInt(valor, 10);
  const actual = Number.isFinite(num) ? num : min;

  const ajustar = (delta) => {
    const siguiente = actual + delta;
    if (siguiente < min) return;
    if (max != null && siguiente > max) return;
    onChange(siguiente);
  };

  return (
    <div className="flex items-stretch rounded-xl border border-steel-700 bg-steel-900 overflow-hidden">
      <button
        type="button"
        onClick={() => ajustar(-1)}
        disabled={actual <= min}
        aria-label="Quitar uno"
        className="w-12 flex items-center justify-center text-steel-300 active:bg-steel-800 disabled:opacity-30 transition-colors"
      >
        <HiMinus className="w-5 h-5" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          const n = parseInt(e.target.value, 10);
          onChange(Number.isFinite(n) && n >= min ? n : min);
        }}
        className="flex-1 min-w-0 w-full bg-transparent border-x border-steel-700 text-center text-base font-semibold text-steel-100 py-3 focus:outline-none focus:bg-steel-800/60"
      />
      <button
        type="button"
        onClick={() => ajustar(1)}
        aria-label="Agregar uno"
        className="w-12 flex items-center justify-center text-steel-300 active:bg-steel-800 transition-colors"
      >
        <HiPlus className="w-5 h-5" />
      </button>
    </div>
  );
}

/**
 * Adjuntar voucher desde el celular. Se ofrecen dos puertas al mismo campo:
 * la cámara (`capture`), que es como se registra un pago en la calle, y el
 * archivo ya guardado —captura de pantalla del Yape, PDF del banco—.
 */
export function CampoArchivoMovil({ archivo, onArchivo, requerido = false, idBase = 'adj' }) {
  if (archivo) {
    const esImagen = archivo.type?.startsWith('image/');
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3">
        {esImagen ? (
          <img
            src={URL.createObjectURL(archivo)}
            alt="Voucher adjunto"
            className="w-14 h-14 rounded-lg object-cover border border-emerald-200 shrink-0"
            onLoad={(e) => URL.revokeObjectURL(e.target.src)}
          />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            <HiOutlinePaperClip className="w-6 h-6 text-emerald-600" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-emerald-700 truncate">{archivo.name}</p>
          <p className="text-[11px] text-emerald-600">{(archivo.size / 1024).toFixed(0)} KB</p>
        </div>
        <button
          type="button"
          onClick={() => onArchivo(null)}
          aria-label="Quitar archivo"
          className="p-2.5 rounded-full text-emerald-700 active:bg-emerald-100"
        >
          <HiOutlineX className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <label
        htmlFor={`${idBase}-camara`}
        className="min-h-[56px] flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-steel-700 bg-steel-900 text-steel-300 active:bg-steel-800 transition-colors cursor-pointer"
      >
        <HiOutlineCamera className="w-5 h-5 text-primary-500" />
        <span className="text-xs font-medium">Tomar foto</span>
      </label>
      <input
        id={`${idBase}-camara`}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onArchivo(e.target.files?.[0] || null)}
      />

      <label
        htmlFor={`${idBase}-archivo`}
        className="min-h-[56px] flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-steel-700 bg-steel-900 text-steel-300 active:bg-steel-800 transition-colors cursor-pointer"
      >
        <HiOutlinePaperClip className="w-5 h-5 text-steel-400" />
        <span className="text-xs font-medium">Elegir archivo</span>
      </label>
      <input
        id={`${idBase}-archivo`}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={(e) => onArchivo(e.target.files?.[0] || null)}
      />

      {requerido && (
        <p className="col-span-2 text-[11px] text-steel-500 text-center">Obligatorio</p>
      )}
    </div>
  );
}

/** Aviso contextual de un solo tono. */
export function AvisoMovil({ tono = 'info', titulo, children, icono: Icono }) {
  const tonos = {
    info: 'border-blue-200 bg-blue-50 text-blue-700',
    ok: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    ambar: 'border-amber-200 bg-amber-50 text-amber-700',
    rojo: 'border-red-200 bg-red-50 text-red-700',
    neutro: 'border-steel-700 bg-steel-900 text-steel-300',
  };
  return (
    <div className={`rounded-xl border p-3 text-sm ${tonos[tono] || tonos.info}`}>
      {titulo && (
        <p className="font-semibold flex items-center gap-1.5 mb-1">
          {Icono && <Icono className="w-4 h-4 shrink-0" />}
          {titulo}
        </p>
      )}
      <div className="text-xs leading-relaxed opacity-95">{children}</div>
    </div>
  );
}
