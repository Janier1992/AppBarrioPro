import { describe, it, expect } from "vitest";
import { chatRequestSchema } from "./validation";

describe("chatRequestSchema", () => {
  it("acepta un payload válido mínimo", () => {
    const result = chatRequestSchema.safeParse({
      messages: [{ role: "user", content: "Hola" }],
    });
    expect(result.success).toBe(true);
  });

  it("rechaza un payload sin mensajes", () => {
    const result = chatRequestSchema.safeParse({ messages: [] });
    expect(result.success).toBe(false);
  });

  it("rechaza un payload sin el campo messages", () => {
    const result = chatRequestSchema.safeParse({ products: [] });
    expect(result.success).toBe(false);
  });

  it("rechaza más de 60 mensajes en una sola petición", () => {
    const messages = Array.from({ length: 61 }, () => ({ role: "user", content: "hola" }));
    const result = chatRequestSchema.safeParse({ messages });
    expect(result.success).toBe(false);
  });
});
