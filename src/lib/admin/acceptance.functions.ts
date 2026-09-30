import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isPlatformAdmin } from "@/lib/marketplace/marketplace.server";
import { ACCEPTANCE_EVIDENCE_TABLES } from "@/lib/admin/acceptance-catalog";
import {
  buildAcceptanceAuditMetadata,
  prepareOperationalAcceptanceResult,
} from "@/lib/admin/acceptance-results";
import { writeAudit } from "@/lib/platform/audit.server";

type Sb = {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => any;
};

type AcceptanceResultRow = {
  item_id: string;
  status: string;
  evidence_kind: string;
  evidence_reference?: string | null;
  notes?: string | null;
  observed_at?: string | null;
  updated_at?: string | null;
};

function mapAcceptanceResult(row: AcceptanceResultRow) {
  return {
    itemId: String(row.item_id),
    status: String(row.status),
    evidenceKind: String(row.evidence_kind),
    evidenceReference: row.evidence_reference ? String(row.evidence_reference) : null,
    notes: row.notes ? String(row.notes) : null,
    observedAt: row.observed_at ? String(row.observed_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

export const getOperationalAcceptanceSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const scoped = context.supabase as unknown as Sb;
    if (!(await isPlatformAdmin(scoped, context.userId))) {
      return { forbidden: true as const };
    }

    const [entries, resultResponse] = await Promise.all([
      Promise.all(
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
      ),
      scoped
        .from("operational_acceptance_results")
        .select(
          "item_id,status,evidence_kind,evidence_reference,notes,observed_at,updated_at",
        )
        .order("item_id", { ascending: true }),
    ]);

    if (resultResponse.error) {
      throw new Error(resultResponse.error.message);
    }

    const resultRows = (resultResponse.data ?? []) as AcceptanceResultRow[];

    return {
      forbidden: false as const,
      checkedAt: new Date().toISOString(),
      evidence: Object.fromEntries(entries),
      results: Object.fromEntries(
        resultRows.map((row) => [row.item_id, mapAcceptanceResult(row)]),
      ),
      evidenceRule:
        "A non-zero record count means evidence exists for review. It does not automatically certify the acceptance item.",
      resultRule:
        "A recorded outcome documents the signed-in owner's acceptance decision. Verified still requires the authoritative evidence described by the gate.",
    };
  });

export const saveOperationalAcceptanceResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => prepareOperationalAcceptanceResult(input))
  .handler(async ({ data, context }) => {
    const scoped = context.supabase as unknown as Sb;
    if (!(await isPlatformAdmin(scoped, context.userId))) {
      return { forbidden: true as const };
    }

    const { data: previous, error: previousError } = await scoped
      .from("operational_acceptance_results")
      .select("status")
      .eq("user_id", context.userId)
      .eq("item_id", data.itemId)
      .maybeSingle();

    if (previousError) {
      throw new Error(previousError.message);
    }

    const now = new Date().toISOString();
    const { data: row, error } = await scoped
      .from("operational_acceptance_results")
      .upsert(
        {
          user_id: context.userId,
          item_id: data.itemId,
          status: data.status,
          evidence_kind: data.evidenceKind,
          evidence_reference: data.evidenceReference,
          notes: data.notes,
          observed_at: now,
          updated_at: now,
        },
        { onConflict: "user_id,item_id" },
      )
      .select(
        "item_id,status,evidence_kind,evidence_reference,notes,observed_at,updated_at",
      )
      .single();

    if (error) {
      throw new Error(error.message);
    }

    await writeAudit({
      userId: context.userId,
      action: previous
        ? "operational_acceptance.result_updated"
        : "operational_acceptance.result_recorded",
      targetType: "operational_acceptance",
      targetId: data.itemId,
      status: "success",
      metadata: buildAcceptanceAuditMetadata({
        previousStatus: previous?.status ? String(previous.status) : null,
        status: data.status,
        evidenceKind: data.evidenceKind,
        evidenceReference: data.evidenceReference,
        notes: data.notes,
      }),
    });

    return {
      forbidden: false as const,
      result: mapAcceptanceResult(row as AcceptanceResultRow),
    };
  });
