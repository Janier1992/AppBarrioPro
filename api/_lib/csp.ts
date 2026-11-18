// ======================================================
// Archivo: api/_lib/csp.ts
// Responsabilidad: Directivas de Content-Security-Policy para el servidor Express
//                  que sirve el build en producción (Docker / VPS / Cloud Run).
// Por qué existe: la CSP por defecto de Helmet (`default-src 'self'`) bloquea las
//                 llamadas del navegador a InsForge (REST/Auth), a Sentry y las
//                 imágenes externas del onboarding, dejando la app sin datos ni login.
// Nota: en Vercel estos encabezados no aplican (sirve estáticos directamente).
// ======================================================

import { INSFORGE_DEFAULT_BASE_URL } from "./publicConfig.js";

/** Origen (esquema + host) de una URL, o null si no es válida. */
function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function buildCspDirectives(env: Record<string, string | undefined> = process.env) {
  const insforgeOrigin = originOf(env.VITE_INSFORGE_URL || INSFORGE_DEFAULT_BASE_URL);
  const sentryOrigin = originOf(env.VITE_SENTRY_DSN) ? "https://*.ingest.sentry.io" : null;

  const connectSrc = ["'self'", insforgeOrigin, sentryOrigin].filter(Boolean) as string[];

  return {
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    connectSrc,
    fontSrc: ["'self'", "https:", "data:"],
    formAction: ["'self'"],
    frameAncestors: ["'self'"],
    // https: cubre logos/fotos externas (onboarding, almacenamiento de InsForge); blob: y data: los usa jsPDF/html2canvas.
    imgSrc: ["'self'", "data:", "blob:", "https:"],
    objectSrc: ["'none'"],
    scriptSrc: ["'self'"],
    scriptSrcAttr: ["'none'"],
    styleSrc: ["'self'", "https:", "'unsafe-inline'"],
    workerSrc: ["'self'", "blob:"],
    // Se deja a cargo del proxy/balanceador: forzarlo rompe el acceso por http://localhost.
    upgradeInsecureRequests: null,
  };
}
