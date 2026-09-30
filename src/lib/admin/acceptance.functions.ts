import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isPlatformAdmin } from "@/lib/marketplace/marketplace.server";
import { ACCEPTANCE_EVIDENCE_TABLES } from "@/lib/admin/acceptance-catalog";

type Sb = {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => any;
};

export const getOperationalAcceptanceSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const scoped = context.supabase as unknown as Sb;
    if (!(await isPlatformAdmin(scoped, context.userId))) {
      return { forbidden: true as const };
    }

    // Count through the caller-scoped client so row-level security remains
    // authoritative. A platform admin must not see another user's acceptance
    // records merely because this page lives in the control plane.
    const entries = await Promise.all(
      Object.entries(ACCEPTANCE_EVIDENCE_TABLES).map(async ([key, table]) => {
        const { count, error } = await scoped
          .from(table)
          .select("*", { count: "exact", head: true });

        return [
          key,
          {
            count: count ?? 0,
            available: !error,
          },
        ] as const;
      }),
    );

    return {
      forbidden: false as const,
      checkedAt: new Date().toISOString(),
      evidence: Object.fromEntries(entries),
      evidenceRule:
        "A non-zero record count means evidence exists for review. It does not automatically certify the acceptance item.",
    };
  });
