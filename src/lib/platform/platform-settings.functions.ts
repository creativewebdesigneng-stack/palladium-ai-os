import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sb = { from: (t: string) => any };

export const getPlatformAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as Sb;
    const { data, error } = await admin
      .from("platform_settings")
      .select("value")
      .eq("key", "announcement")
      .maybeSingle();
    if (error) throw new Error(error.message);

    const value = data?.value;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { enabled: false, text: "", tone: "info" as const };
    }
    const row = value as Record<string, unknown>;
    const tone = row["tone"] === "warning" || row["tone"] === "critical" ? row["tone"] : "info";
    return {
      enabled: row["enabled"] === true,
      text: typeof row["text"] === "string" ? row["text"].trim().slice(0, 500) : "",
      tone,
    };
  });
