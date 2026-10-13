#!/usr/bin/env node
/**
 * Run from operator terminal after deploying a PRIVATE authenticated HTTPS
 * browser worker. Never prints the worker token or browser storage.
 * No Vercel secrets or mock/simulated evidence are accepted.
 */
import { SMOKE_TARGET, verifySmokeEvidence } from "./smoke-evidence.mjs";

const localOnly = process.argv.slice(2).includes("--local");
if (process.argv.slice(2).some((arg) => arg !== "--local")) {
  console.error("Unknown argument. Only --local is supported for a loopback-only HTTP check.");
  process.exit(2);
}
const endpoint = process.env.PLAYWRIGHT_BROWSER_ENDPOINT;
const token = process.env.PLAYWRIGHT_BROWSER_TOKEN;
if (!endpoint || !token) {
  console.error("Set PLAYWRIGHT_BROWSER_ENDPOINT and PLAYWRIGHT_BROWSER_TOKEN in the process environment.");
  process.exit(2);
}
let origin;
try {
  const url = new URL(endpoint);
  const loopback = url.protocol === "http:" && url.hostname === "127.0.0.1" &&
    /^[1-9][0-9]{0,4}$/.test(url.port) && Number(url.port) <= 65535;
  if ((localOnly ? !loopback : url.protocol !== "https:") ||
      url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("unsafe endpoint");
  }
  origin = url.origin;
} catch {
  console.error(localOnly
    ? "Local smoke check requires http://127.0.0.1:<port> and --local. Remote HTTP is never accepted."
    : "The browser-worker endpoint must be a bare HTTPS origin without embedded credentials.");
  process.exit(2);
}
async function api(path, payload = {}) {
  const response = await fetch(origin + path, {
    method: "POST", redirect: "manual", signal: AbortSignal.timeout(path === "/action" ? 35_000 : 30_000),
    headers: { "authorization": "Bearer " + token, "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  let result;
  try { result = await response.json(); }
  catch { throw new Error(path + " did not return JSON (HTTP " + response.status + ")"); }
  return { httpStatus: response.status, body: result };
}
let sessionId = null;
try {
  const health = await api("/health");
  if (health.httpStatus !== 200 || health.body.ok !== true ||
      health.body.service !== "palladium-playwright-worker" ||
      health.body.browserReady !== true)
    throw new Error("Worker failed authenticated Chromium readiness.");
  console.log("PASS: authenticated Chromium readiness");
  const session = await api("/session", {allowedDomains: [new URL(SMOKE_TARGET).hostname]});
  if (session.httpStatus !== 200 ||
      !/^[0-9a-f-]{36}$/i.test(String(session.body.sessionId??"")))
    throw new Error("Worker did not return a real isolated session.");
  sessionId = session.body.sessionId;
  console.log("PASS: bounded isolated browser session");
  const denied = await api("/action",{
    sessionId, action:"navigate", params:{url:"http://127.0.0.1:80"}
  });
  if (denied.httpStatus === 200 && denied.body.ok === true)
    throw new Error("Worker attempted a private-network navigation.");
  console.log("PASS: blocked private-network access");
  const nav = await api("/action",{
    sessionId, action:"navigate", params:{url:SMOKE_TARGET}
  });
  const read = await api("/action",{
    sessionId, action:"extract", params:{selector:"body"}
  });
  const evidence = verifySmokeEvidence(nav, read);
  console.log("PASS: real HTML navigation/extraction", evidence.url,
    "HTTP", evidence.pageStatus, "characters:", evidence.characters);
  console.log("BROWSER_WORKER_ACCEPTANCE=PASS");
} catch(error) {
  console.error("BROWSER_WORKER_ACCEPTANCE=FAIL:", error instanceof Error?error.message:"Unknown error");
  process.exitCode=1;
} finally {
  if(sessionId) {
    try { await api("/action",{sessionId,action:"close",params:{}}); }
    catch { console.error("Warning: worker session cleanup could not be confirmed."); }
  }
}
