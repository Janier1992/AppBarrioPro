import React from "react";
import { ACTION_LABEL, type AdminApi, type AuditEntry } from "../lib/admin";

/** Quién hizo qué desde el portal (pagos, suspensiones, etc.). Solo lectura. */
export default function AuditView({ api }: { api: AdminApi }) {
  const [entries, setEntries] = React.useState<AuditEntry[] | null>(null);
  const [error, setError] = React.useState("");
  React.useEffect(() => {
    api.auditLog(200).then(setEntries).catch((e) => setError(e.message));
  }, [api]);

  if (error) return <p role="alert" className="text-rose-700 text-sm">{error}</p>;
  if (!entries) return <p className="text-sm text-brand-muted">Cargando…</p>;
  if (entries.length === 0) return <p className="text-sm text-brand-muted" id="audit-empty">Aún no hay acciones registradas.</p>;
  return (
    <div className="rounded-2xl border border-brand-border bg-white overflow-hidden" id="audit-list">
      <ul className="divide-y divide-brand-border">
        {entries.map((e) => (
          <li key={e.id} className="px-4 py-3 text-sm flex flex-wrap justify-between gap-x-4 gap-y-1">
            <span>
              <strong>{ACTION_LABEL[e.action] ?? e.action}</strong>
              {e.targetBusiness ? <> · {e.targetBusiness}</> : e.targetUserId ? <> · {e.targetUserId}</> : null}
              {typeof e.details?.amount === "number" && <> · ${Number(e.details.amount).toLocaleString("es-CO")}</>}
            </span>
            <span className="text-brand-muted">{e.admin} · {new Date(e.createdAt).toLocaleString("es-CO")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
