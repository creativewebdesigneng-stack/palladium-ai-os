import { describe, expect, it } from "vitest";
import { publicRuntimeConfigScript, readPublicRuntimeConfig } from "../public-config";

describe("public runtime config", () => {
  it("prefers VITE_ values and falls back to unprefixed server values", () => {
    expect(
      readPublicRuntimeConfig({
        VITE_SUPABASE_URL: "https://vite.example",
        SUPABASE_URL: "https://server.example",
        SUPABASE_PUBLISHABLE_KEY: "sb_publishable_abc",
      }),
    ).toEqual({
      SUPABASE_URL: "https://vite.example",
      SUPABASE_PUBLISHABLE_KEY: "sb_publishable_abc",
    });
  });

  it("never leaks secret or service-role values", () => {
    const script = publicRuntimeConfigScript(
      readPublicRuntimeConfig({
        SUPABASE_URL: "https://server.example",
        SUPABASE_PUBLISHABLE_KEY: "sb_publishable_abc",
        SUPABASE_SERVICE_ROLE_KEY: "sb_secret_should_not_appear",
        STRIPE_SECRET_KEY: "sk_live_nope",
      }),
    );
    expect(script).toContain("sb_publishable_abc");
    expect(script).not.toContain("sb_secret_should_not_appear");
    expect(script).not.toContain("sk_live_nope");
  });

  it("produces a deterministic, escaped bootstrap script", () => {
    const config = { SUPABASE_URL: "https://x.example</script>" };
    const script = publicRuntimeConfigScript(config);
    expect(script).toBe(publicRuntimeConfigScript(config));
    expect(script).not.toContain("</script>");
    expect(script).toContain("globalThis.process.env=Object.assign(");
  });

  it("returns an empty config when nothing is configured", () => {
    expect(readPublicRuntimeConfig({})).toEqual({});
  });
});
