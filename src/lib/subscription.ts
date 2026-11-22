// ======================================================
// Archivo: subscription.ts
// Responsabilidad: Estado de suscripción del cliente en la app (prueba de 7 días, pago mensual).
// IMPORTANTE: esto es la CARA del control. El bloqueo real está en la base de datos
//   (insforge-migration-suscripciones.sql): sin acceso vigente, el servidor rechaza leer y escribir
//   productos, ventas, tareas y fiados. Aquí solo se muestra la pantalla correcta y se evita llamar al
//   servidor en vano.
// ======================================================
import { insforge, isInsForgeConfigured } from "./insforge";

export type SubscriptionState =
  | "none"
  | "trial"
  | "trial_expired"
  | "active"
  | "past_due"
  | "suspended"
  | "cancelled";

export interface SubscriptionInfo {
  userId?: string;
  state: SubscriptionState;
  status?: "trial" | "active" | "suspended" | "cancelled" | null;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  lastPaymentAt?: string | null;
  hasAccess: boolean;
  daysLeft: number;
  isAdmin?: boolean;
  serverTime?: string;
}

const cacheKey = (uid: string) => `tiendly_subscription_${uid}`;

export function loadCachedSubscription(uid: string): SubscriptionInfo | null {
  try {
    const raw = localStorage.getItem(cacheKey(uid));
    return raw ? (JSON.parse(raw) as SubscriptionInfo) : null;
  } catch {
    return null;
  }
}

export function saveCachedSubscription(uid: string, info: SubscriptionInfo): void {
  try {
    localStorage.setItem(cacheKey(uid), JSON.stringify(info));
  } catch {
    /* sin almacenamiento: no hay respaldo sin conexión */
  }
}

/** Fecha hasta la que la información guardada daba acceso (fin de prueba o del periodo pagado). */
function accessUntil(info: SubscriptionInfo): number | null {
  const end = info.state === "trial" ? info.trialEndsAt : info.state === "active" ? info.currentPeriodEnd : null;
  const t = end ? new Date(end).getTime() : NaN;
  return Number.isFinite(t) ? t : null;
}

export interface AccessDecision {
  hasAccess: boolean;
  info: SubscriptionInfo | null;
  /** De dónde sale la decisión: el servidor, lo guardado en el dispositivo, o desconocido. */
  source: "server" | "cache" | "unknown";
}

/**
 * Decide si se muestra la app o la pantalla de suscripción.
 *  - Respuesta del servidor: manda siempre.
 *  - Sin conexión: se usa lo último que dijo el servidor, y solo mientras su fecha de fin no haya pasado.
 *    Una cuenta que ya estaba bloqueada sigue bloqueada.
 *  - Sin servidor ni historial: se deja pasar (el servidor igual rechazará los datos si no hay acceso).
 */
export function decideAccess(fresh: SubscriptionInfo | null, cached: SubscriptionInfo | null, now: number = Date.now()): AccessDecision {
  if (fresh) return { hasAccess: fresh.hasAccess || Boolean(fresh.isAdmin), info: fresh, source: "server" };
  if (cached) {
    if (cached.isAdmin) return { hasAccess: true, info: cached, source: "cache" };
    if (!cached.hasAccess) return { hasAccess: false, info: cached, source: "cache" };
    const until = accessUntil(cached);
    const stillValid = until === null || now <= until;
    return { hasAccess: stillValid, info: stillValid ? cached : { ...cached, state: cached.state === "trial" ? "trial_expired" : "past_due", hasAccess: false, daysLeft: 0 }, source: "cache" };
  }
  return { hasAccess: true, info: null, source: "unknown" };
}

/** Pide al servidor el estado (y crea la prueba de 7 días en el primer ingreso). null si no se pudo. */
export async function fetchSubscription(): Promise<SubscriptionInfo | null> {
  if (!isInsForgeConfigured()) return null;
  try {
    const { data, error } = await insforge!.database.rpc("ensure_subscription");
    if (error || !data) return null;
    return data as SubscriptionInfo;
  } catch {
    return null;
  }
}

/** Aviso (no bloqueante) que se muestra dentro de la app. */
export function bannerFor(info: SubscriptionInfo | null): { tone: "info" | "warn"; text: string } | null {
  if (!info || !info.hasAccess || info.isAdmin) return null;
  const days = info.daysLeft;
  const plural = days === 1 ? "día" : "días";
  if (info.state === "trial") {
    return { tone: days <= 2 ? "warn" : "info", text: days === 0 ? "Tu prueba gratis termina hoy." : `Te ${days === 1 ? "queda" : "quedan"} ${days} ${plural} de prueba gratis.` };
  }
  if (info.state === "active" && days <= 5) {
    return { tone: "warn", text: days === 0 ? "Tu suscripción vence hoy." : `Tu suscripción vence en ${days} ${plural}.` };
  }
  return null;
}

/** Textos de la pantalla que se muestra cuando no hay acceso. */
export function paywallCopy(state: SubscriptionState | undefined, endDate?: string | null): { title: string; body: string } {
  const fecha = endDate ? new Date(endDate).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }) : "";
  switch (state) {
    case "trial_expired":
      return { title: "Terminó tu prueba gratis", body: "Tus 7 días de prueba ya pasaron. Activa tu suscripción para seguir usando Tiendly: tus datos están guardados y te esperan." };
    case "past_due":
      return { title: "Tu suscripción venció", body: `${fecha ? `Venció el ${fecha}. ` : ""}Renueva tu mes para volver a vender, controlar tu inventario y tus fiados. Tus datos están guardados.` };
    case "suspended":
      return { title: "Tu cuenta está suspendida", body: "Escríbenos por WhatsApp y te ayudamos a resolverlo. Tus datos están guardados." };
    case "cancelled":
      return { title: "Tu suscripción fue cancelada", body: "Si quieres volver, escríbenos por WhatsApp y reactivamos tu cuenta con tus datos." };
    default:
      return { title: "Activa tu suscripción", body: "Para usar Tiendly necesitas una suscripción activa." };
  }
}
