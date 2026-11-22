/**
 * Cola de escrituras pendientes ("outbox").
 *
 * Tiendly guarda primero en el dispositivo y luego en el servidor. Si el servidor no responde
 * (sin señal, caída), antes la escritura se perdía en silencio y la siguiente carga remota
 * pisaba el dato local. Ahora cada escritura entra primero a esta cola (persistida en
 * localStorage) y solo sale cuando el servidor la confirma; se reintenta al recuperar conexión
 * y antes de cada lectura remota. El orden se conserva, y las altas usan "upsert" por id, por
 * lo que reintentar nunca duplica registros.
 */
import { insforge, isInsForgeConfigured, notifySubscribers } from "./insforge";

export type OutboxTable = "profile" | "products" | "sales" | "tasks" | "debts";

export type OutboxOp =
  | { id: string; table: OutboxTable; kind: "upsert"; data: Record<string, unknown> }
  | { id: string; table: OutboxTable; kind: "update"; rowId: string; data: Record<string, unknown> }
  | { id: string; table: OutboxTable; kind: "delete"; rowId: string };

type NewOp = OutboxOp extends infer T ? (T extends OutboxOp ? Omit<T, "id"> : never) : never;

const KEY_PREFIX = "tiendly_outbox_";
const key = (userId: string) => `${KEY_PREFIX}${userId}`;

export function loadOutbox(userId: string): OutboxOp[] {
  try {
    const raw = localStorage.getItem(key(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveOutbox(userId: string, ops: OutboxOp[]) {
  try {
    if (ops.length === 0) localStorage.removeItem(key(userId));
    else localStorage.setItem(key(userId), JSON.stringify(ops));
  } catch (e) {
    console.error("No se pudo guardar la cola de escrituras pendientes:", e);
  }
}

export function pendingCount(userId: string): number {
  return loadOutbox(userId).length;
}

let seq = 0;
const newOpId = () => `op_${Date.now().toString(36)}_${(seq++).toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

/** Errores del servidor que no se arreglan reintentando (datos rechazados): se descartan para no bloquear la cola. */
function isPermanent(error: unknown): boolean {
  const status = Number((error as any)?.status ?? (error as any)?.statusCode ?? 0);
  return status >= 400 && status < 500 && status !== 408 && status !== 429;
}

async function execute(userId: string, op: OutboxOp): Promise<void> {
  const table = insforge!.database.from(op.table);
  let result: { error: unknown };
  if (op.kind === "upsert") {
    result = await table.upsert({ ...op.data, userId });
  } else if (op.kind === "update") {
    result = await table.update(op.data).eq("id", op.rowId).eq("userId", userId);
  } else {
    result = await table.delete().eq("id", op.rowId).eq("userId", userId);
  }
  if (result?.error) throw result.error;
}

const running = new Map<string, Promise<void>>();

/** Envía en orden lo pendiente. Se detiene en el primer fallo temporal y conserva el resto. */
export async function flushOutbox(userId: string, options: { notify?: boolean } = {}): Promise<void> {
  const notify = options.notify ?? true;
  if (!isInsForgeConfigured()) return;
  const active = running.get(userId);
  if (active) {
    await active;
    if (loadOutbox(userId).length === 0) return;
  }
  const run = (async () => {
    let sent = 0;
    for (;;) {
      const queue = loadOutbox(userId);
      if (queue.length === 0) break;
      const op = queue[0];
      try {
        await execute(userId, op);
      } catch (e) {
        if (isPermanent(e)) {
          console.error("Escritura rechazada por el servidor; se descarta de la cola:", op.table, op.kind, e);
        } else {
          console.warn("Escritura pendiente: se reintentará al recuperar conexión.", e);
          break;
        }
      }
      saveOutbox(userId, loadOutbox(userId).filter((o) => o.id !== op.id));
      sent++;
    }
    if (sent > 0 && notify) notifySubscribers();
  })().finally(() => running.delete(userId));
  running.set(userId, run);
  await run;
}

/** Registra una escritura remota y la envía; si falla queda pendiente en vez de perderse. */
export async function writeRemote(userId: string, op: NewOp): Promise<void> {
  if (!isInsForgeConfigured()) return;
  saveOutbox(userId, [...loadOutbox(userId), { ...op, id: newOpId() } as OutboxOp]);
  // Quien llama (db) avisa a la app al terminar; aquí no se notifica dos veces.
  await flushOutbox(userId, { notify: false });
}

/** Reintenta todo lo pendiente de cualquier usuario guardado en este dispositivo. */
export function flushAllOutboxes(): void {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(KEY_PREFIX)) void flushOutbox(k.slice(KEY_PREFIX.length));
    }
  } catch {
    /* sin localStorage: nada que reintentar */
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", flushAllOutboxes);
  window.addEventListener("focus", flushAllOutboxes);
}
