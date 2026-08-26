// =============================================================================
// Constantes del frontend (mirror EXACTO de backend/config/constants.js)
// Valores deben coincidir 1:1 con los enums de Prisma (schema.prisma)
// =============================================================================

// Estados de venta (Prisma enum: EstadoVenta)
export const ESTADO_VENTA = {
  PENDIENTE_APROBACION: 'pendiente_aprobacion',
  ACTIVA: 'activa',
  CANCELADA: 'cancelada',
  CERRADA: 'cerrada',
  RECHAZADA: 'rechazada',
};

// Estados de tracking (Prisma enum: EstadoTracking)
export const ESTADO_TRACKING = {
  PEDIDO_REGISTRADO: 'pedido_registrado',
  ALMACEN: 'almacen',
  EN_RUTA_A_AGENCIA: 'en_ruta_a_agencia',
  DEJADO_EN_AGENCIA: 'dejado_en_agencia',
};

// Labels de tracking para UI (evita hardcodeo en componentes)
export const ESTADO_TRACKING_LABEL = {
  [ESTADO_TRACKING.PEDIDO_REGISTRADO]: 'Pedido Registrado',
  [ESTADO_TRACKING.ALMACEN]: 'Almacén (empaquetado y rotulado)',
  [ESTADO_TRACKING.EN_RUTA_A_AGENCIA]: 'En Ruta a Agencia',
  [ESTADO_TRACKING.DEJADO_EN_AGENCIA]: 'Dejado en Agencia',
};

// Pasos de tracking ordenados para timeline
export const PASOS_TRACKING = Object.entries(ESTADO_TRACKING_LABEL).map(
  ([key, label]) => ({ key, label })
);

// Estados de unidad (Prisma enum: EstadoUnidad)
export const ESTADO_UNIDAD = {
  DISPONIBLE: 'disponible',
  ASIGNADA_A_VENTA: 'asignada_a_venta',
  EMPAQUETADA: 'empaquetada',
  ROTULADA: 'rotulada',
  DEJADO_EN_AGENCIA: 'dejado_en_agencia',
  RETIRADO_EN_TIENDA: 'retirado_en_tienda',
  RETIRADO_EN_AGENCIA: 'retirado_en_agencia',
  CANCELADA_REVERTIDA: 'cancelada_revertida',
};

// Tipos de entrega (Prisma enum: TipoEntrega)
export const TIPO_ENTREGA = {
  ENVIO_POR_AGENCIA: 'envio_por_agencia',
  RETIRO_EN_TIENDA: 'retiro_en_tienda',
};

// Tipos de destino (Prisma enum: TipoDestino)
export const TIPO_DESTINO = {
  LIMA: 'lima',
  PROVINCIA: 'provincia',
};

// Estados de importación (Prisma enum: EstadoImportacion)
export const ESTADO_IMPORTACION = {
  PROGRAMADA: 'programada',
  RETRASADA: 'retrasada',
  INGRESADA: 'ingresada',
};

export const COLUMNAS_IMPORTACION = {
  CODIGO_ADUANERO: 'codigo_aduanero',
  ARTICULO: 'articulo',
  CANTIDAD: 'cantidad',
  UNIDAD_MEDIDA: 'unidad_medida',
  PESO: 'peso',
  COSTO_TOTAL_USD: 'costo_total_usd',
  ADVALOREN_USD: 'advaloren_usd',
  FLETE_USD: 'flete_usd',
  SEGURO_USD: 'seguro_usd',
  COSTO_UNITARIO_USD: 'costo_unitario_usd',
  COSTO_TOTAL_CALC_USD: 'costo_total_calc_usd',
  COSTO_TOTAL_SOLES: 'costo_total_soles',
  OTROS_GASTOS_SOLES: 'otros_gastos_soles',
  COSTO_ALMACEN_SOLES: 'costo_almacen_soles',
  COSTO_UNIT_ALMACEN_SOL: 'costo_unit_almacen_sol',
};

// Estados de compra (Prisma enum: EstadoCompra)
export const ESTADO_COMPRA = {
  REGISTRADA: 'registrada',
  INGRESADA: 'ingresada',
  ASIGNADA_A_ENVIO: 'asignada_a_envio',
};

// Tipo de compra (Prisma enum: TipoCompra)
export const TIPO_COMPRA = {
  NORMAL: 'normal',
  EXTERNA_ENVIO: 'externa_envio',
};

// Estados de visualización para próximos ingresos (solo UI, no BD)
export const ESTADO_DISPLAY = {
  PROCESANDO_EN_ALMACEN: 'procesando_en_almacen',
};

// Estados de cotización web (Prisma enum: EstadoCotizacionWeb)
export const ESTADO_COTIZACION = {
  PENDIENTE_WHATSAPP: 'pendiente_whatsapp',
  CONVERTIDA_A_VENTA: 'convertida_a_venta',
  CANCELADA: 'cancelada',
};

// Origen de cotización (solo UI/listado unificado, no BD)
export const ORIGEN_COTIZACION = {
  WEB: 'web',
  PROSPECTO: 'prospecto',
};

// Estados de carrito web (Prisma enum: EstadoCarritoWeb)
export const ESTADO_CARRITO_WEB = {
  ACTIVO: 'activo',
  FINALIZADO: 'finalizado',
  EXPIRADO: 'expirado',
};

// Key para token del carrito publico en localStorage
export const CARRITO_STORAGE_KEY = 'rasek_carrito_web_token';

// ─── Inactividad de sesión ───────────────────────────────────────────────
// Tiempo máximo (ms) sin interacción del usuario antes de cerrar sesión
// automáticamente y redirigir al login. Se reinicia con cualquier
// mousemove/keydown/click/scroll/touchstart mientras el usuario está logueado.
export const INACTIVIDAD_SESION_MS = 60 * 60 * 1000; // 1 hora
// Throttle (ms) entre reinicios del timer por eventos de actividad: evita
// reiniciar el setTimeout en cada pixel de mousemove.
export const INACTIVIDAD_THROTTLE_MS = 2000;
// Key (sessionStorage) para marcar que el último cierre fue por expiración
// y mostrar un toast en la pantalla de login.
export const SESION_EXPIRADA_FLAG_KEY = 'rasek_sesion_expirada';
// Mensaje del toast mostrado al redirigir al login tras expirar la sesión.
export const SESION_EXPIRADA_MSG = 'Tu sesión expiró por inactividad. Inicia sesión nuevamente.';

// Estados de prospecto (Prisma enum: EstadoProspecto)
export const ESTADO_PROSPECTO = {
  NUEVO: 'nuevo',
  EN_SEGUIMIENTO: 'en_seguimiento',
  COTIZADO: 'cotizado',
  CONVERTIDO: 'convertido',
  PERDIDO: 'perdido',
};

// Origenes de prospecto
export const ORIGEN_PROSPECTO = {
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  WHATSAPP: 'WhatsApp',
  REFERIDO: 'Referido',
  WEB: 'Web',
  TIKTOK: 'TikTok',
  OTRO: 'Otro',
};

// Labels UI del form de cliente (crear/editar) — evita hardcodeo en componentes
export const CLIENTE_FORM = {
  tituloCrear: 'Nuevo Cliente',
  tituloEditar: 'Editar Cliente',
  labelNombre: 'Nombre completo',
  labelDni: 'DNI / RUC',
  labelTelefonoPrincipal: 'Teléfono principal',
  labelTelefonoSecundario: 'Teléfono secundario',
  labelCorreo: 'Correo (acceso web)',
  labelContrasena: 'Contraseña inicial',
  placeholderCorreo: 'Se genera automáticamente si se deja vacío',
  placeholderContrasena: 'Se genera automáticamente si se deja vacía',
  ayuda: 'Solo nombre y teléfono son obligatorios. El correo y contraseña se generan automáticamente si no se proporcionan.',
  labelEmailFiscal: 'Email fiscal (envío de CPE)',
  sufijoOpcional: 'opcional',
  btnCancelar: 'Cancelar',
  btnCrear: 'Crear',
  btnActualizar: 'Actualizar',
  btnEditar: 'Editar',
  toastCreado: 'Cliente creado con acceso web',
  toastActualizado: 'Cliente actualizado',
  errorGenerico: 'Error al guardar',
  // Detección de cliente ya registrado al escribir el DNI / RUC
  ayudaDni: 'Empieza por el documento: si el cliente ya existe te lo avisamos.',
  dniVerificando: 'Verificando documento...',
  dniExisteTitulo: 'Este documento ya está registrado',
  dniExisteVincular: (nombre) =>
    `${nombre} ya existe como cliente, pero no está en tu cartera. Puedes vincularlo en vez de crearlo de nuevo.`,
  dniExisteEnCartera: (nombre) => `${nombre} ya está en tu cartera con este documento.`,
  dniExisteOcupado: (nombre) =>
    `Este documento ya pertenece a ${nombre}. Elige otro para poder guardar los cambios.`,
  btnVincular: 'Vincular a mi cartera',
  btnVinculando: 'Vinculando...',
  toastVinculado: 'Cliente vinculado a tu cartera.',
  // Mismo caso detectado desde el buscador de la venta: el vendedor teclea un
  // documento que existe pero no es de su cartera, así que no le aparece en los
  // resultados. Se le ofrece vincularlo sin salir de la venta.
  dniVentaTitulo: 'Este cliente ya existe, pero no está en tu cartera',
  dniVentaVincular: (nombre) =>
    `${nombre} ya está registrado con ese documento. Vincúlalo a tu cartera para usarlo en esta venta.`,
  btnVincularVenta: 'Vincular y usar en esta venta',
};

// Tipos de movimiento puntos (Prisma enum: TipoMovimientoPuntos)
export const TIPO_PUNTO = {
  GANADO: 'ganado',
  USADO: 'usado',
  REVERTIDO: 'revertido',
  RESERVADO: 'reservado',
  LIBERADO: 'liberado',
};

// Tipos de movimiento caja (Prisma enum: TipoMovimientoCaja)
export const TIPO_CAJA = {
  INGRESO: 'ingreso',
  GASTO: 'gasto',
  REVERSION_INGRESO: 'reversion_ingreso',
};

// Origen caja (Prisma enum: OrigenCaja)
export const ORIGEN_CAJA = {
  PAGO_VENTA: 'pago_venta',
  COMPRA_LOCAL: 'compra_local',
  IMPORTACION: 'importacion',
  OTRO_GASTO: 'otro_gasto',
  CANCELACION: 'cancelacion',
  COMPRA_EXTERNA_ENVIO: 'compra_externa_envio',
};

// Tipos de media (Prisma enum: TipoMedia)
export const TIPO_MEDIA = {
  FOTO: 'foto',
  VIDEO: 'video',
};

// Límites y formatos aceptados para media de productos (sin hardcodeo en UI)
// Backend: middleware/uploadMiddleware.js usa 50 MB como tope absoluto y
// fileFilter permite jpeg|jpg|png|gif|pdf|webp|mp4|webm.
export const MEDIA_PRODUCTO = {
  MAX_FOTO_MB: 50,
  MAX_VIDEO_MB: 50,
  ACCEPT_INPUT: 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm',
  MIME_FOTO_PREFIX: 'image/',
  MIME_VIDEO_PREFIX: 'video/',
  MAX_VIDEOS_POR_PRODUCTO: 1,
  LABEL_BLOQUE: 'Fotos y video del producto (opcional)',
  AYUDA_BLOQUE: 'Click en un elemento para eliminarlo. 1 video opcional (máx 50 MB). Se guardan al crear/actualizar.',
  BADGE_VIDEO: 'Video',
  BADGE_NUEVA: 'Nueva',
  MSG_VIDEO_EXCEDE_TAMANIO: 'El video supera el tamaño máximo permitido',
  MSG_REEMPLAZA_VIDEO: 'Se reemplazará el video existente',
  MSG_TIPO_NO_SOPORTADO: 'Tipo de archivo no soportado',
};

// Tipo de adjunto pago (Prisma enum: TipoAdjuntoPago)
export const TIPO_ADJUNTO_PAGO = {
  BOUCHER_PAGO: 'boucher_pago',
};

// Métodos de pago disponibles
export const METODOS_PAGO = {
  EFECTIVO: 'efectivo',
  TRANSFERENCIA: 'transferencia',
  YAPE_PLIN: 'yape_plin',
  TARJETA: 'tarjeta',
};

export const METODOS_PAGO_LABEL = {
  [METODOS_PAGO.EFECTIVO]: 'Efectivo',
  [METODOS_PAGO.TRANSFERENCIA]: 'Transferencia bancaria',
  [METODOS_PAGO.YAPE_PLIN]: 'Yape / Plin',
  [METODOS_PAGO.TARJETA]: 'Tarjeta',
};

// Tipos de descuento en combos
export const TIPO_DESCUENTO_COMBO = {
  PORCENTAJE: 'porcentaje',
  MONTO_FIJO: 'monto_fijo',
};

// Tipos de promoción (Prisma enum: TipoPromocion)
export const TIPO_PROMOCION = {
  DESCUENTO_PORCENTAJE: 'descuento_porcentaje',
  DESCUENTO_MONTO_FIJO: 'descuento_monto_fijo',
};

// Tipo de precio (para selección en ventas)
export const TIPO_PRECIO = {
  VENDEDOR: 'vendedor',
  CATALOGO: 'catalogo',
  MAYORISTA: 'mayorista',
  BASE: 'base',
};

// Tipos de evidencia (Prisma enum: TipoEvidencia)
export const TIPO_EVIDENCIA = {
  BOUCHER_ENVIO: 'boucher_envio',
  FOTO_ENVIO: 'foto_envio',
  FOTO_GENERAL: 'foto_general',
};

// Estados de acceso (Prisma enum: EstadoAcceso)
export const ESTADO_ACCESO = {
  ACTIVO: 'activo',
  INACTIVO: 'inactivo',
};

// Reglas UI para inputs de teléfono.
// Un teléfono válido se compone de MAX_DIGITS dígitos, visualmente agrupados
// con un espacio cada GROUP_SIZE dígitos (formato "999 888 777").
// - En BD se persiste SOLO DÍGITOS (9 chars).
// - En UI (inputs/tablas/detalles) se muestra formateado vía format(...).
// Centraliza longitud/patrón/placeholder para evitar hardcodeo.
export const TELEFONO_INPUT = {
  MAX_DIGITS: 9,
  GROUP_SIZE: 3,
  INPUT_MODE: 'numeric',
  PATTERN: '[0-9 ]*',
};
// Longitud máxima del string formateado (dígitos + espacios entre grupos).
TELEFONO_INPUT.MAX_LENGTH =
  TELEFONO_INPUT.MAX_DIGITS +
  Math.max(0, Math.ceil(TELEFONO_INPUT.MAX_DIGITS / TELEFONO_INPUT.GROUP_SIZE) - 1);
// Placeholder dinámico (p. ej. "999 888 777" para 9 dígitos en grupos de 3).
TELEFONO_INPUT.PLACEHOLDER = Array.from(
  { length: Math.ceil(TELEFONO_INPUT.MAX_DIGITS / TELEFONO_INPUT.GROUP_SIZE) },
  (_, g) => '9'.repeat(
    Math.min(TELEFONO_INPUT.GROUP_SIZE, TELEFONO_INPUT.MAX_DIGITS - g * TELEFONO_INPUT.GROUP_SIZE)
  )
).join(' ');
TELEFONO_INPUT.MSG_INVALIDO = `El teléfono debe tener exactamente ${TELEFONO_INPUT.MAX_DIGITS} dígitos.`;
// Retorna solo dígitos, truncado a MAX_DIGITS.
TELEFONO_INPUT.toDigits = (v) =>
  (v == null ? '' : String(v)).replace(/\D/g, '').slice(0, TELEFONO_INPUT.MAX_DIGITS);
// Retorna el string formateado a partir de cualquier entrada ("999 888 777").
TELEFONO_INPUT.format = (v) => {
  const d = TELEFONO_INPUT.toDigits(v);
  const groups = [];
  for (let i = 0; i < d.length; i += TELEFONO_INPUT.GROUP_SIZE) {
    groups.push(d.slice(i, i + TELEFONO_INPUT.GROUP_SIZE));
  }
  return groups.join(' ');
};
// True si el valor (tras stripping) tiene exactamente MAX_DIGITS dígitos.
TELEFONO_INPUT.esValido = (v) => TELEFONO_INPUT.toDigits(v).length === TELEFONO_INPUT.MAX_DIGITS;

// Reglas UI para el input DNI/RUC de clientes.
// - Solo se ingresan dígitos (se filtra cualquier otro caracter en UI).
// - Formatos aceptados al guardar:
//     * DNI: exactamente 8 dígitos.
//     * RUC: exactamente 11 dígitos que comienzan por "20" o "10".
// - Campo opcional: vacío es válido; si trae contenido, debe cumplir el formato.
export const DNI_RUC_INPUT = {
  DNI_LENGTH: 8,
  RUC_LENGTH: 11,
  RUC_PREFIJOS: ['20', '10'],
  INPUT_MODE: 'numeric',
  PATTERN: '[0-9]*',
};
DNI_RUC_INPUT.MAX_LENGTH = DNI_RUC_INPUT.RUC_LENGTH;
DNI_RUC_INPUT.PLACEHOLDER = `${DNI_RUC_INPUT.DNI_LENGTH} u ${DNI_RUC_INPUT.RUC_LENGTH} dígitos`;
DNI_RUC_INPUT.MSG_INVALIDO =
  `Debe ser DNI de ${DNI_RUC_INPUT.DNI_LENGTH} dígitos o RUC de ${DNI_RUC_INPUT.RUC_LENGTH} dígitos que empiece por ${DNI_RUC_INPUT.RUC_PREFIJOS.join(' o ')}.`;
DNI_RUC_INPUT.toDigits = (v) =>
  (v == null ? '' : String(v)).replace(/\D/g, '').slice(0, DNI_RUC_INPUT.MAX_LENGTH);
DNI_RUC_INPUT.esValido = (v) => {
  const d = DNI_RUC_INPUT.toDigits(v);
  if (d.length === DNI_RUC_INPUT.DNI_LENGTH) return true;
  if (d.length === DNI_RUC_INPUT.RUC_LENGTH &&
      DNI_RUC_INPUT.RUC_PREFIJOS.includes(d.slice(0, 2))) return true;
  return false;
};

// Reglas UI para inputs de email (email fiscal del cliente para envío de CPE).
// - Campo OPCIONAL y NO bloqueante: vacío es válido y nunca impide guardar.
// - Si trae contenido, debe cumplir el formato; el error se muestra como toast
//   de la app (no se usa <input type="email">, cuya validación nativa aborta el
//   submit sin explicar nada al usuario).
// Mirror de EMAIL en backend/config/constants.js.
export const EMAIL_INPUT = {
  MAX_LENGTH: 150, // Espejo de tbl_clientes.email VARCHAR(150)
  REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  INPUT_MODE: 'email',
  PLACEHOLDER: 'correo@empresa.com',
};
EMAIL_INPUT.MSG_INVALIDO = 'Formato de email inválido. Ejemplo: correo@empresa.com';
EMAIL_INPUT.normalizar = (v) => (v == null ? '' : String(v)).trim();
// Vacío se considera válido: el campo es opcional.
EMAIL_INPUT.esValido = (v) => {
  const limpio = EMAIL_INPUT.normalizar(v);
  if (limpio === '') return true;
  return limpio.length <= EMAIL_INPUT.MAX_LENGTH && EMAIL_INPUT.REGEX.test(limpio);
};

// Estados de asistencia (valores UI para RRHH)
export const ESTADO_ASISTENCIA = {
  PRESENTE: 'presente',
  AUSENTE: 'ausente',
  TARDANZA: 'tardanza',
  PERMISO: 'permiso',
};

// Tipo de marcación QR (Prisma enum: TipoMarcacion)
export const TIPO_MARCACION = {
  INGRESO: 'ingreso',
  SALIDA: 'salida',
};

// Origen de ingreso (Prisma enum: OrigenIngreso)
export const ORIGEN_INGRESO = {
  IMPORTACION: 'importacion',
  COMPRA_LOCAL: 'compra_local',
  AJUSTE: 'ajuste',
  COMPRA_EXTERNA_ENVIO: 'compra_externa_envio',
};

// Origen del costo unitario mostrado en Configuración de Precios: los mismos
// valores de ORIGEN_INGRESO más MANUAL (costo declarado a mano en el producto).
export const ORIGEN_COSTO = {
  ...ORIGEN_INGRESO,
  MANUAL: 'manual',
};

// Motivo de movimiento (Prisma enum: MotivoMovimiento)
export const MOTIVO_MOVIMIENTO = {
  IMPORTACION: 'importacion',
  COMPRA_LOCAL: 'compra_local',
  VENTA: 'venta',
  CANCELACION: 'cancelacion',
  AJUSTE: 'ajuste',
  COMPRA_EXTERNA_ENVIO: 'compra_externa_envio',
};

// Tipo de movimiento de inventario (Prisma enum: TipoMovimientoInventario)
export const TIPO_MOVIMIENTO = {
  INGRESO: 'ingreso',
  SALIDA: 'salida',
  REVERSION: 'reversion',
};

// Ajuste manual de inventario — espejo de AJUSTE_INVENTARIO del backend
// (config/constants.js). Si cambia allá, cambia aquí: el backend rechaza el
// ajuste con el mismo criterio, esto solo evita el viaje al servidor.
export const AJUSTE_INVENTARIO = {
  MOTIVO_MIN_LENGTH: 10,
  MOTIVO_MAX_LENGTH: 500,
  MAX_CANTIDAD: 1000,
};

// Origen declarado de un ajuste manual (Prisma enum: OrigenAjusteInventario).
// compra_local = compra nacional, igual que en ORIGEN_INGRESO.
export const ORIGEN_AJUSTE = {
  IMPORTACION: 'importacion',
  COMPRA_LOCAL: 'compra_local',
  OTRO: 'otro',
};

export const ORIGEN_AJUSTE_LABEL = {
  [ORIGEN_AJUSTE.IMPORTACION]: 'Importación',
  [ORIGEN_AJUSTE.COMPRA_LOCAL]: 'Compra Nacional',
  [ORIGEN_AJUSTE.OTRO]: 'Sin lote asociado',
};

// Tipo de proveedor (Prisma enum: TipoProveedor)
export const TIPO_PROVEEDOR = {
  NACIONAL: 'nacional',
  IMPORTACION: 'importacion',
};

// Plataformas MKT (Prisma enum: PlataformaMkt)
export const PLATAFORMA_MKT = {
  FACEBOOK: 'facebook',
  INSTAGRAM: 'instagram',
  TIKTOK: 'tiktok',
};

// Etiquetas de plataforma para UI
export const PLATAFORMA_MKT_LABEL = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
};

// Colores de plataforma para gráficas
export const PLATAFORMA_MKT_COLOR = {
  facebook: '#1877F2',
  instagram: '#E4405F',
  tiktok: '#00F2EA',
};

// Parámetros mínimos por defecto (fallback mientras el backend no responda)
// Valores como fracción — 0.0420 = 4.20%
export const DEFAULT_PARAMETROS_MKT = {
  EFECTIVIDAD_VENTAS_MIN: 0.0420,
  EFECTIVIDAD_UTILIDAD_MIN: 0.1240,
  TASA_CONVERSION_MIN: 0.0093,
};

// Días de la semana en español — índice = Date#getDay() (0 = Domingo … 6 = Sábado)
export const DIAS_SEMANA_ES = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
];

// Tipos de notificacion
export const TIPO_NOTIFICACION = {
  COMPRA_NUEVA: 'compra_nueva',
  COMPRA_APROBADA: 'compra_aprobada',
  COMPRA_RECHAZADA: 'compra_rechazada',
  PEDIDO_REENVIADO: 'pedido_reenviado',
  PRODUCTO_DISPONIBLE: 'producto_disponible',
  STOCK_INSUFICIENTE_ALMACEN: 'stock_insuficiente_almacen',
  ALERTA_INACTIVIDAD_VENDEDOR: 'alerta_inactividad_vendedor',
  COMPRA_EXTERNA_REGISTRADA: 'compra_externa_registrada',
  PAGO_CLIENTE_REGISTRADO: 'pago_cliente_registrado',
  COMPRA_NACIONAL_TOMADA: 'compra_nacional_tomada',
};

// Rutas del chofer (Fase 2 - toma de compra nacional)
export const RUTAS_CHOFER = {
  DASHBOARD: '/chofer/dashboard',
  ENTREGAS: '/chofer/entregas',
  COMPRAS_DISPONIBLES: '/chofer/compras-disponibles',
};

// Tabs de la vista Entregas del chofer (Fase 2)
export const TABS_CHOFER_ENTREGAS = {
  EN_RUTA: 'en_ruta',
  POR_COMPLETAR: 'por_completar',
};

export const TABS_CHOFER_ENTREGAS_LABEL = {
  [TABS_CHOFER_ENTREGAS.EN_RUTA]: 'Entregas en ruta',
  [TABS_CHOFER_ENTREGAS.POR_COMPLETAR]: 'Pedidos por completar',
};

// Mensajes UI para flujo de toma de compra nacional
// Mensajes de UI para bloqueo por pago de cliente pendiente de decisión del SA.
// Usados en el portal cliente (MisPedidos) y en el modal de registro de pago
// del vendedor/admin/supervisión. El detalle de venta expone el objeto
// `pago_cliente_pendiente` con { pago_id, monto, fecha_hora, nombre_cliente }.
export const MSG_PAGO_BLOQUEADO_CLIENTE = {
  BANNER_INTERNO: 'Esperando decisión del Super Administrador sobre el pago registrado por el cliente. No se pueden registrar nuevos pagos en esta venta hasta que sea aceptado o rechazado.',
  BANNER_CLIENTE: 'Tu pago registrado está siendo validado por el Super Administrador. Podrás registrar otro pago cuando sea aceptado o rechazado.',
  TOOLTIP_BOTON: 'Pago de cliente pendiente de aprobación',
  DETALLE: ({ monto, fecha_hora, nombre_cliente, formatearMoneda, formatearFechaHora }) => {
    const montoStr = formatearMoneda ? formatearMoneda(monto) : `S/ ${Number(monto).toFixed(2)}`;
    const fechaStr = formatearFechaHora ? formatearFechaHora(fecha_hora) : new Date(fecha_hora).toLocaleString();
    const cliente = nombre_cliente ? ` por ${nombre_cliente}` : '';
    return `Pago de ${montoStr} registrado${cliente} el ${fechaStr}.`;
  },
};

export const MSG_COMPRA_NACIONAL_UI = {
  SIN_PEDIDOS_INCOMPLETOS: 'No tienes pedidos por completar.',
  SIN_COMPRAS_DISPONIBLES: 'No hay compras nacionales con productos que coincidan con tus pedidos.',
  CONFIRMAR_TOMA: 'Confirmar toma de unidades',
  CONFIRMAR_DESHACER: '¿Deshacer esta toma? Las unidades y la asignación a la venta se eliminarán.',
  TOAST_EXITO_TOMA: (n) => `Toma registrada: ${n} unidad(es)`,
  TOAST_EXITO_DESHACER: 'Toma revertida correctamente',
  TOAST_EXITO_ASIGNAR: 'Chofer asignado a la venta',
  ERROR_GENERICO_TOMA: 'Error al registrar la toma',
  ERROR_GENERICO_DESHACER: 'Error al deshacer la toma',
  ERROR_GENERICO_ASIGNAR: 'Error al asignar chofer',
  CANTIDAD_INVALIDA: 'La cantidad debe ser mayor a 0',
  SELECCIONE_VENTA: 'Debe seleccionar una venta destino',
  SELECCIONE_ITEM_VENTA: 'Debe seleccionar un ítem de venta',
  SELECCIONE_CHOFER: 'Debe seleccionar un chofer',
};

// Tipos de comprobante electrónico (Prisma enum: TipoComprobante)
export const TIPO_COMPROBANTE = {
  FACTURA: 'factura',
  BOLETA: 'boleta',
  NOTA_CREDITO: 'nota_credito',
  NOTA_DEBITO: 'nota_debito',
};

// Códigos SUNAT por tipo de comprobante (catálogo 01 SUNAT, campo APIsPERU codigo_tipo_documento)
export const CODIGO_TIPO_COMPROBANTE = {
  [TIPO_COMPROBANTE.FACTURA]: '01',
  [TIPO_COMPROBANTE.BOLETA]: '03',
  [TIPO_COMPROBANTE.NOTA_CREDITO]: '07',
  [TIPO_COMPROBANTE.NOTA_DEBITO]: '08',
};

// Prefijo de serie SUNAT por tipo de comprobante (F para factura/notas, B para boleta)
export const PREFIJO_SERIE_COMPROBANTE = {
  [TIPO_COMPROBANTE.FACTURA]: 'F',
  [TIPO_COMPROBANTE.BOLETA]: 'B',
  [TIPO_COMPROBANTE.NOTA_CREDITO]: 'F',
  [TIPO_COMPROBANTE.NOTA_DEBITO]: 'F',
};

// Estados de comprobante (Prisma enum: EstadoComprobante)
export const ESTADO_COMPROBANTE = {
  PENDIENTE: 'pendiente',
  EMITIDO: 'emitido',
  ACEPTADO_SUNAT: 'aceptado_sunat',
  RECHAZADO_SUNAT: 'rechazado_sunat',
  EN_BAJA_SUNAT: 'en_baja_sunat',
  ANULADO: 'anulado',
  ERROR: 'error',
};

// Tipo de documento del cliente (catálogo 06 SUNAT)
export const TIPO_DOCUMENTO_CLIENTE = {
  RUC: '6',
  DNI: '1',
  SIN_DOCUMENTO: '0',
  VARIOS: '-',
};

// Tipo de afectación IGV (catálogo 07 SUNAT)
export const TIPO_IGV = {
  GRAVADO: '10',
  GRATUITA_GRAVADA: '16',
  EXONERADO: '20',
  INAFECTO: '30',
};

// Condición de pago (catálogo SUNAT)
export const CONDICION_PAGO_COMPROBANTE = {
  CONTADO: '01',
  CREDITO: '02',
};

// Unidad de medida (catálogo 03 SUNAT)
export const UNIDAD_MEDIDA = {
  UNIDADES: 'NIU',
  SERVICIOS: 'ZZ',
  KILOGRAMOS: 'KGM',
  LITROS: 'LTR',
  METROS: 'MTR',
  CAJAS: 'BX',
};

// Moneda (catálogo 02 SUNAT)
export const MONEDA = {
  PEN: 'PEN',
  USD: 'USD',
  EUR: 'EUR',
};

// Formato PDF canónico de la aplicación
export const FORMATO_PDF = {
  A4: 'A4',
  A5: 'A5',
  TICKET: '80mm',
};

// Tipo de nota de crédito (catálogo 09 SUNAT)
export const TIPO_NOTA_CREDITO = {
  ANULACION_OPERACION: '01',
  ANULACION_ERROR_RUC: '02',
  CORRECCION_DESCRIPCION: '04',
  DESCUENTO_GLOBAL: '05',
  DEVOLUCION_TOTAL: '06',
  DEVOLUCION_POR_ITEM: '07',
  BONIFICACION: '08',
  DISMINUCION_VALOR: '09',
  OTROS: '10',
};

// Tipo de nota de débito (catálogo 10 SUNAT)
export const TIPO_NOTA_DEBITO = {
  INTERESES_MORA: '01',
  AUMENTO_VALOR: '02',
  OTROS: '03',
};

// Labels para UI
export const TIPO_COMPROBANTE_LABEL = {
  [TIPO_COMPROBANTE.FACTURA]: 'Factura Electrónica',
  [TIPO_COMPROBANTE.BOLETA]: 'Boleta de Venta',
  [TIPO_COMPROBANTE.NOTA_CREDITO]: 'Nota de Crédito',
  [TIPO_COMPROBANTE.NOTA_DEBITO]: 'Nota de Débito',
};

// Numeración visible del comprobante: "F001-00000123".
// Mirror de COMPROBANTE_NUMERO en backend/config/constants.js.
export const COMPROBANTE_NUMERO = {
  LONGITUD_CORRELATIVO: 8,
};
COMPROBANTE_NUMERO.formatear = (serie, numero) =>
  `${serie}-${String(numero).padStart(COMPROBANTE_NUMERO.LONGITUD_CORRELATIVO, '0')}`;

export const ESTADO_COMPROBANTE_LABEL = {
  [ESTADO_COMPROBANTE.PENDIENTE]: 'Pendiente',
  [ESTADO_COMPROBANTE.EMITIDO]: 'Emitido',
  [ESTADO_COMPROBANTE.ACEPTADO_SUNAT]: 'Aceptado SUNAT',
  [ESTADO_COMPROBANTE.RECHAZADO_SUNAT]: 'Rechazado SUNAT',
  [ESTADO_COMPROBANTE.EN_BAJA_SUNAT]: 'En baja (SUNAT)',
  [ESTADO_COMPROBANTE.ANULADO]: 'Anulado',
  [ESTADO_COMPROBANTE.ERROR]: 'Error',
};

export const TIPO_DOCUMENTO_CLIENTE_LABEL = {
  [TIPO_DOCUMENTO_CLIENTE.RUC]: 'RUC',
  [TIPO_DOCUMENTO_CLIENTE.DNI]: 'DNI',
  [TIPO_DOCUMENTO_CLIENTE.SIN_DOCUMENTO]: 'Sin documento',
  [TIPO_DOCUMENTO_CLIENTE.VARIOS]: 'Varios',
};

// Labels de unidad de medida SUNAT para selectores
export const UNIDAD_MEDIDA_LABEL = {
  [UNIDAD_MEDIDA.UNIDADES]: 'Unidades (NIU)',
  [UNIDAD_MEDIDA.SERVICIOS]: 'Servicios (ZZ)',
  [UNIDAD_MEDIDA.KILOGRAMOS]: 'Kilogramos (KGM)',
  [UNIDAD_MEDIDA.LITROS]: 'Litros (LTR)',
  [UNIDAD_MEDIDA.METROS]: 'Metros (MTR)',
  [UNIDAD_MEDIDA.CAJAS]: 'Cajas (BX)',
};

// Labels de tipo de afectación IGV para selectores
export const TIPO_IGV_LABEL = {
  [TIPO_IGV.GRAVADO]: 'Gravado (18%)',
  [TIPO_IGV.GRATUITA_GRAVADA]: 'Gratuita gravada',
  [TIPO_IGV.EXONERADO]: 'Exonerado',
  [TIPO_IGV.INAFECTO]: 'Inafecto',
};

// Tipo de operación SUNAT
export const TIPO_OPERACION = {
  VENTA_INTERNA: '0101',
};

// Código respuesta SUNAT
export const SUNAT_RESPUESTA = {
  ACEPTADO: '0',
};

// Nombres de meses (evita hardcodeo en componentes)
export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// ═══════════════════════════════════════════════════════════
// Landing Page — datos dinámicos (evita hardcodeo en componentes)
// ═══════════════════════════════════════════════════════════

// Links de navegación de la landing
export const LANDING_NAV_LINKS = [
  { href: '#catalogo', label: 'Catálogo' },
  { href: '#combos', label: 'Combos' },
  { href: '/nosotros', label: 'Nosotros', isRoute: true },
  { href: '/como-comprar', label: 'Cómo Comprar', isRoute: true },
  { href: '#clientes', label: 'Clientes' },
  { href: '/faq', label: 'FAQ', isRoute: true },
  { href: '#contacto', label: 'Contacto' },
];

// Envío manual por WhatsApp al cliente (comprobantes, cotizaciones).
// Los teléfonos se guardan sin código de país; wa.me lo exige, por eso se
// antepone aquí. Configurable vía VITE_WHATSAPP_CODIGO_PAIS.
export const WHATSAPP = {
  CODIGO_PAIS: import.meta.env.VITE_WHATSAPP_CODIGO_PAIS || '51',
  // Número propio de la empresa (landing y catálogo público), en formato internacional.
  NUMERO_EMPRESA: import.meta.env.VITE_WHATSAPP_NUMBER || '',
  BASE_URL: 'https://wa.me',
};

// Textos del estado de éxito tras emitir un comprobante
export const COMPROBANTE_EMITIDO = {
  toastExito: 'Comprobante emitido exitosamente',
  titulo: 'Comprobante emitido',
  detalle: (numero) => `${numero} se emitió correctamente.`,
  ayudaEnvio: 'Puede enviarlo al cliente por WhatsApp ahora o hacerlo después desde la lista de comprobantes.',
  btnCerrar: 'Cerrar',
};

// Textos del modal de envío de comprobante por WhatsApp
export const WA_COMPROBANTE = {
  titulo: 'Enviar comprobante por WhatsApp',
  labelTelefono: 'Teléfono del cliente',
  labelMensaje: 'Mensaje',
  ayudaMensaje: 'Puede editar el mensaje antes de enviarlo.',
  ayudaSinTelefono: 'El cliente no tiene teléfono registrado. Ingrese uno para continuar.',
  ayudaPdf: 'Al continuar se abrirá el PDF en otra pestaña para que lo adjunte en el chat.',
  btnCancelar: 'Cancelar',
  btnAbrir: 'Abrir WhatsApp',
  btnAccion: 'Enviar por WhatsApp',
  errorCargar: 'No se pudo generar el mensaje',
  errorMensajeVacio: 'El mensaje no puede estar vacío',
};

// Mensajes predefinidos de WhatsApp
export const WA_MENSAJES = {
  GENERAL: 'Hola, me interesa información sobre sus productos.',
  PRODUCTO: (nombre, precio) => `Hola, me interesa el producto: ${nombre} (${precio})`,
  RESERVA: 'Hola, me interesa reservar productos del próximo ingreso.',
  RESERVA_PRODUCTOS: (nombres) => `Hola, me interesa reservar del próximo ingreso: ${nombres}`,
  CONTACTO: 'Hola, necesito información sobre sus productos.',
};

// Combos destacados en landing
export const LANDING_COMBOS = {
  title: 'COMBOS DESTACADOS',
  labelRegalo: 'Regalo',
  labelGratis: 'Gratis',
  labelTotalCombo: 'Total combo:',
  productosRegalo: (n) => `+ ${n} producto(s) de regalo`,
  ctaComprar: 'Comprar',
  labelItems: (n) => `Combo · ${n} item${n === 1 ? '' : 's'}`,
  searchPlaceholder: 'Buscar',
};

// Sidebar izquierdo / derecho de la landing (labels UI + defaults si BD vacía)
export const LANDING_SIDEBAR = {
  // Defaults usados solo como fallback si el SA no configuró el título
  tituloFortalezasDefault: 'Nuestras Fortalezas',
  tituloBeneficiosDefault: 'Beneficios RASEC',
  // Opciones de grupo para el selector del SA
  grupos: [
    { value: 'fortalezas', label: 'Fortalezas' },
    { value: 'beneficios', label: 'Beneficios' },
  ],
  // Contacto rápido (sidebar derecho) — labels UI
  tituloContactoRapido: 'Contacto rápido',
  contactoRapidoHorario: 'Lun a Sáb: 8:00 - 18:00',
  contactoRapidoEnvio: 'Envío a nivel nacional',
  ctaVerCatalogo: 'Ver Catálogo',
  ctaWhatsApp: 'WhatsApp',
  // Placeholder del buscador del IconPicker
  buscarIconoPlaceholder: 'Buscar ícono…',
  sinIconoLabel: 'Sin ícono',
  sinResultadosIconos: 'No se encontraron íconos',
  // Catálogo de íconos disponibles para los ítems del sidebar.
  // Cada value debe existir como key en LANDING_ICON_MAP (landingIconMap.js).
  // keywords: sinónimos para la búsqueda (sin tildes, lowercase).
  iconosCategorias: [
    { value: 'entrega', label: 'Entrega / Logística' },
    { value: 'contacto', label: 'Contacto' },
    { value: 'finanzas', label: 'Finanzas' },
    { value: 'calidad', label: 'Calidad / Servicio' },
    { value: 'industria', label: 'Herramientas / Industria' },
    { value: 'documentos', label: 'Documentos / Datos' },
    { value: 'usuarios', label: 'Usuarios / Tiempo' },
    { value: 'alerta', label: 'Estado / Alerta' },
    { value: 'general', label: 'General' },
  ],
  iconos: [
    // ── General (originales) ─────────────────────────────────
    { value: 'tienda', label: 'Tienda / Showroom', categoria: 'general', keywords: 'tienda showroom local fachada comercio' },
    { value: 'soporte', label: 'Soporte / Headset', categoria: 'contacto', keywords: 'soporte headset ayuda servicio auriculares' },
    { value: 'envio', label: 'Envío / Camión', categoria: 'entrega', keywords: 'envio camion delivery transporte reparto' },
    { value: 'garantia', label: 'Garantía / Escudo check', categoria: 'calidad', keywords: 'garantia escudo check confianza seguridad' },
    { value: 'atencion', label: 'Atención / Escudo estrella', categoria: 'calidad', keywords: 'atencion escudo estrella premium vip' },
    { value: 'catalogo', label: 'Catálogo / Documento', categoria: 'documentos', keywords: 'catalogo documento archivo pdf ficha' },
    { value: 'maquinaria', label: 'Maquinaria / Engranaje', categoria: 'industria', keywords: 'maquinaria engranaje configuracion mecanica' },
    { value: 'web', label: 'Web / Tarjeta', categoria: 'finanzas', keywords: 'web tarjeta compra online credito debito' },
    { value: 'whatsapp', label: 'WhatsApp / Teléfono', categoria: 'contacto', keywords: 'whatsapp telefono llamada movil celular' },
    { value: 'puntos', label: 'Puntos / Regalo', categoria: 'calidad', keywords: 'puntos regalo recompensa bonus fidelidad' },
    // ── Entrega / Logística ──────────────────────────────────
    { value: 'moto', label: 'Moto / Delivery', categoria: 'entrega', keywords: 'moto delivery mensajeria rapido motocicleta' },
    { value: 'avion', label: 'Avión / Importación', categoria: 'entrega', keywords: 'avion aereo importacion internacional vuelo' },
    { value: 'caja', label: 'Caja / Producto', categoria: 'entrega', keywords: 'caja producto empaque box packaging' },
    { value: 'paquete', label: 'Paquete / Encomienda', categoria: 'entrega', keywords: 'paquete encomienda bulto mercaderia' },
    { value: 'ubicacion', label: 'Ubicación / Pin', categoria: 'entrega', keywords: 'ubicacion pin mapa direccion lugar' },
    // ── Contacto ────────────────────────────────────────────
    { value: 'email', label: 'Email / Correo', categoria: 'contacto', keywords: 'email correo mail mensaje electronico' },
    { value: 'chat', label: 'Chat / Mensajería', categoria: 'contacto', keywords: 'chat mensaje burbuja conversacion' },
    { value: 'mapa', label: 'Mapa', categoria: 'contacto', keywords: 'mapa cobertura zona region nacional' },
    { value: 'telefono_fijo', label: 'Teléfono fijo', categoria: 'contacto', keywords: 'telefono fijo anexo llamada oficina' },
    // ── Finanzas ────────────────────────────────────────────
    { value: 'tarjeta_2', label: 'Tarjeta / POS', categoria: 'finanzas', keywords: 'tarjeta credito debito pos visa mastercard' },
    { value: 'billetera', label: 'Billetera / Pagos', categoria: 'finanzas', keywords: 'billetera wallet pagos dinero efectivo' },
    { value: 'porcentaje', label: 'Descuento %', categoria: 'finanzas', keywords: 'descuento porcentaje oferta promocion rebaja' },
    { value: 'dolar', label: 'Dólar / Precio', categoria: 'finanzas', keywords: 'dolar precio moneda pago usd' },
    // ── Calidad / Servicio ──────────────────────────────────
    { value: 'estrella', label: 'Estrella / Calidad', categoria: 'calidad', keywords: 'estrella calidad premium destacado top' },
    { value: 'pulgar', label: 'Pulgar arriba / Recomendado', categoria: 'calidad', keywords: 'pulgar like recomendado aprobado ok' },
    { value: 'check_circulo', label: 'Check / Verificado', categoria: 'calidad', keywords: 'check verificado ok aprobado tilde' },
    // ── Herramientas / Industria ────────────────────────────
    { value: 'llave', label: 'Llave inglesa', categoria: 'industria', keywords: 'llave inglesa herramienta mecanica reparacion' },
    { value: 'martillo', label: 'Martillo', categoria: 'industria', keywords: 'martillo herramienta golpe carpinteria' },
    { value: 'taladro', label: 'Taladro', categoria: 'industria', keywords: 'taladro herramienta electrica perforar' },
    { value: 'casco', label: 'Casco de seguridad', categoria: 'industria', keywords: 'casco seguridad obra construccion proteccion' },
    { value: 'tornillo', label: 'Tornillo / Perno', categoria: 'industria', keywords: 'tornillo perno ferreteria fijacion' },
    // ── Documentos / Datos ──────────────────────────────────
    { value: 'grafico', label: 'Gráfico / Estadísticas', categoria: 'documentos', keywords: 'grafico estadistica barras datos reporte' },
    { value: 'lista', label: 'Lista / Checklist', categoria: 'documentos', keywords: 'lista checklist tareas items' },
    { value: 'factura', label: 'Factura / Recibo', categoria: 'documentos', keywords: 'factura recibo boleta comprobante' },
    // ── Usuarios / Tiempo ───────────────────────────────────
    { value: 'usuario', label: 'Usuario / Cliente', categoria: 'usuarios', keywords: 'usuario cliente persona perfil' },
    { value: 'equipo', label: 'Equipo / Team', categoria: 'usuarios', keywords: 'equipo team grupo staff colaboradores' },
    { value: 'calendario', label: 'Calendario / Fecha', categoria: 'usuarios', keywords: 'calendario fecha agenda dia cita' },
    // ── Estado / Alerta ─────────────────────────────────────
    { value: 'info', label: 'Información', categoria: 'alerta', keywords: 'info informacion ayuda detalle' },
    { value: 'alerta', label: 'Alerta / Precaución', categoria: 'alerta', keywords: 'alerta precaucion warning advertencia' },
    { value: 'candado', label: 'Candado / Seguridad', categoria: 'alerta', keywords: 'candado seguridad privado bloqueo password' },
  ],
};

// Métodos de compra — íconos disponibles en el SA.
// Coincide con las keys que rendering maps (METODO_ICON_MAP en LandingPage.jsx
// y ICON_MAP en ComoComprarPage.jsx) conocen. Los que no estén en esos maps
// caen al ícono de carrito por defecto en la vista pública.
export const LANDING_METODOS_COMPRA = {
  iconosCategorias: [
    { value: 'compra', label: 'Modalidad de compra' },
    { value: 'entrega', label: 'Entrega' },
    { value: 'servicio', label: 'Servicio' },
  ],
  iconos: [
    { value: 'tienda', label: 'Tienda / Showroom', categoria: 'compra', keywords: 'tienda showroom local fachada comercio' },
    { value: 'web', label: 'Web / Tarjeta', categoria: 'compra', keywords: 'web tarjeta compra online credito debito' },
    { value: 'whatsapp', label: 'WhatsApp / Teléfono', categoria: 'compra', keywords: 'whatsapp telefono llamada movil celular' },
    { value: 'envio', label: 'Envío / Camión', categoria: 'entrega', keywords: 'envio camion delivery transporte reparto' },
    { value: 'maquinaria', label: 'Maquinaria / Engranaje', categoria: 'servicio', keywords: 'maquinaria engranaje configuracion mecanica' },
    { value: 'soporte', label: 'Soporte / Headset', categoria: 'servicio', keywords: 'soporte headset ayuda servicio auriculares' },
    { value: 'garantia', label: 'Garantía / Escudo check', categoria: 'servicio', keywords: 'garantia escudo check confianza seguridad' },
    { value: 'atencion', label: 'Atención / Escudo estrella', categoria: 'servicio', keywords: 'atencion escudo estrella premium vip' },
    { value: 'catalogo', label: 'Catálogo / Documento', categoria: 'servicio', keywords: 'catalogo documento archivo pdf ficha' },
    { value: 'puntos', label: 'Puntos / Regalo', categoria: 'servicio', keywords: 'puntos regalo recompensa bonus fidelidad' },
  ],
};

// Sección productos landing
export const LANDING_PRODUCTOS = {
  tituloPrincipal: 'SOLUCIONES DE MAQUINARIA INDUSTRIAL Y AUTOMOTRIZ DE PRECISIÓN',
  labelEnStock: 'En stock',
  labelAgotado: 'Agotado',
  labelSinStock: 'Sin stock',
  labelSoloRestantes: (n) => `Solo ${n} restantes`,
  ctaAlCarrito: 'Al Carrito',
  verCatalogoCompleto: 'Ver catálogo completo',
};

// Combos — Super Admin (gestión)
export const SA_COMBOS = {
  titulo: 'Combos',
  buscarPlaceholder: 'Buscar por nombre o vendedor...',
  todosVendedores: 'Todos los vendedores',
  filtroTodos: 'Todos',
  filtroVisibles: 'Visibles en Landing',
  filtroOcultos: 'Ocultos en Landing',
  sinCombos: 'No hay combos registrados.',
  btnEnLanding: 'En Landing',
  btnMostrar: 'Mostrar',
  btnQuitarLanding: 'Quitar de la landing',
  btnMostrarLanding: 'Mostrar en la landing',
  toastRemovidoLanding: (nombre) => `"${nombre}" removido de la landing`,
  toastVisibleLanding: (nombre) => `"${nombre}" visible en la landing`,
  imagenLandingLabel: 'Imagen extra para landing',
  imagenSubida: 'Imagen de landing subida correctamente',
  imagenEliminada: 'Imagen de landing eliminada',
  sinImagenExtra: 'Sin imagen extra. Se mostrarán las fotos de los productos.',
  btnSubir: 'Subir',
  btnCambiar: 'Cambiar',
  btnEliminar: 'Eliminar',
};

// Detalle de producto (landing/público)
export const DETALLE_PRODUCTO = {
  tituloRelacionados: 'PRODUCTOS RELACIONADOS',
};

// ═══════════════════════════════════════════════════════════
// Impresión Bluetooth ESC/POS (evita hardcodeo en hook/encoder)
// ═══════════════════════════════════════════════════════════

// UUIDs de servicios BLE conocidos para impresoras térmicas ESC/POS.
// Cubre los módulos y perfiles más comunes de la industria.
export const BT_KNOWN_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Perfil común de clones ESC/POS
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent UART
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // JDY BLE modules
  '0000ff00-0000-1000-8000-00805f9b34fb', // Xprinter / Chinese Generic
  '0000fff0-0000-1000-8000-00805f9b34fb', // MHT / PeriPage / Goojprt
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / CC2541 modules
  '0000fee7-0000-1000-8000-00805f9b34fb', // Tencent BLE
  '0000ff02-0000-1000-8000-00805f9b34fb', // Alternate generic
  '0000ae30-0000-1000-8000-00805f9b34fb', // Some Bixolon models
  '0000ff01-0000-1000-8000-00805f9b34fb', // Alternate generic 2
];

// Patrones de UUID de característica TX preferidos (heurística de selección).
// Se usan como sustrings para priorizar la característica correcta cuando el
// dispositivo expone varias escribibles. ORDEN = PRIORIDAD (primero gana).
//
// '49535343-8841' (ISSC Transparent UART, módulos Microchip BM77/BM78) va
// primero porque en impresoras chinas dual-mode (EX58C, Goojprt, Munbyn) el
// servicio ESC/POS clásico (000018f0 + 00002af1) suele ser un endpoint
// "fantasma" que ACKea GATT pero no llega al firmware de impresión; el dato
// real fluye por el UART transparente del módulo ISSC.
export const BT_TX_UUID_HINTS = ['49535343-8841', 'ff02', '2af1', 'ffe1'];

// Parámetros de transporte BLE.
// CHUNK_SIZE = 60 bytes — la mayoría de impresoras BLE térmicas (TSPL/ESC-POS)
// negocian MTU ≥ 64 al conectar. Las raras que no, igual reciben gracias a la
// fragmentación interna del stack BLE de Android. Subir de 20 a 60 acelera 3x
// el envío de payloads grandes (rótulo TSPL con BITMAP ≈ 27 KB), evitando que
// el firmware desconecte por timeout durante transferencias largas.
export const BT_CHUNK_SIZE = 60;
// Delay corto entre chunks: con WWR el stack BLE encola sin bloquear, así que
// 10 ms basta para no inundar el ring buffer del firmware.
export const BT_CHUNK_DELAY_MS = 10;
export const BT_POST_CONNECT_DELAY_MS = 300; // Estabilización post-conexión antes del primer write
export const BT_DRAIN_DELAY_MS = 200;     // Espera final para drenar el stack BLE

// Code page ESC/POS (ESC t n). 16 = WPC1252 (Windows-1252) → cobertura Latin-1
// (acentos y Ñ en español).
export const ESCPOS_CODEPAGE_WPC1252 = 16;

// ═══════════════════════════════════════════════════════════
// Multi-protocolo: catálogo y detección
// Drivers reales viven en src/utils/printers/<id>/
// ═══════════════════════════════════════════════════════════
export const PROTOCOLO_TSPL = 'tspl';
export const PROTOCOLO_ESCPOS = 'escpos';
export const PROTOCOLO_ZPL = 'zpl';
export const PROTOCOLO_PPLB_EZPL = 'pplb-ezpl';

export const PROTOCOLOS_DISPONIBLES = [
  {
    id: PROTOCOLO_TSPL,
    label: 'TSPL — TSC / clones (EX58C, HPRT, Xprinter 237B, Pos-D N41)',
  },
  {
    id: PROTOCOLO_ESCPOS,
    label: 'ESC/POS — Epson, Bixolon, Xprinter T80B, Goojprt, MHT, Munbyn',
  },
  {
    id: PROTOCOLO_ZPL,
    label: 'ZPL — Zebra ZD220 / ZD230 / ZD500 / GK420',
  },
  {
    id: PROTOCOLO_PPLB_EZPL,
    label: 'PPLB / EZPL — Argox OS·CP / Godex G500·DT2x',
  },
];

// Default global: TSPL (preserva la EX58C ya validada).
export const PROTOCOLO_DEFAULT_ID = PROTOCOLO_TSPL;

// Heurística de auto-detección por nombre del dispositivo BT.
// El primer patrón que matchea (lowercase, includes) gana. Si nada matchea,
// usamos PROTOCOLO_DEFAULT_ID (compat EX58C en clones genéricos sin marca).
export const PROTOCOLO_DETECCION_PATTERNS = [
  // Zebra → ZPL
  { protocolo: PROTOCOLO_ZPL, patrones: ['zebra', 'zd2', 'zd5', 'gk420', 'zt'] },

  // Argox / Godex → PPLB / EZPL
  { protocolo: PROTOCOLO_PPLB_EZPL, patrones: ['argox', 'os-21', 'os-2140', 'cp-21', 'godex', 'g500', 'dt2x', 'ezpl'] },

  // ESC/POS — POS de ticket (Epson, Bixolon, Xprinter T80/58, Goojprt, MHT, Munbyn, 3nStar, Phomemo)
  { protocolo: PROTOCOLO_ESCPOS, patrones: ['epson', 'tm-t', 'tm-m', 'bixolon', 'srp-3', 'srp-2', 'xp-t', 'xp-58', 'xp-80', 't20', 't88', 'goojprt', 'jp-80', 'pt-58', 'mht', 'p58', 'munbyn', 'itpp', 'rpt008', '3nstar', 'phomemo', 'pr82'] },

  // TSPL — clones de etiquetas con BT (EX58, EX80, HPRT, 237B, 365B, 470B, DT108B)
  { protocolo: PROTOCOLO_TSPL, patrones: ['ex58', 'ex80', 'hprt', 'n41', '237b', '365b', '470b', 'dt108', 'tsc'] },
];

// Identificadores de layout (cuánto contenido cabe en la etiqueta)
export const LAYOUT_COMPLETO = 'completo';
export const LAYOUT_REDUCIDO = 'reducido';
export const LAYOUT_MINIMO = 'minimo';

// Keys de localStorage para preferencias de impresión.
// El hook useFormatoImpresion sufija el id del protocolo, así cada protocolo
// recuerda su última selección por separado.
export const LS_FORMATO_IMPRESION_KEY = 'rasec_formato_impresion';
export const LS_PROTOCOLO_OVERRIDE_KEY = 'rasec_protocolo_override';


// SVG path del ícono de WhatsApp (evita repetir inline SVG)
export const WHATSAPP_SVG_PATH = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z';



// ---------------------------------------------------------------------------
// Identidad de la empresa para documentos exportables (cotización en PDF).
// El RUC, la razón social, la dirección y el teléfono NO viven aquí: se leen de
// Administrador → Facturación (tbl_configuracion_facturacion), que es donde ya
// se registran para los comprobantes electrónicos.
// ---------------------------------------------------------------------------
export const EMPRESA = {
  RAZON_SOCIAL: 'MAQUINARIAS RASEC S.A.C.',
  MARCA_LINEA_1: 'MAQUINARIAS',
  MARCA_LINEA_2: 'RASEC S.A.C.',
  RUBRO: 'Venta de maquinaria, repuestos y herramientas industriales',
  HORARIO: 'Lun a Sáb: 8:00 - 18:00',
  LOGO_URL: '/logo-rasec.png',
};

// Textos y reglas del documento de cotización exportable
export const COTIZACION_EXPORT = {
  TITULO_DOC: 'COTIZACIÓN',
  // Días de vigencia de la oferta, se imprime como "Válida hasta".
  DIAS_VALIDEZ: 7,
  MONEDA_NOMBRE: 'SOLES',
  MONEDA_ETIQUETA: 'SOLES (S/)',
  ETIQUETA_OBSEQUIO: 'OBSEQUIO',
  CONDICIONES: [
    'Precios expresados en Soles (S/) e incluyen IGV.',
    'La disponibilidad de stock se confirma al momento de la aceptación.',
    'Los plazos de entrega se coordinan al confirmar el pedido.',
    'Envíos a nivel nacional por agencia de transporte a solicitud del cliente.',
    'Los productos cuentan con garantía comercial contra defectos de fábrica.',
  ],
  NOTA_LEGAL: 'Documento generado electrónicamente. No constituye comprobante de pago.',
  BTN_EXPORTAR: 'Exportar PDF',
  BTN_IMPRIMIR: 'Imprimir / Guardar PDF',
  MSG_GENERANDO: 'Generando cotización…',
  MSG_POPUP_BLOQUEADO:
    'El navegador bloqueó la ventana de la cotización. Permite las ventanas emergentes de este sitio e inténtalo de nuevo.',
  MSG_ERROR: 'No se pudo generar la cotización',
  MSG_SIN_ITEMS: 'La cotización no tiene productos para exportar',
};
