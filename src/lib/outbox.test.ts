import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: string[] = [];
let failing = false;
let failStatus: number | undefined;

vi.mock("./insforge", () => {
  const result = async (label: string) => {
    calls.push(label);
    if (failing) return { error: Object.assign(new Error("fallo"), failStatus ? { status: failStatus } : {}) };
    return { error: null };
  };
  const builder = (table: string) => ({
    upsert: (d: any) => result(`upsert:${table}:${d.id ?? ""}`),
    update: (d: any) => ({ eq: () => ({ eq: () => result(`update:${table}:${JSON.stringify(d)}`) }) }),
    delete: () => ({ eq: (_c: string, id: string) => ({ eq: () => result(`delete:${table}:${id}`) }) }),
  });
  return {
    insforge: { database: { from: builder } },
    isInsForgeConfigured: () => true,
    notifySubscribers: () => calls.push("notify"),
  };
});

import { flushOutbox, loadOutbox, pendingCount, writeRemote } from "./outbox";
import { db } from "./db";

const memory = new Map<string, string>();
beforeEach(() => {
  calls.length = 0;
  failing = false;
  failStatus = undefined;
  memory.clear();
  (globalThis as any).localStorage = {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
    removeItem: (k: string) => void memory.delete(k),
    key: (i: number) => [...memory.keys()][i] ?? null,
    get length() { return memory.size; },
  };
});

const sale = { date: "2026-01-01", total: 10, items: [], paymentMethod: "efectivo" } as any;

describe("outbox: no perder escrituras sin conexión", () => {
  it("una venta hecha sin conexión queda pendiente y NO se pierde", async () => {
    failing = true;
    const id = await db.addSale("u1", sale);
    expect(pendingCount("u1")).toBe(1);
    expect(JSON.parse(memory.get("barriopro_sales_u1")!)).toHaveLength(1);
    expect(id).toMatch(/^sale_/);
  });

  it("al volver la conexión se envía, una sola vez y sin duplicar (upsert por id)", async () => {
    failing = true;
    const id = await db.addSale("u1", sale);
    failing = false;
    calls.length = 0;
    await flushOutbox("u1");
    expect(calls.filter((c) => c.startsWith("upsert:sales"))).toEqual([`upsert:sales:${id}`]);
    expect(pendingCount("u1")).toBe(0);
    await flushOutbox("u1");
    expect(calls.filter((c) => c.startsWith("upsert:sales"))).toHaveLength(1);
  });

  it("conserva el orden: alta → edición → baja", async () => {
    failing = true;
    await writeRemote("u1", { table: "products", kind: "upsert", data: { id: "p1", stock: 5 } });
    await writeRemote("u1", { table: "products", kind: "update", rowId: "p1", data: { stock: 4 } });
    await writeRemote("u1", { table: "products", kind: "delete", rowId: "p1" });
    failing = false;
    calls.length = 0;
    await flushOutbox("u1");
    expect(calls.filter((c) => c !== "notify")).toEqual(["upsert:products:p1", 'update:products:{"stock":4}', "delete:products:p1"]);
  });

  it("se detiene en el primer fallo temporal y conserva el resto", async () => {
    failing = true;
    await writeRemote("u1", { table: "tasks", kind: "upsert", data: { id: "t1" } });
    await writeRemote("u1", { table: "tasks", kind: "upsert", data: { id: "t2" } });
    expect(pendingCount("u1")).toBe(2);
    expect(calls.filter((c) => c.startsWith("upsert"))).toHaveLength(2); // un intento por escritura, no por cada elemento de la cola
  });

  it("descarta lo que el servidor rechaza definitivamente (4xx) para no bloquear la cola", async () => {
    failing = true;
    failStatus = 400;
    await writeRemote("u1", { table: "debts", kind: "upsert", data: { id: "d1" } });
    expect(pendingCount("u1")).toBe(0);
  });

  it("no descarta errores temporales (429/500)", async () => {
    failing = true;
    failStatus = 429;
    await writeRemote("u1", { table: "debts", kind: "upsert", data: { id: "d1" } });
    expect(pendingCount("u1")).toBe(1);
  });

  it("la cola de un usuario no se mezcla con la de otro", async () => {
    failing = true;
    await writeRemote("u1", { table: "tasks", kind: "upsert", data: { id: "t1" } });
    expect(loadOutbox("u2")).toEqual([]);
  });

  it("una lectura remota no pisa datos locales aún no confirmados", async () => {
    failing = true;
    await db.addSale("u1", sale);
    const sales = await db.getSales("u1");
    expect(sales).toHaveLength(1);
  });
});
