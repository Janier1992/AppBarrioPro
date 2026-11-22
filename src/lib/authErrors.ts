// ======================================================
// Archivo: authErrors.ts
// Responsabilidad: Traducir los mensajes de error de autenticación de
//                   InsForge (a menudo en inglés, p. ej. "Invalid login
//                   credentials") a mensajes claros en español para
//                   tenderos que no son técnicos.
// ======================================================

const KNOWN_ERRORS: Array<{ match: RegExp; message: string }> = [
  { match: /invalid login credentials/i, message: "Correo o contraseña incorrectos." },
  { match: /user already registered|already exists/i, message: "Ya existe una cuenta con este correo electrónico. Intenta iniciar sesión." },
  { match: /password should be at least|password.*(short|length)/i, message: "La contraseña debe tener al menos 6 caracteres." },
  { match: /email not (confirmed|verified)|verify your email|not verified/i, message: "Debes confirmar tu correo electrónico antes de iniciar sesión (revisa tu bandeja de entrada)." },
  { match: /invalid email/i, message: "El correo electrónico no es válido." },
  { match: /invalid.*(code|token|otp)|(code|token|otp).*(invalid|expired)|expired/i, message: "El código es incorrecto o ya venció. Solicita uno nuevo." },
  { match: /rate limit|too many requests/i, message: "Demasiados intentos. Espera unos minutos y vuelve a intentarlo." },
  { match: /network|fetch|failed to fetch/i, message: "No se pudo conectar con el servidor. Verifica tu conexión a internet." },
];

/** ¿El error de inicio de sesión es porque el correo aún no se ha confirmado? */
export function isEmailNotConfirmed(rawMessage: string | undefined): boolean {
  return /email not (confirmed|verified)|verify your email|not verified/i.test(rawMessage ?? "");
}

export function translateAuthError(rawMessage: string | undefined): string {
  if (!rawMessage) return "Ocurrió un error inesperado al procesar la solicitud.";
  const known = KNOWN_ERRORS.find((entry) => entry.match.test(rawMessage));
  return known ? known.message : "Ocurrió un error al procesar la solicitud. Verifica tus datos e inténtalo de nuevo.";
}
