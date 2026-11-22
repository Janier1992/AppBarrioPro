import { describe, expect, it, vi, beforeEach } from "vitest";

// Orden de eventos registrado por los dobles de prueba.
const events: string[] = [];

vi.mock("./insforge", () => {
  const chain = {
    upsert: vi.fn(async () => {
      events.push("remote:start");
      await new Promise((resolve) => setTimeout(resolve, 20));
      events.push("remote:done");
      return { error: null };
    }),
    insert: vi.fn(async () => {
      events.push("remote:start");
      await new Promise((resolve) => setTimeout(resolve, 20));
      events.push("remote:done");
      return { error: null };
    }),
  };
  return {
    insforge: { database: { from: () => chain } },
    isInsForgeConfigured: () => true,
    notifySubscribers: () => events.push("notify"),
  };
});

import { db } from "./db";
import type { BusinessProfile } from "../types";

const memory = new Map<string, string>();
beforeEach(() => {
  events.length = 0;
  memory.clear();
  (globalThis as any).localStorage = {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
    removeItem: (k: string) => void memory.delete(k),
  };
});

const profile: BusinessProfile = {
  businessName: "Tienda", address: "", hours: "", lowStockThreshold: 5, securityPin: "", theme: "dark", updatedAt: "",
};

describe("db: avisar a la app DESPUÉS de guardar en el servidor", () => {
  it("saveProfile notifica tras terminar la escritura remota (causa del tema que rebotaba)", async () => {
    await db.saveProfile("u1", profile);
    // Si notificara antes, la recarga leería el tema viejo del servidor y lo pisaría.
    expect(events).toEqual(["remote:start", "remote:done", "notify"]);
  });

  it("addProduct notifica tras la escritura remota", async () => {
    await db.addProduct("u1", { name: "Arroz", sku: "A", category: "X", stock: 1, minStock: 1, price: 1, cost: 1, updatedAt: "" });
    expect(events).toEqual(["remote:start", "remote:done", "notify"]);
  });

  it("deja el dato en localStorage aunque el servidor falle, y aun así notifica", async () => {
    const { insforge } = await import("./insforge");
    (insforge as any).database.from().upsert.mockImplementationOnce(async () => ({ error: new Error("sin red") }));
    await db.saveProfile("u1", profile);
    expect(JSON.parse(memory.get("barriopro_profile_u1")!).theme).toBe("dark");
    expect(events).toContain("notify");
  });

  it("no guarda ninguna clave de Gemini en el perfil y borra la que hubiera en el servidor", async () => {
    const { insforge } = await import("./insforge");
    const upsert = (insforge as any).database.from().upsert;
    upsert.mockClear();
    await db.saveProfile("u1", { ...profile, geminiApiKey: "AIza-secreta" } as any);
    expect(memory.get("barriopro_profile_u1")).not.toContain("AIza-secreta");
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ geminiApiKey: null }));
  });
});
