import { describe, it, expect } from "vitest";
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
