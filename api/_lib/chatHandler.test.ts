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

describe("clave de Gemini solo en el servidor", () => {
  it("ignora una clave enviada por el navegador y usa solo GEMINI_API_KEY", async () => {
    const prev = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      const result = await processChatRequest("user-clave-cliente", {
        messages: [{ role: "user", text: "hola" }],
        geminiApiKey: "AIza-clave-del-cliente",
      });
      // Sin clave en el servidor no debe llamar a Gemini con la del cliente: error de configuración.
      expect(result.status).toBe(400);
      expect(String(result.body.error)).not.toContain("AIza");
    } finally {
      if (prev !== undefined) process.env.GEMINI_API_KEY = prev;
    }
  });
});
