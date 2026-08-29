import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sb = { from: (table: string) => any };

const startInput = z.object({
  label: z.string().trim().min(1).max(160).default("Focus session"),
  taskSource: z.enum(["personal_tasks", "agent_tasks"]).nullable().optional(),
  taskId: z.string().uuid().nullable().optional(),
});

export const listFocusSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number } | undefined) => ({ limit: Math.min(Math.max(Number(input?.limit ?? 50) || 50, 1), 200) }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: rows, error } = await sb.from("task_focus_sessions").select("*").eq("user_id", context.userId).order("started_at", { ascending: false }).limit(data.limit);
    if (error) throw new Error(error.message);
    const sessions = rows ?? [];
    const completed = sessions.filter((row: any) => row.ended_at && Number(row.duration_seconds ?? 0) >= 0);
    const totalSeconds = completed.reduce((sum: number, row: any) => sum + Number(row.duration_seconds ?? 0), 0);
    return {
      sessions,
      summary: {
        completed: completed.length,
        totalSeconds,
        totalMinutes: Math.round(totalSeconds / 60),
        active: sessions.find((row: any) => !row.ended_at) ?? null,
      },
    };
  });

export const startFocusSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => startInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: existing } = await sb.from("task_focus_sessions").select("id").eq("user_id", context.userId).is("ended_at", null).limit(1).maybeSingle();
    if (existing) throw new Error("Finish your active focus session before starting another one.");
    const { data: row, error } = await sb.from("task_focus_sessions").insert({
      user_id: context.userId,
      label: data.label,
      task_source: data.taskSource ?? null,
      task_id: data.taskId ?? null,
      started_at: new Date().toISOString(),
    }).select("*").single();
    if (error || !row) throw new Error(error?.message ?? "Could not start focus session.");
    return { session: row };
  });

export const stopFocusSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), notes: z.string().max(5000).default("") }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: current, error: readError } = await sb.from("task_focus_sessions").select("*").eq("id", data.id).eq("user_id", context.userId).maybeSingle();
    if (readError || !current) throw new Error(readError?.message ?? "Focus session not found.");
    if (current.ended_at) return { session: current };
    const endedAt = new Date();
    const durationSeconds = Math.max(0, Math.round((endedAt.getTime() - new Date(current.started_at).getTime()) / 1000));
    const { data: row, error } = await sb.from("task_focus_sessions").update({
      ended_at: endedAt.toISOString(), duration_seconds: durationSeconds, notes: data.notes,
    }).eq("id", data.id).eq("user_id", context.userId).select("*").single();
    if (error || !row) throw new Error(error?.message ?? "Could not stop focus session.");
    return { session: row };
  });
