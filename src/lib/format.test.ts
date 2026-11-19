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

import { formatMoney } from "./format";

describe("formatMoney", () => {
  it("agrupa miles con punto, incluso con 4 cifras", () => {
    expect(formatMoney(184500)).toBe("$ 184.500");
    expect(formatMoney(3800)).toBe("$ 3.800");
    expect(formatMoney(1250000)).toBe("$ 1.250.000");
  });
  it("conserva centavos, y maneja cero, vacío y negativos", () => {
    expect(formatMoney(29.4)).toBe("$ 29,40");
    expect(formatMoney(3.8)).toBe("$ 3,80");
    expect(formatMoney(12.004)).toBe("$ 12");
    expect(formatMoney(0)).toBe("$ 0");
    expect(formatMoney(NaN)).toBe("$ 0");
    expect(formatMoney(-5000)).toBe("-$ 5.000");
  });
});

import { formatDueLabel } from "./format";

describe("formatDueLabel", () => {
  const today = new Date("2026-11-19T15:00:00");
  it("describe hoy, mañana y ayer", () => {
    expect(formatDueLabel("2026-11-19", today)).toBe("Vence hoy");
    expect(formatDueLabel("2026-11-20", today)).toBe("Vence mañana");
    expect(formatDueLabel("2026-11-18", today)).toBe("Venció ayer");
  });
  it("describe vencidas y futuras", () => {
    expect(formatDueLabel("2026-11-10", today)).toBe("Venció hace 9 días");
    expect(formatDueLabel("2026-12-05", today)).toBe("Vence el 05/12");
  });
  it("tolera fechas inválidas", () => {
    expect(formatDueLabel("no-es-fecha", today)).toBe("Sin fecha");
  });
});
