// ======================================================
// Archivo: api/_lib/rateLimit.ts
// Responsabilidad: Limitar la tasa de peticiones por usuario autenticado
// Observaciones: Dos modos.
//   - Compartido (Upstash Redis vía REST): si existen UPSTASH_REDIS_REST_URL y
//     UPSTASH_REDIS_REST_TOKEN (o KV_REST_API_URL / KV_REST_API_TOKEN, que inyecta
//     la integración de Vercel), el contador vive en Redis y vale para TODAS las
//     instancias serverless: el límite es real.
//   - En memoria: sin esas variables (o si Redis no responde) se usa un contador
//     por proceso. En Vercel cada instancia tiene el suyo, así que es una
//     mitigación best-effort. Si Redis falla se "abre" (se permite) para no
//     dejar sin servicio a los usuarios; el límite en memoria sigue activo.
// ======================================================

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  bucket.count += 1;
  if (bucket.count > limit) return true;
  return false;
}

// Limpieza periódica para no acumular memoria indefinidamente en procesos de larga duración (server.ts)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now >= bucket.resetAt) buckets.delete(key);
    }
  }, 60_000).unref?.();
}

// ----------------------------------------------------------------------------
// Limitador compartido (Upstash Redis, REST) con respaldo en memoria
// ----------------------------------------------------------------------------

interface RedisConfig {
  url: string;
  token: string;
}

export function getRedisConfig(env: Record<string, string | undefined> = process.env): RedisConfig | null {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token };
}

const REDIS_TIMEOUT_MS = 1500;

/** Incrementa un contador de ventana fija en Redis y devuelve su valor, o null si no se pudo. */
async function redisIncrement(config: RedisConfig, key: string, windowMs: number): Promise<number | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REDIS_TIMEOUT_MS);
  try {
    const response = await fetch(`${config.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
      // PEXPIRE ... NX: solo fija la caducidad la primera vez, así la ventana no se renueva con cada petición.
      body: JSON.stringify([
        ["INCR", key],
        ["PEXPIRE", key, String(windowMs), "NX"],
      ]),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const data = (await response.json()) as Array<{ result?: unknown; error?: string }>;
    const count = Number(data?.[0]?.result);
    return Number.isFinite(count) ? count : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * ¿Se superó el límite? Usa Redis compartido si está configurado; si no, o si falla,
 * el contador en memoria del proceso.
 */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const config = getRedisConfig();
  if (config) {
    const count = await redisIncrement(config, `rl:${key}`, windowMs);
    if (count !== null) return count > limit;
    console.warn("[rateLimit] Redis no disponible; se usa el límite en memoria.");
  }
  return isRateLimited(key, limit, windowMs);
}

/**
 * IP del cliente. x-forwarded-for solo se respeta tras un proxy de confianza (Vercel, o
 * TRUST_PROXY=true): si no, cualquiera podría falsearlo para esquivar el límite.
 */
export function clientIp(
  req: { headers?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } },
  env: Record<string, string | undefined> = process.env
): string {
  const trusted = Boolean(env.VERCEL) || env.TRUST_PROXY === "true";
  const forwarded = trusted ? req.headers?.["x-forwarded-for"] : undefined;
  const first = (Array.isArray(forwarded) ? forwarded[0] : String(forwarded ?? "")).split(",")[0].trim();
  return first || req.socket?.remoteAddress || "desconocida";
}

/** Límite por IP, previo a la autenticación: frena el abuso de peticiones sin sesión. */
const IP_LIMIT = 60;
const IP_WINDOW_MS = 60_000;
export function isIpRateLimited(req: Parameters<typeof clientIp>[0]): Promise<boolean> {
  return checkRateLimit(`ip:${clientIp(req)}`, IP_LIMIT, IP_WINDOW_MS);
}
