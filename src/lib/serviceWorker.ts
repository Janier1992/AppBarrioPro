// Antes vivía como <script> inline en index.html; se movió a un módulo para
// que quede cubierto por la CSP `script-src 'self'` (los scripts inline se
// bloquean sin 'unsafe-inline'/nonce, ver server.ts).
export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("Service Worker registrado con éxito en el ámbito:", registration.scope);
      })
      .catch((error) => {
        console.error("Fallo en el registro del Service Worker:", error);
      });
  });
}
