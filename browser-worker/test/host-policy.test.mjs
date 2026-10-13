import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { browserWorkerBindAddress } from "../host-policy.mjs";

test("Windows defaults to a localhost-only browser worker; containers retain old binding", () => {
  assert.equal(browserWorkerBindAddress("win32", ""), "127.0.0.1");
  assert.equal(browserWorkerBindAddress("win32", undefined), "127.0.0.1");
  assert.equal(browserWorkerBindAddress("linux", undefined), "0.0.0.0");
  assert.equal(browserWorkerBindAddress("linux", "127.0.0.1"), "127.0.0.1");
  assert.equal(browserWorkerBindAddress("win32", "0.0.0.0"), "0.0.0.0");
  assert.throws(() => browserWorkerBindAddress("win32", "192.168.0.15"));
  assert.throws(() => browserWorkerBindAddress("linux", "example.com"));
  assert.throws(() => browserWorkerBindAddress("linux", "127.0.0.1;rm -rf /"));
});

const folder = join(dirname(fileURLToPath(import.meta.url)), "..", "windows");
test("Windows local deployment keeps secrets DPAPI-protected and avoids enabling external services", () => {
  const setup = readFileSync(join(folder,"start-local.ps1"),"utf8");
  const stop = readFileSync(join(folder,"stop-local.ps1"),"utf8");
  const copy = readFileSync(join(folder,"copy-worker-token.ps1"),"utf8");
  assert.match(setup, /Export-Clixml/);
  assert.match(setup, /SecureStringToBSTR/);
  assert.match(setup, /ZeroFreeBSTR/);
  assert.match(setup, /BROWSER_WORKER_BIND = "127\.0\.0\.1"/);
  assert.match(setup, /browserReady/);
  assert.match(setup, /Chromium worker/);
  assert.doesNotMatch(setup, /\btailscale funnel\b|vercel env add|netsh advfirewall/i);
  assert.match(stop, /recordedStart/);
  assert.match(stop, /Stop-Process/);
  assert.doesNotMatch(stop, /\btailscale funnel reset\b|netsh advfirewall/i);
  assert.match(copy, /Set-Clipboard/);
  assert.match(copy, /ZeroFreeBSTR/);
  assert.doesNotMatch(copy, /Write-Host\s+\$token|Write-Output\s+\$token/i);
});
