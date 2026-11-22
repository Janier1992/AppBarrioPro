// ======================================================
// Archivo: support.ts
// Responsabilidad: Tickets de soporte del lado del CLIENTE (negocio): crear una solicitud, ver sus respuestas.
// Los datos viven en InsForge (insforge-migration-soporte.sql); cada cliente solo ve lo suyo (RLS) y las
// escrituras pasan por funciones SQL que validan y limitan el abuso.
// ======================================================
import { insforge, isInsForgeConfigured } from "./insforge";

export type TicketCategory = "problema" | "pago" | "consulta" | "sugerencia";
export type TicketStatus = "abierto" | "en_proceso" | "resuelto";

export interface TicketSummary {
  id: number;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  clientUnread: boolean;
  createdAt: string;
  lastMessageAt: string;
  lastMessage?: string | null;
}

export interface ThreadMessage {
  id: number;
  isStaff: boolean;
  body: string;
  createdAt: string;
}

export interface TicketThread {
  ticket: { id: number; subject: string; category: TicketCategory; status: TicketStatus; createdAt: string; lastMessageAt: string };
  messages: ThreadMessage[];
}

export interface SupportApi {
  create(subject: string, category: TicketCategory, message: string): Promise<{ id: number }>;
  reply(ticketId: number, body: string): Promise<void>;
  myTickets(): Promise<TicketSummary[]>;
  thread(ticketId: number): Promise<TicketThread>;
  unreadCount(): Promise<number>;
}

export const CATEGORY_LABEL: Record<TicketCategory, string> = {
  problema: "Algo no funciona",
  pago: "Pago o suscripción",
  consulta: "Una duda",
  sugerencia: "Una sugerencia",
};

export const STATUS_LABEL: Record<TicketStatus, string> = {
  abierto: "Recibida",
  en_proceso: "En proceso",
  resuelto: "Resuelta",
};

export const SUPPORT_LIMITS = { subjectMin: 3, subjectMax: 120, messageMin: 5, messageMax: 2000 } as const;

/** Validación previa en pantalla (la base de datos vuelve a validar). Devuelve el error o null. */
export function validateTicket(subject: string, message: string): string | null {
  const s = subject.trim();
  const m = message.trim();
  if (s.length < SUPPORT_LIMITS.subjectMin) return "Escribe un asunto (mínimo 3 letras).";
  if (s.length > SUPPORT_LIMITS.subjectMax) return "El asunto es muy largo (máximo 120 caracteres).";
  if (m.length < SUPPORT_LIMITS.messageMin) return "Cuéntanos qué pasa (mínimo 5 caracteres).";
  if (m.length > SUPPORT_LIMITS.messageMax) return "El mensaje es muy largo (máximo 2000 caracteres).";
  return null;
}

/** Mensaje claro a partir del error de la base de datos. */
export function supportErrorMessage(error: unknown): string {
  const msg = String((error as any)?.message ?? error ?? "");
  if (/Could not find the function|does not exist/i.test(msg)) return "El soporte por tickets aún no está activo. Escríbenos por WhatsApp.";
  if (/solicitudes abiertas|muchos mensajes|asunto|mensaje debe|Categoría/i.test(msg)) return msg;
  if (/network|fetch/i.test(msg)) return "No se pudo conectar. Revisa tu internet e inténtalo de nuevo.";
  return "No pudimos enviar tu mensaje. Inténtalo de nuevo en un momento.";
}

function rpcApi(): SupportApi {
  const call = async <T>(fn: string, args?: Record<string, unknown>): Promise<T> => {
    const { data, error } = await (insforge as any).database.rpc(fn, args);
    if (error) throw new Error(error.message ?? String(error));
    return data as T;
  };
  return {
    create: (subject, category, message) => call("support_create_ticket", { p_subject: subject.trim(), p_category: category, p_message: message.trim() }),
    reply: async (ticketId, body) => {
      await call("support_reply", { p_ticket: ticketId, p_body: body.trim() });
    },
    myTickets: () => call<TicketSummary[]>("support_my_tickets"),
    thread: (ticketId) => call<TicketThread>("support_ticket_thread", { p_ticket: ticketId }),
    unreadCount: async () => Number(await call<number>("support_unread_count")) || 0,
  };
}

let cached: Promise<SupportApi> | null = null;

/** API real contra InsForge; en desarrollo sin InsForge, una simulación guardada en el navegador. */
export function getSupportApi(): Promise<SupportApi> {
  if (!cached) {
    cached = (async () => {
      if (isInsForgeConfigured()) return rpcApi();
      if (import.meta.env.DEV) return (await import("./supportMock")).createMockClientSupport();
      throw new Error("InsForge no está configurado.");
    })();
  }
  return cached;
}
