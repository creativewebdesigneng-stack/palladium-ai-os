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
      .from("marketplace_seller_profiles")
      .select("user_id,display_name,handle,bio,website_url,avatar_url,verification_status,created_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ? {...row,website:row.website_url,verified:row.verification_status==='verified'} : null;
  });

export const saveCreatorProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        display_name: z.string().trim().min(2).max(60),
        handle: z.string().trim().max(40).optional(),
        bio: z.string().trim().max(1000).optional(),
        website: z.string().trim().url().max(200).refine(v=>/^https?:\/\//i.test(v),'Use an HTTP or HTTPS website.').optional().or(z.literal("")),
        avatar_url: z.string().trim().url().max(300).refine(v=>/^https?:\/\//i.test(v),'Use an HTTP or HTTPS image.').optional().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const {data:existing,error:lookupError}=await sb.from('marketplace_seller_profiles').select('handle').eq('user_id',context.userId).maybeSingle();
    if(lookupError)throw new Error('Could not load your seller profile.');
    const handle=(data.handle||existing?.handle||`${data.display_name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,24)||'creator'}-${context.userId.slice(0,8)}`).toLowerCase();
    if(!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(handle))throw new Error('Choose a handle with 3–40 lowercase letters, digits or hyphens.');
    const { data: row, error } = await sb
      .from("marketplace_seller_profiles")
      .upsert(
        {
          user_id: context.userId,
          display_name: data.display_name,
          handle,
          bio: data.bio || "",
          website_url: data.website || null,
          avatar_url: data.avatar_url || null,
        },
        { onConflict: "user_id" },
      )
      .select("user_id,display_name,handle,bio,website_url,avatar_url,verification_status")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ? {...row,website:row.website_url,verified:row.verification_status==='verified'} : null;
  });
