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

/**
 * Moneda con separador de miles por punto, sin decimales cuando el monto es entero: "$ 184.500".
 * Se agrupa a mano porque `toLocaleString("es-CO")` no agrupa los números de 4 cifras ("3800"),
 * y en una tienda de barrio $3.800 y $38.000 deben leerse igual de claro.
 */
export function formatMoney(amount: number): string {
  const cents = Math.round((Number(amount) || 0) * 100) / 100;
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.trunc(abs);
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  // Los pesos colombianos suelen ser enteros; si el monto trae centavos (p. ej. $ 3,80) se conservan.
  const decimals = Number.isInteger(cents) ? "" : "," + String(Math.round((abs - whole) * 100)).padStart(2, "0");
  return `${sign}$ ${grouped}${decimals}`;
}

/**
 * Texto de vencimiento para una deuda: "Vence hoy", "Venció hace 3 días", "Vence el 25/11".
 * `today` es inyectable para poder probarlo.
 */
export function formatDueLabel(dueDate: string, today: Date = new Date()): string {
  const MS_PER_DAY = 86_400_000;
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const due = new Date(dueDate);
  const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const diffDays = Math.round((dueStart - startOfToday) / MS_PER_DAY);

  if (Number.isNaN(diffDays)) return "Sin fecha";
  if (diffDays === 0) return "Vence hoy";
  if (diffDays < 0) return diffDays === -1 ? "Venció ayer" : `Venció hace ${Math.abs(diffDays)} días`;
  if (diffDays === 1) return "Vence mañana";
  return `Vence el ${String(due.getDate()).padStart(2, "0")}/${String(due.getMonth() + 1).padStart(2, "0")}`;
}
