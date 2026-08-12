/**
 * Notification preference server functions.
 *
 * Preferences are per-user and always resolved from the authenticated session —
 * a client can never read or write someone else's settings.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_TYPE_MAP,
  type NotificationPreferences,
} from "./types";

type Sb = { from: (t: string) => any };

const prefsSchema = z.object({
  in_app: z.boolean(),
  browser_push: z.boolean(),
  browser_push_details: z.boolean(),
  min_severity: z.enum(["info", "success", "warning", "critical"]),
  muted_types: z.array(z.string().max(64)).max(64),
});

export const getNotificationPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NotificationPreferences> => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb
      .from("notification_preferences")
      .select("in_app,browser_push,browser_push_details,min_severity,muted_types")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return DEFAULT_NOTIFICATION_PREFERENCES;
    return {
      in_app: data.in_app ?? true,
      browser_push: data.browser_push ?? false,
      browser_push_details: data.browser_push_details ?? false,
      min_severity: data.min_severity ?? "info",
      muted_types: Array.isArray(data.muted_types) ? data.muted_types : [],
    };
  });

export const saveNotificationPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => prefsSchema.parse(input))
  .handler(async ({ data, context }): Promise<NotificationPreferences> => {
    const sb = context.supabase as unknown as Sb;
    // Only catalogued types can be muted, so a stale client cannot silence
    // future alert types by writing arbitrary strings.
    const muted = data.muted_types.filter((t) => NOTIFICATION_TYPE_MAP[t]);
    const row = {
      user_id: context.userId,
      in_app: data.in_app,
      browser_push: data.browser_push,
      browser_push_details: data.browser_push && data.browser_push_details,
      min_severity: data.min_severity,
      muted_types: muted,
      updated_at: new Date().toISOString(),
    };
    const { error } = await sb
      .from("notification_preferences")
      .upsert(row, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ...data, browser_push_details: row.browser_push_details, muted_types: muted };
  });
