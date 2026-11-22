import React from "react";
import { ArrowLeft, LifeBuoy, MessageCircle, Plus, Send } from "lucide-react";
import { whatsappDisplay, whatsappNumber } from "../lib/pricing";
import { timeAgo } from "../lib/relativeTime";
import {
  CATEGORY_LABEL, STATUS_LABEL, SUPPORT_LIMITS, getSupportApi, supportErrorMessage, validateTicket,
  type SupportApi, type TicketCategory, type TicketSummary, type TicketThread,
} from "../lib/support";

const STATUS_TONE = { abierto: "bg-sky-100 text-sky-800", en_proceso: "bg-amber-100 text-amber-900", resuelto: "bg-emerald-100 text-emerald-800" } as const;
const POLL_LIST_MS = 30_000;
const POLL_THREAD_MS = 15_000;

/**
 * Soporte para el negocio: reporta un problema o una duda y mira la respuesta del equipo aquí mismo.
 * Se actualiza sola (cada 15–30 s) mientras está abierta.
 */
export default function SupportView({ onUnreadChange }: { onUnreadChange?: () => void }) {
  const [api, setApi] = React.useState<SupportApi | null>(null);
  const [tickets, setTickets] = React.useState<TicketSummary[] | null>(null);
  const [view, setView] = React.useState<"list" | "new" | number>("list");
  const [error, setError] = React.useState("");

  React.useEffect(() => { getSupportApi().then(setApi).catch((e) => setError(supportErrorMessage(e))); }, []);

  const refresh = React.useCallback(async () => {
    if (!api) return;
    try {
      setTickets(await api.myTickets());
      setError("");
    } catch (e) {
      setError(supportErrorMessage(e));
    }
  }, [api]);

  React.useEffect(() => {
    if (!api) return;
    refresh();
    const timer = window.setInterval(refresh, POLL_LIST_MS);
    return () => window.clearInterval(timer);
  }, [api, refresh]);

  const wa = whatsappNumber();

  return (
    <div className="max-w-2xl mx-auto space-y-6" id="support-view">
      {view === "list" && (
        <>
          <header className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><LifeBuoy size={22} aria-hidden="true" /> Soporte</h1>
              <p className="text-[15px] text-brand-muted">¿Algo no funciona o tienes una duda? Escríbenos y te respondemos aquí mismo.</p>
            </div>
            <button onClick={() => setView("new")} className="h-11 px-4 rounded-xl bg-brand-primary text-white text-sm font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer" id="support-new">
              <Plus size={16} aria-hidden="true" /> Nueva solicitud
            </button>
          </header>

          {error && <p role="alert" className="rounded-xl bg-rose-50 text-rose-800 text-sm px-4 py-2.5" id="support-error">{error}</p>}

          {tickets === null && !error && <p className="text-sm text-brand-muted">Cargando…</p>}
          {tickets && tickets.length === 0 && (
            <div className="rounded-2xl border border-brand-border bg-white p-6 text-center space-y-2" id="support-empty">
              <p className="font-medium">Aún no tienes solicitudes</p>
              <p className="text-sm text-brand-muted">Cuando nos escribas, verás aquí la conversación y la respuesta del equipo.</p>
            </div>
          )}
          {tickets && tickets.length > 0 && (
            <ul className="rounded-2xl border border-brand-border bg-white divide-y divide-brand-border overflow-hidden" id="support-list">
              {tickets.map((t) => (
                <li key={t.id}>
                  <button onClick={() => setView(t.id)} className="w-full text-left px-4 py-3.5 hover:bg-brand-bg cursor-pointer flex flex-col gap-1" data-ticket={t.id}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium flex items-center gap-2">
                        {t.clientUnread && <span className="h-2.5 w-2.5 rounded-full bg-brand-primary shrink-0" aria-label="Respuesta nueva" />}
                        {t.subject}
                      </span>
                      <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${STATUS_TONE[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                    </span>
                    <span className="text-sm text-brand-muted truncate">{t.lastMessage}</span>
                    <span className="text-xs text-brand-muted">{CATEGORY_LABEL[t.category]} · {timeAgo(t.lastMessageAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {wa && (
            <p className="text-sm text-brand-muted">
              ¿Es urgente?{" "}
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-primary hover:underline inline-flex items-center gap-1">
                <MessageCircle size={14} aria-hidden="true" /> Escríbenos por WhatsApp {whatsappDisplay()}
              </a>
            </p>
          )}
        </>
      )}

      {view === "new" && api && (
        <NewTicket api={api} onBack={() => setView("list")} onCreated={async (id) => { await refresh(); onUnreadChange?.(); setView(id); }} />
      )}
      {typeof view === "number" && api && (
        <Thread api={api} ticketId={view} onBack={() => { setView("list"); refresh(); onUnreadChange?.(); }} />
      )}
    </div>
  );
}

function NewTicket({ api, onBack, onCreated }: { api: SupportApi; onBack: () => void; onCreated: (id: number) => void }) {
  const [category, setCategory] = React.useState<TicketCategory>("problema");
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validateTicket(subject, message);
    if (problem) return setError(problem);
    setBusy(true);
    setError("");
    try {
      const { id } = await api.create(subject, category, message);
      onCreated(id);
    } catch (err) {
      setError(supportErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" id="support-form">
      <button type="button" onClick={onBack} className="text-sm text-brand-muted hover:text-brand-text inline-flex items-center gap-1 cursor-pointer"><ArrowLeft size={15} aria-hidden="true" /> Volver</button>
      <h1 className="text-2xl font-semibold tracking-tight">Nueva solicitud</h1>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">¿Sobre qué es?</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CATEGORY_LABEL) as TicketCategory[]).map((c) => (
            <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)}
              className={`h-10 px-4 rounded-full text-sm border cursor-pointer ${category === c ? "bg-brand-text border-brand-text text-brand-bg font-medium" : "bg-white border-brand-border hover:bg-brand-bg"}`}>
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="support-subject" className="block text-sm font-medium mb-1">Asunto</label>
        <input id="support-subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={SUPPORT_LIMITS.subjectMax}
          placeholder="Ej: No me deja cobrar una venta" className="w-full h-12 rounded-xl border border-brand-border px-3 text-[15px] bg-white" />
      </div>
      <div>
        <label htmlFor="support-message" className="block text-sm font-medium mb-1">Cuéntanos qué pasa</label>
        <textarea id="support-message" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={SUPPORT_LIMITS.messageMax} rows={6}
          placeholder="Qué estabas haciendo, qué esperabas que pasara y qué pasó." className="w-full rounded-xl border border-brand-border px-3 py-2.5 text-[15px] bg-white" />
        <p className="text-xs text-brand-muted mt-1 text-right">{message.length}/{SUPPORT_LIMITS.messageMax}</p>
      </div>
      {error && <p role="alert" className="rounded-xl bg-rose-50 text-rose-800 text-sm px-4 py-2.5" id="support-form-error">{error}</p>}
      <button disabled={busy} className="w-full h-[52px] rounded-[14px] bg-brand-primary text-white font-semibold text-[16px] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60" id="support-submit">
        <Send size={17} aria-hidden="true" /> {busy ? "Enviando…" : "Enviar a soporte"}
      </button>
    </form>
  );
}

function Thread({ api, ticketId, onBack }: { api: SupportApi; ticketId: number; onBack: () => void }) {
  const [thread, setThread] = React.useState<TicketThread | null>(null);
  const [reply, setReply] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(async () => {
    try { setThread(await api.thread(ticketId)); } catch (e) { setError(supportErrorMessage(e)); }
  }, [api, ticketId]);

  React.useEffect(() => {
    load();
    const timer = window.setInterval(load, POLL_THREAD_MS);
    return () => window.clearInterval(timer);
  }, [load]);
  React.useEffect(() => { endRef.current?.scrollIntoView?.({ block: "end" }); }, [thread?.messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api.reply(ticketId, reply);
      setReply("");
      await load();
    } catch (err) {
      setError(supportErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!thread) return <p className="text-sm text-brand-muted">{error || "Cargando…"}</p>;
  const { ticket, messages } = thread;
  return (
    <div className="space-y-4" id="support-thread">
      <button onClick={onBack} className="text-sm text-brand-muted hover:text-brand-text inline-flex items-center gap-1 cursor-pointer" id="support-back"><ArrowLeft size={15} aria-hidden="true" /> Mis solicitudes</button>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{ticket.subject}</h1>
          <p className="text-xs text-brand-muted">{CATEGORY_LABEL[ticket.category]} · {timeAgo(ticket.createdAt)}</p>
        </div>
        <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 shrink-0 ${STATUS_TONE[ticket.status]}`}>{STATUS_LABEL[ticket.status]}</span>
      </div>

      <ul className="space-y-3" aria-label="Conversación">
        {messages.map((m) => (
          <li key={m.id} className={`flex ${m.isStaff ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] ${m.isStaff ? "bg-brand-bg border border-brand-border" : "bg-brand-primary text-white"}`}>
              <p className={`text-[11px] font-semibold mb-0.5 ${m.isStaff ? "text-brand-primary" : "text-white"}`}>{m.isStaff ? "Soporte Tiendly" : "Tú"}</p>
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p className={`text-[11px] mt-1 ${m.isStaff ? "text-brand-muted" : "text-white"}`}>{timeAgo(m.createdAt)}</p>
            </div>
          </li>
        ))}
      </ul>
      <div ref={endRef} />

      {ticket.status === "resuelto" && <p className="text-sm text-brand-muted rounded-xl bg-emerald-50 px-4 py-2.5">Marcamos esta solicitud como resuelta. Si necesitas algo más, escribe abajo y la reabrimos.</p>}
      {error && <p role="alert" className="rounded-xl bg-rose-50 text-rose-800 text-sm px-4 py-2.5">{error}</p>}
      <form onSubmit={send} className="flex gap-2 items-end">
        <label htmlFor="support-reply" className="sr-only">Escribe tu respuesta</label>
        <textarea id="support-reply" value={reply} onChange={(e) => setReply(e.target.value)} maxLength={SUPPORT_LIMITS.messageMax} rows={2}
          placeholder="Escribe tu respuesta…" className="flex-1 rounded-xl border border-brand-border px-3 py-2.5 text-[15px] bg-white" />
        <button disabled={busy || !reply.trim()} className="h-12 w-12 rounded-xl bg-brand-primary text-white flex items-center justify-center cursor-pointer disabled:opacity-50" aria-label="Enviar respuesta" id="support-send">
          <Send size={18} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
