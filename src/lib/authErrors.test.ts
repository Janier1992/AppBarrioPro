import { describe, it, expect } from "vitest";
import { translateAuthError } from "./authErrors";

describe("translateAuthError", () => {
  it("traduce credenciales inválidas", () => {
    expect(translateAuthError("Invalid login credentials")).toBe("Correo o contraseña incorrectos.");
  });

  it("traduce usuario ya registrado", () => {
    expect(translateAuthError("User already registered")).toContain("Ya existe una cuenta");
  });

  it("da un mensaje genérico en español para errores desconocidos", () => {
    const result = translateAuthError("Some obscure backend error XYZ");
    expect(result).not.toContain("XYZ");
    expect(result.length).toBeGreaterThan(0);
  });

  it("maneja un mensaje vacío o indefinido", () => {
    expect(translateAuthError(undefined)).toContain("error inesperado");
  });
});
