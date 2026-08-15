/**
 * Runtime-safe public configuration bridge.
 *
 * Lovable Cloud exposes the managed Supabase connection to the server runtime
 * as environment variables (`SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY`, plus
 * the `VITE_`-prefixed equivalents in local development). A published browser
 * bundle is built once and must not depend on those values being inlined at
 * build time.
 *
 * The SSR shell therefore serialises ONLY the public values (project URL,
 * publishable key, project id) into an inline bootstrap script that runs before
 * the app bundle. The generated Supabase client already falls back to
 * `process.env` reads, so populating `globalThis.process.env` at runtime keeps
 * that file untouched and preserves its auth/session behaviour.
 *
 * Service-role / secret values are never read here and never leave the server.
 */
export type PublicRuntimeConfig = {
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_PROJECT_ID?: string;
};

const PUBLIC_KEYS = [
  ["SUPABASE_URL", "VITE_SUPABASE_URL"],
  ["SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY"],
  ["SUPABASE_PROJECT_ID", "VITE_SUPABASE_PROJECT_ID"],
] as const;

function envRecord(): Record<string, string | undefined> {
  const fromProcess =
    typeof process !== "undefined" && process.env
      ? (process.env as Record<string, string | undefined>)
      : {};
  let fromMeta: Record<string, string | undefined> = {};
  try {
    fromMeta = (import.meta.env ?? {}) as unknown as Record<string, string | undefined>;
  } catch {
    fromMeta = {};
  }
  return { ...fromProcess, ...stripUndefined(fromMeta) };
}

function stripUndefined(source: Record<string, string | undefined>) {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "string" && value.length > 0) out[key] = value;
  }
  return out;
}

/** Reads the public Supabase values from whichever runtime env is available. */
export function readPublicRuntimeConfig(
  env: Record<string, string | undefined> = envRecord(),
): PublicRuntimeConfig {
  const config: PublicRuntimeConfig = {};
  for (const [key, viteKey] of PUBLIC_KEYS) {
    const value = env[viteKey] || env[key];
    if (typeof value === "string" && value.length > 0) config[key] = value;
  }
  return config;
}

/**
 * Inline bootstrap script contents. Deterministic for a given config so the
 * SSR markup and the hydrated markup match.
 */
export function publicRuntimeConfigScript(config: PublicRuntimeConfig): string {
  const json = JSON.stringify(config).replace(/</g, "\\u003c");
  return [
    `globalThis.__PALLADIUM_PUBLIC_CONFIG__=${json};`,
    `globalThis.process=globalThis.process||{};`,
    `globalThis.process.env=Object.assign({},globalThis.process.env,${json});`,
  ].join("");
}
