// ======================================================
// Archivo: format.ts
// Responsabilidad: Formato único de moneda y fecha para toda la app.
//                   Antes cada pantalla llamaba .toFixed(2) o
//                   .toLocaleString("es-CO", ...) por su cuenta, con
//                   pequeñas variaciones — esto centraliza esa convención.
// ======================================================

export function formatCurrency(amount: number): string {
  return `$${(amount || 0).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(value: string | Date, options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("es-CO", options);
}
