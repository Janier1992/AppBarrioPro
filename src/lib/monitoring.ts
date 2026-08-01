// ======================================================
// Archivo: monitoring.ts
// Responsabilidad: Inicializar el reporte de errores en producción.
// Observaciones: Queda INACTIVO por defecto. Solo se activa si se define
//                VITE_SENTRY_DSN, que debe crearse en una cuenta de Sentry
//                propia (no ejecutable por un agente automatizado) y
//                configurarse como variable de entorno en Vercel.
// ======================================================

import * as Sentry from "@sentry/react";

export function initMonitoring(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.PROD ? "production" : "development",
    tracesSampleRate: 0.1,
  });
}
