import { describe, expect, it } from "vitest";
import { processChatRequest } from "./chatHandler";

describe("processChatRequest", () => {
  it("rechaza con 400 un cuerpo que no cumple el esquema", async () => {
    const result = await processChatRequest("user-validacion", { messages: [] });
    expect(result.status).toBe(400);
    expect(result.body.error).toBeTruthy();
  });

  it("aplica límite de tasa por usuario (429 tras 20 peticiones por minuto)", async () => {
    let last = await processChatRequest("user-rate", { invalido: true });
    for (let i = 0; i < 20; i++) last = await processChatRequest("user-rate", { invalido: true });
    expect(last.status).toBe(429);
  });

  it("el límite de un usuario no afecta a otro", async () => {
    const result = await processChatRequest("user-otro", { invalido: true });
    expect(result.status).toBe(400);
  });
});
