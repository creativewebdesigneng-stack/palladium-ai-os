// Nitro's cloudflare-module build writes .output/server/index.mjs and a
// Wrangler config next to it. `vite preview` still loads dist/server/server.js,
// which this build does not emit.
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

const entry = ".output/server/index.mjs";
const config = ".output/server/wrangler.json";
const assets = ".output/public";

if (!existsSync(entry) || !existsSync(config) || !existsSync(assets)) {
  console.error(
    [
      "Cloudflare preview did not start.",
      "`vite preview` looks for dist/server/server.js.",
      "This build emits .output/server/index.mjs and .output/server/wrangler.json.",
      "Run `bun run build`, then `bun run preview`.",
    ].join("\n"),
  );
  process.exit(1);
}

const child = spawn(
  "bun",
  ["x", "wrangler", "dev", "--config", "wrangler.json", "--local", "--port", "4173"],
  { cwd: ".output/server", stdio: "inherit" },
);
child.on("exit", (code) => process.exit(code ?? 1));
