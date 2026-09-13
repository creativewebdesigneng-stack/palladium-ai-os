import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260913024500_runtime_worker_scheduler.sql", import.meta.url),
  "utf8",
);
const auth = readFileSync(new URL("./runtime-worker-auth.server.ts", import.meta.url), "utf8");
const workflowRoute = readFileSync(
  new URL("../../routes/api/internal/workflow-runs.ts", import.meta.url),
  "utf8",
);
const webhookRoute = readFileSync(
  new URL("../../routes/api/internal/webhook-retries.ts", import.meta.url),
  "utf8",
);

describe("authoritative runtime scheduler", () => {
  it("uses the documented Supabase cron + async HTTP extensions", () => {
    expect(migration).toContain("create extension if not exists pg_net with schema extensions");
    expect(migration).toContain("create extension if not exists pg_cron with schema pg_catalog");
    expect(migration).toContain("'blackstar-workflow-runner'");
    expect(migration).toContain("'blackstar-webhook-retries'");
    expect(migration.match(/'\*\/5 \* \* \* \*'/g)?.length).toBe(2);
  });

  it("targets only the protected canonical production worker endpoints", () => {
    expect(migration).toContain(
      "https://palladium-ai-os.vercel.app/api/internal/workflow-runs?limit=4",
    );
    expect(migration).toContain(
      "https://palladium-ai-os.vercel.app/api/internal/webhook-retries?limit=50",
    );
    expect(workflowRoute).toContain('isValidRuntimeWorkerToken("workflow_runner", supplied)');
    expect(webhookRoute).toContain('isValidRuntimeWorkerToken("webhook_retry", supplied)');
  });
});

describe("runtime worker credential isolation", () => {
  it("keeps the credential table server-only", () => {
    expect(migration).toContain("alter table public.runtime_worker_credentials enable row level security");
    expect(migration).toContain(
      "revoke all on public.runtime_worker_credentials from public, anon, authenticated",
    );
    expect(migration).toContain("grant select on public.runtime_worker_credentials to service_role");
  });

  it("generates tokens inside Postgres and stores only hashes outside Vault", () => {
    expect(migration.match(/extensions\.gen_random_bytes\(48\)/g)?.length).toBe(2);
    expect(migration.match(/extensions\.digest\([^)]*, 'sha256'\)/g)?.length).toBe(2);
    expect(migration).toContain("vault.create_secret");
    expect(migration).toContain("vault.update_secret");
    expect(migration).toContain("blackstar_workflow_runner_token");
    expect(migration).toContain("blackstar_webhook_retry_token");
    expect(migration).not.toMatch(/Bearer [A-Za-z0-9_-]{32,}/);
  });

  it("matches the application's hash fallback without exposing a plaintext database token", () => {
    expect(auth).toContain('.from("runtime_worker_credentials")');
    expect(auth).toContain('.select("token_sha256,enabled")');
    expect(auth).toContain("safeEqual(sha256(supplied), row.token_sha256)");
    expect(migration).toContain("token_sha256 text not null");
    expect(migration).not.toContain("token_plaintext");
  });

  it("reads bearer material from Vault only at scheduled execution time", () => {
    expect(migration.match(/from vault\.decrypted_secrets/g)?.length).toBe(2);
    expect(migration).toContain("'Authorization', 'Bearer ' ||");
  });
});
