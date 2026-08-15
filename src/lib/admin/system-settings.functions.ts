import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isPlatformAdmin } from "@/lib/marketplace/marketplace.server";

type Sb = { from: (t: string) => any };

const announcementInput = z.object({
  enabled: z.boolean(),
  text: z.string().trim().max(500),
  tone: z.enum(["info", "warning", "critical"]),
});

export type PlatformAnnouncement = z.infer<typeof announcementInput>;

export function normaliseAnnouncement(value: unknown): PlatformAnnouncement {
  const parsed = announcementInput.safeParse(value);
  return parsed.success
    ? parsed.data
    : { enabled: false, text: "", tone: "info" };
}

export const getAdminSystemSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const caller = context.supabase as unknown as Sb;
    if (!(await isPlatformAdmin(caller as never, context.userId))) {
      return { forbidden: true as const };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("platform_settings")
      .select("value,updated_at,updated_by")
      .eq("key", "announcement")
      .maybeSingle();
    if (error) throw new Error(error.message);

    return {
      forbidden: false as const,
      announcement: normaliseAnnouncement(data?.value),
      updatedAt: data?.updated_at ? String(data.updated_at) : null,
      updatedBy: data?.updated_by ? String(data.updated_by) : null,
    };
  });

export const updatePlatformAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => announcementInput.parse(input))
  .handler(async ({ data, context }) => {
    const caller = context.supabase as unknown as Sb;
    if (!(await isPlatformAdmin(caller as never, context.userId))) {
      return { forbidden: true as const };
    }

    const value: PlatformAnnouncement = {
      enabled: data.enabled,
      text: data.text,
      tone: data.tone,
    };
    if (value.enabled && !value.text) {
      throw new Error("Announcement text is required when the announcement is enabled.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("platform_settings")
      .upsert({
        key: "announcement",
        value,
        updated_at: new Date().toISOString(),
        updated_by: context.userId,
      }, { onConflict: "key" });
    if (error) throw new Error(error.message);

    return { forbidden: false as const, announcement: value };
  });
