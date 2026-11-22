import { describe, expect, it } from "vitest";
import { timeAgo } from "./relativeTime";

const NOW = new Date("2026-12-01T12:00:00Z").getTime();
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe("timeAgo", () => {
  it("expresa el tiempo transcurrido en español", () => {
    expect(timeAgo(ago(20_000), NOW)).toBe("ahora");
    expect(timeAgo(ago(5 * 60_000), NOW)).toBe("hace 5 min");
    expect(timeAgo(ago(3 * 3600_000), NOW)).toBe("hace 3 h");
    expect(timeAgo(ago(26 * 3600_000), NOW)).toBe("ayer");
    expect(timeAgo(ago(5 * 86400_000), NOW)).toBe("hace 5 días");
  });
  it("tolera vacíos y fechas inválidas", () => {
    expect(timeAgo(null)).toBe("");
    expect(timeAgo("no-es-fecha")).toBe("");
  });
});
