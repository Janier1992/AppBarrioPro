import { describe, expect, it } from "vitest";
import { accessEndsAt, adminErrorMessage, computeKpis, daysUntil, type AdminAccount } from "./admin";

const NOW = new Date("2026-12-10T12:00:00Z").getTime();
const day = 86400000;
const acc = (o: Partial<AdminAccount>): AdminAccount => ({ userId: Math.random().toString(), state: "trial", ...o });

describe("cifras del portal", () => {
  const accounts = [
    acc({ state: "active", currentPeriodEnd: new Date(NOW + 20 * day).toISOString() }),
    acc({ state: "active", currentPeriodEnd: new Date(NOW + 3 * day).toISOString() }), // por vencer
    acc({ state: "trial", trialEndsAt: new Date(NOW + 2 * day).toISOString() }),       // por vencer
    acc({ state: "trial", trialEndsAt: new Date(NOW + 6 * day).toISOString() }),
    acc({ state: "trial_expired", trialEndsAt: new Date(NOW - day).toISOString() }),
    acc({ state: "past_due", currentPeriodEnd: new Date(NOW - day).toISOString() }),
    acc({ state: "suspended" }),
  ];
  const k = computeKpis(accounts, 29900, NOW);
  it("cuenta cada grupo", () => {
    expect(k).toMatchObject({ total: 7, trial: 2, active: 2, expiringSoon: 2, blocked: 3 });
  });
  it("el ingreso mensual es cuentas activas × precio", () => {
    expect(k.monthlyRevenueCop).toBe(59800);
  });
});

describe("fechas", () => {
  it("daysUntil redondea hacia arriba y tolera vacíos", () => {
    expect(daysUntil(new Date(NOW + 2.2 * day).toISOString(), NOW)).toBe(3);
    expect(daysUntil(null)).toBeNull();
    expect(daysUntil("no-es-fecha")).toBeNull();
  });
  it("accessEndsAt elige la fecha según el estado", () => {
    expect(accessEndsAt({ state: "trial", trialEndsAt: "T", currentPeriodEnd: "P" })).toBe("T");
    expect(accessEndsAt({ state: "past_due", trialEndsAt: "T", currentPeriodEnd: "P" })).toBe("P");
    expect(accessEndsAt({ state: "suspended", trialEndsAt: "T", currentPeriodEnd: "P" })).toBeNull();
  });
});

describe("mensajes de error", () => {
  it("traduce los errores de la base a mensajes claros", () => {
    expect(adminErrorMessage(new Error("Acceso solo para soporte"))).toBe("Esta cuenta no tiene permisos de soporte.");
    expect(adminErrorMessage({ message: "Could not find the function public.admin_list_accounts" })).toContain("migración de suscripciones");
    expect(adminErrorMessage({ message: "Los meses deben estar entre 1 y 12" })).toBe("Los meses deben estar entre 1 y 12");
  });
});
