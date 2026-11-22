// ======================================================
// Archivo: src/admin/AccountPanel.tsx
// Responsabilidad: Panel lateral de una cuenta en el portal de soporte: registrar pagos,
//   suspender/reactivar/cancelar, extender la prueba, restablecer el PIN, nota interna y resumen de
//   su negocio.
// ======================================================

import React from "react";
import { X } from "lucide-react";
import { PLAN, paymentReference } from "../lib/pricing";
import { formatMoney } from "../lib/format";
import { accessEndsAt, type AdminAccount, type AdminApi, type AdminSummary } from "../lib/admin";
import { StateBadge } from "./AccountsView";
import { mensajeDeErrorOPor } from "../lib/errors";

const METHODS = ["Efectivo", "Nequi", "Daviplata", "Transferencia", "PSE / Wompi", "Otro"];
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }) : "—");

type Confirm = null | "suspend" | "cancel" | "clearPin";

/** Panel de una cuenta: estado, pago, suspensión/reactivación, prueba, PIN y resumen de su negocio. */
export default function AccountPanel({ api, account, onClose, onChanged }: { api: AdminApi; account: AdminAccount; onClose: () => void; onChanged: () => Promise<void> }) {
  const [summary, setSummary] = React.useState<AdminSummary | null>(null);
  const [message, setMessage] = React.useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [months, setMonths] = React.useState(1);
  const [amount, setAmount] = React.useState<number>(PLAN.priceCop);
  const [method, setMethod] = React.useState(METHODS[0]);
  const [reference, setReference] = React.useState("");
  const [note, setNote] = React.useState(account.note ?? "");
  const [confirm, setConfirm] = React.useState<Confirm>(null);

  const reload = React.useCallback(async () => {
    setSummary(await api.summary(account.userId));
    await onChanged();
  }, [api, account.userId, onChanged]);
  React.useEffect(() => { api.summary(account.userId).then(setSummary).catch((e) => setMessage({ kind: "error", text: mensajeDeErrorOPor(e, "Ocurrió un error inesperado.") })); }, [api, account.userId]);
  React.useEffect(() => setAmount(PLAN.priceCop * months), [months]);

  const run = async (okText: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      await reload();
      setMessage({ kind: "ok", text: okText });
    } catch (e) {
      setMessage({ kind: "error", text: mensajeDeErrorOPor(e, "Ocurrió un error inesperado.") });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const blocked = account.state !== "active" && account.state !== "trial";
  const btn = "h-10 px-4 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" role="dialog" aria-modal="true" aria-label={`Cuenta ${account.businessName ?? ""}`} id="account-panel">
      <div className="w-full max-w-lg h-full overflow-y-auto bg-white p-6 space-y-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{account.businessName || "Sin nombre"}</h2>
            <p className="text-sm text-brand-muted">{account.email || account.userId}</p>
            <p className="text-xs text-brand-muted">Referencia de pago: <strong id="account-reference" className="tracking-wider text-brand-text">{paymentReference(account.userId)}</strong></p>
            <div className="mt-2 flex items-center gap-2"><StateBadge state={account.state} /><span className="text-sm text-brand-muted">hasta {fmt(accessEndsAt(account))}</span></div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="h-9 w-9 rounded-xl hover:bg-brand-bg flex items-center justify-center cursor-pointer" id="account-close"><X size={18} /></button>
        </div>

        {message && (
          <p role={message.kind === "error" ? "alert" : "status"} id="account-message" className={`rounded-xl px-4 py-2.5 text-sm ${message.kind === "ok" ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-800"}`}>
            {message.text}
          </p>
        )}

        <section className="space-y-3" aria-labelledby="pay-title">
          <h3 id="pay-title" className="font-semibold">Registrar pago</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pay-months" className="block text-xs text-brand-muted mb-1">Meses</label>
              <select id="pay-months" value={months} onChange={(e) => setMonths(Number(e.target.value))} className="w-full h-10 rounded-xl border border-brand-border px-3 text-sm bg-white">
                {[1, 2, 3, 6, 12].map((m) => <option key={m} value={m}>{m} {m === 1 ? "mes" : "meses"}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="pay-amount" className="block text-xs text-brand-muted mb-1">Monto (COP)</label>
              <input id="pay-amount" type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full h-10 rounded-xl border border-brand-border px-3 text-sm bg-white" />
            </div>
            <div>
              <label htmlFor="pay-method" className="block text-xs text-brand-muted mb-1">Medio de pago</label>
              <select id="pay-method" value={method} onChange={(e) => setMethod(e.target.value)} className="w-full h-10 rounded-xl border border-brand-border px-3 text-sm bg-white">
                {METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="pay-ref" className="block text-xs text-brand-muted mb-1">Referencia (opcional)</label>
              <input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} className="w-full h-10 rounded-xl border border-brand-border px-3 text-sm bg-white" />
            </div>
          </div>
          <button
            disabled={busy || !(amount > 0)}
            onClick={() => run(`Pago de ${formatMoney(amount)} registrado. La cuenta quedó activa.`, () => api.registerPayment(account.userId, amount, method, reference, months))}
            className={`${btn} w-full bg-brand-primary text-white`}
            id="pay-submit"
          >
            Registrar pago y activar
          </button>
        </section>

        <section className="space-y-3" aria-labelledby="ctl-title">
          <h3 id="ctl-title" className="font-semibold">Control de la cuenta</h3>
          {confirm ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 space-y-2" id="account-confirm">
              <p className="text-sm text-rose-900">
                {confirm === "suspend" && "La cuenta quedará bloqueada de inmediato: el cliente no podrá usar su negocio hasta que la reactives."}
                {confirm === "cancel" && "Se cancelará la suscripción: el cliente perderá el acceso."}
                {confirm === "clearPin" && "Se quitará el PIN de bloqueo del cliente (por ejemplo, si lo olvidó)."}
              </p>
              <div className="flex gap-2">
                <button disabled={busy} className={`${btn} bg-rose-700 text-white`} id="confirm-yes" onClick={() =>
                  confirm === "clearPin"
                    ? run("PIN restablecido.", () => api.clearPin(account.userId))
                    : run(confirm === "suspend" ? "Cuenta suspendida." : "Suscripción cancelada.", () => api.setStatus(account.userId, confirm, note))}>
                  Sí, confirmar
                </button>
                <button className={`${btn} border border-brand-border`} onClick={() => setConfirm(null)}>No</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {blocked ? (
                <button disabled={busy} className={`${btn} border border-brand-border`} id="act-resume" onClick={() => run("Cuenta reactivada.", () => api.setStatus(account.userId, "resume"))}>Reactivar</button>
              ) : (
                <button disabled={busy} className={`${btn} border border-rose-300 text-rose-800`} id="act-suspend" onClick={() => setConfirm("suspend")}>Suspender</button>
              )}
              {account.state !== "cancelled" && <button disabled={busy} className={`${btn} border border-brand-border`} id="act-cancel" onClick={() => setConfirm("cancel")}>Cancelar suscripción</button>}
              {account.status === "trial" && [3, 7, 14].map((d) => (
                <button key={d} disabled={busy} className={`${btn} border border-brand-border`} id={`act-trial-${d}`} onClick={() => run(`Prueba extendida ${d} días.`, () => api.extendTrial(account.userId, d))}>+{d} días de prueba</button>
              ))}
              <button disabled={busy} className={`${btn} border border-brand-border`} id="act-pin" onClick={() => setConfirm("clearPin")}>Restablecer PIN</button>
            </div>
          )}
        </section>

        <section className="space-y-2" aria-labelledby="note-title">
          <h3 id="note-title" className="font-semibold">Nota interna</h3>
          <label htmlFor="acc-note" className="sr-only">Nota interna</label>
          <textarea id="acc-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm bg-white" />
          <button disabled={busy} className={`${btn} border border-brand-border`} onClick={() => run("Nota guardada.", () => api.setNote(account.userId, note))}>Guardar nota</button>
        </section>

        <section className="space-y-3" aria-labelledby="sum-title" id="account-summary">
          <h3 id="sum-title" className="font-semibold">Resumen del negocio</h3>
          {!summary ? <p className="text-sm text-brand-muted">Cargando…</p> : (
            <>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {([
                  ["Productos", `${summary.products.total} (${summary.products.lowStock} por agotarse)`],
                  ["Ventas últimos 30 días", `${summary.sales.last30Days} · ${formatMoney(summary.sales.last30DaysAmount)}`],
                  ["Fiados abiertos", `${summary.debts.open} · ${formatMoney(summary.debts.openAmount)}`],
                  ["Tareas pendientes", String(summary.tasks.pending)],
                  ["Última venta", fmt(summary.sales.lastSaleAt)],
                  ["PIN configurado", summary.profile?.hasPin ? "Sí" : "No"],
                ] as const).map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-brand-bg p-3"><dt className="text-xs text-brand-muted">{k}</dt><dd className="font-medium">{v}</dd></div>
                ))}
              </dl>
              <div>
                <h4 className="text-sm font-medium mb-1">Pagos recientes</h4>
                {summary.payments.length === 0 ? <p className="text-sm text-brand-muted">Sin pagos registrados.</p> : (
                  <ul className="text-sm divide-y divide-brand-border">
                    {summary.payments.map((p, i) => (
                      <li key={i} className="py-2 flex justify-between gap-2">
                        <span>{formatMoney(p.amountCop)} · {p.method ?? "—"}{p.reference ? ` · ${p.reference}` : ""}</span>
                        <span className="text-brand-muted">{p.months} {p.months === 1 ? "mes" : "meses"} · hasta {fmt(p.periodEnd)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
