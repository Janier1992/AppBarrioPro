// ======================================================
// Archivo: pin.ts
// Responsabilidad: Hashear y verificar el PIN de seguridad local.
// Observaciones: El PIN sigue viajando al cliente dentro del perfil (misma
//                limitación que el resto de datos hasta que exista un
//                endpoint server-side de verificación); hashearlo protege
//                principalmente contra la exposición del valor real en
//                backups, logs o dumps de la base de datos.
// ======================================================

import bcrypt from "bcryptjs";

const BCRYPT_PREFIX = /^\$2[aby]?\$/;

// sessionStorage (no localStorage): se olvida al cerrar la pestaña/navegador,
// así que cada apertura nueva de la app vuelve a pedir el PIN si hay uno
// configurado. Antes el desbloqueo solo vivía en memoria de React, así que
// recargar la página (o volver a abrir la PWA) entraba directo al panel sin
// pedir el PIN — no era una protección real.
const SESSION_UNLOCKED_KEY = "barriopro_pin_unlocked_session";

export function markSessionUnlocked(): void {
  try {
    sessionStorage.setItem(SESSION_UNLOCKED_KEY, "true");
  } catch {
    // sessionStorage no disponible (modo privado estricto, etc.): sin efecto.
  }
}

export function clearSessionUnlocked(): void {
  try {
    sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
  } catch {
    // no-op
  }
}

export function isSessionUnlocked(): boolean {
  try {
    return sessionStorage.getItem(SESSION_UNLOCKED_KEY) === "true";
  } catch {
    return false;
  }
}

export function isHashedPin(value: string): boolean {
  return BCRYPT_PREFIX.test(value);
}

export function hashPin(plainPin: string): string {
  return bcrypt.hashSync(plainPin, 10);
}

/**
 * Compara un PIN ingresado contra el valor guardado. Soporta PINs antiguos
 * guardados en texto plano (antes de esta migración) comparándolos de forma
 * literal, para no bloquear a tiendas que ya configuraron su PIN.
 */
export function verifyPin(inputPin: string, storedValue: string): boolean {
  if (!storedValue) return false;
  if (isHashedPin(storedValue)) {
    return bcrypt.compareSync(inputPin, storedValue);
  }
  return inputPin === storedValue;
}
