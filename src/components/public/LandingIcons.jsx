// ═════════════════════════════════════════════════════════════════════════
// LandingIcons — Íconos SVG formales para la landing (replican imagen ref)
// Estilo outlined, stroke=1.6, currentColor. Listos para usar con
// className tailwind (w-X h-X text-...).
// ═════════════════════════════════════════════════════════════════════════

// Tienda física / showroom — fachada con toldo rayado
export function IconTienda({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8 L5 4 H19 L21 8 Z" />
      <line x1="7" y1="4" x2="7" y2="8" />
      <line x1="11" y1="4" x2="11" y2="8" />
      <line x1="15" y1="4" x2="15" y2="8" />
      <line x1="19" y1="4" x2="19" y2="8" />
      <path d="M4 8 V20 H20 V8" />
      <rect x="10" y="13" width="4" height="7" rx="0.3" />
      <rect x="5.5" y="11" width="3.5" height="4" rx="0.3" />
    </svg>
  );
}

// Soporte técnico — headset con micrófono
export function IconSoporte({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 13 V12 A8 8 0 0 1 20 12 V13" />
      <rect x="3" y="13" width="3.5" height="6" rx="1.2" />
      <rect x="17.5" y="13" width="3.5" height="6" rx="1.2" />
      <path d="M17.5 19 H15 A1.5 1.5 0 0 1 13.5 20.5" />
      <circle cx="12.5" cy="20.5" r="1" />
    </svg>
  );
}

// Envíos rápidos — camión de reparto (lateral)
export function IconEnvio({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="7" width="11" height="9" rx="0.5" />
      <path d="M13 10 H18 L21 13 V16 H13 Z" />
      <path d="M15 11 H17.5 L19.5 13 H15 Z" strokeWidth="1.2" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
      <line x1="2" y1="17.5" x2="5.2" y2="17.5" />
      <line x1="8.8" y1="17.5" x2="15.2" y2="17.5" />
    </svg>
  );
}

// Garantía — escudo con check
export function IconGarantia({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 L20 6 V12 C20 16.5 16.5 19.8 12 21 C7.5 19.8 4 16.5 4 12 V6 Z" />
      <path d="M8.5 12 L11 14.5 L15.5 10" />
    </svg>
  );
}

// Atención personalizada — escudo con estrella
export function IconAtencion({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 L20 6 V12 C20 16.5 16.5 19.8 12 21 C7.5 19.8 4 16.5 4 12 V6 Z" />
      <path d="M12 8.5 L13.2 11 L15.8 11.3 L13.9 13.1 L14.4 15.6 L12 14.3 L9.6 15.6 L10.1 13.1 L8.2 11.3 L10.8 11 Z" />
    </svg>
  );
}

// Catálogo exclusivo — documento con esquina doblada
export function IconCatalogo({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3 H15 L19 7 V21 H6 Z" />
      <path d="M15 3 V7 H19" />
      <line x1="8.5" y1="12" x2="16.5" y2="12" />
      <line x1="8.5" y1="15" x2="16.5" y2="15" />
      <line x1="8.5" y1="18" x2="13.5" y2="18" />
    </svg>
  );
}

// Box — stats de productos
export function IconBox({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7 L12 3 L21 7 V17 L12 21 L3 17 Z" />
      <path d="M3 7 L12 11 L21 7" />
      <line x1="12" y1="11" x2="12" y2="21" />
    </svg>
  );
}

// Users — stats de clientes
export function IconUsers({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="9" r="3" />
      <path d="M3 19 C3.5 16 6 14.5 9 14.5 C12 14.5 14.5 16 15 19" />
      <circle cx="16.5" cy="10.5" r="2.3" />
      <path d="M15 19 C15.5 17 17.5 15.8 19 15.8 C20 15.8 20.8 16.2 21.5 17" />
    </svg>
  );
}

// Clock — stats de soporte 24/7
export function IconClock({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7 V12 L15 14" />
    </svg>
  );
}

// Regalo — para ítems de combo tipo "regalo"
export function IconGift({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="10" width="18" height="10" rx="1" />
      <path d="M3 10 H21" />
      <path d="M12 10 V20" />
      <path d="M12 10 C9 10 7 8 7 6 C7 4.5 8 4 9 4 C11 4 12 6 12 10 Z" />
      <path d="M12 10 C15 10 17 8 17 6 C17 4.5 16 4 15 4 C13 4 12 6 12 10 Z" />
    </svg>
  );
}

// Crédito / pago — métodos de compra web
export function IconCredit({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="6" width="19" height="13" rx="1.5" />
      <line x1="2.5" y1="10.5" x2="21.5" y2="10.5" />
      <line x1="6" y1="15.5" x2="9.5" y2="15.5" />
    </svg>
  );
}

// Teléfono — whatsapp (fallback línea)
export function IconPhone({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 4 H8 L9.5 8 L7.5 9.5 C8.5 12 11 14.5 13.5 15.5 L15 13.5 L19 15 V18 A2 2 0 0 1 17 20 C10 20 4 14 4 7 A2 2 0 0 1 6 5" />
    </svg>
  );
}

// Engranaje — fallback de maquinaria
export function IconGear({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5 V5 M12 19 V21.5 M4.5 12 H2 M22 12 H19.5 M5.6 5.6 L7.4 7.4 M16.6 16.6 L18.4 18.4 M5.6 18.4 L7.4 16.6 M16.6 7.4 L18.4 5.6" />
    </svg>
  );
}

// Globo — envíos a nivel nacional (mantenemos icono para compat)
export function IconGlobe({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12 H21" />
      <path d="M12 3 C9 6 9 18 12 21 C15 18 15 6 12 3 Z" />
    </svg>
  );
}

// Arrow — flecha CTA
export function IconArrow({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12 H19 M13 6 L19 12 L13 18" />
    </svg>
  );
}

// Carrito header
export function IconCart({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 4 H5 L7 16 H19" />
      <path d="M7 8 H20 L18.5 14 H7.5" />
      <circle cx="9" cy="19" r="1.3" />
      <circle cx="17" cy="19" r="1.3" />
    </svg>
  );
}

// Chevrons para carrusel
export function IconChevronLeft({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 6 L9 12 L15 18" />
    </svg>
  );
}

export function IconChevronRight({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 6 L15 12 L9 18" />
    </svg>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// CATÁLOGO AMPLIADO — 30 íconos adicionales para el selector del sidebar
// Mismo estilo: outline, stroke=1.6, currentColor, viewBox 24x24
// Agrupados por categoría para facilitar búsqueda y mantenimiento.
// ═════════════════════════════════════════════════════════════════════════

// ── Entrega / Logística ─────────────────────────────────────────────────
export function IconMoto({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="5.5" cy="17" r="2.8" />
      <circle cx="18.5" cy="17" r="2.8" />
      <path d="M5.5 17 L10 10 H14 L16.5 14 H18.5" />
      <path d="M11 10 L13 6 H16" />
      <path d="M8 10 H12" />
    </svg>
  );
}

export function IconAvion({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 L14 10 L21 12 L14 14 L12 21 L10 14 L3 12 L10 10 Z" />
    </svg>
  );
}

export function IconCaja({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="6" width="16" height="14" rx="0.5" />
      <path d="M4 10 H20" />
      <path d="M9 6 V3 H15 V6" />
    </svg>
  );
}

export function IconPaquete({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7 L12 3 L21 7 V17 L12 21 L3 17 Z" />
      <path d="M3 7 L12 11 L21 7" />
      <path d="M12 11 V21" />
      <path d="M7.5 5 L16.5 9" />
    </svg>
  );
}

export function IconUbicacion({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21 C8 16.5 5 13 5 10 A7 7 0 0 1 19 10 C19 13 16 16.5 12 21 Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

// ── Contacto ────────────────────────────────────────────────────────────
export function IconEmail({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="1.2" />
      <path d="M3 7 L12 13 L21 7" />
    </svg>
  );
}

export function IconChat({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5 H20 A1 1 0 0 1 21 6 V16 A1 1 0 0 1 20 17 H9 L5 21 V17 H4 A1 1 0 0 1 3 16 V6 A1 1 0 0 1 4 5 Z" />
      <circle cx="8.5" cy="11" r="0.9" fill="currentColor" />
      <circle cx="12" cy="11" r="0.9" fill="currentColor" />
      <circle cx="15.5" cy="11" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function IconMapa({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6 L9 4 L15 6 L21 4 V18 L15 20 L9 18 L3 20 Z" />
      <path d="M9 4 V18" />
      <path d="M15 6 V20" />
    </svg>
  );
}

export function IconTelefonoFijo({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="9" rx="1.2" />
      <path d="M6 11 V6 H18 V11" />
      <rect x="7" y="14.5" width="3" height="2.5" rx="0.4" />
      <line x1="12" y1="15" x2="17" y2="15" />
      <line x1="12" y1="17.5" x2="17" y2="17.5" />
    </svg>
  );
}

// ── Finanzas ────────────────────────────────────────────────────────────
export function IconTarjeta2({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="5.5" width="19" height="14" rx="1.5" />
      <rect x="5" y="9" width="4" height="3" rx="0.3" />
      <line x1="14" y1="10" x2="19" y2="10" />
      <line x1="5" y1="15.5" x2="10" y2="15.5" />
      <line x1="13" y1="15.5" x2="19" y2="15.5" />
    </svg>
  );
}

export function IconBilletera({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7 V18 A2 2 0 0 0 6 20 H19 A1 1 0 0 0 20 19 V10 A1 1 0 0 0 19 9 H6 A2 2 0 0 1 4 7 A2 2 0 0 1 6 5 H18" />
      <circle cx="16.5" cy="14.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function IconPorcentaje({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="6" y1="18" x2="18" y2="6" />
      <circle cx="7.5" cy="7.5" r="2.5" />
      <circle cx="16.5" cy="16.5" r="2.5" />
    </svg>
  );
}

export function IconDolar({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5 C14.5 7.5 13.3 7 12 7 C10.3 7 9 8 9 9.3 C9 10.7 10.2 11.3 12 11.8 C13.8 12.3 15 13 15 14.5 C15 16 13.6 17 12 17 C10.5 17 9.2 16.3 8.3 15.3" />
      <line x1="12" y1="5.5" x2="12" y2="7" />
      <line x1="12" y1="17" x2="12" y2="18.5" />
    </svg>
  );
}

// ── Calidad / Servicio ──────────────────────────────────────────────────
export function IconEstrella({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 L14.5 9 L21 9.5 L16 13.8 L17.5 20 L12 16.7 L6.5 20 L8 13.8 L3 9.5 L9.5 9 Z" />
    </svg>
  );
}

export function IconPulgar({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 11 V20 H5 A1 1 0 0 1 4 19 V12 A1 1 0 0 1 5 11 Z" />
      <path d="M7 11 L11 4 C11.5 3 13 3.3 13 4.5 V9 H18.5 A1.5 1.5 0 0 1 20 10.7 L19 18 A2 2 0 0 1 17 20 H7" />
    </svg>
  );
}

export function IconCheckCirculo({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12 L11 15 L16 9.5" />
    </svg>
  );
}

// ── Herramientas / Industria ────────────────────────────────────────────
export function IconLlave({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 3 A5 5 0 0 1 19 8 A5 5 0 0 1 12.8 12.8 L4.5 21 L3 19.5 L11.2 11.2 A5 5 0 0 1 14 3 Z" />
      <circle cx="14" cy="8" r="1.5" />
    </svg>
  );
}

export function IconMartillo({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 3 H20 V8 H17 L15 10 L14 9 L12 11 L4 19 L5.5 20.5 L13 13 L14 14 L16 12 L17 13 L20 10 V8" />
    </svg>
  );
}

export function IconTaladro({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7 H13 V13 H11 V15 H7 V13 H3 Z" />
      <path d="M13 9 H17 L20 8 V12 L17 11 H13" />
      <path d="M6 15 V19 A1 1 0 0 0 7 20 H9 A1 1 0 0 0 10 19 V15" />
    </svg>
  );
}

export function IconCasco({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 17 H21 V14 A9 9 0 0 0 3 14 Z" />
      <path d="M9 6 V14" />
      <path d="M15 6 V14" />
      <rect x="2" y="17" width="20" height="2.5" rx="0.5" />
    </svg>
  );
}

export function IconTornillo({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3 H16 L14 7 H10 Z" />
      <path d="M10 7 H14 V11 H10 Z" />
      <path d="M10 11 L12 21 L14 11" />
      <line x1="10" y1="13" x2="14" y2="13" />
      <line x1="10.5" y1="16" x2="13.5" y2="16" />
    </svg>
  );
}

// ── Documentos / Datos ──────────────────────────────────────────────────
export function IconGrafico({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="3" y1="20" x2="21" y2="20" />
      <rect x="5" y="13" width="3" height="7" />
      <rect x="10.5" y="9" width="3" height="11" />
      <rect x="16" y="5" width="3" height="15" />
    </svg>
  );
}

export function IconLista({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="3" height="3" rx="0.3" />
      <rect x="3" y="10.5" width="3" height="3" rx="0.3" />
      <rect x="3" y="17" width="3" height="3" rx="0.3" />
      <line x1="9" y1="5.5" x2="21" y2="5.5" />
      <line x1="9" y1="12" x2="21" y2="12" />
      <line x1="9" y1="18.5" x2="21" y2="18.5" />
    </svg>
  );
}

export function IconFactura({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 3 H19 V21 L16.5 19 L14 21 L11.5 19 L9 21 L6.5 19 L5 21 Z" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="15.5" x2="13" y2="15.5" />
    </svg>
  );
}

// ── Usuarios / Tiempo ───────────────────────────────────────────────────
export function IconUsuario({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4 20 C5 15.8 8 14 12 14 C16 14 19 15.8 20 20" />
    </svg>
  );
}

export function IconEquipo({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="9" r="3" />
      <path d="M3 19 C3.5 16 6 14.5 9 14.5 C12 14.5 14.5 16 15 19" />
      <circle cx="16.5" cy="10.5" r="2.3" />
      <path d="M15 19 C15.5 17 17.5 15.8 19 15.8 C20 15.8 20.8 16.2 21.5 17" />
    </svg>
  );
}

export function IconCalendario({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="1.2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
      <circle cx="8" cy="14" r="0.9" fill="currentColor" />
      <circle cx="12" cy="14" r="0.9" fill="currentColor" />
      <circle cx="16" cy="14" r="0.9" fill="currentColor" />
      <circle cx="8" cy="18" r="0.9" fill="currentColor" />
      <circle cx="12" cy="18" r="0.9" fill="currentColor" />
    </svg>
  );
}

// ── Estado / Alerta ─────────────────────────────────────────────────────
export function IconInfo({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="16" />
      <circle cx="12" cy="7.8" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function IconAlerta({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 L22 20 H2 Z" />
      <line x1="12" y1="10" x2="12" y2="14.5" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function IconCandado({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="1.2" />
      <path d="M7.5 11 V7.5 A4.5 4.5 0 0 1 16.5 7.5 V11" />
      <circle cx="12" cy="15.5" r="1.3" />
    </svg>
  );
}

// Mapa icono_key → componente y IconDefault están en landingIconMap.js
// (archivo separado para no romper react-refresh/only-export-components)
