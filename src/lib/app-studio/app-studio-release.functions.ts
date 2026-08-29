import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sb = { from: (table: string) => any };
const uuid = z.string().uuid();

/**
 * Re-points the public App Studio route at an existing immutable release.
 * This changes only which snapshot is live; it never mutates the saved release
 * contents or restores secure datasource data into the browser.
 */
export const publishExistingStudioRelease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ appId: uuid, releaseId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const app = await sb.from("app_studio_apps")
      .select("id,published_release_id,status")
      .eq("id", data.appId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (app.error) throw new Error(app.error.message);
    if (!app.data) throw new Error("App Studio application not found.");

    const release = await sb.from("app_studio_releases")
      .select("id,version,status,published_at")
      .eq("id", data.releaseId)
      .eq("app_id", data.appId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (release.error) throw new Error(release.error.message);
    if (!release.data) throw new Error("App Studio release not found.");

    if (app.data.published_release_id === release.data.id && release.data.status === "published") {
      return { ...release.data, alreadyLive: true };
    }

    const now = new Date().toISOString();
    const activated = await sb.from("app_studio_releases")
      .update({ status: "published", published_at: now })
      .eq("id", release.data.id)
      .eq("app_id", data.appId)
      .eq("user_id", context.userId);
    if (activated.error) throw new Error(activated.error.message);

    const pointed = await sb.from("app_studio_apps")
      .update({ status: "published", published_release_id: release.data.id })
      .eq("id", data.appId)
      .eq("user_id", context.userId);
    if (pointed.error) {
      await sb.from("app_studio_releases")
        .update({ status: release.data.status, published_at: release.data.published_at })
        .eq("id", release.data.id)
        .eq("user_id", context.userId);
      throw new Error(pointed.error.message);
    }

    const previousReleaseId = app.data.published_release_id;
    if (previousReleaseId && previousReleaseId !== release.data.id) {
      await sb.from("app_studio_releases")
        .update({ status: "rolled_back" })
        .eq("id", previousReleaseId)
        .eq("app_id", data.appId)
        .eq("user_id", context.userId)
        .eq("status", "published");
    }

    await sb.from("mission_audit_logs").insert({
      user_id: context.userId,
      action: "app_studio_release_activated",
      target_type: "app_studio_app",
      target_id: data.appId,
      status: "success",
      metadata: {
        release_id: release.data.id,
        version: release.data.version,
        previous_release_id: previousReleaseId ?? null,
      },
    });

    return {
      id: release.data.id,
      version: release.data.version,
      status: "published",
      published_at: now,
      alreadyLive: false,
    };
  });
