import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: any[] = [];
let rpcResult: any = { data: 5, error: null };
let serverStock = 10;

vi.mock("./insforge", () => {
  const selectChain = { eq: () => ({ eq: () => ({ single: async () => ({ data: { stock: serverStock }, error: null }) }) }) };
  const from = (_table: string) => ({
    upsert: async () => ({ error: null }),
    select: () => selectChain,
    update: (d: any) => ({ eq: () => ({ eq: async () => { calls.push({ fallbackWrite: d.stock }); serverStock = d.stock; return { error: null }; } }) }),
  });
  return {
    insforge: {
      database: {
        from,
        rpc: async (fn: string, args: any) => { await new Promise(r => setTimeout(r, 5)); calls.push({ fn, args }); return rpcResult; },
      },
    },
    isInsForgeConfigured: () => true,
    notifySubscribers: () => {},
  };
});

import { db } from "./db";
import { loadOutbox, pendingCount } from "./outbox";

const memory = new Map<string, string>();
beforeEach(() => {
  calls.length = 0;
  rpcResult = { data: 5, error: null };
  serverStock = 10;
  memory.clear();
  (globalThis as any).localStorage = {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
    removeItem: (k: string) => void memory.delete(k),
    key: (i: number) => [...memory.keys()][i] ?? null,
    get length() { return memory.size; },
  };
  memory.set("barriopro_products_u1", JSON.stringify([{ id: "p1", name: "Arroz", stock: 10 }, { id: "p2", name: "Sal", stock: 3 }]));
});

describe("stock atómico", () => {
  it("envía un DELTA (no un valor absoluto) a la función del servidor, con id de operación", async () => {
    await db.adjustStock("u1", "p1", -4);
    expect(calls).toHaveLength(1);
    expect(calls[0].fn).toBe("adjust_stock");
    expect(calls[0].args).toMatchObject({ p_product_id: "p1", p_delta: -4 });
    expect(calls[0].args.p_op_id).toMatch(/^op_/);
    expect(pendingCount("u1")).toBe(0);
  });

  it("actualiza el stock local de forma relativa y nunca baja de 0", async () => {
    await db.adjustStock("u1", "p2", -10);
    const list = JSON.parse(memory.get("barriopro_products_u1")!);
    expect(list.find((p: any) => p.id === "p2").stock).toBe(0);
    await db.adjustStock("u1", "p1", 5);
    expect(JSON.parse(memory.get("barriopro_products_u1")!).find((p: any) => p.id === "p1").stock).toBe(15);
  });

  it("dos ventas simultáneas del mismo producto envían dos deltas (no se pisan)", async () => {
    await Promise.all([db.adjustStock("u1", "p1", -2), db.adjustStock("u1", "p1", -3)]);
    const deltas = calls.filter((c) => c.fn === "adjust_stock").map((c) => c.args.p_delta).sort((a: number, b: number) => a - b);
    expect(deltas).toEqual([-3, -2]);
  });

  it("si la función aún no existe en el servidor, usa el respaldo leer-y-escribir sobre el stock REAL", async () => {
    rpcResult = { data: null, error: { code: "PGRST202", message: "Could not find the function public.adjust_stock", status: 404 } };
    serverStock = 7; // el servidor tiene 7 aunque este dispositivo viera 10
    await db.adjustStock("u1", "p1", -2);
    expect(calls.find((c) => "fallbackWrite" in c)?.fallbackWrite).toBe(5);
    expect(pendingCount("u1")).toBe(0);
  });

  it("sin conexión queda pendiente y conserva el mismo id (idempotencia en el reintento)", async () => {
    rpcResult = { data: null, error: Object.assign(new Error("network"), { status: 503 }) };
    await db.adjustStock("u1", "p1", -1);
    const [op] = loadOutbox("u1");
    expect(op).toMatchObject({ kind: "adjust", delta: -1 });
    rpcResult = { data: 9, error: null };
    calls.length = 0;
    const { flushOutbox } = await import("./outbox");
    await flushOutbox("u1");
    expect(calls[0].args.p_op_id).toBe(op.id);
    expect(pendingCount("u1")).toBe(0);
  });

  it("envíos simultáneos de la cola no repiten la misma operación", async () => {
    rpcResult = { data: null, error: Object.assign(new Error("network"), { status: 503 }) };
    await db.adjustStock("u1", "p1", -1);
    rpcResult = { data: 9, error: null };
    calls.length = 0;
    const { flushOutbox } = await import("./outbox");
    await Promise.all([flushOutbox("u1"), flushOutbox("u1"), flushOutbox("u1")]);
    expect(calls.filter((c) => c.fn === "adjust_stock")).toHaveLength(1);
  });
});
