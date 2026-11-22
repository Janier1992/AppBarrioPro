/** "hace 5 min", "hace 2 h", "ayer"… para listas de mensajes. */
export function timeAgo(iso: string | null | undefined, now: number = Date.now()): string {
  const t = iso ? new Date(iso).getTime() : NaN;
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return "ahora";
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return "ayer";
  if (d < 30) return `hace ${d} días`;
  return new Date(t).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}
