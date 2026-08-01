import { describe, it, expect } from "vitest";
import { formatCurrency } from "./format";

describe("formatCurrency", () => {
  it("formatea con signo de peso y dos decimales (formato es-CO: punto de miles, coma decimal)", () => {
    expect(formatCurrency(4500)).toBe("$4.500,00");
  });

  it("maneja cero y valores negativos", () => {
    expect(formatCurrency(0)).toBe("$0,00");
    expect(formatCurrency(-10.5)).toBe("$-10,50");
  });
});
