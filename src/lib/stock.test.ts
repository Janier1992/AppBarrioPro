import { describe, it, expect } from "vitest";
import { isCriticalStock, criticalStockThreshold, filterCriticalStock } from "./stock";

describe("stock crítico (regla del 15%)", () => {
  it("calcula el umbral como el 15% del stock mínimo", () => {
    expect(criticalStockThreshold(10)).toBe(1.5);
    expect(criticalStockThreshold(0)).toBe(0);
  });

  it("marca como crítico un producto en o por debajo del umbral", () => {
    expect(isCriticalStock({ stock: 1, minStock: 10 })).toBe(true);
    expect(isCriticalStock({ stock: 1.5, minStock: 10 })).toBe(true);
  });

  it("no marca como crítico un producto por encima del umbral", () => {
    expect(isCriticalStock({ stock: 2, minStock: 10 })).toBe(false);
  });

  it("filtra correctamente una lista mixta de productos", () => {
    const products = [
      { id: "a", stock: 0, minStock: 5 },
      { id: "b", stock: 20, minStock: 5 },
      { id: "c", stock: 0.7, minStock: 5 },
    ];
    const critical = filterCriticalStock(products);
    expect(critical.map(p => p.id)).toEqual(["a", "c"]);
  });
});
