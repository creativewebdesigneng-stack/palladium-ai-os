import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyRuntimeWorkerTokenWithPublishableRpc } from "./runtime-worker-auth.server";

const config = {
  supabaseUrl: "https://example.supabase.co",
  publishableKey: "sb_publishable_test_key",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("runtime worker publishable verifier", () => {
  it("calls only the boolean verifier RPC with the publishable key on apikey", async () => {
    const fetchImpl = vi.fn(async () => new Response("true", { status: 200 }));
    const token = "x".repeat(48);

    await expect(
      verifyRuntimeWorkerTokenWithPublishableRpc("workflow_runner", token, {
        config,
        fetchImpl: fetchImpl as typeof fetch,
      }),
    ).resolves.toBe(true);

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] as unknown as Parameters<typeof fetch>;
    expect(url).toBe("https://example.supabase.co/rest/v1/rpc/verify_runtime_worker_token");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({
      apikey: config.publishableKey,
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      worker_name: "workflow_runner",
      supplied_token: token,
    });
    expect(JSON.stringify(init?.headers).toLowerCase()).not.toContain("authorization");
  });

  it("returns false when PostgREST rejects the verifier call without logging response content", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ secret: "must-not-be-logged" }), { status: 401 }),
    );

    await expect(
      verifyRuntimeWorkerTokenWithPublishableRpc("webhook_retry", "y".repeat(48), {
        config,
        fetchImpl: fetchImpl as typeof fetch,
      }),
    ).resolves.toBe(false);

    expect(warn).toHaveBeenCalledWith(
      "[runtime-worker-auth] database verifier unavailable for webhook_retry; status=401",
    );
    expect(warn.mock.calls.flat().join(" ")).not.toContain("must-not-be-logged");
  });

  it("fails closed when verifier configuration is unavailable", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchImpl = vi.fn();

    await expect(
      verifyRuntimeWorkerTokenWithPublishableRpc("workflow_runner", "z".repeat(48), {
        config: null,
        fetchImpl: fetchImpl as typeof fetch,
      }),
    ).resolves.toBe(false);

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      "[runtime-worker-auth] verifier configuration unavailable for workflow_runner",
    );
  });
});
