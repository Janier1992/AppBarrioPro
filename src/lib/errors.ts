// ======================================================
// Archivo: src/lib/errors.ts
// Responsabilidad: Leer de forma segura el mensaje de un error capturado en un `catch`
//   (que en TypeScript es `unknown`), sin recurrir a `any`.
// ======================================================

/** Devuelve el texto del error si existe (Error, objeto con `message` o texto); si no, `undefined`. */
export function mensajeDeError(error: unknown): string | undefined {
  if (typeof error === "string") return error || undefined;
  if (error && typeof error === "object" && "message" in error) {
    const mensaje = (error as { message?: unknown }).message;
    if (typeof mensaje === "string" && mensaje) return mensaje;
  }
  return undefined;
}

/** Igual que `mensajeDeError`, pero con un texto de respaldo para mostrar al usuario. */
export function mensajeDeErrorOPor(error: unknown, respaldo: string): string {
  return mensajeDeError(error) ?? respaldo;
}
