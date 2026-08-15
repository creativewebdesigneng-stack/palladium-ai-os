import type { Plugin } from "vite";

/**
 * Lovable Cloud exposes the managed Supabase connection as real process
 * environment variables (VITE_SUPABASE_* for the browser, SUPABASE_* for the
 * server). Vite's own env handling only reads `.env` files, and `.env` is
 * git-ignored, so a production/published build gets no browser values and the
 * generated Supabase client throws "Missing Supabase environment variable(s)".
 *
 * This plugin closes that gap without hardcoding anything:
 *  - it injects the publishable browser values as static `define` replacements,
 *    read from process.env at build time (VITE_* first, unprefixed publishable
 *    values as fallback);
 *  - it rewrites `import.meta.env["VITE_X"]` to `import.meta.env.VITE_X` so
 *    bracket reads are statically replaced like dotted ones.
 *
 * Only publishable values are ever inlined; service-role/secret values are
 * never touched.
 */
const BROWSER_KEYS = [
  ["VITE_SUPABASE_URL", "SUPABASE_URL"],
  ["VITE_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_PUBLISHABLE_KEY"],
  ["VITE_SUPABASE_PROJECT_ID", "SUPABASE_PROJECT_ID"],
] as const;

export function supabaseEnvPlugin(): Plugin {
  return {
    name: "palladium-supabase-env",
    enforce: "pre",
    config() {
      const define: Record<string, string> = {};
      for (const [viteKey, fallbackKey] of BROWSER_KEYS) {
        const value = process.env[viteKey] || process.env[fallbackKey];
        if (value) define[`import.meta.env.${viteKey}`] = JSON.stringify(value);
      }
      return { define };
    },
    transform(code, id) {
      if (id.includes("node_modules") || !code.includes("import.meta.env[")) return null;
      const next = code.replace(
        /import\.meta\.env\[\s*(["'])(VITE_[A-Za-z0-9_]+)\1\s*\]/g,
        (_match, _quote, key: string) => `import.meta.env.${key}`,
      );
      return next === code ? null : { code: next, map: null };
    },
  };
}
