import {
  supabaseAdmin,
  withRequestScopedSupabaseAdminKey,
} from "@/integrations/supabase/client.server";

export type RuntimeWorkerCredentialName =
  | "workflow_runner"
  | "webhook_retry"
  | "dropshipping_monitor";

type RuntimeWorkerVerifierRpc = {
  rpc: (
    fn: "verify_runtime_worker_token",
    args: {
      worker_name: RuntimeWorkerCredentialName;
      supplied_token: string;
    },
  ) => Promise<{
    data: boolean | null;
    error: { message?: string } | null;
  }>;
};

export async function withVerifiedForwardedRuntimeWorker<T>(args: {
  name: RuntimeWorkerCredentialName;
  suppliedToken: string;
  forwardedAdminKey: string;
  operation: () => Promise<T>;
}): Promise<{ authorized: true; value: T } | { authorized: false }> {
  return withRequestScopedSupabaseAdminKey(args.forwardedAdminKey, async () => {
    const verifier = supabaseAdmin as unknown as RuntimeWorkerVerifierRpc;
    const verified = await verifier.rpc("verify_runtime_worker_token", {
      worker_name: args.name,
      supplied_token: args.suppliedToken,
    });

    if (verified.error || verified.data !== true) {
      return { authorized: false } as const;
    }

    return {
      authorized: true,
      value: await args.operation(),
    } as const;
  });
}
