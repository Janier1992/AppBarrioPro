import React from "react";
import { ArrowLeft, Send } from "lucide-react";
import { timeAgo } from "../lib/relativeTime";
import { STATE_LABEL, type AdminApi, type AdminTicket, type AdminTicketThread } from "../lib/admin";
import { CATEGORY_LABEL, STATUS_LABEL, SUPPORT_LIMITS, type TicketStatus } from "../lib/support";

type Filter = "pendientes" | "resueltos" | "todos";
const STATUS_TONE = { abierto: "bg-sky-100 text-sky-800", en_proceso: "bg-amber-100 text-amber-900", resuelto: "bg-emerald-100 text-emerald-800" } as const;
const POLL_MS = 20_000;

/** Solicitudes de soporte de los clientes. Se actualiza sola cada 20 s. */
export default function TicketsView({ api, onPendingChange }: { api: AdminApi; onPendingChange: () => void }) {
  const [tickets, setTickets] = React.useState<AdminTicket[] | null>(null);
  const [filter, setFilter] = React.useState<Filter>("pendientes");
  const [error, setError] = React.useState("");
  const [open, setOpen] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    try {
      setTickets(await api.supportList(null));
      setError("");
      onPendingChange();
    } catch (e: any) {
      setError(e.message);
    }
  }, [api, onPendingChange]);

  React.useEffect(() => {
    load();
    const timer = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  if (error) return <p role="alert" className="text-sm text-rose-700" id="tickets-error">{error}</p>;
  if (!tickets) return <p className="text-sm text-brand-muted">Cargando solicitudes…</p>;

  if (open !== null) {
    return <TicketPanel api={api} ticketId={open} onBack={() => { setOpen(null); load(); }} />;
  }

  const shown = tickets.filter((t) => (filter === "todos" ? true : filter === "resueltos" ? t.status === "resuelto" : t.status !== "resuelto"));
  const pending = tickets.filter((t) => t.status !== "resuelto").length;
  const unread = tickets.filter((t) => t.status !== "resuelto" && t.adminUnread).length;

  return (
    <div className="space-y-4" id="tickets-view">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtro de solicitudes">
        {([["pendientes", `Pendientes (${pending})`], ["resueltos", "Resueltas"], ["todos", "Todas"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} aria-pressed={filter === id} id={`tickets-filter-${id}`}
            className={`h-10 px-4 rounded-full text-sm font-medium cursor-pointer ${filter === id ? "bg-brand-text text-brand-bg" : "border border-brand-border hover:bg-brand-bg"}`}>
            {label}
          </button>
        ))}
        {unread > 0 && <span className="text-sm font-semibold text-brand-primary" id="tickets-unread">{unread} nueva{unread === 1 ? "" : "s"} sin atender</span>}
      </div>

      <div className="rounded-2xl border border-brand-border bg-white overflow-hidden">
        {shown.length === 0 ? (
          <p className="px-4 py-10 text-center text-brand-muted" id="tickets-empty">No hay solicitudes en esta vista.</p>
        ) : (
          <ul className="divide-y divide-brand-border" id="tickets-list">
            {shown.map((t) => (
              <li key={t.id}>
                <button onClick={() => setOpen(t.id)} className="w-full text-left px-4 py-3.5 hover:bg-brand-bg cursor-pointer flex flex-col gap-1" data-ticket={t.id}>
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium flex items-center gap-2 min-w-0">
                      {t.adminUnread && t.status !== "resuelto" && <span className="h-2.5 w-2.5 rounded-full bg-brand-primary shrink-0" aria-label="Sin atender" />}
                      <span className="truncate">{t.subject}</span>
                    </span>
                    <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 shrink-0 ${STATUS_TONE[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                  </span>
                  <span className="text-sm text-brand-muted truncate">{t.businessName || t.email || t.userId} · {t.lastMessage}</span>
                  <span className="text-xs text-brand-muted">{CATEGORY_LABEL[t.category]} · {t.messageCount} mensaje{t.messageCount === 1 ? "" : "s"} · {timeAgo(t.lastMessageAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TicketPanel({ api, ticketId, onBack }: { api: AdminApi; ticketId: number; onBack: () => void }) {
  const [thread, setThread] = React.useState<AdminTicketThread | null>(null);
  const [reply, setReply] = React.useState("");
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    try { setThread(await api.supportThread(ticketId)); } catch (e: any) { setError(e.message); }
  }, [api, ticketId]);
  React.useEffect(() => {
    load();
    const timer = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const send = async (status: "en_proceso" | "resuelto") => {
    if (!reply.trim()) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await api.supportReply(ticketId, reply, status);
      setReply("");
      setNotice(status === "resuelto" ? "Respuesta enviada y solicitud marcada como resuelta." : "Respuesta enviada al cliente.");
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const setStatus = async (s: TicketStatus) => {
    setBusy(true); setError(""); setNotice("");
    try { await api.supportSetStatus(ticketId, s); setNotice("Estado actualizado."); await load(); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  if (!thread) return <p className="text-sm text-brand-muted">{error || "Cargando…"}</p>;
  const { ticket, messages } = thread;
  const btn = "h-10 px-4 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60";

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-6" id="ticket-panel">
      <div className="space-y-4 min-w-0">
        <button onClick={onBack} className="text-sm text-brand-muted hover:text-brand-text inline-flex items-center gap-1 cursor-pointer" id="ticket-back"><ArrowLeft size={15} aria-hidden="true" /> Solicitudes</button>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold break-words">{ticket.subject}</h2>
            <p className="text-xs text-brand-muted">{CATEGORY_LABEL[ticket.category]} · recibida {timeAgo(ticket.createdAt)}</p>
          </div>
          <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 shrink-0 ${STATUS_TONE[ticket.status]}`} id="ticket-status">{STATUS_LABEL[ticket.status]}</span>
        </div>

        <ul className="space-y-3" aria-label="Conversación" id="ticket-messages">
          {messages.map((m) => (
            <li key={m.id} className={`flex ${m.isStaff ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] ${m.isStaff ? "bg-brand-primary text-white" : "bg-white border border-brand-border"}`}>
                <p className={`text-[11px] font-semibold mb-0.5 ${m.isStaff ? "text-white" : "text-brand-muted"}`}>{m.isStaff ? "Soporte" : ticket.businessName || "Cliente"}</p>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`text-[11px] mt-1 ${m.isStaff ? "text-white" : "text-brand-muted"}`}>{timeAgo(m.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>

        {notice && <p role="status" className="rounded-xl bg-emerald-50 text-emerald-900 text-sm px-4 py-2.5" id="ticket-notice">{notice}</p>}
        {error && <p role="alert" className="rounded-xl bg-rose-50 text-rose-800 text-sm px-4 py-2.5">{error}</p>}

        <div className="space-y-2">
          <label htmlFor="ticket-reply" className="block text-sm font-medium">Responder al cliente</label>
          <textarea id="ticket-reply" rows={4} value={reply} onChange={(e) => setReply(e.target.value)} maxLength={SUPPORT_LIMITS.messageMax}
            className="w-full rounded-xl border border-brand-border px-3 py-2.5 text-[15px] bg-white" placeholder="Escribe la respuesta…" />
          <div className="flex flex-wrap gap-2">
            <button disabled={busy || !reply.trim()} onClick={() => send("en_proceso")} className={`${btn} bg-brand-primary text-white inline-flex items-center gap-1.5`} id="ticket-send"><Send size={15} aria-hidden="true" /> Responder</button>
            <button disabled={busy || !reply.trim()} onClick={() => send("resuelto")} className={`${btn} border border-brand-border`} id="ticket-send-resolve">Responder y resolver</button>
            {ticket.status !== "resuelto"
              ? <button disabled={busy} onClick={() => setStatus("resuelto")} className={`${btn} border border-brand-border`} id="ticket-resolve">Marcar resuelta</button>
              : <button disabled={busy} onClick={() => setStatus("abierto")} className={`${btn} border border-brand-border`} id="ticket-reopen">Reabrir</button>}
          </div>
        </div>
      </div>

      <aside className="rounded-2xl border border-brand-border bg-white p-4 space-y-2 text-sm h-fit" aria-label="Datos del cliente" id="ticket-customer">
        <h3 className="font-semibold">Cliente</h3>
        <p className="font-medium break-words">{ticket.businessName || "Sin nombre"}</p>
        <p className="text-brand-muted break-all">{ticket.email || ticket.userId}</p>
        {ticket.phone && <p className="text-brand-muted">{ticket.phone}</p>}
        <p><span className="text-brand-muted">Suscripción:</span> <strong>{STATE_LABEL[ticket.subscriptionState]}</strong></p>
        <p className="text-xs text-brand-muted pt-1">Para activar o suspender su cuenta, ve a la pestaña Cuentas.</p>
      </aside>
    </div>
  );
}
