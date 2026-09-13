import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sb = { from: (table: string) => any };

export const LEGAL_RIGHTS_KINDS = ["right", "obligation", "prohibition", "permission", "deadline", "remedy"] as const;
export const LEGAL_RIGHTS_STATUSES = ["review", "active", "satisfied", "disputed", "expired", "monitor"] as const;
export const LEGAL_EVIDENCE_STATUSES = ["unverified", "source_identified", "source_checked", "professional_reviewed"] as const;

export const LEGAL_RIGHTS_WORKFLOW_NOTICE =
  "Rights and obligations are user-governed working records. A saved item does not mean Blackstar has determined that it legally applies, is enforceable, is current, or has been professionally reviewed. Verify the authoritative source, jurisdiction, facts, amendments, commencement and current legal status before relying on it.";

const optionalText = (max: number) => z.string().trim().max(max).optional();
const schema = z.object({
  id: z.string().uuid().optional(),
  kind: z.enum(LEGAL_RIGHTS_KINDS),
  title: z.string().trim().min(1).max(220),
  jurisdiction: z.string().trim().min(1).max(120),
  authority: optionalText(180),
  source_url: z.string().url().optional().or(z.literal("")),
  source_locator: optionalText(240),
  responsible_party: optionalText(180),
  counterparty: optionalText(180),
  trigger_event: optionalText(600),
  due_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  status: z.enum(LEGAL_RIGHTS_STATUSES).default("review"),
  evidence_status: z.enum(LEGAL_EVIDENCE_STATUSES).default("unverified"),
  notes: optionalText(5000),
});

export const listLegalRightsObligations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb
      .from("legal_rights_obligations")
      .select("*")
      .eq("user_id", context.userId)
      .order("due_on", { ascending: true, nullsFirst: false })
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveLegalRightsObligation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => schema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const row = {
      kind: data.kind,
      title: data.title,
      jurisdiction: data.jurisdiction,
      authority: data.authority || null,
      source_url: data.source_url || null,
      source_locator: data.source_locator || null,
      responsible_party: data.responsible_party || null,
      counterparty: data.counterparty || null,
      trigger_event: data.trigger_event || null,
      due_on: data.due_on || null,
      status: data.status,
      evidence_status: data.evidence_status,
      notes: data.notes || null,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { data: saved, error } = await sb
        .from("legal_rights_obligations")
        .update(row)
        .eq("id", data.id)
        .eq("user_id", context.userId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return saved;
    }

    const { data: saved, error } = await sb
      .from("legal_rights_obligations")
      .insert({ ...row, user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return saved;
  });

export const deleteLegalRightsObligation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ id: z.string().uuid() }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb
      .from("legal_rights_obligations")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });