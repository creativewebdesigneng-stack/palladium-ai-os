// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import type { Plugin } from "vite";

/**
 * The generated client retains a server-side process.env fallback. Vite
 * correctly erases that fallback from browser chunks, so published clients
 * must read the public values injected by the SSR shell instead. Keep this
 * transform narrowly scoped to the generated browser client; server clients
 * and every secret-bearing environment read remain untouched.
 */
function runtimeSupabasePublicConfigPlugin(): Plugin {
  return {
    name: "palladium-runtime-supabase-public-config",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.replaceAll("\\", "/").replace(/\?.*$/, "");
      if (!normalizedId.endsWith("/src/integrations/supabase/client.ts")) return null;

      const replacements = [
        [
          'process.env["SUPABASE_URL"]',
          'globalThis.__PALLADIUM_PUBLIC_CONFIG__?.SUPABASE_URL',
        ],
        [
          'process.env["SUPABASE_PUBLISHABLE_KEY"]',
          'globalThis.__PALLADIUM_PUBLIC_CONFIG__?.SUPABASE_PUBLISHABLE_KEY',
        ],
      ] as const;

      let transformed = code;
      for (const [source, replacement] of replacements) {
        transformed = transformed.replace(source, replacement);
      }

      if (transformed === code) {
        this.error("The generated Supabase client shape changed; runtime public config was not applied.");
      }
      return { code: transformed, map: null };
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    // @lovable.dev/mcp-js currently compares a slash-normalised Vite root with
    // Windows-native route paths and rejects the generated route directory. The
    // generated MCP routes are committed; keep generation enabled everywhere
    // except this local Windows path.
    plugins: [
      runtimeSupabasePublicConfigPlugin(),
      ...(process.platform === "win32" ? [] : [mcpPlugin()]),
    ],

    resolve: {
      alias: [
        {
          find: /^react-router-dom$/,
          replacement: fileURLToPath(new URL("./src/lib/router-compat.tsx", import.meta.url)),
        },
      ],
    },
  },
});
