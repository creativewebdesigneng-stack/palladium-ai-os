/**
 * One-shot provisioning of the platform admin account.
 *
 * Credentials never live in client code: the username and password come from
 * server-only env vars. The endpoint stays disabled unless an operator turns
 * it on and presents the matching server-only token. The username is not an
 * email, so auth uses a deterministic synthetic address (see
 * `adminEmailForUsername`).
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const DISABLED = "Admin bootstrap is disabled.";

export function adminEmailForUsername(username: string): string {
  return `${username.trim().toLowerCase()}@palladiumai.local`;
}

function tokenMatches(provided: string, expected: string): boolean {
  const providedHash = createHash("sha256").update(provided).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(providedHash, expectedHash);
}

/** Returns a generic failure, or null when this call is allowed to provision. */
export function bootstrapAuthorizationFailure(
  env: Record<string, string | undefined>,
  token: string,
): string | null {
  const expected = env["ADMIN_BOOTSTRAP_TOKEN"];
  if (env["ADMIN_BOOTSTRAP_ENABLED"] !== "true" || !expected || expected.length < 16) {
    return DISABLED;
  }
  if (!tokenMatches(token, expected)) return DISABLED;
  return null;
}

export const bootstrapPlatformAdmin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: z.string().min(16).max(500) }).parse(input))
  .handler(async ({ data }) => {
    const failure = bootstrapAuthorizationFailure(process.env, data.token);
    if (failure) throw new Error(failure);

    const username = process.env["ADMIN_BOOTSTRAP_USERNAME"];
    const password = process.env["ADMIN_BOOTSTRAP_PASSWORD"];
    if (!username || !password) throw new Error(DISABLED);

    const email = adminEmailForUsername(username);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let userId: string | null = null;
    const created = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Platform Admin", username },
    });
    if (created.data?.user) {
      userId = created.data.user.id;
    } else {
      // Already exists — find them and reset the password to the configured one.
      const list = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = list.data?.users.find((u) => u.email?.toLowerCase() === email);
      if (!existing) throw created.error ?? new Error("Unable to provision admin user");
      userId = existing.id;
      const updated = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
      });
      if (updated.error) throw updated.error;
    }

    const role = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    if (role.error) throw role.error;

    return { ok: true as const };
  });
