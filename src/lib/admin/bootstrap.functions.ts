/**
 * One-shot provisioning of the platform admin account.
 *
 * Credentials never live in client code: the username and password come from
 * server-only env vars. The username is not an email, so auth uses a
 * deterministic synthetic address (see `adminEmailForUsername`).
 */
import { createServerFn } from "@tanstack/react-start";

export function adminEmailForUsername(username: string): string {
  return `${username.trim().toLowerCase()}@palladiumai.local`;
}

export const bootstrapPlatformAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const username = process.env["ADMIN_BOOTSTRAP_USERNAME"];
  const password = process.env["ADMIN_BOOTSTRAP_PASSWORD"];
  if (!username || !password) throw new Error("Admin bootstrap credentials are not configured");

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

  return { ok: true as const, userId, email };
});
