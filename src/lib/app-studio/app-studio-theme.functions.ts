import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sb = { from: (table: string) => any };
const uuid = z.string().uuid();
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const themeInput = z.object({
  appId: uuid,
  background: color,
  foreground: color,
  accent: color,
  fontFamily: z.enum(["Inter", "system-ui", "Arial", "Georgia", "monospace"]).default("Inter"),
});

export const updateStudioTheme = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => themeInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const theme = {
      background: data.background.toLowerCase(),
      foreground: data.foreground.toLowerCase(),
      accent: data.accent.toLowerCase(),
      fontFamily: data.fontFamily,
    };
    const result = await sb.from("app_studio_apps")
      .update({ theme })
      .eq("id", data.appId)
      .eq("user_id", context.userId)
      .select("id,theme,updated_at")
      .maybeSingle();
    if (result.error) throw new Error(result.error.message);
    if (!result.data) throw new Error("App Studio application not found.");

    await sb.from("mission_audit_logs").insert({
      user_id: context.userId,
      action: "app_studio_theme_updated",
      target_type: "app_studio_app",
      target_id: data.appId,
      status: "success",
      metadata: { theme },
    });
    return result.data;
  });
