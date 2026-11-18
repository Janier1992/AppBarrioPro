import { describe, expect, it } from "vitest";
import insforgeConfig from "../../insforge-applet-config.json";
import { INSFORGE_DEFAULT_ANON_KEY, INSFORGE_DEFAULT_BASE_URL } from "./publicConfig";

describe("publicConfig", () => {
  it("coincide con insforge-applet-config.json (usado por el frontend)", () => {
    expect(INSFORGE_DEFAULT_BASE_URL).toBe(insforgeConfig.baseUrl);
    expect(INSFORGE_DEFAULT_ANON_KEY).toBe(insforgeConfig.anonKey);
  });
});
