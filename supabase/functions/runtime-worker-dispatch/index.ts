import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type WorkerName = "workflow_runner" | "webhook_retry" | "dropshipping_monitor";

type WorkerConfig = {
  name: WorkerName;
  upstream: string;
  defaultLimit: number;
  maxLimit: number;
  timeoutMs: number;
};

const UPSTREAM = "https://palladium-ai-os.vercel.app/api/internal/workflow-runs";

const WORKERS: Record<WorkerName, WorkerConfig> = {
  workflow_runner: {
    name: "workflow_runner",
    upstream: UPSTREAM,
    defaultLimit: 2,
    maxLimit: 4,
    timeoutMs: 55_000,
  },
  webhook_retry: {
    name: "webhook_retry",
    upstream: "https://palladium-ai-os.vercel.app/api/internal/webhook-retries",
    defaultLimit: 20,
    maxLimit: 50,
    timeoutMs: 30_000,
  },
  dropshipping_monitor: {
    name: "dropshipping_monitor",
    upstream: "https://palladium-ai-os.vercel.app/api/internal/dropshipping-opportunity-monitor",
    defaultLimit: 4,
    maxLimit: 8,
    timeoutMs: 55_000,
  },
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function defaultManagedSecretKey() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS")?.trim();
  if (!raw) throw new Error("SUPABASE_SECRET_KEYS is unavailable.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("SUPABASE_SECRET_KEYS is invalid.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("SUPABASE_SECRET_KEYS is invalid.");
  }
  const key = (parsed as Record<string, unknown>)["default"];
  if (typeof key !== "string" || !key.startsWith("sb_secret_")) {
    throw new Error("The default Supabase secret key is unavailable.");
  }
  return key;
}

function workerConfig(value: string | null): WorkerConfig | null {
  const name = (value || "workflow_runner") as WorkerName;
  return Object.prototype.hasOwnProperty.call(WORKERS, name) ? WORKERS[name] : null;
}

async function validWorkerToken(worker: WorkerName, token: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/+$/, "");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ?? "";
  if (!supabaseUrl || !serviceRoleKey) return false;
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/verify_runtime_worker_token`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        worker_name: worker,
        supplied_token: token,
      }),
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return false;
    return (await response.json().catch(() => null)) === true;
  } catch {
    return false;
  }
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const incoming = new URL(request.url);
  const worker = workerConfig(incoming.searchParams.get("worker"));
  if (!worker) return json({ error: "Unknown worker" }, 404);

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";

  if (token.length < 32 || !(await validWorkerToken(worker.name, token))) {
    return json({ error: "Unauthorized" }, 401);
  }

  let secretKey: string;
  try {
    secretKey = defaultManagedSecretKey();
  } catch {
    console.error("[runtime-worker-dispatch] Supabase secret key unavailable");
    return json({ error: "Runtime database credential unavailable" }, 503);
  }

  const requested = Number(incoming.searchParams.get("limit") ?? worker.defaultLimit);
  const limit = Number.isFinite(requested)
    ? Math.max(1, Math.min(worker.maxLimit, Math.trunc(requested)))
    : worker.defaultLimit;

  try {
    const upstream = await fetch(`${worker.upstream}?limit=${limit}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-blackstar-supabase-secret-key": secretKey,
      },
      body: "{}",
      redirect: "error",
      signal: AbortSignal.timeout(worker.timeoutMs),
    });

    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    console.error("[runtime-worker-dispatch] upstream worker unavailable", {
      worker: worker.name,
    });
    return json({ error: "Runtime worker unavailable" }, 503);
  }
});
