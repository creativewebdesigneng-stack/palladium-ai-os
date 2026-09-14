import { timingSafeEqual } from "node:crypto";

type WorkerCredentialName = "workflow_runner" | "webhook_retry" | "dropshipping_monitor";

type RuntimeWorkerVerifierConfig = {
  supabaseUrl: string;
  publishableKey: string;
};

type RuntimeWorkerVerifierOptions = {
  config?: RuntimeWorkerVerifierConfig | null;
  fetchImpl?: typeof fetch;
};

const ENV_BY_NAME: Record<WorkerCredentialName, string> = {
  workflow_runner: "WORKFLOW_RUNNER_CRON_SECRET",
  webhook_retry: "WEBHOOK_RETRY_CRON_SECRET",
  dropshipping_monitor: "DROPSHIPPING_MONITOR_CRON_SECRET",
};

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function runtimeVerifierConfig(): RuntimeWorkerVerifierConfig | null {
  const supabaseUrl =
    process.env["SUPABASE_URL"] ||
    process.env["VITE_SUPABASE_URL"] ||
    import.meta.env["VITE_SUPABASE_URL"];
  const publishableKey =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];

  if (!supabaseUrl || !publishableKey) return null;
  return { supabaseUrl, publishableKey };
}

function verifierRpcUrl(supabaseUrl: string) {
  const base = supabaseUrl.endsWith("/") ? supabaseUrl : `${supabaseUrl}/`;
  return new URL("rest/v1/rpc/verify_runtime_worker_token", base).toString();
}

export async function verifyRuntimeWorkerTokenWithPublishableRpc(
  name: WorkerCredentialName,
  supplied: string,
  options: RuntimeWorkerVerifierOptions = {},
): Promise<boolean> {
  const config = options.config === undefined ? runtimeVerifierConfig() : options.config;
  if (!config) {
    console.warn(`[runtime-worker-auth] verifier configuration unavailable for ${name}`);
    return false;
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(verifierRpcUrl(config.supabaseUrl), {
      method: "POST",
      headers: {
        apikey: config.publishableKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        worker_name: name,
        supplied_token: supplied,
      }),
    });

    if (!response.ok) {
      console.warn(
        `[runtime-worker-auth] database verifier unavailable for ${name}; status=${response.status}`,
      );
      return false;
    }

    const data = await response.json().catch(() => null);
    return data === true;
  } catch {
    console.warn(`[runtime-worker-auth] database verifier transport failure for ${name}`);
    return false;
  }
}

export async function isValidRuntimeWorkerToken(
  name: WorkerCredentialName,
  supplied: string,
): Promise<boolean> {
  if (supplied.length < 32) return false;

  const envSecret = process.env[ENV_BY_NAME[name]] ?? "";
  if (envSecret.length >= 32 && safeEqual(supplied, envSecret)) return true;

  return verifyRuntimeWorkerTokenWithPublishableRpc(name, supplied);
}
