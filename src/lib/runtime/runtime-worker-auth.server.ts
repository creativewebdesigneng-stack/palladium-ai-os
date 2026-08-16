import { createHash, timingSafeEqual } from "node:crypto";

type WorkerCredentialName = "workflow_runner" | "webhook_retry";

type CredentialRow = {
  token_sha256: string;
  enabled: boolean;
};

const ENV_BY_NAME: Record<WorkerCredentialName, string> = {
  workflow_runner: "WORKFLOW_RUNNER_CRON_SECRET",
  webhook_retry: "WEBHOOK_RETRY_CRON_SECRET",
};

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function isValidRuntimeWorkerToken(
  name: WorkerCredentialName,
  supplied: string,
): Promise<boolean> {
  if (supplied.length < 32) return false;

  const envSecret = process.env[ENV_BY_NAME[name]] ?? "";
  if (envSecret.length >= 32 && safeEqual(supplied, envSecret)) return true;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as {
    from: (table: string) => any;
  };
  const { data, error } = await db
    .from("runtime_worker_credentials")
    .select("token_sha256,enabled")
    .eq("name", name)
    .maybeSingle();
  const row = data as CredentialRow | null;

  if (error || !row?.enabled || typeof row.token_sha256 !== "string") return false;
  return safeEqual(sha256(supplied), row.token_sha256);
}
