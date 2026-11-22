import { beforeEach, describe, expect, it } from "vitest";
import { loadSidebarCollapsed, saveSidebarCollapsed } from "./sidebar";

const memory = new Map<string, string>();
beforeEach(() => {
  memory.clear();
  (globalThis as any).localStorage = {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
  };
});

describe("preferencia del menú lateral", () => {
  it("por defecto está expandido", () => {
    expect(loadSidebarCollapsed()).toBe(false);
  });
  it("recuerda si el usuario lo contrajo", () => {
    saveSidebarCollapsed(true);
    expect(loadSidebarCollapsed()).toBe(true);
    saveSidebarCollapsed(false);
    expect(loadSidebarCollapsed()).toBe(false);
  });
  it("no falla si el almacenamiento no está disponible", () => {
    (globalThis as any).localStorage = { getItem: () => { throw new Error("bloqueado"); }, setItem: () => { throw new Error("bloqueado"); } };
    expect(loadSidebarCollapsed()).toBe(false);
    expect(() => saveSidebarCollapsed(true)).not.toThrow();
  });
});
