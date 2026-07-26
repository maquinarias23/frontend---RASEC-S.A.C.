import { WHATSAPP_SVG_PATH } from '../../config/constants';

// Ícono oficial de WhatsApp. Único punto donde se dibuja el SVG.
export default function IconoWhatsapp({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={WHATSAPP_SVG_PATH} />
    </svg>
  );
}
