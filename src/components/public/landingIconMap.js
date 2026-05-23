// ═════════════════════════════════════════════════════════════════════════
// Mapa icono_key → componente SVG formal (ver LandingIcons.jsx)
// Archivo separado para cumplir regla react-refresh/only-export-components
// ═════════════════════════════════════════════════════════════════════════
import {
  IconTienda,
  IconSoporte,
  IconEnvio,
  IconGarantia,
  IconAtencion,
  IconCatalogo,
  IconGear,
  IconCredit,
  IconPhone,
  IconGift,
  // Catálogo ampliado (ver LandingIcons.jsx)
  IconMoto,
  IconAvion,
  IconCaja,
  IconPaquete,
  IconUbicacion,
  IconEmail,
  IconChat,
  IconMapa,
  IconTelefonoFijo,
  IconTarjeta2,
  IconBilletera,
  IconPorcentaje,
  IconDolar,
  IconEstrella,
  IconPulgar,
  IconCheckCirculo,
  IconLlave,
  IconMartillo,
  IconTaladro,
  IconCasco,
  IconTornillo,
  IconGrafico,
  IconLista,
  IconFactura,
  IconUsuario,
  IconEquipo,
  IconCalendario,
  IconInfo,
  IconAlerta,
  IconCandado,
} from './LandingIcons';

export const LANDING_ICON_MAP = {
  // ── Originales ─────────────────────────────────────────────
  tienda: IconTienda,
  showroom: IconTienda,
  soporte: IconSoporte,
  envio: IconEnvio,
  garantia: IconGarantia,
  atencion: IconAtencion,
  catalogo: IconCatalogo,
  maquinaria: IconGear,
  web: IconCredit,
  whatsapp: IconPhone,
  puntos: IconGift,
  // ── Entrega / Logística ────────────────────────────────────
  moto: IconMoto,
  avion: IconAvion,
  caja: IconCaja,
  paquete: IconPaquete,
  ubicacion: IconUbicacion,
  // ── Contacto ───────────────────────────────────────────────
  email: IconEmail,
  chat: IconChat,
  mapa: IconMapa,
  telefono_fijo: IconTelefonoFijo,
  // ── Finanzas ───────────────────────────────────────────────
  tarjeta_2: IconTarjeta2,
  billetera: IconBilletera,
  porcentaje: IconPorcentaje,
  dolar: IconDolar,
  // ── Calidad / Servicio ─────────────────────────────────────
  estrella: IconEstrella,
  pulgar: IconPulgar,
  check_circulo: IconCheckCirculo,
  // ── Herramientas / Industria ───────────────────────────────
  llave: IconLlave,
  martillo: IconMartillo,
  taladro: IconTaladro,
  casco: IconCasco,
  tornillo: IconTornillo,
  // ── Documentos / Datos ─────────────────────────────────────
  grafico: IconGrafico,
  lista: IconLista,
  factura: IconFactura,
  // ── Usuarios / Tiempo ──────────────────────────────────────
  usuario: IconUsuario,
  equipo: IconEquipo,
  calendario: IconCalendario,
  // ── Estado / Alerta ────────────────────────────────────────
  info: IconInfo,
  alerta: IconAlerta,
  candado: IconCandado,
};

export const IconDefault = IconGear;
