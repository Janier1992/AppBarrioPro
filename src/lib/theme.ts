// ======================================================
// Archivo: theme.ts
// Responsabilidad: Reglas del tema claro/oscuro, sin React ni red, para poder probarlas.
// ======================================================

export type Theme = "light" | "dark";

/** Un perfil sin tema guardado (null/undefined) se trata como claro: la app lo muestra claro. */
export function resolveTheme(value: string | null | undefined): Theme {
  return value === "dark" ? "dark" : "light";
}

/**
 * Tema que resulta de pulsar el interruptor.
 * Antes se calculaba `theme === "light" ? "dark" : "light"`: con un perfil sin tema guardado
 * el primer clic "cambiaba" a claro (no se veía nada) y hacían falta dos clics.
 */
export function nextTheme(current: string | null | undefined): Theme {
  return resolveTheme(current) === "dark" ? "light" : "dark";
}
