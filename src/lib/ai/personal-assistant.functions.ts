import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sb = { from: (table: string) => any };

const updateSchema = z.object({
  assistantName: z.string().trim().min(1).max(60),
  locationName: z.string().trim().max(160).nullable().optional(),
  timezone: z.string().trim().max(100).nullable().optional(),
  welcomeEnabled: z.boolean(),
  briefingEnabled: z.boolean(),
  conversationHistoryEnabled: z.boolean(),
  memoryContextEnabled: z.boolean(),
  workspaceContextEnabled: z.boolean(),
  liveWebEnabled: z.boolean(),
  responseStyle: z.enum(["concise", "balanced", "detailed"]),
});

export const getPersonalAssistantPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const [profileRes, prefsRes] = await Promise.all([
      sb.from("profiles").select("id,email,full_name").eq("id", context.userId).maybeSingle(),
      sb.from("personal_assistant_preferences")
        .select("assistant_name,location_name,timezone,welcome_enabled,briefing_enabled,conversation_history_enabled,memory_context_enabled,workspace_context_enabled,live_web_enabled,response_style,updated_at")
        .eq("user_id", context.userId)
        .maybeSingle(),
    ]);
    if (profileRes.error) throw new Error(profileRes.error.message);
    if (prefsRes.error) throw new Error(prefsRes.error.message);
    const prefs = prefsRes.data ?? null;
    return {
      profile: profileRes.data ?? null,
      preferences: {
        assistantName: prefs?.assistant_name ?? "Blackstar",
        locationName: prefs?.location_name ?? "",
        timezone: prefs?.timezone ?? "",
        welcomeEnabled: prefs?.welcome_enabled ?? true,
        briefingEnabled: prefs?.briefing_enabled ?? true,
        conversationHistoryEnabled: prefs?.conversation_history_enabled ?? true,
        memoryContextEnabled: prefs?.memory_context_enabled ?? true,
        workspaceContextEnabled: prefs?.workspace_context_enabled ?? true,
        liveWebEnabled: prefs?.live_web_enabled ?? true,
        responseStyle: prefs?.response_style ?? "balanced",
      },
    };
  });

export const updatePersonalAssistantPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: row, error } = await sb
      .from("personal_assistant_preferences")
      .upsert({
        user_id: context.userId,
        assistant_name: data.assistantName,
        location_name: data.locationName || null,
        timezone: data.timezone || null,
        welcome_enabled: data.welcomeEnabled,
        briefing_enabled: data.briefingEnabled,
        conversation_history_enabled: data.conversationHistoryEnabled,
        memory_context_enabled: data.memoryContextEnabled,
        workspace_context_enabled: data.workspaceContextEnabled,
        live_web_enabled: data.liveWebEnabled,
        response_style: data.responseStyle,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" })
      .select("assistant_name,location_name,timezone,welcome_enabled,briefing_enabled,conversation_history_enabled,memory_context_enabled,workspace_context_enabled,live_web_enabled,response_style")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, preferences: row };
  });
