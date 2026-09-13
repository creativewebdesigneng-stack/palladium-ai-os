import { timingSafeEqual } from "node:crypto";

type WorkerCredentialName = "workflow_runner" | "webhook_retry";

const ENV_BY_NAME: Record<WorkerCredentialName, string> = {
  workflow_runner: "WORKFLOW_RUNNER_CRON_SECRET",
  webhook_retry: "WEBHOOK_RETRY_CRON_SECRET",
};

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function safeErrorCode(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "unknown")
      : "unknown";
  return code.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32) || "unknown";
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
    rpc: (
      fn: string,
      args: { worker_name: WorkerCredentialName; supplied_token: string },
    ) => Promise<{ data: unknown; error: unknown }>;
  };
  const { data, error } = await db.rpc("verify_runtime_worker_token", {
    worker_name: name,
    supplied_token: supplied,
  });

  if (error) {
    console.warn(
      `[runtime-worker-auth] database verifier unavailable for ${name}; code=${safeErrorCode(error)}`,
    );
    return false;
  }

  return data === true;
}
