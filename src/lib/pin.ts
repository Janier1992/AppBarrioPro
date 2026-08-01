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
