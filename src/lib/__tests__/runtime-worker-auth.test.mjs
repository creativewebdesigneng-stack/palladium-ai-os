import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const authSource = await readFile(
  new URL("../runtime/runtime-worker-auth.server.ts", import.meta.url),
  "utf8",
);
const workflowRoute = await readFile(
  new URL("../../routes/api/internal/workflow-runs.ts", import.meta.url),
  "utf8",
);
const webhookRoute = await readFile(
  new URL("../../routes/api/internal/webhook-retries.ts", import.meta.url),
  "utf8",
);
const migration = await readFile(
  new URL("../../../supabase/migrations/20260816050000_runtime_worker_credentials.sql", import.meta.url),
  "utf8",
);

test("runtime worker auth never stores raw database tokens", () => {
  assert.match(authSource, /createHash\("sha256"\)/);
  assert.match(authSource, /token_sha256/);
  assert.doesNotMatch(migration, /Bearer\s+[A-Za-z0-9_-]{32,}/);
  assert.match(migration, /revoke all on table public\.runtime_worker_credentials from anon, authenticated/);
});

test("both internal workers use the shared server-only validator", () => {
  assert.match(workflowRoute, /isValidRuntimeWorkerToken\("workflow_runner", supplied\)/);
  assert.match(webhookRoute, /isValidRuntimeWorkerToken\("webhook_retry", supplied\)/);
  assert.doesNotMatch(workflowRoute, /timingSafeEqual/);
  assert.doesNotMatch(webhookRoute, /timingSafeEqual/);
});

test("legacy environment secrets remain accepted during migration", () => {
  assert.match(authSource, /WORKFLOW_RUNNER_CRON_SECRET/);
  assert.match(authSource, /WEBHOOK_RETRY_CRON_SECRET/);
  assert.match(authSource, /envSecret\.length >= 32/);
});
