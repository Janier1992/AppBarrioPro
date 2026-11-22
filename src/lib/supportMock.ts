// Simulación SOLO para desarrollo (sin InsForge): los tickets se guardan en localStorage, así que la app del
// cliente y el portal /admin (pestañas distintas del mismo navegador) comparten los datos. No va a producción.
import type { SupportApi, TicketCategory, TicketStatus, TicketSummary, TicketThread } from "./support";

const KEY = "tiendly_mock_support";
const CLIENT = { userId: "dev-user-id-01", businessName: "Abasto San José", email: "tendero@tiendly.app" };

interface Ticket { id: number; userId: string; businessName: string; email: string; subject: string; category: TicketCategory; status: TicketStatus; adminUnread: boolean; clientUnread: boolean; createdAt: string; lastMessageAt: string }
interface Msg { id: number; ticketId: number; isStaff: boolean; body: string; createdAt: string }
interface Store { next: number; tickets: Ticket[]; messages: Msg[] }

function load(): Store {
  try { return JSON.parse(localStorage.getItem(KEY) || "") as Store; } catch { return { next: 1, tickets: [], messages: [] }; }
}
const save = (s: Store) => localStorage.setItem(KEY, JSON.stringify(s));
const now = () => new Date().toISOString();
const last = (s: Store, id: number) => [...s.messages].filter((m) => m.ticketId === id).sort((a, b) => b.id - a.id)[0]?.body.slice(0, 140) ?? null;

export function createMockClientSupport(): SupportApi {
  return {
    create: async (subject, category, message) => {
      const s = load();
      if (s.tickets.filter((t) => t.userId === CLIENT.userId && t.status !== "resuelto").length >= 5) throw new Error("Ya tienes 5 solicitudes abiertas. Espera la respuesta de soporte o responde en una de ellas.");
      const id = s.next++;
      s.tickets.push({ id, ...CLIENT, subject: subject.trim(), category, status: "abierto", adminUnread: true, clientUnread: false, createdAt: now(), lastMessageAt: now() });
      s.messages.push({ id: s.next++, ticketId: id, isStaff: false, body: message.trim(), createdAt: now() });
      save(s);
      return { id };
    },
    reply: async (ticketId, body) => {
      const s = load();
      const t = s.tickets.find((x) => x.id === ticketId && x.userId === CLIENT.userId);
      if (!t) throw new Error("Solicitud no encontrada");
      s.messages.push({ id: s.next++, ticketId, isStaff: false, body: body.trim(), createdAt: now() });
      if (t.status === "resuelto") t.status = "abierto";
      t.adminUnread = true; t.lastMessageAt = now();
      save(s);
    },
    myTickets: async () => {
      const s = load();
      return s.tickets.filter((t) => t.userId === CLIENT.userId).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
        .map((t): TicketSummary => ({ id: t.id, subject: t.subject, category: t.category, status: t.status, clientUnread: t.clientUnread, createdAt: t.createdAt, lastMessageAt: t.lastMessageAt, lastMessage: last(s, t.id) }));
    },
    thread: async (ticketId): Promise<TicketThread> => {
      const s = load();
      const t = s.tickets.find((x) => x.id === ticketId && x.userId === CLIENT.userId);
      if (!t) throw new Error("Solicitud no encontrada");
      t.clientUnread = false; save(s);
      return { ticket: { id: t.id, subject: t.subject, category: t.category, status: t.status, createdAt: t.createdAt, lastMessageAt: t.lastMessageAt },
        messages: s.messages.filter((m) => m.ticketId === ticketId).map((m) => ({ id: m.id, isStaff: m.isStaff, body: m.body, createdAt: m.createdAt })) };
    },
    unreadCount: async () => load().tickets.filter((t) => t.userId === CLIENT.userId && t.clientUnread).length,
  };
}

/** Parte de soporte (portal /admin) sobre la misma simulación. */
export function createMockAdminSupport() {
  return {
    list: async (status?: string | null) => {
      const s = load();
      return s.tickets.filter((t) => !status || t.status === status)
        .sort((a, b) => Number(b.status !== "resuelto") - Number(a.status !== "resuelto") || Number(b.adminUnread) - Number(a.adminUnread) || b.lastMessageAt.localeCompare(a.lastMessageAt))
        .map((t) => ({ id: t.id, userId: t.userId, subject: t.subject, category: t.category, status: t.status, adminUnread: t.adminUnread, createdAt: t.createdAt, lastMessageAt: t.lastMessageAt,
          businessName: t.businessName, email: t.email, subscriptionState: "trial" as const, lastMessage: last(s, t.id), messageCount: s.messages.filter((m) => m.ticketId === t.id).length }));
    },
    thread: async (ticketId: number) => {
      const s = load();
      const t = s.tickets.find((x) => x.id === ticketId);
      if (!t) throw new Error("Solicitud no encontrada");
      t.adminUnread = false; save(s);
      return { ticket: { id: t.id, userId: t.userId, subject: t.subject, category: t.category, status: t.status, createdAt: t.createdAt, lastMessageAt: t.lastMessageAt, businessName: t.businessName, email: t.email, phone: "300 123 4567", subscriptionState: "trial" as const },
        messages: s.messages.filter((m) => m.ticketId === ticketId).map((m) => ({ id: m.id, isStaff: m.isStaff, body: m.body, createdAt: m.createdAt })) };
    },
    reply: async (ticketId: number, body: string, status: "en_proceso" | "resuelto") => {
      const s = load();
      const t = s.tickets.find((x) => x.id === ticketId);
      if (!t) throw new Error("Solicitud no encontrada");
      if (!body.trim()) throw new Error("El mensaje debe tener entre 1 y 2000 caracteres");
      s.messages.push({ id: s.next++, ticketId, isStaff: true, body: body.trim(), createdAt: now() });
      t.status = status; t.clientUnread = true; t.adminUnread = false; t.lastMessageAt = now();
      save(s);
    },
    setStatus: async (ticketId: number, status: TicketStatus) => {
      const s = load();
      const t = s.tickets.find((x) => x.id === ticketId);
      if (!t) throw new Error("Solicitud no encontrada");
      t.status = status; save(s);
    },
    pendingCount: async () => load().tickets.filter((t) => t.status !== "resuelto" && t.adminUnread).length,
  };
}
