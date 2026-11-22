// Datos ficticios SOLO para desarrollo (modo demostración sin InsForge): permiten probar la interfaz
// del portal de soporte. No se incluye en el build de producción.
import type { AdminAccount, AdminApi, AdminSummary, AuditEntry, StatusAction } from "./admin";
import type { SubscriptionInfo, SubscriptionState } from "./subscription";
import { createMockAdminSupport } from "./supportMock";

const day = 86400000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * day).toISOString();

interface Row extends AdminAccount {
  status: "trial" | "active" | "suspended" | "cancelled";
}

function stateOf(r: Row, now = Date.now()): SubscriptionState {
  if (r.status === "suspended") return "suspended";
  if (r.status === "cancelled") return "cancelled";
  if (r.status === "active") return r.currentPeriodEnd && now <= new Date(r.currentPeriodEnd).getTime() ? "active" : "past_due";
  return r.trialEndsAt && now <= new Date(r.trialEndsAt).getTime() ? "trial" : "trial_expired";
}

export function createMockAdminApi(): AdminApi {
  const rows: Row[] = [
    { userId: "u1", businessName: "Tienda La Esquina", email: "esquina@correo.com", status: "active", state: "active", currentPeriodEnd: iso(18), trialEndsAt: iso(-20), lastPaymentAt: iso(-12), paymentsCount: 2, createdAt: iso(-40) },
    { userId: "u2", businessName: "Panadería Doña Marta", email: "marta@correo.com", status: "trial", state: "trial", trialEndsAt: iso(2), createdAt: iso(-5) },
    { userId: "u3", businessName: "Fruver El Campesino", email: "campesino@correo.com", status: "trial", state: "trial_expired", trialEndsAt: iso(-3), createdAt: iso(-10) },
    { userId: "u4", businessName: "Ferretería Los Andes", email: "andes@correo.com", status: "active", state: "past_due", currentPeriodEnd: iso(-2), trialEndsAt: iso(-40), lastPaymentAt: iso(-32), paymentsCount: 1, createdAt: iso(-45) },
    { userId: "u5", businessName: "Papelería Útiles", email: "utiles@correo.com", status: "suspended", state: "suspended", currentPeriodEnd: iso(10), trialEndsAt: iso(-30), note: "Pago devuelto", createdAt: iso(-35) },
    { userId: "u6", businessName: "Droguería Salud", email: "salud@correo.com", status: "active", state: "active", currentPeriodEnd: iso(3), trialEndsAt: iso(-60), lastPaymentAt: iso(-27), paymentsCount: 3, createdAt: iso(-90) },
    { userId: "u7", businessName: "Minimercado Sol", email: "sol@correo.com", status: "trial", state: "trial", trialEndsAt: iso(6), createdAt: iso(-1) },
  ];
  const payments: Record<string, AdminSummary["payments"]> = {
    u1: [{ amountCop: 29900, method: "Nequi", reference: "NQ-1021", months: 1, periodStart: iso(-12), periodEnd: iso(18), createdAt: iso(-12) }],
  };
  const audit: AuditEntry[] = [];
  const log = (action: string, userId: string, details: Record<string, unknown> = {}) =>
    audit.unshift({ id: audit.length + 1, action, targetUserId: userId, targetBusiness: rows.find((r) => r.userId === userId)?.businessName, details, createdAt: new Date().toISOString(), admin: "soporte@tiendly.co" });
  const find = (id: string) => {
    const r = rows.find((x) => x.userId === id);
    if (!r) throw new Error("La cuenta no tiene suscripción registrada");
    return r;
  };
  const info = (r: Row): SubscriptionInfo => {
    const state = stateOf(r);
    const end = state === "trial" ? r.trialEndsAt : state === "active" ? r.currentPeriodEnd : null;
    return { userId: r.userId, state, status: r.status, trialEndsAt: r.trialEndsAt, currentPeriodEnd: r.currentPeriodEnd, lastPaymentAt: r.lastPaymentAt, hasAccess: state === "trial" || state === "active", daysLeft: end ? Math.max(0, Math.ceil((new Date(end).getTime() - Date.now()) / day)) : 0 };
  };
  const refresh = (r: Row) => void (r.state = stateOf(r));
  const support = createMockAdminSupport();

  return {
    isAdmin: async () => true,
    listAccounts: async () => rows.map((r) => ({ ...r, state: stateOf(r) })),
    registerPayment: async (userId, amountCop, method, reference, months) => {
      if (months < 1 || months > 12) throw new Error("Los meses deben estar entre 1 y 12");
      if (!(amountCop > 0)) throw new Error("El monto debe ser mayor que cero");
      const r = find(userId);
      const base = Math.max(Date.now(), r.status === "active" && r.currentPeriodEnd ? new Date(r.currentPeriodEnd).getTime() : r.status === "trial" && r.trialEndsAt ? new Date(r.trialEndsAt).getTime() : 0);
      const end = new Date(base); end.setMonth(end.getMonth() + months);
      r.status = "active"; r.currentPeriodEnd = end.toISOString(); r.lastPaymentAt = new Date().toISOString(); r.paymentsCount = (r.paymentsCount ?? 0) + 1; refresh(r);
      (payments[userId] ??= []).unshift({ amountCop, method, reference, months, periodStart: new Date(base).toISOString(), periodEnd: end.toISOString(), createdAt: new Date().toISOString() });
      log("register_payment", userId, { amount: amountCop, months, method, reference });
      return info(r);
    },
    setStatus: async (userId, action: StatusAction, note) => {
      const r = find(userId);
      if (action === "suspend") r.status = "suspended";
      else if (action === "cancel") r.status = "cancelled";
      else if (r.currentPeriodEnd && new Date(r.currentPeriodEnd).getTime() > Date.now()) r.status = "active";
      else if (r.trialEndsAt && new Date(r.trialEndsAt).getTime() > Date.now()) r.status = "trial";
      else throw new Error("No hay un periodo vigente: registra un pago o extiende la prueba");
      if (note) r.note = note;
      refresh(r); log("set_status_" + action, userId, { note });
      return info(r);
    },
    extendTrial: async (userId, days) => {
      if (days < 1 || days > 60) throw new Error("Los días deben estar entre 1 y 60");
      const r = find(userId);
      if (r.status !== "trial") throw new Error(`Solo se puede extender la prueba de cuentas en prueba (estado actual: ${r.status})`);
      r.trialEndsAt = new Date(Math.max(Date.now(), new Date(r.trialEndsAt ?? 0).getTime()) + days * day).toISOString();
      refresh(r); log("extend_trial", userId, { days });
      return info(r);
    },
    setNote: async (userId, note) => { const r = find(userId); r.note = note || null; log("set_note", userId, { note }); return info(r); },
    clearPin: async (userId) => { find(userId); log("clear_pin", userId); },
    summary: async (userId) => {
      const r = find(userId);
      return {
        subscription: info(r),
        profile: { businessName: r.businessName ?? undefined, email: r.email ?? undefined, phone: "300 123 4567", address: "Calle 10 # 5-20", hours: "08:00 - 20:00", hasPin: userId === "u1", theme: "light", updatedAt: iso(-1) },
        products: { total: 42, lowStock: 4, outOfStock: 1 },
        sales: { total: 318, last30Days: 96, last30DaysAmount: 4120500, lastSaleAt: iso(-0.2) },
        debts: { open: 5, openAmount: 286000 },
        tasks: { pending: 3, total: 11 },
        payments: payments[userId] ?? [],
      };
    },
    auditLog: async () => audit,
    supportList: (status) => support.list(status),
    supportThread: (id) => support.thread(id),
    supportReply: (id, body, status) => support.reply(id, body, status),
    supportSetStatus: (id, status) => support.setStatus(id, status),
    supportPendingCount: () => support.pendingCount(),
  };
}
