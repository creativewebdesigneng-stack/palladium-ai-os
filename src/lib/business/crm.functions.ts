/**
 * CRM server functions.
 *
 * All records live in `crm_contacts` / `crm_activities` and are read back under
 * RLS as the signed-in caller. Nothing here is derived from mock catalogues.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sb = { from: (t: string) => any };

const contactInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(60).optional().or(z.literal("")),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  title: z.string().trim().max(160).optional().or(z.literal("")),
  stage: z.string().trim().max(40).default("lead"),
  value_gbp: z.coerce.number().min(0).max(1_000_000_000).default(0),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
  source: z.string().trim().max(80).optional().or(z.literal("")),
});

function clean(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? null : value;
}

export const listCrm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const [contactsRes, activitiesRes] = await Promise.all([
      sb.from("crm_contacts").select("*").order("created_at", { ascending: false }).limit(500),
      sb
        .from("crm_activities")
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(200),
    ]);
    if (contactsRes.error) throw new Error(contactsRes.error.message);
    if (activitiesRes.error) throw new Error(activitiesRes.error.message);

    const contacts = (contactsRes.data ?? []) as any[];
    const won = contacts.filter((c) => c.stage === "won");
    const lost = contacts.filter((c) => c.stage === "lost");
    const open = contacts.filter((c) => c.stage !== "won" && c.stage !== "lost");
    const closed = won.length + lost.length;

    return {
      contacts,
      activities: (activitiesRes.data ?? []) as any[],
      summary: {
        total: contacts.length,
        open: open.length,
        won: won.length,
        lost: lost.length,
        winRate: closed > 0 ? Math.round((won.length / closed) * 100) : null,
        openValue: open.reduce((sum, c) => sum + Number(c.value_gbp ?? 0), 0),
        wonValue: won.reduce((sum, c) => sum + Number(c.value_gbp ?? 0), 0),
      },
    };
  });

export const saveContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => contactInput.parse(data))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const row = {
      name: data.name,
      email: clean(data.email),
      phone: clean(data.phone),
      company: clean(data.company),
      title: clean(data.title),
      stage: data.stage,
      value_gbp: data.value_gbp,
      notes: clean(data.notes),
      source: clean(data.source),
    };

    if (data.id) {
      const { data: updated, error } = await sb
        .from("crm_contacts")
        .update(row)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return updated;
    }

    const { data: created, error } = await sb
      .from("crm_contacts")
      .insert({ ...row, user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return created;
  });

export const deleteContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb.from("crm_contacts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const logActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        contactId: z.string().uuid(),
        kind: z.enum(["call", "email", "meeting", "note", "task"]).default("note"),
        summary: z.string().trim().min(1).max(500),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: created, error } = await sb
      .from("crm_activities")
      .insert({
        user_id: context.userId,
        contact_id: data.contactId,
        kind: data.kind,
        summary: data.summary,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await sb
      .from("crm_contacts")
      .update({ last_contacted_at: new Date().toISOString() })
      .eq("id", data.contactId);
    return created;
  });
