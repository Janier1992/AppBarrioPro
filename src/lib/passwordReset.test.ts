import { describe, expect, it } from "vitest";
import { isSixDigitCode, readResetTokenFromUrl, validateResetForm } from "./passwordReset";

describe("isSixDigitCode", () => {
  it("acepta exactamente 6 dígitos (con espacios alrededor)", () => {
    expect(isSixDigitCode("123456")).toBe(true);
    expect(isSixDigitCode(" 123456 ")).toBe(true);
  });
  it("rechaza otros formatos", () => {
    expect(isSixDigitCode("12345")).toBe(false);
    expect(isSixDigitCode("1234567")).toBe(false);
    expect(isSixDigitCode("12a456")).toBe(false);
    expect(isSixDigitCode("eyJhbGciOi.token")).toBe(false);
  });
});

describe("validateResetForm", () => {
  const ok = { codeOrToken: "123456", newPassword: "secreta1", confirmPassword: "secreta1" };
  it("acepta datos válidos", () => expect(validateResetForm(ok)).toBeNull());
  it("exige el código", () => expect(validateResetForm({ ...ok, codeOrToken: "  " })).toMatch(/código/));
  it("exige longitud mínima", () =>
    expect(validateResetForm({ ...ok, newPassword: "123", confirmPassword: "123" })).toMatch(/al menos 6/));
  it("exige que coincidan", () =>
    expect(validateResetForm({ ...ok, confirmPassword: "otra" })).toMatch(/no coinciden/));
});

describe("readResetTokenFromUrl", () => {
  it("lee token de los nombres habituales", () => {
    expect(readResetTokenFromUrl("?token=abc")).toBe("abc");
    expect(readResetTokenFromUrl("?reset_token=xyz")).toBe("xyz");
    expect(readResetTokenFromUrl("?otp=999")).toBe("999");
  });
  it("devuelve null si no hay token", () => {
    expect(readResetTokenFromUrl("")).toBeNull();
    expect(readResetTokenFromUrl("?token=")).toBeNull();
    expect(readResetTokenFromUrl("?source=pwa")).toBeNull();
  });
});
