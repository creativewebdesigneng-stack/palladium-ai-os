import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260913024500_runtime_worker_scheduler.sql", import.meta.url),
  "utf8",
);
const privilegeMigration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260913025500_runtime_worker_credential_privileges.sql",
    import.meta.url,
  ),
  "utf8",
);
const verifierMigration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260913030500_runtime_worker_token_verifier.sql",
    import.meta.url,
  ),
  "utf8",
);
const verifierPrivilegeMigration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260913031000_runtime_worker_verifier_privileges.sql",
    import.meta.url,
  ),
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
  it("keeps the credential table RLS-protected and removes direct API-role access after cutover", () => {
    expect(migration).toContain("alter table public.runtime_worker_credentials enable row level security");
    expect(privilegeMigration).toContain(
      "revoke all on public.runtime_worker_credentials from public, anon, authenticated, service_role",
    );
    expect(privilegeMigration).toContain(
      "grant select on public.runtime_worker_credentials to service_role",
    );
    expect(verifierMigration).toContain(
      "revoke all on public.runtime_worker_credentials from public, anon, authenticated, service_role",
    );
    expect(verifierMigration).not.toMatch(/grant select on public\.runtime_worker_credentials/i);
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

  it("verifies bearer tokens through a boolean SECURITY DEFINER function", () => {
    expect(verifierMigration).toContain("function public.verify_runtime_worker_token");
    expect(verifierMigration).toContain("security definer");
    expect(verifierMigration).toContain("set search_path = ''");
    expect(verifierMigration).toContain("length(supplied_token) < 32");
    expect(verifierMigration).toContain("worker_name not in ('workflow_runner', 'webhook_retry')");
    expect(verifierMigration).toContain("extensions.digest(supplied_token, 'sha256')");
  });

  it("revokes default function grants before allowing only required API roles", () => {
    for (const sql of [verifierMigration, verifierPrivilegeMigration]) {
      expect(sql).toMatch(
        /revoke all on function public\.verify_runtime_worker_token\(text, text\)[\s\S]*from public, anon, authenticated, service_role;/i,
      );

      const grant = sql.match(
        /grant execute on function public\.verify_runtime_worker_token\(text, text\) to ([^;]+);/i,
      );
      const grantedRoles = grant?.[1]
        ?.split(",")
        .map((role) => role.trim())
        .filter(Boolean);

      expect(grantedRoles).toEqual(["anon", "service_role"]);
    }
  });

  it("uses the isolated verifier RPC instead of reading token hashes in application code", () => {
    expect(auth).toContain('db.rpc("verify_runtime_worker_token"');
    expect(auth).toContain("worker_name: name");
    expect(auth).toContain("supplied_token: supplied");
    expect(auth).not.toContain('.from("runtime_worker_credentials")');
    expect(auth).not.toContain('select("token_sha256,enabled")');
    expect(auth).toContain("database verifier unavailable");
    expect(auth).not.toMatch(/console\.(?:warn|error)\([^\n]*supplied/);
  });

  it("reads bearer material from Vault only at scheduled execution time", () => {
    expect(migration.match(/from vault\.decrypted_secrets/g)?.length).toBe(2);
    expect(migration).toContain("'Authorization', 'Bearer ' ||");
  });
});
