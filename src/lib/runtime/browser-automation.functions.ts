import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sealBrowserSecret } from "./browser-credentials.server";
import { asBrowserDatabase } from "./browser-database.types";

type BrowserCredentialPatch = {
  name?: string;
  domain?: string;
  username_ciphertext?: string | null;
  password_ciphertext?: string | null;
  totp_secret_ciphertext?: string | null;
  totp_identifier?: string | null;
  updated_at?: string;
};

const text = (value: unknown, max = 500) =>
  (typeof value === "string" ? value.trim() : "").slice(0, max);

function cleanDomain(value: unknown) {
  const raw = text(value, 500).toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  if (!raw || raw.length > 253 || !/^[a-z0-9.-]+$/.test(raw) || raw.startsWith(".") || raw.endsWith(".")) {
    throw new Error("A valid browser credential domain is required.");
  }
  return raw;
}

function cleanId(value: unknown, label: string) {
  const id = text(value, 120);
  if (!id) throw new Error(`${label} is required.`);
  return id;
}

export const listBrowserCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { domain?: string } = {}) => ({
    domain: input?.domain ? cleanDomain(input.domain) : null,
  }))
  .handler(async ({ data, context }) => {
    const db = asBrowserDatabase(context.supabase);
    let query = db
      .from("browser_credentials")
      .select("id,name,domain,totp_identifier,created_at,updated_at,last_used_at,username_ciphertext,password_ciphertext,totp_secret_ciphertext")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(200);
    if (data.domain) query = query.eq("domain", data.domain);
    const { data: rows, error } = await query;
    if (error) throw new Error("Could not load browser credentials.");
    return {
      credentials: (rows ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        domain: row.domain,
        totp_identifier: row.totp_identifier ?? null,
        has_username: Boolean(row.username_ciphertext),
        has_password: Boolean(row.password_ciphertext),
        has_totp: Boolean(row.totp_secret_ciphertext),
        created_at: row.created_at,
        updated_at: row.updated_at,
        last_used_at: row.last_used_at ?? null,
      })),
    };
  });

export const createBrowserCredential = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Record<string, unknown>) => {
    const name = text(input?.["name"], 120);
    const domain = cleanDomain(input?.["domain"]);
    const username = text(input?.["username"], 1000);
    const password = text(input?.["password"], 4000);
    const totpSecret = text(input?.["totp_secret"], 1000).replace(/\s+/g, "").toUpperCase();
    const totpIdentifier = text(input?.["totp_identifier"], 300);
    if (!name) throw new Error("Credential name is required.");
    if (!username && !password && !totpSecret) throw new Error("Provide a username, password or TOTP secret.");
    return { name, domain, username, password, totpSecret, totpIdentifier };
  })
  .handler(async ({ data, context }) => {
    const db = asBrowserDatabase(context.supabase);
    const { data: row, error } = await db
      .from("browser_credentials")
      .insert({
        user_id: context.userId,
        name: data.name,
        domain: data.domain,
        username_ciphertext: data.username ? sealBrowserSecret(data.username) : null,
        password_ciphertext: data.password ? sealBrowserSecret(data.password) : null,
        totp_secret_ciphertext: data.totpSecret ? sealBrowserSecret(data.totpSecret) : null,
        totp_identifier: data.totpIdentifier || null,
      })
      .select("id,name,domain,totp_identifier,created_at,updated_at")
      .maybeSingle();
    if (error || !row) {
      if (String(error?.message || "").toLowerCase().includes("unique")) {
        throw new Error("You already have a browser credential with that name.");
      }
      throw new Error("Could not save browser credential.");
    }
    return { credential: { ...row, has_username: Boolean(data.username), has_password: Boolean(data.password), has_totp: Boolean(data.totpSecret) } };
  });

export const updateBrowserCredential = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Record<string, unknown>) => {
    const id = cleanId(input?.["id"], "Credential id");
    const patch: BrowserCredentialPatch = {};
    if (input?.["name"] !== undefined) {
      const name = text(input["name"], 120);
      if (!name) throw new Error("Credential name cannot be empty.");
      patch.name = name;
    }
    if (input?.["domain"] !== undefined) patch.domain = cleanDomain(input["domain"]);
    if (input?.["username"] !== undefined) {
      const value = text(input["username"], 1000);
      patch.username_ciphertext = value ? sealBrowserSecret(value) : null;
    }
    if (input?.["password"] !== undefined) {
      const value = text(input["password"], 4000);
      patch.password_ciphertext = value ? sealBrowserSecret(value) : null;
    }
    if (input?.["totp_secret"] !== undefined) {
      const value = text(input["totp_secret"], 1000).replace(/\s+/g, "").toUpperCase();
      patch.totp_secret_ciphertext = value ? sealBrowserSecret(value) : null;
    }
    if (input?.["totp_identifier"] !== undefined) patch.totp_identifier = text(input["totp_identifier"], 300) || null;
    if (!Object.keys(patch).length) throw new Error("No browser credential changes were provided.");
    patch.updated_at = new Date().toISOString();
    return { id, patch };
  })
  .handler(async ({ data, context }) => {
    const db = asBrowserDatabase(context.supabase);
    const { data: row, error } = await db
      .from("browser_credentials")
      .update(data.patch)
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select("id,name,domain,totp_identifier,created_at,updated_at,last_used_at,username_ciphertext,password_ciphertext,totp_secret_ciphertext")
      .maybeSingle();
    if (error || !row) throw new Error("Could not update browser credential.");
    return {
      credential: {
        id: row.id,
        name: row.name,
        domain: row.domain,
        totp_identifier: row.totp_identifier ?? null,
        has_username: Boolean(row.username_ciphertext),
        has_password: Boolean(row.password_ciphertext),
        has_totp: Boolean(row.totp_secret_ciphertext),
        created_at: row.created_at,
        updated_at: row.updated_at,
        last_used_at: row.last_used_at ?? null,
      },
    };
  });

export const deleteBrowserCredential = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: cleanId(input?.id, "Credential id") }))
  .handler(async ({ data, context }) => {
    const db = asBrowserDatabase(context.supabase);
    const { error } = await db
      .from("browser_credentials")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error("Could not delete browser credential.");
    return { deleted: true, id: data.id };
  });

export const listBrowserArtifacts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { task_id?: string; limit?: number } = {}) => ({
    task_id: input?.task_id ? cleanId(input.task_id, "Task id") : null,
    limit: Math.min(Math.max(Number(input?.limit ?? 100), 1), 200),
  }))
  .handler(async ({ data, context }) => {
    const db = asBrowserDatabase(context.supabase);
    let query = db
      .from("browser_artifacts")
      .select("id,agent_id,task_id,kind,filename,mime_type,size_bytes,sha256,source_url,created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.task_id) query = query.eq("task_id", data.task_id);
    const { data: rows, error } = await query;
    if (error) throw new Error("Could not load browser artifacts.");
    return { artifacts: rows ?? [] };
  });

export const getBrowserArtifactUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: cleanId(input?.id, "Artifact id") }))
  .handler(async ({ data, context }) => {
    const db = asBrowserDatabase(context.supabase);
    const { data: artifact, error } = await db
      .from("browser_artifacts")
      .select("id,filename,mime_type,size_bytes,storage_path")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error || !artifact) throw new Error("Browser artifact was not found.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from("knowledge")
      .createSignedUrl(artifact.storage_path, 300, { download: artifact.filename });
    if (signError || !signed?.signedUrl) throw new Error("Could not create a browser artifact download link.");
    return {
      artifact: {
        id: artifact.id,
        filename: artifact.filename,
        mime_type: artifact.mime_type,
        size_bytes: artifact.size_bytes,
      },
      signed_url: signed.signedUrl,
      expires_in_seconds: 300,
    };
  });
