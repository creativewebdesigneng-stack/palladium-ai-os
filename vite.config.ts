// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import { supabaseEnvPlugin } from "./vite-supabase-env-plugin";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins:
      process.platform === "win32"
        ? [
            // @lovable.dev/mcp-js currently compares a slash-normalised Vite
            // root with Windows-native route paths and rejects the generated
            // route directory. The generated MCP routes are committed; keep
            // generation enabled everywhere except this local Windows path.
            supabaseEnvPlugin(),
          ]
        : [supabaseEnvPlugin(), mcpPlugin()],

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
