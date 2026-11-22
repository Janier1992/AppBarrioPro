import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCspDirectives } from "./csp.js";

const config = JSON.parse(readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"));
const headers: Record<string, string> = Object.fromEntries(config.headers[0].headers.map((h: any) => [h.key, h.value]));

describe("vercel.json: cabeceras de seguridad", () => {
  it("incluye las cabeceras básicas", () => {
    for (const k of ["Content-Security-Policy", "Strict-Transport-Security", "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy"]) {
      expect(headers[k], k).toBeTruthy();
    }
  });
  it("la CSP permite el mismo connect-src que el servidor Express (sin ampliar nada)", () => {
    const expected = buildCspDirectives({}).connectSrc.join(" ");
    expect(headers["Content-Security-Policy"]).toContain(`connect-src ${expected};`);
    expect(headers["Content-Security-Policy"]).toContain("script-src 'self';");
    expect(headers["Content-Security-Policy"]).not.toMatch(/unsafe-eval|script-src[^;]*unsafe-inline/);
  });
  it("el rewrite de la SPA no captura /api", () => {
    expect(new RegExp(`^${config.rewrites[0].source.replace(/^\//, "/")}$`).test("/api/chat")).toBe(false);
    expect(new RegExp(`^${config.rewrites[0].source}$`).test("/inventario")).toBe(true);
  });
});
