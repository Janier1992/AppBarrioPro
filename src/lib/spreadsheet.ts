/**
 * Lectura de hojas de cálculo para la carga masiva de productos (.xlsx y .csv).
 *
 * Reemplaza a la librería `xlsx` (SheetJS), que tiene vulnerabilidades conocidas (prototype
 * pollution y ReDoS) sin parche publicado en npm. Aquí se usa `read-excel-file` para .xlsx
 * (solo lee valores: no evalúa fórmulas ni macros) y un lector CSV propio.
 * El formato antiguo .xls no se admite: se pide guardarlo como .xlsx o .csv.
 */
import { readSheet } from "read-excel-file/universal";

export class SpreadsheetFormatError extends Error {}

/** Lector CSV (RFC 4180): comillas, comillas escapadas, saltos de línea dentro de celdas, BOM, `,` o `;`. */
export function parseCsv(text: string): string[][] {
  const source = text.replace(/^﻿/, "");
  const firstLine = source.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (inQuotes) {
      if (ch === '"') {
        if (source[i + 1] === '"') { cell += '"'; i++; } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell); cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && source[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      rows.push(row); row = [];
    } else cell += ch;
  }
  if (cell !== "" || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}

/** Convierte filas (la primera es el encabezado) en objetos, ignorando filas vacías. */
export function rowsToObjects(matrix: unknown[][]): Record<string, unknown>[] {
  if (matrix.length === 0) return [];
  const headers = matrix[0].map((h) => String(h ?? "").trim());
  const objects: Record<string, unknown>[] = [];
  for (const raw of matrix.slice(1)) {
    if (raw.every((v) => v === null || v === undefined || String(v).trim() === "")) continue;
    const obj: Record<string, unknown> = Object.create(null); // sin prototipo: un encabezado "__proto__" no contamina nada
    headers.forEach((h, i) => { if (h) obj[h] = raw[i] ?? ""; });
    objects.push(obj);
  }
  return objects;
}

export async function readSpreadsheetRows(file: Blob & { name?: string }): Promise<Record<string, unknown>[]> {
  const name = (file.name ?? "").toLowerCase();
  if (name.endsWith(".csv")) return rowsToObjects(parseCsv(await file.text()));
  if (name.endsWith(".xlsx")) {
    const data = (await readSheet(file)) as unknown[][];
    return rowsToObjects(data);
  }
  if (name.endsWith(".xls")) {
    throw new SpreadsheetFormatError("El formato .xls antiguo ya no se admite. En Excel usa Guardar como → .xlsx (o .csv) y vuelve a subirlo.");
  }
  throw new SpreadsheetFormatError("Por favor selecciona un archivo de Excel (.xlsx) o un CSV (.csv).");
}
