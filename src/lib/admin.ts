// ======================================================
// Archivo: admin.ts
// Responsabilidad: Acceso del portal de soporte (/admin) a las funciones de la base de datos.
// La seguridad NO está aquí: cada función SQL verifica en el servidor que la sesión sea de soporte
// (tabla "admins"). Si alguien llama estas funciones sin serlo, la base responde "Acceso solo para soporte".
// ======================================================
import { insforge, isInsForgeConfigured } from "./insforge";
import type { SubscriptionInfo, SubscriptionState } from "./subscription";
import type { TicketCategory, TicketStatus, ThreadMessage } from "./support";

export interface AdminAccount {
  userId: string;
  businessName?: string | null;
  email?: string | null;
  phone?: string | null;
  state: SubscriptionState;
  status?: string | null;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  lastPaymentAt?: string | null;
  note?: string | null;
  createdAt?: string | null;
  paymentsCount?: number;
}

interface AdminPayment {
  amountCop: number;
  method?: string | null;
  reference?: string | null;
  months: number;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

export interface AdminSummary {
  subscription: SubscriptionInfo;
  profile: { businessName?: string; email?: string; phone?: string; address?: string; hours?: string; hasPin?: boolean; theme?: string; updatedAt?: string } | null;
  products: { total: number; lowStock: number; outOfStock: number };
  sales: { total: number; last30Days: number; last30DaysAmount: number; lastSaleAt: string | null };
  debts: { open: number; openAmount: number };
  tasks: { pending: number; total: number };
  payments: AdminPayment[];
}

export interface AuditEntry {
  id: number;
  action: string;
  targetUserId?: string | null;
  targetBusiness?: string | null;
  details: Record<string, unknown>;
  createdAt: string;
  admin: string;
}

export type StatusAction = "suspend" | "cancel" | "resume";

export interface AdminTicket {
  id: number;
  userId: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  adminUnread: boolean;
  createdAt: string;
  lastMessageAt: string;
  businessName?: string | null;
  email?: string | null;
  subscriptionState: SubscriptionState;
  lastMessage?: string | null;
  messageCount: number;
}

export interface AdminTicketThread {
  ticket: Omit<AdminTicket, "adminUnread" | "lastMessage" | "messageCount"> & { phone?: string | null };
  messages: ThreadMessage[];
}

export interface AdminApi {
  isAdmin(): Promise<boolean>;
  listAccounts(): Promise<AdminAccount[]>;
  registerPayment(userId: string, amountCop: number, method: string, reference: string, months: number): Promise<SubscriptionInfo>;
  setStatus(userId: string, action: StatusAction, note?: string): Promise<SubscriptionInfo>;
  extendTrial(userId: string, days: number): Promise<SubscriptionInfo>;
  setNote(userId: string, note: string): Promise<SubscriptionInfo>;
  clearPin(userId: string): Promise<void>;
  summary(userId: string): Promise<AdminSummary>;
  auditLog(limit?: number): Promise<AuditEntry[]>;
  supportList(status?: TicketStatus | null): Promise<AdminTicket[]>;
  supportThread(ticketId: number): Promise<AdminTicketThread>;
  supportReply(ticketId: number, body: string, status: "en_proceso" | "resuelto"): Promise<void>;
  supportSetStatus(ticketId: number, status: TicketStatus): Promise<void>;
  supportPendingCount(): Promise<number>;
}

/** Convierte el error de la base de datos en un mensaje comprensible para soporte. */
export function adminErrorMessage(error: unknown): string {
  const msg = String((error as any)?.message ?? error ?? "");
  if (/Acceso solo para soporte|42501/.test(msg)) return "Esta cuenta no tiene permisos de soporte.";
  if (/Could not find the function|does not exist/i.test(msg)) return "Falta aplicar la migración de suscripciones en la base de datos (insforge-migration-suscripciones.sql).";
  return msg || "No se pudo completar la operación.";
}

function rpcApi(): AdminApi {
  const call = async <T>(fn: string, args?: Record<string, unknown>): Promise<T> => {
    const { data, error } = await (insforge as any).database.rpc(fn, args);
    if (error) throw new Error(adminErrorMessage(error));
    return data as T;
  };
  return {
    isAdmin: async () => {
      try {
        const info = await call<SubscriptionInfo>("my_subscription");
        return info?.isAdmin === true;
      } catch {
        return false;
      }
    },
    listAccounts: () => call<AdminAccount[]>("admin_list_accounts"),
    registerPayment: (userId, amountCop, method, reference, months) =>
      call("admin_register_payment", { p_user: userId, p_amount: amountCop, p_method: method, p_reference: reference, p_months: months }),
    setStatus: (userId, action, note) => call("admin_set_status", { p_user: userId, p_action: action, p_note: note ?? null }),
    extendTrial: (userId, days) => call("admin_extend_trial", { p_user: userId, p_days: days }),
    setNote: (userId, note) => call("admin_set_note", { p_user: userId, p_note: note }),
    clearPin: async (userId) => {
      await call("admin_clear_pin", { p_user: userId });
    },
    summary: (userId) => call<AdminSummary>("admin_account_summary", { p_user: userId }),
    auditLog: (limit = 100) => call<AuditEntry[]>("admin_audit_log", { p_limit: limit }),
    supportList: (status = null) => call<AdminTicket[]>("admin_support_list", { p_status: status }),
    supportThread: (ticketId) => call<AdminTicketThread>("admin_support_thread", { p_ticket: ticketId }),
    supportReply: async (ticketId, body, status) => {
      await call("admin_support_reply", { p_ticket: ticketId, p_body: body.trim(), p_status: status });
    },
    supportSetStatus: async (ticketId, status) => {
      await call("admin_support_set_status", { p_ticket: ticketId, p_status: status });
    },
    supportPendingCount: async () => Number(await call<number>("admin_support_pending_count")) || 0,
  };
}

let cached: Promise<AdminApi> | null = null;

/** API real contra InsForge; en desarrollo sin InsForge, datos ficticios para probar la interfaz. */
export function getAdminApi(): Promise<AdminApi> {
  if (!cached) {
    cached = (async () => {
      if (isInsForgeConfigured()) return rpcApi();
      if (import.meta.env.DEV) return (await import("./adminMock")).createMockAdminApi();
      throw new Error("InsForge no está configurado.");
    })();
  }
  return cached;
}

export const isDemoAdmin = (): boolean => !isInsForgeConfigured() && Boolean(import.meta.env.DEV);

// ---- Presentación ----
export const STATE_LABEL: Record<SubscriptionState, string> = {
  none: "Sin registro",
  trial: "En prueba",
  trial_expired: "Prueba vencida",
  active: "Activa",
  past_due: "Mes vencido",
  suspended: "Suspendida",
  cancelled: "Cancelada",
};

/** Cuentas que hoy NO pueden usar el negocio. */
export const BLOCKED_STATES: ReadonlyArray<SubscriptionState> = ["trial_expired", "past_due", "suspended", "cancelled"];

export function daysUntil(date?: string | null, now: number = Date.now()): number | null {
  if (!date) return null;
  const t = new Date(date).getTime();
  return Number.isFinite(t) ? Math.ceil((t - now) / 86400000) : null;
}

/** Fecha hasta la que la cuenta tiene acceso (según su estado). */
export function accessEndsAt(a: Pick<AdminAccount, "state" | "trialEndsAt" | "currentPeriodEnd">): string | null {
  if (a.state === "trial" || a.state === "trial_expired") return a.trialEndsAt ?? null;
  if (a.state === "active" || a.state === "past_due") return a.currentPeriodEnd ?? null;
  return null;
}

export interface AdminKpis {
  total: number;
  trial: number;
  active: number;
  expiringSoon: number;
  blocked: number;
  monthlyRevenueCop: number;
}

/** Cifras de la cabecera. Ingreso mensual recurrente = cuentas activas × precio del plan. */
export function computeKpis(accounts: AdminAccount[], priceCop: number, now: number = Date.now()): AdminKpis {
  const soon = (a: AdminAccount) => {
    const d = daysUntil(accessEndsAt(a), now);
    return (a.state === "active" || a.state === "trial") && d !== null && d >= 0 && d <= 5;
  };
  const active = accounts.filter((a) => a.state === "active").length;
  return {
    total: accounts.length,
    trial: accounts.filter((a) => a.state === "trial").length,
    active,
    expiringSoon: accounts.filter(soon).length,
    blocked: accounts.filter((a) => BLOCKED_STATES.includes(a.state)).length,
    monthlyRevenueCop: active * priceCop,
  };
}

export const ACTION_LABEL: Record<string, string> = {
  register_payment: "Registró un pago",
  set_status_suspend: "Suspendió la cuenta",
  set_status_resume: "Reactivó la cuenta",
  set_status_cancel: "Canceló la suscripción",
  extend_trial: "Extendió la prueba",
  set_note: "Editó la nota",
  clear_pin: "Restableció el PIN",
  support_reply: "Respondió una solicitud de soporte",
  support_status: "Cambió el estado de una solicitud",
};
