/**
 * Signed-out route smoke for Blackstar.
 *
 * No extra dependencies. Uses Node's fetch. Does not log in, call providers,
 * or send cookies.
 *
 * Static mode (always on) checks that every manifest path still has its route
 * file. HTTP mode renders those routes against a local server.
 *
 *   node e2e/signed-out-route-smoke.mjs --static
 *   BLACKSTAR_SMOKE_BASE_URL=http://127.0.0.1:5173 node e2e/signed-out-route-smoke.mjs
 *
 * `vite preview` on this repo currently expects dist/server/server.js, while
 * `bun run build` emits a Cloudflare Nitro worker under .output. Point this
 * script at `bun run dev` (or a wrangler preview) instead of production.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  readFileSync(new URL("./route-manifest.json", import.meta.url), "utf8"),
);
const staticOnly = process.argv.includes("--static");
const baseUrl = (process.env.BLACKSTAR_SMOKE_BASE_URL || "http://127.0.0.1:5173").replace(
  /\/$/,
  "",
);

const secretMarkers = [
  "service_role",
  "SUPABASE_SECRET",
  "sk_live_",
  "BEGIN PRIVATE KEY",
  "BEGIN RSA PRIVATE KEY",
];

const failures = [];

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function fail(message) {
  failures.push(message);
  console.error(`FAIL ${message}`);
}

function assertRouteFile(entry) {
  try {
    readFileSync(join(root, entry.file), "utf8");
  } catch {
    fail(`${entry.path}: missing route file ${entry.file}`);
  }
}

for (const entry of [
  ...manifest.signedOutPublic,
  ...(manifest.signedOutRedirects ?? []),
  ...manifest.signedOutAuth,
  ...manifest.protectedShells,
  ...(manifest.signedOutAssets ?? []),
]) {
  assertRouteFile(entry);
}

if (staticOnly) {
  if (failures.length) {
    console.error(`\nStatic route smoke failed: ${failures.length}`);
    process.exit(1);
  }
  const total =
    manifest.signedOutPublic.length +
    (manifest.signedOutRedirects ?? []).length +
    manifest.signedOutAuth.length +
    manifest.protectedShells.length +
    (manifest.signedOutAssets ?? []).length;
  console.log(`Static route smoke passed: ${total} route files present.`);
  process.exit(0);
}

async function render(entry, kind) {
  const url = `${baseUrl}${entry.path}`;
  let response;
  try {
    response = await fetch(url, {
      redirect: "follow",
      headers: {
        accept: "text/html",
        "user-agent": "blackstar-signed-out-smoke/1.0",
      },
      signal: AbortSignal.timeout(20000),
    });
  } catch (error) {
    fail(
      `${entry.path}: request failed (${error instanceof Error ? error.message : String(error)})`,
    );
    return;
  }

  const body = await response.text();
  const decoded = decodeHtml(body);
  const title =
    decoded
      .match(/<title>([^<]*)<\/title>/i)?.[1]
      ?.replace(/\s+/g, " ")
      .trim() ?? "";
  const noindex = /noindex/i.test(body);
  console.log(
    `${response.status} ${kind} ${entry.path} title=${JSON.stringify(title)} noindex=${noindex}`,
  );

  if (response.status !== 200) {
    fail(`${entry.path}: expected HTTP 200, received ${response.status}`);
    return;
  }
  if (!decoded.includes("Blackstar") || !decoded.includes(entry.marker)) {
    fail(`${entry.path}: rendered document is missing ${JSON.stringify(entry.marker)}`);
  }
  if (kind === "public" && !entry.allowNoindex && noindex) {
    fail(`${entry.path}: public page is marked noindex`);
  }
  if (kind === "redirect" && !response.url.endsWith(entry.redirectTo)) {
    fail(`${entry.path}: expected redirect to ${entry.redirectTo}, received ${response.url}`);
  }
  if (kind === "redirect" && entry.allowNoindex && !noindex) {
    fail(`${entry.path}: redirect target should remain noindex while it is an authenticated shell`);
  }
  if (kind === "protected" && !noindex) {
    fail(`${entry.path}: signed-out protected shell is missing the noindex robots tag`);
  }
  for (const secret of secretMarkers) {
    if (body.includes(secret)) {
      fail(`${entry.path}: rendered document contains ${secret}`);
    }
  }
}

async function renderAsset(entry) {
  const url = `${baseUrl}${entry.path}`;
  let response;
  try {
    response = await fetch(url, {
      headers: { accept: "application/xml,text/xml,*/*", "user-agent": "blackstar-signed-out-smoke/1.0" },
      signal: AbortSignal.timeout(20000),
    });
  } catch (error) {
    fail(`${entry.path}: request failed (${error instanceof Error ? error.message : String(error)})`);
    return;
  }
  const body = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  console.log(`${response.status} asset ${entry.path} content-type=${JSON.stringify(contentType)}`);
  if (response.status !== 200) fail(`${entry.path}: expected HTTP 200, received ${response.status}`);
  if (entry.contentType === "xml" && !contentType.toLowerCase().includes("xml")) {
    fail(`${entry.path}: expected an XML content type, received ${contentType || "none"}`);
  }
  if (!body.includes(entry.marker)) fail(`${entry.path}: missing expected marker ${JSON.stringify(entry.marker)}`);
  if (!body.includes("<urlset")) fail(`${entry.path}: missing sitemap urlset root`);
  for (const secret of secretMarkers) if (body.includes(secret)) fail(`${entry.path}: rendered asset contains ${secret}`);
}

for (const entry of manifest.signedOutPublic) {
  await render(entry, "public");
}
for (const entry of manifest.signedOutRedirects ?? []) {
  await render(entry, "redirect");
}
for (const entry of manifest.signedOutAuth) {
  await render(entry, "auth");
}
for (const entry of manifest.protectedShells) {
  await render(entry, "protected");
}
for (const entry of manifest.signedOutAssets ?? []) {
  await renderAsset(entry);
}

if (failures.length) {
  console.error(`\nSigned-out route smoke failed: ${failures.length} at ${baseUrl}`);
  process.exit(1);
}

const total =
  manifest.signedOutPublic.length + manifest.signedOutAuth.length + manifest.protectedShells.length;
console.log(`\nSigned-out route smoke passed: ${total}/${total} routes at ${baseUrl}`);
