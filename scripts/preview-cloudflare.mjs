// Nitro's cloudflare-module build writes .output/server/index.mjs.
// `vite preview` still loads dist/server/server.js, which this build does not emit.
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

const entry = ".output/server/index.mjs";
const assets = ".output/public";

if (!existsSync(entry) || !existsSync(assets)) {
  console.error(
    [
      "Cloudflare preview did not start.",
      "`vite preview` looks for dist/server/server.js.",
      "This build emits .output/server/index.mjs and static files in .output/public.",
      "Run `bun run build`, then `bun run preview`.",
    ].join("\n"),
  );
  process.exit(1);
}

const child = spawn(
  "bun",
  ["x", "wrangler", "dev", "--config", "wrangler.jsonc", "--local", "--port", "4173"],
  { stdio: "inherit" },
);
child.on("exit", (code) => process.exit(code ?? 1));
