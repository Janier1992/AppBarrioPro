/**
 * Utilidades CSV seguras.
 *
 * Excel/Sheets interpretan como fórmula cualquier celda que empiece por = + - @ (o tab/CR).
 * Como el nombre de un producto lo escribe el usuario o viene de un Excel importado,
 * una celda como `=HYPERLINK(...)` se ejecutaría al abrir la exportación (inyección CSV).
 * Se neutraliza anteponiendo un apóstrofo, que Excel muestra como texto literal.
 */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: unknown): string {
  let text = value === undefined || value === null ? "" : String(value);
  // Los números negativos legítimos (-5) no son fórmulas: solo se protege el texto.
  const isPlainNumber = typeof value === "number" && Number.isFinite(value);
  if (!isPlainNumber && FORMULA_TRIGGER.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return "﻿" + [headers.map(escapeCsvCell).join(","), ...rows.map((r) => r.map(escapeCsvCell).join(","))].join("\n");
}
