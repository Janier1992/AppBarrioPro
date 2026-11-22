// ======================================================
// Archivo: passwordReset.ts
// Responsabilidad: Reglas puras del flujo "Olvidé mi contraseña" (sin UI ni red),
//                  para poder probarlas de forma aislada.
// ======================================================

const MIN_PASSWORD_LENGTH = 6;

/** InsForge envía por correo un código numérico de 6 dígitos (método "code") o un token largo (método "link"). */
export function isSixDigitCode(value: string): boolean {
  return /^\d{6}$/.test(value.trim());
}

/** Devuelve un mensaje de error en español, o null si los datos son válidos. */
export function validateResetForm(input: {
  codeOrToken: string;
  newPassword: string;
  confirmPassword: string;
}): string | null {
  if (!input.codeOrToken.trim()) return "Ingresa el código que recibiste en tu correo.";
  if (input.newPassword.length < MIN_PASSWORD_LENGTH) {
    return `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (input.newPassword !== input.confirmPassword) return "Las contraseñas no coinciden.";
  return null;
}

/** Extrae un token de recuperación de los parámetros de la URL (enlace del correo), si existe. */
export function readResetTokenFromUrl(search: string): string | null {
  const params = new URLSearchParams(search);
  const token = params.get("reset_token") || params.get("token") || params.get("otp");
  return token && token.trim() ? token.trim() : null;
}
