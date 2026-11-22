import { beforeEach, describe, expect, it, vi } from "vitest";

let rpcResult: any = { data: { hasAccess: true }, error: null };
let rpcThrows = false;

vi.mock("@insforge/sdk/ssr", () => ({
  createServerClient: () => ({
    auth: { getCurrentUser: async () => ({ data: { user: { id: "u1", email: "a@b.co" } }, error: null }) },
    database: { rpc: async () => { if (rpcThrows) throw new Error("red"); return rpcResult; } },
  }),
}));

import { authenticateRequest } from "./auth";

const req = { headers: { authorization: "Bearer token-valido" } };
beforeEach(() => { rpcResult = { data: { hasAccess: true }, error: null }; rpcThrows = false; });

describe("authenticateRequest + suscripción", () => {
  it("sin token no autentica", async () => {
    expect(await authenticateRequest({ headers: {} })).toBeNull();
  });
  it("cuenta con acceso vigente", async () => {
    expect(await authenticateRequest(req)).toMatchObject({ userId: "u1", subscriptionActive: true });
  });
  it("prueba terminada o mes vencido: subscriptionActive = false (el asistente se bloquea)", async () => {
    rpcResult = { data: { hasAccess: false, state: "trial_expired" }, error: null };
    expect(await authenticateRequest(req)).toMatchObject({ subscriptionActive: false });
  });
  it("soporte (isAdmin) nunca queda bloqueado", async () => {
    rpcResult = { data: { hasAccess: false, isAdmin: true }, error: null };
    expect(await authenticateRequest(req)).toMatchObject({ subscriptionActive: true });
  });
  it("si no se puede saber (error o migración sin aplicar) NO se bloquea: null", async () => {
    rpcResult = { data: null, error: { message: "Could not find the function" } };
    expect(await authenticateRequest(req)).toMatchObject({ subscriptionActive: null });
    rpcThrows = true;
    expect(await authenticateRequest(req)).toMatchObject({ subscriptionActive: null });
  });
});
