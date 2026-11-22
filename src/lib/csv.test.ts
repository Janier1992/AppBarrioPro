import { describe, expect, it } from "vitest";
import { escapeCsvCell, toCsv } from "./csv";

describe("csv seguro", () => {
  it.each(["=1+1", "+cmd", "-2+3", "@SUM(A1)", "\tX", '=HYPERLINK("http://x","y")'])("neutraliza fórmula %j", (v) => {
    expect(escapeCsvCell(v).replace(/^"/, "").startsWith("'")).toBe(true);
  });
  it("no altera texto normal ni números (incluido negativo)", () => {
    expect(escapeCsvCell("Arroz")).toBe("Arroz");
    expect(escapeCsvCell(-5)).toBe("-5");
    expect(escapeCsvCell(undefined)).toBe("");
  });
  it("entrecomilla comas, comillas y saltos de línea", () => {
    expect(escapeCsvCell('a,"b"')).toBe('"a,""b"""');
    expect(escapeCsvCell("a\nb")).toBe('"a\nb"');
  });
  it("arma el CSV con BOM", () => {
    expect(toCsv(["A", "B"], [["=x", 1]])).toBe("﻿A,B\n'=x,1");
  });
});
