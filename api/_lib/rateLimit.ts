// ======================================================
// Archivo: api/_lib/rateLimit.ts
// Responsabilidad: Limitar la tasa de peticiones por usuario autenticado
// Observaciones: Limitador en memoria del proceso. En Vercel (serverless)
//                cada instancia fría tiene su propio contador, por lo que
//                esto es una mitigación best-effort, no una garantía dura.
//                Para un límite estricto entre instancias se requiere un
//                almacén compartido (p.ej. Upstash Redis) — ver plan de Fase 3.
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
