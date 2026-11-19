import { describe, expect, it, beforeEach } from "vitest";
import { BUSINESS_TYPES, getBusinessType, loadBusinessType, mergeCategories, normalizeCategory, saveBusinessType } from "./businessTypes";

const memory = new Map<string, string>();
beforeEach(() => {
  memory.clear();
  (globalThis as any).localStorage = {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
  };
});

describe("tipos de negocio", () => {
  it("tienen id único y al menos una categoría y una tarea", () => {
    const ids = BUSINESS_TYPES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of BUSINESS_TYPES) {
      expect(t.categories.length).toBeGreaterThan(0);
      expect(t.tasks.length).toBeGreaterThan(0);
    }
  });

  it("guarda y recupera el tipo elegido por usuario", () => {
    expect(loadBusinessType("u1")).toBeUndefined();
    saveBusinessType("u1", "panaderia");
    expect(loadBusinessType("u1")?.label).toBe("Panadería o pastelería");
    expect(loadBusinessType("u2")).toBeUndefined();
    expect(getBusinessType("no-existe")).toBeUndefined();
  });
});

describe("mergeCategories", () => {
  it("une sugeridas y las de los productos sin duplicar (ignora acentos y mayúsculas)", () => {
    const result = mergeCategories(["Droguería", "Aseo"], ["drogueria", "Pan", undefined, ""]);
    expect(result).toEqual(["Aseo", "drogueria", "Pan"]);
  });
  it("conserva categorías propias aunque no estén sugeridas", () => {
    expect(mergeCategories(["Pan"], ["Empanadas"])).toContain("Empanadas");
  });
});

describe("normalizeCategory (importación de Excel)", () => {
  const known = ["Abarrotes", "Droguería"];
  it("usa la forma conocida cuando coincide sin acentos", () => {
    expect(normalizeCategory("drogueria", known)).toBe("Droguería");
    expect(normalizeCategory("  ABARROTES ", known)).toBe("Abarrotes");
  });
  it("conserva la categoría propia en lugar de mandarla a 'Otros Comercios'", () => {
    expect(normalizeCategory("empanadas", known)).toBe("Empanadas");
  });
  it("usa General cuando viene vacía", () => {
    expect(normalizeCategory("", known)).toBe("General");
    expect(normalizeCategory(undefined, known)).toBe("General");
  });
});
