import { describe, expect, it } from "vitest";
import { bannerFor, decideAccess, paywallCopy, type SubscriptionInfo } from "./subscription";

const day = 86400000;
const NOW = new Date("2026-12-01T12:00:00Z").getTime();
const trial = (daysLeft: number): SubscriptionInfo => ({ state: "trial", hasAccess: true, daysLeft, trialEndsAt: new Date(NOW + daysLeft * day).toISOString() });
const active = (daysLeft: number): SubscriptionInfo => ({ state: "active", hasAccess: true, daysLeft, currentPeriodEnd: new Date(NOW + daysLeft * day).toISOString() });

describe("decideAccess", () => {
  it("la respuesta del servidor manda sobre lo guardado", () => {
    expect(decideAccess({ state: "trial_expired", hasAccess: false, daysLeft: 0 }, trial(5), NOW)).toMatchObject({ hasAccess: false, source: "server" });
    expect(decideAccess(active(10), { state: "suspended", hasAccess: false, daysLeft: 0 }, NOW)).toMatchObject({ hasAccess: true, source: "server" });
  });
  it("soporte nunca queda bloqueado", () => {
    expect(decideAccess({ state: "suspended", hasAccess: false, daysLeft: 0, isAdmin: true }, null, NOW).hasAccess).toBe(true);
  });
  it("sin conexión usa lo guardado mientras no haya pasado su fecha de fin", () => {
    expect(decideAccess(null, trial(3), NOW)).toMatchObject({ hasAccess: true, source: "cache" });
    expect(decideAccess(null, active(10), NOW).hasAccess).toBe(true);
  });
  it("sin conexión, si la fecha guardada ya pasó, se bloquea (no se puede estirar la prueba apagando el internet)", () => {
    const later = NOW + 8 * day;
    expect(decideAccess(null, trial(3), later)).toMatchObject({ hasAccess: false, info: { state: "trial_expired" } });
    expect(decideAccess(null, active(10), NOW + 40 * day)).toMatchObject({ hasAccess: false, info: { state: "past_due" } });
  });
  it("una cuenta que estaba bloqueada sigue bloqueada sin conexión", () => {
    expect(decideAccess(null, { state: "suspended", hasAccess: false, daysLeft: 0 }, NOW).hasAccess).toBe(false);
  });
  it("sin servidor ni historial se deja pasar (el servidor igual rechaza los datos sin acceso)", () => {
    expect(decideAccess(null, null, NOW)).toEqual({ hasAccess: true, info: null, source: "unknown" });
  });
});

describe("bannerFor", () => {
  it("avisa los días de prueba que quedan, con más urgencia al final", () => {
    expect(bannerFor(trial(5))).toEqual({ tone: "info", text: "Te quedan 5 días de prueba gratis." });
    expect(bannerFor(trial(1))).toEqual({ tone: "warn", text: "Te queda 1 día de prueba gratis." });
    expect(bannerFor(trial(0))?.text).toBe("Tu prueba gratis termina hoy.");
  });
  it("avisa cuando la suscripción está por vencer, pero no antes", () => {
    expect(bannerFor(active(20))).toBeNull();
    expect(bannerFor(active(3))).toEqual({ tone: "warn", text: "Tu suscripción vence en 3 días." });
  });
  it("no muestra aviso si no hay acceso, si es soporte o si no hay datos", () => {
    expect(bannerFor({ state: "past_due", hasAccess: false, daysLeft: 0 })).toBeNull();
    expect(bannerFor({ ...trial(2), isAdmin: true })).toBeNull();
    expect(bannerFor(null)).toBeNull();
  });
});

describe("paywallCopy", () => {
  it("explica cada caso con un mensaje claro", () => {
    expect(paywallCopy("trial_expired").title).toBe("Terminó tu prueba gratis");
    expect(paywallCopy("past_due", "2026-12-01T00:00:00Z").body).toContain("Venció el");
    expect(paywallCopy("suspended").title).toBe("Tu cuenta está suspendida");
    expect(paywallCopy("cancelled").title).toBe("Tu suscripción fue cancelada");
  });
});
