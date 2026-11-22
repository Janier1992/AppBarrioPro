// ======================================================
// Archivo: src/admin/AccountsView.tsx
// Responsabilidad: Lista de cuentas del portal de soporte: cifras del tablero, filtros por estado, búsqueda y
//   acceso al panel de cada cuenta.
// ======================================================

import React from "react";
import { Search } from "lucide-react";
import { PLAN, paymentReference } from "../lib/pricing";
import { formatMoney } from "../lib/format";
import { STATE_LABEL, BLOCKED_STATES, accessEndsAt, computeKpis, daysUntil, type AdminAccount, type AdminApi } from "../lib/admin";
import type { SubscriptionState } from "../lib/subscription";
import AccountPanel from "./AccountPanel";

type Filter = "all" | "trial" | "active" | "expiring" | "blocked";

const TONE: Record<SubscriptionState, string> = {
  none: "bg-gray-100 text-gray-700",
  trial: "bg-sky-100 text-sky-800",
  trial_expired: "bg-rose-100 text-rose-800",
  active: "bg-emerald-100 text-emerald-800",
  past_due: "bg-rose-100 text-rose-800",
  suspended: "bg-rose-100 text-rose-800",
  cancelled: "bg-gray-200 text-gray-800",
};

export function StateBadge({ state }: { state: SubscriptionState }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[state]}`}>{STATE_LABEL[state]}</span>;
}

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : "—");

export default function AccountsView({ api }: { api: AdminApi }) {
  const [accounts, setAccounts] = React.useState<AdminAccount[] | null>(null);
  const [error, setError] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("all");
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setAccounts(await api.listAccounts());
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  }, [api]);
  React.useEffect(() => { load(); }, [load]);

  if (error) return <p role="alert" className="text-sm text-rose-700" id="accounts-error">{error}</p>;
  if (!accounts) return <p className="text-sm text-brand-muted">Cargando cuentas…</p>;

  const kpis = computeKpis(accounts, PLAN.priceCop);
  const expiring = (a: AdminAccount) => {
    const d = daysUntil(accessEndsAt(a));
    return (a.state === "active" || a.state === "trial") && d !== null && d <= 5;
  };
  const q = query.trim().toLowerCase();
  const shown = accounts
    .filter((a) =>
      filter === "all" ? true : filter === "blocked" ? BLOCKED_STATES.includes(a.state) : filter === "expiring" ? expiring(a) : a.state === filter)
    .filter((a) => !q || [a.businessName, a.email, a.phone, a.userId, paymentReference(a.userId)].some((v) => v?.toLowerCase().includes(q)));

  const cards: Array<[string, string | number, Filter | null]> = [
    ["Cuentas", kpis.total, "all"],
    ["En prueba", kpis.trial, "trial"],
    ["Activas", kpis.active, "active"],
    ["Por vencer (≤5 días)", kpis.expiringSoon, "expiring"],
    ["Bloqueadas", kpis.blocked, "blocked"],
    ["Ingreso mensual", formatMoney(kpis.monthlyRevenueCop), null],
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3" id="admin-kpis">
        {cards.map(([label, value, f]) => (
          <button
            key={label}
            disabled={!f}
            onClick={() => f && setFilter(f)}
            aria-pressed={f ? filter === f : undefined}
            className={`text-left rounded-2xl border bg-white p-4 ${f && filter === f ? "border-brand-text" : "border-brand-border"} ${f ? "cursor-pointer hover:bg-brand-bg" : "cursor-default"}`}
          >
            <span className="block text-xs text-brand-muted">{label}</span>
            <span className="block text-2xl font-semibold tabular-nums">{value}</span>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" aria-hidden="true" />
        <label htmlFor="admin-search" className="sr-only">Buscar cuenta</label>
        <input
          id="admin-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por negocio, correo, teléfono o referencia (TDLY-…)"
          className="w-full h-11 rounded-xl border border-brand-border bg-white pl-9 pr-3 text-sm"
        />
      </div>

      <div className="rounded-2xl border border-brand-border bg-white overflow-x-auto" id="accounts-table">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-brand-muted border-b border-brand-border">
              <th className="px-4 py-3 font-medium">Negocio</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Vence</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Último pago</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {shown.map((a) => {
              const end = accessEndsAt(a);
              const d = daysUntil(end);
              return (
                <tr key={a.userId} className="border-b border-brand-border last:border-0 hover:bg-brand-bg/60" data-account={a.userId}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{a.businessName || "Sin nombre"}</div>
                    <div className="text-xs text-brand-muted">{a.email || a.userId}</div>
                  </td>
                  <td className="px-4 py-3"><StateBadge state={a.state} /></td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {fmtDate(end)}
                    {d !== null && (a.state === "trial" || a.state === "active") && <span className="block text-xs text-brand-muted">{d <= 0 ? "hoy" : `en ${d} día${d === 1 ? "" : "s"}`}</span>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell whitespace-nowrap">{fmtDate(a.lastPaymentAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setSelected(a.userId)} className="h-9 px-3 rounded-xl border border-brand-border text-sm font-medium hover:bg-brand-bg cursor-pointer" aria-label={`Administrar ${a.businessName || a.userId}`}>
                      Administrar
                    </button>
                  </td>
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-brand-muted" id="accounts-empty">No hay cuentas con ese filtro.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <AccountPanel
          api={api}
          account={accounts.find((a) => a.userId === selected)!}
          onClose={() => setSelected(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
