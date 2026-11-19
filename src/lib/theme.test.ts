import { describe, expect, it } from "vitest";
import { nextTheme, resolveTheme } from "./theme";

describe("tema claro/oscuro", () => {
  it("resolveTheme trata cualquier valor que no sea 'dark' como claro", () => {
    expect(resolveTheme("dark")).toBe("dark");
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme(undefined)).toBe("light");
    expect(resolveTheme(null)).toBe("light");
    expect(resolveTheme("otro")).toBe("light");
  });

  it("el primer clic siempre cambia lo que se ve", () => {
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("light");
    // Perfil sin tema guardado: se ve claro, el primer clic debe pasar a oscuro (antes pasaba a "claro" y no se notaba).
    expect(nextTheme(undefined)).toBe("dark");
    expect(nextTheme(null)).toBe("dark");
  });

  it("dos clics vuelven al estado original", () => {
    expect(nextTheme(nextTheme(undefined))).toBe("light");
  });
});
