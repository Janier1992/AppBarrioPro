import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { isRateLimited } from "./rateLimit";

describe("isRateLimited", () => {
  it("permite peticiones dentro del límite", () => {
    const key = `test-${Math.random()}`;
    expect(isRateLimited(key, 3, 60_000)).toBe(false);
    expect(isRateLimited(key, 3, 60_000)).toBe(false);
    expect(isRateLimited(key, 3, 60_000)).toBe(false);
  });

  it("bloquea una vez superado el límite", () => {
    const key = `test-${Math.random()}`;
    isRateLimited(key, 2, 60_000);
    isRateLimited(key, 2, 60_000);
    expect(isRateLimited(key, 2, 60_000)).toBe(true);
  });

  it("usa contadores independientes por clave", () => {
    const keyA = `a-${Math.random()}`;
    const keyB = `b-${Math.random()}`;
    isRateLimited(keyA, 1, 60_000);
    expect(isRateLimited(keyA, 1, 60_000)).toBe(true);
    expect(isRateLimited(keyB, 1, 60_000)).toBe(false);
  });
});

import { checkRateLimit, clientIp, getRedisConfig } from "./rateLimit";

describe("limitador compartido (Redis)", () => {
  const ENV_KEYS = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_URL", "KV_REST_API_TOKEN"];
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => { for (const k of ENV_KEYS) { saved[k] = process.env[k]; delete process.env[k]; } });
  afterEach(() => { for (const k of ENV_KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } vi.unstubAllGlobals(); });

  it("sin variables usa el contador en memoria", async () => {
    const key = `mem-${Math.random()}`;
    expect(await checkRateLimit(key, 1, 60_000)).toBe(false);
    expect(await checkRateLimit(key, 1, 60_000)).toBe(true);
  });

  it("detecta Upstash y las variables KV_REST de Vercel", () => {
    expect(getRedisConfig({})).toBeNull();
    expect(getRedisConfig({ UPSTASH_REDIS_REST_URL: "https://x.io/", UPSTASH_REDIS_REST_TOKEN: "t" })).toEqual({ url: "https://x.io", token: "t" });
    expect(getRedisConfig({ KV_REST_API_URL: "https://y.io", KV_REST_API_TOKEN: "k" })?.url).toBe("https://y.io");
  });

  it("con Redis usa el contador compartido (INCR + PEXPIRE NX) y bloquea al superar el límite", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.test";
    process.env.UPSTASH_REDIS_REST_TOKEN = "tok";
    let n = 0;
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => [{ result: ++n }, { result: 1 }] }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await checkRateLimit("u1", 2, 60_000)).toBe(false);
    expect(await checkRateLimit("u1", 2, 60_000)).toBe(false);
    expect(await checkRateLimit("u1", 2, 60_000)).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as any;
    expect(url).toBe("https://redis.test/pipeline");
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(init.body)).toEqual([["INCR", "rl:u1"], ["PEXPIRE", "rl:u1", "60000", "NX"]]);
  });

  it("si Redis falla, cae al contador en memoria (no deja sin servicio ni se salta el límite local)", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.test";
    process.env.UPSTASH_REDIS_REST_TOKEN = "tok";
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("red caída"); }));
    const key = `fallo-${Math.random()}`;
    expect(await checkRateLimit(key, 1, 60_000)).toBe(false);
    expect(await checkRateLimit(key, 1, 60_000)).toBe(true);
  });

  it("clientIp solo confía en x-forwarded-for tras un proxy de confianza", () => {
    const req = { headers: { "x-forwarded-for": "9.9.9.9, 1.1.1.1" }, socket: { remoteAddress: "10.0.0.5" } };
    expect(clientIp(req, {})).toBe("10.0.0.5");
    expect(clientIp(req, { VERCEL: "1" })).toBe("9.9.9.9");
    expect(clientIp(req, { TRUST_PROXY: "true" })).toBe("9.9.9.9");
  });
});
