import { describe, it, expect } from "vitest";
import { hashPin, verifyPin, isHashedPin } from "./pin";

describe("PIN de seguridad", () => {
  it("genera un hash bcrypt distinto del PIN original", () => {
    const hash = hashPin("1234");
    expect(hash).not.toBe("1234");
    expect(isHashedPin(hash)).toBe(true);
  });

  it("verifica correctamente un PIN hasheado", () => {
    const hash = hashPin("4321");
    expect(verifyPin("4321", hash)).toBe(true);
    expect(verifyPin("0000", hash)).toBe(false);
  });

  it("mantiene compatibilidad con PINs antiguos guardados en texto plano", () => {
    expect(verifyPin("1234", "1234")).toBe(true);
    expect(verifyPin("9999", "1234")).toBe(false);
    expect(isHashedPin("1234")).toBe(false);
  });

  it("rechaza la verificación si no hay valor guardado", () => {
    expect(verifyPin("1234", "")).toBe(false);
  });
});
