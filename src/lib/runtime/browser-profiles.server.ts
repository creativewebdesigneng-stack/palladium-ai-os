import type { SupabaseClient } from "@supabase/supabase-js";
import { openBrowserSecret, sealBrowserSecret } from "./browser-credentials.server";
import { browserProfileScopeKey, sanitizeBrowserStorageState, type BrowserStorageState } from "./browser-storage-state";
import type { BrowserDatabase } from "./browser-database.types";

export async function loadBrowserProfile(args: {
  db: SupabaseClient<BrowserDatabase>;
  userId: string;
  agentId: string;
  allowedDomains: string[];
}): Promise<BrowserStorageState | null> {
  const scopeKey = browserProfileScopeKey(args.allowedDomains);
  const { data, error } = await args.db
    .from("browser_profiles")
    .select("state_ciphertext")
    .eq("user_id", args.userId)
    .eq("agent_id", args.agentId)
    .eq("scope_key", scopeKey)
    .maybeSingle();
  if (error) throw new Error("Could not load the persisted browser session.");
  if (!data?.state_ciphertext) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(openBrowserSecret(data.state_ciphertext)); }
  catch { throw new Error("Persisted browser session state could not be decrypted or decoded."); }
  return sanitizeBrowserStorageState(parsed, args.allowedDomains);
}

export async function saveBrowserProfile(args: {
  db: SupabaseClient<BrowserDatabase>;
  userId: string;
  orgId: string | null;
  agentId: string;
  allowedDomains: string[];
  state: unknown;
}) {
  const sanitized = sanitizeBrowserStorageState(args.state, args.allowedDomains);
  const scopeKey = browserProfileScopeKey(args.allowedDomains);
  const now = new Date().toISOString();
  const stateCiphertext = sealBrowserSecret(JSON.stringify(sanitized));
  const { data, error } = await args.db
    .from("browser_profiles")
    .upsert({
      user_id: args.userId,
      org_id: args.orgId,
      agent_id: args.agentId,
      scope_key: scopeKey,
      domain_scope: [...new Set(args.allowedDomains.map((value) => value.toLowerCase()))].sort(),
      state_ciphertext: stateCiphertext,
      updated_at: now,
      last_used_at: now,
    }, { onConflict: "user_id,agent_id,scope_key" })
    .select("id,domain_scope,updated_at,last_used_at")
    .maybeSingle();
  if (error || !data) throw new Error("Could not persist the browser session.");
  return {
    profile_id: data.id,
    domain_scope: data.domain_scope,
    updated_at: data.updated_at,
    profile_persisted: true,
  };
}
