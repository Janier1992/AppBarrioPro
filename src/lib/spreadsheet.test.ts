import { describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { parseCsv, readSpreadsheetRows, rowsToObjects, SpreadsheetFormatError } from "./spreadsheet";

/** Construye un .xlsx mínimo válido (celdas de texto/número en línea). */
function makeXlsx(rows: (string | number)[][]): Blob {
  const col = (i: number) => String.fromCharCode(65 + i);
  const sheet = rows
    .map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) =>
      typeof v === "number"
        ? `<c r="${col(ci)}${ri + 1}"><v>${v}</v></c>`
        : `<c r="${col(ci)}${ri + 1}" t="inlineStr"><is><t>${v}</t></is></c>`).join("")}</row>`)
    .join("");
  const files = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    "xl/workbook.xml": strToU8(`<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Hoja1" sheetId="1" r:id="rId1"/></sheets></workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`),
    "xl/worksheets/sheet1.xml": strToU8(`<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheet}</sheetData></worksheet>`),
  };
  return new Blob([zipSync(files)]);
}
const named = (blob: Blob, name: string) => Object.assign(blob, { name }) as Blob & { name: string };

describe("parseCsv", () => {
  it("lee comillas, comillas escapadas y saltos de línea dentro de celdas", () => {
    expect(parseCsv('a,b\n"x, y","di ""hola"""\n"l1\nl2",z')).toEqual([["a", "b"], ["x, y", 'di "hola"'], ["l1\nl2", "z"]]);
  });
  it("detecta ; como separador (Excel en español) y quita el BOM", () => {
    expect(parseCsv("﻿nombre;precio\r\nArroz;4500\r\n")).toEqual([["nombre", "precio"], ["Arroz", "4500"]]);
  });
});

describe("rowsToObjects", () => {
  it("usa la primera fila como encabezado e ignora filas vacías", () => {
    expect(rowsToObjects([["n", "p"], ["A", 1], ["", ""], ["B", 2]]).map((o) => ({ ...o }))).toEqual([{ n: "A", p: 1 }, { n: "B", p: 2 }]);
  });
  it("un encabezado __proto__ no contamina el prototipo", () => {
    const [obj] = rowsToObjects([["__proto__", "x"], ["polluted", "1"]]);
    expect(({} as any).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(obj)).toBeNull();
  });
});

describe("readSpreadsheetRows", () => {
  it("lee un .xlsx real", async () => {
    const file = named(makeXlsx([["Nombre del Producto", "Stock Actual"], ["Arroz", 50], ["Sal", 12]]), "inv.xlsx");
    const rows = await readSpreadsheetRows(file);
    expect(rows.map((r) => ({ ...r }))).toEqual([
      { "Nombre del Producto": "Arroz", "Stock Actual": 50 },
      { "Nombre del Producto": "Sal", "Stock Actual": 12 },
    ]);
  });
  it("lee un .csv", async () => {
    const rows = await readSpreadsheetRows(named(new Blob(["Nombre,Precio\nPan,500"]), "inv.csv"));
    expect(rows.map((r) => ({ ...r }))).toEqual([{ Nombre: "Pan", Precio: "500" }]);
  });
  it("rechaza .xls antiguo con instrucciones claras", async () => {
    await expect(readSpreadsheetRows(named(new Blob(["x"]), "viejo.xls"))).rejects.toThrow(SpreadsheetFormatError);
  });
  it("rechaza otros formatos y un .xlsx corrupto", async () => {
    await expect(readSpreadsheetRows(named(new Blob(["x"]), "a.pdf"))).rejects.toThrow(SpreadsheetFormatError);
    await expect(readSpreadsheetRows(named(new Blob(["no es un zip"]), "roto.xlsx"))).rejects.toThrow();
  });
});
