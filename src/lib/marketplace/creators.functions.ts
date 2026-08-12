/**
 * Creator profile server functions.
 *
 * A creator profile is the public identity attached to marketplace listings.
 * Reads are public to signed-in users; writes are always scoped to the caller
 * and the `verified` flag can never be set from the browser.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sb = { from: (t: string) => any };

export const getCreatorProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ user_id: z.string().uuid().nullish() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = data.user_id ?? context.userId;
    const { data: row, error } = await sb
      .from("creator_profiles")
      .select("user_id,display_name,handle,bio,website,avatar_url,verified,created_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ?? null;
  });

export const saveCreatorProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        display_name: z.string().trim().min(2).max(60),
        handle: z.string().trim().max(40).optional(),
        bio: z.string().trim().max(1000).optional(),
        website: z.string().trim().url().max(200).optional().or(z.literal("")),
        avatar_url: z.string().trim().url().max(300).optional().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: row, error } = await sb
      .from("creator_profiles")
      .upsert(
        {
          user_id: context.userId,
          display_name: data.display_name,
          handle: data.handle || null,
          bio: data.bio || null,
          website: data.website || null,
          avatar_url: data.avatar_url || null,
        },
        { onConflict: "user_id" },
      )
      .select("user_id,display_name,handle,bio,website,avatar_url,verified")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });
