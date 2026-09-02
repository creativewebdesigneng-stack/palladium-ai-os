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
});

export const getPersonalAssistantPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const [profileRes, prefsRes] = await Promise.all([
      sb.from("profiles").select("id,email,full_name").eq("id", context.userId).maybeSingle(),
      sb.from("personal_assistant_preferences")
        .select("assistant_name,location_name,timezone,welcome_enabled,briefing_enabled,updated_at")
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
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" })
      .select("assistant_name,location_name,timezone,welcome_enabled,briefing_enabled")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, preferences: row };
  });
