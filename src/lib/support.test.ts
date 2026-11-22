import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("./insforge", () => ({ insforge: { database: { rpc: (...a: unknown[]) => rpc(...a) } }, isInsForgeConfigured: () => true }));

import { SUPPORT_LIMITS, getSupportApi, supportErrorMessage, validateTicket } from "./support";

beforeEach(() => rpc.mockReset());

describe("validateTicket", () => {
  it("acepta un asunto y mensaje razonables", () => {
    expect(validateTicket("No cobra", "La pantalla se queda cargando")).toBeNull();
  });
  it("pide asunto y mensaje, y respeta los máximos", () => {
    expect(validateTicket("  ", "mensaje largo ok")).toMatch(/asunto/i);
    expect(validateTicket("Asunto ok", "abc")).toMatch(/mínimo 5/);
    expect(validateTicket("x".repeat(SUPPORT_LIMITS.subjectMax + 1), "mensaje largo ok")).toMatch(/muy largo/);
    expect(validateTicket("Asunto ok", "y".repeat(SUPPORT_LIMITS.messageMax + 1))).toMatch(/muy largo/);
  });
});

describe("supportErrorMessage", () => {
  it("muestra los avisos de la base (límites) y oculta los errores técnicos", () => {
    expect(supportErrorMessage(new Error("Ya tienes 5 solicitudes abiertas. Espera la respuesta de soporte o responde en una de ellas."))).toContain("5 solicitudes abiertas");
    expect(supportErrorMessage(new Error("Has enviado muchos mensajes seguidos. Espera un rato antes de escribir de nuevo."))).toContain("muchos mensajes");
    expect(supportErrorMessage({ message: "Could not find the function public.support_my_tickets" })).toContain("WhatsApp");
    expect(supportErrorMessage(new Error("duplicate key value violates unique constraint"))).toMatch(/No pudimos enviar/);
  });
});

describe("getSupportApi (InsForge)", () => {
  it("llama a las funciones del servidor con los parámetros correctos y recorta espacios", async () => {
    const api = await getSupportApi();
    rpc.mockResolvedValueOnce({ data: { id: 7 }, error: null });
    await expect(api.create("  No cobra  ", "problema", "  hola mundo  ")).resolves.toEqual({ id: 7 });
    expect(rpc).toHaveBeenLastCalledWith("support_create_ticket", { p_subject: "No cobra", p_category: "problema", p_message: "hola mundo" });

    rpc.mockResolvedValueOnce({ data: { id: 7 }, error: null });
    await api.reply(7, "  gracias ");
    expect(rpc).toHaveBeenLastCalledWith("support_reply", { p_ticket: 7, p_body: "gracias" });

    rpc.mockResolvedValueOnce({ data: 3, error: null });
    expect(await api.unreadCount()).toBe(3);
    expect(rpc).toHaveBeenLastCalledWith("support_unread_count", undefined);
  });
  it("propaga el mensaje del servidor cuando falla", async () => {
    const api = await getSupportApi();
    rpc.mockResolvedValueOnce({ data: null, error: { message: "Ya tienes 5 solicitudes abiertas" } });
    await expect(api.create("Asunto ok", "pago", "mensaje largo")).rejects.toThrow(/5 solicitudes/);
  });
});
