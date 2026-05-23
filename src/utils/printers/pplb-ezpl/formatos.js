import { TSPL_FORMATOS, TSPL_FORMATO_DEFAULT_ID } from '../tspl/formatos';

/**
 * PPLB (Argox) y EZPL (Godex) son hermanos del TSPL — el firmware moderno
 * acepta el mismo set de comandos básicos (SIZE, GAP, BITMAP, BARCODE,
 * PRINT). Reutilizamos el catálogo TSPL para no duplicar definiciones.
 *
 * Si en el futuro se detecta una variación de firmware que no acepte algún
 * comando TSPL, este archivo es el lugar para divergir el catálogo.
 */
export const PPLB_FORMATOS = TSPL_FORMATOS;
export const PPLB_FORMATO_DEFAULT_ID = TSPL_FORMATO_DEFAULT_ID;
