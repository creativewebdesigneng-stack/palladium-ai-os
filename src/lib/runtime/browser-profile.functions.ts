import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { asBrowserDatabase } from "./browser-database.types";

const cleanId = (value: unknown) => {
  const id = typeof value === "string" ? value.trim().slice(0, 120) : "";
  if (!id) throw new Error("Browser profile id is required.");
  return id;
};

export const listBrowserProfiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = asBrowserDatabase(context.supabase);
    const { data, error } = await db
      .from("browser_profiles")
      .select("id,agent_id,domain_scope,created_at,updated_at,last_used_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw new Error("Could not load persisted browser sessions.");
    return { profiles: data ?? [] };
  });

export const deleteBrowserProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: cleanId(input?.id) }))
  .handler(async ({ data, context }) => {
    const db = asBrowserDatabase(context.supabase);
    const { error } = await db
      .from("browser_profiles")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error("Could not reset the persisted browser session.");
    return { deleted: true, id: data.id };
  });
