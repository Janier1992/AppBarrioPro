import { describe, expect, it } from "vitest";
import { buildCspDirectives } from "./csp";

describe("buildCspDirectives", () => {
  it("permite conectar con el origen de InsForge configurado", () => {
    const csp = buildCspDirectives({ VITE_INSFORGE_URL: "https://demo.insforge.app/" });
    expect(csp.connectSrc).toContain("https://demo.insforge.app");
    expect(csp.connectSrc).toContain("'self'");
  });

  it("usa el origen del archivo de configuración si no hay variable de entorno", () => {
    const csp = buildCspDirectives({});
    expect(csp.connectSrc.some((s) => s.startsWith("https://"))).toBe(true);
  });

  it("solo habilita Sentry si hay un DSN válido", () => {
    expect(buildCspDirectives({}).connectSrc.join(" ")).not.toContain("sentry");
    const withDsn = buildCspDirectives({ VITE_SENTRY_DSN: "https://abc@o1.ingest.sentry.io/2" });
    expect(withDsn.connectSrc).toContain("https://*.ingest.sentry.io");
  });

  it("ignora URLs inválidas sin lanzar", () => {
    const csp = buildCspDirectives({ VITE_INSFORGE_URL: "no-es-url" });
    expect(csp.connectSrc).toEqual(["'self'"]);
  });

  it("mantiene scripts restringidos al propio origen", () => {
    const csp = buildCspDirectives({});
    expect(csp.scriptSrc).toEqual(["'self'"]);
    expect(csp.objectSrc).toEqual(["'none'"]);
  });
});
