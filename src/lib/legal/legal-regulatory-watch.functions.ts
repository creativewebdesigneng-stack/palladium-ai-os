import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  assessRegulatoryEvidenceChange,
  fingerprintRegulatoryEvidence,
  isSourceOnOfficialHost,
  officialSourceHost,
  restrictToOfficialSourceHost,
  runLegalRegulatoryEvidenceCheck,
} from "./legal-regulatory-monitor.server";

export {
  assessRegulatoryEvidenceChange,
  fingerprintRegulatoryEvidence,
  isSourceOnOfficialHost,
  officialSourceHost,
  restrictToOfficialSourceHost,
};

type Sb = { from: (table: string) => any };

const schema = z.object({
  name: z.string().trim().min(1).max(180),
  jurisdiction: z.string().trim().min(1).max(120),
  topic: z.string().trim().min(1).max(160),
  authority: z.string().trim().max(180).optional(),
  source_url: z.string().url().optional().or(z.literal("")),
  status: z.enum(["active", "paused"]).default("active"),
  check_interval_hours: z.coerce.number().int().min(1).max(720).default(24),
});

const automationSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["active", "paused"]),
  check_interval_hours: z.coerce.number().int().min(1).max(720),
});

export const listLegalRegulatoryWatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb
      .from("legal_regulatory_watches")
      .select("*")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveLegalRegulatoryWatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => schema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const now = Date.now();
    const { data: watch, error } = await sb
      .from("legal_regulatory_watches")
      .insert({
        name: data.name,
        jurisdiction: data.jurisdiction,
        topic: data.topic,
        authority: data.authority || null,
        source_url: data.source_url || null,
        status: data.status,
        check_interval_hours: data.check_interval_hours,
        next_check_at: new Date(now + data.check_interval_hours * 3_600_000).toISOString(),
        user_id: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return watch;
  });

export const updateLegalRegulatoryWatchAutomation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => automationSchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const updatedAt = new Date().toISOString();
    const nextCheckAt =
      data.status === "active"
        ? updatedAt
        : new Date(Date.now() + data.check_interval_hours * 3_600_000).toISOString();
    const { data: watch, error } = await sb
      .from("legal_regulatory_watches")
      .update({
        status: data.status,
        check_interval_hours: data.check_interval_hours,
        next_check_at: nextCheckAt,
        claimed_at: null,
        attempts: 0,
        last_error: null,
        updated_at: updatedAt,
      })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return watch;
  });

export const checkLegalRegulatoryWatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ id: z.string().uuid() }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: watch, error } = await sb
      .from("legal_regulatory_watches")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error || !watch) throw new Error("Regulatory watch not found.");
    if (watch.claimed_at) {
      throw new Error("An automated regulatory check is already running for this watch.");
    }

    const result = await runLegalRegulatoryEvidenceCheck({
      sb,
      watch,
      userId: context.userId,
    });

    if (watch.status === "active") {
      const intervalHours = Math.max(1, Math.min(720, Number(watch.check_interval_hours ?? 24)));
      await sb
        .from("legal_regulatory_watches")
        .update({
          next_check_at: new Date(Date.now() + intervalHours * 3_600_000).toISOString(),
          attempts: 0,
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", watch.id)
        .eq("user_id", context.userId);
    }

    return result;
  });
